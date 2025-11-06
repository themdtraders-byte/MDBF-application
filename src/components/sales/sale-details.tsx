
"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { dbLoad } from "@/lib/db";
import { Invoice } from "../ui/invoice";
import { useLanguage } from "@/hooks/use-language";
import { DateRangePicker } from "../ui/date-range-picker";
import { DateRange } from "react-day-picker";

type Customer = { id: string; name: string, address?: string, contact?: string };
type Item = { id: string; name: string };
type BusinessProfile = { businessName: string, address: string, phone: string, [key: string]: any; };

type SaleItem = {
    itemId: string;
    quantity: number;
    unitPrice: number;
    total: number;
    unit?: string;
};

type Sale = {
    invoiceNumber: string;
    invoiceDate: string;
    customerId: string;
    grandTotal: number;
    amountReceived: number;
    remainingBalance: number;
    items: SaleItem[];
    subtotal: number;
    totalDiscount: number;
    totalAdjustment: number;
    attachments?: string[];
    notes?: string;
};

interface SaleDetailsProps {
    sale: Sale;
}

export function SaleDetails({ sale }: SaleDetailsProps) {
    const { t } = useLanguage();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [inventory, setInventory] = useState<Item[]>([]);
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    useEffect(() => {
        const fetchData = async () => {
            const customers = await dbLoad("customers");
            setCustomer(customers.find(c => c.id === sale.customerId) || null);
            
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
    }, [sale.customerId]);

    const getItemName = (itemId: string) => {
        return inventory.find(i => i.id === itemId)?.name || 'Unknown Item';
    }
    
    const tableHeaders = [t('item'), t('quantity'), t('price'), t('total')];
    const tableRows = sale.items.map(item => [
        getItemName(item.itemId),
        `${item.quantity} ${item.unit || ''}`,
        `PKR ${item.unitPrice.toFixed(2)}`,
        `PKR ${item.total.toFixed(2)}`
    ]);

    const summaryDetails = [
        { label: "subtotal:", value: `PKR ${sale.subtotal.toFixed(2)}` },
        ...(sale.totalDiscount > 0 ? [{ label: "discount:", value: `PKR ${sale.totalDiscount.toFixed(2)}`, className: "text-destructive" }] : []),
        ...(sale.totalAdjustment > 0 ? [{ label: "adjustment:", value: `PKR ${sale.totalAdjustment.toFixed(2)}`, className: "text-green-600" }] : []),
        { label: "grandTotal:", value: `PKR ${sale.grandTotal.toFixed(2)}`, isGrand: true },
        { label: "amountReceived:", value: `PKR ${sale.amountReceived.toFixed(2)}` },
        { label: "balanceDue:", value: `PKR ${sale.remainingBalance.toFixed(2)}`, isBalance: true, className: "text-destructive" },
    ];

    return (
       <div>
            {/* The DateRangePicker is not used here as this component shows a single invoice */}
            <Invoice
                title="salesInvoice"
                businessProfile={businessProfile}
                party={{
                    name: customer?.name || "N/A",
                    address: customer?.address,
                    contact: customer?.contact,
                    type: "Customer"
                }}
                reference={{
                    number: sale.invoiceNumber,
                    date: sale.invoiceDate,
                    type: t('invoiceNumber')
                }}
                table={{
                    headers: tableHeaders,
                    rows: tableRows,
                    footer: []
                }}
                paymentSummary={summaryDetails}
                status={sale.remainingBalance <= 0 ? "Paid" : "Due"}
                attachments={sale.attachments}
                notes={sale.notes}
            />
       </div>
    );
}
