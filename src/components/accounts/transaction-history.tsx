

"use client";

import { useEffect, useState, useMemo } from "react";
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
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { dbLoad } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "../ui/date-range-picker";
import { DateRange } from "react-day-picker";

type Transaction = {
    id: string;
    date: string;
    account: string;
    accountId: string;
    category: string;
    description: string;
    type: "credit" | "debit";
    amount: number;
}
type Profile = { id: string; name: string, type: 'Business' | 'Home' };
type Customer = { id: string, name: string };
type Supplier = { id: string, name: string };
type Worker = { id: string, name: string };
type Account = { id: string, name: string, openingBalance?: number; createdAt?: string; balance: number; };
type ExpenseCategory = { id: string, name: string };

interface TransactionHistoryProps {
    accountId?: string;
}

const loadProfileData = async (profileId: string, key: string) => {
    if (typeof window === 'undefined') return [];
    
    // Temporarily set active profile for dbLoad
    const originalProfile = localStorage.getItem('dukaanxp-active-account');
    localStorage.setItem('dukaanxp-active-account', JSON.stringify({ id: profileId }));

    const data = await dbLoad(key);

    // Restore original profile
    if (originalProfile) {
        localStorage.setItem('dukaanxp-active-account', originalProfile);
    } else {
        localStorage.removeItem('dukaanxp-active-account');
    }
    
    return data;
};

