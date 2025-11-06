
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { dbLoad, dbSave } from "@/lib/db";

const formSchema = z.object({
  paymentType: z.enum(["incoming", "outgoing"]),
  date: z.date(),
  amount: z.number().min(0.01, "Amount must be greater than 0."),
  category: z.string().min(1, "Category is required."),
  fromToId: z.string().optional(),
  manualFromTo: z.string().optional(),
  accountId: z.string().min(1, "An account is required."),
  relatedInvoice: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof formSchema>;
type Customer = { id: string; name: string; };
type Supplier = { id: string; name: string; };
type Worker = { id: string; name: string; };
type Account = { id: string; name: string; type: "Cash" | "Bank" | "Mobile Wallet", balance: number };


export function PaymentForm() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setCustomers(await dbLoad("customers"));
      setSuppliers(await dbLoad("suppliers"));
      setWorkers(await dbLoad("workers"));
      
      const allAccounts: Account[] = await dbLoad("accounts");
      const financialAccounts = allAccounts.filter(
          (acc: any) => acc.type === "Cash" || acc.type === "Bank" || acc.type === "Mobile Wallet"
      );
      setAccounts(financialAccounts);
    }
    fetchData();
  }, []);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      paymentType: "outgoing",
      amount: 0,
      notes: ""
    },
  });

  const paymentType = form.watch("paymentType");
  const category = form.watch("category");

  const onSubmit = async (data: PaymentFormValues) => {
    try {
        const allPayments = await dbLoad("payments");
        const newPayment = { id: `PAY-${Date.now()}`, ...data };
        allPayments.push(newPayment);
        await dbSave("payments", allPayments);

        const currentAccounts: Account[] = await dbLoad("accounts");
        const accountIndex = currentAccounts.findIndex(a => a.id === data.accountId);
        if (accountIndex > -1) {
            if (data.paymentType === 'incoming') {
                currentAccounts[accountIndex].balance += data.amount;
            } else {
                currentAccounts[accountIndex].balance -= data.amount;
            }
            await dbSave("accounts", currentAccounts);
        }

        // Add more logic here to update customer/supplier/worker balances

        toast({
            title: "Payment Recorded",
            description: "The payment has been successfully recorded.",
        });
        form.reset();

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to record payment. Please try again.",
      });
    }
  };
  
  const getDynamicLabel = () => {
    if (paymentType === 'incoming') {
        return category === 'Sale' ? 'Customer' : 'From';
    }
    // outgoing
    if (category === 'Purchase') return 'Supplier';
    if (category === 'Salary') return 'Worker';
    return 'To';
  }

  const getDynamicList = () => {
    if (paymentType === 'incoming' && category === 'Sale') return customers;
    if (paymentType === 'outgoing' && category === 'Purchase') return suppliers;
    if (paymentType === 'outgoing' && category === 'Salary') return workers;
    return [];
  }

  const dynamicList = getDynamicList();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t('addPayment')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="paymentType"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Payment Type</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl><RadioGroupItem value="incoming" /></FormControl>
                                    <FormLabel className="font-normal">Incoming</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl><RadioGroupItem value="outgoing" /></FormControl>
                                    <FormLabel className="font-normal">Outgoing</FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}<Icons.calendar className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                           <div className="relative">
                               <Icons.dollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                               <Input type="number" placeholder="0.00" {...field}
                                value={field.value === 0 ? '' : field.value}
                                onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                                onBlur={e => { if (e.target.value === '') e.target.value = '0'; }}
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="pl-10" />
                           </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {paymentType === 'incoming' ? (
                                <>
                                <SelectItem value="Sale">Sale Payment</SelectItem>
                                <SelectItem value="Other">Other Income</SelectItem>
                                </>
                            ) : (
                                <>
                                <SelectItem value="Purchase">Purchase Payment</SelectItem>
                                <SelectItem value="Salary">Worker Salary / Advance</SelectItem>
                                <SelectItem value="Expense">General Expense</SelectItem>
                                <SelectItem value="Other">Other Expense</SelectItem>
                                </>
                            )}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            {dynamicList.length > 0 ? (
                <FormField
                    control={form.control}
                    name="fromToId"
                    render={({ field }) => (<FormItem><FormLabel>{getDynamicLabel()}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder={`Select a ${getDynamicLabel().toLowerCase()}`} /></SelectTrigger></FormControl>
                            <SelectContent>
                                {dynamicList.map(item => (<SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            ) : (
                <FormField
                    control={form.control}
                    name="manualFromTo"
                    render={({ field }) => (<FormItem><FormLabel>{getDynamicLabel()}</FormLabel><FormControl><Input placeholder={`Enter name for ${getDynamicLabel().toLowerCase()}`} {...field} /></FormControl><FormMessage /></FormItem>)}
                />
            )}
             <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                    <FormItem><FormLabel>From / Into Account</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger></FormControl>
                        <SelectContent>{accounts.map(item => (<SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>))}</SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (<FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Any notes about this payment" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)}
            />

             <CardFooter className="flex justify-end gap-2 p-0 pt-6">
                <Button type="submit">
                    <Icons.plus className="mr-2" /> Save Payment
                </Button>
             </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    