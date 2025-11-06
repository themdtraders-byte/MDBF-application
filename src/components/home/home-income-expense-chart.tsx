
"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useLanguage } from "@/hooks/use-language"
import { dbLoad } from "@/lib/db";
import { format, parseISO, startOfMonth } from "date-fns";

type Expense = { date: string; amount: number; };

export function HomeIncomeExpenseChart() {
  const { t, dir } = useLanguage();
  const [chartData, setChartData] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
        // Note: A dedicated 'income' module doesn't exist. We'll show expenses and a placeholder for income.
        const expenses: Expense[] = await dbLoad("expenses");

        const monthlyData: { [key: string]: { income: number, expenses: number } } = {};

        expenses.forEach(expense => {
          const month = format(startOfMonth(parseISO(expense.date)), 'MMM yy');
          if (!monthlyData[month]) {
            monthlyData[month] = { income: 0, expenses: 0 };
          }
          monthlyData[month].expenses += expense.amount;
        });

        const formattedData = Object.keys(monthlyData).map(month => ({
          month: month,
          // Income is placeholder until the feature is added.
          income: monthlyData[month].income, 
          expenses: monthlyData[month].expenses,
        }));
        
        formattedData.sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());

        setChartData(formattedData);
    }
    fetchData();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs. Expenses</CardTitle>
        <CardDescription>Your monthly financial overview.</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={chartData} dir={dir}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                        contentStyle={{ 
                            borderRadius: 'var(--radius)',
                            border: '1px solid hsl(var(--border))',
                            background: 'hsl(var(--card))'
                        }} 
                    />
                    <Legend />
                    <Bar dataKey="income" fill="hsl(var(--primary))" name="Income" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Expenses" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

    