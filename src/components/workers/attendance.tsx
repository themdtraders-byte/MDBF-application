

"use client";

import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/hooks/use-language";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dbLoad, dbSave } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, startOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Worker = {
    id: string;
    name: string;
    photo?: string;
};
type AttendanceRecord = {
    id: string;
    workerId: string;
    date: string; // ISO string yyyy-mm-dd
    status: 'present' | 'absent' | 'leave';
};

export function Attendance() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    const storedWorkers = await dbLoad("workers");
    const storedAttendance = await dbLoad("attendance");
    setWorkers(storedWorkers);
    setAttendance(storedAttendance);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAttendanceChange = async (workerId: string, newStatus: 'present' | 'absent' | 'leave') => {
    const dateString = format(startOfDay(selectedDate), 'yyyy-MM-dd');
    const recordId = `att-${workerId}-${dateString}`;
    
    const existingRecords = await dbLoad("attendance");
    const recordIndex = existingRecords.findIndex(rec => rec.id === recordId);

    if (recordIndex > -1) {
        // If clicking the same status, clear it. Otherwise, update it.
        if (existingRecords[recordIndex].status === newStatus) {
            existingRecords.splice(recordIndex, 1);
        } else {
            existingRecords[recordIndex].status = newStatus;
        }
    } else {
        existingRecords.push({
            id: recordId,
            workerId: workerId,
            date: dateString,
            status: newStatus
        });
    }

    await dbSave("attendance", existingRecords);
    // Refetch to update UI
    await fetchData();

    toast({
        title: "Attendance Updated",
        description: "The attendance record has been saved.",
    });
  };
  
  const getInitials = (name: string) => {
    if (!name) return "";
    const words = name.split(' ');
    if (words.length > 1) {
      return words[0][0] + words[words.length - 1][0];
    }
    return name.substring(0, 2);
  }
  
  const getStatusForWorker = (workerId: string) => {
      const dateString = format(startOfDay(selectedDate), 'yyyy-MM-dd');
      const record = attendance.find(rec => rec.workerId === workerId && rec.date === dateString);
      return record?.status;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
             <Card>
                <CardHeader>
                    <CardTitle>Select Date</CardTitle>
                    <CardDescription>Pick a day to mark attendance.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => setSelectedDate(date || new Date())}
                        className="p-0"
                        classNames={{
                            day_selected: "bg-primary text-primary-foreground",
                            day_today: "bg-accent text-accent-foreground",
                        }}
                    />
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Mark Attendance for {format(selectedDate, "PPP")}</CardTitle>
                    <CardDescription>Select the status for each worker.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {workers.map(worker => {
                            const status = getStatusForWorker(worker.id);
                            return (
                                <div key={worker.id} className="flex items-center justify-between p-3 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={worker.photo} alt={worker.name} />
                                            <AvatarFallback>{getInitials(worker.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{worker.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant={status === 'present' ? 'default' : 'outline'}
                                            size="sm" 
                                            onClick={() => handleAttendanceChange(worker.id, 'present')}
                                            className={cn(status === 'present' && "bg-green-600 hover:bg-green-700")}
                                        >
                                            Present
                                        </Button>
                                         <Button 
                                            variant={status === 'absent' ? 'destructive' : 'outline'}
                                            size="sm" 
                                            onClick={() => handleAttendanceChange(worker.id, 'absent')}
                                        >
                                            Absent
                                        </Button>
                                         <Button 
                                            variant={status === 'leave' ? 'secondary' : 'outline'}
                                            size="sm" 
                                            onClick={() => handleAttendanceChange(worker.id, 'leave')}
                                            className={cn(status === 'leave' && "bg-yellow-500 hover:bg-yellow-600 text-black")}
                                        >
                                            Leave
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                        {workers.length === 0 && (
                            <p className="text-muted-foreground text-center py-8">No workers found. Please add a worker first.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
