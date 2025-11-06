
"use client";
import Dexie, { type EntityTable } from 'dexie';

// Define the shape of your data objects.
// These are repeated here for Dexie's awareness.
// We will keep them in sync with the main application types.

interface Profile {
  id: string;
  name: string;
  type: 'Business' | 'Home';
  [key: string]: any;
}

interface Account {
  id: string;
  name: string;
  type: "Cash" | "Bank" | "Mobile Wallet";
  balance: number;
  [key: string]: any;
}

interface Sale {
  invoiceNumber: string;
  [key: string]: any;
}

interface Purchase {
  billNumber: string;
  [key: string]: any;
}

interface Expense {
  id: string;
  [key: string]: any;
}

interface Customer {
  id: string;
  [key: string]: any;
}

interface Supplier {
  id: string;
  [key: string]: any;
}

interface InventoryItem {
  id: string;
  [key: string]: any;
}

interface Worker {
  id: string;
  [key: string]: any;
}

interface SalaryTransaction {
  id: string;
  [key: string]: any;
}

interface ProductionHistory {
  batchCode: string;
  [key: string]: any;
}

interface Transfer {
  id: string;
  [key: string]: any;
}

interface AttendanceRecord {
    id: string;
    [key: string]: any;
}

interface CustomerType {
    id: string;
    [key: string]: any;
}

interface SupplierType {
    id: string;
    [key: string]: any;
}

interface WorkerRole {
    id: string;
    [key: string]: any;
}

interface ExpenseCategory {
    id: string;
    [key: string]: any;
}

interface Reminder {
    id: string;
    [key:string]: any;
}

interface TrashItem {
    id: string;
    [key: string]: any;
}

interface ProfitSplit {
    id: string;
    [key: string]: any;
}

interface StockAdjustment {
    id: string;
    [key: string]: any;
}


const GLOBAL_SCHEMA = {
    profiles: 'id',
    accounts: 'id',
    trash: 'id',
    'customer-types': 'id',
    'supplier-types': 'id',
    'worker-roles': 'id',
    'business-expense-categories': 'id',
    'home-expense-categories': 'id',
    'profit-splits': 'id',
    reminders: 'id',
};

const PROFILE_SCHEMA = {
    sales: 'invoiceNumber',
    purchases: 'billNumber',
    expenses: 'id',
    customers: 'id',
    suppliers: 'id',
    inventory: 'id',
    workers: 'id',
    'salary-transactions': 'id',
    'production-history': 'batchCode',
    transfers: 'id',
    attendance: 'id',
    'stock-adjustments': 'id',
};


// Centralized function to get the active profile ID
const getActiveProfileId = (): string | null => {
    if (typeof window === 'undefined') return null;
    const account = localStorage.getItem('dukaanxp-active-account');
    if (account) {
        try {
            return JSON.parse(account).id || null;
        } catch {
            return null;
        }
    }
    return null;
}

// We create a class that encompasses all database access for a given profile.
class ProfileDB extends Dexie {
    sales!: EntityTable<Sale, 'invoiceNumber'>;
    purchases!: EntityTable<Purchase, 'billNumber'>;
    expenses!: EntityTable<Expense, 'id'>;
    customers!: EntityTable<Customer, 'id'>;
    suppliers!: EntityTable<Supplier, 'id'>;
    inventory!: EntityTable<InventoryItem, 'id'>;
    workers!: EntityTable<Worker, 'id'>;
    'salary-transactions'!: EntityTable<SalaryTransaction, 'id'>;
    'production-history'!: EntityTable<ProductionHistory, 'batchCode'>;
    transfers!: EntityTable<Transfer, 'id'>;
    attendance!: EntityTable<AttendanceRecord, 'id'>;
    'stock-adjustments'!: EntityTable<StockAdjustment, 'id'>;

    constructor(dbName: string) {
        super(dbName);
        this.version(1).stores(PROFILE_SCHEMA);
    }
}

// Global DB for data that is not profile-specific
class GlobalDB extends Dexie {
    profiles!: EntityTable<Profile, 'id'>;
    accounts!: EntityTable<Account, 'id'>;
    trash!: EntityTable<TrashItem, 'id'>;
    'customer-types'!: EntityTable<CustomerType, 'id'>;
    'supplier-types'!: EntityTable<SupplierType, 'id'>;
    'worker-roles'!: EntityTable<WorkerRole, 'id'>;
    'business-expense-categories'!: EntityTable<ExpenseCategory, 'id'>;
    'home-expense-categories'!: EntityTable<ExpenseCategory, 'id'>;
    'profit-splits'!: EntityTable<ProfitSplit, 'id'>;
    reminders!: EntityTable<Reminder, 'id'>;

    constructor() {
        super('DukaanXP_Global');
        this.version(1).stores(GLOBAL_SCHEMA);
    }
}

