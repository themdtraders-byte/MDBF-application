

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/hooks/use-language";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { dbLoad, dbSave } from "@/lib/db";
import { Icons } from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AddExpenseForm } from "./add-expense-form";
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
import { Input } from "@/components/ui/input";

type Expense = {
    id: string;
    date: string;
    categoryId: string;
    amount: number;
    notes?: string;
    reference?: string;
    attachment?: string;
}

interface ExpenseCategoryDetailsProps {
    categoryId: string;
    onDataChange: () => void;
}

export function ExpenseCategoryDetails({ categoryId, onDataChange }: ExpenseCategoryDetailsProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState('');
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  const fetchExpenses = async () => {
    const allExpenses = await dbLoad("expenses");
    const categoryExpenses = allExpenses.filter(expense => expense.categoryId === categoryId)
                                      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setExpenses(categoryExpenses);
  }

  useEffect(() => {
    fetchExpenses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const openDeleteDialog = (expense: Expense) => {
    setExpenseToDelete(expense);
    setDeleteConfirmationCode(String(Math.floor(1000 + Math.random() * 9000)));
    setDeleteConfirmationInput('');
  }

  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return;
    
    const currentExpenses = await dbLoad("expenses");
    const updatedExpenses = currentExpenses.filter(e => e.id !== expenseToDelete.id);
    await dbSave("expenses", updatedExpenses);
    setExpenses(updatedExpenses.filter(e => e.categoryId === categoryId));
    onDataChange();
    toast({
        variant: "destructive",
        title: "Expense Deleted",
        description: "The expense has been successfully deleted.",
    })
    setExpenseToDelete(null);
  }

  const handleEditFinish = () => {
    setEditingExpense(null);
    fetchExpenses();
    onDataChange();
  }


  return (
    <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">{t("amount")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{format(new Date(expense.date), "PPP")}</TableCell>
                <TableCell>{expense.reference || 'N/A'}</TableCell>
                <TableCell>{expense.notes || 'N/A'}</TableCell>
                <TableCell className="text-right font-semibold text-destructive">
                    PKR {expense.amount.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewingExpense(expense)}>
                        <Icons.search className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditingExpense(expense)}>
                        <Icons.settings className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => openDeleteDialog(expense)}>
                        <Icons.trash className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
             {expenses.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        {t('noTransactionsFound')}
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>

        <Dialog open={!!viewingExpense} onOpenChange={(open) => !open && setViewingExpense(null)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Expense Details</DialogTitle>
                    <DialogDescription>Reference: {viewingExpense?.reference || viewingExpense?.id}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('date')}</span>
                        <span className="font-medium">{viewingExpense && format(new Date(viewingExpense.date), "PPP")}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('amount')}</span>
                        <span className="font-medium text-destructive">PKR {viewingExpense?.amount.toFixed(2)}</span>
                    </div>
                    <Separator />
                     <div className="space-y-1">
                        <p className="text-muted-foreground">{t('notesOptional')}</p>
                        <p className="font-medium">{viewingExpense?.notes || "No notes provided."}</p>
                    </div>
                    {viewingExpense?.attachment && viewingExpense.attachment.length > 0 && (
                        <div className="space-y-2">
                             <Separator />
                            <p className="text-muted-foreground">Attachment</p>
                            <div className="rounded-md overflow-hidden border">
                                <Image src={viewingExpense.attachment} alt="Expense attachment" width={400} height={400} className="w-full object-contain" />
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
        
        <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Expense</DialogTitle>
                </DialogHeader>
                <AddExpenseForm expenseToEdit={editingExpense as any} onFinish={handleEditFinish} />
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone and will permanently delete this expense record. To confirm, please type <code className="font-mono text-base bg-muted px-2 py-1 rounded-md">{deleteConfirmationCode}</code> in the box below.
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

    
