
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { dbLoad } from "@/lib/db";
import { isToday, isThisMonth, parseISO, startOfMonth, format, eachMonthOfInterval, endOfMonth } from "date-fns";
import { FormattedCurrency } from "../ui/formatted-currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";

type Sale = { grandTotal: number, invoiceDate: string | Date };
type Purchase = { grandTotal: number, purchaseDate: string | Date };
type Expense = { amount: number, date: string | Date };
type SalaryTransaction = { amount: number; date: string; type: string };
type ProductionHistory = { productionDate: string | Date, laborCosts?: { cost: number }[] };


const ensureDate = (dateValue: string | Date): Date => {
  if (dateValue instanceof Date) return dateValue;
  return parseISO(dateValue);
}

export function DailySummaryReport() {
  const { t } = useLanguage();
  const [todayStats, setTodayStats] = useState({ sales: 0, purchases: 0, expenses: 0 });
  const [monthStats, setMonthStats] = useState({ sales: 0, purchases: 0, expenses: 0 });
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allPurchases, setAllPurchases] = useState<Purchase[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allSalaryTransactions, setAllSalaryTransactions] = useState<SalaryTransaction[]>([]);
  const [allProductionHistory, setAllProductionHistory] = useState<ProductionHistory[]>([]);

  const [visibleColumns, setVisibleColumns] = useState({
      sales: true,
      purchases: true,
      expenses: true,
      workerCosts: true,
      profit: true,
  });

  useEffect(() => {
    const fetchData = async () => {
        const sales: Sale[] = await dbLoad("sales");
        const purchases: Purchase[] = await dbLoad("purchases");
        const expenses: Expense[] = await dbLoad("expenses");
        const salaryTxs: SalaryTransaction[] = await dbLoad("salary-transactions");
        const prodHistory: ProductionHistory[] = await dbLoad("production-history");

        setAllSales(sales);
        setAllPurchases(purchases);
        setAllExpenses(expenses);
        setAllSalaryTransactions(salaryTxs);
        setAllProductionHistory(prodHistory);

        const todaySales = sales.filter(s => s.invoiceDate && isToday(ensureDate(s.invoiceDate))).reduce((acc, s) => acc + s.grandTotal, 0);
        const todayPurchases = purchases.filter(p => p.purchaseDate && isToday(ensureDate(p.purchaseDate))).reduce((acc, p) => acc + p.grandTotal, 0);
        const todayExpenses = expenses.filter(e => e.date && isToday(ensureDate(e.date))).reduce((acc, e) => acc + e.amount, 0);
        setTodayStats({ sales: todaySales, purchases: todayPurchases, expenses: todayExpenses });

        const monthSales = sales.filter(s => s.invoiceDate && isThisMonth(ensureDate(s.invoiceDate))).reduce((acc, s) => acc + s.grandTotal, 0);
        const monthPurchases = purchases.filter(p => p.purchaseDate && isThisMonth(ensureDate(p.purchaseDate))).reduce((acc, p) => acc + p.grandTotal, 0);
        const monthExpenses = expenses.filter(e => e.date && isThisMonth(ensureDate(e.date))).reduce((acc, e) => acc + e.amount, 0);
        setMonthStats({ sales: monthSales, purchases: monthPurchases, expenses: monthExpenses });
    }
    fetchData();
  }, []);

  const monthlyOverview = useMemo(() => {
    const allData = [...allSales, ...allPurchases, ...allExpenses, ...allSalaryTransactions, ...allProductionHistory];
    if (allData.length === 0) return [];
    
    const allDates = allData.map(d => ensureDate(d.invoiceDate || d.purchaseDate || d.date || d.productionDate));
    const firstDate = new Date(Math.min.apply(null, allDates.map(d => d.getTime())));
    const lastDate = new Date(Math.max.apply(null, allDates.map(d => d.getTime())));

    if (isNaN(firstDate.getTime()) || isNaN(lastDate.getTime())) return [];

    const months = eachMonthOfInterval({ start: firstDate, end: lastDate });
    
    return months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        
        const isDateInMonth = (dateValue: string | Date) => {
            const date = ensureDate(dateValue);
            return date >= monthStart && date <= monthEnd;
        }

        const monthSales = allSales.filter(s => s.invoiceDate && isDateInMonth(s.invoiceDate)).reduce((acc, s) => acc + s.grandTotal, 0);
        const monthPurchases = allPurchases.filter(p => p.purchaseDate && isDateInMonth(p.purchaseDate)).reduce((acc, p) => acc + p.grandTotal, 0);
        const monthExpenses = allExpenses.filter(e => e.date && isDateInMonth(e.date)).reduce((acc, e) => acc + e.amount, 0);
        
        const monthWorkBasedCosts = allProductionHistory
            .filter(p => p.productionDate && isDateInMonth(p.productionDate))
            .flatMap(p => p.laborCosts || [])
            .reduce((sum, lc) => sum + lc.cost, 0);
            
        const monthSalaryPayments = allSalaryTransactions
            .filter(t => t.date && isDateInMonth(t.date))
            .reduce((sum, t) => sum + (t.amount || 0), 0);
            
        const monthWorkerCosts = monthWorkBasedCosts + monthSalaryPayments;
        const totalOperatingCosts = monthExpenses + monthWorkerCosts;
        const monthProfit = monthSales - (monthPurchases + totalOperatingCosts);
        
        return {
            month: format(month, 'MMMM yyyy'),
            sales: monthSales,
            purchases: monthPurchases,
            expenses: monthExpenses,
            workerCosts: monthWorkerCosts,
            profit: monthProfit,
        }
    }).reverse();
  }, [allSales, allPurchases, allExpenses, allSalaryTransactions, allProductionHistory]);

  const handleColumnToggle = (column: keyof typeof visibleColumns) => {
      setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
  }


  return (
    <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("today")}'s Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card>
                <CardHeader>
                    <CardDescription>{t('sales')}</CardDescription>
                    <CardTitle className="text-green-600">
                        <FormattedCurrency amount={todayStats.sales} integerClassName="text-3xl" decimalClassName="text-xl" />
                    </CardTitle>
                </CardHeader>
             </Card>
              <Card>
                <CardHeader>
                    <CardDescription>{t('purchases')}</CardDescription>
                    <CardTitle className="text-destructive">
                         <FormattedCurrency amount={todayStats.purchases} integerClassName="text-3xl" decimalClassName="text-xl" />
                    </CardTitle>
                </CardHeader>
             </Card>
              <Card>
                <CardHeader>
                    <CardDescription>{t('expenses')}</CardDescription>
                    <CardTitle className="text-destructive">
                         <FormattedCurrency amount={todayStats.expenses} integerClassName="text-3xl" decimalClassName="text-xl" />
                    </CardTitle>
                </CardHeader>
             </Card>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('thisMonth')}'s Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card>
                <CardHeader>
                    <CardDescription>{t('sales')}</CardDescription>
                    <CardTitle className="text-green-600">
                        <FormattedCurrency amount={monthStats.sales} integerClassName="text-3xl" decimalClassName="text-xl" />
                    </CardTitle>
                </CardHeader>
             </Card>
              <Card>
                <CardHeader>
                    <CardDescription>{t('purchases')}</CardDescription>
                    <CardTitle className="text-destructive">
                        <FormattedCurrency amount={monthStats.purchases} integerClassName="text-3xl" decimalClassName="text-xl" />
                    </CardTitle>
                </CardHeader>
             </Card>
              <Card>
                <CardHeader>
                    <CardDescription>{t('expenses')}</CardDescription>
                    <CardTitle className="text-destructive">
                        <FormattedCurrency amount={monthStats.expenses} integerClassName="text-3xl" decimalClassName="text-xl" />
                    </CardTitle>
                </CardHeader>
             </Card>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Monthly Overview</CardTitle>
                <CardDescription>A month-by-month breakdown of your business performance.</CardDescription>
                <div className="flex items-center space-x-4 pt-4 flex-wrap">
                    <Label>Show Columns:</Label>
                    {Object.keys(visibleColumns).map((key) => (
                        <div key={key} className="flex items-center space-x-2">
                             <Checkbox
                                id={`check-${key}`}
                                checked={visibleColumns[key as keyof typeof visibleColumns]}
                                onCheckedChange={() => handleColumnToggle(key as keyof typeof visibleColumns)}
                            />
                            <Label htmlFor={`check-${key}`} className="capitalize text-sm font-normal">
                                {t(key as any, {defaultValue: key.replace('Costs', ' Costs')})}
                            </Label>
                        </div>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Month</TableHead>
                            {visibleColumns.sales && <TableHead className="text-right">Sales</TableHead>}
                            {visibleColumns.purchases && <TableHead className="text-right">Purchases</TableHead>}
                            {visibleColumns.expenses && <TableHead className="text-right">Expenses</TableHead>}
                            {visibleColumns.workerCosts && <TableHead className="text-right">Worker Costs</TableHead>}
                            {visibleColumns.profit && <TableHead className="text-right">Profit</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {monthlyOverview.map(row => (
                            <TableRow key={row.month}>
                                <TableCell className="font-medium">{row.month}</TableCell>
                                {visibleColumns.sales && <TableCell className="text-right"><FormattedCurrency amount={row.sales} /></TableCell>}
                                {visibleColumns.purchases && <TableCell className="text-right"><FormattedCurrency amount={row.purchases} /></TableCell>}
                                {visibleColumns.expenses && <TableCell className="text-right"><FormattedCurrency amount={row.expenses} /></TableCell>}
                                {visibleColumns.workerCosts && <TableCell className="text-right"><FormattedCurrency amount={row.workerCosts} /></TableCell>}
                                {visibleColumns.profit && <TableCell className="text-right"><FormattedCurrency amount={row.profit} /></TableCell>}
                            </TableRow>
                        ))}
                         {monthlyOverview.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="text-center h-24">No data to display.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
