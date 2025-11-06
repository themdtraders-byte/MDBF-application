
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

type Purchase = {
    billNumber: string;
    purchaseDate: string;
    supplierId: string;
    grandTotal: number;
    remainingBalance: number;
}

interface SupplierTransactionHistoryProps {
    supplierId: string;
}

export function SupplierTransactionHistory({ supplierId }: SupplierTransactionHistoryProps) {
  const { t } = useLanguage();
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    const fetchPurchases = async () => {
      const allPurchases: Purchase[] = await dbLoad("purchases");
      const supplierPurchases = allPurchases.filter(purchase => purchase.supplierId === supplierId)
                                    .sort((a,b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
      setPurchases(supplierPurchases);
    }
    fetchPurchases();
  }, [supplierId]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("transactionHistory")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("billNumber")}</TableHead>
              <TableHead>{t("date")}</TableHead>
              <TableHead className="text-right">{t("amount")}</TableHead>
              <TableHead className="text-center">{t("status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map((purchase) => (
              <TableRow key={purchase.billNumber}>
                <TableCell className="font-medium">{purchase.billNumber}</TableCell>
                <TableCell>{format(new Date(purchase.purchaseDate), "PPP")}</TableCell>
                <TableCell className="text-right">PKR {purchase.grandTotal.toFixed(2)}</TableCell>
                <TableCell className="text-center">
                    <Badge variant={purchase.remainingBalance <= 0 ? 'secondary' : 'destructive'}>
                        {purchase.remainingBalance <= 0 ? t("paid") : t("pending")}
                    </Badge>
                </TableCell>
              </TableRow>
            ))}
             {purchases.length === 0 && (
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

    