
"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { dbLoad, dbSave, dbClearAndSave } from "@/lib/db";
import { Banknote, Landmark, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TransactionHistory } from "./transaction-history";
import { AddAccountForm } from "./add-account-form";
import { FormattedCurrency } from "../ui/formatted-currency";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Account = {
    id: string;
    name: string;
    type: "Cash" | "Bank" | "Mobile Wallet";
    balance: number;
    bank?: string;
    number?: string;
}

const accountIcons = {
    "Cash": Wallet,
    "Bank": Landmark,
    "Mobile Wallet": Banknote
}

export function AllAccounts() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [viewingAccount, setViewingAccount] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState('');
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  const fetchAccounts = async () => {
    const storedAccounts = await dbLoad("accounts");
    // Explicitly filter to ensure only financial accounts are shown.
    const financialAccounts = storedAccounts.filter(
        (acc: any) => acc.type === "Cash" || acc.type === "Bank" || acc.type === "Mobile Wallet"
    );
    setAccounts(financialAccounts);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);
  
  const totalBalance = accounts.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0);

  const handleEditFinish = () => {
    setEditingAccount(null);
    fetchAccounts();
  };

  const openDeleteDialog = (account: Account) => {
    setAccountToDelete(account);
    setDeleteConfirmationCode(String(Math.floor(1000 + Math.random() * 9000)));
    setDeleteConfirmationInput('');
  };

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return;

    const trash = await dbLoad('trash');
    const deletedItem = {
      id: `trash-account-${accountToDelete.id}-${Date.now()}`,
      type: 'Account',
      deletedAt: new Date().toISOString(),
      data: { ...accountToDelete, originalKey: 'accounts' },
    };
    trash.push(deletedItem);
    await dbSave('trash', trash);

    const updatedAccounts = accounts.filter((acc) => acc.id !== accountToDelete.id);
    await dbClearAndSave('accounts', updatedAccounts);
    setAccounts(updatedAccounts);

    toast({
      title: 'Account Moved to Trash',
      description: `${accountToDelete.name} has been moved to the trash.`,
    });
    setAccountToDelete(null);
  };

  return (
    <div>
        <Card className="mb-6">
            <CardHeader>
                <CardDescription>Total Combined Balance</CardDescription>
                <CardTitle className="text-4xl text-primary">
                    <FormattedCurrency amount={totalBalance} integerClassName="text-4xl" decimalClassName="text-2xl" />
                </CardTitle>
            </CardHeader>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => {
                const Icon = accountIcons[account.type] || Wallet;
                return (
                    <Card key={account.id} className="flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <CardTitle className="flex items-center gap-2">
                                <Icon className="h-6 w-6 text-muted-foreground" />
                                {account.name}
                            </CardTitle>
                            <span className="text-sm text-muted-foreground">{account.type}</span>
                        </div>
                        { (account.type === "Bank" || account.type === "Mobile Wallet") && 
                           <CardDescription>{account.bank} - {account.number}</CardDescription>
                        }
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-3xl font-bold">
                            <FormattedCurrency amount={account.balance || 0} integerClassName="text-3xl" decimalClassName="text-xl" />
                        </p>
                    </CardContent>
                    <CardFooter className="grid grid-cols-3 gap-2">
                         <Button variant="outline" className="w-full" onClick={() => setViewingAccount(account)}>
                            <Icons.History className="mr-2 h-4 w-4" /> Transactions
                         </Button>
                         <Button variant="outline" className="w-full" onClick={() => setEditingAccount(account)}>
                            <Icons.settings className="mr-2 h-4 w-4" /> Edit
                         </Button>
                         <Button variant="destructive" className="w-full" onClick={() => openDeleteDialog(account)}>
                            <Icons.trash className="mr-2 h-4 w-4" /> Delete
                         </Button>
                    </CardFooter>
                    </Card>
                )
            })}
             {accounts.length === 0 && (
                <div className="col-span-full text-center py-12">
                    <p className="text-muted-foreground">No financial accounts found. Add one to get started.</p>
                </div>
            )}
        </div>

        <Dialog open={!!viewingAccount} onOpenChange={(open) => !open && setViewingAccount(null)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[90vw]">
                <DialogHeader>
                    <DialogTitle>Transaction History for {viewingAccount?.name}</DialogTitle>
                </DialogHeader>
                {viewingAccount && <TransactionHistory accountId={viewingAccount.id} />}
            </DialogContent>
        </Dialog>
        <Dialog open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Account</DialogTitle>
                    <DialogDescription>Update the details for your account.</DialogDescription>
                </DialogHeader>
                <AddAccountForm accountToEdit={editingAccount} onFinish={handleEditFinish} />
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!accountToDelete} onOpenChange={(open) => !open && setAccountToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will move the account '{accountToDelete?.name}' to the trash. This does NOT delete associated transactions. To confirm, please type <code className="font-mono text-base bg-muted px-2 py-1 rounded-md">{deleteConfirmationCode}</code> in the box below.
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

    </div>
  );
}
