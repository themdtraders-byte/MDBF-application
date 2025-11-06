
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { dbLoad } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { FormattedCurrency } from "../ui/formatted-currency";
import { DateRange } from "react-day-picker";

type Sale = { grandTotal: number; invoiceDate: string | Date };
type Purchase = { grandTotal: number; purchaseDate: string | Date };
type Expense = { amount: number; date: string | Date };
type SalaryTransaction = { amount: number; date: string | Date; };
type ProductionHistory = { laborCosts?: { cost: number }[], productionDate: string | Date };


export function ProfitAndLossReport() {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allPurchases, setAllPurchases] = useState<Purchase[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allSalaryTxs, setAllSalaryTxs] = useState<SalaryTransaction[]>([]);
  const [allProduction, setAllProduction] = useState<ProductionHistory[]>([]);


  useEffect(() => {
    const fetchAllData = async () => {
      setAllSales(await dbLoad("sales"));
      setAllPurchases(await dbLoad("purchases"));
      setAllExpenses(await dbLoad("expenses"));
      setAllSalaryTxs(await dbLoad("salary-transactions"));
      setAllProduction(await dbLoad("production-history"));
    };
    fetchAllData();
  }, []);

  const financials = useMemo(() => {
    const filterByDate = (items: any[], dateKey: string) => {
      if (!dateRange?.from) return items;
      const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
      return items.filter(item => {
        const dateValue = item[dateKey];
        if (!dateValue) return false;
        const dateString = typeof dateValue === 'string' ? dateValue : dateValue.toISOString();
        try {
            return isWithinInterval(parseISO(dateString), interval);
        } catch (e) {
            console.error(`Invalid date string encountered in P&L report: ${dateString}`);
            return false;
        }
      });
    };

    const sales = filterByDate(allSales, 'invoiceDate');
    const purchases = filterByDate(allPurchases, 'purchaseDate');
    const expenses = filterByDate(allExpenses, 'date');
    const salaryTxs = filterByDate(allSalaryTxs, 'date');
    const production = filterByDate(allProduction, 'productionDate');

    const totalSales = sales.reduce((acc, sale) => acc + sale.grandTotal, 0);
    const costOfGoodsSold = purchases.reduce((acc, purchase) => acc + purchase.grandTotal, 0);
    
    // Worker costs
    const totalSalaryPayments = salaryTxs.reduce((acc, tx) => acc + (tx.amount || 0), 0);
    const totalProductionLaborCost = production.flatMap(p => p.laborCosts || []).reduce((acc, lc) => acc + (lc.cost || 0), 0);
    const totalWorkerCost = totalSalaryPayments + totalProductionLaborCost;

    // General expenses
    const totalGeneralExpenses = expenses.reduce((acc, expense) => acc + expense.amount, 0);
    
    const totalOperatingExpenses = totalGeneralExpenses + totalWorkerCost;

    const grossProfit = totalSales - costOfGoodsSold;
    const netProfit = grossProfit - totalOperatingExpenses;

    return {
        totalSales,
        costOfGoodsSold,
        grossProfit,
        totalGeneralExpenses,
        totalWorkerCost,
        totalOperatingExpenses,
        netProfit,
    };
  }, [allSales, allPurchases, allExpenses, allSalaryTxs, allProduction, dateRange]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>{t("profitAndLoss")}</CardTitle>
                <CardDescription>Your financial summary for a selected period.</CardDescription>
            </div>
            <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow className="bg-muted/20">
                    <TableCell className="font-semibold">Revenue (Total Sales)</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                        <FormattedCurrency amount={financials.totalSales} />
                    </TableCell>
                </TableRow>
                 <TableRow>
                    <TableCell className="pl-8">Cost of Goods Sold (Purchases)</TableCell>
                    <TableCell className="text-right text-destructive">
                        (<FormattedCurrency amount={financials.costOfGoodsSold} />)
                    </TableCell>
                </TableRow>
                 <TableRow className="bg-muted/50">
                    <TableCell className="font-semibold">Gross Profit</TableCell>
                    <TableCell className={cn("text-right font-bold", financials.grossProfit >= 0 ? 'text-green-600' : 'text-destructive')}>
                        <FormattedCurrency amount={financials.grossProfit} />
                    </TableCell>
                </TableRow>
                 <TableRow>
                    <TableCell className="pl-8 font-semibold">Operating Expenses</TableCell>
                    <TableCell className="text-right text-destructive"></TableCell>
                </TableRow>
                 <TableRow>
                    <TableCell className="pl-16">General & Admin Expenses</TableCell>
                    <TableCell className="text-right text-destructive">
                       (<FormattedCurrency amount={financials.totalGeneralExpenses} />)
                    </TableCell>
                </TableRow>
                 <TableRow>
                    <TableCell className="pl-16">Worker Salaries & Labor Costs</TableCell>
                    <TableCell className="text-right text-destructive">
                       (<FormattedCurrency amount={financials.totalWorkerCost} />)
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="bg-muted/50 border-t">
          <Table>
              <TableBody>
                  <TableRow className="hover:bg-transparent">
                      <TableCell className="font-bold text-lg">Net Profit</TableCell>
                       <TableCell className={cn("text-right font-extrabold text-2xl", financials.netProfit >= 0 ? 'text-green-600' : 'text-destructive')}>
                           <FormattedCurrency amount={financials.netProfit} integerClassName="text-2xl" decimalClassName="text-base" />
                       </TableCell>
                  </TableRow>
              </TableBody>
          </Table>
      </CardFooter>
    </Card>
  );
}
