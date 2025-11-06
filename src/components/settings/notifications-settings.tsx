
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { useAccessControl } from "@/hooks/use-access-control";

export function NotificationsSettings() {
  const { t } = useLanguage();
  const { isReadOnly } = useAccessControl();

  // These would be hooked up to a state management system
  const notifications = [
    { id: "low-stock", label: "Low Stock Alerts", description: "Get notified when an item's stock falls below its threshold." },
    { id: "payment-due", label: "Payment Reminders", description: "Reminders for upcoming or overdue customer payments." },
    { id: "payable-due", label: "Payable Reminders", description: "Reminders for upcoming bills to suppliers." },
    { id: "backup-reminder", label: "Backup Reminders", description: "Periodically remind you to back up your application data." },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("notifications")}</CardTitle>
        <CardDescription>Manage how and when you receive alerts and reminders.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications.map(notification => (
           <div key={notification.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor={notification.id} className="text-base">{notification.label}</Label>
              <p className="text-sm text-muted-foreground">{notification.description}</p>
            </div>
            <Switch id={notification.id} disabled={isReadOnly} />
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-4">Note: This is a placeholder UI. Notification functionality is not yet implemented.</p>
      </CardContent>
    </Card>
  );
}
