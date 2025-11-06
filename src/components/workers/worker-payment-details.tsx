
"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { dbLoad } from "@/lib/db";
import { Invoice } from "../ui/invoice";
import { useLanguage } from "@/hooks/use-language";

type Worker = { id: string; name: string; address?: string; contact?: string };
type Account = { id: string; name: string };
type BusinessProfile = { businessName: string; address: string; phone: string; [key: string]: any; };

type SalaryTransaction = { 
    id: string, 
    date: string, 
    workerId: string, 
    type: string, 
    amount: number, 
    notes?: string, 
    accountId?: string,
    attachments?: string[];
};

interface WorkerPaymentDetailsProps {
    transaction: SalaryTransaction;
}

export function WorkerPaymentDetails({ transaction }: WorkerPaymentDetailsProps) {
    const { t } = useLanguage();
    const [worker, setWorker] = useState<Worker | null>(null);
    const [account, setAccount] = useState<Account | null>(null);
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const workers = await dbLoad("workers");
            setWorker(workers.find(w => w.id === transaction.workerId) || null);
            
            if (transaction.accountId) {
                const accounts = await dbLoad("accounts");
                setAccount(accounts.find(a => a.id === transaction.accountId) || null);
            }

            const profileInfo = localStorage.getItem('dukaanxp-active-account');
            if(profileInfo) {
                const profiles = await dbLoad("profiles");
                const activeProfile = profiles.find(p => p.id === JSON.parse(profileInfo).id);
                setBusinessProfile(activeProfile || null);
            }
        }
        fetchData();
    }, [transaction]);

    const tableHeaders = ['Description', 'Amount'];
    const tableRows = [
        [`${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1).replace('_', ' ')}: ${transaction.notes || 'N/A'}`, `PKR ${transaction.amount.toFixed(2)}`]
    ];

    const summaryDetails = [
        { label: "grandTotal:", value: `PKR ${transaction.amount.toFixed(2)}`, isGrand: true },
        { label: "Paid From:", value: account?.name || 'N/A' },
    ];

    return (
       <div>
            <Invoice
                title="paymentVoucher"
                businessProfile={businessProfile}
                party={{
                    name: worker?.name || "N/A",
                    address: worker?.address,
                    contact: worker?.contact,
                    type: "Worker"
                }}
                reference={{
                    number: transaction.id,
                    date: transaction.date,
                    type: 'Payment ID'
                }}
                table={{
                    headers: tableHeaders,
                    rows: tableRows,
                    footer: []
                }}
                paymentSummary={summaryDetails}
                status="Paid"
                attachments={transaction.attachments}
            />
       </div>
    );
}
