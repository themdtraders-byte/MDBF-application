
"use client";

import { Header } from "@/components/dashboard/header";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { useLanguage } from "@/hooks/use-language";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/icons";
import { AllAccounts } from "@/components/accounts/all-accounts";
import { AddAccountForm } from "@/components/accounts/add-account-form";
import { TransactionHistory } from "@/components/accounts/transaction-history";
import { NewTransferForm } from "@/components/transfers/new-transfer-form";
import { ReceivePaymentForm } from "@/components/payments/receive-payment-form";
import { SendPaymentForm } from "@/components/payments/send-payment-form";

export default function AccountsPage() {
    const { t, dir } = useLanguage();

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon" side={dir === 'rtl' ? 'right' : 'left'} className="group-data-[variant=floating]:bg-card group-data-[variant=sidebar]:bg-card">
                <SidebarNav />
            </Sidebar>
            <SidebarInset>
                <Header />
                <main className="p-4 sm:p-6">
                     <Tabs defaultValue="all-accounts">
                        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-flex">
                            <TabsTrigger value="all-accounts">
                                <Icons.Wallet className="mr-2" />
                                {t('allAccounts')}
                            </TabsTrigger>
                            <TabsTrigger value="add-account">
                                <Icons.Plus className="mr-2" />
                                {t('addAccount')}
                            </TabsTrigger>
                            <TabsTrigger value="new-transaction">
                                <Icons.transfers className="mr-2" />
                                {t('transactions')}
                            </TabsTrigger>
                            <TabsTrigger value="history">
                                <Icons.History className="mr-2" />
                                {t('transactionHistory')}
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="all-accounts">
                           <AllAccounts />
                        </TabsContent>
                        <TabsContent value="add-account">
                           <AddAccountForm />
                        </TabsContent>
                        <TabsContent value="new-transaction">
                            <Tabs defaultValue="internal-transfer" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="internal-transfer">Internal Transfer</TabsTrigger>
                                    <TabsTrigger value="receive-payment">Receive Payment</TabsTrigger>
                                    <TabsTrigger value="send-payment">Send Payment</TabsTrigger>
                                </TabsList>
                                <TabsContent value="internal-transfer" className="pt-6">
                                    <NewTransferForm />
                                </TabsContent>
                                <TabsContent value="receive-payment" className="pt-6">
                                    <ReceivePaymentForm />
                                </TabsContent>
                                <TabsContent value="send-payment" className="pt-6">
                                    <SendPaymentForm />
                                </TabsContent>
                            </Tabs>
                        </TabsContent>
                        <TabsContent value="history">
                           <TransactionHistory />
                        </TabsContent>
                    </Tabs>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
