

"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "../ui/date-range-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AddCustomerForm } from "./add-customer-form";
import { CustomerDetails } from "./customer-details";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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
import { DateRange } from "react-day-picker";
import { isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { useSearch } from "@/hooks/use-search";


type Customer = {
    id: string;
    name: string;
    contact: string;
    city?: string;
    balance: number;
    lastTransaction?: string;
    status: string;
    typeId?: string;
    isQuickAdd?: boolean;
    createdAt?: string | Date;
}

type CustomerType = {
    id: string;
    name: string;
}

export function CustomerListTable() {
  const { t } = useLanguage();
  const { searchTerm } = useSearch();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState('');
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  const fetchCustomers = async () => {
    const storedCustomers = await dbLoad("customers");
    setCustomers(storedCustomers);
    const storedTypes = await dbLoad("customer-types");
    setCustomerTypes(storedTypes);

    const customerIdToEdit = searchParams.get('edit');
    if (customerIdToEdit) {
        const customer = storedCustomers.find(c => c.id === customerIdToEdit);
        if (customer) {
            handleEdit(customer);
            // Clean the URL
            router.replace('/customers', { scroll: false });
        }
    }
  }

  useEffect(() => {
    fetchCustomers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filteredCustomers = useMemo(() => {
    let result = customers.filter(customer => 
        (customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.city && customer.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        String(customer.balance).includes(searchTerm)) &&
        (typeFilter === 'all' || customer.typeId === typeFilter)
    );

    if (dateRange?.from) {
      const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
      result = result.filter(c => {
        if (!c.createdAt) return false;
        const dateString = typeof c.createdAt === 'string' ? c.createdAt : c.createdAt!.toISOString();
        return isWithinInterval(parseISO(dateString), interval)
      });
    }

    return result;
  }, [searchTerm, typeFilter, dateRange, customers]);


  const getTypeName = (typeId?: string) => {
    if (!typeId) return 'N/A';
    return customerTypes.find(t => t.id === typeId)?.name || 'Unknown';
  }
  
  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
  }

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    const trash = await dbLoad('trash');
    const deletedItem = {
      id: `trash-cust-${customerToDelete.id}-${Date.now()}`,
      type: 'Customer',
      deletedAt: new Date().toISOString(),
      data: { ...customerToDelete, originalKey: 'customers' },
    };
    trash.push(deletedItem);
    await dbSave('trash', trash);

    const updatedCustomers = customers.filter((c) => c.id !== customerToDelete.id);
    await dbClearAndSave('customers', updatedCustomers);
    setCustomers(updatedCustomers);

    toast({
      title: 'Customer Moved to Trash',
      description: `${customerToDelete.name} has been moved to the trash.`,
    });
    setCustomerToDelete(null);
  };
  
   const openDeleteDialog = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteConfirmationCode(String(Math.floor(1000 + Math.random() * 9000)));
    setDeleteConfirmationInput('');
  }

  const handleEditFinish = () => {
    setEditingCustomer(null);
    fetchCustomers();
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>{t("customerList")}</CardTitle>
        <CardDescription>{t('customerListDescription')}</CardDescription>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-2 pt-4">
             <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start">
                <DateRangePicker date={dateRange} setDate={setDateRange} />
                <Select onValueChange={setTypeFilter} defaultValue="all">
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder={t('filterByType')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('allTypes')}</SelectItem>
                        {customerTypes.map(type => (
                            <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline" className="w-full sm:w-auto">
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
              <TableHead>{t('customerName')}</TableHead>
              <TableHead>{t('type')}</TableHead>
              <TableHead>{t('contact')}</TableHead>
              <TableHead className="text-right">{t('balanceDue')}</TableHead>
              <TableHead className="text-center">{t('status')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{getTypeName(customer.typeId)}</TableCell>
                <TableCell>{customer.contact}</TableCell>
                <TableCell className={cn("text-right font-semibold", customer.balance > 0 ? 'text-destructive' : customer.balance < 0 ? 'text-green-600' : '')}>
                    PKR {Math.abs(customer.balance).toFixed(2)} {customer.balance > 0 ? '(Due)' : customer.balance < 0 ? '(Adv)' : ''}
                </TableCell>
                <TableCell className="text-center">
                   <Badge variant={customer.status === 'Active' ? 'secondary' : 'outline'}>{customer.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewingCustomer(customer)}>
                        <Icons.search className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                        <Icons.settings className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => openDeleteDialog(customer)}>
                        <Icons.trash className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
             {filteredCustomers.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No customers found.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
           <DialogHeader>
                <DialogTitle>Edit Customer</DialogTitle>
                <DialogDescription>
                    Update the details for this customer.
                </DialogDescription>
            </DialogHeader>
            {editingCustomer && <AddCustomerForm customerToEdit={editingCustomer as any} onFinish={handleEditFinish} />}
        </DialogContent>
    </Dialog>

    <Dialog open={!!viewingCustomer} onOpenChange={(open) => !open && setViewingCustomer(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
           <DialogHeader>
             <DialogTitle>Customer Details</DialogTitle>
           </DialogHeader>
           {viewingCustomer && <CustomerDetails customer={viewingCustomer} />}
        </DialogContent>
    </Dialog>
     <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action will move the customer '{customerToDelete?.name}' to the trash. You can restore them from the trash later. To confirm, please type <code className="font-mono text-base bg-muted px-2 py-1 rounded-md">{deleteConfirmationCode}</code> in the box below.
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
