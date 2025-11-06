
"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { dbLoad, dbSave } from "@/lib/db";
import { CreatableSelect } from "../ui/creatable-select";
import { AddAccountForm } from "../accounts/add-account-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { useAccessControl } from "@/hooks/use-access-control";
import { ImageIcon, X } from "lucide-react";
import Image from "next/image";

const itemSchema = z.object({
  itemId: z.string().min(1, "Item is required."),
  variation: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1."),
  unit: z.string().optional(),
  unitPrice: z.number().min(0, "Cost cannot be negative."),
  discount: z.number().min(0, "Discount cannot be negative.").default(0),
  adjustment: z.number().optional().default(0),
  total: z.number(),
});

const formSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required."),
  purchaseDate: z.date(),
  billNumber: z.string(),
  items: z.array(itemSchema).min(1, "Please add at least one item."),
  paymentAccountId: z.string().min(1, "Payment account is required."),
  amountPaid: z.number().min(0, "Amount paid cannot be negative."),
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

type PurchaseFormValues = z.infer<typeof formSchema>;
type InventoryItem = { id: string; name: string; stock: number; price: number; unit: string; variations?: string[], costPrice?: number; usageCount?: number };
type Supplier = { id: string; name: string; contact: string; city?: string; balance: number; usageCount?: number };
type Account = { id: string; name: string; balance: number; usageCount?: number };

interface NewPurchaseFormProps {
    purchaseToEdit?: PurchaseFormValues & { grandTotal: number, remainingBalance: number };
    onFinish: () => void;
}

const generateBillNumber = async () => {
    const purchases = await dbLoad("purchases");
    const lastBillNumber = purchases
        .map(p => p.billNumber)
        .filter(num => num && num.startsWith("P-"))
        .map(num => parseInt(num.replace("P-", ""), 10))
        .filter(num => !isNaN(num))
        .sort((a, b) => b - a)[0] || 0;
    
    const newNumber = lastBillNumber + 1;
    return `P-${String(newNumber).padStart(4, '0')}`;
};

