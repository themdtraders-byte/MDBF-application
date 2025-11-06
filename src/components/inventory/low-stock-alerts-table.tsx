
"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
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
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { dbLoad } from "@/lib/db";
import { DateRangePicker } from "../ui/date-range-picker";
import { DateRange } from "react-day-picker";

type Item = {
    id: string;
    name: string;
    stock: number;
    unit: string;
    lowStock: number;
    image?: string;
    createdAt?: string;
}

export function LowStockAlertsTable() {
  const { t } = useLanguage();
  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  useEffect(() => {
    const fetchItems = async () => {
        const storedInventory = await dbLoad("inventory");
        const lowItems = storedInventory.filter((item: Item) => item.stock <= item.lowStock);
        setLowStockItems(lowItems);
    }
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
      if (!dateRange?.from) return lowStockItems;
      // This will only work if createdAt is stored on items. For now, it's a safe-guard.
      return lowStockItems.filter(item => item.createdAt && new Date(item.createdAt) >= dateRange.from! && new Date(item.createdAt) <= (dateRange.to || dateRange.from!));
  }, [lowStockItems, dateRange]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>{t("lowStockAlerts")}</CardTitle>
                <CardDescription>Items that are running low on stock.</CardDescription>
            </div>
            <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Low Stock Threshold</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                    {item.image ? (
                        <Image src={item.image} alt={item.name} width={40} height={40} className="rounded-md object-cover"/>
                    ) : (
                        <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                            <Icons.image className="h-5 w-5 text-muted-foreground" />
                        </div>
                    )}
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-right">{item.stock} {item.unit}</TableCell>
                <TableCell className="text-right">{item.lowStock} {item.unit}</TableCell>
                <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                        <Icons.newPurchase className="mr-2 h-4 w-4" />
                        Create Purchase Order
                    </Button>
                </TableCell>
              </TableRow>
            ))}
             {filteredItems.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No items with low stock.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
