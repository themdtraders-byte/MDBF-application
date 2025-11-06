
"use client";

import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ArrowDown, BarChart, Wallet, HandCoins, Handshake, Scale, ShoppingCart, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormattedCurrency } from "../ui/formatted-currency";

const Icons = {
    sales: TrendingUp,
    purchases: ShoppingCart,
    expenses: ArrowDown,
    workers: Users,
    profit: BarChart,
    cash: Wallet,
    receivables: HandCoins,
    payables: Handshake,
    originalProfit: Scale,
}

interface GlobalStatsCardsProps {
    stats: {
      totalSales: number;
      totalPurchases: number;
      totalExpenses: number;
      totalWorkerCosts: number;
      totalNetProfit: number;
      totalReceivables: number;
      totalPayables: number;
      originalProfit: number;
      totalCashBalance: number;
    }
}

export function GlobalStatsCards({ stats }: GlobalStatsCardsProps) {
  const { t } = useLanguage();
  
  const statCards = [
      {
          id: 'sales',
          title: t('totalSales'),
          amount: stats.totalSales,
          change: t('thisMonth'),
          Icon: Icons.sales,
          color: 'text-green-600'
      },
      {
          id: 'purchases',
          title: t('totalPurchases'),
          amount: stats.totalPurchases,
          change: t('thisMonth'),
          Icon: Icons.purchases,
          color: "text-amber-600",
      },
      {
          id: 'expenses',
          title: t('totalExpenses'),
          amount: stats.totalExpenses,
          change: t('thisMonth'),
          Icon: Icons.expenses,
          color: "text-orange-500",
      },
      {
          id: 'workerCosts',
          title: 'Worker Costs',
          amount: stats.totalWorkerCosts,
          change: t('thisMonth'),
          Icon: Icons.workers,
          color: "text-red-500",
      },
      {
          id: 'netProfit',
          title: t('netProfit'),
          amount: stats.totalNetProfit,
          change: t('thisMonth'),
          Icon: Icons.profit,
          color: stats.totalNetProfit >= 0 ? "text-green-600" : "text-destructive",
      },
      {
          id: 'receivables',
          title: 'Total Receivables',
          amount: stats.totalReceivables,
          change: 'From Customers & Advances',
          Icon: Icons.receivables,
          color: "text-blue-500",
      },
      {
          id: 'payables',
          title: 'Total Payables',
          amount: stats.totalPayables,
          change: 'To Suppliers & Workers',
          Icon: Icons.payables,
          color: "text-red-600",
      },
      {
          id: 'originalProfit',
          title: 'Original Profit',
          amount: stats.originalProfit,
          change: 'After Payables/Receivables',
          Icon: Icons.originalProfit,
          color: stats.originalProfit >= 0 ? "text-blue-600" : "text-orange-500",
      },
       {
          id: 'cash',
          title: t('cashInHand'),
          amount: stats.totalCashBalance,
          change: t('totalOfAllAccounts'),
          Icon: Icons.cash,
          color: 'text-primary'
      }
  ]

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      {statCards.map((card) => (
        <Card key={card.id} className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-2">
                <CardTitle className="text-sm font-medium">
                {card.title}
                </CardTitle>
            </div>
            <card.Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-2">
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
