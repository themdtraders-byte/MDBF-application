
"use client";

import { useForm, useFieldArray } from "react-hook-form";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { dbLoad, dbSave } from "@/lib/db";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { CreatableSelect } from "../ui/creatable-select";
import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";

const productionRateSchema = z.object({
  itemId: z.string().min(1, "Item is required."),
  rate: z.number().min(0.01, "Rate must be positive."),
});

const formSchema = z.object({
  name: z.string().min(2, "Worker name is required."),
  fatherName: z.string().optional(),
  role: z.string().min(1, "Role/Designation is required."),
  contact: z.string().min(10, "A valid phone number is required."),
  address: z.string().optional(),
  cnic: z.string().optional(),
  joiningDate: z.date(),
  workType: z.enum(["salary", "work_based"]),
  salary: z.number().optional(),
  allowedLeaves: z.number().optional(),
  paymentFrequency: z.string().optional(),
  productionRates: z.array(productionRateSchema).optional(),
  notes: z.string().optional(),
  photo: z.string().optional(),
  status: z.enum(["Active", "Blocked"]).default("Active"),
}).refine(data => {
    if (data.workType === 'salary') {
        return data.salary !== undefined && data.salary >= 0;
    }
    return true;
}, {
    message: "Salary is required for salary-based workers.",
    path: ["salary"],
}).refine(data => {
    if (data.workType === 'work_based') {
        return data.productionRates && data.productionRates.length > 0;
    }
    return true;
}, {
    message: "At least one production rate is required for work-based workers.",
    path: ["productionRates"],
});

type WorkerFormValues = z.infer<typeof formSchema>;
type Role = { id: string; name: string };
type InventoryItem = { id: string, name: string, isQuickAdd?: boolean, stock: number, price: number, unit: string, lowStock: number };

interface AddWorkerFormProps {
    workerToEdit?: WorkerFormValues & { id: string };
    onFinish: () => void;
}

const generateWorkerId = async () => {
    const workers = await dbLoad("workers");
    const lastId = workers
        .map(w => w.id)
        .filter(id => id && id.startsWith("WORKER-"))
        .map(id => parseInt(id.replace("WORKER-", ""), 10))
        .filter(num => !isNaN(num))
        .sort((a, b) => b - a)[0] || 0;
    return `WORKER-${String(lastId + 1).padStart(4, '0')}`;
};

