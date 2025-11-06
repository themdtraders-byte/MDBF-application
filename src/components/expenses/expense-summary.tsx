
"use client"

import * as React from "react"
import Image from "next/image";
import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useLanguage } from "@/hooks/use-language"
import { TrendingUp, TrendingDown } from "lucide-react"
import { dbLoad, dbSave, dbClearAndSave } from "@/lib/db"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { DateRangePicker } from "../ui/date-range-picker"
import { isSameMonth, startOfMonth, subMonths, parseISO, format, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "../ui/button"
import { Icons } from "../icons"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { AddExpenseForm } from "./add-expense-form"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import { DateRange } from "react-day-picker";
import { ExpenseDetails } from "../expenses/expense-details";

type Expense = {
    id: string;
    categoryId: string;
    amount: number;
    date: string | Date;
    notes?: string;
    reference?: string;
    attachment?: string;
    paymentAccountId?: string;
}
type ExpenseCategory = {
    id: string;
    name: string;
}
type Account = {
    id: string;
    name: string;
}


const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#E91E63', '#9C27B0'];

const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) {
        return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
}

export function ExpenseSummary() {
  const { t, dir } = useLanguage()
  const { toast } = useToast();
  const [allExpenses, setAllExpenses] = React.useState<Expense[]>([]);
  const [categories, setCategories] = React.useState<ExpenseCategory[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [expenseChange, setExpenseChange] = React.useState({ percentage: 0, trend: 'up' });
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = React.useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = React.useState<Expense | null>(null);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = React.useState('');
  const [deleteConfirmationInput, setDeleteConfirmationInput] = React.useState('');
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);


  const getCategoryDbKey = () => {
    if (typeof window === 'undefined') return 'business-expense-categories';
    const activeAccount = localStorage.getItem('dukaanxp-active-account');
    if (activeAccount) {
      try {
        const type = JSON.parse(activeAccount).type;
        return type === 'Home' ? 'home-expense-categories' : 'business-expense-categories';
      } catch (e) {
        return 'business-expense-categories';
      }
    }
    return 'business-expense-categories';
  }

  const fetchData = async () => {
    const storedExpenses = await dbLoad("expenses");
    setAllExpenses(storedExpenses);
    const dbKey = getCategoryDbKey();
    const storedCategories = await dbLoad(dbKey);
    setCategories(storedCategories);
    const storedAccounts = await dbLoad("accounts");
    setAccounts(storedAccounts);

    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));

    const expensesThisMonth = storedExpenses
      .filter(e => isSameMonth(parseISO(String(e.date)), thisMonthStart))
      .reduce((sum, e) => sum + e.amount, 0);

    const expensesLastMonth = storedExpenses
      .filter(e => isSameMonth(parseISO(String(e.date)), lastMonthStart))
      .reduce((sum, e) => sum + e.amount, 0);
      
    const percentage = calculatePercentageChange(expensesThisMonth, expensesLastMonth);
    setExpenseChange({
        percentage: Math.abs(percentage),
        trend: percentage >= 0 ? 'up' : 'down'
    });
  }

  React.useEffect(() => {
    fetchData();
  }, []);

  const expenses = React.useMemo(() => {
    if (!dateRange?.from) return allExpenses;
    const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
    return allExpenses.filter(e => {
        const dateObject = typeof e.date === 'string' ? parseISO(e.date) : e.date;
        return isWithinInterval(dateObject, interval);
    });
  }, [allExpenses, dateRange]);


  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || t('uncategorized');
  }

  const categoryTotals = React.useMemo(() => {
      const totals: {[key: string]: { value: number, name: string }} = {};
      
      categories.forEach(cat => {
          totals[cat.id] = { value: 0, name: cat.name };
      });

      expenses.forEach(expense => {
          if (totals[expense.categoryId]) {
              totals[expense.categoryId].value += expense.amount;
          } else {
              if (!totals['uncategorized']) {
                  totals['uncategorized'] = { value: 0, name: t('uncategorized') };
              }
              totals['uncategorized'].value += expense.amount;
          }
      });

      return Object.values(totals).map((cat, index) => ({
          name: cat.name,
          value: cat.value,
          fill: COLORS[index % COLORS.length]
      })).filter(d => d.value > 0);
  }, [expenses, categories, t]);

    const monthlyExpensesChartData = React.useMemo(() => {
        const monthlyData: { [key: string]: { name: string; [category: string]: number | string } } = {};
        
        expenses.forEach(expense => {
            const dateObject = typeof expense.date === 'string' ? parseISO(expense.date) : expense.date;
            const month = format(startOfMonth(dateObject), 'MMM yy');
            const categoryName = getCategoryName(expense.categoryId);

            if (!monthlyData[month]) {
                monthlyData[month] = { name: month };
            }
            if (!monthlyData[month][categoryName]) {
                monthlyData[month][categoryName] = 0;
            }
            monthlyData[month][categoryName] = (monthlyData[month][categoryName] as number) + expense.amount;
        });

        return Object.values(monthlyData);
    }, [expenses, categories]);

  const totalExpenses = categoryTotals.reduce((acc, curr) => acc + curr.value, 0);

  const largestCategory = categoryTotals.length > 0 
    ? categoryTotals.reduce((prev, current) => (prev.value > current.value) ? prev : current)
    : null;

  const sortedExpenses = React.useMemo(() => {
    return [...expenses].sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());
  }, [expenses]);
  
  const getAccountName = (accountId: string) => {
    return accounts.find(a => a.id === accountId)?.name || 'N/A';
  }
  
  const openDeleteDialog = (expense: Expense) => {
    setExpenseToDelete(expense);
    setDeleteConfirmationCode(String(Math.floor(1000 + Math.random() * 9000)));
    setDeleteConfirmationInput('');
  }

  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return;
    const updatedExpenses = allExpenses.filter(e => e.id !== expenseToDelete.id);
    await dbClearAndSave("expenses", updatedExpenses);
    setAllExpenses(updatedExpenses);
    toast({ variant: "destructive", title: "Expense Deleted" });
    setExpenseToDelete(null);
  }

  const handleEditFinish = () => {
    setEditingExpense(null);
    fetchData();
  }


  return (
    <>
    <div className="grid gap-6">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>{t("expenseSummary")}</CardTitle>
                        <CardDescription>{t('expenseSummaryDescription')}</CardDescription>
                    </div>
                    <DateRangePicker date={dateRange} setDate={setDateRange} />
                </div>
            </CardHeader>
            <CardContent className="flex flex-col lg:flex-row gap-4">
                <div className="w-full lg:w-1/3">
                    <ChartContainer
                        config={{}}
                        className="mx-auto aspect-square h-[250px]"
                    >
                        <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie data={categoryTotals} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
                             {categoryTotals.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        </PieChart>
                    </ChartContainer>
                </div>
                 <div className="w-full lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <Card className="sm:col-span-2">
                        <CardHeader className="pb-2">
                            <CardDescription>{t('totalExpenses')}</CardDescription>
                            <CardTitle className="text-4xl">PKR {totalExpenses.toFixed(2)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                            {dateRange?.from ? `For selected period` : t('thisMonth')}
                            </div>
                        </CardContent>
                     </Card>
                      <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>{t('largestCategory')}</CardDescription>
                            <CardTitle className="text-xl">{largestCategory?.name || 'N/A'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                            PKR {largestCategory?.value.toFixed(2) || '0.00'}
                            </div>
                        </CardContent>
                     </Card>
                      <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>{t('thisMonthVsLast')}</CardDescription>
                             <CardTitle className={cn("text-xl flex items-center gap-2", expenseChange.trend === 'up' ? 'text-destructive' : 'text-green-600')}>
                                {expenseChange.percentage.toFixed(1)}%
                                {expenseChange.trend === 'up' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                            {t('changeFromLastMonth')}
                            </div>
                        </CardContent>
                     </Card>
                 </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>{t('monthlyExpenseTrend')}</CardTitle>
            </CardHeader>
            <CardContent>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={monthlyExpensesChartData} dir={dir}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.05} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} />
                            <Legend />
                            {categories.map((cat, index) => (
                                <Bar key={cat.id} dataKey={cat.name} stackId="a" fill={COLORS[index % COLORS.length]} name={cat.name} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>{t('allExpenses')}</CardTitle>
                <CardDescription>{t('allExpensesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('date')}</TableHead>
                            <TableHead>{t('category')}</TableHead>
                            <TableHead>{t('notesOptional')}</TableHead>
                            <TableHead className="text-right">{t('amount')}</TableHead>
                            <TableHead className="text-right">{t('actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedExpenses.map((expense) => (
                            <TableRow key={expense.id}>
                                <TableCell>{format(new Date(expense.date), "PPP")}</TableCell>
                                <TableCell><Badge variant="outline">{getCategoryName(expense.categoryId)}</Badge></TableCell>
                                <TableCell>{expense.notes || 'N/A'}</TableCell>
                                <TableCell className="text-right font-semibold text-destructive">PKR {expense.amount.toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => setViewingExpense(expense)}>
                                        <Icons.search className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setEditingExpense(expense)}>
                                        <Icons.settings className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => openDeleteDialog(expense)}>
                                        <Icons.trash className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {sortedExpenses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    No expenses recorded yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>

    <Dialog open={!!viewingExpense} onOpenChange={(open) => !open && setViewingExpense(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
           <DialogHeader>
             <DialogTitle>Expense Details</DialogTitle>
           </DialogHeader>
           {viewingExpense && <ExpenseDetails expense={viewingExpense} />}
        </DialogContent>
    </Dialog>

    <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('editExpense')}</DialogTitle>
                <DialogDescription>{t('expenseUpdateSuccess')}</DialogDescription>
            </DialogHeader>
            <AddExpenseForm expenseToEdit={editingExpense as any} onFinish={handleEditFinish} />
        </DialogContent>
    </Dialog>

    <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone and will permanently delete this expense record. To confirm, please type <code className="font-mono text-base bg-muted px-2 py-1 rounded-md">{deleteConfirmationCode}</code> in the box below.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="delete-confirm">Confirmation Code</Label>
                <Input
                    id="delete-confirm"
                    value={deleteConfirmationInput}
                    onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                    placeholder="Enter the code to confirm"
                    autoFocus
                />
            </div>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteConfirmationInput !== deleteConfirmationCode} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
