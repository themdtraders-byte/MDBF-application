
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { dbLoad } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { FormattedCurrency } from "../ui/formatted-currency";
import { DateRange } from "react-day-picker";


type Sale = {
    invoiceNumber: string;
    invoiceDate: string | Date;
    customerId: string;
    grandTotal: number;
    remainingBalance: number;
}
type Customer = { id: string; name: string; }

export function SalesReports() {
  const { t } = useLanguage();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const fetchData = async () => {
    setSales(await dbLoad("sales"));
    setCustomers(await dbLoad("customers"));
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filteredSales = useMemo(() => {
      if (!dateRange?.from) return sales;
      const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
      return sales.filter(s => {
        const dateString = typeof s.invoiceDate === 'string' ? s.invoiceDate : s.invoiceDate.toISOString();
        return isWithinInterval(parseISO(dateString), interval)
      });
  }, [sales, dateRange]);
  
  const getCustomerName = (customerId: string) => {
    return customers.find(c => c.id === customerId)?.name || 'N/A';
  }

  const totalRevenue = filteredSales.reduce((acc, sale) => acc + sale.grandTotal, 0);
  const totalInvoices = filteredSales.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>{t("salesReport")}</CardTitle>
                <CardDescription>{t('salesReportDescription')}</CardDescription>
            </div>
            <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>{t('totalRevenue')}</CardDescription>
                    <CardTitle className="text-3xl">
                        <FormattedCurrency amount={totalRevenue} integerClassName="text-3xl" decimalClassName="text-xl" />
                    </CardTitle>
                </CardHeader>
            </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardDescription>{t('totalInvoices')}</CardDescription>
                    <CardTitle className="text-3xl">{totalInvoices}</CardTitle>
                </CardHeader>
            </Card>
        </div>
      </CardHeader>
      <CardContent>
         <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("invoiceId")}</TableHead>
              <TableHead>{t("customerName")}</TableHead>
              <TableHead className="text-right">{t("amount")}</TableHead>
              <TableHead className="text-center">{t('status')}</TableHead>
              <TableHead className="text-right">{t("date")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.map((sale) => (
              <TableRow key={sale.invoiceNumber}>
                <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                <TableCell>{getCustomerName(sale.customerId)}</TableCell>
                <TableCell className="text-right">
                    <FormattedCurrency amount={sale.grandTotal} />
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={sale.remainingBalance <= 0 ? "secondary" : "destructive"}>
                    {t(sale.remainingBalance <= 0 ? "paid" : "due")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{format(new Date(sale.invoiceDate), "PPP")}</TableCell>
              </TableRow>
            ))}
             {filteredSales.length === 0 && (
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

    