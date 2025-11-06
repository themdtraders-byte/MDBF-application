

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
import { Badge } from "@/components/ui/badge";
import { dbLoad, dbSave, dbClearAndSave } from "@/lib/db";
import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { SaleDetails } from "../sales/sale-details";
import { NewSaleForm } from "../sales/new-sale-form";

type Sale = {
    invoiceNumber: string;
    customerId: string;
    invoiceDate: string;
    grandTotal: number;
    remainingBalance: number;
    items: { itemId: string, quantity: number }[];
    [key: string]: any; // Allow other properties
}
type Customer = {
    id: string;
    name: string;
}
type InventoryItem = {
    id: string;
    name: string;
}

export function ReportsTable() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const allSales = useLiveQuery<Sale[], Sale[]>(() => dbLoad("sales"), []) || [];
  const customers: Customer[] = useLiveQuery(() => dbLoad("customers"), []) || [];
  const inventory: InventoryItem[] = useLiveQuery(() => dbLoad("inventory"), []) || [];
  
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState('');
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  const recentSales = useMemo(() => {
      return allSales
        .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
        .slice(0, 5);
  }, [allSales]);
  
  const getCustomerName = (customerId: string) => {
    return customers.find(c => c.id === customerId)?.name || 'N/A';
  }
  
  const getItemNames = (items: { itemId: string, quantity: number }[]) => {
      if (!items || items.length === 0) return 'N/A';
      return items.map(item => {
          const inventoryItem = inventory.find(inv => inv.id === item.itemId);
          return `${inventoryItem?.name || 'Unknown'} (x${item.quantity})`;
      }).join(', ');
  }

  const handlePrint = () => {
    console.log("Autosaving data before printing...");
    setTimeout(() => {
        window.print();
    }, 500);
  };
  
  const handleEdit = (sale: Sale) => {
    setEditingSale({
      ...sale,
      invoiceDate: new Date(sale.invoiceDate) as any,
    });
  };

  const handleEditFinish = async () => {
    setEditingSale(null);
    // Data will refetch via useLiveQuery, no need for manual refetch
  };

  const openDeleteDialog = (sale: Sale) => {
    setSaleToDelete(sale);
    setDeleteConfirmationCode(String(Math.floor(1000 + Math.random() * 9000)));
    setDeleteConfirmationInput('');
  };

  const handleDeleteConfirm = async () => {
    if (!saleToDelete) return;

    const trash = await dbLoad('trash');
    const deletedItem = {
      id: `trash-sale-${saleToDelete.invoiceNumber}-${Date.now()}`,
      type: 'Sale',
      deletedAt: new Date().toISOString(),
      data: { ...saleToDelete, originalKey: 'sales' },
    };
    trash.push(deletedItem);
    await dbSave('trash', trash);

    const updatedSales = allSales.filter((s) => s.invoiceNumber !== saleToDelete.invoiceNumber);
    await dbClearAndSave('sales', updatedSales);

    toast({
      title: 'Sale Moved to Trash',
      description: `Invoice ${saleToDelete.invoiceNumber} has been moved to the trash.`,
    });
    setSaleToDelete(null);
  };
  
  return (
    <>
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="grid gap-2">
          <CardTitle>{t("businessReports")}</CardTitle>
          <CardDescription>{t("reportsDescription")}</CardDescription>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Icons.print className="mr-2 h-4 w-4" />
            {t("print")}
          </Button>
          <Button variant="outline" size="sm">
            <Icons.export className="mr-2 h-4 w-4" />
            {t("export")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("invoiceId")}</TableHead>
              <TableHead>{t("customerName")}</TableHead>
              <TableHead>{t('item')}</TableHead>
              <TableHead className="text-right">{t("amount")}</TableHead>
              <TableHead className="text-center">{t('status')}</TableHead>
              <TableHead className="text-right">{t("date")}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentSales.map((sale) => (
              <TableRow key={sale.invoiceNumber}>
                <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                <TableCell>{getCustomerName(sale.customerId)}</TableCell>
                <TableCell className="max-w-[200px] truncate">{getItemNames(sale.items)}</TableCell>
                <TableCell className="text-right">PKR {sale.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={sale.remainingBalance <= 0 ? "secondary" : "destructive"}>
                    {t(sale.remainingBalance <= 0 ? "paid" : "pending")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{format(new Date(sale.invoiceDate), "PPP")}</TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewingSale(sale)}>
                        <Icons.search className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(sale)}>
                        <Icons.settings className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => openDeleteDialog(sale)}>
                        <Icons.trash className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
             {recentSales.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">{t('noRecentTransactions')}</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog open={!!viewingSale} onOpenChange={(open) => !open && setViewingSale(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
            <DialogDescription>Viewing details for invoice #{viewingSale?.invoiceNumber}</DialogDescription>
          </DialogHeader>
          {viewingSale && <SaleDetails sale={viewingSale} />}
        </DialogContent>
    </Dialog>

    <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-7xl">
          <DialogHeader>
            <DialogTitle>Edit Sale</DialogTitle>
            <DialogDescription>Update the details for this sales invoice.</DialogDescription>
          </DialogHeader>
          {editingSale && <NewSaleForm saleToEdit={editingSale} onFinish={handleEditFinish} />}
        </DialogContent>
    </Dialog>

    <AlertDialog open={!!saleToDelete} onOpenChange={(open) => !open && setSaleToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action will move the invoice '{saleToDelete?.invoiceNumber}' to the trash. This does not automatically reverse stock or payment changes. To confirm, please type <code className="font-mono text-base bg-muted px-2 py-1 rounded-md">{deleteConfirmationCode}</code> in the box below.
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

    



