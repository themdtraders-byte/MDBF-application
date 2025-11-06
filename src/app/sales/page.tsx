"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { useLanguage } from "@/hooks/use-language";
import { NewSaleForm } from "@/components/sales/new-sale-form";
import { AllSalesTable } from "@/components/sales/all-sales-table";
import { PaymentsReceivedTable } from "@/components/sales/payments-received-table";
import { Icons } from "@/components/icons";
import { SwipeableTabs, SwipeableTabsCarousel, SwipeableTabsContent, SwipeableTabsList, SwipeableTabsTrigger } from "@/components/ui/swipeable-tabs";

const TABS = [
    { value: "new-sale", icon: Icons.newSale, label: "newSale" },
    { value: "all-sales", icon: Icons.allSales, label: "allSales" },
    { value: "payments-received", icon: Icons.paymentsReceived, label: "paymentsReceived" },
];

export default function SalesPage() {
    const { t, dir } = useLanguage();
    const [activeTab, setActiveTab] = useState("new-sale");

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
                            <SwipeableTabsContent value="new-sale">
                                <NewSaleForm onFinish={() => setActiveTab('all-sales')} />
                            </SwipeableTabsContent>
                            <SwipeableTabsContent value="all-sales">
                                <AllSalesTable />
                            </SwipeableTabsContent>
                            <SwipeableTabsContent value="payments-received">
                                <PaymentsReceivedTable />
                            </SwipeableTabsContent>
                        </SwipeableTabsCarousel>
                    </SwipeableTabs>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
