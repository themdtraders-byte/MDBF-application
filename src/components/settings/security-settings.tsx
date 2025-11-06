
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { dbLoad, dbSave } from "@/lib/db";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SecuritySettings() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeAccount, setActiveAccount] = useState<any>(null);
  const [editPassword, setEditPassword] = useState("");
  const [viewPassword, setViewPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showViewPassword, setShowViewPassword] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const accountInfo = localStorage.getItem('dukaanxp-active-account');
      if (accountInfo) {
        const parsedInfo = JSON.parse(accountInfo);
        const profiles = await dbLoad("profiles");
        const fullProfile = profiles.find(p => p.id === parsedInfo.id);
        if (fullProfile) {
          setActiveAccount(fullProfile);
          setEditPassword(fullProfile.editPassword || "");
          setViewPassword(fullProfile.viewPassword || "");
        }
      }
    };
    fetchProfile();
  }, []);
  
  const handleSavePasswords = async () => {
      if (!activeAccount || activeAccount.type !== 'Business') {
          toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'Passwords can only be set for business profiles.' });
          return;
      }
      if (editPassword && editPassword.length < 4) {
          toast({ variant: 'destructive', title: 'Weak Password', description: 'Full Access Password must be at least 4 characters long.' });
          return;
      }

      try {
        const allProfiles = await dbLoad("profiles");
        const profileIndex = allProfiles.findIndex(p => p.id === activeAccount.id);
        if (profileIndex > -1) {
            allProfiles[profileIndex].editPassword = editPassword;
            allProfiles[profileIndex].viewPassword = viewPassword;
            await dbSave("profiles", allProfiles);
            toast({ title: "Passwords Saved", description: "Your business profile passwords have been updated." });
        }
      } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to save passwords.' });
      }
  };

  const handleRemovePasswords = async () => {
      if (!activeAccount) return;
       try {
        const allProfiles = await dbLoad("profiles");
        const profileIndex = allProfiles.findIndex(p => p.id === activeAccount.id);
        if (profileIndex > -1) {
            delete allProfiles[profileIndex].editPassword;
            delete allProfiles[profileIndex].viewPassword;
            await dbSave("profiles", allProfiles);
            setEditPassword("");
            setViewPassword("");
            toast({ title: "Passwords Removed", description: "Password protection has been disabled." });
        }
      } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove passwords.' });
      }
  }

  const isBusinessProfile = activeAccount?.type === 'Business';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("security")}</CardTitle>
        <CardDescription>Manage app lock and other security features for your business profile.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isBusinessProfile ? (
          <>
            <div>
              <Label htmlFor="edit-password">Full Access Password</Label>
              <p className="text-sm text-muted-foreground mb-2">Set a password to allow full read & write access to this profile.</p>
              <div className="relative">
                  <Input
                    id="edit-password"
                    type={showEditPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Enter full access password"
                  />
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowEditPassword(!showEditPassword)}>
                    {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
              </div>
            </div>
             <div>
              <Label htmlFor="view-password">View-Only Password (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">Set a password that only allows viewing data without any editing capability.</p>
              <div className="relative">
                  <Input
                    id="view-password"
                    type={showViewPassword ? "text" : "password"}
                    value={viewPassword}
                    onChange={(e) => setViewPassword(e.target.value)}
                    placeholder="Enter view-only password"
                  />
                   <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowViewPassword(!showViewPassword)}>
                    {showViewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">Password protection is only available for Business profiles. Your current active profile is a 'Home' account.</p>
        )}
      </CardContent>
       <CardFooter className="flex justify-between">
        {isBusinessProfile && (
            <>
                <Button onClick={handleSavePasswords}>Save Passwords</Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Protection
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will remove all password protection from this business profile, allowing anyone to access it.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRemovePasswords}>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </>
        )}
      </CardFooter>
    </Card>
  );
}
