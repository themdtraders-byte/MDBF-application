
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/use-language';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Home, Briefcase, Edit, Trash2, Settings, AlertTriangle, User, Upload, FileDown, DatabaseBackup, Languages } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isSameMonth, startOfMonth, parseISO, isBefore, eachMonthOfInterval, getDaysInMonth, endOfMonth } from 'date-fns';
import { GlobalStatsCards } from '@/components/home/global-stats-cards';
import { GlobalProfitPieChart } from '@/components/home/global-profit-pie-chart';
import { GlobalEquityChart } from '@/components/home/global-equity-chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlobalSummaryAdvanced } from '@/components/home/global-summary-advanced';
import { dbLoad, dbSave, dbClearAndSave, dbReset, dbBackupProfile, dbRestoreProfile, dbBackup, dbRestore } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';


type Profile = {
  id: string;
  name: string;
  type: 'Business' | 'Home';
  editPassword?: string;
  viewPassword?: string;
  logo?: string;
  businessType?: string;
}
type Sale = { grandTotal: number; invoiceDate: string };
type Purchase = { grandTotal: number; purchaseDate: string };
type Expense = { amount: number; date: string };
type Account = { balance?: number; };
type Customer = { balance: number };
type Supplier = { balance: number };
type Worker = { id: string; joiningDate: string | Date; workType: 'salary' | 'work_based', salary?: number, allowedLeaves?: number };
type SalaryTransaction = { workerId: string; date: string; type: string, amount: number };
type ProductionBatch = { productionDate: string, laborCosts?: { workerId: string, cost: number }[] };
type AttendanceRecord = { workerId: string, date: string, status: 'p' | 'a' | 'l' };

const ensureDate = (dateValue: string | Date): Date => {
  if (dateValue instanceof Date) return dateValue;
  return parseISO(dateValue);
}

const loadProfileData = async (profileId: string, key: string) => {
    if (typeof window === 'undefined') return [];
    // Manually set active account for this operation
    const originalAccount = localStorage.getItem('dukaanxp-active-account');
    localStorage.setItem('dukaanxp-active-account', JSON.stringify({ id: profileId, type: 'Business' }));
    const data = await dbLoad(key);
    // Restore original active account
    if(originalAccount) {
        localStorage.setItem('dukaanxp-active-account', originalAccount);
    } else {
        localStorage.removeItem('dukaanxp-active-account');
    }
    return data;
};

