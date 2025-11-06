"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { useLanguage } from "@/hooks/use-language";
import { Icons } from "@/components/icons";
import { NewPurchaseForm } from "@/components/purchases/new-purchase-form";
import { AllPurchasesTable } from "@/components/purchases/all-purchases-table";
import { PaymentsMadeTable } from "@/components/purchases/payments-made-table";
import { SwipeableTabs, SwipeableTabsCarousel, SwipeableTabsContent, SwipeableTabsList, SwipeableTabsTrigger } from "@/components/ui/swipeable-tabs";

const TABS = [
    { value: "new-purchase", icon: Icons.newPurchase, label: "newPurchase" },
    { value: "all-purchases", icon: Icons.allPurchases, label: "allPurchases" },
    { value: "payments-made", icon: Icons.paymentsMade, label: "paymentsMade" },
];

export default function PurchasesPage() {
    const { t, dir } = useLanguage();
    const [activeTab, setActiveTab] = useState("new-purchase");

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
                            <SwipeableTabsContent value="new-purchase">
                               <NewPurchaseForm onFinish={() => setActiveTab('all-purchases')} />
                            </SwipeableTabsContent>
                            <SwipeableTabsContent value="all-purchases">
                               <AllPurchasesTable />
                            </SwipeableTabsContent>
                            <SwipeableTabsContent value="payments-made">
                                <PaymentsMadeTable />
                            </SwipeableTabsContent>
                        </SwipeableTabsCarousel>
                    </SwipeableTabs>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
