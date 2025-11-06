
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Icons } from "@/components/icons";
import { useLanguage } from "@/hooks/use-language";
import { Label } from "../ui/label";
import { useAccessControl } from "@/hooks/use-access-control";

export function AppearanceSettings() {
  const { t, toggleLanguage, language } = useLanguage();
  const { isReadOnly } = useAccessControl();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("appearanceAndLanguage")}</CardTitle>
        <CardDescription>Customize the look and feel of the application.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label>Theme</Label>
            <p className="text-sm text-muted-foreground">Switch between light and dark mode.</p>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label>Language</Label>
            <p className="text-sm text-muted-foreground">Change the application's language.</p>
          </div>
          <Button variant="outline" onClick={toggleLanguage} disabled={isReadOnly}>
             <Icons.languages className="mr-2 h-4 w-4" />
            {language === 'en' ? 'Switch to Urdu' : 'انگریزی میں تبدیل کریں'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
