
"use client";

import { parseISO } from "date-fns";
import { dbLoad } from "./db";

export type Discrepancy = {
  // A unique key for React lists, combining id and field
  key: string;
  // The type of entity (e.g., 'Customer', 'Inventory')
  type: string;
  // The unique ID of the record with the discrepancy
  id: string;
  // The human-readable name of the item
  name: string;
  // The specific field that is incorrect (e.g., 'balance', 'stock')
  field: string;
  // The incorrect value currently stored in the database
  storedValue: number;
  // The value that the auditor has calculated as correct
  correctValue: number;
  // The database key where the record is stored (e.g., 'customers')
  dataKey: string;
  // Notes about the discrepancy
  notes: string;
  // For special cases like deletion
  isDeletion?: boolean;
  // For refunds, the account that needs adjustment
  accountId?: string;
};


// Helper to ensure we're working with Date objects
const ensureDate = (dateValue: string | Date): Date => {
  if (dateValue instanceof Date) return dateValue;
  return parseISO(dateValue);
};

/**
 * Runs a comprehensive audit of the application's data to find inconsistencies.
 * @returns A promise that resolves to an array of Discrepancy objects.
 */
export async function runAudit(): Promise<Discrepancy[]> {
  const discrepancies: Discrepancy[] = [];

  // Load all necessary data tables once
  const customers = await dbLoad("customers");
  const suppliers = await dbLoad("suppliers");
  const inventory = await dbLoad("inventory");
  const accounts = await dbLoad("accounts");
  const sales = await dbLoad("sales");
  const purchases = await dbLoad("purchases");
  const transfers = await dbLoad("transfers");
  const expenses = await dbLoad("expenses");
  const productionHistory = await dbLoad("production-history");
  const salaryTransactions = await dbLoad("salary-transactions");
  const stockAdjustments = await dbLoad("stock-adjustments");


  // --- 1. AUDIT: Customer Balances ---
  customers.forEach(customer => {
    const openingBalance = customer.openingBalance || 0;
    const totalInvoiced = sales.filter(s => s.customerId === customer.id).reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    const totalReceived = sales.filter(s => s.customerId === customer.id).reduce((sum, s) => sum + (s.amountReceived || 0), 0);
    const correctBalance = openingBalance + totalInvoiced - totalReceived;

    if (Math.abs(customer.balance - correctBalance) > 0.01) {
      discrepancies.push({
        key: `${customer.id}-balance`,
        type: 'Customer',
        id: customer.id,
        name: customer.name,
        field: 'balance',
        storedValue: customer.balance,
        correctValue: correctBalance,
        dataKey: 'customers',
        notes: "Balance does not match transaction history."
      });
    }
  });

  // --- 2. AUDIT: Supplier Balances ---
  suppliers.forEach(supplier => {
    const openingBalance = supplier.openingBalance || 0;
    const totalPurchased = purchases.filter(p => p.supplierId === supplier.id).reduce((sum, p) => sum + (p.grandTotal || 0), 0);
    const totalPaid = purchases.filter(p => p.supplierId === supplier.id).reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const correctBalance = openingBalance + totalPurchased - totalPaid;
    
    if (Math.abs(supplier.balance - correctBalance) > 0.01) {
      discrepancies.push({
        key: `${supplier.id}-balance`,
        type: 'Supplier',
        id: supplier.id,
        name: supplier.name,
        field: 'balance',
        storedValue: supplier.balance,
        correctValue: correctBalance,
        dataKey: 'suppliers',
        notes: "Balance does not match purchase history."
      });
    }
  });

  // --- 3. AUDIT: Inventory Stock Levels ---
  inventory.forEach(item => {
    const openingStock = item.initialStock || 0;
    const totalPurchased = purchases.flatMap(p => p.items || []).filter(i => i.itemId === item.id).reduce((sum, i) => sum + i.quantity, 0);
    const totalSold = sales.flatMap(s => s.items || []).filter(i => i.itemId === item.id).reduce((sum, i) => sum + i.quantity, 0);
    const totalConsumed = productionHistory.flatMap(p => p.rawMaterials || []).filter(m => m.itemId === item.id).reduce((sum, m) => sum + m.quantity, 0);
    const totalProduced = productionHistory.flatMap(p => p.finishedGoods || []).filter(g => g.itemId === item.id).reduce((sum, g) => sum + g.quantity, 0);
    const adjustmentsIn = (stockAdjustments || []).filter(a => a.itemId === item.id && a.adjustmentType === 'add').reduce((sum, a) => sum + a.quantity, 0);
    const adjustmentsOut = (stockAdjustments || []).filter(a => a.itemId === item.id && a.adjustmentType === 'subtract').reduce((sum, a) => sum + a.quantity, 0);

    const correctStock = openingStock + totalPurchased + totalProduced + adjustmentsIn - totalSold - totalConsumed - adjustmentsOut;

    if (item.stock !== correctStock) {
      discrepancies.push({
        key: `${item.id}-stock`,
        type: 'Inventory',
        id: item.id,
        name: item.name,
        field: 'stock',
        storedValue: item.stock,
        correctValue: correctStock,
        dataKey: 'inventory',
        notes: "Stock count doesn't match sales, purchases, and production."
      });
    }
  });

  // --- 4. AUDIT: Financial Account Balances ---
  accounts.forEach(account => {
    const openingBalance = account.openingBalance || 0;
    const salesCredits = sales.filter(s => s.paymentAccountId === account.id).reduce((sum, s) => sum + (s.amountReceived || 0), 0);
    const purchaseDebits = purchases.filter(p => p.paymentAccountId === account.id).reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const expenseDebits = expenses.filter(e => e.paymentAccountId === account.id).reduce((sum, e) => sum + (e.amount || 0), 0);
    const salaryDebits = salaryTransactions.filter(st => st.accountId === account.id).reduce((sum, st) => sum + (st.amount || 0), 0);
    const transfersIn = transfers.filter(t => t.toAccountId === account.id).reduce((sum, t) => sum + (t.amount || 0), 0);
    const transfersOut = transfers.filter(t => t.fromAccountId === account.id).reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const correctBalance = openingBalance + salesCredits + transfersIn - purchaseDebits - expenseDebits - salaryDebits - transfersOut;

    if (Math.abs(account.balance - correctBalance) > 0.01) {
      discrepancies.push({
        key: `${account.id}-balance`,
        type: 'Account',
        id: account.id,
        name: account.name,
        field: 'balance',
        storedValue: account.balance,
        correctValue: correctBalance,
        dataKey: 'accounts',
        notes: "Account balance does not match its transaction history."
      });
    }
  });

  // --- 5. AUDIT: Erroneous Production Expenses (as requested) ---
  const erroneousExpenses = expenses.filter(e => e.notes && e.notes.startsWith("Production Batch:"));
  erroneousExpenses.forEach(e => {
    discrepancies.push({
      key: `${e.id}-deletion`,
      type: 'Expense',
      id: e.id,
      name: `Expense for ${e.notes}`,
      field: 'deletion',
      storedValue: e.amount,
      correctValue: 0,
      dataKey: 'expenses',
      isDeletion: true,
      notes: "This expense was incorrectly created from a production batch and should be deleted.",
      accountId: e.paymentAccountId,
    });
  });

  return discrepancies;
}
