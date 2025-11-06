

"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useLanguage } from "@/hooks/use-language"
import { isSameMonth, startOfMonth, subMonths, format, parseISO } from 'date-fns';
import { dbLoad } from "@/lib/db";

const loadAccountData = async (accountId: string, key: string) => {
    if (typeof window === 'undefined') return [];
    const originalAccount = localStorage.getItem('dukaanxp-active-account');
    localStorage.setItem('dukaanxp-active-account', JSON.stringify({ id: accountId, type: 'Business' }));
    const data = await dbLoad(key);
    if(originalAccount) {
        localStorage.setItem('dukaanxp-active-account', originalAccount);
    } else {
        localStorage.removeItem('dukaanxp-active-account');
    }
    return data;
};

const getDate = (dateValue: string | Date): Date => {
  return typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
}

export function GlobalEquityChart({ accounts }: { accounts: any[] }) {
  const { t, dir } = useLanguage();
  const [chartData, setChartData] = React.useState<any[]>([]);

  React.useEffect(() => {
    const processData = async () => {
      const monthlyData: { [key: string]: { sales: number, purchases: number, expenses: number, workerPayments: number } } = {};

      for (const account of accounts) {
          const sales = await loadAccountData(account.id, 'sales');
          const purchases = await loadAccountData(account.id, 'purchases');
          const expenses = await loadAccountData(account.id, 'expenses');
          const salaryTxs = await loadAccountData(account.id, 'salary-transactions');
          const productionHistory = await loadAccountData(account.id, 'production-history');
          
          sales.forEach((sale: any) => {
              const month = format(startOfMonth(getDate(sale.invoiceDate)), 'MMM yy');
              if (!monthlyData[month]) monthlyData[month] = { sales: 0, purchases: 0, expenses: 0, workerPayments: 0 };
              monthlyData[month].sales += sale.grandTotal;
          });

          purchases.forEach((purchase: any) => {
              const month = format(startOfMonth(getDate(purchase.purchaseDate)), 'MMM yy');
              if (!monthlyData[month]) monthlyData[month] = { sales: 0, purchases: 0, expenses: 0, workerPayments: 0 };
              monthlyData[month].purchases += purchase.grandTotal;
          });
          
          expenses.forEach((expense: any) => {
              const month = format(startOfMonth(getDate(expense.date)), 'MMM yy');
              if (!monthlyData[month]) monthlyData[month] = { sales: 0, purchases: 0, expenses: 0, workerPayments: 0 };
              monthlyData[month].expenses += expense.amount;
          });
          
          salaryTxs.forEach((tx: any) => {
            const month = format(startOfMonth(getDate(tx.date)), 'MMM yy');
            if (!monthlyData[month]) monthlyData[month] = { sales: 0, purchases: 0, expenses: 0, workerPayments: 0 };
            monthlyData[month].workerPayments += tx.amount;
          });

          productionHistory.forEach((prod: any) => {
            (prod.laborCosts || []).forEach((lc: any) => {
                const month = format(startOfMonth(getDate(prod.productionDate)), 'MMM yy');
                if (!monthlyData[month]) monthlyData[month] = { sales: 0, purchases: 0, expenses: 0, workerPayments: 0 };
                monthlyData[month].workerPayments += lc.cost;
            })
          });
      }

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
      
      setChartData(formattedData);
    };

    processData();
  }, [accounts]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('overallEquityTrend')}</CardTitle>
        <CardDescription>Monthly Financials Across All Businesses</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={chartData} dir={dir}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.05} />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => new Intl.NumberFormat('en-US', {notation: 'compact'}).format(value as number)} />
                    <Tooltip 
                        contentStyle={{ 
                            borderRadius: 'var(--radius)',
                            border: '1px solid hsl(var(--border))',
                            background: 'hsl(var(--card))'
                        }} 
                        formatter={(value) => `PKR ${(value as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    />
                    <Legend />
                    <Bar dataKey="sales" fill="hsl(var(--chart-1))" name="Total Sales" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="purchases" fill="hsl(var(--chart-2))" name="Total Purchases" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="hsl(var(--chart-4))" name="Total Expenses" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="workerPayments" fill="hsl(var(--chart-5))" name="Worker Payments" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" fill="hsl(var(--primary))" name={t('netProfit')} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
