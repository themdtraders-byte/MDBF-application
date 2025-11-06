"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { useLanguage } from "@/hooks/use-language";
import { Icons } from "@/components/icons";
import { AddCustomerForm } from "@/components/customers/add-customer-form";
import { CustomerListTable } from "@/components/customers/customer-list-table";
import { OutstandingPaymentsTable } from "@/components/customers/outstanding-payments-table";
import { ManageCustomerTypes } from "@/components/customers/manage-customer-types";
import { SwipeableTabs, SwipeableTabsCarousel, SwipeableTabsContent, SwipeableTabsList, SwipeableTabsTrigger } from "@/components/ui/swipeable-tabs";

const TABS = [
    { value: "customer-list", icon: Icons.customerList, label: "customerList" },
    { value: "add-customer", icon: Icons.addCustomer, label: "addCustomer" },
    { value: "outstanding-payments", icon: Icons.outstandingPayments, label: "outstandingPayments" },
    { value: "manage-types", icon: Icons.tag, label: "manageTypes" },
];

export default function CustomersPage() {
    const { t, dir } = useLanguage();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("customer-list");

    const handleFinish = () => {
        setActiveTab('customer-list');
        router.replace('/customers', { scroll: false });
    }

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
                            <SwipeableTabsContent value="customer-list">
                               <CustomerListTable />
                            </SwipeableTabsContent>
                            <SwipeableTabsContent value="add-customer">
                               <AddCustomerForm onFinish={handleFinish} />
                            </SwipeableTabsContent>
                            <SwipeableTabsContent value="outstanding-payments">
                                <OutstandingPaymentsTable />
                            </SwipeableTabsContent>
                            <SwipeableTabsContent value="manage-types">
                                <ManageCustomerTypes />
                            </SwipeableTabsContent>
                        </SwipeableTabsCarousel>
                    </SwipeableTabs>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
