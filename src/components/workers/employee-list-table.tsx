
"use client";

import { useEffect, useState, useMemo } from "react";
import { useLanguage } from "@/hooks/use-language";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { dbLoad, dbSave, dbClearAndSave } from "@/lib/db";
import { DateRangePicker } from "../ui/date-range-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddWorkerForm } from "./add-worker-form";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { WorkerDetails } from "./worker-details";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "../ui/label";
import { FormattedCurrency } from "../ui/formatted-currency";
import { useLiveQuery } from "dexie-react-hooks";
import { getDaysInMonth, isSameMonth, parseISO, startOfMonth, eachMonthOfInterval, isBefore, endOfDay, startOfDay, isWithinInterval } from "date-fns";
import { DateRange } from "react-day-picker";
import { useSearch } from "@/hooks/use-search";
import { useAccessControl } from "@/hooks/use-access-control";


type Worker = {
    id: string;
    name: string;
    role: string;
    contact: string;
    workType: "salary" | "work_based";
    salary?: number;
    productionRates?: { itemId: string, rate: number }[];
    status: "Active" | "Blocked";
    joiningDate: string | Date;
    photo?: string;
    allowedLeaves?: number;
}
type Role = { id: string; name: string };
type SalaryTransaction = { workerId: string; date: string; type: string; amount: number; };
type ProductionBatch = { productionDate: string; laborCosts?: { workerId: string; cost: number; }[] };
type AttendanceRecord = { workerId: string; date: string; status: 'p' | 'a' | 'l'; };


