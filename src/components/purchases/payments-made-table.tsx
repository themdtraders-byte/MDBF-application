
"use client";

import { useEffect, useState, useMemo } from "react";
import { useLanguage } from "@/hooks/use-language";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { dbLoad } from "@/lib/db";
import { DateRangePicker } from "../ui/date-range-picker";
import { Badge } from "../ui/badge";
import { DateRange } from "react-day-picker";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { FormattedCurrency } from "../ui/formatted-currency";
import { Button } from "../ui/button";
import { Icons } from "../icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { PaymentDetails } from "../payments/payment-details";


type Payment = {
    id: string;
    date: string | Date;
    partyId?: string;
    party: string;
    notes: string;
    amount: number;
    category: string;
    sourceRecord?: any;
}
type Supplier = { id: string; name: string; };
type InventoryItem = { id: string; name: string; };

export function PaymentsMadeTable() {
  const { t } = useLanguage();
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
        const storedSuppliers = await dbLoad("suppliers");
        setSuppliers(storedSuppliers);
        const storedInventory = await dbLoad("inventory");
        setInventory(storedInventory);
        
        const getSupplierName = (id: string) => storedSuppliers.find((s: Supplier) => s.id === id)?.name || id;

        const getItemSummary = (items: { itemId: string, quantity: number }[] = []) => {
            return items.map(item => {
                const itemName = storedInventory.find(inv => inv.id === item.itemId)?.name || 'Unknown Item';
                return `${itemName} (x${item.quantity})`;
            }).join(', ');
        };

        const purchasePayments = (await dbLoad("purchases"))
            .filter((p: any) => p.amountPaid > 0)
            .map((p: any) => ({
                id: `purchase-${p.billNumber}`,
                date: p.purchaseDate,
                partyId: p.supplierId,
                party: getSupplierName(p.supplierId),
                notes: getItemSummary(p.items),
                amount: p.amountPaid,
                category: "Purchase",
                sourceRecord: p
            }));
        
        const expensePayments = (await dbLoad("expenses"))
            .map((e: any) => ({
                id: `expense-${e.id}`,
                date: e.date,
                party: e.notes || "General Expense",
                notes: e.notes || `Ref: ${e.reference || e.id}`,
                amount: e.amount,
                category: "Expense",
                sourceRecord: e
            }));

        const otherPayments = (await dbLoad("payments"))
            .filter((p: any) => p.paymentType === 'outgoing')
            .map((p: any) => ({
                id: `payment-${p.id}`,
                date: p.date,
                partyId: p.fromToId,
                party: p.fromToId ? (getSupplierName(p.fromToId) || p.manualFromTo) : p.manualFromTo,
                notes: p.notes || p.category,
                amount: p.amount,
                category: p.category,
                sourceRecord: p
            }));

        const allData = [...purchasePayments, ...expensePayments, ...otherPayments];
        setAllPayments(allData);
    }
    fetchPayments();
  }, []);

  const payments = useMemo(() => {
    let results = allPayments;
    if (filterSupplier !== 'all') {
      results = results.filter(p => p.partyId === filterSupplier);
    }
    if (dateRange?.from) {
      const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
      results = results.filter(p => {
        const dateString = typeof p.date === 'string' ? p.date : p.date.toISOString();
        return isWithinInterval(parseISO(dateString), interval)
      });
    }
    return results.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allPayments, filterSupplier, dateRange]);


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
                <CardTitle>{t("paymentsMade")}</CardTitle>
                <CardDescription>{t('paymentsMadeDescription')}</CardDescription>
            </div>
             <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <DateRangePicker date={dateRange} setDate={setDateRange} />
                 <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder={t('filterBySupplier')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('allSuppliers')}</SelectItem>
                        {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('date')}</TableHead>
              <TableHead>{t('supplier')}</TableHead>
              <TableHead>{t('categoryName')}</TableHead>
              <TableHead>{t('notesOptional')}</TableHead>
              <TableHead className="text-right">{t('amount')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{format(new Date(payment.date), "PPP")}</TableCell>
                <TableCell>{payment.party}</TableCell>
                <TableCell><Badge variant="outline">{payment.category}</Badge></TableCell>
                <TableCell className="max-w-[250px] truncate">{payment.notes}</TableCell>
                <TableCell className="text-right text-destructive font-semibold">
                    <FormattedCurrency amount={payment.amount} />
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewingPayment(payment)}>
                        <Icons.search className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
             {payments.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No payments made yet.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
     <Dialog open={!!viewingPayment} onOpenChange={(open) => !open && setViewingPayment(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
           <DialogHeader>
             <DialogTitle>Payment Details</DialogTitle>
           </DialogHeader>
           {viewingPayment && <PaymentDetails payment={viewingPayment} type="outgoing" />}
        </DialogContent>
    </Dialog>
    </>
  );
}
