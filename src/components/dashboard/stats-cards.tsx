
"use client";

import { useMemo } from "react";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dbLoad } from "@/lib/db";
import { TrendingUp, ArrowDown, BarChart, Wallet, ChevronRight, Users, HandCoins, Handshake, PiggyBank, Scale, ShoppingCart } from "lucide-react";
import { subMonths, isSameMonth, startOfMonth, parseISO, isBefore, eachMonthOfInterval, getDaysInMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { FormattedCurrency } from "../ui/formatted-currency";
import { useLiveQuery } from "dexie-react-hooks";

type Sale = { grandTotal: number; invoiceDate: string };
type Purchase = { grandTotal: number; purchaseDate: string };
type Expense = { amount: number; date: string };
type Account = { balance?: number; };
type Customer = { balance: number };
type Supplier = { balance: number };
type Worker = { id: string, joiningDate: string | Date, workType: 'salary' | 'work_based', salary?: number, allowedLeaves?: number };
type SalaryTransaction = { workerId: string, date: string, type: string, amount: number };
type ProductionBatch = { productionDate: string, laborCosts?: { workerId: string, cost: number }[] };
type AttendanceRecord = { workerId: string, date: string, status: 'p' | 'a' | 'l' };

interface StatsCardsProps {
    onSalesClick: () => void;
    onExpensesClick: () => void;
    onProfitClick: () => void;
    onCashClick: () => void;
    onWorkersClick: () => void;
}

const Icons = {
    profit: BarChart,
    cash: Wallet,
    receivables: HandCoins,
    payables: Handshake,
    originalProfit: Scale,
    sales: TrendingUp,
    purchases: ShoppingCart,
    expenses: ArrowDown,
    workers: Users,
}

const ensureDate = (dateValue: string | Date): Date => {
  if (dateValue instanceof Date) return dateValue;
  return parseISO(dateValue);
}

export function StatsCards({ onSalesClick, onExpensesClick, onProfitClick, onCashClick, onWorkersClick }: StatsCardsProps) {
  const { t, dir } = useLanguage();
  const sales: Sale[] = useLiveQuery(() => dbLoad("sales"), []) || [];
  const purchases: Purchase[] = useLiveQuery(() => dbLoad("purchases"), []) || [];
  const expenses: Expense[] = useLiveQuery(() => dbLoad("expenses"), []) || [];
  const accounts: Account[] = useLiveQuery(() => dbLoad("accounts"), []) || [];
  const salaryTxs: SalaryTransaction[] = useLiveQuery(() => dbLoad("salary-transactions"), []) || [];
  const productionHistory: ProductionBatch[] = useLiveQuery(() => dbLoad("production-history"), []) || [];
  const customers: Customer[] = useLiveQuery(() => dbLoad("customers"), []) || [];
  const suppliers: Supplier[] = useLiveQuery(() => dbLoad("suppliers"), []) || [];
  const workers: Worker[] = useLiveQuery(() => dbLoad("workers"), []) || [];
  const attendance: AttendanceRecord[] = useLiveQuery(() => dbLoad("attendance"), []) || [];

  const stats = useMemo(() => {
      const now = new Date();
      const thisMonthStart = startOfMonth(now);

      const isDateInMonth = (dateValue: string | Date) => {
        if (!dateValue) return false;
        return isSameMonth(ensureDate(dateValue), thisMonthStart);
      }

      const salesThisMonth = sales.filter(s => isDateInMonth(s.invoiceDate)).reduce((acc, sale) => acc + sale.grandTotal, 0);
      const purchasesThisMonth = purchases.filter(p => isDateInMonth(p.purchaseDate)).reduce((acc, p) => acc + p.grandTotal, 0);
      const expensesThisMonth = expenses.filter(e => isDateInMonth(e.date)).reduce((acc, expense) => acc + expense.amount, 0);
      
      // Worker Costs Calculation
      const workerCostsThisMonth = (salaryTxs.filter(tx => isDateInMonth(tx.date)).reduce((sum, tx) => sum + tx.amount, 0)) + 
                                  (productionHistory.filter(p => isDateInMonth(p.productionDate)).flatMap(p => p.laborCosts || []).reduce((sum, lc) => sum + (lc.cost || 0), 0));
      
      const netProfit = salesThisMonth - (purchasesThisMonth + expensesThisMonth + workerCostsThisMonth);

      // Receivables Calculation
      const customerReceivables = customers.reduce((acc, cust) => acc + (cust.balance > 0 ? cust.balance : 0), 0);
      const supplierAdvances = suppliers.reduce((acc, sup) => acc + (sup.balance < 0 ? Math.abs(sup.balance) : 0), 0);

      // Worker Balance Calculation
      let workerAdvances = 0;
      let workerPayables = 0;

      workers.forEach(worker => {
        let totalEarnings = 0;
        let totalDeductions = 0;
        const joinDate = ensureDate(worker.joiningDate);
        const endDate = new Date();

        if (isBefore(joinDate, endDate)) {
            const months = eachMonthOfInterval({ start: joinDate, end: endDate });
            months.forEach(monthStart => {
                if (worker.workType === 'salary') {
                    const daysInMonth = getDaysInMonth(monthStart);
                    const dailyRate = (worker.salary || 0) / daysInMonth;
                    const presentDays = attendance.filter(a => a.workerId === worker.id && a.status === 'p' && isSameMonth(parseISO(a.date), monthStart)).length;
                    const paidLeaves = Math.min(attendance.filter(a => a.workerId === worker.id && a.status === 'l' && isSameMonth(parseISO(a.date), monthStart)).length, worker.allowedLeaves || 0);
                    totalEarnings += (presentDays + paidLeaves) * dailyRate;
                }
            });
        }
        
        if (worker.workType === 'work_based') {
             totalEarnings += productionHistory.flatMap(p => p.laborCosts || []).filter(lc => lc.workerId === worker.id).reduce((sum, lc) => sum + (lc.cost || 0), 0);
        }

        totalEarnings += salaryTxs.filter(t => t.workerId === worker.id && (t.type === 'tip' || (t.type === 'adjustment' && t.amount > 0))).reduce((sum, t) => sum + t.amount, 0);
        totalDeductions += salaryTxs.filter(t => t.workerId === worker.id && (t.type === 'salary' || t.type === 'advance' || (t.type === 'daily_expense' || (t.type === 'adjustment' && t.amount < 0)))).reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        totalDeductions += salaryTxs.filter(t => t.workerId === worker.id && t.type === 'penalty').reduce((sum, t) => sum + t.amount, 0);

        const balance = totalEarnings - totalDeductions;
        if(balance > 0) workerPayables += balance;
        if(balance < 0) workerAdvances += Math.abs(balance);
      });

      const totalReceivables = customerReceivables + workerAdvances + supplierAdvances;
      
      // Payables Calculation
      const supplierPayables = suppliers.reduce((acc, sup) => acc + (sup.balance > 0 ? sup.balance : 0), 0);
      const totalPayables = supplierPayables + workerPayables;
      
      const originalProfit = netProfit + totalReceivables - totalPayables;
      const totalAccountBalance = accounts.reduce((acc, account) => acc + (Number(account.balance) || 0), 0);

      return {
          totalSales: salesThisMonth,
          totalPurchases: purchasesThisMonth,
          totalExpenses: expensesThisMonth,
          totalWorkerCosts: workerCostsThisMonth,
          netProfit,
          totalPayables,
          totalReceivables,
          originalProfit,
          cashInHand: totalAccountBalance,
      };
  }, [sales, purchases, expenses, accounts, salaryTxs, productionHistory, customers, suppliers, workers, attendance]);

  const statCards = [
       {
          id: 'sales',
          title: t('totalSales'),
          amount: stats.totalSales,
          change: t('thisMonth'),
          Icon: Icons.sales,
          color: "text-green-600",
          onClick: onSalesClick,
      },
      {
          id: 'purchases',
          title: t('totalPurchases'),
          amount: stats.totalPurchases,
          change: t('thisMonth'),
          Icon: Icons.purchases,
          color: "text-amber-600",
          onClick: () => {} // Placeholder for purchases click
      },
      {
          id: 'expenses',
          title: t('totalExpenses'),
          amount: stats.totalExpenses,
          change: t('thisMonth'),
          Icon: Icons.expenses,
          color: "text-orange-500",
          onClick: onExpensesClick
      },
      {
          id: 'workerCosts',
          title: 'Worker Costs',
          amount: stats.totalWorkerCosts,
          change: t('thisMonth'),
          Icon: Icons.workers,
          color: "text-red-500",
          onClick: onWorkersClick
      },
       {
          id: 'netProfit',
          title: 'Net Profit',
          amount: stats.netProfit,
          change: t('thisMonth'),
          Icon: Icons.profit,
          color: stats.netProfit >= 0 ? "text-green-600" : "text-destructive",
          onClick: onProfitClick
      },
      {
          id: 'receivables',
          title: 'Total Receivables',
          amount: stats.totalReceivables,
          change: 'From Customers & Advances',
          Icon: Icons.receivables,
          color: "text-blue-500",
          onClick: () => {} // Placeholder
      },
      {
          id: 'payables',
          title: 'Total Payables',
          amount: stats.totalPayables,
          change: 'To Suppliers & Workers',
          Icon: Icons.payables,
          color: "text-red-600",
          onClick: () => {} // Placeholder
      },
      {
          id: 'originalProfit',
          title: 'Original Profit',
          amount: stats.originalProfit,
          change: 'After Payables/Receivables',
          Icon: Icons.originalProfit,
          color: stats.originalProfit >= 0 ? "text-blue-600" : "text-orange-500",
          onClick: onProfitClick
      },
      {
          id: 'cash',
          title: 'Cash In Hand',
          amount: stats.cashInHand,
          change: t('totalOfAllAccounts'),
          Icon: Icons.cash,
          color: "text-primary",
          onClick: onCashClick
      }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      {statCards.map((card) => (
        <Card key={card.id} onClick={card.onClick} className="cursor-pointer hover:bg-muted/50 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 p-3 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <card.Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className={cn("text-2xl font-bold", card.color)}>
              <FormattedCurrency amount={card.amount} integerClassName="text-2xl" decimalClassName="text-base" />
            </div>
            <p className="text-xs text-muted-foreground">{card.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