export function EmployeeListTable() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { isReadOnly } = useAccessControl();
  const { searchTerm } = useSearch();
  const workers = useLiveQuery<Worker[], Worker[]>(() => dbLoad("workers"), [], []) || [];
  const roles = useLiveQuery<Role[], Role[]>(() => dbLoad("worker-roles"), [], []) || [];
  const attendance = useLiveQuery<AttendanceRecord[], AttendanceRecord[]>(() => dbLoad("attendance"), [], []) || [];
  const salaryTransactions = useLiveQuery<SalaryTransaction[], SalaryTransaction[]>(() => dbLoad("salary-transactions"), [], []) || [];
  const productionHistory = useLiveQuery<ProductionBatch[], ProductionBatch[]>(() => dbLoad("production-history"), [], []) || [];
  
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [viewingWorker, setViewingWorker] = useState<Worker | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState('');
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const workerCalculations = useMemo(() => {
    return workers.map(worker => {
      let totalEarnings = 0;
      let totalDeductions = 0;
      const joinDateValue = worker.joiningDate;
      if (!joinDateValue) return {...worker, overallBalance: 0};

      const joinDate = typeof joinDateValue === 'string' ? parseISO(joinDateValue) : joinDateValue;
      const endDate = new Date();

      if (isBefore(joinDate, endDate)) {
          const months = eachMonthOfInterval({ start: joinDate, end: endDate });
          months.forEach(monthStart => {
              if (worker.workType === 'salary') {
                  const daysInMonth = getDaysInMonth(monthStart);
                  const dailyRate = (worker.salary || 0) / daysInMonth;
                  
                  const presentDays = attendance.filter(a => 
                      a.workerId === worker.id && 
                      a.status === 'p' && 
                      isSameMonth(parseISO(a.date), monthStart)
                  ).length;
                  
                  const leaveDays = attendance.filter(a => 
                      a.workerId === worker.id && 
                      a.status === 'l' && 
                      isSameMonth(parseISO(a.date), monthStart)
                  ).length;

                  const paidLeaves = Math.min(leaveDays, worker.allowedLeaves || 0);
                  const paidDays = presentDays + paidLeaves;
                  
                  totalEarnings += paidDays * dailyRate;
              }
          });
      }
      
      if (worker.workType === 'work_based') {
           totalEarnings += (productionHistory || [])
            .flatMap(p => p.laborCosts || [])
            .filter(lc => lc.workerId === worker.id)
            .reduce((sum, lc) => sum + lc.cost, 0);
      }

      totalEarnings += (salaryTransactions || [])
        .filter(t => t.workerId === worker.id && (t.type === 'tip' || (t.type === 'adjustment' && t.amount > 0)))
        .reduce((sum, t) => sum + t.amount, 0);

      totalDeductions += (salaryTransactions || [])
        .filter(t => t.workerId === worker.id && (t.type === 'salary' || t.type === 'advance' || t.type === 'daily_expense' || (t.type === 'adjustment' && t.amount < 0)))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
      totalDeductions += (salaryTransactions || [])
        .filter(t => t.workerId === worker.id && t.type === 'penalty')
        .reduce((sum, t) => sum + t.amount, 0);

      const overallBalance = totalEarnings - totalDeductions;
      
      return {
        ...worker,
        overallBalance,
      }
    });

  }, [workers, roles, attendance, salaryTransactions, productionHistory]);
  
  const filteredWorkers = useMemo(() => {
      let results = workerCalculations.filter(worker => 
        worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getRoleName(worker.role).toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(worker.salary).includes(searchTerm) ||
        String(worker.overallBalance).includes(searchTerm)
      );
      
      if (dateRange?.from) {
        const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
        results = results.filter(w => {
            if (!w.joiningDate) return false;
            const dateString = typeof w.joiningDate === 'string' ? w.joiningDate : w.joiningDate.toISOString();
            return isWithinInterval(parseISO(dateString), interval)
        });
      }

      return results;
  }, [searchTerm, workerCalculations, roles, dateRange]);

  const getRoleName = (roleId: string) => {
    if (!roles) return roleId;
    return roles.find(r => r.id === roleId)?.name || roleId;
  }
  
  const getInitials = (name: string) => {
    if (!name) return "";
    const words = name.split(' ');
    if (words.length > 1) {
      return words[0][0] + words[words.length - 1][0];
    }
    return name.substring(0, 2);
  }

  const handleEdit = (worker: Worker) => {
     const workerForEdit = {
        ...worker,
        joiningDate: new Date(worker.joiningDate),
    };
    setEditingWorker(workerForEdit as any);
  }
  
  const openDeleteDialog = (worker: Worker) => {
    setWorkerToDelete(worker);
    setDeleteConfirmationCode(String(Math.floor(1000 + Math.random() * 9000)));
    setDeleteConfirmationInput('');
  }

  const handleDeleteConfirm = async () => {
    if (!workerToDelete) return;
    
    const trash = await dbLoad('trash');
    const deletedItem = {
        id: `trash-${workerToDelete.id}-${Date.now()}`,
        type: 'Worker',
        deletedAt: new Date().toISOString(),
        data: { ...workerToDelete, originalKey: 'workers' }
    };
    trash.push(deletedItem);
    await dbSave('trash', trash);

    const allWorkers = await dbLoad("workers");
    const updatedWorkers = allWorkers.filter(w => w.id !== workerToDelete.id);
    await dbClearAndSave('workers', updatedWorkers);

    toast({
        title: "Worker Moved to Trash",
        description: `${workerToDelete.name} has been moved to the trash.`,
    });
    setWorkerToDelete(null);
  }

  const handleEditFinish = () => {
      setEditingWorker(null);
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>{t("employeeList")}</CardTitle>
        <CardDescription>View and manage all your workers.</CardDescription>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pt-4">
             <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('role')}</TableHead>
              <TableHead>{t('payRate')}</TableHead>
              <TableHead className="text-right">Overall Balance</TableHead>
              <TableHead className="text-center">{t('status')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWorkers.map((worker) => {
              return (
              <TableRow key={worker.id} className={cn(worker.status === 'Blocked' && 'opacity-50 bg-destructive/10')}>
                <TableCell className="font-medium flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={worker.photo} alt={worker.name} />
                        <AvatarFallback>{getInitials(worker.name)}</AvatarFallback>
                    </Avatar>
                    {worker.name}
                </TableCell>
                <TableCell>{getRoleName(worker.role)}</TableCell>
                <TableCell>
                    {worker.workType === 'salary' 
                        ? <FormattedCurrency amount={worker.salary || 0} />
                        : `Work-based`
                    }
                </TableCell>
                 <TableCell className={cn("text-right font-semibold", worker.overallBalance > 0 ? 'text-green-600' : worker.overallBalance < 0 ? 'text-destructive' : '')}>
                    <FormattedCurrency amount={Math.abs(worker.overallBalance)} />
                     {worker.overallBalance > 0 ? ` (Payable)` : worker.overallBalance < 0 ? ` (Advance)` : ''}
                </TableCell>
                <TableCell className="text-center">
                   <Badge variant={worker.status === 'Active' ? 'secondary' : 'destructive'}>{worker.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewingWorker(worker)}>
                        <Icons.search className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(worker)} disabled={isReadOnly}>
                        <Icons.settings className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => openDeleteDialog(worker)} disabled={isReadOnly}>
                        <Icons.trash className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            )})}
             {filteredWorkers.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No workers found.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
     <Dialog open={!!editingWorker} onOpenChange={(open) => !open && setEditingWorker(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
             <DialogHeader>
                <DialogTitle>Edit Worker</DialogTitle>
                <DialogDescription>
                    Update the details for this worker.
                </DialogDescription>
            </DialogHeader>
            {editingWorker && <AddWorkerForm workerToEdit={editingWorker as any} onFinish={handleEditFinish} />}
        </DialogContent>
      </Dialog>
       <Dialog open={!!viewingWorker} onOpenChange={(open) => !open && setViewingWorker(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
             <DialogHeader>
                <DialogTitle>Worker Details</DialogTitle>
            </DialogHeader>
            {viewingWorker && <WorkerDetails worker={viewingWorker} />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!workerToDelete} onOpenChange={(open) => !open && setWorkerToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action will move the worker '{workerToDelete?.name}' to the trash. You can restore them from the trash later. To confirm, please type <code className="font-mono text-base bg-muted px-2 py-1 rounded-md">{deleteConfirmationCode}</code> in the box below.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="delete-confirm">Confirmation Code</Label>
                <Input
                    id="delete-confirm"
                    value={deleteConfirmationInput}
                    onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                    placeholder="Enter the code to confirm"
                    autoFocus
                />
            </div>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteConfirmationInput !== deleteConfirmationCode} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
