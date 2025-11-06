
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import React from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { dbLoad, dbSave } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";

const formSchema = z.object({
  destinationType: z.string().min(1, "Please select a destination."),
  supplierId: z.string().optional(),
  outsiderDescription: z.string().optional(),
  amount: z.number().min(0.01, "Amount must be greater than zero."),
  accountId: z.string().min(1, "Payment account is required."),
}).refine(data => {
  if (data.destinationType === 'supplier') {
    return !!data.supplierId;
  }
  if (data.destinationType === 'outsider') {
    return !!data.outsiderDescription && data.outsiderDescription.length > 2;
  }
  return false;
}, {
  message: "Please provide the required details for the selected destination.",
  path: ["supplierId"], 
});

type SendPaymentFormValues = z.infer<typeof formSchema>;
type Supplier = { id: string; name: string; balance: number };
type Account = { id: string; name: string; balance: number };

export function SendPaymentForm() {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const suppliers = useLiveQuery<Supplier[], Supplier[]>(() => dbLoad("suppliers"), [], []) || [];
  const accounts = useLiveQuery<Account[], Account[]>(() => dbLoad("accounts"), [], []) || [];
  
  const payableSuppliers = suppliers.filter(s => s.balance > 0);

  const form = useForm<SendPaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      outsiderDescription: '',
    },
  });

  const supplierId = form.watch("supplierId");
  const destinationType = form.watch("destinationType");

  React.useEffect(() => {
    if (supplierId && destinationType === 'supplier') {
        const supplier = payableSuppliers.find(s => s.id === supplierId);
        if (supplier) {
            form.setValue("amount", supplier.balance);
        }
    } else {
        form.setValue("amount", 0);
    }
  }, [supplierId, destinationType, form, payableSuppliers]);

  const onSubmit = async (data: SendPaymentFormValues) => {
    try {
      const allAccounts = await dbLoad("accounts");
      const purchaseHistory = await dbLoad("purchases");

      const accountIndex = allAccounts.findIndex(a => a.id === data.accountId);
      if (accountIndex === -1) throw new Error("Account not found.");
      
      if (allAccounts[accountIndex].balance < data.amount) {
          toast({ variant: "destructive", title: "Insufficient Balance" });
          return;
      }
      allAccounts[accountIndex].balance -= data.amount;

      let paymentRecordNote = `Payment made on ${format(new Date(), 'PPP')}`;
      let supplierIdForRecord = 'N/A';

      if (data.destinationType === 'supplier' && data.supplierId) {
          const allSuppliers = await dbLoad("suppliers");
          const supplierIndex = allSuppliers.findIndex(s => s.id === data.supplierId);
          if (supplierIndex === -1) throw new Error("Supplier not found.");
          allSuppliers[supplierIndex].balance -= data.amount;
          await dbSave("suppliers", allSuppliers);
          supplierIdForRecord = data.supplierId;
          paymentRecordNote = `Payment made for outstanding balance for ${allSuppliers[supplierIndex].name}.`;
      } else if (data.destinationType === 'outsider') {
          paymentRecordNote = `Payment to outsider: ${data.outsiderDescription}`;
      }
      
      const paymentRecord = {
          billNumber: `PAYBILL-${Date.now()}`,
          purchaseDate: new Date().toISOString(),
          supplierId: supplierIdForRecord,
          items: [],
          subtotal: 0,
          totalDiscount: 0,
          totalAdjustment: 0,
          grandTotal: 0,
          amountPaid: data.amount,
          paymentAccountId: data.accountId,
          notes: paymentRecordNote,
          remainingBalance: 0,
      };
      purchaseHistory.push(paymentRecord);

      await dbSave("accounts", allAccounts);
      await dbSave("purchases", purchaseHistory);

      toast({
          title: "Payment Sent",
          description: `PKR ${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} paid.`,
      });
      
      form.reset();

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to record payment.",
      });
    }
  };
  
  return (
    <Card className="max-w-2xl mx-auto border-0 shadow-none">
      <CardHeader className="p-0">
        <CardTitle>Send Payment</CardTitle>
        <CardDescription>Record an outgoing payment to any source.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 mt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="destinationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Destination</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the destination of the payment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="supplier">Existing Supplier</SelectItem>
                        <SelectItem value="outsider">Other / Outsider</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {destinationType === 'supplier' && (
                <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a supplier with a payable balance" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {payableSuppliers.map(supplier => (
                            <SelectItem key={supplier.id} value={supplier.id}>{supplier.name} (Payable: PKR {supplier.balance.toFixed(2)})</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}

            {destinationType === 'outsider' && (
                 <FormField
                    control={form.control}
                    name="outsiderDescription"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Description of Destination</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Purchase of new car, Loan to friend" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Paid</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pay From Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} (Balance: {acc.balance.toFixed(2)})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <CardFooter className="p-0 pt-4">
              <Button type="submit">
                <Icons.plus className="mr-2" /> Confirm Payment
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
