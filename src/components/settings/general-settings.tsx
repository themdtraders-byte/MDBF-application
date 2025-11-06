
"use client";

import { useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { dbBackup, dbRestore, dbExport, dbReset } from "@/lib/db";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useAccessControl } from "@/hooks/use-access-control";

export function GeneralSettings() {
  const { toast } = useToast();
  const { isReadOnly } = useAccessControl();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetConfirmationInput, setResetConfirmationInput] = useState("");
  const RESET_CONFIRMATION_TEXT = "DELETE ALL MY DATA";
  
  const handleBackup = async () => {
    try {
      const backupData = await dbBackup();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
      const link = document.createElement("a");
      link.href = jsonString;
      const date = new Date().toISOString().split('T')[0];
      link.download = `mdbf-full-backup-${date}.json`;
      link.click();
      toast({
        title: "Backup Successful",
        description: "All application data has been saved to your downloads folder.",
      });
    } catch (error) {
      console.error("Backup failed:", error);
      toast({
        variant: "destructive",
        title: "Backup Failed",
        description: "Could not back up your data. Please try again.",
      });
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.json')) {
      setRestoreFile(file);
    } else {
      setRestoreFile(null);
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please select a valid .json backup file.',
      });
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
        toast({ variant: 'destructive', title: 'No File Selected' });
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') {
                throw new Error('Failed to read file.');
            }
            const backupData = JSON.parse(text);
            await dbRestore(backupData);
            toast({
                title: 'Restore Successful',
                description: 'All data has been restored. The application will now reload.',
            });
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            console.error('Restore failed:', err);
            toast({
                variant: 'destructive',
                title: 'Restore Failed',
                description: 'The backup file is corrupted or invalid.',
            });
        } finally {
            setRestoreFile(null);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    reader.readAsText(restoreFile);
  };

  const handleExport = async () => {
     try {
      const csvData = await dbExport();
       const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
       const link = document.createElement("a");
       const url = URL.createObjectURL(blob);
       link.setAttribute("href", url);
       const date = new Date().toISOString().split('T')[0];
       link.setAttribute("download", `mdbf-export-${date}.csv`);
       link.style.visibility = 'hidden';
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       toast({
        title: "Export Successful",
        description: "Your data has been exported as a CSV file.",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Could not export your data. Please try again.",
      });
    }
  };
  
  const handleHardReset = async () => {
    if (resetConfirmationInput !== RESET_CONFIRMATION_TEXT) {
        toast({ variant: 'destructive', title: 'Confirmation text does not match.'});
        return;
    }
    await dbReset();
    localStorage.clear();
    toast({ title: 'Application Reset', description: 'All data has been cleared.'});
    setIsResetDialogOpen(false);
    setTimeout(() => window.location.reload(), 1000);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Data & Storage</CardTitle>
          <CardDescription>
            Manage your application data. Backups include all profiles and settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleBackup} disabled={isReadOnly}>
                  <Icons.database className="mr-2" /> Full Backup
              </Button>
              <Button variant="outline" onClick={handleExport} disabled={isReadOnly}>
                  <Icons.export className="mr-2" /> Export to CSV
              </Button>
          </div>
          <div className="p-4 border rounded-lg space-y-2">
              <h4 className="font-semibold">Restore from Backup</h4>
              <p className="text-sm text-muted-foreground">
                  This will replace all current data with the data from your backup file.
              </p>
               <Input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileChange}
                  accept=".json"
                  disabled={isReadOnly}
              />
              <div className="flex items-center gap-2">
                   <Button variant="outline" onClick={handleRestoreClick} disabled={isReadOnly}>
                      Choose File...
                  </Button>
                  {restoreFile && <span className="text-sm text-muted-foreground">{restoreFile.name}</span>}
              </div>
          </div>
        </CardContent>
        <CardFooter>
           <Button variant="destructive" onClick={handleRestore} disabled={!restoreFile || isReadOnly}>
              <Icons.restore className="mr-2" /> Restore Now
          </Button>
        </CardFooter>
      </Card>
      <Card className="mt-6 border-destructive">
         <CardHeader>
             <CardTitle>Danger Zone</CardTitle>
             <CardDescription>Irreversible actions that will permanently delete data.</CardDescription>
         </CardHeader>
         <CardContent>
             <Button variant="destructive" onClick={() => setIsResetDialogOpen(true)} disabled={isReadOnly}>
                  <Icons.alertTriangle className="mr-2" /> Hard Reset Application
             </Button>
         </CardContent>
      </Card>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will permanently delete all data, including all profiles, transactions, and settings. This action cannot be undone. Please type <strong className="text-foreground">{RESET_CONFIRMATION_TEXT}</strong> to confirm.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-2">
                  <Label htmlFor="reset-confirm" className="sr-only">Confirm Deletion</Label>
                  <Input
                      id="reset-confirm"
                      value={resetConfirmationInput}
                      onChange={(e) => setResetConfirmationInput(e.target.value)}
                      placeholder="Type the confirmation text here"
                      autoFocus
                  />
              </div>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleHardReset} disabled={resetConfirmationInput !== RESET_CONFIRMATION_TEXT}>
                      I understand, delete everything
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
