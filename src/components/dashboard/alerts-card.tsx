

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dbLoad, dbSave, dbClearAndSave } from "@/lib/db";
import { CreditCard, AlertTriangle, Bell, Trash2, type LucideIcon, CalendarIcon, User, Truck, UserCog, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Label } from "../ui/label";
import { useLiveQuery } from "dexie-react-hooks";

type Customer = { id: string; name: string; balance: number; isQuickAdd?: boolean; }
type Supplier = { id: string; name: string; balance: number; isQuickAdd?: boolean; }
type Worker = { name: string; balance: number; }
type Item = { id: string; name: string; stock: number; lowStock: number; isQuickAdd?: boolean; }
type CustomReminder = { id: string; text: string; date: string; type: 'custom' };
type Alert = {
    id: string;
    Icon: LucideIcon;
    text: string;
    time: string;
    variant: 'default' | 'destructive';
    actionLabel?: string;
    type: 'automatic' | 'custom' | 'incompleteProfile';
}

const ICONS = {
    payment: CreditCard,
    stock: AlertTriangle,
    general: Bell,
    worker: User,
    supplier: Truck,
    incomplete: UserCog,
    item: Package
};

const reminderSchema = z.object({
  text: z.string().min(3, "Reminder text is required."),
  date: z.date(),
});
type ReminderFormValues = z.infer<typeof reminderSchema>;


