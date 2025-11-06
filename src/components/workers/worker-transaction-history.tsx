

"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { dbLoad } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type SalaryTransaction = { 
    id: string;
    workerId: string;
    date: string; 
    type: 'salary' | 'advance' | 'work_payment' | 'daily_expense' | 'tip' | 'penalty', 
    amount: number;
    notes?: string;
    quantity?: number;
    unitType?: string;
};


interface WorkerTransactionHistoryProps {
    workerId: string;
}

export function WorkerTransactionHistory({ workerId }: WorkerTransactionHistoryProps) {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<SalaryTransaction[]>([]);

  useEffect(() => {
    const fetchTransactions = async () => {
        const allTransactions: SalaryTransaction[] = await dbLoad("salary-transactions");
        const workerTransactions = allTransactions.filter(t => t.workerId === workerId)
                                      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(workerTransactions);
    }
    fetchTransactions();
  }, [workerId]);

  const getBadgeVariant = (type: string) => {
    switch (type) {
        case 'salary':
        case 'tip':
            return 'secondary';
        case 'advance':
        case 'daily_expense':
            return 'outline';
        case 'penalty':
            return 'destructive';
        default:
            return 'default';
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("transactionHistory")}</CardHeader>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("paymentType")}</TableHead>
              <TableHead>{t("details")}</TableHead>
              <TableHead className="text-right">{t("amount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{format(new Date(transaction.date), "PPP")}</TableCell>
                <TableCell>
                    <Badge variant={getBadgeVariant(transaction.type)}>
                        {transaction.type.replace('_', ' ')}
                    </Badge>
                </TableCell>
                <TableCell>{transaction.type === 'work_payment' ? `${transaction.quantity} ${transaction.unitType}` : transaction.notes || 'N/A'}</TableCell>
                <TableCell className="text-right font-semibold">PKR {transaction.amount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
             {transactions.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        {t('noTransactionsFound')}
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

    