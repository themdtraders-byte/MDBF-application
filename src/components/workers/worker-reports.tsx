

"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { dbLoad } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { FormattedCurrency } from "../ui/formatted-currency";
import { isSameMonth, parseISO } from "date-fns";

type Worker = {
    id: string;
    name: string;
    role: string;
    contact: string;
    salary?: number;
    workType: 'salary' | 'work_based';
};
type Role = { id: string; name: string };
type SalaryTransaction = { workerId: string; date: string; amount: number; type: 'salary' | 'advance' | 'daily_expense' };
type ProductionBatch = { productionDate: string; laborCosts?: { workerId: string; cost: number; }[] };

export function WorkerReports() {
  const { t } = useLanguage();
  const workers = useLiveQuery<Worker[], Worker[]>(() => dbLoad("workers"), []) || [];
  const roles = useLiveQuery<Role[], Role[]>(() => dbLoad("worker-roles"), []) || [];
  const salaryTransactions = useLiveQuery<SalaryTransaction[], SalaryTransaction[]>(() => dbLoad("salary-transactions"), [], []) || [];
  const productionHistory = useLiveQuery<ProductionBatch[], ProductionBatch[]>(() => dbLoad("production-history"), [], []) || [];

  const totals = useMemo(() => {
    const now = new Date();
    const totalSalariesPaid = salaryTransactions
      .filter(t => isSameMonth(parseISO(t.date), now) && t.type === 'salary')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalAdvances = salaryTransactions
      .filter(t => isSameMonth(parseISO(t.date), now) && t.type === 'advance')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalWorkBasedPaid = (productionHistory || [])
        .filter(p => isSameMonth(parseISO(p.productionDate), now))
        .flatMap(p => p.laborCosts || [])
        .reduce((sum, lc) => sum + lc.cost, 0);

    return { totalSalariesPaid, totalAdvances, totalWorkBasedPaid };
  }, [salaryTransactions, productionHistory]);

  const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.name || "N/A";
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("workerReports")}</CardTitle>
        <CardDescription>Summary of your workforce and salary data.</CardDescription>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Total Salaries Paid (This Month)</CardDescription>
                    <CardTitle className="text-3xl text-destructive">
                        <FormattedCurrency amount={totals.totalSalariesPaid} integerClassName="text-3xl" decimalClassName="text-xl" />
                    </CardTitle>
                </CardHeader>
            </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Total Advances Given (This Month)</CardDescription>
                    <CardTitle className="text-3xl text-destructive">
                        <FormattedCurrency amount={totals.totalAdvances} integerClassName="text-3xl" decimalClassName="text-xl" />
                    </CardTitle>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Total Work-Based Pay (This Month)</CardDescription>
                    <CardTitle className="text-3xl text-destructive">
                        <FormattedCurrency amount={totals.totalWorkBasedPaid} integerClassName="text-3xl" decimalClassName="text-xl" />
                    </CardTitle>
                </CardHeader>
            </Card>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('workerName')}</TableHead>
              <TableHead>{t('role')}</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Pay Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map((worker) => (
              <TableRow key={worker.id}>
                <TableCell className="font-medium">{worker.name}</TableCell>
                <TableCell>{getRoleName(worker.role)}</TableCell>
                <TableCell>{worker.contact}</TableCell>
                <TableCell className="text-right">
                    {worker.workType === 'salary' 
                        ? <FormattedCurrency amount={worker.salary || 0} />
                        : `Work-based`
                    }
                </TableCell>
              </TableRow>
            ))}
             {workers.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">No workers found.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
