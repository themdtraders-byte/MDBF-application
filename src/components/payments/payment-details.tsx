
"use client";

import { useEffect, useState } from "react";
import { dbLoad } from "@/lib/db";
import { Invoice } from "../ui/invoice";

type Party = { id: string; name: string, address?: string, contact?: string };
type BusinessProfile = { businessName: string, address: string, phone: string, [key: string]: any; };

type Payment = {
    id: string;
    date: string | Date;
    partyId?: string;
    party: string;
    notes: string;
    amount: number;
    category: string;
    sourceRecord?: any;
};

interface PaymentDetailsProps {
    payment: Payment;
    type: 'incoming' | 'outgoing';
}

export function PaymentDetails({ payment, type }: PaymentDetailsProps) {
    const [party, setParty] = useState<Party | null>(null);
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (payment.partyId) {
                const parties = type === 'incoming' ? await dbLoad("customers") : await dbLoad("suppliers");
                setParty(parties.find(p => p.id === payment.partyId) || null);
            }

            const profileInfo = localStorage.getItem('dukaanxp-active-account');
            if(profileInfo) {
                const profiles = await dbLoad("profiles");
                const activeProfile = profiles.find(p => p.id === JSON.parse(profileInfo).id);
                setBusinessProfile(activeProfile || null);
            }
        }
        fetchData();
    }, [payment, type]);
    
    const tableHeaders = ['Description', 'Amount'];
    const tableRows = [
        [payment.notes, `PKR ${payment.amount.toFixed(2)}`]
    ];

    const summaryDetails = [
        { label: "grandTotal:", value: `PKR ${payment.amount.toFixed(2)}`, isGrand: true },
    ];
    
    const partyType = type === 'incoming' ? 'Customer' : 'Supplier';

    return (
       <div>
            <Invoice
                title="paymentVoucher"
                businessProfile={businessProfile}
                party={{
                    name: party?.name || payment.party,
                    address: party?.address,
                    contact: party?.contact,
                    type: partyType
                }}
                reference={{
                    number: payment.sourceRecord?.invoiceNumber || payment.sourceRecord?.billNumber || payment.sourceRecord?.id || payment.id,
                    date: payment.date.toString(),
                    type: 'Reference ID'
                }}
                table={{
                    headers: tableHeaders,
                    rows: tableRows,
                    footer: []
                }}
                paymentSummary={summaryDetails}
                status={type === 'incoming' ? 'Received' : 'Paid'}
            />
       </div>
    );
}
