
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { format, startOfMonth, addMonths, subMonths, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dbLoad } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type AttendanceRecord = {
    workerId: string;
    date: string; // yyyy-MM-dd
    status: 'p' | 'a' | 'l';
};

interface WorkerAttendanceCalendarProps {
    workerId: string;
}

export function WorkerAttendanceCalendar({ workerId }: WorkerAttendanceCalendarProps) {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

    const fetchData = useCallback(async () => {
        const allAttendance = await dbLoad("attendance");
        const workerAttendance = allAttendance.filter(a => a.workerId === workerId);
        setAttendance(workerAttendance);
    }, [workerId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const attendanceModifiers = useMemo(() => {
        const presentDays: Date[] = [];
        const absentDays: Date[] = [];
        const leaveDays: Date[] = [];

        attendance.forEach(rec => {
            const date = parseISO(rec.date);
            if (rec.status === 'p') presentDays.push(date);
            if (rec.status === 'a') absentDays.push(date);
            if (rec.status === 'l') leaveDays.push(date);
        });

        return {
            present: presentDays,
            absent: absentDays,
            leave: leaveDays,
        };
    }, [attendance]);

    const modifierClassNames = {
        present: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-md',
        absent: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md',
        leave: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded-md',
    };
    
    const formatCaption = (date: Date) => format(date, "MMMM yyyy");

    return (
         <Card>
            <CardHeader>
                <CardTitle>Attendance Calendar</CardTitle>
                <CardDescription>A visual log of the worker's attendance.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Calendar
                    mode="multiple"
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    modifiers={attendanceModifiers}
                    modifiersClassNames={modifierClassNames}
                    numberOfMonths={3}
                    pagedNavigation
                    className="p-0"
                    classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                        caption_label: "text-lg font-medium",
                        nav_button: "h-8 w-8 p-0",
                    }}
                    components={{
                        CaptionLabel: ({ displayMonth }) => (
                          <span className="text-lg font-medium">{format(displayMonth, "MMMM yyyy")}</span>
                        ),
                      }}
                />
                 <div className="flex justify-center items-center gap-4 mt-4 text-sm">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-100 border border-green-300"></span> Present</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-100 border border-red-300"></span> Absent</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300"></span> Leave</div>
                </div>
            </CardContent>
        </Card>
    );
}