const calculateBusinessMetrics = async (profileId: string) => {
    const sales: Sale[] = await loadProfileData(profileId, 'sales');
    const purchases: Purchase[] = await loadProfileData(profileId, 'purchases');
    const expenses: Expense[] = await loadProfileData(profileId, 'expenses');
    const salaryTxs: SalaryTransaction[] = await loadProfileData(profileId, 'salary-transactions');
    const productionHistory: ProductionBatch[] = await loadProfileData(profileId, 'production-history');
    const customers: Customer[] = await loadProfileData(profileId, 'customers');
    const suppliers: Supplier[] = await loadProfileData(profileId, 'suppliers');
    const workers: Worker[] = await loadProfileData(profileId, 'workers');
    const attendance: AttendanceRecord[] = await loadProfileData(profileId, 'attendance');

    const now = new Date();
    const thisMonthStart = startOfMonth(now);

    const isDateInMonth = (dateValue: string | Date) => {
        if (!dateValue) return false;
        return isSameMonth(ensureDate(dateValue), thisMonthStart);
    }

    const salesThisMonth = sales.filter(s => isDateInMonth(s.invoiceDate)).reduce((acc, sale) => acc + sale.grandTotal, 0);
    const purchasesThisMonth = purchases.filter(p => isDateInMonth(p.purchaseDate)).reduce((acc, p) => acc + p.grandTotal, 0);
    const expensesThisMonth = expenses.filter(e => isDateInMonth(e.date)).reduce((acc, expense) => acc + expense.amount, 0);

    const workerCostsThisMonth = (salaryTxs.filter(tx => isDateInMonth(tx.date)).reduce((sum, tx) => sum + tx.amount, 0)) + 
                                  (productionHistory.filter(p => isDateInMonth(p.productionDate)).flatMap(p => p.laborCosts || []).reduce((sum, lc) => sum + (lc.cost || 0), 0));
    
    const netProfitThisMonth = salesThisMonth - (purchasesThisMonth + expensesThisMonth + workerCostsThisMonth);

    const customerReceivables = customers.reduce((acc, cust) => acc + (cust.balance > 0 ? cust.balance : 0), 0);
    const supplierAdvances = suppliers.reduce((acc, sup) => acc + (sup.balance < 0 ? Math.abs(sup.balance) : 0), 0);
    
    let workerPayables = 0;
    let workerAdvances = 0;
     workers.forEach(worker => {
        let totalEarnings = 0;
        let totalDeductions = 0;
        const joinDate = ensureDate(worker.joiningDate);
        const endDate = new Date();

        if (isBefore(joinDate, endDate)) {
            const months = eachMonthOfInterval({ start: joinDate, end: endDate });
            months.forEach(monthStart => {
                if (worker.workType === 'salary') {
                    const daysInMonth = getDaysInMonth(monthStart);
                    const dailyRate = (worker.salary || 0) / daysInMonth;
                    const presentDays = attendance.filter(a => a.workerId === worker.id && a.status === 'p' && isSameMonth(parseISO(a.date), monthStart)).length;
                    const paidLeaves = Math.min(attendance.filter(a => a.workerId === worker.id && a.status === 'l' && isSameMonth(parseISO(a.date), monthStart)).length, worker.allowedLeaves || 0);
                    totalEarnings += (presentDays + paidLeaves) * dailyRate;
                }
            });
        }
        
        if (worker.workType === 'work_based') {
             totalEarnings += productionHistory.flatMap(p => p.laborCosts || []).filter(lc => lc.workerId === worker.id).reduce((sum, lc) => sum + (lc.cost || 0), 0);
        }
        totalDeductions += salaryTxs.filter(t => t.workerId === worker.id).reduce((sum, t) => sum + (t.type === 'penalty' ? t.amount : t.type !== 'tip' ? t.amount : 0), 0);
        const balance = totalEarnings - totalDeductions;
        if(balance > 0) workerPayables += balance;
        if(balance < 0) workerAdvances += Math.abs(balance);
      });

    const totalReceivables = customerReceivables + workerAdvances + supplierAdvances;
    const supplierPayables = suppliers.reduce((acc, sup) => acc + (sup.balance > 0 ? sup.balance : 0), 0);
    const totalPayables = supplierPayables + workerPayables;
    
    return { 
      netProfit: netProfitThisMonth, 
      sales: salesThisMonth, 
      purchases: purchasesThisMonth,
      expenses: expensesThisMonth, 
      workerCosts: workerCostsThisMonth,
      receivables: totalReceivables,
      payables: totalPayables,
      originalProfit: netProfitThisMonth + totalReceivables - totalPayables,
    };
};

const calculateHomeMetrics = async (profileId: string) => {
    const expenses: Expense[] = await loadProfileData(profileId, 'expenses');
    const totalExpenses = expenses.reduce((acc, expense) => acc + expense.amount, 0);
    return { totalExpenses };
};


