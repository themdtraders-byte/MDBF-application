"use client";

import { useLanguage } from "@/hooks/use-language";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation";
import { useSearch } from "@/hooks/use-search";
import { useAccessControl } from "@/hooks/use-access-control";


const businessQuickAddItems = [
  {
    label: "newSale",
    icon: Icons.newSale,
    href: "/sales?tab=new-sale",
  },
  {
    label: "newPurchase",
    icon: Icons.newPurchase,
    href: "/purchases?tab=new-purchase",
  },
  {
    label: "addExpense",
    icon: Icons.addExpense,
    href: "/expenses?tab=add-expense",
  },
   {
    label: "addCustomer",
    icon: Icons.addCustomer,
    href: "/customers?tab=add-customer",
  },
  {
    label: "addSupplier",
    icon: Icons.addSupplier,
    href: "/suppliers?tab=add-supplier",
  },
  {
    label: "addItem",
    icon: Icons.addItem,
    href: "/inventory?tab=add-item",
  },
];

const homeQuickAddItems = [
    {
        label: "addExpense",
        icon: Icons.addExpense,
        href: "/expenses?tab=add-expense",
    },
]


export function Header() {
  const { t, toggleLanguage, language } = useLanguage();
  const { searchTerm, setSearchTerm } = useSearch();
  const { isReadOnly } = useAccessControl();
  const router = useRouter();
  const [activeAccount, setActiveAccount] = useState<any>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  useEffect(() => {
    const account = localStorage.getItem('dukaanxp-active-account');
    if(account) {
      setActiveAccount(JSON.parse(account));
    }
  }, []);

  const handleQuickAdd = (href: string) => {
    router.push(href);
    setIsQuickAddOpen(false);
  }

  const dateLocale = language === 'ur' ? enUS : enUS;

  const isHomeAccount = activeAccount?.type === 'Home';
  const quickAddItems = isHomeAccount ? homeQuickAddItems : businessQuickAddItems;

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-secondary px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <div className="flex flex-col">
            <h1 className="text-lg font-semibold md:text-xl">{activeAccount?.name || t("dashboard")}</h1>
            <p className="text-xs text-muted-foreground">{format(new Date(), "MMMM yyyy", { locale: dateLocale })}</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-end gap-4">
        {isHomeAccount ? (
            <Button onClick={() => handleQuickAdd('/expenses?tab=add-expense')} disabled={isReadOnly}>
              <Icons.plus className="mr-2 h-4 w-4" />
              {t('addExpense')}
            </Button>
        ) : (
            <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
            <DialogTrigger asChild>
                <Button disabled={isReadOnly}>
                <Icons.plus className="mr-2 h-4 w-4" />
                {t('quickAdd')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>{t('quickAdd')}</DialogTitle>
                <DialogDescription>
                    Quickly add a new entry to your records.
                </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
                {quickAddItems.map((item) => (
                    <Button
                    key={item.label}
                    variant="outline"
                    className="h-20 flex-col gap-1"
                    onClick={() => handleQuickAdd(item.href)}
                    >
                    <item.icon className="h-6 w-6" />
                    <span>{t(item.label as keyof any)}</span>
                    </Button>
                ))}
                </div>
            </DialogContent>
            </Dialog>
        )}
        <div className="relative w-full max-w-sm hidden md:block">
          <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("searchPlaceholder")}
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleLanguage}
          aria-label="Toggle language"
        >
          <Icons.languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </div>
    </header>
  );
}
