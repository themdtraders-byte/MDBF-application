

"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Header } from "@/components/dashboard/header";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { useLanguage } from "@/hooks/use-language";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/icons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { dbLoad, dbSave, dbClearAndSave } from "@/lib/db";
import { useAccessControl } from "@/hooks/use-access-control";

type DeletedItem = {
    id: string;
    type: string;
    deletedAt: string;
    data: any;
};

export default function TrashPage() {
    const { t, dir } = useLanguage();
    const { toast } = useToast();
    const { isReadOnly } = useAccessControl();
    const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
    const [activeTab, setActiveTab] = useState('customers');

    const fetchDeletedItems = useCallback(async () => {
        const items = await dbLoad('trash');
        setDeletedItems(items);
    }, []);

    useEffect(() => {
        fetchDeletedItems();
    }, [fetchDeletedItems]);

    const handleRestore = async (itemToRestore: DeletedItem) => {
        // The original key is stored inside the 'data' payload
        const originalDataKey = itemToRestore.data.originalKey;

        if (!originalDataKey) {
            toast({
                variant: "destructive",
                title: "Restore Failed",
                description: `Could not determine the original location for this item.`,
            });
            return;
        }
        
        // 1. Add item back to its original list
        const originalList = await dbLoad(originalDataKey);
        
        // remove the temporary key before restoring
        const { originalKey, ...restoredData } = itemToRestore.data;
        originalList.push(restoredData);
        await dbSave(originalDataKey, originalList);

        // 2. Remove item from trash
        const currentTrash = await dbLoad('trash');
        const updatedTrash = currentTrash.filter(item => item.id !== itemToRestore.id);
        await dbClearAndSave('trash', updatedTrash);
        
        setDeletedItems(updatedTrash);

        toast({
            title: "Item Restored",
            description: `The ${itemToRestore.type} has been restored.`,
        });
    };

    const handlePermanentDelete = async (itemToDelete: DeletedItem) => {
        const currentTrash = await dbLoad('trash');
        const updatedTrash = currentTrash.filter(item => item.id !== itemToDelete.id);
        await dbClearAndSave('trash', updatedTrash);
        
        setDeletedItems(updatedTrash);

        toast({
            variant: "destructive",
            title: "Item Permanently Deleted",
            description: `The ${itemToDelete.type} has been permanently removed.`,
        });
    };

    const renderTableForType = (type: string) => {
        const items = deletedItems.filter(item => item.type === type);

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name / ID</TableHead>
                        <TableHead>Deleted On</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{item.data.name || item.data.invoiceNumber || item.data.billNumber || item.data.batchCode || item.id}</TableCell>
                            <TableCell>{format(new Date(item.deletedAt), "PPP p")}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleRestore(item)} disabled={isReadOnly}>
                                    <Icons.restore className="mr-2 h-4 w-4" />
                                    Restore
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handlePermanentDelete(item)} disabled={isReadOnly}>
                                    <Icons.trash className="mr-2 h-4 w-4" />
                                    Delete Permanently
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {items.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                No deleted {type} found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        );
    };

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon" side={dir === 'rtl' ? 'right' : 'left'} className="group-data-[variant=floating]:bg-card group-data-[variant=sidebar]:bg-card">
                <SidebarNav />
            </Sidebar>
            <SidebarInset>
                <Header />
                <main className="p-4 sm:p-6 lg:p-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('trash')}</CardTitle>
                            <CardDescription>
                                Items you have deleted will appear here. They are automatically removed after 7 days.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="h-auto flex-wrap justify-start">
                                    <TabsTrigger value="customers">{t('customers')}</TabsTrigger>
                                    <TabsTrigger value="suppliers">{t('suppliers')}</TabsTrigger>
                                    <TabsTrigger value="inventory">{t('inventory')}</TabsTrigger>
                                    <TabsTrigger value="workers">{t('workers')}</TabsTrigger>
                                    <TabsTrigger value="sales">{t('sales')}</TabsTrigger>
                                    <TabsTrigger value="purchases">{t('purchases')}</TabsTrigger>
                                    <TabsTrigger value="production">Production</TabsTrigger>
                                    <TabsTrigger value="customer-types">Customer Types</TabsTrigger>
                                    <TabsTrigger value="supplier-types">Supplier Types</TabsTrigger>
                                     <TabsTrigger value="profiles">Profiles</TabsTrigger>
                                </TabsList>
                                <TabsContent value="customers">{renderTableForType('Customer')}</TabsContent>
                                <TabsContent value="suppliers">{renderTableForType('Supplier')}</TabsContent>
                                <TabsContent value="inventory">{renderTableForType('Inventory')}</TabsContent>
                                <TabsContent value="workers">{renderTableForType('Worker')}</TabsContent>
                                <TabsContent value="sales">{renderTableForType('Sale')}</TabsContent>
                                <TabsContent value="purchases">{renderTableForType('Purchase')}</TabsContent>
                                <TabsContent value="production">{renderTableForType('Production')}</TabsContent>
                                <TabsContent value="customer-types">{renderTableForType('Customer Type')}</TabsContent>
                                <TabsContent value="supplier-types">{renderTableForType('Supplier Type')}</TabsContent>
                                 <TabsContent value="profiles">{renderTableForType('Profile')}</TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
