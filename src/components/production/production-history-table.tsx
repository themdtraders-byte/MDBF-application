

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
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { dbLoad, dbSave, dbClearAndSave } from "@/lib/db";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProductionDetails } from "./production-details";
import { useToast } from "@/hooks/use-toast";
import { NewProductionForm } from "./new-production-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "../ui/label";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "../ui/date-range-picker";
import { DateRange } from "react-day-picker";

type ProductionBatch = {
    batchCode: string;
    productionDate: string | Date;
    finishedGoods: { itemId: string; quantity: number }[];
    totalProductionCost: number;
    perUnitCost: number;
    rawMaterials: any[];
    laborCosts: any[];
    otherExpenses: any[];
};

type Item = {
    id: string;
    name: string;
}

export function ProductionHistoryTable() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [history, setHistory] = useState<ProductionBatch[]>([]);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [viewingBatch, setViewingBatch] = useState<ProductionBatch | null>(null);
  const [editingBatch, setEditingBatch] = useState<ProductionBatch | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<ProductionBatch | null>(null);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState('');
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');


  const fetchHistory = async () => {
    const productionHistory = await dbLoad("production-history");
    const inventoryItems = await dbLoad("inventory");
    setHistory(productionHistory);
    setInventory(inventoryItems);
  }

  useEffect(() => {
    fetchHistory();
  }, []);
  
  const filteredHistory = useMemo(() => {
    let results = history;
    if (dateRange?.from) {
      const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
      results = results.filter(h => {
        const dateString = typeof h.productionDate === 'string' ? h.productionDate : h.productionDate.toISOString();
        return isWithinInterval(parseISO(dateString), interval)
      });
    }
    return results.sort((a,b) => new Date(b.productionDate).getTime() - new Date(a.productionDate).getTime());
  }, [history, dateRange]);


  const getItemName = (itemId: string) => {
      return inventory.find(i => i.id === itemId)?.name || "Unknown Item";
  }

  const getFinishedGoodsSummary = (goods: { itemId: string; quantity: number }[]) => {
      if (!goods || goods.length === 0) return "N/A";
      const summary = goods.map(g => `${getItemName(g.itemId)} (x${g.quantity})`).join(', ');
      return summary.length > 50 ? summary.substring(0, 50) + '...' : summary;
  }

  const openDeleteDialog = (batch: ProductionBatch) => {
    setBatchToDelete(batch);
    setDeleteConfirmationCode(String(Math.floor(1000 + Math.random() * 9000)));
    setDeleteConfirmationInput('');
  }

  const handleDeleteConfirm = async () => {
    if (!batchToDelete) return;
    
    const trash = await dbLoad('trash');
    const deletedItem = {
        id: `trash-prod-${batchToDelete.batchCode}-${Date.now()}`,
        type: 'Production',
        deletedAt: new Date().toISOString(),
        data: { ...batchToDelete, originalKey: 'production-history' }
    };
    trash.push(deletedItem);
    await dbSave('trash', trash);

    const updatedHistory = history.filter(h => h.batchCode !== batchToDelete.batchCode);
    await dbClearAndSave('production-history', updatedHistory);
    setHistory(updatedHistory);

    toast({
        title: "Production Record Moved to Trash",
        description: `Batch ${batchToDelete.batchCode} has been moved to the trash. Note: This does not automatically reverse inventory changes.`,
    });
    setBatchToDelete(null);
  }

  const handleEditFinish = () => {
      setEditingBatch(null);
      fetchHistory();
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle>Production History</CardTitle>
              <CardDescription>A log of all finalized production batches.</CardDescription>
            </div>
            <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('date')}</TableHead>
              <TableHead>{t('billNumber')}</TableHead>
              <TableHead>{t('item')}</TableHead>
              <TableHead className="text-right">{t('total')}</TableHead>
              <TableHead className="text-right">{t('unitCost')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredHistory.map((batch) => (
              <TableRow key={batch.batchCode}>
                <TableCell>{format(new Date(batch.productionDate), "PPP")}</TableCell>
                <TableCell className="font-medium">{batch.batchCode}</TableCell>
                <TableCell>{getFinishedGoodsSummary(batch.finishedGoods)}</TableCell>
                <TableCell className="text-right">PKR {batch.totalProductionCost.toFixed(2)}</TableCell>
                <TableCell className="text-right">PKR {batch.perUnitCost.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewingBatch(batch)}>
                        <Icons.search className="h-4 w-4" />
                    </Button>
                     <Button variant="ghost" size="icon" onClick={() => setEditingBatch(batch)}>
                        <Icons.settings className="h-4 w-4" />
                    </Button>
                     <Button variant="ghost" size="icon" className="text-destructive" onClick={() => openDeleteDialog(batch)}>
                        <Icons.trash className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredHistory.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No production history found.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    <Dialog open={!!viewingBatch} onOpenChange={(open) => !open && setViewingBatch(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Production Details</DialogTitle>
            <DialogDescription>Batch Code: {viewingBatch?.batchCode}</DialogDescription>
          </DialogHeader>
          {viewingBatch && <ProductionDetails batch={viewingBatch} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingBatch} onOpenChange={(open) => !open && setEditingBatch(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-7xl">
            <DialogHeader>
                <DialogTitle>Edit Production Batch</DialogTitle>
                <DialogDescription>
                    Modify the details for batch {editingBatch?.batchCode}.
                </DialogDescription>
            </DialogHeader>
            {editingBatch && <NewProductionForm productionToEdit={editingBatch as any} onFinish={handleEditFinish} />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!batchToDelete} onOpenChange={(open) => !open && setBatchToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action will move the production batch '{batchToDelete?.batchCode}' to the trash and will NOT reverse inventory changes. To confirm, please type <code className="font-mono text-base bg-muted px-2 py-1 rounded-md">{deleteConfirmationCode}</code> in the box below.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="delete-confirm">Confirmation Code</Label>
                <Input
                    id="delete-confirm"
                    value={deleteConfirmationInput}
                    onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                    placeholder="Enter the code to confirm"
                    autoFocus
                />
            </div>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteConfirmationInput !== deleteConfirmationCode} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