export default function SelectAccountPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, toggleLanguage } = useLanguage();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [globalProfile, setGlobalProfile] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [profileToEdit, setProfileToEdit] = useState<Profile | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState('');
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isHardResetDialogOpen, setIsHardResetDialogOpen] = useState(false);
  const [hardResetStep, setHardResetStep] = useState(1);
  const [hardResetCode, setHardResetCode] = useState('');
  const [hardResetCodeInput, setHardResetCodeInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const ADMIN_PASSWORD = "MDBF";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fullBackupInputRef = useRef<HTMLInputElement>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [profileToUnlock, setProfileToUnlock] = useState<Profile | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  
  const [globalStats, setGlobalStats] = useState({
      totalSales: 0,
      totalPurchases: 0,
      totalExpenses: 0,
      totalWorkerCosts: 0,
      totalNetProfit: 0,
      totalHomeExpenses: 0,
      totalCashBalance: 0,
      totalReceivables: 0,
      totalPayables: 0,
      originalProfit: 0,
  });
  
  const fetchProfiles = async () => {
    const storedProfiles = await dbLoad('profiles');
    const userProfiles = storedProfiles.filter(p => p.id !== 'global-profile');
    const globalProf = storedProfiles.find(p => p.id === 'global-profile');
    setGlobalProfile(globalProf);

    if (userProfiles.length === 0) {
      setProfiles([]);
    } else {
        let totalNetProfit = 0;
        let totalSales = 0;
        let totalPurchases = 0;
        let totalExpenses = 0;
        let totalWorkerCosts = 0;
        let totalReceivables = 0;
        let totalPayables = 0;
        let totalHomeExp = 0;
        let totalCash = 0;
        
        const allFinancialAccounts: Account[] = await dbLoad('accounts');
        totalCash = allFinancialAccounts.reduce((sum, current) => sum + (Number(current.balance) || 0), 0);

        const profilesWithMetrics = await Promise.all(userProfiles.map(async (prof: Profile) => {
            if (prof.type === 'Business') {
                const metrics = await calculateBusinessMetrics(prof.id);
                totalNetProfit += metrics.netProfit;
                totalSales += metrics.sales;
                totalPurchases += metrics.purchases;
                totalExpenses += metrics.expenses;
                totalWorkerCosts += metrics.workerCosts;
                totalReceivables += metrics.receivables;
                totalPayables += metrics.payables;
                return { ...prof, ...metrics };
            } else { // Home
                const metrics = await calculateHomeMetrics(prof.id);
                totalHomeExp += metrics.totalExpenses;
                return { ...prof, ...metrics };
            }
        }));

        setProfiles(profilesWithMetrics);
        setGlobalStats({
            totalSales,
            totalPurchases,
            totalExpenses,
            totalWorkerCosts,
            totalNetProfit,
            totalHomeExpenses: totalHomeExp,
            totalCashBalance: totalCash,
            totalReceivables,
            totalPayables,
            originalProfit: totalNetProfit + totalReceivables - totalPayables
        })
    }
  }

  useEffect(() => {
    setIsMounted(true);
    fetchProfiles();
  }, []);

  const proceedToProfile = (profile: any, accessLevel: 'full' | 'view') => {
    const activeAccountInfo = { 
        id: profile.id, 
        type: profile.type, 
        name: profile.name, 
        logo: profile.logo,
        businessType: profile.businessType,
        accessLevel: accessLevel
    };
    localStorage.setItem('dukaanxp-active-account', JSON.stringify(activeAccountInfo));
    router.push('/');
  }

  const selectProfile = (profile: any) => {
    if (profile.type === 'Business' && (profile.editPassword || profile.viewPassword)) {
        setProfileToUnlock(profile);
        setPasswordInput('');
    } else {
        proceedToProfile(profile, 'full');
    }
  };

  const handleUnlock = () => {
    if (!profileToUnlock) return;

    if (profileToUnlock.editPassword && passwordInput === profileToUnlock.editPassword) {
        toast({ title: "Full Access Granted" });
        proceedToProfile(profileToUnlock, 'full');
    } else if (profileToUnlock.viewPassword && passwordInput === profileToUnlock.viewPassword) {
        toast({ title: "View-Only Access Granted" });
        proceedToProfile(profileToUnlock, 'view');
    } else {
        toast({ variant: "destructive", title: "Incorrect Password" });
    }
    setProfileToUnlock(null);
  }

  const handleCreateHomeProfile = async () => {
    const profileId = `home-${Date.now()}`;
    const newProfile = { id: profileId, name: newProfileName || 'My Home', type: 'Home' };

    const allProfiles = await dbLoad('profiles');
    allProfiles.push(newProfile);
    await dbSave('profiles', allProfiles);
    proceedToProfile(newProfile, 'full');

    setIsAddDialogOpen(false);
    setNewProfileName('');
  }
  
  const handleEditProfile = (profile: Profile) => {
    if (profile.type === 'Business') {
        localStorage.setItem('dukaanxp-business-profile-to-edit', JSON.stringify(profile));
        router.push(`/create-business`);
    } else { // Home profile
        setProfileToEdit(profile);
        setNewProfileName(profile.name);
    }
  };
  
  const handleExportProfile = async (profile: Profile) => {
    try {
      const backupData = await dbBackupProfile(profile.id);
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = `${profile.name.replace(/\s+/g, '-')}-backup.mdbf`;
      link.click();
      toast({ title: "Export Successful", description: `${profile.name} has been exported.` });
    } catch (error) {
      console.error("Export failed:", error);
      toast({ variant: "destructive", title: "Export Failed" });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.name.endsWith('.json') || file.name.endsWith('.mdbf'))) {
      setRestoreFile(file);
      // Immediately try to restore
      handleRestore(file);
    } else {
      setRestoreFile(null);
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please select a valid .json or .mdbf backup file.',
      });
    }
  };

  const handleRestore = async (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Failed to read file.');
        }
        const backupData = JSON.parse(text);
        await dbRestoreProfile(backupData);
        toast({
          title: 'Import Successful',
          description: 'The profile has been restored. The page will now reload.',
        });
        // Reload the page to apply changes and reconnect to DBs
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        console.error('Restore failed:', err);
        toast({
          variant: 'destructive',
          title: 'Import Failed',
          description: 'The backup file is corrupted or invalid.',
        });
      } finally {
        setRestoreFile(null);
        setIsAddDialogOpen(false);
      }
    };
    reader.readAsText(file);
  };
  
  const handleFullBackup = async () => {
    try {
      const backupData = await dbBackup();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
      const link = document.createElement("a");
      link.href = jsonString;
      const date = new Date().toISOString().split('T')[0];
      link.download = `mdbf-full-backup-${date}.json`;
      link.click();
      toast({
        title: "Full Backup Successful",
        description: "All application data has been downloaded.",
      });
    } catch (error) {
      console.error("Full backup failed:", error);
      toast({
        variant: "destructive",
        title: "Full Backup Failed",
      });
    }
  };

  const handleFullRestoreClick = () => {
    fullBackupInputRef.current?.click();
  };

  const handleFullRestoreFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result;
          if (typeof text !== 'string') throw new Error('Failed to read file.');
          const backupData = JSON.parse(text);
          await dbRestore(backupData);
          toast({
            title: 'Full Restore Successful',
            description: 'Application data restored. The page will now reload.',
          });
          setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
          console.error('Full restore failed:', err);
          toast({
            variant: 'destructive',
            title: 'Full Restore Failed',
            description: 'The backup file is invalid or corrupted.',
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleUpdateHomeProfile = async () => {
      if (!profileToEdit || !newProfileName) return;
      const allProfiles = await dbLoad('profiles');
      const profileIndex = allProfiles.findIndex(p => p.id === profileToEdit.id);
      if (profileIndex > -1) {
          allProfiles[profileIndex].name = newProfileName;
          await dbSave('profiles', allProfiles);
          toast({ title: 'Profile Updated', description: `Renamed to ${newProfileName}.` });
          fetchProfiles();
      }
      setProfileToEdit(null);
  }

  const handleDeleteProfile = async () => {
    if (!profileToDelete) return;
    
    const trash = await dbLoad('trash');
    const deletedItem = {
        id: `trash-profile-${profileToDelete.id}-${Date.now()}`,
        type: 'Profile',
        deletedAt: new Date().toISOString(),
        data: profileToDelete
    };
    trash.push(deletedItem);
    await dbSave('trash', trash);
    
    const allProfiles = await dbLoad('profiles');
    const updatedProfiles = allProfiles.filter(p => p.id !== profileToDelete.id);
    await dbClearAndSave('profiles', updatedProfiles);
    setProfiles(updatedProfiles.filter(p => p.id !== 'global-profile'));
    
    const activeAccount = JSON.parse(localStorage.getItem('dukaanxp-active-account') || '{}');
    if (activeAccount.id === profileToDelete.id) {
        localStorage.removeItem('dukaanxp-active-account');
    }

    toast({
        title: 'Profile Deleted',
        description: `${profileToDelete.name} and all its data have been moved to the trash.`,
        variant: 'destructive'
    });
    setProfileToDelete(null);
  };
  
  const openDeleteDialog = (profile: Profile) => {
    setProfileToDelete(profile);
    setDeleteConfirmationCode(String(Math.floor(1000 + Math.random() * 9000)));
    setDeleteConfirmationInput('');
  }

  const openHardResetDialog = () => {
    const code = Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join('');
    setHardResetCode(code);
    setHardResetCodeInput('');
    setAdminPasswordInput('');
    setHardResetStep(1);
    setIsHardResetDialogOpen(true);
  };

  const handleHardReset = async () => {
    if (adminPasswordInput === ADMIN_PASSWORD) {
        await dbReset();
        localStorage.clear();
        toast({
            title: "Application Reset Successful",
            description: "All data has been permanently deleted.",
        });
        setIsHardResetDialogOpen(false);
        router.push('/global-profile');
    } else {
        toast({
            variant: "destructive",
            title: "Incorrect Password",
            description: "The admin password was incorrect. Reset aborted.",
        });
    }
  }


  if (!isMounted) {
    return <div className="flex h-screen items-center justify-center bg-secondary">Loading profiles...</div>;
  }
  
  return (
    <div className="min-h-screen bg-secondary">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8 relative">
          <div className="absolute top-0 left-0 flex flex-col gap-2">
                <Button 
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => router.push('/global-profile')}
                >
                    <User className="h-4 w-4" />
                </Button>
                <ThemeToggle />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleLanguage}>
                    <Languages className="h-4 w-4" />
                </Button>
           </div>
          <div className="flex justify-center items-center gap-2 mb-4">
            <Icons.logo className="size-10 text-primary" />
            <h1 className="text-2xl font-bold">{t('dukaanxp')}</h1>
          </div>
          <h2 className="text-3xl font-bold text-foreground">{globalProfile?.brandName ? `${t('welcomeBack')} ${globalProfile.brandName}!` : t('welcomeBack')}</h2>
          <p className="text-muted-foreground mt-2">{globalProfile?.brandSlogan || t('completeFinancialOverview')}</p>
           <div className="absolute top-0 right-0 flex flex-col gap-2">
                 <Button variant="outline" size="icon" onClick={handleFullBackup} className="h-8 w-8">
                    <DatabaseBackup className="h-4 w-4" />
                </Button>
                 <Button variant="outline" size="icon" onClick={handleFullRestoreClick} className="h-8 w-8">
                    <Upload className="h-4 w-4" />
                </Button>
                 <Input
                    type="file"
                    ref={fullBackupInputRef}
                    className="hidden"
                    onChange={handleFullRestoreFileChange}
                    accept=".json"
                />
                <Button 
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={openHardResetDialog}
                >
                    <AlertTriangle className="h-4 w-4" />
                </Button>
           </div>
        </header>

        <main>
          <Tabs defaultValue="dashboard">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="dashboard">{t('dashboard')}</TabsTrigger>
              <TabsTrigger value="profiles">{t('businessProfiles')}</TabsTrigger>
              <TabsTrigger value="summary">{t('summary')}</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard">
               <GlobalStatsCards stats={globalStats} />
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 my-6">
                    <div className="lg:col-span-3">
                        <GlobalEquityChart accounts={profiles.filter(acc => acc.type === 'Business')} />
                    </div>
                    <div className="lg:col-span-2">
                        <GlobalProfitPieChart accounts={profiles.filter(acc => acc.type === 'Business')} />
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="profiles">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profiles.map(profile => (
                    <Card key={profile.id} className="flex flex-col hover:shadow-lg hover:border-primary transition-all">
                        <CardHeader>
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex items-center gap-4 cursor-pointer flex-grow" onClick={() => selectProfile(profile)}>
                                     {profile.type === 'Business' ? (
                                        profile.logo ? (
                                            <img src={profile.logo} alt={profile.name} className="h-12 w-12 rounded-lg object-contain bg-muted" />
                                        ) : (
                                            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                                                <Briefcase className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                        )
                                    ) : (
                                        <div className="h-12 w-12 rounded-lg bg-blue-900/30 flex items-center justify-center">
                                            <Home className="h-6 w-6 text-blue-400" />
                                        </div>
                                    )}
                                    <div>
                                        <CardTitle>{profile.name}</CardTitle>
                                        <CardDescription>{profile.type} {t('businessProfile')}</CardDescription>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditProfile(profile)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExportProfile(profile)}>
                                        <FileDown className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => openDeleteDialog(profile)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent onClick={() => selectProfile(profile)} className="cursor-pointer flex-grow space-y-2">
                        {profile.type === 'Business' ? (
                            <p className="text-sm"><span className="font-semibold">{t('netProfitThisMonth')}:</span> <span className={profile.netProfit >= 0 ? 'text-green-600' : 'text-destructive'}>PKR {profile.netProfit?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span></p>
                        ) : (
                                <p className="text-sm"><span className="font-semibold">{t('expensesThisMonth')}:</span> <span className="text-destructive">PKR {profile.totalExpenses?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span></p>
                        )}
                        </CardContent>
                        <CardFooter onClick={() => selectProfile(profile)} className="cursor-pointer">
                            <p className="text-xs text-muted-foreground">{t('clickToManage')}</p>
                        </CardFooter>
                    </Card>
                    ))}
                    <Card 
                        className="border-dashed border-2 hover:border-primary hover:text-primary transition-all cursor-pointer flex items-center justify-center min-h-[200px]"
                        onClick={() => setIsAddDialogOpen(true)}
                    >
                        <div className="text-center text-muted-foreground">
                            <Icons.plus className="mx-auto h-8 w-8 mb-2" />
                            <p>{t('addProfile')}</p>
                        </div>
                    </Card>
                </div>
            </TabsContent>
             <TabsContent value="summary">
                <GlobalSummaryAdvanced />
            </TabsContent>
          </Tabs>
        </main>
      </div>

       <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addProfile')}</DialogTitle>
            <DialogDescription>
              Create a new business or personal home profile.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              <Button onClick={() => { setIsAddDialogOpen(false); router.push('/create-business') }}>
                <Briefcase className="mr-2 h-4 w-4" /> {t('createNewBusiness')}
              </Button>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="home-profile-name">Home Profile Name</Label>
                <Input
                  id="home-profile-name"
                  placeholder="e.g., My Home, Personal"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                />
                 <Button onClick={handleCreateHomeProfile} className="w-full">
                    <Home className="mr-2 h-4 w-4" /> {t('createNewHome')}
                </Button>
              </div>
              <Separator />
              <Button variant="secondary" onClick={handleImportClick}>
                <Upload className="mr-2 h-4 w-4" /> {t('importProfile')}
              </Button>
              <Input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept=".json,.mdbf"
              />
          </div>
          <DialogFooter>
             <DialogClose asChild>
                <Button variant="outline">{t('cancel')}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <Dialog open={!!profileToEdit && profileToEdit.type === 'Home'} onOpenChange={(open) => !open && setProfileToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Home Profile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="home-profile-name-edit" className="text-right">
                  Name
                </Label>
                <Input
                  id="home-profile-name-edit"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="col-span-3"
                />
              </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleUpdateHomeProfile}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!profileToUnlock} onOpenChange={(open) => !open && setProfileToUnlock(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Enter Password for {profileToUnlock?.name}</DialogTitle>
                <DialogDescription>
                    This business profile is password protected.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="profile-password">Password</Label>
                <Input
                    id="profile-password"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                    autoFocus
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setProfileToUnlock(null)}>Cancel</Button>
                <Button onClick={handleUnlock}>Unlock</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!profileToDelete} onOpenChange={(open) => !open && setProfileToDelete(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                    This action is permanent and cannot be undone. This will move the profile <span className="font-semibold text-foreground">{profileToDelete?.name}</span> and <span className="font-bold text-destructive">ALL</span> its associated data (sales, purchases, etc.) to the trash.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <p className="text-sm">To confirm, please type <code className="font-mono text-base bg-muted px-2 py-1 rounded-md">{deleteConfirmationCode}</code> in the box below.</p>
                <Input
                    value={deleteConfirmationInput}
                    onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                    placeholder="Enter the code to confirm"
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setProfileToDelete(null)}>Cancel</Button>
                <Button 
                    variant="destructive" 
                    onClick={handleDeleteProfile} 
                    disabled={deleteConfirmationInput !== deleteConfirmationCode}
                >
                    Delete Profile
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isHardResetDialogOpen} onOpenChange={setIsHardResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="text-destructive"/>
                HARD RESET CONFIRMATION
            </DialogTitle>
            <DialogDescription>
                This action is irreversible and will permanently delete all application data.
            </DialogDescription>
          </DialogHeader>
          {hardResetStep === 1 && (
            <div className="py-4 space-y-4">
                <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground">
                    <p className="font-bold">WARNING: YOU ARE ABOUT TO DELETE EVERYTHING.</p>
                    <p className="font-bold" dir="rtl">انتباہ: آپ تمام ڈیٹا کو مستقل طور پر حذف کرنے والے ہیں۔</p>
                </div>
                <p>To proceed, please type the following confirmation code:</p>
                <p className="text-center font-mono text-lg tracking-widest bg-muted p-2 rounded-md select-all">{hardResetCode}</p>
                <Input
                    value={hardResetCodeInput}
                    onChange={(e) => setHardResetCodeInput(e.target.value)}
                    placeholder="Enter the 15-digit code to confirm"
                />
            </div>
          )}
           {hardResetStep === 2 && (
            <div className="py-4 space-y-4">
                <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground">
                    <p className="font-bold">FINAL WARNING: THIS IS YOUR LAST CHANCE.</p>
                    <p className="font-bold" dir="rtl">آخری انتباہ: یہ آپ کا آخری موقع ہے۔</p>
                </div>
                <p>Enter the admin password to permanently erase all data.</p>
                <Input
                    type="password"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Enter admin password"
                />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHardResetDialogOpen(false)}>Cancel</Button>
            {hardResetStep === 1 && (
                <Button 
                    variant="destructive" 
                    onClick={() => setHardResetStep(2)}
                    disabled={hardResetCodeInput !== hardResetCode}
                >
                    Confirm Code
                </Button>
            )}
             {hardResetStep === 2 && (
                <Button 
                    variant="destructive"
                    onClick={handleHardReset}
                    disabled={adminPasswordInput !== ADMIN_PASSWORD}
                >
                    DELETE ALL DATA
                </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
