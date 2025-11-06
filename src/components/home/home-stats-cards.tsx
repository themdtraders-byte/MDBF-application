
"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ArrowDown, BarChart, Wallet, Landmark } from "lucide-react";
import { dbLoad } from "@/lib/db";
import { isSameMonth, startOfMonth, parseISO } from "date-fns";
import { FormattedCurrency } from "../ui/formatted-currency";

const Icons = {
    income: TrendingUp,
    expenses: ArrowDown,
    balance: BarChart,
    cash: Wallet,
    bank: Landmark,
}

type Account = { balance?: number; };
type Expense = { date: string; amount: number; };

export function HomeStatsCards() {
  const { t, dir } = useLanguage();
  const [stats, setStats] = useState({
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      totalCashAndBank: 0,
  });

  useEffect(() => {
    const calculateStats = async () => {
        // For Home dashboard, we'll calculate some simple stats for the current month.
        // Note: A dedicated 'income' module doesn't exist yet, so we'll treat it as 0 for now.
        const expenses: Expense[] = await dbLoad("expenses");
        const accounts: Account[] = await dbLoad("accounts");
        
        const now = new Date();
        const thisMonthStart = startOfMonth(now);

        const expensesThisMonth = expenses
          .filter(e => isSameMonth(parseISO(e.date), thisMonthStart))
          .reduce((sum, e) => sum + e.amount, 0);

        const totalIncome = 0; // Placeholder until income module is added
        const netBalance = totalIncome - expensesThisMonth;
        const totalCashAndBank = accounts.reduce((acc, account) => acc + (account.balance || 0), 0);

        setStats({
          totalIncome,
          totalExpenses: expensesThisMonth,
          netBalance,
          totalCashAndBank,
        });
    }
    calculateStats();
  }, []);
  
  const statCards = [
      {
          id: 'income',
          title: 'Total Income',
          amount: stats.totalIncome,
          change: 'This month\'s income',
          Icon: Icons.income
      },
      {
          id: 'expenses',
          title: 'Total Expenses',
          amount: stats.totalExpenses,
          change: 'This month\'s spending',
          Icon: Icons.expenses
      },
      {
          id: 'balance',
          title: 'Net Balance',
          amount: stats.netBalance,
          change: 'This month\'s savings',
          Icon: Icons.balance
      },
      {
          id: 'cash',
          title: 'Cash & Bank',
          amount: stats.totalCashAndBank,
          change: 'Total liquid assets',
          Icon: Icons.bank
      }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card) => (
        <Card key={card.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <card.Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
              <FormattedCurrency amount={card.amount} integerClassName="text-2xl" decimalClassName="text-lg" />
            </div>
            <p className="text-xs text-muted-foreground">{card.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
