
"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { useLanguage } from "@/hooks/use-language";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/icons";
import { ProfitAndLossReport } from "@/components/reports/profit-loss-report";
import { SalesReports } from "@/components/reports/sales-reports";
import { PurchaseReports } from "@/components/reports/purchase-reports";
import { StockReports } from "@/components/reports/stock-reports";
import { ExpenseReports } from "@/components/reports/expense-reports";
import { CustomerReports } from "@/components/reports/customer-reports";
import { SupplierReports } from "@/components/reports/supplier-reports";
import { WorkerReports } from "@/components/reports/worker-reports";
import { DailySummaryReport } from "@/components/reports/daily-summary-report";
import { HomeIncomeReport } from "@/components/reports/home-income-report";
import { HomeExpenseReport } from "@/components/reports/home-expense-report";
import { HomeSummaryReport } from "@/components/reports/home-summary-report";
import { ProfitSplitter } from "@/components/reports/profit-splitter";

export default function ReportsPage() {
    const { t, dir } = useLanguage();
    const [activeAccount, setActiveAccount] = useState<any>(null);
    const [loading, setLoading] = useState(true);

     useEffect(() => {
        const account = localStorage.getItem('dukaanxp-active-account');
        if (account) {
            setActiveAccount(JSON.parse(account));
        }
        setLoading(false);
    }, []);

    if (loading) {
        return (
             <div className="flex h-screen items-center justify-center">
                <div className="text-xl">Loading...</div>
            </div>
        )
    }

    if (activeAccount?.type === 'Home') {
        return (
            <SidebarProvider>
                <Sidebar collapsible="icon" side={dir === 'rtl' ? 'right' : 'left'} className="group-data-[variant=floating]:bg-card group-data-[variant=sidebar]:bg-card">
                    <SidebarNav />
                </Sidebar>
                <SidebarInset>
                    <Header />
                    <main className="p-4 sm:p-6 lg:p-8">
                        <Tabs defaultValue="summary" className="flex flex-col md:flex-row gap-6">
                            <TabsList className="h-auto flex-col justify-start items-stretch bg-muted p-2 rounded-lg md:w-1/4 lg:w-1/5">
                                <TabsTrigger value="summary" className="justify-start gap-2">
                                    <Icons.reports />
                                    {t('dailySummary')}
                                </TabsTrigger>
                                <TabsTrigger value="income" className="justify-start gap-2">
                                    <Icons.sales />
                                    Income Report
                                </TabsTrigger>
                                <TabsTrigger value="expenses" className="justify-start gap-2">
                                    <Icons.expenses />
                                    Expense Report
                                </TabsTrigger>
                            </TabsList>
                            <div className="flex-1">
                                <TabsContent value="summary"><HomeSummaryReport /></TabsContent>
                                <TabsContent value="income"><HomeIncomeReport /></TabsContent>
                                <TabsContent value="expenses"><HomeExpenseReport /></TabsContent>
                            </div>
                        </Tabs>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        )
    }

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon" side={dir === 'rtl' ? 'right' : 'left'} className="group-data-[variant=floating]:bg-card group-data-[variant=sidebar]:bg-card">
                <SidebarNav />
            </Sidebar>
            <SidebarInset>
                <Header />
                <main className="p-4 sm:p-6 lg:p-8">
                    <Tabs defaultValue="profit-loss" className="flex flex-col md:flex-row gap-6">
                        <TabsList className="h-auto flex-col justify-start items-stretch bg-muted p-2 rounded-lg md:w-1/4 lg:w-1/5">
                            <TabsTrigger value="profit-loss" className="justify-start gap-2">
                                <Icons.profitAndLoss />
                                {t('profitAndLoss')}
                            </TabsTrigger>
                            <TabsTrigger value="profit-splitter" className="justify-start gap-2">
                                <Icons.pieChart />
                                Profit Splitter
                            </TabsTrigger>
                            <TabsTrigger value="sales" className="justify-start gap-2">
                                <Icons.salesReport />
                                {t('salesReport')}
                            </TabsTrigger>
                             <TabsTrigger value="purchases" className="justify-start gap-2">
                                <Icons.allPurchases />
                                {t('purchaseReports')}
                            </TabsTrigger>
                            <TabsTrigger value="stock" className="justify-start gap-2">
                                <Icons.stockReport />
                                {t('stockReport')}
                            </TabsTrigger>
                            <TabsTrigger value="expenses" className="justify-start gap-2">
                                <Icons.expenseReport />
                                {t('expenseReports')}
                            </TabsTrigger>
                            <TabsTrigger value="customers" className="justify-start gap-2">
                                <Icons.customerSupplierLedger />
                                {t('customerReports')}
                            </TabsTrigger>
                             <TabsTrigger value="suppliers" className="justify-start gap-2">
                                <Icons.suppliers />
                                {t('supplierReports')}
                            </TabsTrigger>
                             <TabsTrigger value="workers" className="justify-start gap-2">
                                <Icons.workers />
                                {t('workerReports')}
                            </TabsTrigger>
                              <TabsTrigger value="daily-summary" className="justify-start gap-2">
                                <Icons.calendar />
                                {t('dailySummary')}
                            </TabsTrigger>
                        </TabsList>
                        <div className="flex-1">
                            <TabsContent value="profit-loss"><ProfitAndLossReport /></TabsContent>
                            <TabsContent value="profit-splitter"><ProfitSplitter /></TabsContent>
                            <TabsContent value="sales"><SalesReports /></TabsContent>
                            <TabsContent value="purchases"><PurchaseReports /></TabsContent>
                            <TabsContent value="stock"><StockReports /></TabsContent>
                            <TabsContent value="expenses"><ExpenseReports /></TabsContent>
                            <TabsContent value="customers"><CustomerReports /></TabsContent>
                            <TabsContent value="suppliers"><SupplierReports /></TabsContent>
                            <TabsContent value="workers"><WorkerReports /></TabsContent>
                            <TabsContent value="daily-summary"><DailySummaryReport /></TabsContent>
                        </div>
                    </Tabs>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
