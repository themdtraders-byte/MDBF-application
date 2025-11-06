
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
  name: z.string().min(2, "Customer name is required."),
  company: z.string().optional(),
  typeId: z.string().optional(),
  contact: z.string().min(10, "A valid phone number is required."),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  cnic: z.string().optional(),
  openingBalance: z.number().default(0),
  creditLimit: z.number().optional(),
  notes: z.string().optional(),
  photo: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof formSchema>;
type CustomerType = { id: string; name: string; };

interface AddCustomerFormProps {
    customerToEdit?: CustomerFormValues & { id: string; balance: number; isQuickAdd?: boolean };
    onFinish: () => void;
}

const generateCustomerId = async () => {
    const customers = await dbLoad("customers");
    const lastId = customers
        .map(c => c.id)
        .filter(id => id && id.startsWith("CUST-"))
        .map(id => parseInt(id.replace("CUST-", ""), 10))
        .filter(num => !isNaN(num))
        .sort((a, b) => b - a)[0] || 0;
    return `CUST-${String(lastId + 1).padStart(4, '0')}`;
};

export function AddCustomerForm({ customerToEdit, onFinish }: AddCustomerFormProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const isEditMode = !!customerToEdit;

  const fetchCustomerTypes = async () => {
    const types = await dbLoad("customer-types");
    setCustomerTypes(types);
  }

  useEffect(() => {
    fetchCustomerTypes();
     if(isEditMode && customerToEdit?.photo) {
        setPhotoPreview(customerToEdit.photo);
    }
  }, [isEditMode, customerToEdit]);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: customerToEdit ? {
        ...customerToEdit,
        company: customerToEdit.company || '',
        typeId: customerToEdit.typeId || '',
        whatsapp: customerToEdit.whatsapp || '',
        address: customerToEdit.address || '',
        cnic: customerToEdit.cnic || '',
        notes: customerToEdit.notes || '',
        photo: customerToEdit.photo || '',
        creditLimit: customerToEdit.creditLimit || 0,
        openingBalance: customerToEdit.balance,
    } : {
      name: "",
      company: "",
      typeId: "",
      contact: "",
      whatsapp: "",
      address: "",
      cnic: "",
      openingBalance: 0,
      creditLimit: 0,
      notes: "",
      photo: "",
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

  const handleCreateCustomerType = async (typeName: string) => {
    const existingTypes = await dbLoad("customer-types");
    const newType = {
        id: `CTYPE-${Date.now()}`,
        name: typeName,
        description: "",
    };
    existingTypes.push(newType);
    await dbSave("customer-types", existingTypes);
    await fetchCustomerTypes();
    toast({ title: "Customer Type Created" });
    form.setValue('typeId', newType.id);
  };

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      const existingCustomers = await dbLoad("customers");

      const duplicate = existingCustomers.find(
        (customer: any) => customer.name.toLowerCase() === data.name.toLowerCase() && customer.id !== customerToEdit?.id
      );

      if (duplicate) {
        toast({
          variant: "destructive",
          title: "Duplicate Customer",
          description: `A customer with the name "${data.name}" already exists.`,
        });
        return;
      }

      if (isEditMode) {
        const index = existingCustomers.findIndex(c => c.id === customerToEdit.id);
        if (index > -1) {
            let newId = existingCustomers[index].id;
            if (data.cnic) {
                newId = data.cnic;
            } else if (!data.cnic && !existingCustomers[index].id.startsWith('CUST-')) {
                newId = await generateCustomerId();
            }

            existingCustomers[index] = { 
                ...existingCustomers[index], 
                ...data, 
                id: newId,
                balance: data.openingBalance,
                isQuickAdd: false
            };
        }
      } else {
         const newCustomerId = data.cnic || await generateCustomerId();
         const newCustomer = {
            id: newCustomerId,
            ...data,
            balance: data.openingBalance,
            status: 'Active'
        };
        existingCustomers.push(newCustomer);
      }
      
      await dbSave("customers", existingCustomers);
      
      toast({
        title: isEditMode ? "Customer Updated" : "Customer Added",
        description: `${data.name} has been ${isEditMode ? 'updated' : 'added'}.`,
      });
      onFinish();
      if (!isEditMode) form.reset();

    } catch (error) {
      console.error("Failed to save customer:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'add'} customer. Please try again.`,
      });
    }
  };
  
  const cardTitle = isEditMode ? 'Edit Customer' : t('addCustomer');
  const customerTypeOptions = customerTypes.map(ct => ({ value: ct.id, label: ct.name }));

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
                        <FormLabel>Customer Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Ali Traders" {...field} />
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
                        <FormLabel>Company / Shop Name (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Ali Hardware Store" {...field} value={field.value || ''} />
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
                    <FormLabel>Customer Type (Optional)</FormLabel>
                     <CreatableSelect
                        options={customerTypeOptions}
                        value={field.value || ""}
                        onChange={(value) => form.setValue('typeId', value)}
                        onCreate={handleCreateCustomerType}
                        placeholder="Select a customer type"
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
                           <Input placeholder="0300-1234567" {...field} value={field.value || ''} />
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
                           <Input placeholder="e.g., Lahore" {...field} value={field.value || ''} />
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
                        <FormLabel>CNIC (will be used as ID)</FormLabel>
                        <FormControl>
                           <Input placeholder="e.g., 35202-1234567-8" {...field} value={field.value || ''} />
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
                        <FormLabel>Opening Balance</FormLabel>
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
                    name="creditLimit"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Credit Limit (Optional)</FormLabel>
                        <FormControl>
                           <Input type="number" {...field} 
                           value={field.value === 0 ? '' : field.value}
                           onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
             <FormItem>
                <FormLabel>Customer Photo (Optional)</FormLabel>
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
                        <Textarea placeholder="Add any special notes about this customer." {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <CardFooter className="flex justify-end gap-2 p-0 pt-6">
                <Button type="submit">
                    <Icons.plus className="mr-2" /> {isEditMode ? "Save Changes" : "Save Customer"}
                </Button>
                {!isEditMode && 
                    <Button variant="outline" type="button" onClick={() => form.reset()}>
                        <Icons.alertTriangle className="mr-2" /> Reset Form
                    </Button>
                }
             </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
