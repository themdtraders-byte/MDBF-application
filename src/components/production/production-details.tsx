
"use client";

import React, { useEffect, useState } from "react";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { dbLoad } from "@/lib/db";
import { Invoice } from "../ui/invoice";
import { useLanguage } from "@/hooks/use-language";
import { DateRangePicker } from "../ui/date-range-picker";
import { DateRange } from "react-day-picker";

type Item = { id: string; name: string };
type Worker = { id: string; name: string };
type BusinessProfile = { businessName: string, address: string, phone: string };

type RawMaterial = { itemId: string; quantity: number; cost: number; };
type FinishedGood = { itemId: string; quantity: number; };
type LaborCost = { workerId: string; cost: number; quantity: number; };
type OtherExpense = { description: string; amount: number; };

type ProductionBatch = {
    batchCode: string;
    productionDate: string;
    rawMaterials: RawMaterial[];
    finishedGoods: FinishedGood[];
    laborCosts: LaborCost[];
    otherExpenses: OtherExpense[];
    totalProductionCost: number;
    perUnitCost: number;
};

interface ProductionDetailsProps {
    batch: ProductionBatch;
}

export function ProductionDetails({ batch }: ProductionDetailsProps) {
    const { t } = useLanguage();
    const [inventory, setInventory] = useState<Item[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    useEffect(() => {
        const fetchData = async () => {
            setInventory(await dbLoad("inventory"));
            setWorkers(await dbLoad("workers"));
            const profileInfo = localStorage.getItem('dukaanxp-active-account');
            if(profileInfo) {
                const profiles = await dbLoad("profiles");
                const activeProfile = profiles.find(p => p.id === JSON.parse(profileInfo).id);
                setBusinessProfile(activeProfile || null);
            }
        }
        fetchData();
    }, []);

    const getItemName = (itemId: string) => inventory.find(i => i.id === itemId)?.name || 'Unknown Item';
    const getWorkerName = (workerId: string) => workers.find(w => w.id === workerId)?.name || 'Unknown Worker';

    const rawMaterialRows = batch.rawMaterials.map(item => [
        `Raw: ${getItemName(item.itemId)}`,
        item.quantity.toString(),
        `PKR ${item.cost.toFixed(2)}`
    ]);
     const laborCostRows = (batch.laborCosts || []).map(item => [
        `Labor: ${getWorkerName(item.workerId)}`,
        item.quantity.toString(),
        `PKR ${item.cost.toFixed(2)}`
    ]);
    const otherExpenseRows = (batch.otherExpenses || []).map(item => [
        `Expense: ${item.description}`,
        '1',
        `PKR ${item.amount.toFixed(2)}`
    ]);

    const tableHeaders = ['Cost Component', 'Quantity', 'Amount'];
    const tableRows = [...rawMaterialRows, ...laborCostRows, ...otherExpenseRows];
    
    const finishedGoodsSummary = batch.finishedGoods.map(g => `${getItemName(g.itemId)} (x${g.quantity})`).join(', ');

    const summaryDetails = [
        { label: "Total Production Cost:", value: `PKR ${batch.totalProductionCost.toFixed(2)}`, isGrand: true },
        { label: "Finished Goods:", value: finishedGoodsSummary },
        { label: "Per Unit Cost:", value: `PKR ${batch.perUnitCost.toFixed(2)}`, isBalance: true, className: "text-primary" },
    ];

    return (
       <div>
            <Invoice
                title="Production Report"
                businessProfile={businessProfile}
                party={{
                    name: "Internal Production",
                    type: "Worker" // Using worker as a placeholder type
                }}
                reference={{
                    number: batch.batchCode,
                    date: batch.productionDate,
                    type: 'Batch Code'
                }}
                table={{
                    headers: tableHeaders,
                    rows: tableRows,
                    footer: []
                }}
                paymentSummary={summaryDetails}
                status="Completed"
                dateRangePicker={<DateRangePicker date={dateRange} setDate={setDateRange} />}
                dateRange={dateRange}
            />
        </div>
    );
}