export function TransactionHistory({ accountId }: TransactionHistoryProps) {
  const { t } = useLanguage();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  useEffect(() => {
    const fetchTransactions = async () => {
        const allProfiles: Profile[] = await dbLoad("profiles");
        const allAccounts: Account[] = await dbLoad("accounts");
        const allBusinessCategories: ExpenseCategory[] = await dbLoad("business-expense-categories");
        const allHomeCategories: ExpenseCategory[] = await dbLoad("home-expense-categories");
        const allExpenseCategories = [...allBusinessCategories, ...allHomeCategories];

        let txs: Transaction[] = [];
        
        const ensureStringDate = (date: string | Date): string => {
            if (date instanceof Date) {
                return date.toISOString();
            }
            return date;
        }

        // Add opening balances as initial transactions
        allAccounts.forEach((acc: Account) => {
            const openingBalance = acc.openingBalance || acc.balance; // Fallback for older accounts
            if (openingBalance > 0) {
                 txs.push({
                    id: `open-${acc.id}`,
                    date: ensureStringDate(acc.createdAt || new Date(parseInt(acc.id.split('-')[1])).toISOString()),
                    account: acc.name,
                    accountId: acc.id,
                    category: 'Opening Balance',
                    description: 'Initial account balance',
                    type: 'credit',
                    amount: openingBalance,
                });
            }
        });


        for (const profile of allProfiles) {
            const customers: Customer[] = await loadProfileData(profile.id, "customers");
            const suppliers: Supplier[] = await loadProfileData(profile.id, "suppliers");
            const workers: Worker[] = await loadProfileData(profile.id, "workers");
            const sales = await loadProfileData(profile.id, "sales");
            const purchases = await loadProfileData(profile.id, "purchases");
            const expenses = await loadProfileData(profile.id, "expenses");
            const transfers = await loadProfileData(profile.id, "transfers");
            const salaryTxs = await loadProfileData(profile.id, "salary-transactions");

            const getAccountName = (accId: string) => allAccounts.find((a: Account) => a.id === accId)?.name || accId;
            const getCustomerName = (customerId: string) => customers.find((c: Customer) => c.id === customerId)?.name || 'Unknown Customer';
            const getSupplierName = (supplierId: string) => suppliers.find((s: Supplier) => s.id === supplierId)?.name || 'Unknown Supplier';
            const getWorkerName = (workerId: string) => workers.find((w: Worker) => w.id === workerId)?.name || 'Unknown Worker';
            const getExpenseCategoryName = (categoryId: string) => allExpenseCategories.find((c: ExpenseCategory) => c.id === categoryId)?.name || 'General';

            const salesTransactions = sales.map((p: any) => ({
                id: p.invoiceNumber,
                date: ensureStringDate(p.invoiceDate),
                account: getAccountName(p.paymentAccountId),
                accountId: p.paymentAccountId,
                category: "Sale",
                description: p.notes?.startsWith('Payment from outsider:') ? p.notes : `From ${getCustomerName(p.customerId)} for #${p.invoiceNumber}`,
                type: 'credit',
                amount: p.amountReceived
            })).filter((t: any) => t.amount > 0);

            const purchaseTransactions = purchases.map((p: any) => ({
                id: p.billNumber,
                date: ensureStringDate(p.purchaseDate),
                account: getAccountName(p.paymentAccountId),
                accountId: p.paymentAccountId,
                category: "Purchase",
                description: p.notes?.startsWith('Payment to outsider:') ? p.notes : `To ${getSupplierName(p.supplierId)} for #${p.billNumber}`,
                type: 'debit',
                amount: p.amountPaid
            })).filter((t: any) => t.amount > 0);

            const expenseTransactions = expenses.map((e: any) => ({
                id: e.id,
                date: ensureStringDate(e.date),
                account: getAccountName(e.paymentAccountId),
                accountId: e.paymentAccountId,
                category: getExpenseCategoryName(e.categoryId),
                description: e.notes || 'General Expense',
                type: 'debit',
                amount: e.amount
            }));
            
            const transferTransactions: Transaction[] = [];
            transfers.forEach((t: any) => {
                transferTransactions.push({
                    id: `${t.id}-debit`,
                    date: ensureStringDate(t.date),
                    account: getAccountName(t.fromAccountId),
                    accountId: t.fromAccountId,
                    category: 'Transfer',
                    description: `Transfer to ${getAccountName(t.toAccountId)}`,
                    type: 'debit',
                    amount: t.amount,
                });
                transferTransactions.push({
                    id: `${t.id}-credit`,
                    date: ensureStringDate(t.date),
                    account: getAccountName(t.toAccountId),
                    accountId: t.toAccountId,
                    category: 'Transfer',
                    description: `Transfer from ${getAccountName(t.fromAccountId)}`,
                    type: 'credit',
                    amount: t.amount,
                });
            });
            
            const salaryTransactions = salaryTxs.map((st: any) => ({
                 id: st.id,
                 date: ensureStringDate(st.date),
                 account: getAccountName(st.accountId),
                 accountId: st.accountId,
                 category: 'Salary',
                 description: `Paid to ${getWorkerName(st.workerId)} for ${st.type}`,
                 type: 'debit',
                 amount: st.amount
            }));


            txs.push(...salesTransactions, ...purchaseTransactions, ...expenseTransactions, ...transferTransactions, ...salaryTransactions);
        }
        setAllTransactions(txs);
    }
    fetchTransactions();
  }, []);
  
  const transactions = useMemo(() => {
    let finalTransactions = allTransactions;
    if (accountId) {
        finalTransactions = finalTransactions.filter(t => t.accountId === accountId);
    }

    if (dateRange?.from) {
      const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
      finalTransactions = finalTransactions.filter(t => isWithinInterval(parseISO(t.date), interval));
    }

    return finalTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTransactions, accountId, dateRange]);


  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
                <CardTitle>{t("transactionHistory")}</CardTitle>
                <CardDescription>A complete log of all financial movements.</CardDescription>
            </div>
            <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('date')}</TableHead>
              {!accountId && <TableHead>{t('account')}</TableHead>}
              <TableHead>{t('categoryName')}</TableHead>
              <TableHead>{t('description')}</TableHead>
              <TableHead>{t('type')}</TableHead>
              <TableHead className="text-right">{t('amount')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction, index) => (
              <TableRow key={`${transaction.id}-${index}`}>
                <TableCell>{format(new Date(transaction.date), "PPP")}</TableCell>
                {!accountId && <TableCell>{transaction.account}</TableCell>}
                <TableCell><Badge variant="outline">{transaction.category}</Badge></TableCell>
                <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                <TableCell>
                    <Badge variant={transaction.type === 'credit' ? 'secondary' : 'destructive'}>
                        {transaction.type}
                    </Badge>
                </TableCell>
                <TableCell className={`text-right font-semibold ${transaction.type === 'credit' ? 'text-green-600' : 'text-destructive'}`}>
                    PKR {transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            ))}
             {transactions.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No transactions found.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
