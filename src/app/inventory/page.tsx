
"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { useLanguage } from "@/hooks/use-language";
import { Icons } from "@/components/icons";
import { AddItemForm } from "@/components/inventory/add-item-form";
import { AllItemsTable } from "@/components/inventory/all-items-table";
import { LowStockAlertsTable } from "@/components/inventory/low-stock-alerts-table";
import { StockAdjustments } from "@/components/inventory/stock-adjustments";
import { SwipeableTabs, SwipeableTabsCarousel, SwipeableTabsContent, SwipeableTabsList, SwipeableTabsTrigger } from "@/components/ui/swipeable-tabs";
import { StockAdjustmentsHistory } from "@/components/inventory/stock-adjustments-history";

const TABS = [
    { value: "all-items", icon: Icons.allItems, label: "allItems" },
    { value: "add-item", icon: Icons.addItem, label: "addItem" },
    { value: "low-stock-alerts", icon: Icons.lowStockAlerts, label: "lowStockAlerts" },
    { value: "stock-adjustments", icon: Icons.stockAdjustments, label: "stockAdjustments" },
    { value: "adjustment-history", icon: Icons.History, label: "Stock Ledger" },
];

export default function InventoryPage() {
    const { t, dir } = useLanguage();
    const [activeTab, setActiveTab] = useState("all-items");

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
                                    {tab.label === "Stock Ledger" ? tab.label : t(tab.label as keyof any)}
                                </SwipeableTabsTrigger>
                            ))}
                        </SwipeableTabsList>
                        <SwipeableTabsCarousel value={activeTab} onValueChange={setActiveTab}>
                            <SwipeableTabsContent value="all-items">
                               <AllItemsTable />
                            </SwipeableTabsContent>
                            <SwipeableTabsContent value="add-item">
                               <AddItemForm onFinish={() => setActiveTab('all-items')} />
                            </SwipeableTabsContent>
                            <SwipeableTabsContent value="low-stock-alerts">
                                <LowStockAlertsTable />
                            </SwipeableTabsContent>
                             <SwipeableTabsContent value="stock-adjustments">
                                <StockAdjustments />
                            </SwipeableTabsContent>
                             <SwipeableTabsContent value="adjustment-history">
                                <StockAdjustmentsHistory />
                            </SwipeableTabsContent>
                        </SwipeableTabsCarousel>
                    </SwipeableTabs>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
