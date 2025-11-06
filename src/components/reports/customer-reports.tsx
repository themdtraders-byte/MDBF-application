

"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { dbLoad } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { FormattedCurrency } from "../ui/formatted-currency";

type Customer = {
    id: string;
    name: string;
    contact: string;
    balance: number;
    status: string;
}

export function CustomerReports() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
        setCustomers(await dbLoad("customers"));
    }
    fetchData();
  }, []);

  const totalReceivables = customers.reduce((acc, c) => acc + (c.balance > 0 ? c.balance : 0), 0);
  const totalAdvance = customers.reduce((acc, c) => acc + (c.balance < 0 ? Math.abs(c.balance) : 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("customerReports")}</CardTitle>
        <CardDescription>Detailed analysis of your customer data.</CardDescription>
         <div className="grid grid-cols-2 gap-4 pt-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Total Receivables</CardDescription>
                    <CardTitle className="text-3xl text-destructive">
                        <FormattedCurrency amount={totalReceivables} integerClassName="text-3xl" decimalClassName="text-xl" />
                    </CardTitle>
                </CardHeader>
            </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Total Advance</CardDescription>
                    <CardTitle className="text-3xl text-green-600">
                        <FormattedCurrency amount={totalAdvance} integerClassName="text-3xl" decimalClassName="text-xl" />
                    </CardTitle>
                </CardHeader>
            </Card>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('customerName')}</TableHead>
              <TableHead>{t('contact')}</TableHead>
              <TableHead className="text-right">{t('balance')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.contact}</TableCell>
                <TableCell className={cn("text-right font-semibold", customer.balance > 0 ? 'text-destructive' : customer.balance < 0 ? 'text-green-600' : '')}>
                    <FormattedCurrency amount={Math.abs(customer.balance)} />
                     {customer.balance > 0 ? `(${t('pending')})` : customer.balance < 0 ? `(${t('advance')})` : ''}
                </TableCell>
              </TableRow>
            ))}
             {customers.length === 0 && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">No customers found.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
