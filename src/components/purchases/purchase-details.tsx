
"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { dbLoad } from "@/lib/db";
import { Invoice } from "../ui/invoice";
import { useLanguage } from "@/hooks/use-language";
import { DateRangePicker } from "../ui/date-range-picker";
import { DateRange } from "react-day-picker";

type Supplier = { id: string; name: string, address?: string, contact?: string };
type Item = { id: string; name: string };
type BusinessProfile = { businessName: string, address: string, phone: string, [key: string]: any; };

type PurchaseItem = {
    itemId: string;
    quantity: number;
    unitPrice: number;
    total: number;
    unit?: string;
};

type Purchase = {
    billNumber: string;
    purchaseDate: string;
    supplierId: string;
    grandTotal: number;
    amountPaid: number;
    remainingBalance: number;
    items: PurchaseItem[];
    subtotal: number;
    totalDiscount: number;
    totalAdjustment: number;
    attachments?: string[];
    notes?: string;
};

interface PurchaseDetailsProps {
    purchase: Purchase;
}

export function PurchaseDetails({ purchase }: PurchaseDetailsProps) {
    const { t } = useLanguage();
    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [inventory, setInventory] = useState<Item[]>([]);
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const suppliers = await dbLoad("suppliers");
            setSupplier(suppliers.find(s => s.id === purchase.supplierId) || null);
            
            const items = await dbLoad("inventory");
            setInventory(items);

            const profileInfo = localStorage.getItem('dukaanxp-active-account');
            if(profileInfo) {
                const profiles = await dbLoad("profiles");
                const activeProfile = profiles.find(p => p.id === JSON.parse(profileInfo).id);
                setBusinessProfile(activeProfile || null);
            }
        }
        fetchData();
    }, [purchase.supplierId]);

    const getItemName = (itemId: string) => {
        return inventory.find(i => i.id === itemId)?.name || 'Unknown Item';
    }
    
    const tableHeaders = [t('item'), t('quantity'), t('price'), t('total')];
    const tableRows = purchase.items.map(item => [
        getItemName(item.itemId),
        `${item.quantity} ${item.unit || ''}`,
        `PKR ${item.unitPrice.toFixed(2)}`,
        `PKR ${item.total.toFixed(2)}`
    ]);

    const summaryDetails = [
        { label: "subtotal:", value: `PKR ${purchase.subtotal.toFixed(2)}` },
        ...(purchase.totalDiscount > 0 ? [{ label: "discount:", value: `PKR ${purchase.totalDiscount.toFixed(2)}`, className: "text-destructive" }] : []),
        ...(purchase.totalAdjustment > 0 ? [{ label: "adjustment:", value: `PKR ${purchase.totalAdjustment.toFixed(2)}`, className: "text-green-600" }] : []),
        { label: "grandTotal:", value: `PKR ${purchase.grandTotal.toFixed(2)}`, isGrand: true },
        { label: "amountPaid:", value: `PKR ${purchase.amountPaid.toFixed(2)}` },
        { label: "balanceDue:", value: `PKR ${purchase.remainingBalance.toFixed(2)}`, isBalance: true, className: "text-destructive" },
    ];

    return (
       <div>
            <Invoice
                title="purchaseBill"
                businessProfile={businessProfile}
                party={{
                    name: supplier?.name || "N/A",
                    address: supplier?.address,
                    contact: supplier?.contact,
                    type: "Supplier"
                }}
                reference={{
                    number: purchase.billNumber,
                    date: purchase.purchaseDate,
                    type: t('billNumber')
                }}
                table={{
                    headers: tableHeaders,
                    rows: tableRows,
                    footer: []
                }}
                paymentSummary={summaryDetails}
                status={purchase.remainingBalance <= 0 ? "Paid" : "Unpaid"}
                attachments={purchase.attachments}
                notes={purchase.notes}
            />
       </div>
    );
}
