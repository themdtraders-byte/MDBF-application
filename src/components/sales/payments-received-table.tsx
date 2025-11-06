
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { FormattedCurrency } from "../ui/formatted-currency";
import { Button } from "../ui/button";
import { Icons } from "../icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { PaymentDetails } from "../payments/payment-details";


type Payment = {
    id: string;
    date: string | Date;
    customerId: string;
    customer: string;
    notes: string;
    amount: number;
    category: string;
    sourceRecord?: any;
}
type Customer = { id: string; name: string; };
type InventoryItem = { id: string; name: string; };

export function PaymentsReceivedTable() {
  const { t } = useLanguage();
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filterCustomer, setFilterCustomer] = useState("all");
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
        const storedCustomers = await dbLoad("customers");
        setCustomers(storedCustomers);
        const storedInventory = await dbLoad("inventory");
        setInventory(storedInventory);
        const getCustomerName = (id: string) => storedCustomers.find((c: Customer) => c.id === id)?.name || id;
        
        const getItemSummary = (items: { itemId: string, quantity: number }[] = []) => {
            return items.map(item => {
                const itemName = storedInventory.find(inv => inv.id === item.itemId)?.name || 'Unknown Item';
                return `${itemName} (x${item.quantity})`;
            }).join(', ');
        };
        
        const allSales = await dbLoad("sales");
        const salePayments = allSales
            .filter((s: any) => s.amountReceived > 0)
            .map((s: any) => ({
                id: `sale-${s.invoiceNumber}`,
                date: s.invoiceDate,
                customerId: s.customerId,
                customer: getCustomerName(s.customerId),
                notes: getItemSummary(s.items),
                amount: s.amountReceived,
                category: "Sale",
                sourceRecord: s
            }));

         const otherPayments = (await dbLoad("payments"))
            .filter((p: any) => p.paymentType === 'incoming')
            .map((p: any) => ({
                id: `payment-${p.id}`,
                date: p.date,
                customerId: p.fromToId,
                customer: p.fromToId ? (getCustomerName(p.fromToId) || p.manualFromTo) : p.manualFromTo,
                notes: p.notes || p.category,
                amount: p.amount,
                category: p.category,
                sourceRecord: p
            }));

        const allData = [...salePayments, ...otherPayments];
        setAllPayments(allData);
    }
    fetchPayments();
  }, []);

  const payments = useMemo(() => {
    let results = allPayments;
    if (filterCustomer !== 'all') {
        results = results.filter(p => p.customerId === filterCustomer);
    }
    if (dateRange?.from) {
      const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
      results = results.filter(p => {
        const dateString = typeof p.date === 'string' ? p.date : p.date.toISOString();
        return isWithinInterval(parseISO(dateString), interval)
      });
    }
    return results.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allPayments, filterCustomer, dateRange]);


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
                <CardTitle>{t("paymentsReceived")}</CardTitle>
                <CardDescription>{t('paymentsReceivedDescription')}</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <DateRangePicker date={dateRange} setDate={setDateRange} />
                <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder={t('filterByCustomer')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('allCustomers')}</SelectItem>
                        {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
              <TableHead>{t('customer')}</TableHead>
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
                <TableCell>{payment.customer}</TableCell>
                <TableCell><Badge variant="outline">{payment.category}</Badge></TableCell>
                <TableCell className="max-w-[250px] truncate">{payment.notes}</TableCell>
                <TableCell className="text-right text-green-600 font-semibold">
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
                    <TableCell colSpan={6} className="text-center h-24">No payments received yet.</TableCell>
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
           {viewingPayment && <PaymentDetails payment={viewingPayment} type="incoming" />}
        </DialogContent>
    </Dialog>
    </>
  );
}
