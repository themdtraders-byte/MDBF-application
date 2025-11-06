
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { dbLoad } from "@/lib/db";
import { isThisMonth, parseISO } from "date-fns";
import { FormattedCurrency } from "../ui/formatted-currency";

type Expense = { amount: number, date: string };

export function HomeSummaryReport() {
  const { t } = useLanguage();
  // Note: Income module not present, so we'll only show expenses.
  const [monthStats, setMonthStats] = useState({ income: 0, expenses: 0 });

  useEffect(() => {
    const fetchData = async () => {
        const expenses: Expense[] = await dbLoad("expenses");
        const monthExpenses = expenses.filter(e => isThisMonth(parseISO(e.date))).reduce((acc, e) => acc + e.amount, 0);
        setMonthStats({ income: 0, expenses: monthExpenses });
    }
    fetchData();
  }, []);

  const netBalance = monthStats.income - monthStats.expenses;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
        <CardDescription>A summary of your personal income and expenses for this month.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
            <CardHeader>
                <CardDescription>Total Income</CardDescription>
                <CardTitle className="text-green-600">
                    <FormattedCurrency amount={monthStats.income} integerClassName="text-3xl" decimalClassName="text-xl" />
                </CardTitle>
            </CardHeader>
        </Card>
        <Card>
            <CardHeader>
                <CardDescription>{t('totalExpenses')}</CardDescription>
                <CardTitle className="text-destructive">
                    <FormattedCurrency amount={monthStats.expenses} integerClassName="text-3xl" decimalClassName="text-xl" />
                </CardTitle>
            </CardHeader>
        </Card>
        <Card>
            <CardHeader>
                <CardDescription>Net Balance</CardDescription>
                <CardTitle className={netBalance >= 0 ? "text-green-600" : "text-destructive"}>
                     <FormattedCurrency amount={netBalance} integerClassName="text-3xl" decimalClassName="text-xl" />
                </CardTitle>
            </CardHeader>
        </Card>
      </CardContent>
    </Card>
  );
}
