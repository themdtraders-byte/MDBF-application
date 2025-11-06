
"use client";

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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { dbLoad, dbSave } from "@/lib/db";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CreatableSelect } from "../ui/creatable-select";
import { ImageIcon } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Supplier name is required."),
  company: z.string().optional(),
  typeId: z.string().optional(),
  contact: z.string().min(10, "A valid phone number is required."),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  cnic: z.string().optional(),
  openingBalance: z.number().default(0),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  photo: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof formSchema>;
type SupplierType = { id: string; name: string; };

interface AddSupplierFormProps {
    supplierToEdit?: SupplierFormValues & { id: string; balance: number; isQuickAdd?: boolean };
    onFinish: () => void;
}

const generateSupplierId = async () => {
    const suppliers = await dbLoad("suppliers");
    const lastId = suppliers
        .map(s => s.id)
        .filter(id => id && id.startsWith("SUPP-"))
        .map(id => parseInt(id.replace("SUPP-", ""), 10))
        .filter(num => !isNaN(num))
        .sort((a, b) => b - a)[0] || 0;
    return `SUPP-${String(lastId + 1).padStart(4, '0')}`;
};

export function AddSupplierForm({ supplierToEdit, onFinish }: AddSupplierFormProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [supplierTypes, setSupplierTypes] = useState<SupplierType[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const isEditMode = !!supplierToEdit;

  const fetchSupplierTypes = async () => {
    const types = await dbLoad("supplier-types");
    setSupplierTypes(types);
  }

  useEffect(() => {
    fetchSupplierTypes();
     if(isEditMode && supplierToEdit?.photo) {
        setPhotoPreview(supplierToEdit.photo);
    }
  }, [isEditMode, supplierToEdit]);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: supplierToEdit ? {
        ...supplierToEdit,
        company: supplierToEdit.company || '',
        typeId: supplierToEdit.typeId || '',
        whatsapp: supplierToEdit.whatsapp || '',
        address: supplierToEdit.address || '',
        cnic: supplierToEdit.cnic || '',
        paymentTerms: supplierToEdit.paymentTerms || '',
        notes: supplierToEdit.notes || '',
        photo: supplierToEdit.photo || '',
        openingBalance: supplierToEdit.balance,
    } : {
      name: "",
      company: "",
      typeId: "",
      contact: "",
      whatsapp: "",
      address: "",
      cnic: "",
      openingBalance: 0,
      paymentTerms: "",
      notes: "",
      photo: ""
    },
  });

   const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        form.setValue("photo", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateSupplierType = async (typeName: string) => {
    const existingTypes = await dbLoad("supplier-types");
    const newType = {
        id: `STYPE-${Date.now()}`,
        name: typeName,
        description: "",
    };
    existingTypes.push(newType);
    await dbSave("supplier-types", existingTypes);
    await fetchSupplierTypes();
    toast({ title: "Supplier Type Created" });
    form.setValue('typeId', newType.id);
  };

  const onSubmit = async (data: SupplierFormValues) => {
    try {
      const existingSuppliers = await dbLoad("suppliers");

      const duplicate = existingSuppliers.find(
        (supplier: any) => supplier.name.toLowerCase() === data.name.toLowerCase() && supplier.id !== supplierToEdit?.id
      );

      if (duplicate) {
        toast({
          variant: "destructive",
          title: "Duplicate Supplier",
          description: `A supplier with the name "${data.name}" already exists.`,
        });
        return;
      }

      if (isEditMode) {
        const index = existingSuppliers.findIndex(c => c.id === supplierToEdit.id);
        if (index > -1) {
            let newId = existingSuppliers[index].id;
            if (data.cnic) {
                newId = data.cnic;
            } 
            else if (!data.cnic && !existingSuppliers[index].id.startsWith('SUPP-')) {
                newId = await generateSupplierId();
            }

            existingSuppliers[index] = { 
                ...existingSuppliers[index], 
                ...data, 
                id: newId,
                balance: data.openingBalance,
                isQuickAdd: false
            };
        }
      } else {
        const newSupplierId = data.cnic || await generateSupplierId();
        const newSupplier = {
            id: newSupplierId,
            ...data,
            balance: data.openingBalance,
            status: 'Active'
        };
        existingSuppliers.push(newSupplier);
      }
      
      await dbSave("suppliers", existingSuppliers);
      
      toast({
        title: isEditMode ? "Supplier Updated" : "Supplier Added",
        description: `${data.name} has been ${isEditMode ? 'updated' : 'added'}.`,
      });
      onFinish();

    } catch (error) {
      console.error("Failed to save supplier:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save supplier. Please try again.",
      });
    }
  };
  
  const cardTitle = isEditMode ? 'Edit Supplier' : t('addSupplier');
  const supplierTypeOptions = supplierTypes.map(st => ({ value: st.id, label: st.name }));

  return (
    <Card className={cn(isEditMode && "border-0 shadow-none")}>
       <CardHeader className={cn(isEditMode && "p-0")}>
        <CardTitle>{cardTitle}</CardTitle>
      </CardHeader>
      <CardContent className={cn(isEditMode && "p-0 mt-6")}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Supplier Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Prime Materials" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Company Name (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Prime Ltd." {...field} value={field.value || ''}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="typeId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Supplier Type (Optional)</FormLabel>
                     <CreatableSelect
                        options={supplierTypeOptions}
                        value={field.value || ""}
                        onChange={(value) => form.setValue('typeId', value)}
                        onCreate={handleCreateSupplierType}
                        placeholder="Select a supplier type"
                     />
                    <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <FormField
                    control={form.control}
                    name="contact"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                           <Input placeholder="0300-1234567" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="whatsapp"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>WhatsApp Number (Optional)</FormLabel>
                        <FormControl>
                           <Input placeholder="0300-1234567" {...field} value={field.value || ''}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Address / City (Optional)</FormLabel>
                        <FormControl>
                           <Input placeholder="e.g., Lahore" {...field} value={field.value || ''}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="cnic"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>CNIC / NTN (will be used as ID)</FormLabel>
                        <FormControl>
                           <Input placeholder="e.g., 35202-1234567-8" {...field} value={field.value || ''}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="openingBalance"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Opening Balance (Payable)</FormLabel>
                        <FormControl>
                           <Input type="number" {...field} 
                           value={field.value === 0 ? '' : field.value}
                           onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Payment Terms (Optional)</FormLabel>
                        <FormControl>
                           <Input placeholder="e.g., Pay after 15 days" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
             <FormItem>
                <FormLabel>Supplier Photo (Optional)</FormLabel>
                <FormControl>
                    <div className="flex items-center gap-4">
                        <label htmlFor="photo-upload" className="cursor-pointer border-2 border-dashed rounded-lg p-4 text-center w-full hover:bg-muted/50">
                            {photoPreview ? (
                                <img src={photoPreview} alt="Photo preview" className="h-24 w-24 object-cover mx-auto rounded-full" />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <ImageIcon className="h-8 w-8" />
                                    <span>Click to upload photo</span>
                                </div>
                            )}
                        </label>
                        <Input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    </div>
                </FormControl>
            </FormItem>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Notes / Remarks (Optional)</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Add any special notes about this supplier." {...field} value={field.value || ''}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <CardFooter className="flex justify-end gap-2 p-0 pt-6">
                <Button type="submit">
                    <Icons.plus className="mr-2" /> {isEditMode ? "Save Changes" : "Save Supplier"}
                </Button>
                {!isEditMode && <Button variant="outline" type="button" onClick={() => form.reset()}>
                    <Icons.alertTriangle className="mr-2" /> Reset Form
                </Button>}
             </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
