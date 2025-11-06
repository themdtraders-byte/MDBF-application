

"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useLanguage } from "@/hooks/use-language"
import { dbLoad } from "@/lib/db"
import { format, startOfMonth, parseISO } from 'date-fns'
import { useLiveQuery } from "dexie-react-hooks"

type Sale = { invoiceDate: string | Date; grandTotal: number; };
type Purchase = { purchaseDate: string | Date; grandTotal: number; };
type Expense = { date: string | Date; amount: number; };
type SalaryTransaction = { date: string | Date; amount: number; };
type ProductionHistory = { productionDate: string | Date; laborCosts?: { cost: number }[] };

export function SalesChart() {
  const { t, dir } = useLanguage();
  const sales = useLiveQuery<Sale[], Sale[]>(() => dbLoad("sales"), []) || [];
  const purchases = useLiveQuery<Purchase[], Purchase[]>(() => dbLoad("purchases"), []) || [];
  const expenses = useLiveQuery<Expense[], Expense[]>(() => dbLoad("expenses"), []) || [];
  const salaryTxs = useLiveQuery<SalaryTransaction[], SalaryTransaction[]>(() => dbLoad("salary-transactions"), []) || [];
  const productionHistory = useLiveQuery<ProductionHistory[], ProductionHistory[]>(() => dbLoad("production-history"), []) || [];

  const chartData = React.useMemo(() => {
    const monthlyData: { [key: string]: { sales: number, purchases: number, expenses: number, workerPayments: number } } = {};

    const getDate = (dateValue: string | Date): Date => {
        return typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
    }
    
    // Process Sales
    sales.forEach(sale => {
      const month = format(startOfMonth(getDate(sale.invoiceDate)), 'MMM yy');
      if (!monthlyData[month]) {
        monthlyData[month] = { sales: 0, purchases: 0, expenses: 0, workerPayments: 0 };
      }
      monthlyData[month].sales += sale.grandTotal;
    });

    // Process Purchases
    purchases.forEach(purchase => {
      const month = format(startOfMonth(getDate(purchase.purchaseDate)), 'MMM yy');
      if (!monthlyData[month]) {
        monthlyData[month] = { sales: 0, purchases: 0, expenses: 0, workerPayments: 0 };
      }
      monthlyData[month].purchases += purchase.grandTotal;
    });
    
    // Process Expenses
    expenses.forEach(expense => {
      const month = format(startOfMonth(getDate(expense.date)), 'MMM yy');
      if (!monthlyData[month]) {
        monthlyData[month] = { sales: 0, purchases: 0, expenses: 0, workerPayments: 0 };
      }
      monthlyData[month].expenses += expense.amount;
    });
    
    // Process Worker Payments
    salaryTxs.forEach(tx => {
        const month = format(startOfMonth(getDate(tx.date)), 'MMM yy');
        if (!monthlyData[month]) {
            monthlyData[month] = { sales: 0, purchases: 0, expenses: 0, workerPayments: 0 };
        }
        monthlyData[month].workerPayments += tx.amount;
    });
    productionHistory.forEach(prod => {
        (prod.laborCosts || []).forEach(lc => {
             const month = format(startOfMonth(getDate(prod.productionDate)), 'MMM yy');
            if (!monthlyData[month]) {
                monthlyData[month] = { sales: 0, purchases: 0, expenses: 0, workerPayments: 0 };
            }
            monthlyData[month].workerPayments += lc.cost;
        })
    })
    
    const formattedData = Object.keys(monthlyData).map(month => {
      const data = monthlyData[month];
      const profit = data.sales - (data.purchases + data.expenses + data.workerPayments);
      return {
        date: month,
        sales: data.sales,
        purchases: data.purchases,
        expenses: data.expenses,
        workerPayments: data.workerPayments,
        profit: profit,
      };
    });
    
    formattedData.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return formattedData;
  }, [sales, purchases, expenses, salaryTxs, productionHistory]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Financial Overview</CardTitle>
        <CardDescription>A summary of your key financial metrics each month.</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={chartData} dir={dir}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.05} />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value as number)} />
                    <Tooltip 
                        contentStyle={{ 
                            borderRadius: 'var(--radius)',
                            border: '1px solid hsl(var(--border))',
                            background: 'hsl(var(--card))'
                        }} 
                        formatter={(value) => `PKR ${(value as number).toLocaleString()}`}
                    />
                    <Legend />
                    <Bar dataKey="sales" fill="hsl(var(--chart-1))" name={t('sales')} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="purchases" fill="hsl(var(--chart-2))" name={t('purchases')} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="hsl(var(--chart-4))" name={t('expenses')} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="workerPayments" fill="hsl(var(--chart-5))" name="Worker Payments" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" fill="hsl(var(--primary))" name={t('netProfit')} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
