

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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { dbLoad, dbSave, dbClearAndSave } from "@/lib/db";
import { DateRangePicker } from "../ui/date-range-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddItemForm } from "./add-item-form";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useToast } from "@/hooks/use-toast";
import { Separator } from "../ui/separator";
import { Label } from "../ui/label";
import { DateRange } from "react-day-picker";
import { isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { ItemDetails } from "./item-details";
import { useSearch } from "@/hooks/use-search";


type Item = {
    id: string;
    name: string;
    sku?: string;
    stock: number;
    unit: string;
    price: number;
    costPrice?: number;
    lowStock: number;
    image?: string;
    variations?: string[];
    description?: string;
    isQuickAdd?: boolean;
    createdAt?: string;
}

export function AllItemsTable() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { searchTerm } = useSearch();
  const [inventory, setInventory] = useState<Item[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState('');
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  const fetchItems = async () => {
    const storedInventory: Item[] = await dbLoad("inventory");
    setInventory(storedInventory);

    const itemIdToEdit = searchParams.get('edit');
    if (itemIdToEdit) {
        const item = storedInventory.find(i => i.id === itemIdToEdit);
        if (item) {
            handleEdit(item);
            router.replace('/inventory', { scroll: false });
        }
    }
  }

  useEffect(() => {
    fetchItems();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filteredInventory = useMemo(() => {
    let result = inventory.filter(item => 
        (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.variations && item.variations.some(v => v.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        String(item.stock).includes(searchTerm) ||
        String(item.price).includes(searchTerm) ||
        String(item.costPrice).includes(searchTerm))
    );

    if (dateRange?.from) {
      const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
      result = result.filter(item => item.createdAt && isWithinInterval(parseISO(item.createdAt), interval));
    }

    return result;
  }, [searchTerm, dateRange, inventory]);

  const handleEdit = (item: Item) => {
    setEditingItem(item);
  }
  
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    const trash = await dbLoad('trash');
    const deletedItem = {
      id: `trash-item-${itemToDelete.id}-${Date.now()}`,
      type: 'Inventory',
      deletedAt: new Date().toISOString(),
      data: { ...itemToDelete, originalKey: 'inventory' },
    };
    trash.push(deletedItem);
    await dbSave('trash', trash);

    const updatedInventory = inventory.filter((i) => i.id !== itemToDelete.id);
    await dbClearAndSave('inventory', updatedInventory);
    setInventory(updatedInventory);

    toast({
      title: 'Item Moved to Trash',
      description: `${itemToDelete.name} has been moved to the trash.`,
    });
    setItemToDelete(null);
  };
  
   const openDeleteDialog = (item: Item) => {
    setItemToDelete(item);
    setDeleteConfirmationCode(String(Math.floor(1000 + Math.random() * 9000)));
    setDeleteConfirmationInput('');
  }


  const handleEditFinish = () => {
    setEditingItem(null);
    fetchItems();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("allItems")}</CardTitle>
          <CardDescription>View and manage all your products.</CardDescription>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-2 pt-4">
              <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start">
                  <DateRangePicker date={dateRange} setDate={setDateRange} />
                  <Button variant="outline">
                      <Icons.export className="mr-2 h-4 w-4" />
                      {t("export")}
                  </Button>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">{t('image')}</TableHead>
                <TableHead>{t('itemName')}</TableHead>
                <TableHead>{t('variations')}</TableHead>
                <TableHead className="text-right">{t('stock')}</TableHead>
                <TableHead className="text-right">{t('salePrice')}</TableHead>
                <TableHead className="text-center">{t('status')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => (
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
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.variations?.map(v => <Badge key={v} variant="outline" className="text-xs">{v}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.stock} {item.unit}</TableCell>
                  <TableCell className="text-right">PKR {item.price.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                      {item.isQuickAdd ? (
                           <Badge variant="destructive">Incomplete</Badge>
                      ) : item.stock <= 0 ? (
                           <Badge variant="destructive">Out of Stock</Badge>
                      ) : item.stock <= item.lowStock ? (
                           <Badge variant="outline" className="text-amber-600 border-amber-600">Low Stock</Badge>
                      ) : (
                           <Badge variant="secondary">In Stock</Badge>
                      )}
                  </TableCell>
                  <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setViewingItem(item)}>
                          <Icons.search className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Icons.settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => openDeleteDialog(item)}>
                        <Icons.trash className="h-4 w-4" />
                      </Button>
                  </TableCell>
                </TableRow>
              ))}
               {filteredInventory.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">No items found.</TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Edit Item</DialogTitle>
                <DialogDescription>
                    Update the details for this item.
                </DialogDescription>
            </DialogHeader>
          {editingItem && <AddItemForm itemToEdit={editingItem as any} onFinish={handleEditFinish} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!viewingItem} onOpenChange={(open) => !open && setViewingItem(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Item Details</DialogTitle>
            </DialogHeader>
            {viewingItem && <ItemDetails item={viewingItem} />}
        </DialogContent>
    </Dialog>

     <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action will move the item '{itemToDelete?.name}' to the trash. You can restore it from the trash later. To confirm, please type <code className="font-mono text-base bg-muted px-2 py-1 rounded-md">{deleteConfirmationCode}</code> in the box below.
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
