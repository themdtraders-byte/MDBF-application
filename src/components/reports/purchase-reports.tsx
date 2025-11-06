
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { dbLoad } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { FormattedCurrency } from "../ui/formatted-currency";
import { DateRange } from "react-day-picker";

type Purchase = {
    billNumber: string;
    purchaseDate: string | Date;
    supplierId: string;
    grandTotal: number;
    remainingBalance: number;
}
type Supplier = { id: string; name: string; }

export function PurchaseReports() {
  const { t } = useLanguage();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const fetchData = async () => {
    setPurchases(await dbLoad("purchases"));
    setSuppliers(await dbLoad("suppliers"));
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filteredPurchases = useMemo(() => {
      if (!dateRange?.from) return purchases;
      const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
      return purchases.filter(p => {
        const dateString = typeof p.purchaseDate === 'string' ? p.purchaseDate : p.purchaseDate.toISOString();
        return isWithinInterval(parseISO(dateString), interval)
      });
  }, [purchases, dateRange]);
  
  const getSupplierName = (supplierId: string) => {
    return suppliers.find(s => s.id === supplierId)?.name || 'N/A';
  }

  const totalPurchases = filteredPurchases.reduce((acc, p) => acc + p.grandTotal, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>{t("purchaseReports")}</CardTitle>
                <CardDescription>{t('purchaseReportsDescription')}</CardDescription>
            </div>
            <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>
         <div className="grid grid-cols-2 gap-4 pt-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>{t('totalPurchaseValue')}</CardDescription>
                    <CardTitle className="text-3xl">
                        <FormattedCurrency amount={totalPurchases} integerClassName="text-3xl" decimalClassName="text-xl" />
                    </CardTitle>
                </CardHeader>
            </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardDescription>{t('totalBills')}</CardDescription>
                    <CardTitle className="text-3xl">{filteredPurchases.length}</CardTitle>
                </CardHeader>
            </Card>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("billNumber")}</TableHead>
              <TableHead>{t("supplierName")}</TableHead>
              <TableHead className="text-right">{t("amount")}</TableHead>
              <TableHead className="text-center">{t('status')}</TableHead>
              <TableHead className="text-right">{t("date")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPurchases.map((purchase) => (
              <TableRow key={purchase.billNumber}>
                <TableCell className="font-medium">{purchase.billNumber}</TableCell>
                <TableCell>{getSupplierName(purchase.supplierId)}</TableCell>
                <TableCell className="text-right">
                    <FormattedCurrency amount={purchase.grandTotal} />
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={purchase.remainingBalance <= 0 ? "secondary" : "destructive"}>
                    {t(purchase.remainingBalance <= 0 ? "paid" : "unpaid")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{format(new Date(purchase.purchaseDate), "PPP")}</TableCell>
              </TableRow>
            ))}
             {filteredPurchases.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">{t('noRecentTransactions')}</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

    