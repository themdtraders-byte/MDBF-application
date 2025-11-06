
"use client";

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { dbLoad, dbSave } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";

const formSchema = z.object({
  transferType: z.enum(["money", "inventory"]).default("money"),
  fromAccountId: z.string().min(1, "Source account is required."),
  toAccountId: z.string().min(1, "Destination account is required."),
  amount: z.number().min(0.01, "Amount must be greater than zero."),
  date: z.date(),
  notes: z.string().optional(),
}).refine(data => data.fromAccountId !== data.toAccountId, {
  message: "Source and destination accounts cannot be the same.",
  path: ["toAccountId"],
});

type TransferFormValues = z.infer<typeof formSchema>;
type Account = { id: string; name: string; balance: number; type: "Cash" | "Bank" | "Mobile Wallet" };

export function NewTransferForm() {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const allAccounts = useLiveQuery(() => dbLoad("accounts"), []) || [];
  const accounts = allAccounts.filter(
    (acc: any) => acc.type === "Cash" || acc.type === "Bank" || acc.type === "Mobile Wallet"
  );

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transferType: "money",
      date: new Date(),
      amount: 0,
      notes: ""
    },
  });

  const onSubmit = async (data: TransferFormValues) => {
    try {
        const currentAccounts: Account[] = await dbLoad("accounts");
        
        const fromAccountIndex = currentAccounts.findIndex(a => a.id === data.fromAccountId);
        const toAccountIndex = currentAccounts.findIndex(a => a.id === data.toAccountId);

        if (fromAccountIndex === -1 || toAccountIndex === -1) {
            throw new Error("One or both accounts not found.");
        }

        if (currentAccounts[fromAccountIndex].balance < data.amount) {
            form.setError("amount", { message: "Insufficient balance in source account." });
            return;
        }

        currentAccounts[fromAccountIndex].balance -= data.amount;
        currentAccounts[toAccountIndex].balance += data.amount;
        await dbSave("accounts", currentAccounts);

        const transferHistory = await dbLoad("transfers");
        transferHistory.push({ id: `TXN-${Date.now()}`, ...data });
        await dbSave("transfers", transferHistory);

        toast({
            title: "Transfer Successful",
            description: `PKR ${data.amount} transferred successfully.`,
        });

        form.reset({
            transferType: "money",
            date: new Date(),
            fromAccountId: "",
            toAccountId: "",
            amount: 0,
            notes: "",
        });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Transfer Failed",
        description: error.message || "An unexpected error occurred.",
      });
    }
  };
  
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t("transfers")}</CardTitle>
        <CardDescription>Transfer funds between your accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                    control={form.control}
                    name="fromAccountId"
                    render={({ field }) => (
                        <FormItem><FormLabel>From Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger></FormControl>
                            <SelectContent>{accounts.map(item => (<SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>))}</SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="toAccountId"
                    render={({ field }) => (
                        <FormItem><FormLabel>To Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger></FormControl>
                            <SelectContent>{accounts.map(item => (<SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>))}</SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Amount to Transfer</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Icons.dollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input type="number" {...field}
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
            <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Transfer Date</FormLabel>
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
                name="notes"
                render={({ field }) => (<FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Transfer for office supplies" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)}
            />

            <CardFooter className="flex justify-end gap-2 p-0 pt-6">
                <Button type="submit">
                    <Icons.transfers className="mr-2" /> Complete Transfer
                </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
