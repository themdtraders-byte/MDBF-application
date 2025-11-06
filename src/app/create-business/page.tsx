
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Icons } from "@/components/icons";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Briefcase, Building2, Calendar as CalendarIcon, Factory, User, Phone, MapPin, DollarSign, Store, Warehouse, Image as ImageIcon } from "lucide-react";
import { dbLoad, dbSave } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

const businessTypes = [
  { value: "shop", label: "Shop", icon: Store },
  { value: "factory", label: "Factory", icon: Factory },
  { value: "wholesale", label: "Wholesale", icon: Warehouse },
];

const formSchema = z.object({
  businessName: z.string().min(2, "Business name is required."),
  ownerName: z.string().min(2, "Owner name is required."),
  businessType: z.string().min(1, "Business type is required."),
  phone: z.string().min(10, "A valid phone number is required."),
  address: z.string().min(5, "Address is required."),
  currency: z.string().min(1, "Currency is required."),
  startDate: z.date({
    required_error: "A start date is required.",
  }),
  logo: z.string().optional(),
});

type BusinessFormValues = z.infer<typeof formSchema>;

export default function CreateBusinessPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();
  const [BusinessTypeIcon, setBusinessTypeIcon] = useState<React.ElementType>(Briefcase);
  const [isEditMode, setIsEditMode] = useState(false);
  const [profileToEdit, setProfileToEdit] = useState<any>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: "",
      ownerName: "",
      businessType: "",
      phone: "",
      address: "",
      currency: "PKR",
      logo: "",
    },
  });

  useEffect(() => {
    const loadProfileForEdit = async () => {
        const profileJson = localStorage.getItem("dukaanxp-business-profile-to-edit");
        if (profileJson) {
            const profile = JSON.parse(profileJson);
            setProfileToEdit(profile);
            setIsEditMode(true);

            const allProfiles = await dbLoad('profiles');
            const fullProfile = allProfiles.find(p => p.id === profile.id);

            if (fullProfile) {
                const startDate = fullProfile.startDate;
                const parsedDate = typeof startDate === 'string' ? parseISO(startDate) : startDate;

                form.reset({
                    ...fullProfile,
                    startDate: startDate ? new Date(parsedDate) : new Date(),
                });
                if (fullProfile.logo) {
                    setLogoPreview(fullProfile.logo);
                }
                const selectedType = businessTypes.find(bt => bt.value === fullProfile.businessType);
                if (selectedType) {
                    setBusinessTypeIcon(() => selectedType.icon);
                }
            }
            localStorage.removeItem("dukaanxp-business-profile-to-edit");
        }
    }
    loadProfileForEdit();
  }, [form]);


  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        form.setValue("logo", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: BusinessFormValues) => {
    const allProfiles = await dbLoad('profiles');
    
    if (isEditMode && profileToEdit) {
        const profileIndex = allProfiles.findIndex(p => p.id === profileToEdit.id);
        if (profileIndex > -1) {
            allProfiles[profileIndex] = { ...allProfiles[profileIndex], ...data };
            await dbSave('profiles', allProfiles);
            localStorage.setItem('dukaanxp-active-account', JSON.stringify({ id: allProfiles[profileIndex].id, type: allProfiles[profileIndex].type, name: allProfiles[profileIndex].name }));
            toast({ title: "Business Profile Updated" });
        }
    } else {
        const profileId = `business-${Date.now()}`;
        const newProfile = {
            id: profileId,
            name: data.businessName,
            type: 'Business',
            ...data
        };
        allProfiles.push(newProfile);
        await dbSave('profiles', allProfiles);
        
        // Store only essential info in localStorage, not the whole object with the image
        const activeAccountInfo = { id: newProfile.id, type: newProfile.type, name: newProfile.name };
        localStorage.setItem('dukaanxp-active-account', JSON.stringify(activeAccountInfo));
        
        toast({
            title: t("businessProfileCreated"),
            description: t("welcomeMessage", { businessName: data.businessName }),
        });
    }

    router.push("/select-account");
  };
  
  const onBusinessTypeChange = (value: string) => {
    const selectedType = businessTypes.find(bt => bt.value === value);
    if (selectedType) {
      setBusinessTypeIcon(() => selectedType.icon);
    }
    form.setValue("businessType", value);
  }

  return (
    <div className="min-h-screen bg-secondary">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
            <div className="flex justify-center items-center gap-2 mb-4">
                <Icons.logo className="size-10 text-primary" />
                <h1 className="text-2xl font-bold">{t('dukaanxp')}</h1>
            </div>
            <h2 className="text-3xl font-bold text-foreground">{isEditMode ? "Edit Business Profile" : t("setUpBusinessTitle")}</h2>
            <p className="text-muted-foreground mt-2">{isEditMode ? "Update your business information below." : t("setUpBusinessSubtitle")}</p>
        </header>

        <main>
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("businessNameLabel")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                               <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                               <Input placeholder={t("businessNamePlaceholder")} {...field} className="pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ownerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("ownerNameLabel")}</FormLabel>
                          <FormControl>
                             <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input placeholder={t("ownerNamePlaceholder")} {...field} className="pl-10"/>
                             </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("businessTypeLabel")}</FormLabel>
                        <Select onValueChange={onBusinessTypeChange} value={field.value}>
                          <FormControl>
                            <div className="relative">
                                <BusinessTypeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <SelectTrigger className="pl-10">
                                <SelectValue placeholder={t("businessTypePlaceholder")} />
                                </SelectTrigger>
                            </div>
                          </FormControl>
                          <SelectContent>
                            {businessTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                    <div className="flex items-center gap-2">
                                        <type.icon className="h-4 w-4 text-muted-foreground" />
                                        <span>{type.label}</span>
                                    </div>
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          <FormLabel>{t("phoneLabel")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                               <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                               <Input placeholder={t("phonePlaceholder")} {...field} className="pl-10" />
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
                          <FormLabel>{t("addressLabel")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input placeholder={t("addressPlaceholder")} {...field} className="pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>{t("currencyLabel")}</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input {...field} className="pl-10" />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>{t("startDateLabel")}</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span>{t('pickADate')}</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                   </div>

                    <FormItem>
                        <FormLabel>{t("logoLabel")}</FormLabel>
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

                  <Button type="submit" className="w-full text-lg py-6 mt-4">
                     {isEditMode ? "Save Changes" : t("createBusinessButton")}
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
