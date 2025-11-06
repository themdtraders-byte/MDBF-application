

"use client";

import { useEffect, useState } from "react";
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
import { dbLoad, dbSave, dbClearAndSave } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { ExpenseCategoryDetails } from "./expense-category-details";
import { cn } from "@/lib/utils";
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


type Expense = {
    id: string;
    categoryId: string;
    amount: number;
}
type ExpenseCategory = {
    id: string;
    name: string;
    description?: string;
}

const typeSchema = z.object({
  name: z.string().min(2, "Category name is required."),
  description: z.string().optional(),
});
type TypeFormValues = z.infer<typeof typeSchema>;


export function ExpenseCategoriesTable() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [viewingCategory, setViewingCategory] = useState<ExpenseCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategory | null>(null);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState('');
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  const form = useForm<TypeFormValues>({
    resolver: zodResolver(typeSchema),
  });
  
  const getCategoryDbKey = () => {
    if (typeof window === 'undefined') return 'business-expense-categories';
    const activeAccount = localStorage.getItem('dukaanxp-active-account');
    if (activeAccount) {
      try {
        const type = JSON.parse(activeAccount).type;
        return type === 'Home' ? 'home-expense-categories' : 'business-expense-categories';
      } catch (e) {
        return 'business-expense-categories';
      }
    }
    return 'business-expense-categories';
  }

  const fetchData = async () => {
      const dbKey = getCategoryDbKey();
      const storedCategories = await dbLoad(dbKey);
      setCategories(storedCategories);
      const storedExpenses = await dbLoad("expenses");
      setExpenses(storedExpenses);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const getCategoryTotal = (categoryId: string) => {
    return expenses
        .filter(e => e.categoryId === categoryId)
        .reduce((total, e) => total + e.amount, 0);
  }

  const openDialog = (category: ExpenseCategory | null = null) => {
    setEditingCategory(category);
    form.reset(category ? { name: category.name, description: category.description || '' } : { name: '', description: '' });
    setIsDialogOpen(true);
  }
  
  const openDeleteDialog = (category: ExpenseCategory) => {
    setCategoryToDelete(category);
    setDeleteConfirmationCode(String(Math.floor(1000 + Math.random() * 9000)));
    setDeleteConfirmationInput('');
  }

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    const dbKey = getCategoryDbKey();
    const updatedCategories = categories.filter(c => c.id !== categoryToDelete.id);
    await dbClearAndSave(dbKey, updatedCategories);
    setCategories(updatedCategories);
    toast({ variant: 'destructive', title: "Category Deleted" });
    setCategoryToDelete(null);
  }

  const onSubmit = async (data: TypeFormValues) => {
    const dbKey = getCategoryDbKey();
    const currentCategories = await dbLoad(dbKey);
    if (editingCategory) {
        const index = currentCategories.findIndex((t: ExpenseCategory) => t.id === editingCategory.id);
        if (index > -1) {
            currentCategories[index] = { ...editingCategory, ...data };
        }
    } else {
        const newCategory = {
            id: `CAT-${Date.now()}`,
            name: data.name,
            description: data.description,
        };
        currentCategories.push(newCategory);
    }
    await dbSave(dbKey, currentCategories);
    setCategories(currentCategories);
    toast({ title: editingCategory ? "Category Updated" : "Category Created" });
    setIsDialogOpen(false);
    setEditingCategory(null);
  };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>{t("expenseCategories")}</CardTitle>
            <CardDescription>{t('expenseCategoryDescription')}</CardDescription>
        </div>
        <Button onClick={() => openDialog()}>
            <Icons.plus className="mr-2" /> {t('addNewCategory')}
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('categoryName')}</TableHead>
              <TableHead>{t('description')}</TableHead>
              <TableHead className="text-right">{t('totalExpenses')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id} onClick={() => setViewingCategory(category)} className="cursor-pointer">
                <TableCell className="font-medium flex items-center gap-2">
                    {category.name}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{category.description}</TableCell>
                <TableCell className="text-right">PKR {getCategoryTotal(category.id).toFixed(2)}</TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openDialog(category); }}>
                        <Icons.settings className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); openDeleteDialog(category);}}>
                        <Icons.trash className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
             {categories.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">{t('noCategoriesFound')}</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit' : 'Add'} Expense Category</DialogTitle>
          </DialogHeader>
           <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
               <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{t('categoryName')}</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Rent, Utilities" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{t('descriptionOptional')}</FormLabel>
                    <FormControl>
                        <Input placeholder="A short description" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <DialogFooter>
                    <Button type="submit">{editingCategory ? t('saveChanges') : t('createCategory')}</Button>
                </DialogFooter>
            </form>
           </Form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!viewingCategory} onOpenChange={(open) => !open && setViewingCategory(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[90vw]">
            <DialogHeader>
                <DialogTitle>{t('detailsFor')} {viewingCategory?.name}</DialogTitle>
            </DialogHeader>
            {viewingCategory && <ExpenseCategoryDetails categoryId={viewingCategory.id} onDataChange={fetchData} />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone and will permanently delete the category '{categoryToDelete?.name}'. To confirm, please type <code className="font-mono text-base bg-muted px-2 py-1 rounded-md">{deleteConfirmationCode}</code> in the box below.
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