const globalDb = new GlobalDB();
const profileDbCache: { [key: string]: ProfileDB } = {};

function getDb(key: string): Dexie | null {
    const globalKeys = Object.keys(GLOBAL_SCHEMA);

    if (globalKeys.includes(key)) {
        return globalDb;
    }
    
    const activeAccount = typeof window !== 'undefined' ? localStorage.getItem('dukaanxp-active-account') : null;
    let profileId: string | null = null;
    if (activeAccount) {
        try {
            profileId = JSON.parse(activeAccount).id;
        } catch (e) {
            console.error("Error parsing active account", e);
        }
    }
    
    if (!profileId) {
        console.warn(`Attempted to access profile-specific data key "${key}" without an active profile.`);
        return null;
    }
    
    const dbName = `DukaanXP_Profile_${profileId}`;
    if (!profileDbCache[dbName]) {
        profileDbCache[dbName] = new ProfileDB(dbName);
    }

    return profileDbCache[dbName];
}

export async function dbLoad(key: string): Promise<any[]> {
    if (typeof window === 'undefined') return [];
    const db = getDb(key) as any;
    if (!db || !db[key]) return [];

    try {
        return await db[key].toArray();
    } catch (e) {
        console.error(`Failed to load data for key: ${key}`, e);
        return [];
    }
}

export async function dbSave(key: string, data: any[]): Promise<void> {
    if (typeof window === 'undefined') return;
    const db = getDb(key) as any;
    if (!db || !db[key]) return;

    try {
        await db[key].bulkPut(data);
    } catch (e) {
        console.error(`Failed to save data for key: ${key}`, e);
    }
}

export async function dbClearAndSave(key: string, data: any[]): Promise<void> {
    if (typeof window === 'undefined') return;
    const db = getDb(key) as any;
    if (!db || !db[key]) return;
    try {
        await db.transaction('rw', db[key], async () => {
            await db[key].clear();
            await db[key].bulkPut(data);
        });
    } catch (e) {
        console.error(`Failed to clear and save data for key: ${key}`, e);
    }
}

export async function dbReset(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    // Close all cached DB connections
    Object.values(profileDbCache).forEach(db => {
        if (db.isOpen()) db.close();
    });
    if (globalDb.isOpen()) globalDb.close();
    
    // Clear the cache
    Object.keys(profileDbCache).forEach(key => delete profileDbCache[key]);
    
    const dbs = await Dexie.getDatabaseNames();
    for (const dbName of dbs) {
        if (dbName.startsWith('DukaanXP_')) {
            try {
                const dbToDelete = new Dexie(dbName);
                await dbToDelete.delete();
                console.log(`Deleted database: ${dbName}`);
            } catch (e) {
                console.error(`Failed to delete database ${dbName}:`, e);
            }
        }
    }
}


export async function dbBackupProfile(profileId: string): Promise<any> {
  const profileDbName = `DukaanXP_Profile_${profileId}`;
  const profileData: { [tableName: string]: any[] } = {};

  // 1. Get the profile object from the global DB
  const profiles = await globalDb.table('profiles').toArray();
  const profileToBackup = profiles.find(p => p.id === profileId);
  if (!profileToBackup) {
    throw new Error('Profile not found for backup.');
  }

  // 2. Backup the profile's own database
  const db = new ProfileDB(profileDbName);
  if (!db.isOpen()) {
    await db.open();
  }

  for (const tableName of Object.keys(PROFILE_SCHEMA)) {
    try {
      const tableData = await db.table(tableName).toArray();
      profileData[tableName] = tableData;
    } catch (e) {
      console.error(`Could not back up table ${tableName} from ${profileDbName}`, e);
    }
  }

  if (db.isOpen()) {
    db.close();
  }

  // 3. Combine into a single export object
  return {
    profile: profileToBackup,
    profileData: profileData,
  };
}


export async function dbRestoreProfile(backupData: any): Promise<void> {
  if (!backupData || !backupData.profile || !backupData.profileData) {
    throw new Error('Invalid backup file format.');
  }

  let { profile, profileData } = backupData;
  let newProfileId = profile.id;

  // Check if a profile with this ID already exists
  const existingProfile = await globalDb.table('profiles').get(newProfileId);
  if (existingProfile) {
    // If it exists, create a new unique ID for the imported profile
    newProfileId = `${profile.type.toLowerCase()}-${Date.now()}`;
    profile.id = newProfileId;
  }

  // 1. Add the profile to the global profiles table
  await globalDb.table('profiles').add(profile);

  // 2. Create and populate the new profile's database
  const dbName = `DukaanXP_Profile_${newProfileId}`;
  const db = new ProfileDB(dbName);
  await db.open();

  for (const tableName in profileData) {
    if (Object.keys(PROFILE_SCHEMA).includes(tableName)) {
      try {
        await db.table(tableName).bulkPut(profileData[tableName]);
      } catch (e) {
        console.error(`Error restoring table ${tableName} for profile ${newProfileId}`, e);
        // If one table fails, we should ideally roll back, but for now we'll log and continue
      }
    }
  }

  db.close();
}


