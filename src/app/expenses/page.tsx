
"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { useLanguage } from "@/hooks/use-language";
import { Icons } from "@/components/icons";
import { AddExpenseForm } from "@/components/expenses/add-expense-form";
import { ExpenseCategoriesTable } from "@/components/expenses/expense-categories-table";
import { ExpenseSummary } from "@/components/expenses/expense-summary";
import { SwipeableTabs, SwipeableTabsCarousel, SwipeableTabsContent, SwipeableTabsList, SwipeableTabsTrigger } from "@/components/ui/swipeable-tabs";

const TABS = [
    { value: "add-expense", icon: Icons.addExpense, label: "addExpense" },
    { value: "expense-summary", icon: Icons.expenseSummary, label: "expenseSummary" },
    { value: "expense-categories", icon: Icons.expenseCategories, label: "expenseCategories" },
];

export default function ExpensesPage() {
    const { t, dir } = useLanguage();
    const [activeTab, setActiveTab] = useState("add-expense");

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon" side={dir === 'rtl' ? 'right' : 'left'} className="group-data-[variant=floating]:bg-card group-data-[variant=sidebar]:bg-card">
                <SidebarNav />
            </Sidebar>
            <SidebarInset>
                <Header />
                <main className="p-4 sm:p-6">
                     <SwipeableTabs value={activeTab} onValueChange={setActiveTab}>
                        <SwipeableTabsList>
                             {TABS.map((tab) => (
                                <SwipeableTabsTrigger key={tab.value} value={tab.value}>
                                    <tab.icon className="mr-2" />
                                    {t(tab.label as keyof any)}
                                </SwipeableTabsTrigger>
                            ))}
                        </SwipeableTabsList>
                         <SwipeableTabsCarousel value={activeTab} onValueChange={setActiveTab}>
                            <SwipeableTabsContent value="add-expense">
                               <AddExpenseForm />
                            </SwipeableTabsContent>
                            <SwipeableTabsContent value="expense-summary">
                                <ExpenseSummary />
                            </SwipeableTabsContent>
                            <SwipeableTabsContent value="expense-categories">
                               <ExpenseCategoriesTable />
                            </SwipeableTabsContent>
                        </SwipeableTabsCarousel>
                    </SwipeableTabs>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
