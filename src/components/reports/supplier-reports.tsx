

"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { dbLoad } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { FormattedCurrency } from "../ui/formatted-currency";

type Supplier = {
    id: string;
    name: string;
    contact: string;
    balance: number;
    status: string;
}

export function SupplierReports() {
  const { t } = useLanguage();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        setSuppliers(await dbLoad("suppliers"));
    }
    fetchData();
  }, []);

  const totalPayables = suppliers.reduce((acc, s) => acc + (s.balance > 0 ? s.balance : 0), 0);
  const totalAdvance = suppliers.reduce((acc, s) => acc + (s.balance < 0 ? Math.abs(s.balance) : 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("supplierReports")}</CardTitle>
        <CardDescription>Analysis of your suppliers and purchase history.</CardDescription>
        <div className="grid grid-cols-2 gap-4 pt-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Total Payables</CardDescription>
                    <CardTitle className="text-3xl text-destructive">
                        <FormattedCurrency amount={totalPayables} integerClassName="text-3xl" decimalClassName="text-xl" />
                    </CardTitle>
                </CardHeader>
            </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Total Advance Paid</CardDescription>
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
              <TableHead>{t('supplierName')}</TableHead>
              <TableHead>{t('contact')}</TableHead>
              <TableHead className="text-right">{t('balance')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>{supplier.contact}</TableCell>
                <TableCell className={cn("text-right font-semibold", supplier.balance > 0 ? 'text-destructive' : supplier.balance < 0 ? 'text-green-600' : '')}>
                    <FormattedCurrency amount={Math.abs(supplier.balance)} />
                     {supplier.balance > 0 ? `(${t('payable')})` : supplier.balance < 0 ? `(${t('advance')})` : ''}
                </TableCell>
              </TableRow>
            ))}
             {suppliers.length === 0 && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">No suppliers found.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
