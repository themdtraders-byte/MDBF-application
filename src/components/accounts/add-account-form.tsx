
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { dbLoad, dbSave } from "@/lib/db";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "../ui/textarea";
import { useAccessControl } from "@/hooks/use-access-control";

const formSchema = z.object({
  accountName: z.string().min(2, "Account name is required."),
  accountType: z.string().min(1, "Account type is required."),
  accountHolder: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  openingBalance: z.number().default(0),
  notes: z.string().optional(),
});

type AccountFormValues = z.infer<typeof formSchema>;
interface AddAccountFormProps {
    accountToEdit?: any | null;
    onFinish?: () => void;
}

const generateAccountId = async () => {
    const accounts = await dbLoad("accounts");
    const lastId = accounts
        .map(a => a.id)
        .filter(id => id && id.startsWith("ACC-"))
        .map(id => parseInt(id.replace("ACC-", ""), 10))
        .filter(num => !isNaN(num))
        .sort((a, b) => b - a)[0] || 0;
    return `ACC-${String(lastId + 1).padStart(4, '0')}`;
};

export function AddAccountForm({ accountToEdit, onFinish }: AddAccountFormProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { isReadOnly } = useAccessControl();
  const isEditMode = !!accountToEdit;

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
        accountName: accountToEdit.name,
        accountType: accountToEdit.type,
        accountHolder: accountToEdit.holder || '',
        accountNumber: accountToEdit.number || '',
        bankName: accountToEdit.bank || '',
        openingBalance: accountToEdit.openingBalance,
        notes: accountToEdit.notes || '',
    } : {
      accountName: "",
      accountType: "Cash",
      accountHolder: "",
      accountNumber: "",
      bankName: "",
      openingBalance: 0,
      notes: "",
    },
  });
  
  const accountType = form.watch("accountType");

  const onSubmit = async (data: AccountFormValues) => {
    try {
      const existingAccounts = await dbLoad("accounts");
      if(isEditMode) {
        const accountIndex = existingAccounts.findIndex(acc => acc.id === accountToEdit.id);
        if(accountIndex > -1) {
            existingAccounts[accountIndex] = {
                ...existingAccounts[accountIndex],
                name: data.accountName,
                type: data.accountType,
                holder: data.accountHolder,
                number: data.accountNumber,
                bank: data.bankName,
                balance: data.openingBalance, // Balance is updated directly
                openingBalance: data.openingBalance, // Keep opening balance for history
                notes: data.notes,
            }
        }
      } else {
        const newAccount = {
            id: await generateAccountId(),
            createdAt: new Date().toISOString(),
            name: data.accountName,
            type: data.accountType,
            holder: data.accountHolder,
            number: data.accountNumber,
            bank: data.bankName,
            balance: data.openingBalance,
            openingBalance: data.openingBalance,
            notes: data.notes,
        };
        existingAccounts.push(newAccount);
      }

      await dbSave("accounts", existingAccounts);
      
      toast({
        title: isEditMode ? "Account Updated" : "Account Added",
        description: `${data.accountName} has been ${isEditMode ? 'updated' : 'added'} successfully.`,
      });
      
      if(onFinish) {
          onFinish();
      } else {
         form.reset({
            accountName: "",
            accountType: "Cash",
            openingBalance: 0,
            accountHolder: "",
            accountNumber: "",
            bankName: "",
            notes: ""
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'add'} account. Please try again.`,
      });
    }
  };
  
  return (
    <Card className="max-w-2xl mx-auto border-0 shadow-none">
      <CardHeader className="p-0">
        <CardTitle>{isEditMode ? 'Edit Account' : t('addAccount')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 mt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="accountName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Account Nickname</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., My Business Cash, HBL Main" {...field} disabled={isReadOnly} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="accountType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Account Type</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an account type" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Bank">Bank Account</SelectItem>
                                <SelectItem value="Mobile Wallet">Mobile Wallet</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            { (accountType === "Bank" || accountType === "Mobile Wallet") &&
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{accountType === 'Bank' ? 'Bank Name' : 'Service Name'}</FormLabel>
                        <FormControl>
                            <Input placeholder={accountType === 'Bank' ? 'e.g., HBL, Meezan Bank' : 'e.g., JazzCash, EasyPaisa'} {...field} disabled={isReadOnly} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Account / IBAN Number</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., 03001234567" {...field} disabled={isReadOnly} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                  <FormField
                    control={form.control}
                    name="accountHolder"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Account Holder Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Ahmed Raza" {...field} disabled={isReadOnly} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
              </div>
            }

            <FormField
                control={form.control}
                name="openingBalance"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Opening / Current Balance</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={isReadOnly} />
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
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Any notes about this account" {...field} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

             <CardFooter className="flex justify-end gap-2 p-0 pt-6">
                <Button type="submit" disabled={isReadOnly}>
                    <Icons.plus className="mr-2" /> {isEditMode ? 'Save Changes' : 'Save Account'}
                </Button>
             </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
