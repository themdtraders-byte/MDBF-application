
import type { SVGProps } from "react";
import {
  Users,
  Truck,
  Package,
  ShoppingCart,
  LayoutDashboard,
  Settings,
  LogOut,
  Languages,
  Search,
  ChevronRight,
  Printer,
  FileDown,
  CreditCard,
  DollarSign,
  AlertTriangle,
  Bell,
  Briefcase,
  Building2,
  Calendar as CalendarIcon,
  Factory,
  Store,
  Warehouse,
  User,
  Phone,
  MapPin,
  Image as ImageIcon,
  ArrowDown,
  ArrowUp,
  Banknote,
  BarChart,
  BookOpen,
  Plus,
  TrendingUp,
  Wallet,
  type LucideIcon,
  ChevronDown,
  Receipt,
  ClipboardList,
  Coins,
  ArrowLeftRight,
  PackagePlus,
  PackageSearch,
  ArchiveRestore,
  UserPlus,
  BookUser,
  CircleDollarSign,
  FileText,
  FileBarChart2,
  DatabaseBackup,
  History,
  Palette,
  FileCog,
  FileJson,
  Database,
  UsersRound,
  FileBarChart,
  Shield,
  Info,
  Landmark,
  Tag,
  Hammer,
  BookCopy,
  Repeat,
  FileSignature,
  Notebook,
  AreaChart,
  UserCog,
  Trash2,
  Check,
  Instagram,
  Facebook,
  Youtube,
  X,
  PieChart,
  HandCoins,
  Handshake,
  PiggyBank,
  Scale
} from "lucide-react";

export type Icon = LucideIcon;

export const Icons = {
  dashboard: LayoutDashboard,
  customers: Users,
  suppliers: Truck,
  inventory: Package,
  sales: TrendingUp,
  expenses: ArrowDown,
  reports: BarChart,
  settings: Settings,
  logout: LogOut,
  languages: Languages,
  search: Search,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  print: Printer,
  export: FileDown,
  creditCard: CreditCard,
  dollarSign: DollarSign,
  alertTriangle: AlertTriangle,
  bell: Bell,
  briefcase: Briefcase,
  building2: Building2,
  calendar: CalendarIcon,
  factory: Factory,
  store: Store,
  warehouse: Warehouse,
  user: User,
  phone: Phone,
  mapPin: MapPin,
  image: ImageIcon,
  plus: Plus,
  Plus,
  purchases: ShoppingCart,
  newSale: Plus,
  allSales: Receipt,
  paymentsReceived: Coins,
  newPurchase: Plus,
  allPurchases: ClipboardList,
  paymentsMade: ArrowLeftRight,
  addExpense: Plus,
  expenseCategories: Package,
  expenseSummary: BarChart,
  addItem: PackagePlus,
  allItems: PackageSearch,
  lowStockAlerts: AlertTriangle,
  stockAdjustments: ArrowLeftRight,
  addCustomer: UserPlus,
  customerList: BookUser,
  outstandingPayments: CircleDollarSign,
  addSupplier: UserPlus,
  supplierList: BookUser,
  pendingPayables: CircleDollarSign,
  salesReport: FileText,
  expenseReport: FileText,
  profitAndLoss: FileBarChart,
  stockReport: FileText,
  customerSupplierLedger: BookUser,
  backup: DatabaseBackup,
  restore: ArchiveRestore,
  data: Database,
  businessInfo: Briefcase,
  taxAndCurrency: DollarSign,
  invoiceLayout: FileCog,
  userPreferences: Palette,
  workers: Users,
  UserPlus,
  users: Users,
  database: Database,
  palette: Palette,
  shield: Shield,
  info: Info,
  accounts: Landmark,
  tag: Tag,
  production: Hammer,
  payments: BookCopy,
  invoices: FileSignature,
  transfers: Repeat,
  notes: Notebook,
  graphs: AreaChart,
  userRoles: UserCog,
  historyLog: History,
  History,
  Wallet,
  Notebook,
  trash: Trash2,
  check: Check,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  x: X,
  pieChart: PieChart,
  receivables: HandCoins,
  payables: Handshake,
  piggyBank: PiggyBank,
  originalProfit: Scale,
  whatsapp: (props: SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19.11 4.93A9.87 9.87 0 0 0 12.005.005c-5.46 0-9.89 4.43-9.89 9.89a9.87 9.87 0 0 0 1.93 5.88l-2.02 7.27 7.43-1.95a9.87 9.87 0 0 0 5.58 1.91h.005c5.46 0 9.89-4.43 9.89-9.89a9.87 9.87 0 0 0-4.83-8.18zM12.005 21.8c-1.85 0-3.57-.49-5.07-1.35l-.36-.21-3.77 1 .99-3.67-.23-.37a8.03 8.03 0 0 1-1.4-4.23c0-4.42 3.59-8.01 8.01-8.01s8.01 3.59 8.01 8.01-3.59 8.01-8.01 8.01zm4.23-5.55c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94s-.28.16-.52.04c-.24-.12-1.02-.38-1.94-1.2-1.46-1.28-2.1-2.28-2.34-2.68-.08-.12 0-.2.1-.31s.24-.28.36-.42.12-.2.18-.32.03-.2-.03-.32c-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.42h-.48c-.16 0-.42.06-.64.3s-.88.86-.88 2.1c0 1.24.9 2.44 1.02 2.6s1.77 2.7 4.3 3.78 1.7.94 2.28.78c.58-.16.94-.68 1.08-1.3.14-.62.14-1.16.1-1.28-.04-.12-.16-.2-.36-.32z"/>
    </svg>
  ),
  tiktok: (props: SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16.6 5.82s.51.5 0 0A4.24 4.24 0 0 1 12.3 3v10.2a4.34 4.34 0 0 1-4.33 4.31 4.33 4.33 0 0 1-4.32-4.31S4 5.82 8 5.82a4.24 4.24 0 0 1 4.3 2.53v0" />
    </svg>
  ),
  logo: (props: SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" {...props}>
      <path fill="#FFD200" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h1v-2H12c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8v1h2V12c0-5.52-4.48-10-10-10zM11 6v12h-1c-2.76 0-5-2.24-5-5s2.24-5 5-5h1z"/>
      <path fill="#000000" d="M13 6v12h1c2.76 0 5-2.24 5-5s-2.24-5-5-5h-1z"/>
      <path fill="#FFFFFF" d="M14.5 7.5c.28 0 .5.22.5.5s-.22.5-.5.5-.5-.22-.5-.5.22-.5.5-.5zm0 5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
      <path fill="#FFFFFF" d="M16 8.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
    </svg>
  ),
};
