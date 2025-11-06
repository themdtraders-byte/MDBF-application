
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { dbLoad, dbSave } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { useAccessControl } from "@/hooks/use-access-control";

const formSchema = z.object({
  sourceType: z.string().min(1, "Please select a source."),
  customerId: z.string().optional(),
  outsiderDescription: z.string().optional(),
  amount: z.number().min(0.01, "Amount must be greater than zero."),
  accountId: z.string().min(1, "Receiving account is required."),
}).refine(data => {
  if (data.sourceType === 'customer') {
    return !!data.customerId;
  }
  if (data.sourceType === 'outsider') {
    return !!data.outsiderDescription && data.outsiderDescription.length > 2;
  }
  return false;
}, {
  message: "Please provide the required details for the selected source.",
  path: ["customerId"], // Can point to one, or be general
});

type ReceivePaymentFormValues = z.infer<typeof formSchema>;
type Customer = { id: string; name: string; balance: number };
type Account = { id: string; name: string; };

export function ReceivePaymentForm() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { isReadOnly } = useAccessControl();
  
  const customers = useLiveQuery<Customer[], Customer[]>(() => dbLoad("customers"), [], []) || [];
  const accounts = useLiveQuery<Account[], Account[]>(() => dbLoad("accounts"), [], []) || [];

  const dueCustomers = customers.filter(c => c.balance > 0);

  const form = useForm<ReceivePaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      outsiderDescription: '',
    },
  });
  
  const customerId = form.watch("customerId");
  const sourceType = form.watch("sourceType");

  React.useEffect(() => {
    if (customerId && sourceType === 'customer') {
        const customer = dueCustomers.find(c => c.id === customerId);
        if (customer) {
            form.setValue("amount", customer.balance);
        }
    } else {
        form.setValue("amount", 0);
    }
  }, [customerId, sourceType, form, dueCustomers]);


  const onSubmit = async (data: ReceivePaymentFormValues) => {
    try {
      const allAccounts = await dbLoad("accounts");
      const salesHistory = await dbLoad("sales");

      const accountIndex = allAccounts.findIndex(a => a.id === data.accountId);
      if (accountIndex === -1) throw new Error("Account not found.");

      allAccounts[accountIndex].balance += data.amount;

      let paymentRecordNote = `Payment received on ${format(new Date(), 'PPP')}`;
      let customerIdForRecord = 'N/A';

      if (data.sourceType === 'customer' && data.customerId) {
          const allCustomers = await dbLoad("customers");
          const customerIndex = allCustomers.findIndex(c => c.id === data.customerId);
          if (customerIndex === -1) throw new Error("Customer not found.");

          allCustomers[customerIndex].balance -= data.amount;
          await dbSave("customers", allCustomers);
          customerIdForRecord = data.customerId;
          paymentRecordNote = `Payment received for outstanding balance for ${allCustomers[customerIndex].name}.`;
      } else if (data.sourceType === 'outsider') {
          paymentRecordNote = `Payment from outsider: ${data.outsiderDescription}`;
      }
      
      const paymentRecord = {
          invoiceNumber: `PAY-${Date.now()}`,
          invoiceDate: new Date().toISOString(),
          customerId: customerIdForRecord,
          items: [],
          subtotal: 0,
          totalDiscount: 0,
          totalAdjustment: 0,
          grandTotal: 0,
          amountReceived: data.amount,
          paymentAccountId: data.accountId,
          notes: paymentRecordNote,
          remainingBalance: 0,
      };
      salesHistory.push(paymentRecord);

      await dbSave("accounts", allAccounts);
      await dbSave("sales", salesHistory);

      toast({
          title: "Payment Received",
          description: `PKR ${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} received.`,
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
        <CardTitle>Receive Payment</CardTitle>
        <CardDescription>Record an incoming payment from any source.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 mt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <FormField
              control={form.control}
              name="sourceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Source</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the source of the payment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="customer">Existing Customer</SelectItem>
                        <SelectItem value="outsider">Other / Outsider</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {sourceType === 'customer' && (
                <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a customer with a due balance" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {dueCustomers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>{customer.name} (Due: PKR {customer.balance.toFixed(2)})</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
            
            {sourceType === 'outsider' && (
                 <FormField
                    control={form.control}
                    name="outsiderDescription"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Description of Source</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Sale of personal car, Loan from friend" {...field} disabled={isReadOnly} />
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
                  <FormLabel>Amount Received</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={isReadOnly} />
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
                  <FormLabel>Receive In Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <CardFooter className="p-0 pt-4">
              <Button type="submit" disabled={isReadOnly}>
                <Icons.plus className="mr-2" /> Confirm Payment
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
