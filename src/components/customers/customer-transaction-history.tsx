
"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { dbLoad } from "@/lib/db";

type Sale = {
    invoiceNumber: string;
    invoiceDate: string;
    customerId: string;
    grandTotal: number;
    remainingBalance: number;
}

interface CustomerTransactionHistoryProps {
    customerId: string;
}

export function CustomerTransactionHistory({ customerId }: CustomerTransactionHistoryProps) {
  const { t } = useLanguage();
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    const fetchSales = async () => {
      const allSales: Sale[] = await dbLoad("sales");
      const customerSales = allSales.filter(sale => sale.customerId === customerId)
                                    .sort((a,b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
      setSales(customerSales);
    }
    fetchSales();
  }, [customerId]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("transactionHistory")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("invoiceId")}</TableHead>
              <TableHead>{t("date")}</TableHead>
              <TableHead className="text-right">{t("amount")}</TableHead>
              <TableHead className="text-center">{t("status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.invoiceNumber}>
                <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                <TableCell>{format(new Date(sale.invoiceDate), "PPP")}</TableCell>
                <TableCell className="text-right">PKR {sale.grandTotal.toFixed(2)}</TableCell>
                <TableCell className="text-center">
                    <Badge variant={sale.remainingBalance <= 0 ? 'secondary' : 'destructive'}>
                        {t(sale.remainingBalance <= 0 ? "paid" : "pending")}
                    </Badge>
                </TableCell>
              </TableRow>
            ))}
             {sales.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        {t('noTransactionsFound')}
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

    