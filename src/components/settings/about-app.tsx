
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { Icons } from "@/components/icons";
import { Separator } from "../ui/separator";

export function AboutAppSettings() {
  const { t } = useLanguage();
  const appVersion = "0.2.3";

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center items-center gap-2 mb-2">
            <Icons.logo className="size-12 text-primary" />
            <h1 className="text-3xl font-bold">{t('dukaanxp')}</h1>
        </div>
        <CardTitle>{t('version', { version: appVersion })}</CardTitle>
        <CardDescription>{t('appSlogan')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">{t('developedBy')}</h3>
          <p className="text-muted-foreground">M. Danial Abubakar</p>
        </div>
        <Separator />
        <div>
          <h3 className="text-lg font-semibold mb-2">{t('keyFeatures')}</h3>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>{t('feature_dashboard')}</li>
            <li>{t('feature_sales_purchase')}</li>
            <li>{t('feature_inventory')}</li>
            <li>{t('feature_finance')}</li>
            <li>{t('feature_production')}</li>
            <li>{t('feature_employee')}</li>
            <li>{t('feature_multi_profile')}</li>
            <li>{t('feature_offline')}</li>
            <li>{t('feature_bilingual')}</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
         <p className="text-xs text-muted-foreground text-center w-full">© {new Date().getFullYear()} {t('dukaanxp')}. {t('allRightsReserved')}</p>
      </CardFooter>
    </Card>
  );
}
