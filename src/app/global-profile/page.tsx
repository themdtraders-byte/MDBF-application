
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Icons } from "@/components/icons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Phone, MapPin, Image as ImageIcon, Text, Building, Badge } from "lucide-react";
import { dbLoad, dbSave } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  ownerName: z.string().min(2, "Owner name is required."),
  phone: z.string().optional(),
  address: z.string().optional(),
  brandName: z.string().min(2, "Brand name is required."),
  brandSlogan: z.string().optional(),
  brandLogo: z.string().optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  tiktok: z.string().optional(),
  youtube: z.string().optional(),
  x: z.string().optional(),
});

type GlobalProfileFormValues = z.infer<typeof formSchema>;

export default function GlobalProfilePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const form = useForm<GlobalProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ownerName: "",
      phone: "",
      address: "",
      brandName: "MD Business Flow",
      brandSlogan: "Your Modern Business Management Solution",
      brandLogo: "",
      whatsapp: "",
      instagram: "",
      facebook: "",
      tiktok: "",
      youtube: "",
      x: "",
    },
  });

  useEffect(() => {
    const loadProfile = async () => {
        const profiles = await dbLoad('profiles');
        const globalProfile = profiles.find(p => p.id === 'global-profile');
        if (globalProfile) {
            setIsEditMode(true);
            form.reset(globalProfile);
            if (globalProfile.brandLogo) {
                setLogoPreview(globalProfile.brandLogo);
            }
        }
    }
    loadProfile();
  }, [form]);


  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        form.setValue("brandLogo", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: GlobalProfileFormValues) => {
    const allProfiles = await dbLoad('profiles');
    const profileIndex = allProfiles.findIndex(p => p.id === 'global-profile');
    
    const globalProfileData = {
        id: 'global-profile',
        name: 'Global Profile',
        type: 'Global',
        ...data
    };

    if (profileIndex > -1) {
        allProfiles[profileIndex] = globalProfileData;
    } else {
        allProfiles.push(globalProfileData);
    }
    
    await dbSave('profiles', allProfiles);
    toast({ title: isEditMode ? "Global Profile Updated" : "Global Profile Created" });
    router.push("/select-account");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white dark:from-blue-900/20 dark:to-background">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
            <div className="flex justify-center items-center gap-2 mb-4">
                <Icons.logo className="size-10 text-primary" />
                <h1 className="text-2xl font-bold">{t('dukaanxp')}</h1>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{isEditMode ? "Manage Global Profile" : "Create Your Global Profile"}</h2>
            <p className="text-muted-foreground mt-2">{isEditMode ? "This information will appear on all your reports and invoices." : "This will be your central brand identity across all businesses."}</p>
        </header>

        <main>
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  
                  <div>
                    <h3 className="text-lg font-medium text-primary mb-4">Brand Details</h3>
                    <div className="space-y-4">
                        <FormField
                        control={form.control}
                        name="brandName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Brand / Company Name</FormLabel>
                            <FormControl>
                                <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input placeholder="Your main brand name" {...field} className="pl-10" />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="brandSlogan"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Slogan / Tagline (Optional)</FormLabel>
                            <FormControl>
                                <div className="relative">
                                <Text className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input placeholder="Your brand's slogan" {...field} className="pl-10" />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                         <FormItem>
                            <FormLabel>Brand Logo (Optional)</FormLabel>
                            <FormControl>
                                <div className="flex items-center gap-4">
                                    <label htmlFor="logo-upload" className="cursor-pointer border-2 border-dashed rounded-lg p-4 text-center w-full hover:bg-muted/50">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Logo preview" className="h-24 w-24 object-contain mx-auto" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <ImageIcon className="h-8 w-8" />
                                                <span>Click to upload logo</span>
                                            </div>
                                        )}
                                    </label>
                                    <Input id="logo-upload" type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-primary mb-4">Owner Details</h3>
                    <div className="space-y-4">
                         <FormField
                            control={form.control}
                            name="ownerName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Your Full Name</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input placeholder="e.g., M. Danial Abubakar" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Contact Number (Optional)</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input placeholder="e.g., +92 312 4567890" {...field} className="pl-10" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Main Address (Optional)</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input placeholder="Your main address" {...field} className="pl-10" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </div>
                    </div>
                  </div>

                   <div>
                    <h3 className="text-lg font-medium text-primary mb-4">Social Media Links (Optional)</h3>
                    <div className="space-y-4">
                         <FormField
                            control={form.control}
                            name="whatsapp"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>WhatsApp</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Icons.whatsapp className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input placeholder="e.g., +923124567890" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="facebook"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Facebook</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Icons.facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input placeholder="e.g., https://facebook.com/yourpage" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="instagram"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Instagram</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Icons.instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input placeholder="e.g., https://instagram.com/yourprofile" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <FormField
                            control={form.control}
                            name="youtube"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>YouTube</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Icons.youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input placeholder="e.g., https://youtube.com/c/yourchannel" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="tiktok"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>TikTok</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Icons.tiktok className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input placeholder="e.g., https://tiktok.com/@yourprofile" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        </div>
                        <FormField
                            control={form.control}
                            name="x"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>X (Twitter)</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Icons.x className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input placeholder="e.g., https://x.com/yourhandle" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                   </div>


                  <Button type="submit" className="w-full text-lg py-6 mt-4">
                     {isEditMode ? "Save Global Profile" : "Create & Continue"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
