
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
import { NewSaleForm } from "./new-sale-form";
import { SaleDetails } from "./sale-details";
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

type Sale = {
    invoiceNumber: string;
    invoiceDate: string | Date;
    customerId: string;
    grandTotal: number;
    amountReceived: number;
    remainingBalance: number;
    items: any[];
    subtotal: number;
    totalDiscount: number;
    totalAdjustment: number;
    notes?: string;
}
type Customer = {
    id: string;
    name: string;
}
type InventoryItem = {
    id: string;
    name: string;
}

export function AllSalesTable() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { searchTerm } = useSearch();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCustomer, setFilterCustomer] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState('');
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  
  const fetchSales = () => {
    const storedSales = dbLoad("sales");
    const storedCustomers = dbLoad("customers");
    const storedInventory = dbLoad("inventory");
    Promise.all([storedSales, storedCustomers, storedInventory]).then(([salesData, customersData, inventoryData]) => {
      setSales(salesData);
      setCustomers(customersData);
      setInventory(inventoryData);
    });
  }

  useEffect(() => {
    fetchSales();
  }, []);

  const getCustomerName = (customerId: string) => {
    return customers.find(c => c.id === customerId)?.name || "Unknown Customer";
  }
  
  const getItemNames = (items: any[]) => {
    if (!items || items.length === 0) return 'N/A';
    return items.map(item => inventory.find(inv => inv.id === item.itemId)?.name || 'Unknown').join(', ');
  };


  const filteredSales = useMemo(() => {
    let result = sales;
    // Search
    if (searchTerm) {
        result = result.filter(sale => 
            sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            getCustomerName(sale.customerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sale.notes && sale.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
            sale.items.some(item => getItemNames([item]).toLowerCase().includes(searchTerm.toLowerCase())) ||
            String(sale.grandTotal).includes(searchTerm) ||
            String(sale.amountReceived).includes(searchTerm) ||
            String(sale.remainingBalance).includes(searchTerm)
        );
    }
    // Status Filter
    if (filterStatus !== 'all') {
        result = result.filter(sale => {
            if (filterStatus === 'paid') return sale.remainingBalance <= 0;
            if (filterStatus === 'due') return sale.remainingBalance > 0;
            return true;
        })
    }
    // Customer Filter
    if (filterCustomer !== 'all') {
        result = result.filter(sale => sale.customerId === filterCustomer);
    }
    // Date Filter
    if (dateRange?.from) {
      const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
      result = result.filter(sale => {
        const dateString = typeof sale.invoiceDate === 'string' ? sale.invoiceDate : sale.invoiceDate.toISOString();
        return isWithinInterval(parseISO(dateString), interval)
      });
    }

    return result.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  }, [searchTerm, filterStatus, filterCustomer, dateRange, sales, customers, inventory]);


  const handleEdit = (sale: Sale) => {
    setEditingSale({
      ...sale,
      invoiceDate: new Date(sale.invoiceDate) as any,
    });
  }
  
  const handleEditFinish = () => {
    setEditingSale(null);
    fetchSales();
  }

  const openDeleteDialog = (sale: Sale) => {
    setSaleToDelete(sale);
    setDeleteConfirmationCode(String(Math.floor(1000 + Math.random() * 9000)));
    setDeleteConfirmationInput('');
  }

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

    const updatedSales = sales.filter((s) => s.invoiceNumber !== saleToDelete.invoiceNumber);
    await dbClearAndSave('sales', updatedSales);
    setSales(updatedSales);

    toast({
      title: 'Sale Moved to Trash',
      description: `Invoice ${saleToDelete.invoiceNumber} has been moved to the trash.`,
    });
    setSaleToDelete(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("allSales")}</CardTitle>
          <CardDescription>{t("allSalesDescription")}</CardDescription>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-2 pt-4">
              <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start">
                  <DateRangePicker date={dateRange} setDate={setDateRange} />
                   <Select onValueChange={setFilterCustomer} defaultValue="all">
                      <SelectTrigger className="w-full sm:w-[180px]">
                          <SelectValue placeholder={t('filterByCustomer')} />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">{t('allCustomers')}</SelectItem>
                          {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
                  <Select onValueChange={setFilterStatus} defaultValue={filterStatus}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                          <SelectValue placeholder={t('filterByStatus')} />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">{t('allStatuses')}</SelectItem>
                          <SelectItem value="paid">{t('paid')}</SelectItem>
                          <SelectItem value="due">{t('due')}</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('invoiceNumber')}</TableHead>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('customerName')}</TableHead>
                <TableHead>{t('item')}</TableHead>
                <TableHead className="text-right">{t('total')}</TableHead>
                <TableHead className="text-right">{t('paid')}</TableHead>
                <TableHead className="text-right">{t('balanceDue')}</TableHead>
                 <TableHead className="text-center">{t('status')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.invoiceNumber}>
                  <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                  <TableCell>{format(new Date(sale.invoiceDate), "PPP")}</TableCell>
                  <TableCell>{getCustomerName(sale.customerId)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{getItemNames(sale.items)}</TableCell>
                  <TableCell className="text-right"><FormattedCurrency amount={sale.grandTotal} /></TableCell>
                  <TableCell className="text-right"><FormattedCurrency amount={sale.amountReceived} /></TableCell>
                  <TableCell className="text-right"><FormattedCurrency amount={sale.remainingBalance} /></TableCell>
                   <TableCell className="text-center">
                      <Badge variant={sale.remainingBalance <= 0 ? "secondary" : "destructive"}>
                          {sale.remainingBalance <= 0 ? t('paid') : t('due')}
                      </Badge>
                  </TableCell>
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
               {filteredSales.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={9} className="text-center h-24">No sales found.</TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-7xl">
          <DialogHeader>
            <DialogTitle>Edit Sale</DialogTitle>
            <DialogDescription>Update the details for this sales invoice.</DialogDescription>
          </DialogHeader>
          {editingSale && <NewSaleForm saleToEdit={editingSale} onFinish={handleEditFinish} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!viewingSale} onOpenChange={(open) => !open && setViewingSale(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
            <DialogDescription>Viewing details for invoice #{viewingSale?.invoiceNumber}</DialogDescription>
          </DialogHeader>
          {viewingSale && <SaleDetails sale={viewingSale} />}
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
