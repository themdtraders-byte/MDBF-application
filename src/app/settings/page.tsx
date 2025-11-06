
"use client";

import { Header } from "@/components/dashboard/header";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { useLanguage } from "@/hooks/use-language";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/icons";
import { GeneralSettings } from "@/components/settings/general-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { NotificationsSettings } from "@/components/settings/notifications-settings";
import { SecuritySettings } from "@/components/settings/security-settings";
import { BusinessProfileSettings } from "@/components/settings/business-profile-settings";
import { AboutAppSettings } from "@/components/settings/about-app";
import { AuditorSettings } from "@/components/settings/auditor-settings";

export default function SettingsPage() {
    const { t, dir } = useLanguage();

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon" side={dir === 'rtl' ? 'right' : 'left'} className="group-data-[variant=floating]:bg-card group-data-[variant=sidebar]:bg-card">
                <SidebarNav />
            </Sidebar>
            <SidebarInset>
                <Header />
                <main className="p-4 sm:p-6 lg:p-8">
                    <Tabs defaultValue="general" className="flex flex-col md:flex-row gap-6">
                        <TabsList className="h-auto flex-col justify-start items-stretch bg-muted p-2 rounded-lg md:w-1/4 lg:w-1/5">
                            <TabsTrigger value="general" className="justify-start gap-2">
                                <Icons.settings />
                                {t('generalSettings')}
                            </TabsTrigger>
                            <TabsTrigger value="appearance" className="justify-start gap-2">
                                <Icons.palette />
                                {t('appearanceAndLanguage')}
                            </TabsTrigger>
                             <TabsTrigger value="notifications" className="justify-start gap-2">
                                <Icons.bell />
                                {t('notifications')}
                            </TabsTrigger>
                            <TabsTrigger value="security" className="justify-start gap-2">
                                <Icons.shield />
                                {t('security')}
                            </TabsTrigger>
                             <TabsTrigger value="auditor" className="justify-start gap-2">
                                <Icons.check className="mr-2" />
                                Auditor
                            </TabsTrigger>
                            <TabsTrigger value="profile" className="justify-start gap-2">
                                <Icons.businessInfo />
                                {t('businessProfile')}
                            </TabsTrigger>
                             <TabsTrigger value="about" className="justify-start gap-2">
                                <Icons.info />
                                {t('aboutApp')}
                            </TabsTrigger>
                        </TabsList>
                        <div className="flex-1">
                            <TabsContent value="general"><GeneralSettings /></TabsContent>
                            <TabsContent value="appearance"><AppearanceSettings /></TabsContent>
                            <TabsContent value="notifications"><NotificationsSettings /></TabsContent>
                            <TabsContent value="security"><SecuritySettings /></TabsContent>
                             <TabsContent value="auditor"><AuditorSettings /></TabsContent>
                            <TabsContent value="profile"><BusinessProfileSettings /></TabsContent>
                            <TabsContent value="about"><AboutAppSettings /></TabsContent>
                        </div>
                    </Tabs>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
