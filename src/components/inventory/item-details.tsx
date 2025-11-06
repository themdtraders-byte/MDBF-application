
"use client";

import { useEffect, useState } from "react";
import { dbLoad } from "@/lib/db";
import { Invoice } from "../ui/invoice";

type Item = {
    id: string;
    name: string;
    sku?: string;
    stock: number;
    unit: string;
    price: number;
    costPrice?: number;
    lowStock: number;
    image?: string;
    variations?: string[];
    description?: string;
};
type BusinessProfile = { businessName: string, address: string, phone: string, [key: string]: any; };

interface ItemDetailsProps {
    item: Item;
}

export function ItemDetails({ item }: ItemDetailsProps) {
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const profileInfo = localStorage.getItem('dukaanxp-active-account');
            if(profileInfo) {
                const profiles = await dbLoad("profiles");
                const activeProfile = profiles.find(p => p.id === JSON.parse(profileInfo).id);
                setBusinessProfile(activeProfile || null);
            }
        }
        fetchData();
    }, []);

    
    const tableHeaders = ['Property', 'Value'];
    const tableRows = [
        ['Name', item.name],
        ['SKU', item.sku || 'N/A'],
        ['Current Stock', `${item.stock} ${item.unit}`],
        ['Sale Price', `PKR ${item.price.toFixed(2)}`],
        ['Cost Price', `PKR ${(item.costPrice || 0).toFixed(2)}`],
        ['Low Stock Threshold', `${item.lowStock} ${item.unit}`],
        ['Variations', item.variations?.join(', ') || 'N/A'],
    ];

    const summaryDetails = [
        { label: "Description:", value: item.description || 'No description provided.' },
    ];

    return (
       <div>
            <Invoice
                title="itemDetails"
                businessProfile={businessProfile}
                party={{
                    name: item.name,
                    contact: item.sku,
                    type: "Product"
                }}
                reference={{
                    number: item.id,
                    date: new Date().toISOString(),
                    type: 'Item ID'
                }}
                table={{
                    headers: tableHeaders,
                    rows: tableRows,
                    footer: []
                }}
                paymentSummary={summaryDetails}
                status={item.stock > item.lowStock ? "In Stock" : "Low Stock"}
            />
       </div>
    );
}
