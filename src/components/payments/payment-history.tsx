
"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { dbLoad } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { FormattedCurrency } from "../ui/formatted-currency";

type Transaction = {
    id: string;
    date: string;
    description: string;
    category: string;
    type: "incoming" | "outgoing";
    amount: number;
}
type Customer = { id: string, name: string };
type Supplier = { id: string, name: string };

export function PaymentHistory() {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  useEffect(() => {
    const fetchTransactions = async () => {
        const customers = await dbLoad("customers");
        const suppliers = await dbLoad("suppliers");
        
        const getCustomerName = (id: string) => customers.find((c: Customer) => c.id === id)?.name || id;
        const getSupplierName = (id: string) => suppliers.find((s: Supplier) => s.id === id)?.name || id;

        const salesTxs = (await dbLoad("sales")).map((p: any) => ({
            id: `sale-${p.invoiceNumber}`,
            date: p.invoiceDate,
            description: `From ${getCustomerName(p.customerId)} for #${p.invoiceNumber}`,
            category: 'Sale',
            type: 'incoming',
            amount: p.amountReceived
        })).filter((t: any) => t.amount > 0);

        const purchaseTxs = (await dbLoad("purchases")).map((p: any) => ({
            id: `purchase-${p.billNumber}`,
            date: p.purchaseDate,
            description: `To ${getSupplierName(p.supplierId)} for #${p.billNumber}`,
            category: 'Purchase',
            type: 'outgoing',
            amount: p.amountPaid
        })).filter((t: any) => t.amount > 0);

         const expenseTxs = (await dbLoad("expenses")).map((e: any) => ({
            id: `exp-${e.id}`,
            date: e.date,
            description: e.notes || 'General Expense',
            category: 'Expense',
            type: 'outgoing',
            amount: e.amount
        }));

        const otherPayments = (await dbLoad("payments")).map((p: any) => ({
            id: `pay-${p.id}`,
            date: p.date,
            description: p.notes || p.category,
            category: p.category,
            type: p.paymentType,
            amount: p.amount
        }));

        const allTransactions = [...salesTxs, ...purchaseTxs, ...expenseTxs, ...otherPayments]
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
        setTransactions(allTransactions);
    }
    fetchTransactions();
  }, []);


  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("paymentHistory")}</CardTitle>
        <CardDescription>A complete log of all financial movements.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{format(new Date(transaction.date), "PPP")}</TableCell>
                <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                <TableCell>{transaction.category}</TableCell>
                <TableCell>
                    <Badge variant={transaction.type === 'incoming' ? 'secondary' : 'destructive'}>
                        {transaction.type}
                    </Badge>
                </TableCell>
                <TableCell className={`text-right font-semibold ${transaction.type === 'incoming' ? 'text-green-600' : 'text-destructive'}`}>
                    <FormattedCurrency amount={transaction.amount} />
                </TableCell>
              </TableRow>
            ))}
             {transactions.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No transactions found yet.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
