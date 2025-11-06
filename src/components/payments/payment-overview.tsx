

"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { dbLoad } from "@/lib/db";
import { ArrowDown, ArrowUp, Banknote, Landmark } from "lucide-react";
import { FormattedCurrency } from "../ui/formatted-currency";

type Customer = { balance: number; };
type Supplier = { balance: number; };
type Account = { balance?: number; };

export function PaymentOverview() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    pendingReceivables: 0,
    pendingPayables: 0,
    totalBalance: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
        const customers: Customer[] = await dbLoad("customers");
        const suppliers: Supplier[] = await dbLoad("suppliers");
        const accounts: Account[] = await dbLoad("accounts");

        const pendingReceivables = customers.reduce((acc, c) => acc + (c.balance > 0 ? c.balance : 0), 0);
        const pendingPayables = suppliers.reduce((acc, s) => acc + (s.balance > 0 ? s.balance : 0), 0);
        const totalBalance = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);

        setStats({ pendingReceivables, pendingPayables, totalBalance });
    }
    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Receivables</CardTitle>
                <ArrowUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                  <FormattedCurrency amount={stats.pendingReceivables} integerClassName="text-2xl" decimalClassName="text-base" />
                </div>
                <p className="text-xs text-muted-foreground">Total amount due from customers.</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payables</CardTitle>
                <ArrowDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                  <FormattedCurrency amount={stats.pendingPayables} integerClassName="text-2xl" decimalClassName="text-base" />
                </div>
                <p className="text-xs text-muted-foreground">Total amount due to suppliers.</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bank & Cash Balance</CardTitle>
                <Landmark className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                  <FormattedCurrency amount={stats.totalBalance} integerClassName="text-2xl" decimalClassName="text-base" />
                </div>
                <p className="text-xs text-muted-foreground">Combined balance of all accounts.</p>
            </CardContent>
        </Card>
    </div>
  );
}
