
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { format, startOfMonth, endOfMonth, getDaysInMonth, addMonths, subMonths, setDate, isToday, isWeekend, isFuture, isBefore, parseISO, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { dbLoad, dbSave, dbClearAndSave } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type Worker = {
    id: string;
    name: string;
    joiningDate: string | Date;
};

type AttendanceStatus = 'p' | 'a' | 'l';
type AttendanceRecord = {
    id: string;
    workerId: string;
    date: string; // yyyy-MM-dd
    status: AttendanceStatus;
};

const STATUS_CYCLE: (AttendanceStatus | undefined)[] = ['p', 'a', 'l', undefined];
const ADMIN_CODE = "MDBF";

export function AttendanceList() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    const [adminMode, setAdminMode] = useState<Record<string, boolean>>({});
    const [adminDialogOpen, setAdminDialogOpen] = useState(false);
    const [currentWorkerIdForAdmin, setCurrentWorkerIdForAdmin] = useState<string | null>(null);
    const [adminCodeInput, setAdminCodeInput] = useState("");

    const fetchData = useCallback(async () => {
        const workerData = await dbLoad("workers");
        const attendanceData = await dbLoad("attendance");
        setWorkers(workerData);
        setAttendance(attendanceData);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData, currentMonth]);

    const daysInMonth = useMemo(() => {
        const days = getDaysInMonth(currentMonth);
        return Array.from({ length: days }, (_, i) => i + 1);
    }, [currentMonth]);

    const attendanceMap = useMemo(() => {
        const map = new Map<string, AttendanceStatus>();
        attendance.forEach(rec => {
            const key = `${rec.workerId}-${rec.date}`;
            map.set(key, rec.status);
        });
        return map;
    }, [attendance]);

    const handleAdminToggle = (workerId: string) => {
        setCurrentWorkerIdForAdmin(workerId);
        setAdminCodeInput("");
        setAdminDialogOpen(true);
    };

    const handleAdminCodeSubmit = () => {
        if (adminCodeInput === ADMIN_CODE && currentWorkerIdForAdmin) {
            setAdminMode(prev => ({ ...prev, [currentWorkerIdForAdmin]: !prev[currentWorkerIdForAdmin] }));
            toast({
                title: adminMode[currentWorkerIdForAdmin] ? "Admin Mode Deactivated" : "Admin Mode Activated",
                description: `Date restrictions are now ${adminMode[currentWorkerIdForAdmin] ? 'enabled' : 'modified'} for this worker.`,
            });
        } else {
            toast({
                variant: "destructive",
                title: "Incorrect Code",
                description: "The admin code you entered is incorrect.",
            });
        }
        setAdminDialogOpen(false);
    };
    
    const handleAttendanceClick = async (workerId: string, day: number) => {
        const date = startOfDay(setDate(currentMonth, day));
        const worker = workers.find(w => w.id === workerId);
        if (!worker) return;

        const joiningDateValue = typeof worker.joiningDate === 'string' ? parseISO(worker.joiningDate) : worker.joiningDate;
        const joiningDate = startOfDay(joiningDateValue);
        const isAdmin = adminMode[worker.id];
        
        if (isFuture(date) && !isToday(date)) {
            toast({ variant: "destructive", title: "Invalid Date", description: "Cannot mark attendance for a future date.", duration: 3000 });
            return;
        }

        if (isBefore(date, joiningDate)) {
            toast({ variant: "destructive", title: "Invalid Date", description: `Worker joined on ${format(joiningDate, "PPP")}.`, duration: 3000 });
            return;
        }
        
        const isPastDate = isBefore(date, startOfDay(new Date()));
        if(isPastDate && !isToday(date) && !isAdmin) {
             toast({ variant: "destructive", title: "Date Locked", description: "Past dates can only be changed in admin mode.", duration: 3000 });
             return;
        }

        const dateString = format(date, 'yyyy-MM-dd');
        const recordId = `att-${workerId}-${dateString}`;
        
        try {
            const currentRecords: AttendanceRecord[] = await dbLoad("attendance");
            const recordIndex = currentRecords.findIndex(rec => rec.id === recordId);
            const currentStatus = recordIndex > -1 ? currentRecords[recordIndex].status : undefined;
            
            const nextStatusIndex = (STATUS_CYCLE.indexOf(currentStatus) + 1) % STATUS_CYCLE.length;
            const nextStatus = STATUS_CYCLE[nextStatusIndex];

            if (recordIndex > -1) {
                if (nextStatus) {
                    currentRecords[recordIndex].status = nextStatus;
                } else {
                    currentRecords.splice(recordIndex, 1);
                }
            } else if (nextStatus) {
                currentRecords.push({ id: recordId, workerId, date: dateString, status: nextStatus });
            }
            
            await dbClearAndSave("attendance", currentRecords);
            
            setAttendance(currentRecords);

        } catch (e) {
            console.error("Failed to save attendance:", e);
            toast({ variant: "destructive", title: "Save Failed", description: "Could not save attendance data." });
        }
    };

    const getStatusStyle = (status?: AttendanceStatus) => {
        switch (status) {
            case 'p': return "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300";
            case 'a': return "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300";
            case 'l': return "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300";
            default: return "hover:bg-muted/50";
        }
    }
    
    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Monthly Attendance Sheet</CardTitle>
                            <CardDescription>View and edit attendance for the month.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-lg font-semibold w-32 text-center">{format(currentMonth, "MMMM yyyy")}</span>
                            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table className="border">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-background border-r min-w-[150px]">Worker</TableHead>
                                    {daysInMonth.map(day => {
                                        const date = setDate(currentMonth, day);
                                        return (
                                            <TableHead key={day} className={cn("text-center min-w-[60px] border-l", isToday(date) && "bg-accent text-accent-foreground")}>
                                                <div className="flex flex-col items-center">
                                                    <span>{format(date, 'E')}</span>
                                                    <span className="font-bold text-lg">{day}</span>
                                                </div>
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {workers.map(worker => {
                                     const joiningDateValue = typeof worker.joiningDate === 'string' ? parseISO(worker.joiningDate) : worker.joiningDate;
                                     const joiningDate = startOfDay(joiningDateValue);
                                     const isAdmin = adminMode[worker.id];
                                    return (
                                    <TableRow key={worker.id} className={cn(isAdmin && "bg-blue-50 dark:bg-blue-900/20")}>
                                        <TableCell className="sticky left-0 bg-background border-r font-medium flex items-center justify-between min-w-[150px]">
                                            {worker.name}
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAdminToggle(worker.id)}>
                                                <Lock className={cn("h-4 w-4", isAdmin ? "text-primary" : "text-muted-foreground")} />
                                            </Button>
                                        </TableCell>
                                        {daysInMonth.map(day => {
                                            const date = startOfDay(setDate(currentMonth, day));
                                            const dateString = format(date, 'yyyy-MM-dd');
                                            const key = `${worker.id}-${dateString}`;
                                            const status = attendanceMap.get(key);
                                            
                                            const isFutureDate = isFuture(date) && !isToday(date);
                                            const isBeforeJoining = isBefore(date, joiningDate);
                                            const isPastDate = isBefore(date, startOfDay(new Date()));
                                            
                                            const isClickable = !isFutureDate && !isBeforeJoining && (!isPastDate || isAdmin || isToday(date));
                                            const isDisabledLook = isFutureDate || isBeforeJoining;
                                            
                                            return (
                                                <TableCell key={key} 
                                                    className={cn("text-center p-0 border-l", 
                                                        !isClickable && 'cursor-not-allowed',
                                                        isDisabledLook ? "bg-muted/10" : "cursor-pointer",
                                                        getStatusStyle(status),
                                                        isWeekend(date) && !status && "bg-muted/20"
                                                    )}
                                                    onClick={() => {
                                                        if (isClickable) {
                                                            handleAttendanceClick(worker.id, day)
                                                        }
                                                    }}
                                                >
                                                    <div className="w-full py-2 flex items-center justify-center text-xl font-bold">
                                                        {status?.toUpperCase()}
                                                    </div>
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </div>
                    {workers.length === 0 && <p className="text-center text-muted-foreground py-10">No workers found.</p>}
                </CardContent>
            </Card>

            <AlertDialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Admin Override</AlertDialogTitle>
                        <AlertDialogDescription>
                            Enter the admin code to unlock date restrictions for this worker.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label htmlFor="admin-code">Admin Code</Label>
                        <Input
                            id="admin-code"
                            type="password"
                            value={adminCodeInput}
                            onChange={(e) => setAdminCodeInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdminCodeSubmit()}
                            autoFocus
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAdminCodeSubmit}>Activate</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
