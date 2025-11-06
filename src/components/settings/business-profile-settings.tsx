
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useLanguage } from "@/hooks/use-language";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dbLoad } from "@/lib/db";

export function BusinessProfileSettings() {
  const { t } = useLanguage();
  const router = useRouter();
  const [activeAccount, setActiveAccount] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const accountInfo = localStorage.getItem('dukaanxp-active-account');
      if (accountInfo) {
        const parsedInfo = JSON.parse(accountInfo);
        const profiles = await dbLoad("profiles");
        const fullProfile = profiles.find(p => p.id === parsedInfo.id);
        if (fullProfile) {
          setActiveAccount(fullProfile);
        }
      }
    };
    fetchProfile();
  }, []);

  const handleEditProfile = () => {
    if (activeAccount && activeAccount.type === 'Business') {
      // The edit page reuses the create-business page. It identifies the profile to edit via localStorage.
      localStorage.setItem('dukaanxp-business-profile-to-edit', JSON.stringify(activeAccount));
      router.push('/create-business');
    }
  };

  const isBusinessProfile = activeAccount?.type === 'Business';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("businessProfile")}</CardTitle>
        <CardDescription>View and edit your business details.</CardDescription>
      </CardHeader>
      <CardContent>
        {activeAccount ? (
            isBusinessProfile ? (
            <p>Click the button below to edit your business name, address, logo, and other information.</p>
            ) : (
            <p>Business profile settings can only be edited for a business account. Your current active profile is a 'Home' account.</p>
            )
        ) : (
            <p>Loading profile information...</p>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleEditProfile} disabled={!isBusinessProfile}>
            <Icons.settings className="mr-2" />
            Edit Business Profile
        </Button>
      </CardFooter>
    </Card>
  );
}
