
"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { NewProductionForm } from "@/components/production/new-production-form";
import { useLanguage } from "@/hooks/use-language";
import { SwipeableTabs, SwipeableTabsCarousel, SwipeableTabsContent, SwipeableTabsList, SwipeableTabsTrigger } from "@/components/ui/swipeable-tabs";
import { Icons } from "@/components/icons";
import { ProductionHistoryTable } from "@/components/production/production-history-table";

const TABS = [
    { value: "new-production", icon: Icons.plus, label: "New Production" },
    { value: "production-history", icon: Icons.History, label: "Production History" },
];

export default function ProductionPage() {
    const { dir, t } = useLanguage();
    const [activeTab, setActiveTab] = useState("new-production");

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon" side={dir === 'rtl' ? 'right' : 'left'} className="group-data-[variant=floating]:bg-card group-data-[variant=sidebar]:bg-card">
                <SidebarNav />
            </Sidebar>
            <SidebarInset>
                <Header />
                <main className="p-4 sm:p-6 lg:p-8">
                     <SwipeableTabs value={activeTab} onValueChange={setActiveTab}>
                        <SwipeableTabsList>
                             {TABS.map((tab) => (
                                <SwipeableTabsTrigger key={tab.value} value={tab.value}>
                                    <tab.icon className="mr-2" />
                                    {tab.label}
                                </SwipeableTabsTrigger>
                            ))}
                        </SwipeableTabsList>
                        <SwipeableTabsCarousel value={activeTab} onValueChange={setActiveTab}>
                            <SwipeableTabsContent value="new-production">
                               <NewProductionForm onFinish={() => setActiveTab('production-history')} />
                            </SwipeableTabsContent>
                            <SwipeableTabsContent value="production-history">
                               <ProductionHistoryTable />
                            </SwipeableTabsContent>
                        </SwipeableTabsCarousel>
                    </SwipeableTabs>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
