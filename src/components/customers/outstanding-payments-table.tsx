

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
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { dbLoad, dbSave } from "@/lib/db";
import { DateRangePicker } from "../ui/date-range-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { DateRange } from "react-day-picker";
import { FormattedCurrency } from "../ui/formatted-currency";

type Customer = {
    id: string;
    name: string;
    contact: string;
    balance: number;
    createdAt?: string;
}

type Account = {
    id: string;
    name: string;
}

export function OutstandingPaymentsTable() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [allDueCustomers, setAllDueCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [receivingPaymentFor, setReceivingPaymentFor] = useState<Customer | null>(null);
  const [amountReceived, setAmountReceived] = useState(0);
  const [paymentAccountId, setPaymentAccountId] = useState('');

  const fetchCustomersAndAccounts = async () => {
      const storedCustomers = await dbLoad("customers");
      const customersWithDues = storedCustomers.filter((customer: Customer) => customer.balance > 0);
      setAllDueCustomers(customersWithDues);
      const storedAccounts = await dbLoad("accounts");
      setAccounts(storedAccounts);
  }
  
  useEffect(() => {
    fetchCustomersAndAccounts();
  }, []);

  const dueCustomers = useMemo(() => {
    let results = allDueCustomers;
     if (dateRange?.from) {
      const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) };
      results = results.filter(c => c.createdAt && isWithinInterval(parseISO(c.createdAt), interval));
    }
    return results;
  }, [allDueCustomers, dateRange]);


  const openPaymentDialog = (customer: Customer) => {
    setReceivingPaymentFor(customer);
    setAmountReceived(customer.balance); // Pre-fill with full due amount
    setPaymentAccountId('');
  }

  const handleReceivePayment = async () => {
    if (!receivingPaymentFor || !paymentAccountId || amountReceived <= 0) {
        toast({
            variant: "destructive",
            title: "Invalid Input",
            description: "Please fill all fields correctly.",
        });
        return;
    }

    try {
        const allCustomers = await dbLoad("customers");
        const allAccounts = await dbLoad("accounts");
        const salesHistory = await dbLoad("sales");

        const customerIndex = allCustomers.findIndex(c => c.id === receivingPaymentFor.id);
        const accountIndex = allAccounts.findIndex(a => a.id === paymentAccountId);

        if(customerIndex === -1 || accountIndex === -1) throw new Error("Customer or account not found.");

        allCustomers[customerIndex].balance -= amountReceived;
        allAccounts[accountIndex].balance += amountReceived;
        
        // Create a synthetic sale record for this payment
        const paymentRecord = {
            invoiceNumber: `PAY-${Date.now()}`,
            invoiceDate: new Date().toISOString(),
            customerId: receivingPaymentFor.id,
            items: [],
            subtotal: 0,
            totalDiscount: 0,
            totalAdjustment: 0,
            grandTotal: 0,
            amountReceived: amountReceived,
            paymentAccountId: paymentAccountId,
            notes: `Payment received for outstanding balance on ${format(new Date(), 'PPP')}`,
            remainingBalance: 0,
        };
        salesHistory.push(paymentRecord);

        await dbSave("customers", allCustomers);
        await dbSave("accounts", allAccounts);
        await dbSave("sales", salesHistory);

        toast({
            title: "Payment Received",
            description: `PKR ${amountReceived.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} received from ${receivingPaymentFor.name}.`,
        });

        fetchCustomersAndAccounts(); // Refresh the list
        setReceivingPaymentFor(null);

    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to record payment.",
        });
    }
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
                <CardTitle>{t("outstandingPayments")}</CardTitle>
                <CardDescription>Customers with a pending balance.</CardDescription>
            </div>
            <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Balance Due</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dueCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.contact}</TableCell>
                <TableCell className="text-right text-destructive font-semibold">
                    <FormattedCurrency amount={customer.balance} />
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openPaymentDialog(customer)}>
                        <Icons.paymentsReceived className="mr-2 h-4 w-4" />
                        Receive Payment
                    </Button>
                </TableCell>
              </TableRow>
            ))}
             {dueCustomers.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">No outstanding payments found.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    <Dialog open={!!receivingPaymentFor} onOpenChange={(open) => !open && setReceivingPaymentFor(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Receive Payment from {receivingPaymentFor?.name}</DialogTitle>
                <DialogDescription>Record a payment received for an outstanding balance.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="amount">Amount Received</Label>
                    <Input id="amount" type="number" value={amountReceived} onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="account">Receive In Account</Label>
                    <Select onValueChange={setPaymentAccountId} value={paymentAccountId}>
                        <SelectTrigger id="account"><SelectValue placeholder="Select an account" /></SelectTrigger>
                        <SelectContent>
                            {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setReceivingPaymentFor(null)}>Cancel</Button>
                <Button onClick={handleReceivePayment}>Confirm Payment</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
