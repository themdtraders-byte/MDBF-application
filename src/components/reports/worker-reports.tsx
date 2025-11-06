
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { dbLoad } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { FormattedCurrency } from "../ui/formatted-currency";

type Worker = {
    id: string;
    name: string;
    role: string;
    contact: string;
    salary?: number;
    workType: 'salary' | 'work_based';
}
type Role = { id: string; name: string };

export function WorkerReports() {
  const { t } = useLanguage();
  const workers = useLiveQuery<Worker[], Worker[]>(() => dbLoad("workers"), []) || [];
  const roles = useLiveQuery<Role[], Role[]>(() => dbLoad("worker-roles"), []) || [];

  const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.name || "N/A";
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("workerReports")}</CardTitle>
        <CardDescription>Summary of your workforce and salary data.</CardDescription>
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
