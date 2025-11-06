"use client";

import { useEffect, useState, useMemo } from "react";
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
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { dbLoad } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "../ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { Icons } from "../icons";
import { SaleDetails } from "../sales/sale-details";
import { PurchaseDetails } from "../purchases/purchase-details";
import { ProductionDetails } from "../production/production-details";

type Item = { id: string; name: string, initialStock?: number };
type LedgerEntry = {
    date: Date;
    itemId: string;
    type: 'Purchase' | 'Sale' | 'Production IN' | 'Production OUT' | 'Adjustment' | 'Opening Stock';
    quantityChange: number;
    balance: number;
    sourceId: string;
    sourceRecord: any;
};

// Helper to safely parse dates that might be strings or Date objects
const ensureDate = (dateValue: string | Date): Date => {
  if (dateValue instanceof Date) {
    return dateValue;
  }
  // Attempt to parse a string, return a fallback for invalid formats
  try {
    const parsedDate = parseISO(dateValue);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (e) {
    // Fallback for invalid date strings
  }
  return new Date(0); // Return epoch for invalid dates to avoid crashes
};


export function StockAdjustmentsHistory() {
  const { t } = useLanguage();
  const [inventory, setInventory] = useState<Item[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingRecord, setViewingRecord] = useState<LedgerEntry | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        const itemsData: Item[] = await dbLoad("inventory");
        const salesData = await dbLoad("sales");
        const purchasesData = await dbLoad("purchases");
        const productionData = await dbLoad("production-history");
        const adjustmentsData = await dbLoad("stock-adjustments");
        setInventory(itemsData);

        const allEntries: Omit<LedgerEntry, 'balance'>[] = [];

        // 1. Add Opening Stock
        itemsData.forEach(item => {
            if (item.initialStock && item.initialStock > 0) {
                allEntries.push({
                    date: new Date(0), // Ensures opening stock is always first
                    itemId: item.id,
                    type: 'Opening Stock',
                    quantityChange: item.initialStock,
                    sourceId: `open-${item.id}`,
                    sourceRecord: { notes: 'Initial stock on creation' }
                });
            }
        });
        
        // 2. Add Purchases (Stock In)
        purchasesData.forEach(p => {
            (p.items || []).forEach(i => {
                allEntries.push({ date: ensureDate(p.purchaseDate), itemId: i.itemId, type: 'Purchase', quantityChange: i.quantity, sourceId: p.billNumber, sourceRecord: p });
            });
        });

        // 3. Add Sales (Stock Out)
        salesData.forEach(s => {
            (s.items || []).forEach(i => {
                allEntries.push({ date: ensureDate(s.invoiceDate), itemId: i.itemId, type: 'Sale', quantityChange: -i.quantity, sourceId: s.invoiceNumber, sourceRecord: s });
            });
        });
        
        // 4. Add Production (In and Out)
        productionData.forEach(prod => {
            (prod.rawMaterials || []).forEach(rm => {
                allEntries.push({ date: ensureDate(prod.productionDate), itemId: rm.itemId, type: 'Production OUT', quantityChange: -rm.quantity, sourceId: prod.batchCode, sourceRecord: prod });
            });
            (prod.finishedGoods || []).forEach(fg => {
                 allEntries.push({ date: ensureDate(prod.productionDate), itemId: fg.itemId, type: 'Production IN', quantityChange: fg.quantity, sourceId: prod.batchCode, sourceRecord: prod });
            });
        });

        // 5. Add Manual Adjustments
        adjustmentsData.forEach(adj => {
             allEntries.push({ date: ensureDate(adj.date), itemId: adj.itemId, type: 'Adjustment', quantityChange: adj.adjustmentType === 'add' ? adj.quantity : -adj.quantity, sourceId: adj.id, sourceRecord: adj });
        });
        
        // 6. Sort all entries by date
        allEntries.sort((a,b) => a.date.getTime() - b.date.getTime());
        
        // 7. Calculate running balance
        const calculatedLedger: LedgerEntry[] = [];
        const balances: { [itemId: string]: number } = {};
        
        allEntries.forEach(entry => {
            if (balances[entry.itemId] === undefined) {
                balances[entry.itemId] = 0;
            }
            balances[entry.itemId] += entry.quantityChange;
            calculatedLedger.push({ ...entry, balance: balances[entry.itemId] });
        });
        
        // 8. Set final ledger, reversed for chronological display
        setLedger(calculatedLedger.reverse());
    }
    fetchData();
  }, []);
  
  const getItemName = (itemId: string) => inventory.find(i => i.id === itemId)?.name || 'Unknown Item';

  const filteredLedger = useMemo(() => {
    let results = ledger;

    if (searchTerm) {
        results = results.filter(entry => getItemName(entry.itemId).toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (dateRange?.from) {
      const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
      results = results.filter(entry => isWithinInterval(entry.date, interval));
    }
    return results;
  }, [ledger, dateRange, searchTerm]);

  const renderDetails = () => {
    if (!viewingRecord) return null;
    switch(viewingRecord.type) {
        case 'Sale':
            return <SaleDetails sale={viewingRecord.sourceRecord} />;
        case 'Purchase':
            return <PurchaseDetails purchase={viewingRecord.sourceRecord} />;
        case 'Production IN':
        case 'Production OUT':
             return <ProductionDetails batch={viewingRecord.sourceRecord} />;
        case 'Adjustment':
        case 'Opening Stock':
            return (
                <div className="p-4 space-y-2">
                    <p><strong>Reason:</strong> {viewingRecord.sourceRecord.reason || viewingRecord.sourceRecord.notes}</p>
                    <p><strong>Quantity Change:</strong> {viewingRecord.quantityChange > 0 ? `+${viewingRecord.quantityChange}` : viewingRecord.quantityChange}</p>
                </div>
            )
        default:
            return <p>No details available for this transaction type.</p>;
    }
  }


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
                <CardTitle>Stock Ledger</CardTitle>
                <CardDescription>A complete history of all inventory movements.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Input placeholder="Search by item name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full sm:w-auto" />
                <DateRangePicker date={dateRange} setDate={setDateRange} />
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Qty Change</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLedger.map((entry, index) => (
              <TableRow key={`${entry.sourceId}-${index}`}>
                <TableCell>{entry.date.getFullYear() > 1970 ? format(entry.date, "PPP") : 'Opening'}</TableCell>
                <TableCell className="font-medium">{getItemName(entry.itemId)}</TableCell>
                <TableCell><Badge variant="outline">{entry.type}</Badge></TableCell>
                <TableCell className={entry.quantityChange > 0 ? "text-green-600" : "text-destructive"}>{entry.quantityChange > 0 ? `+${entry.quantityChange}` : entry.quantityChange}</TableCell>
                <TableCell className="font-semibold">{entry.balance}</TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewingRecord(entry)}>
                        <Icons.search className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
             {filteredLedger.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No stock movements recorded.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    
    <Dialog open={!!viewingRecord} onOpenChange={(open) => !open && setViewingRecord(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
           <DialogHeader>
             <DialogTitle>Transaction Details</DialogTitle>
             <DialogDescription>
                Viewing details for {viewingRecord?.type} of {viewingRecord && getItemName(viewingRecord.itemId)}
             </DialogDescription>
           </DialogHeader>
           {renderDetails()}
        </DialogContent>
    </Dialog>
    </>
  );
}