export function AlertsCard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [reminderToDelete, setReminderToDelete] = useState<CustomReminder | null>(null);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState('');
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: { text: "", date: new Date() },
  });

  const customers = useLiveQuery(() => dbLoad("customers"), []) || [];
  const suppliers = useLiveQuery(() => dbLoad("suppliers"), []) || [];
  const workers = useLiveQuery(() => dbLoad("workers"), []) || [];
  const inventory = useLiveQuery(() => dbLoad("inventory"), []) || [];
  const customReminders = useLiveQuery(() => dbLoad("reminders"), []) || [];

  const alerts = useMemo(() => {
    const generatedAlerts: Alert[] = [];
    
    customers.filter((c: Customer) => c.isQuickAdd).forEach((c: Customer) => {
        generatedAlerts.push({
            id: `incomplete-cust-${c.id}`,
            Icon: ICONS.incomplete,
            text: `Complete profile for ${c.name}`,
            time: 'Added via Quick Add',
            variant: 'destructive',
            type: 'incompleteProfile',
            actionLabel: 'Update'
        })
    });
    suppliers.filter((s: Supplier) => s.isQuickAdd).forEach((s: Supplier) => {
        generatedAlerts.push({
            id: `incomplete-supp-${s.id}`,
            Icon: ICONS.incomplete,
            text: `Complete profile for ${s.name}`,
            time: 'Added via Quick Add',
            variant: 'destructive',
            type: 'incompleteProfile',
            actionLabel: 'Update'
        })
    });
    inventory.filter((i: Item) => i.isQuickAdd).forEach((i: Item) => {
        generatedAlerts.push({
            id: `incomplete-item-${i.id}`,
            Icon: ICONS.item,
            text: `Complete details for item ${i.name}`,
            time: 'Added via Quick Add',
            variant: 'destructive',
            type: 'incompleteProfile',
            actionLabel: 'Update'
        })
    });

    const dueCustomers = customers.filter((c: Customer) => c.balance > 0).sort((a,b) => b.balance - a.balance);
    if(dueCustomers.length > 0) {
        generatedAlerts.push({
            id: 'action-payment-due',
            Icon: ICONS.payment,
            text: t('paymentDueFrom', { name: dueCustomers[0].name }),
            time: `PKR ${dueCustomers[0].balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            variant: 'default',
            type: 'automatic',
            actionLabel: 'Receive'
        });
    }

    const dueSuppliers = suppliers.filter((s: Supplier) => s.balance > 0).sort((a,b) => b.balance - a.balance);
    if(dueSuppliers.length > 0) {
        generatedAlerts.push({
            id: 'action-payable-to',
            Icon: ICONS.supplier,
            text: `Payment payable to ${dueSuppliers[0].name}`,
            time: `PKR ${dueSuppliers[0].balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            variant: 'destructive',
            type: 'automatic',
            actionLabel: 'Pay'
        });
    }

    const advancedWorkers = workers.filter((w: Worker) => w.balance < 0).sort((a,b) => a.balance - b.balance);
     if(advancedWorkers.length > 0) {
        generatedAlerts.push({
            id: 'action-advance-to',
            Icon: ICONS.worker,
            text: `Advance given to ${advancedWorkers[0].name}`,
            time: `PKR ${Math.abs(advancedWorkers[0].balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            variant: 'default',
            type: 'automatic',
             actionLabel: 'Details'
        });
    }

    const lowStockItems = inventory.filter((i: Item) => i.stock > 0 && i.stock <= i.lowStock).slice(0, 1);
    lowStockItems.forEach((i: Item) => {
        generatedAlerts.push({
            id: 'action-low-stock',
            Icon: ICONS.stock,
            text: t('lowStockFor', { name: i.name }),
            time: t('onlyLeft', { count: i.stock.toString() }),
            variant: 'destructive',
            type: 'automatic',
            actionLabel: 'Purchase'
        });
    });
    
    customReminders.forEach((r: CustomReminder) => {
        generatedAlerts.push({
            id: r.id,
            Icon: ICONS.general,
            text: r.text,
            time: format(new Date(r.date), "PPP"),
            variant: 'default',
            type: 'custom'
        });
    });

    return generatedAlerts.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [t, customers, suppliers, workers, inventory, customReminders]);
  
  const handleAlertAction = (alertId: string) => {
    if (alertId.startsWith('incomplete-cust-')) {
      router.push(`/customers?edit=${alertId.replace('incomplete-cust-', '')}`);
    } else if (alertId.startsWith('incomplete-supp-')) {
      router.push(`/suppliers?edit=${alertId.replace('incomplete-supp-', '')}`);
    } else if (alertId.startsWith('incomplete-item-')) {
      router.push(`/inventory?edit=${alertId.replace('incomplete-item-', '')}`);
    } else if (alertId === 'action-payment-due') {
      router.push('/customers?tab=outstanding-payments');
    } else if (alertId === 'action-payable-to') {
      router.push('/suppliers?tab=pending-payables');
    } else if (alertId === 'action-advance-to') {
      router.push('/workers');
    } else if (alertId === 'action-low-stock') {
      router.push('/purchases');
    }
  };


  const onSubmit = async (data: ReminderFormValues) => {
    const currentReminders: CustomReminder[] = await dbLoad("reminders");
    const newReminder: CustomReminder = {
        id: `reminder-${Date.now()}`,
        text: data.text,
        date: data.date.toISOString(),
        type: 'custom'
    };
    currentReminders.push(newReminder);
    await dbSave("reminders", currentReminders);
    toast({ title: "Reminder Added" });
    form.reset({ text: "", date: new Date() });
  }

  const openDeleteDialog = (id: string) => {
    const reminder = customReminders.find(a => a.id === id);
    if(reminder) {
      setReminderToDelete(reminder);
      setDeleteConfirmationCode(String(Math.floor(1000 + Math.random() * 9000)));
      setDeleteConfirmationInput('');
    }
  }
  
  const handleDeleteConfirm = async () => {
    if (!reminderToDelete) return;
    const currentReminders: CustomReminder[] = await dbLoad("reminders");
    const updatedReminders = currentReminders.filter(r => r.id !== reminderToDelete.id);
    await dbClearAndSave("reminders", updatedReminders);
    toast({ title: "Reminder Deleted" });
    setReminderToDelete(null);
  }

  return (
    <>
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="card-title">{t("alertsAndReminders")}</CardTitle>
            <Badge variant="secondary">{alerts.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow">
        <ScrollArea className="flex-grow h-[260px] pr-4">
            <div className="space-y-6">
                {alerts.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                    <p>{t('noAlerts')}</p>
                </div>
                )}
                {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${alert.variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                        <alert.Icon className={`h-5 w-5 ${alert.variant === 'destructive' ? 'text-destructive' : 'text-primary'}`} />
                    </div>
                    <div className="grid gap-1 flex-1">
                    <p className="font-medium text-sm">{alert.text}</p>
                    <p className="text-xs text-muted-foreground">{alert.time}</p>
                    </div>
                    {alert.actionLabel && (
                        <Button variant="outline" size="sm" onClick={() => handleAlertAction(alert.id)}>{alert.actionLabel}</Button>
                    )}
                    {alert.type === 'custom' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeleteDialog(alert.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    )}
                </div>
                ))}
            </div>
        </ScrollArea>
         <div className="pt-4 border-t mt-auto">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                    <p className="text-sm font-medium">Add New Reminder</p>
                    <div className="flex gap-2">
                        <FormField control={form.control} name="text" render={({ field }) => (
                           <FormItem className="flex-1">
                               <FormControl><Input placeholder="Reminder details..." {...field} /></FormControl>
                           </FormItem>
                        )} />
                        <FormField control={form.control} name="date" render={({ field }) => (
                            <FormItem>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant="outline" size="icon" className={cn(!field.value && "text-muted-foreground")}>
                                                <CalendarIcon className="h-4 w-4" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                </Popover>
                            </FormItem>
                        )} />
                    </div>
                     <Button type="submit" className="w-full">Add Reminder</Button>
                </form>
            </Form>
        </div>
      </CardContent>
    </Card>
     <AlertDialog open={!!reminderToDelete} onOpenChange={(open) => !open && setReminderToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action will permanently delete the reminder: "{reminderToDelete?.text}". To confirm, please type <code className="font-mono text-base bg-muted px-2 py-1 rounded-md">{deleteConfirmationCode}</code> in the box below.
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

    