export async function dbExport(): Promise<string> {
    let allCsvContent = "";
    
    // We can't easily export *all* profiles to one CSV this way.
    // This needs to be rethought. For now, let's make it export the active profile.
    const profileId = getActiveProfileId();
    if (!profileId) {
        return "Error: No active profile selected.";
    }

    const backupData = await dbBackupProfile(profileId);
    
    const { profile, profileData } = backupData;
    
    allCsvContent += `\n"Profile: ${profile.name} (${profile.id})"\n`;
    
    for (const tableName in profileData) {
        const tableData = profileData[tableName];
         if (tableData.length > 0) {
            allCsvContent += `\n"${tableName}"\n`;
            const headers = Object.keys(tableData[0]);
            allCsvContent += headers.map(h => `"${h}"`).join(',') + '\n';
            tableData.forEach(row => {
                const values = headers.map(header => {
                    const value = row[header];
                    if (typeof value === 'string' && value.includes(',')) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    if (typeof value === 'object' && value !== null) {
                        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                    }
                    return value;
                });
                allCsvContent += values.join(',') + '\n';
            });
        }
    }

    return allCsvContent;
}

export function getStorageKey(key: string): string {
    const globalKeys = Object.keys(GLOBAL_SCHEMA);
    if (globalKeys.includes(key)) {
        return `DukaanXP_Global`;
    }

    const profileId = getActiveProfileId();
    if (!profileId) {
        throw new Error(`Cannot determine storage key for "${key}" without an active profile.`);
    }
    return `DukaanXP_Profile_${profileId}`;
}

export async function dbBackup(): Promise<any> {
    const backupData: {
        global: { [tableName: string]: any[] };
        profiles: { [profileId: string]: { profile: any; profileData: any } };
    } = {
        global: {},
        profiles: {},
    };

    // 1. Backup Global DB
    for (const tableName of Object.keys(GLOBAL_SCHEMA)) {
        backupData.global[tableName] = await globalDb.table(tableName).toArray();
    }

    // 2. Backup all Profile DBs
    const allProfiles: Profile[] = backupData.global.profiles || [];
    for (const profile of allProfiles) {
        try {
            backupData.profiles[profile.id] = await dbBackupProfile(profile.id);
        } catch (e) {
            console.error(`Skipping backup for profile ${profile.id}:`, e);
        }
    }

    return backupData;
}

export async function dbRestore(backupData: any): Promise<void> {
  if (!backupData || !backupData.global || !backupData.profiles) {
    throw new Error("Invalid full backup file format.");
  }

  // 1. Clear all current data without deleting databases
  // Clear global DB
  for (const tableName of Object.keys(GLOBAL_SCHEMA)) {
    try {
      await globalDb.table(tableName).clear();
    } catch (e) {
      console.error(`Error clearing global table ${tableName}`, e);
    }
  }

  // Clear all existing profile DBs
  const currentProfiles: Profile[] = await dbLoad("profiles"); // Load from empty state
  const dbs = await Dexie.getDatabaseNames();
  for (const dbName of dbs) {
      if (dbName.startsWith('DukaanXP_Profile_')) {
          try {
              const db = new ProfileDB(dbName);
              await db.open();
              for (const tableName of Object.keys(PROFILE_SCHEMA)) {
                  await db.table(tableName).clear();
              }
              db.close();
          } catch (e) {
              console.error(`Failed to clear database ${dbName}`, e);
          }
      }
  }

  // 2. Restore Global DB data
  for (const tableName in backupData.global) {
    if (Object.keys(GLOBAL_SCHEMA).includes(tableName)) {
      try {
        await globalDb.table(tableName).bulkPut(backupData.global[tableName]);
      } catch (e) {
        console.error(`Error restoring global table ${tableName}`, e);
      }
    }
  }

  // 3. Restore all Profile DBs data
  for (const profileId in backupData.profiles) {
    const profileBackup = backupData.profiles[profileId];
    if (profileBackup.profile && profileBackup.profileData) {
      const dbName = `DukaanXP_Profile_${profileId}`;
      const db = new ProfileDB(dbName);
      await db.open();

      for (const tableName in profileBackup.profileData) {
        if (Object.keys(PROFILE_SCHEMA).includes(tableName)) {
          try {
            await db.table(tableName).bulkPut(profileBackup.profileData[tableName]);
          } catch (e) {
            console.error(`Error restoring table ${tableName} for profile ${profileId}`, e);
          }
        }
      }
      db.close();
    }
  }
}