export function AddWorkerForm({ workerToEdit, onFinish }: AddWorkerFormProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const isEditMode = !!workerToEdit;
  const [roles, setRoles] = useState<Role[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const fetchRoles = async () => {
    const storedRoles = await dbLoad("worker-roles");
    setRoles(storedRoles);
  }
   const fetchInventory = async () => {
    const storedInventory = await dbLoad("inventory");
    setInventory(storedInventory);
  }

  useEffect(() => {
    fetchRoles();
    fetchInventory();
    if(isEditMode && workerToEdit?.photo) {
        setPhotoPreview(workerToEdit.photo);
    }
  }, [isEditMode, workerToEdit]);

  const form = useForm<WorkerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: workerToEdit ? {
        ...workerToEdit,
        fatherName: workerToEdit.fatherName || '',
        address: workerToEdit.address || '',
        cnic: workerToEdit.cnic || '',
        joiningDate: new Date(workerToEdit.joiningDate),
        paymentFrequency: workerToEdit.paymentFrequency || '',
        notes: workerToEdit.notes || '',
        photo: workerToEdit.photo || '',
        productionRates: workerToEdit.productionRates || [],
        allowedLeaves: workerToEdit.allowedLeaves || 0,
        status: workerToEdit.status || "Active",
    } : {
      name: "",
      fatherName: "",
      role: "",
      contact: "",
      address: "",
      cnic: "",
      joiningDate: new Date(),
      workType: "salary",
      salary: 0,
      allowedLeaves: 0,
      paymentFrequency: "Monthly",
      productionRates: [],
      notes: "",
      photo: "",
      status: "Active",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "productionRates",
  });

  const workType = form.watch("workType");

  const handleCreateRole = async (roleName: string) => {
    const existingRoles = await dbLoad("worker-roles");
    const newRole = { id: `ROLE-${Date.now()}`, name: roleName };
    existingRoles.push(newRole);
    await dbSave("worker-roles", existingRoles);
    await fetchRoles();
    toast({ title: "Role Created", description: `${roleName} has been added.` });
    form.setValue('role', newRole.id);
  };
  
  const handleCreateItem = async (itemName: string, index: number) => {
    const existingInventory = await dbLoad("inventory");
    const newItem = {
        id: `ITEM-${Date.now()}`,
        name: itemName,
        stock: 0,
        price: 0,
        unit: 'piece',
        lowStock: 0,
        isQuickAdd: true
    };
    existingInventory.push(newItem);
    await dbSave("inventory", existingInventory);
    await fetchInventory();
    toast({ title: "Item Quick-Added", description: `Added ${itemName}. Please complete its details later.`});
    form.setValue(`productionRates.${index}.itemId`, newItem.id);
  }

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

  const onSubmit = async (data: WorkerFormValues) => {
    try {
      const existingWorkers = await dbLoad("workers");

      // Check for duplicate names
      const duplicate = existingWorkers.find(
        (worker: any) => worker.name.toLowerCase() === data.name.toLowerCase() && worker.id !== workerToEdit?.id
      );

      if (duplicate) {
        toast({
          variant: "destructive",
          title: "Duplicate Worker",
          description: `A worker with the name "${data.name}" already exists.`,
        });
        return;
      }

      if (isEditMode) {
          const index = existingWorkers.findIndex(w => w.id === workerToEdit.id);
          if (index > -1) {
              let newId = existingWorkers[index].id;
              if (data.cnic) {
                  newId = data.cnic;
              } else if (!data.cnic && !existingWorkers[index].id.startsWith('WORKER-')) {
                  newId = await generateWorkerId();
              }
              existingWorkers[index] = { ...existingWorkers[index], ...data, id: newId };
          }
      } else {
        const newWorkerId = data.cnic || await generateWorkerId();
        const newWorker = {
            id: newWorkerId,
            ...data,
            status: 'Active',
        };
        existingWorkers.push(newWorker);
      }

      await dbSave("workers", existingWorkers);
      
      toast({
        title: isEditMode ? "Worker Updated" : "Worker Added",
        description: `${data.name} has been ${isEditMode ? 'updated' : 'added'}.`,
      });
      onFinish();
    } catch (error) {
      console.error("Failed to save worker:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'add'} worker.`,
      });
    }
  };
  
  const cardTitle = isEditMode ? 'Edit Worker' : t('addWorker');
  const roleOptions = roles.map(r => ({ value: r.id, label: r.name }));
  const inventoryOptions = inventory.map(i => ({ value: i.id, label: i.name }));

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
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Ahmed Raza" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="fatherName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Father's Name (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Muhammad Ali" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
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
                    name="cnic"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>CNIC (will be used as ID)</FormLabel>
                        <FormControl>
                           <Input placeholder="35202-1234567-8" {...field} value={field.value || ''} />
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
                        <FormLabel>Address (Optional)</FormLabel>
                        <FormControl>
                           <Input placeholder="e.g., House #123, Lahore" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="joiningDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Joining Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <Icons.calendar className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Department / Designation</FormLabel>
                          <CreatableSelect
                            options={roleOptions}
                            value={field.value}
                            onChange={(value) => form.setValue('role', value)}
                            onCreate={handleCreateRole}
                            createText={(value) => `+ Create "${value}"`}
                            placeholder="Select or create a role"
                          />
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormItem>
                    <FormLabel>Worker Photo (Optional)</FormLabel>
                    <FormControl>
                        <div className="flex items-center gap-4">
                            <label htmlFor="photo-upload" className="cursor-pointer border-2 border-dashed rounded-lg p-4 text-center w-full hover:bg-muted/50">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Worker photo preview" className="h-24 w-24 object-cover mx-auto rounded-full" />
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
             </div>

             {isEditMode && (
                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Blocked">Blocked</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
             )}
             
            <FormField
                control={form.control}
                name="workType"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Work Type</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                        >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="salary" />
                            </FormControl>
                            <FormLabel className="font-normal">
                            Salary-Based
                            </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="work_based" />
                            </FormControl>
                            <FormLabel className="font-normal">
                            Work-Based (Production)
                            </FormLabel>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            {workType === 'salary' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     <FormField
                        control={form.control}
                        name="salary"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Monthly Salary</FormLabel>
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
                        name="paymentFrequency"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Payment Frequency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Monthly">Monthly</SelectItem>
                                    <SelectItem value="Weekly">Weekly</SelectItem>
                                    <SelectItem value="Daily">Daily</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="allowedLeaves"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Allowed Leaves / Month</FormLabel>
                            <Select onValueChange={(val) => field.onChange(parseInt(val))} value={String(field.value || 0)}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    {[...Array(11).keys()].map(i => <SelectItem key={i} value={String(i)}>{i}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                 </div>
            )}

            {workType === 'work_based' && (
                 <div className="p-4 border rounded-lg space-y-4">
                    <h3 className="text-md font-medium">Production Rates</h3>
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-10 gap-2 items-end">
                            <div className="col-span-6">
                                {index === 0 && <FormLabel>Item</FormLabel>}
                                <FormField
                                    control={form.control}
                                    name={`productionRates.${index}.itemId`}
                                    render={({ field }) => (
                                        <CreatableSelect
                                          options={inventoryOptions}
                                          value={field.value}
                                          onChange={(value) => form.setValue(`productionRates.${index}.itemId`, value)}
                                          onCreate={(value) => handleCreateItem(value, index)}
                                          createText={(value) => `+ Create "${value}"`}
                                          placeholder="Select or create item"
                                        />
                                    )}
                                />
                            </div>
                             <div className="col-span-3">
                                {index === 0 && <FormLabel>Rate per Unit</FormLabel>}
                                <FormField
                                    control={form.control}
                                    name={`productionRates.${index}.rate`}
                                    render={({ field }) => (
                                        <Input type="number" placeholder="Rate" {...field} value={field.value === 0 ? '' : field.value} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                    )}
                                />
                            </div>
                            <div className="col-span-1">
                                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Icons.trash className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ itemId: '', rate: 0 })}><Icons.plus className="mr-2" /> Add Rate</Button>
                    <FormMessage>{form.formState.errors.productionRates?.root?.message}</FormMessage>
                 </div>
            )}
            
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Notes / Remarks (Optional)</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Add any special notes about this worker." {...field} value={field.value || ''}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <CardFooter className="flex justify-end gap-2 p-0 pt-6">
                <Button type="submit">
                    <Icons.plus className="mr-2" /> {isEditMode ? 'Save Changes' : 'Save Worker'}
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
