
"use client";

import { useEffect, useState, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, isWithinInterval, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { dbLoad } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { useLanguage } from "@/hooks/use-language";

type Profile = { id: string; name: string; type: 'Business' | 'Home' };

const loadAllData = async (key: string): Promise<any[]> => {
    if (typeof window === 'undefined') return [];
    const profiles: Profile[] = await dbLoad('profiles');
    let allData: any[] = [];
    for (const profile of profiles) {
        // Set context for dbLoad
        const originalAccount = localStorage.getItem('dukaanxp-active-account');
        localStorage.setItem('dukaanxp-active-account', JSON.stringify({ id: profile.id, type: profile.type }));
        
        let dataKey = key;
        if (key === 'expense-categories') {
            dataKey = profile.type === 'Home' ? 'home-expense-categories' : 'business-expense-categories';
        }
        
        const data = await dbLoad(dataKey);
        allData.push(...data.map(d => ({ ...d, profileName: profile.name })));

        // Restore context
        if (originalAccount) {
            localStorage.setItem('dukaanxp-active-account', originalAccount);
        } else {
            localStorage.removeItem('dukaanxp-active-account');
        }
    }
    return allData;
};

const filterDataByDate = (data: any[], dateRange: DateRange | undefined, dateKey: string) => {
    if (!dateRange?.from) return data;
    const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
    return data.filter(item => {
        const dateValue = item[dateKey];
        if (!dateValue) return false;
        const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
        try {
            return isWithinInterval(date, interval);
        } catch (e) {
            console.error(`Invalid date value for key ${dateKey}:`, dateValue, e);
            return false;
        }
    });
};

const formatDate = (dateValue: string | Date) => {
    if (!dateValue) return 'N/A';
    const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
    try {
        return format(date, 'PPP');
    } catch {
        return 'Invalid Date';
    }
}


export function GlobalSummaryAdvanced() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState("sales");
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
    const [allSales, setAllSales] = useState([]);
    const [allPurchases, setAllPurchases] = useState([]);
    const [allCustomers, setAllCustomers] = useState([]);
    const [allSuppliers, setAllSuppliers] = useState([]);
    const [allWorkers, setAllWorkers] = useState([]);
    const [allTransactions, setAllTransactions] = useState([]);
    const [allInventory, setAllInventory] = useState([]);
    const [allExpenses, setAllExpenses] = useState([]);
    const [allExpenseCategories, setAllExpenseCategories] = useState([]);


    useEffect(() => {
        const fetchAll = async () => {
            setAllSales(await loadAllData("sales"));
            setAllPurchases(await loadAllData("purchases"));
            setAllCustomers(await loadAllData("customers"));
            setAllSuppliers(await loadAllData("suppliers"));
            setAllWorkers(await loadAllData("workers"));
            setAllInventory(await loadAllData("inventory"));
            
            const busCats = await loadAllData("business-expense-categories");
            const homeCats = await loadAllData("home-expense-categories");
            setAllExpenseCategories([...busCats, ...homeCats]);

            const expenses = await loadAllData("expenses");
            setAllExpenses(expenses);

            const salesTxs = (await loadAllData("sales")).map((p: any) => ({ ...p, type: 'Sale', date: p.invoiceDate }));
            const purchaseTxs = (await loadAllData("purchases")).map((p: any) => ({ ...p, type: 'Purchase', date: p.purchaseDate }));
            const expenseTxs = expenses.map((e: any) => ({ ...e, type: 'Expense' }));
            setAllTransactions([...salesTxs, ...purchaseTxs, ...expenseTxs]);
        }
        fetchAll();
    }, []);
    
    const getCategoryName = (categoryId: string) => {
        const category = allExpenseCategories.find((c: any) => c.id === categoryId);
        return category ? category.name : 'Uncategorized';
    }

    const filteredSales = useMemo(() => filterDataByDate(allSales, dateRange, 'invoiceDate'), [allSales, dateRange]);
    const filteredPurchases = useMemo(() => filterDataByDate(allPurchases, dateRange, 'purchaseDate'), [allPurchases, dateRange]);
    const filteredCustomers = useMemo(() => filterDataByDate(allCustomers, dateRange, 'createdAt'), [allCustomers, dateRange]); // Assuming createdAt exists
    const filteredSuppliers = useMemo(() => filterDataByDate(allSuppliers, dateRange, 'createdAt'), [allSuppliers, dateRange]); // Assuming createdAt exists
    const filteredWorkers = useMemo(() => filterDataByDate(allWorkers, dateRange, 'joiningDate'), [allWorkers, dateRange]);
    const filteredTransactions = useMemo(() => filterDataByDate(allTransactions, dateRange, 'date'), [allTransactions, dateRange]);
    const filteredExpenses = useMemo(() => filterDataByDate(allExpenses, dateRange, 'date'), [allExpenses, dateRange]);

    const setPresetRange = (preset: 'today' | 'week' | 'month') => {
        const now = new Date();
        if (preset === 'today') setDateRange({ from: now, to: now });
        if (preset === 'week') setDateRange({ from: startOfWeek(now), to: endOfWeek(now) });
        if (preset === 'month') setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('summary')}</CardTitle>
                <CardDescription>A complete overview of all data across all your profiles.</CardDescription>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-4">
                    <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setPresetRange('today')}>{t('today')}</Button>
                        <Button size="sm" variant="outline" onClick={() => setPresetRange('week')}>{t('thisWeek')}</Button>
                        <Button size="sm" variant="outline" onClick={() => setPresetRange('month')}>{t('thisMonth')}</Button>
                    </div>
                    <DateRangePicker date={dateRange} setDate={setDateRange} className="w-full sm:w-auto" />
                </div>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="h-auto flex-wrap justify-start">
                        <TabsTrigger value="sales">{t('sales')}</TabsTrigger>
                        <TabsTrigger value="purchases">{t('purchases')}</TabsTrigger>
                        <TabsTrigger value="expenses">{t('expenses')}</TabsTrigger>
                        <TabsTrigger value="inventory">{t('inventory')}</TabsTrigger>
                        <TabsTrigger value="customers">{t('customers')}</TabsTrigger>
                        <TabsTrigger value="suppliers">{t('suppliers')}</TabsTrigger>
                        <TabsTrigger value="workers">{t('workers')}</TabsTrigger>
                        <TabsTrigger value="transactions">{t('transactions')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="sales" className="mt-4">
                        <Table>
                            <TableHeader><TableRow><TableHead>{t('date')}</TableHead><TableHead>{t('invoiceNumber')}</TableHead><TableHead>{t('businessProfile')}</TableHead><TableHead>{t('customerName')}</TableHead><TableHead className="text-right">{t('amount')}</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredSales.map((s: any) => (<TableRow key={s.invoiceNumber}><TableCell>{formatDate(s.invoiceDate)}</TableCell><TableCell>{s.invoiceNumber}</TableCell><TableCell>{s.profileName}</TableCell><TableCell>{s.customerId}</TableCell><TableCell className="text-right">PKR {(s.grandTotal || 0).toFixed(2)}</TableCell></TableRow>))}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="purchases" className="mt-4">
                         <Table>
                            <TableHeader><TableRow><TableHead>{t('date')}</TableHead><TableHead>{t('billNumber')}</TableHead><TableHead>{t('businessProfile')}</TableHead><TableHead>{t('supplierName')}</TableHead><TableHead className="text-right">{t('amount')}</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredPurchases.map((p: any) => (<TableRow key={p.billNumber}><TableCell>{formatDate(p.purchaseDate)}</TableCell><TableCell>{p.billNumber}</TableCell><TableCell>{p.profileName}</TableCell><TableCell>{p.supplierId}</TableCell><TableCell className="text-right">PKR {(p.grandTotal || 0).toFixed(2)}</TableCell></TableRow>))}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="expenses" className="mt-4">
                         <Table>
                            <TableHeader><TableRow><TableHead>{t('date')}</TableHead><TableHead>{t('businessProfile')}</TableHead><TableHead>{t('categoryName')}</TableHead><TableHead>{t('notesOptional')}</TableHead><TableHead className="text-right">{t('amount')}</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredExpenses.map((e: any) => (<TableRow key={e.id}><TableCell>{formatDate(e.date)}</TableCell><TableCell>{e.profileName}</TableCell><TableCell>{getCategoryName(e.categoryId)}</TableCell><TableCell>{e.notes || 'N/A'}</TableCell><TableCell className="text-right text-destructive">PKR {(e.amount || 0).toFixed(2)}</TableCell></TableRow>))}
                            </TableBody>
                        </Table>
                    </TabsContent>
                     <TabsContent value="inventory" className="mt-4">
                         <Table>
                            <TableHeader><TableRow><TableHead>{t('itemName')}</TableHead><TableHead>{t('businessProfile')}</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">{t('stock')}</TableHead><TableHead className="text-right">{t('salePrice')}</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {allInventory.map((i: any) => (<TableRow key={i.id}><TableCell>{i.name}</TableCell><TableCell>{i.profileName}</TableCell><TableCell>{i.sku || 'N/A'}</TableCell><TableCell className="text-right">{i.stock} {i.unit}</TableCell><TableCell className="text-right">PKR {(i.price || 0).toFixed(2)}</TableCell></TableRow>))}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="customers" className="mt-4">
                         <Table>
                            <TableHeader><TableRow><TableHead>{t('customerName')}</TableHead><TableHead>{t('businessProfile')}</TableHead><TableHead>{t('contact')}</TableHead><TableHead className="text-right">{t('balance')}</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {allCustomers.map((c: any) => (<TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell>{c.profileName}</TableCell><TableCell>{c.contact}</TableCell><TableCell className={cn("text-right font-semibold", c.balance > 0 ? "text-destructive" : "")}>PKR {(c.balance || 0).toFixed(2)}</TableCell></TableRow>))}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="suppliers" className="mt-4">
                         <Table>
                            <TableHeader><TableRow><TableHead>{t('supplierName')}</TableHead><TableHead>{t('businessProfile')}</TableHead><TableHead>{t('contact')}</TableHead><TableHead className="text-right">{t('balance')}</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {allSuppliers.map((s: any) => (<TableRow key={s.id}><TableCell>{s.name}</TableCell><TableCell>{s.profileName}</TableCell><TableCell>{s.contact}</TableCell><TableCell className={cn("text-right font-semibold", s.balance > 0 ? "text-destructive" : "")}>PKR {(s.balance || 0).toFixed(2)}</TableCell></TableRow>))}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="workers" className="mt-4">
                         <Table>
                            <TableHeader><TableRow><TableHead>{t('workerName')}</TableHead><TableHead>{t('businessProfile')}</TableHead><TableHead>{t('contact')}</TableHead><TableHead>{t('role')}</TableHead><TableHead className="text-right">{t('balance')}</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {allWorkers.map((w: any) => (<TableRow key={w.id}><TableCell>{w.name}</TableCell><TableCell>{w.profileName}</TableCell><TableCell>{w.contact}</TableCell><TableCell>{w.role}</TableCell><TableCell className={cn("text-right font-semibold", w.balance > 0 ? "text-destructive" : "")}>PKR {(w.balance || 0).toFixed(2)}</TableCell></TableRow>))}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="transactions" className="mt-4">
                         <Table>
                            <TableHeader><TableRow><TableHead>{t('date')}</TableHead><TableHead>{t('type')}</TableHead><TableHead>{t('businessProfile')}</TableHead><TableHead>{t('details')}</TableHead><TableHead className="text-right">{t('amount')}</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredTransactions.map((t: any, i) => (<TableRow key={`${t.id}-${i}`}><TableCell>{formatDate(t.date)}</TableCell><TableCell><Badge variant="outline">{t.type}</Badge></TableCell><TableCell>{t.profileName}</TableCell><TableCell>{t.notes || t.invoiceNumber || t.billNumber || 'N/A'}</TableCell><TableCell className={cn("text-right font-semibold", t.type === 'Sale' ? 'text-green-600' : 'text-destructive')}>PKR {(t.grandTotal || t.amount || 0).toFixed(2)}</TableCell></TableRow>))}
                            </TableBody>
                        </Table>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
