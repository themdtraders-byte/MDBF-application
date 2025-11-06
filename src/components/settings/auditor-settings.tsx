
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { runAudit, type Discrepancy } from "@/lib/auditor";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { dbLoad, dbClearAndSave } from "@/lib/db";
import { FormattedCurrency } from "../ui/formatted-currency";
import { Checkbox } from "../ui/checkbox";

export function AuditorSettings() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<Discrepancy[]>([]);
  const [selectedDiscrepancies, setSelectedDiscrepancies] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleRunAudit = async () => {
    setIsAuditing(true);
    setAuditResults([]);
    setSelectedDiscrepancies(new Set());
    try {
      const results = await runAudit();
      setAuditResults(results);
      if (results.length === 0) {
        toast({
          title: "Audit Complete",
          description: "No discrepancies found. All data is consistent.",
        });
      } else {
        toast({
            variant: "destructive",
            title: "Audit Complete",
            description: `${results.length} discrepancies found. Please review the results.`,
        });
      }
    } catch (error) {
      console.error("Audit failed:", error);
      toast({
        variant: "destructive",
        title: "Audit Failed",
        description: "An unexpected error occurred during the audit.",
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const handleFixDiscrepancies = async () => {
    if (selectedDiscrepancies.size === 0) {
        toast({ variant: "destructive", title: "No Discrepancies Selected" });
        return;
    }

    const discrepanciesToFix = auditResults.filter(d => selectedDiscrepancies.has(d.key));
    let fixesApplied = 0;
    let errorsEncountered = 0;

    for (const discrepancy of discrepanciesToFix) {
        try {
            if (discrepancy.isDeletion) {
                // This handles deleting erroneous expenses and refunding the account
                const allExpenses = await dbLoad('expenses');
                const expenseToDelete = allExpenses.find(e => e.id === discrepancy.id);
                if (!expenseToDelete) continue;

                // Refund the account
                if (discrepancy.accountId) {
                    const allAccounts = await dbLoad('accounts');
                    const accountIndex = allAccounts.findIndex(acc => acc.id === discrepancy.accountId);
                    if (accountIndex > -1) {
                        allAccounts[accountIndex].balance += expenseToDelete.amount; // Add the amount back
                        await dbClearAndSave('accounts', allAccounts);
                    }
                }

                // Delete the expense
                const updatedExpenses = allExpenses.filter(e => e.id !== discrepancy.id);
                await dbClearAndSave('expenses', updatedExpenses);
                fixesApplied++;

            } else {
                // This handles standard value corrections
                const tableData = await dbLoad(discrepancy.dataKey);
                const itemIndex = tableData.findIndex(item => item.id === discrepancy.id);

                if (itemIndex > -1) {
                    tableData[itemIndex][discrepancy.field] = discrepancy.correctValue;
                    await dbClearAndSave(discrepancy.dataKey, tableData);
                    fixesApplied++;
                } else {
                   throw new Error(`Item ${discrepancy.id} not found in ${discrepancy.dataKey}.`);
                }
            }
        } catch (error) {
            console.error(`Failed to fix discrepancy ${discrepancy.key}:`, error);
            errorsEncountered++;
            toast({
                variant: "destructive",
                title: "Correction Error",
                description: `Could not fix item: ${discrepancy.name}`,
            });
        }
    }

    toast({
        title: "Corrections Processed",
        description: `${fixesApplied} fixes applied. ${errorsEncountered > 0 ? `${errorsEncountered} errors.` : ''}`,
    });

    // Re-run the audit to confirm fixes
    await handleRunAudit();
  };

  const toggleSelect = (key: string) => {
    setSelectedDiscrepancies(prev => {
        const newSet = new Set(prev);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        return newSet;
    });
  }

  const toggleSelectAll = () => {
    if (selectedDiscrepancies.size === auditResults.length) {
        setSelectedDiscrepancies(new Set());
    } else {
        setSelectedDiscrepancies(new Set(auditResults.map(d => d.key)));
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Integrity Auditor</CardTitle>
        <CardDescription>
          This tool scans all your application data to find and fix any inconsistencies or miscalculations in balances and stock levels.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleRunAudit} disabled={isAuditing}>
          {isAuditing ? <><Icons.search className="mr-2 animate-spin" /> Auditing...</> : "Start Full Data Audit"}
        </Button>
        {auditResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-destructive mb-2">Discrepancies Found</h3>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10">
                            <Checkbox 
                                checked={selectedDiscrepancies.size === auditResults.length && auditResults.length > 0}
                                onCheckedChange={toggleSelectAll}
                                aria-label="Select all"
                            />
                        </TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Name/ID</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Stored Value</TableHead>
                        <TableHead>Correct Value</TableHead>
                        <TableHead>Notes</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {auditResults.map((d) => (
                        <TableRow key={d.key}>
                            <TableCell>
                                <Checkbox
                                    checked={selectedDiscrepancies.has(d.key)}
                                    onCheckedChange={() => toggleSelect(d.key)}
                                    aria-label={`Select discrepancy ${d.key}`}
                                />
                            </TableCell>
                            <TableCell><Badge variant={d.isDeletion ? "destructive" : "outline"}>{d.type}</Badge></TableCell>
                            <TableCell>{d.name}</TableCell>
                            <TableCell>{d.field}</TableCell>
                            <TableCell className="text-destructive font-mono"><FormattedCurrency amount={d.storedValue} /></TableCell>
                            <TableCell className="text-green-600 font-mono"><FormattedCurrency amount={d.correctValue} /></TableCell>
                            <TableCell>{d.notes}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {auditResults.length > 0 && (
        <CardFooter>
            <Button onClick={handleFixDiscrepancies} disabled={selectedDiscrepancies.size === 0}>
                <Icons.check className="mr-2" /> Fix {selectedDiscrepancies.size} Selected Discrepancies
            </Button>
        </CardFooter>
      )}
    </Card>
  );
}
