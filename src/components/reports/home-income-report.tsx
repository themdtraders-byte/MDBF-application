
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";

export function HomeIncomeReport() {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Report</CardTitle>
        <CardDescription>A detailed breakdown of your personal income.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">The "Income" module for personal accounts has not been implemented yet. Once added, your income transactions will appear here.</p>
      </CardContent>
    </Card>
  );
}
