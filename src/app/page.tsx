
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dbLoad } from '@/lib/db';
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { Header } from "@/components/dashboard/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ReportsTable } from "@/components/dashboard/reports-table";
import { AlertsCard } from "@/components/dashboard/alerts-card";
import { SalesChart } from '@/components/dashboard/sales-chart';
import { HomeStatsCards } from '@/components/home/home-stats-cards';
import { HomeIncomeExpenseChart } from '@/components/home/home-income-expense-chart';
import { HomeExpensePieChart } from '@/components/home/home-expense-pie-chart';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AllSalesTable } from '@/components/sales/all-sales-table';
import { ExpenseSummary } from '@/components/expenses/expense-summary';
import { AllAccounts } from '@/components/accounts/all-accounts';
import { ProfitAndLossReport } from '@/components/reports/profit-loss-report';
import { useLanguage } from '@/hooks/use-language';
import { SalaryRecords } from '@/components/workers/salary-records';

export default function DashboardPage() {
  const router = useRouter();
  const { dir } = useLanguage();
  const [activeAccount, setActiveAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSalesOpen, setIsSalesOpen] = useState(false);
  const [isExpensesOpen, setIsExpensesOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isWorkersOpen, setIsWorkersOpen] = useState(false);


  useEffect(() => {
    const initialize = async () => {
      const profiles = await dbLoad('profiles');
      const globalProfile = profiles.find(p => p.id === 'global-profile');

      if (!globalProfile) {
        router.replace('/global-profile');
        return;
      }

      const account = localStorage.getItem('dukaanxp-active-account');
      if (!account) {
        router.replace('/select-account');
      } else {
        setActiveAccount(JSON.parse(account));
        setLoading(false);
      }
    };
    initialize();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-secondary">
        <div className="text-xl text-foreground">Loading...</div>
      </div>
    );
  }
  
  if (activeAccount?.type === 'Home') {
     return (
        <SidebarProvider>
            <Sidebar collapsible="icon" side={dir === 'rtl' ? 'right' : 'left'} className="group-data-[variant=floating]:bg-card group-data-[variant=sidebar]:bg-sidebar">
                <SidebarNav />
            </Sidebar>
            <SidebarInset>
                <Header />
                <main className="p-4 sm:p-6 lg:p-8 space-y-6">
                    <HomeStatsCards />
                     <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-3">
                            <HomeIncomeExpenseChart />
                        </div>
                        <div className="lg:col-span-2">
                           <HomeExpensePieChart />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Button size="lg" variant="outline"><Icons.plus className="mr-2" /> Add Income</Button>
                        <Button size="lg" variant="outline"><Icons.plus className="mr-2" /> Add Expense</Button>
                        <Button size="lg" variant="outline"><Icons.transfers className="mr-2" /> Transfer Money</Button>
                        <Button size="lg" variant="outline"><Icons.reports className="mr-2" /> View Reports</Button>
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
     )
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" side={dir === 'rtl' ? 'right' : 'left'} className="group-data-[variant=floating]:bg-card group-data-[variant=sidebar]:bg-sidebar">
        <SidebarNav />
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="p-4 sm:p-6 lg:p-8 space-y-6">
          <StatsCards 
            onSalesClick={() => setIsSalesOpen(true)}
            onExpensesClick={() => setIsExpensesOpen(true)}
            onProfitClick={() => setIsReportsOpen(true)}
            onCashClick={() => setIsAccountsOpen(true)}
            onWorkersClick={() => setIsWorkersOpen(true)}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2">
               <SalesChart />
             </div>
             <div className="lg:col-span-1">
               <AlertsCard />
             </div>
          </div>
          <ReportsTable />
        </main>
      </SidebarInset>
      
      <Dialog open={isSalesOpen} onOpenChange={setIsSalesOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[90vw]">
          <DialogHeader><DialogTitle>All Sales</DialogTitle></DialogHeader>
          <AllSalesTable />
        </DialogContent>
      </Dialog>

      <Dialog open={isExpensesOpen} onOpenChange={setIsExpensesOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[90vw]">
           <DialogHeader><DialogTitle>Expense Summary</DialogTitle></DialogHeader>
          <ExpenseSummary />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isReportsOpen} onOpenChange={setIsReportsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[90vw]">
           <DialogHeader><DialogTitle>Profit & Loss Report</DialogTitle></DialogHeader>
          <ProfitAndLossReport />
        </DialogContent>
      </Dialog>

      <Dialog open={isAccountsOpen} onOpenChange={setIsAccountsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[90vw]">
           <DialogHeader><DialogTitle>All Accounts</DialogTitle></DialogHeader>
          <AllAccounts />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isWorkersOpen} onOpenChange={setIsWorkersOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[90vw]">
           <DialogHeader><DialogTitle>Salary Records</DialogTitle></DialogHeader>
          <SalaryRecords />
        </DialogContent>
      </Dialog>

    </SidebarProvider>
  );
}
