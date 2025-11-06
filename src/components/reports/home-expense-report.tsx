

"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { dbLoad } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { FormattedCurrency } from "../ui/formatted-currency";
import { DateRange } from "react-day-picker";

type Expense = {
    id: string;
    categoryId: string;
    amount: number;
    date: string | Date;
    notes?: string;
}
type ExpenseCategory = { id: string; name: string; }

export function HomeExpenseReport() {
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    const fetchData = async () => {
        setExpenses(await dbLoad("expenses"));
        setCategories(await dbLoad("home-expense-categories"));
    }
    fetchData();
  }, []);

  const filteredExpenses = useMemo(() => {
    if (!dateRange?.from) return expenses;
    const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
    return expenses.filter(e => {
        const dateString = typeof e.date === 'string' ? e.date : e.date.toISOString();
        return isWithinInterval(parseISO(dateString), interval)
    });
  }, [expenses, dateRange]);
  
  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Uncategorized';
  }

  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Expense Report</CardTitle>
                <CardDescription>A detailed breakdown of your personal expenses.</CardDescription>
            </div>
            <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>
        <Card className="mt-4">
            <CardHeader className="pb-2">
                <CardDescription>{t('totalExpenses')}</CardDescription>
                <CardTitle className="text-3xl text-destructive">
                    <FormattedCurrency amount={totalExpenses} integerClassName="text-3xl" decimalClassName="text-xl" />
                </CardTitle>
            </CardHeader>
        </Card>
      </CardHeader>
      <CardContent>
         <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('category')}</TableHead>
                    <TableHead>{t('notesOptional')}</TableHead>
                    <TableHead className="text-right">{t('amount')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                        <TableCell>{format(new Date(expense.date), "PPP")}</TableCell>
                        <TableCell><Badge variant="outline">{getCategoryName(expense.categoryId)}</Badge></TableCell>
                        <TableCell>{expense.notes || 'N/A'}</TableCell>
                        <TableCell className="text-right font-semibold text-destructive">
                            <FormattedCurrency amount={expense.amount} />
                        </TableCell>
                    </TableRow>
                ))}
                {filteredExpenses.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No expenses recorded yet.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