export function NewPurchaseForm({ purchaseToEdit, onFinish }: NewPurchaseFormProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { isReadOnly } = useAccessControl();
  const [supplierContact, setSupplierContact] = useState("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const isEditMode = !!purchaseToEdit;

  const fetchSuppliers = React.useCallback(async () => {
      const storedSuppliers: Supplier[] = await dbLoad("suppliers");
      storedSuppliers.sort((a,b) => (b.usageCount || 0) - (a.usageCount || 0) || a.name.localeCompare(b.name));
      setSuppliers(storedSuppliers);
  }, []);

  const fetchInventory = React.useCallback(async () => {
    const storedInventory: InventoryItem[] = await dbLoad("inventory");
    storedInventory.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0) || a.name.localeCompare(b.name));
    setInventory(storedInventory);
  }, []);
  
  const fetchAccounts = React.useCallback(async () => {
    const storedAccounts: Account[] = await dbLoad("accounts");
    storedAccounts.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0) || a.name.localeCompare(b.name));
    setAccounts(storedAccounts);
  }, []);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: async () => {
        if(isEditMode && purchaseToEdit) {
            return {
                ...purchaseToEdit,
                purchaseDate: new Date(purchaseToEdit.purchaseDate),
                notes: purchaseToEdit.notes || '',
                attachments: purchaseToEdit.attachments || [],
            }
        }
        return {
          purchaseDate: new Date(),
          billNumber: await generateBillNumber(),
          items: [],
          amountPaid: 0,
          notes: "",
          attachments: [],
        }
    }
  });

  useEffect(() => {
    const loadAllData = async () => {
        await Promise.all([fetchInventory(), fetchSuppliers(), fetchAccounts()]);

        if(isEditMode && purchaseToEdit) {
            const storedSuppliers: Supplier[] = await dbLoad("suppliers");
            const supplier = storedSuppliers.find(s => s.id === purchaseToEdit.supplierId);
            if (supplier) setSupplierContact(supplier.contact);
        } else {
            const newBillNumber = await generateBillNumber();
            form.reset({
                purchaseDate: new Date(),
                billNumber: newBillNumber,
                items: [],
                amountPaid: 0,
                notes: ""
            });
        }
    }
    loadAllData();
  }, [isEditMode, purchaseToEdit, fetchInventory, fetchSuppliers, fetchAccounts, form]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const watchedFormValues = form.watch();
  const attachments = watchedFormValues.attachments || [];

  const {subtotal, totalDiscount, totalAdjustment, grandTotal, remainingBalance} = React.useMemo(() => {
    let sub = 0;
    let discount = 0;
    let adjustment = 0;
    (watchedFormValues.items || []).forEach(item => {
        const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
        const itemDiscount = item.discount || 0;
        const itemAdjustment = item.adjustment || 0;
        sub += itemTotal;
        discount += itemDiscount;
        adjustment += itemAdjustment;
    });
    const grand = sub - discount + adjustment;
    const remaining = grand - (watchedFormValues.amountPaid || 0);
    return { subtotal: sub, totalDiscount: discount, totalAdjustment: adjustment, grandTotal: grand, remainingBalance: remaining };
  }, [watchedFormValues.items, watchedFormValues.amountPaid]);


 useEffect(() => {
     const subscription = form.watch((value, { name, type }) => {
      if (name && (name.startsWith('items.'))) {
        const changedIndexMatch = name.match(/items\.(\d+)/);
        if (changedIndexMatch) {
          const index = parseInt(changedIndexMatch[1], 10);
          const item = (value.items || [])[index];
          if(item) {
            const quantity = item.quantity || 0;
            const price = item.unitPrice || 0;
            const discount = item.discount || 0;
            const adjustment = item.adjustment || 0;
            const newTotal = (quantity * price) - discount + adjustment;

            if (item.total !== newTotal) {
                form.setValue(`items.${index}.total`, newTotal, { shouldValidate: true });
            }

            if (name.endsWith('.itemId')) {
                const selectedItem = inventory.find(inv => inv.id === item.itemId);
                if (selectedItem) {
                    if (item.unitPrice !== selectedItem.costPrice) {
                        form.setValue(`items.${index}.unitPrice`, selectedItem.costPrice || 0);
                    }
                    form.setValue(`items.${index}.unit`, selectedItem.unit);
                }
            }
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, inventory]);

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if(supplier) {
        setSupplierContact(supplier.contact);
        form.setValue("supplierId", supplierId);
    }
  }

  const handleCreateSupplier = async (supplierName: string) => {
    const existingSuppliers = await dbLoad("suppliers");
    const newSupplier: Supplier = {
        id: `SUPP-${Date.now()}`,
        name: supplierName,
        contact: '',
        balance: 0,
        usageCount: 1,
    };
    existingSuppliers.push(newSupplier);
    await dbSave("suppliers", existingSuppliers);
    await fetchSuppliers();
    toast({ title: "Supplier Quick-Added", description: `Added ${supplierName}. Please complete their details later.`});
    form.setValue('supplierId', newSupplier.id);
  }

   const handleCreateItem = async (itemName: string, index: number) => {
    const existingInventory = await dbLoad("inventory");
    const newItem: InventoryItem = {
        id: `ITEM-${Date.now()}`,
        name: itemName,
        stock: 0,
        price: 0,
        unit: 'piece',
        lowStock: 0,
        usageCount: 1,
    };
    existingInventory.push(newItem);
    await dbSave("inventory", existingInventory);
    await fetchInventory();
    toast({ title: "Item Quick-Added", description: `Added ${itemName}. Please complete its details later.`});
    form.setValue(`items.${index}.itemId`, newItem.id);
  }
  
  const handleAccountCreated = async () => {
    await fetchAccounts();
    setIsAccountDialogOpen(false);
  }
  
   const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
        const currentAttachments = form.getValues("attachments") || [];
        for (let i = 0; i < files.length; i++) {
            const reader = new FileReader();
            reader.onloadend = () => {
                form.setValue("attachments", [...currentAttachments, reader.result as string]);
            };
            reader.readAsDataURL(files[i]);
        }
    }
  };

  const removeAttachment = (index: number) => {
    const currentAttachments = form.getValues("attachments") || [];
    currentAttachments.splice(index, 1);
    form.setValue("attachments", currentAttachments);
  };


  const addNewItem = () => {
    append({
        itemId: "",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        adjustment: 0,
        total: 0,
        variation: '',
        unit: 'piece'
    });
  };

  const onSubmit = async (data: PurchaseFormValues) => {
    const finalData = {
        ...data,
        subtotal,
        totalDiscount,
        totalAdjustment,
        grandTotal,
        remainingBalance
    }

    try {
        const allPurchases = await dbLoad("purchases");

        if (isEditMode) {
            const index = allPurchases.findIndex(p => p.billNumber === purchaseToEdit.billNumber);
            if (index > -1) {
                allPurchases[index] = { ...allPurchases[index], ...finalData };
            }
        } else {
            const currentInventory: InventoryItem[] = await dbLoad("inventory");
            for (const purchaseItem of data.items) {
            const itemIndex = currentInventory.findIndex(invItem => invItem.id === purchaseItem.itemId);
            if (itemIndex > -1) {
                currentInventory[itemIndex].stock += purchaseItem.quantity;
                currentInventory[itemIndex].usageCount = (currentInventory[itemIndex].usageCount || 0) + 1;
            }
            }
            await dbSave("inventory", currentInventory);

            if(data.amountPaid > 0) {
                const currentAccounts: Account[] = await dbLoad("accounts");
                const accountIndex = currentAccounts.findIndex(a => a.id === data.paymentAccountId);
                if(accountIndex > -1){
                    currentAccounts[accountIndex].balance -= data.amountPaid;
                    currentAccounts[accountIndex].usageCount = (currentAccounts[accountIndex].usageCount || 0) + 1;
                    await dbSave("accounts", currentAccounts);
                }
            }

            const currentSuppliers: Supplier[] = await dbLoad("suppliers");
            const supplierIndex = currentSuppliers.findIndex(s => s.id === data.supplierId);
            if (supplierIndex > -1) {
                currentSuppliers[supplierIndex].balance += remainingBalance;
                currentSuppliers[supplierIndex].usageCount = (currentSuppliers[supplierIndex].usageCount || 0) + 1;
                await dbSave("suppliers", currentSuppliers);
            }

            allPurchases.push(finalData);
        }
        
        await dbSave("purchases", allPurchases);

        toast({
            title: isEditMode ? 'Purchase Updated' : t('purchaseRecorded'),
            description: isEditMode ? `Bill ${data.billNumber} has been updated.` : t('billSaved', { billNumber: data.billNumber }),
        });
        
        onFinish();

    } catch (error) {
        toast({
            variant: "destructive",
            title: t('error'),
            description: `Failed to ${isEditMode ? 'update' : 'save'} purchase.`,
        });
    }
  };
  
  const cardTitle = isEditMode ? "Edit Purchase" : t('newPurchase');
  const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.name }));
  const itemOptions = inventory.map(i => ({ value: i.id, label: i.name }));
  const accountOptions = accounts.map(a => ({ value: a.id, label: a.name }));

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{cardTitle}</CardTitle>
        {!isEditMode && !isReadOnly &&
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => form.handleSubmit(onSubmit)()}><Icons.plus className="mr-2" /> {t('save')}</Button>
                <Button variant="ghost" onClick={() => form.reset()}><Icons.alertTriangle className="mr-2" />{t('clearForm')}</Button>
            </div>
        }
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-medium mb-4 text-primary">{t('supplierDetails')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>{t('supplierName')}</FormLabel>
                                <FormControl>
                                     <CreatableSelect
                                        options={supplierOptions}
                                        value={field.value}
                                        onChange={handleSupplierChange}
                                        onCreate={handleCreateSupplier}
                                        placeholder={t('selectSupplier')}
                                        disabled={isReadOnly}
                                    />
                                </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormItem>
                        <FormLabel>{t('contact')}</FormLabel>
                        <Input value={supplierContact} readOnly placeholder={t('supplierContact')} disabled={isReadOnly} />
                    </FormItem>
                     <FormField
                        control={form.control}
                        name="purchaseDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>{t('date')}</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    disabled={isReadOnly}
                                    >
                                    {field.value ? (
                                        format(new Date(field.value), "PPP")
                                    ) : (
                                        <span>{t('pickADate')}</span>
                                    )}
                                    <Icons.calendar className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="billNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>{t('billNumber')}</FormLabel>
                            <FormControl>
                                <Input {...field} readOnly disabled={isReadOnly} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>
            </div>

            <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-medium mb-4 text-primary">{t('purchaseItems')}</h3>
                <div className="space-y-4">
                    {fields.map((field, index) => {
                        const selectedItem = inventory.find(inv => inv.id === watchedFormValues.items[index]?.itemId);
                        const hasVariations = selectedItem && selectedItem.variations && selectedItem.variations.length > 0;
                        return (
                        <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                             <div className={cn("col-span-12", hasVariations ? "sm:col-span-2" : "sm:col-span-3")}>
                                {index === 0 && <FormLabel>{t('item')}</FormLabel>}
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.itemId`}
                                    render={({ field }) => (
                                        <CreatableSelect
                                            options={itemOptions}
                                            value={field.value}
                                            onChange={(value) => form.setValue(`items.${index}.itemId`, value)}
                                            onCreate={(value) => handleCreateItem(value, index)}
                                            placeholder={t('selectItem')}
                                            disabled={isReadOnly}
                                        />
                                    )}
                                />
                             </div>
                             {hasVariations && (
                                <div className="col-span-12 sm:col-span-2">
                                   {index === 0 && <FormLabel>Variation</FormLabel>}
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.variation`}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {selectedItem.variations!.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                             )}
                             <div className="col-span-6 sm:col-span-1">
                                {index === 0 && <FormLabel>{t('quantity')}</FormLabel>}
                                 <FormField
                                    control={form.control}
                                    name={`items.${index}.quantity`}
                                    render={({ field }) => (
                                        <Input type="number" {...field} 
                                            value={field.value === 0 ? '' : field.value}
                                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                            disabled={isReadOnly}
                                        />
                                    )}
                                />
                             </div>
                              <div className="col-span-6 sm:col-span-2">
                                {index === 0 && <FormLabel>{t('unitCost')}</FormLabel>}
                                 <FormField
                                    control={form.control}
                                    name={`items.${index}.unitPrice`}
                                    render={({ field }) => (
                                        <Input type="number" {...field} 
                                        value={field.value === 0 ? '' : field.value}
                                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={isReadOnly} />
                                    )}
                                />
                             </div>
                              <div className="col-span-6 sm:col-span-1">
                                {index === 0 && <FormLabel>{t('discount')}</FormLabel>}
                                 <FormField
                                    control={form.control}
                                    name={`items.${index}.discount`}
                                    render={({ field }) => (
                                       <Input type="number" {...field} 
                                        value={field.value || ''}
                                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={isReadOnly} />
                                    )}
                                />
                             </div>
                             <div className="col-span-6 sm:col-span-1">
                                {index === 0 && <FormLabel>Adjustment</FormLabel>}
                                 <FormField
                                    control={form.control}
                                    name={`items.${index}.adjustment`}
                                    render={({ field }) => (
                                        <Input type="number" {...field} 
                                        value={field.value || ''}
                                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={isReadOnly} />
                                    )}
                                />
                             </div>
                              <div className="col-span-10 sm:col-span-2">
                                {index === 0 && <FormLabel>{t('total')}</FormLabel>}
                                 <FormField
                                    control={form.control}
                                    name={`items.${index}.total`}
                                    render={({ field }) => (
                                        <Input type="number" {...field} readOnly disabled={isReadOnly} />
                                    )}
                                />
                             </div>
                             <div className="col-span-2 sm:col-span-1 flex items-end h-full">
                                <Button variant="destructive" size="icon" onClick={() => remove(index)} className="mt-auto" disabled={isReadOnly}>
                                    <Icons.trash className="h-4 w-4" />
                                </Button>
                             </div>
                        </div>
                        )
                    })}
                </div>
                 <Button type="button" variant="outline" onClick={addNewItem} className="mt-4" disabled={isReadOnly}>
                    <Icons.plus className="mr-2 h-4 w-4" /> {t('addItem')}
                </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-4 border rounded-lg space-y-4">
                    <h3 className="text-lg font-medium text-primary">{t('payment')}</h3>
                     <FormField
                        control={form.control}
                        name="paymentAccountId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>{t('paymentFromAccount')}</FormLabel>
                            <CreatableSelect
                                options={accountOptions}
                                value={field.value}
                                onChange={(value) => form.setValue('paymentAccountId', value)}
                                onCreate={() => setIsAccountDialogOpen(true)}
                                createText={() => "+ Create New Account"}
                                placeholder={t('selectAccount')}
                                disabled={isReadOnly}
                            />
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="amountPaid"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>{t('amountPaid')}</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} 
                                value={field.value === 0 ? '' : field.value}
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={isReadOnly} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>{t('notesOptional')}</FormLabel>
                            <FormControl>
                                <Textarea placeholder={t('purchaseNotesPlaceholder')} {...field} value={field.value || ''} disabled={isReadOnly} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormItem>
                        <FormLabel>{t('attachmentOptional')}</FormLabel>
                        <div className="flex flex-wrap gap-2">
                            {attachments.map((src, index) => (
                                <div key={index} className="relative">
                                    <Image src={src} alt={`Attachment ${index + 1}`} width={80} height={80} className="rounded-md object-cover"/>
                                    <Button type="button" size="icon" variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 rounded-full" onClick={() => removeAttachment(index)}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <FormControl>
                            <Input id="attachment-upload" type="file" multiple accept="image/*" onChange={handleAttachmentChange} className="mt-2" disabled={isReadOnly} />
                        </FormControl>
                    </FormItem>
                </div>

                <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                    <h3 className="text-lg font-medium text-primary">{t('summary')}</h3>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t('subtotal')}</span>
                        <span className="font-semibold">PKR {subtotal.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t('discount')}</span>
                        <span className="font-semibold text-destructive dark:text-red-400">- PKR {totalDiscount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Adjustment</span>
                        <span className="font-semibold text-green-600">+ PKR {totalAdjustment.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center text-lg">
                        <span className="font-bold">{t('grandTotal')}</span>
                        <span className="font-bold">PKR {grandTotal.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t('amountPaid')}</span>
                        <span className="font-semibold">- PKR {(watchedFormValues.amountPaid || 0).toFixed(2)}</span>
                    </div>
                     <Separator />
                     <div className="flex justify-between items-center text-xl">
                        <span className="font-bold text-destructive-foreground bg-destructive px-2 rounded-sm">{t('balanceDue')}</span>
                        <span className="font-bold text-destructive-foreground bg-destructive px-2 rounded-sm">PKR {remainingBalance.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <CardFooter className="flex justify-end gap-2 p-0 pt-6">
                <Button type="submit" disabled={isReadOnly}>
                    <Icons.plus className="mr-2" /> {isEditMode ? 'Save Changes' : t('savePurchase')}
                </Button>
                {!isEditMode &&
                    <Button variant="outline" type="button" onClick={async () => {
                        form.reset({
                            purchaseDate: new Date(),
                            billNumber: await generateBillNumber(),
                            items: [],
                            amountPaid: 0,
                            notes: "",
                        });
                        setSupplierContact("");
                    }} disabled={isReadOnly}>
                        <Icons.plus className="mr-2" /> {t('newPurchase')}
                    </Button>
                }
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
    <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Create New Account</DialogTitle>
                <DialogDescription>Add a new cash or bank account to your records.</DialogDescription>
            </DialogHeader>
            <AddAccountForm onFinish={handleAccountCreated} />
        </DialogContent>
    </Dialog>
    </>
  );
}
