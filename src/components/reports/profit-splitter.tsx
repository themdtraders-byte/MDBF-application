
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, eachMonthOfInterval, startOfMonth, isSameMonth, parseISO } from "date-fns";
import { dbLoad, dbSave, dbClearAndSave } from "@/lib/db";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Icons } from "@/components/icons";
import { FormattedCurrency } from "../ui/formatted-currency";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";

type Sale = { invoiceDate: string | Date; grandTotal: number };
type Purchase = { purchaseDate: string | Date; grandTotal: number };
type Expense = { date: string | Date; amount: number };
type SalaryTransaction = { workerId: string; date: string; type: string; amount: number; };
type ProductionHistory = { productionDate: string | Date, laborCosts?: { cost: number }[] };

type Split = { id: string; name: string; type: 'percentage' | 'fixed'; value: number; };

const splitSchema = z.object({
  name: z.string().min(2, "Split name is required."),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().min(0.01, "Value must be greater than 0."),
});
type SplitFormValues = z.infer<typeof splitSchema>;

const ensureDate = (dateValue: string | Date): Date => {
  if (dateValue instanceof Date) return dateValue;
  return parseISO(dateValue);
}

export function ProfitSplitter() {
  const { toast } = useToast();
  const sales = useLiveQuery<Sale[], Sale[]>(() => dbLoad("sales"), []) || [];
  const purchases = useLiveQuery<Purchase[], Purchase[]>(() => dbLoad("purchases"), []) || [];
  const expenses = useLiveQuery<Expense[], Expense[]>(() => dbLoad("expenses"), []) || [];
  const salaryTxs = useLiveQuery<SalaryTransaction[], SalaryTransaction[]>(() => dbLoad("salary-transactions"), []) || [];
  const prodHistory = useLiveQuery<ProductionHistory[], ProductionHistory[]>(() => dbLoad("production-history"), []) || [];
  const splits = useLiveQuery<Split[], Split[]>(() => dbLoad("profit-splits"), []) || [];

  const [isFormVisible, setIsFormVisible] = React.useState(false);

  const form = useForm<SplitFormValues>({
    resolver: zodResolver(splitSchema),
    defaultValues: { name: "", type: "percentage", value: 0 },
  });

  const monthlyIncome = React.useMemo(() => {
    const allData = [...sales, ...purchases, ...expenses, ...salaryTxs, ...prodHistory];
    if (allData.length === 0) return [];
    
    const allDates = allData.map(d => ensureDate(d.invoiceDate || d.purchaseDate || d.date || d.productionDate)).filter(d => !isNaN(d.getTime()));
    if (allDates.length === 0) return [];
    
    const firstDate = new Date(Math.min.apply(null, allDates.map(d => d.getTime())));
    const lastDate = new Date(Math.max.apply(null, allDates.map(d => d.getTime())));

    if (isNaN(firstDate.getTime()) || isNaN(lastDate.getTime())) return [];
    
    const months = eachMonthOfInterval({ start: firstDate, end: lastDate });
    
    return months.map(month => {
        const monthStart = startOfMonth(month);
        
        const isDateInMonth = (dateValue: string | Date) => {
            const date = ensureDate(dateValue);
            return isSameMonth(date, monthStart);
        }

        const totalSales = sales.filter(s => s.invoiceDate && isDateInMonth(s.invoiceDate)).reduce((acc, s) => acc + s.grandTotal, 0);
        const totalPurchases = purchases.filter(p => p.purchaseDate && isDateInMonth(p.purchaseDate)).reduce((acc, p) => acc + p.grandTotal, 0);
        const totalExpenses = expenses.filter(e => e.date && isDateInMonth(e.date)).reduce((acc, e) => acc + e.amount, 0);

        const totalWorkBasedPaid = prodHistory
            .filter(p => p.productionDate && isDateInMonth(p.productionDate))
            .flatMap(p => p.laborCosts || [])
            .reduce((sum, lc) => sum + lc.cost, 0);
        
        const totalSalaryPaid = salaryTxs
            .filter(t => t.date && isDateInMonth(t.date) && t.type === 'salary')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const totalWorkerCosts = totalWorkBasedPaid + totalSalaryPaid;

        const netProfit = totalSales - (totalPurchases + totalExpenses + totalWorkerCosts);
        
        let remainingIncome = netProfit;
        const splitCalculations: Record<string, number> = {};

        (splits || []).forEach(split => {
            let splitAmount = 0;
            if (split.type === 'percentage') {
                splitAmount = (netProfit / 100) * split.value;
            } else { // fixed
                splitAmount = split.value;
            }
            splitCalculations[split.name] = splitAmount;
            remainingIncome -= splitAmount;
        });


        return {
            month: format(month, 'MMMM yyyy'),
            netProfit: netProfit,
            splits: splitCalculations,
            netRemaining: remainingIncome,
        };
    }).reverse();
  }, [sales, purchases, expenses, salaryTxs, prodHistory, splits]);
  
  const handleAddSplit = async (data: SplitFormValues) => {
    const newSplit: Split = {
        id: `split-${Date.now()}`,
        ...data,
    };
    const currentSplits = await dbLoad("profit-splits");
    const updatedSplits = [...currentSplits, newSplit];
    await dbSave("profit-splits", updatedSplits);
    toast({ title: "Split Added", description: `"${data.name}" has been added.` });
    form.reset({ name: "", type: "percentage", value: 0 });
    setIsFormVisible(false);
  };
  
  const handleRemoveSplit = async (id: string) => {
    const currentSplits = await dbLoad("profit-splits");
    const updatedSplits = currentSplits.filter(s => s.id !== id);
    await dbClearAndSave("profit-splits", updatedSplits);
    toast({ title: "Split Removed" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profit Splitter</CardTitle>
          <CardDescription>Define how your monthly net profit is distributed.</CardDescription>
        </CardHeader>
        <CardContent>
            {isFormVisible ? (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddSplit)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 border rounded-lg">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Split Name</FormLabel><FormControl><Input placeholder="e.g., Tax, Charity" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed Amount (PKR)</SelectItem></SelectContent></Select><FormMessage/></FormItem>)} />
                        <FormField control={form.control} name="value" render={({ field }) => (<FormItem><FormLabel>Value</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="flex gap-2">
                           <Button type="submit"><Icons.check className="h-4 w-4" /> Save</Button>
                           <Button type="button" variant="ghost" onClick={() => setIsFormVisible(false)}>Cancel</Button>
                        </div>
                    </form>
                </Form>
            ) : (
                <Button onClick={() => setIsFormVisible(true)}><Icons.plus className="mr-2" /> Add New Split</Button>
            )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Monthly Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Net Profit</TableHead>
                {(splits || []).map(split => (
                    <TableHead key={split.id} className="text-right">
                        <div className="flex justify-end items-center gap-1">
                          {split.name}
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleRemoveSplit(split.id)}>
                            <Icons.trash className="h-3 w-3" />
                          </Button>
                        </div>
                    </TableHead>
                ))}
                <TableHead className="text-right font-bold">Net Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyIncome.map(row => (
                <TableRow key={row.month}>
                  <TableCell className="font-medium">{row.month}</TableCell>
                  <TableCell className={cn("text-right font-semibold", row.netProfit >= 0 ? "text-green-600" : "text-destructive")}>
                    <FormattedCurrency amount={row.netProfit} />
                  </TableCell>
                  {(splits || []).map(split => (
                    <TableCell key={split.id} className="text-right">
                        <FormattedCurrency amount={row.splits[split.name] || 0} />
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold">
                    <FormattedCurrency amount={row.netRemaining} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
