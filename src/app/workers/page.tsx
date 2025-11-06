

"use client";

import { Header } from "@/components/dashboard/header";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { useLanguage } from "@/hooks/use-language";
import { Icons } from "@/components/icons";
import { AddWorkerForm } from "@/components/workers/add-worker-form";
import { EmployeeListTable } from "@/components/workers/employee-list-table";
import { SalaryRecords } from "@/components/workers/salary-records";
import { useState } from "react";
import { ManageWorkerRoles } from "@/components/workers/manage-worker-roles";
import { AttendanceList } from "@/components/workers/attendance-list";
import { SwipeableTabs, SwipeableTabsCarousel, SwipeableTabsContent, SwipeableTabsList, SwipeableTabsTrigger } from "@/components/ui/swipeable-tabs";

const TABS = [
    { value: "employee-list", icon: Icons.users, label: "employeeList" },
    { value: "add-worker", icon: Icons.UserPlus, label: "addWorker" },
    { value: "salary-records", icon: Icons.dollarSign, label: "salaryRecords" },
    { value: "attendance", icon: Icons.check, label: "Attendance" },
    { value: "manage-roles", icon: Icons.tag, label: "Manage Roles" },
];


export default function WorkersPage() {
    const { t, dir } = useLanguage();
    const [activeTab, setActiveTab] = useState("employee-list");

    const onFinish = () => {
      setActiveTab('employee-list');
    }

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
                                    {tab.label === 'Attendance' || tab.label === 'Manage Roles' ? tab.label : t(tab.label as keyof any)}
                                </SwipeableTabsTrigger>
                            ))}
                        </SwipeableTabsList>
                        <SwipeableTabsCarousel value={activeTab} onValueChange={setActiveTab}>
                            <SwipeableTabsContent value="employee-list">
                               <EmployeeListTable />
                            </SwipeableTabsContent>
                            <SwipeableTabsContent value="add-worker">
                               <AddWorkerForm onFinish={() => setActiveTab('employee-list')} />
                            </SwipeableTabsContent>
                            <SwipeableTabsContent value="salary-records">
                                <SalaryRecords />
                            </SwipeableTabsContent>
                             <SwipeableTabsContent value="attendance">
                                <AttendanceList />
                            </SwipeableTabsContent>
                             <SwipeableTabsContent value="manage-roles">
                                <ManageWorkerRoles />
                            </SwipeableTabsContent>
                        </SwipeableTabsCarousel>
                    </SwipeableTabs>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
