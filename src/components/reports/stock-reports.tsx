

"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { dbLoad } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FormattedCurrency } from "../ui/formatted-currency";

type Item = {
    id: string;
    name: string;
    stock: number;
    unit: string;
    price: number;
    costPrice?: number;
    lowStock: number;
}

export function StockReports() {
  const { t } = useLanguage();
  const [inventory, setInventory] = useState<Item[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        setInventory(await dbLoad("inventory"));
    }
    fetchData();
  }, []);

  const totalStockValue = inventory.reduce((acc, item) => acc + (item.stock * (item.costPrice || 0)), 0);
  const lowStockCount = inventory.filter(i => i.stock <= i.lowStock).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("stockReport")}</CardTitle>
        <CardDescription>A summary of your inventory status.</CardDescription>
        <div className="grid grid-cols-2 gap-4 pt-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Total Stock Value (Cost)</CardDescription>
                    <CardTitle className="text-3xl">
                        <FormattedCurrency amount={totalStockValue} integerClassName="text-3xl" decimalClassName="text-xl" />
                    </CardTitle>
                </CardHeader>
            </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Items with Low Stock</CardDescription>
                    <CardTitle className="text-3xl text-destructive">{lowStockCount}</CardTitle>
                </CardHeader>
            </Card>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('itemName')}</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Cost Price</TableHead>
                <TableHead className="text-right">{t('salePrice')}</TableHead>
                <TableHead className="text-center">{t('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.stock} {item.unit}</TableCell>
                  <TableCell className="text-right">
                      <FormattedCurrency amount={item.costPrice || 0} />
                  </TableCell>
                  <TableCell className="text-right">
                       <FormattedCurrency amount={item.price} />
                  </TableCell>
                  <TableCell className="text-center">
                      {item.stock <= 0 ? (
                           <Badge variant="destructive">Out of Stock</Badge>
                      ) : item.stock <= item.lowStock ? (
                           <Badge variant="outline" className="text-amber-600 border-amber-600">Low Stock</Badge>
                      ) : (
                           <Badge variant="secondary">In Stock</Badge>
                      )}
                  </TableCell>
                </TableRow>
              ))}
               {inventory.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">No items found.</TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
      </CardContent>
    </Card>
  );
}
