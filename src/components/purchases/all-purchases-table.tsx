
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dbLoad, dbSave, dbClearAndSave } from "@/lib/db";
import { DateRangePicker } from "../ui/date-range-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NewPurchaseForm } from "./new-purchase-form";
import { PurchaseDetails } from "./purchase-details";
import { DateRange } from "react-day-picker";
import { FormattedCurrency } from "../ui/formatted-currency";
import { useSearch } from "@/hooks/use-search";
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
import { useToast } from "@/hooks/use-toast";

type Purchase = {
    billNumber: string;
    purchaseDate: string | Date;
    supplierId: string;
    grandTotal: number;
    amountPaid: number;
    remainingBalance: number;
    items: any[]; 
    notes?: string;
}

type Supplier = {
    id: string;
    name: string;
}

type InventoryItem = {
    id: string;
    name: string;
}

export function AllPurchasesTable() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { searchTerm } = useSearch();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState('');
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  const fetchPurchases = () => {
    const storedPurchases = dbLoad("purchases");
    const storedSuppliers = dbLoad("suppliers");
    const storedInventory = dbLoad("inventory");
    Promise.all([storedPurchases, storedSuppliers, storedInventory]).then(([purchasesData, suppliersData, inventoryData]) => {
      setPurchases(purchasesData);
      setSuppliers(suppliersData);
      setInventory(inventoryData);
    });
  }

  useEffect(() => {
    fetchPurchases();
  }, []);

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(s => s.id === supplierId)?.name || "Unknown Supplier";
  }
  
  const getItemNames = (items: any[]) => {
    if (!items || items.length === 0) return 'N/A';
    return items.map(item => inventory.find(inv => inv.id === item.itemId)?.name || 'Unknown').join(', ');
  };

  const filteredPurchases = useMemo(() => {
    let result = purchases;
    if (searchTerm) {
        result = result.filter(purchase => 
            purchase.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            getSupplierName(purchase.supplierId).toLowerCase().includes(searchTerm.toLowerCase()) ||
            (purchase.notes && purchase.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
            purchase.items.some(item => getItemNames([item]).toLowerCase().includes(searchTerm.toLowerCase())) ||
            String(purchase.grandTotal).includes(searchTerm) ||
            String(purchase.amountPaid).includes(searchTerm) ||
            String(purchase.remainingBalance).includes(searchTerm)
        );
    }
    if (filterStatus !== 'all') {
        result = result.filter(purchase => {
            if (filterStatus === 'paid') return purchase.remainingBalance <= 0;
            if (filterStatus === 'unpaid') return purchase.remainingBalance > 0;
            return true;
        })
    }
    if (filterSupplier !== 'all') {
      result = result.filter(p => p.supplierId === filterSupplier);
    }
    if (dateRange?.from) {
      const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
      result = result.filter(p => {
        if (!p.purchaseDate) return false;
        const dateString = typeof p.purchaseDate === 'string' ? p.purchaseDate : p.purchaseDate.toISOString();
        return isWithinInterval(parseISO(dateString), interval)
      });
    }
    return result.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }, [searchTerm, filterStatus, filterSupplier, dateRange, purchases, suppliers, inventory]);


  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase({
      ...purchase,
      purchaseDate: new Date(purchase.purchaseDate) as any,
    });
  }

  const handleEditFinish = () => {
    setEditingPurchase(null);
    fetchPurchases();
  }

  const openDeleteDialog = (purchase: Purchase) => {
    setPurchaseToDelete(purchase);
    setDeleteConfirmationCode(String(Math.floor(1000 + Math.random() * 9000)));
    setDeleteConfirmationInput('');
  }

  const handleDeleteConfirm = async () => {
    if (!purchaseToDelete) return;

    const trash = await dbLoad('trash');
    const deletedItem = {
      id: `trash-purchase-${purchaseToDelete.billNumber}-${Date.now()}`,
      type: 'Purchase',
      deletedAt: new Date().toISOString(),
      data: { ...purchaseToDelete, originalKey: 'purchases' },
    };
    trash.push(deletedItem);
    await dbSave('trash', trash);

    const updatedPurchases = purchases.filter((p) => p.billNumber !== purchaseToDelete.billNumber);
    await dbClearAndSave('purchases', updatedPurchases);
    setPurchases(updatedPurchases);

    toast({
      title: 'Purchase Moved to Trash',
      description: `Bill ${purchaseToDelete.billNumber} has been moved to the trash.`,
    });
    setPurchaseToDelete(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("allPurchases")}</CardTitle>
          <CardDescription>{t("allPurchasesDescription")}</CardDescription>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-2 pt-4">
              <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start">
                  <DateRangePicker date={dateRange} setDate={setDateRange} />
                   <Select onValueChange={setFilterSupplier} defaultValue="all">
                      <SelectTrigger className="w-full sm:w-[180px]">
                          <SelectValue placeholder={t('filterBySupplier')} />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">{t('allSuppliers')}</SelectItem>
                          {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
                  <Select onValueChange={setFilterStatus} defaultValue={filterStatus}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                          <SelectValue placeholder={t('filterByStatus')} />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">{t('allStatuses')}</SelectItem>
                          <SelectItem value="paid">{t('paid')}</SelectItem>
                          <SelectItem value="unpaid">{t('unpaid')}</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('billNumber')}</TableHead>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('supplier')}</TableHead>
                <TableHead>{t('item')}</TableHead>
                <TableHead className="text-right">{t('total')}</TableHead>
                <TableHead className="text-right">{t('paid')}</TableHead>
                <TableHead className="text-right">{t('balanceDue')}</TableHead>
                 <TableHead className="text-center">{t('status')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.map((purchase) => (
                <TableRow key={purchase.billNumber}>
                  <TableCell className="font-medium">{purchase.billNumber}</TableCell>
                  <TableCell>{format(new Date(purchase.purchaseDate), "PPP")}</TableCell>
                  <TableCell>{getSupplierName(purchase.supplierId)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{getItemNames(purchase.items)}</TableCell>
                  <TableCell className="text-right"><FormattedCurrency amount={purchase.grandTotal} /></TableCell>
                  <TableCell className="text-right"><FormattedCurrency amount={purchase.amountPaid} /></TableCell>
                  <TableCell className="text-right"><FormattedCurrency amount={purchase.remainingBalance} /></TableCell>
                   <TableCell className="text-center">
                      <Badge variant={purchase.remainingBalance <= 0 ? "secondary" : "destructive"}>
                          {t(purchase.remainingBalance <= 0 ? "paid" : "unpaid")}
                      </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setViewingPurchase(purchase)}>
                          <Icons.search className="h-4 w-4" />
                      </Button>
                       <Button variant="ghost" size="icon" onClick={() => handleEdit(purchase)}>
                          <Icons.settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => openDeleteDialog(purchase)}>
                          <Icons.trash className="h-4 w-4" />
                      </Button>
                  </TableCell>
                </TableRow>
              ))}
               {filteredPurchases.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={9} className="text-center h-24">{t('noTransactionsFound')}</TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={!!editingPurchase} onOpenChange={(open) => !open && setEditingPurchase(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-7xl">
           <DialogHeader>
                <DialogTitle>{t('editPurchase')}</DialogTitle>
                <DialogDescription>
                    {t('updatePurchaseDetails')}
                </DialogDescription>
            </DialogHeader>
            {editingPurchase && <NewPurchaseForm purchaseToEdit={editingPurchase as any} onFinish={handleEditFinish} />}
        </DialogContent>
      </Dialog>
       <Dialog open={!!viewingPurchase} onOpenChange={(open) => !open && setViewingPurchase(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>{t('purchaseDetails')}</DialogTitle>
                <DialogDescription>
                    {t('viewingDetailsForBill', {billNumber: viewingPurchase?.billNumber})}
                </DialogDescription>
            </DialogHeader>
            {viewingPurchase && <PurchaseDetails purchase={viewingPurchase} />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!purchaseToDelete} onOpenChange={(open) => !open && setPurchaseToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action will move the purchase bill '{purchaseToDelete?.billNumber}' to the trash. This does not automatically reverse stock or payment changes. To confirm, please type <code className="font-mono text-base bg-muted px-2 py-1 rounded-md">{deleteConfirmationCode}</code> in the box below.
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
