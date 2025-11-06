
"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { dbLoad, dbSave } from "@/lib/db";
import { CreatableSelect } from "../ui/creatable-select";

const rawMaterialSchema = z.object({
  itemId: z.string().min(1, "Item is required."),
  quantity: z.number().min(0.01, "Quantity > 0."),
  cost: z.number(),
});

const finishedGoodSchema = z.object({
  itemId: z.string().min(1, "Item is required."),
  quantity: z.number().min(0.01, "Quantity > 0."),
});

const laborSchema = z.object({
    workerId: z.string().min(1, "Worker is required."),
    workType: z.enum(["salary", "work_based"]),
    time: z.number().optional(),
    timeUnit: z.enum(["Hours", "Days", "Weeks", "Month"]).optional(),
    quantity: z.number().optional(),
    cost: z.number(),
});

const otherExpenseSchema = z.object({
    description: z.string().min(2, "Description required."),
    amount: z.number().min(1, "Amount >= 1."),
});

const formSchema = z.object({
  productionDate: z.date(),
  batchCode: z.string().min(1),
  supervisorId: z.string().optional(),
  rawMaterials: z.array(rawMaterialSchema).min(1, "Add at least one raw material."),
  finishedGoods: z.array(finishedGoodSchema).min(1, "Add at least one finished good."),
  laborCosts: z.array(laborSchema).optional(),
  otherExpenses: z.array(otherExpenseSchema).optional(),
}).refine((data) => {
    const totalOutputQty = (data.finishedGoods || []).reduce((sum, fg) => sum + (fg.quantity || 0), 0);
    const totalWorkBasedQty = (data.laborCosts || [])
        .filter(lc => lc.workType === 'work_based')
        .reduce((sum, lc) => sum + (lc.quantity || 0), 0);
    
    return totalWorkBasedQty <= totalOutputQty;
}, {
    message: "Total work-based quantity cannot exceed total finished goods quantity.",
    path: ["laborCosts"], // You can point to a specific field or the root
});

type ProductionFormValues = z.infer<typeof formSchema>;
type InventoryItem = { id: string; name: string; stock: number; costPrice?: number; unit: string; isQuickAdd?: boolean };
type Worker = { id: string; name: string; balance: number; workType: 'salary' | 'work_based', salary?: number, productionRates?: { itemId: string, rate: number }[] };
type PurchaseItem = { itemId: string; quantity: number; unitPrice: number; };
type Purchase = { items: PurchaseItem[] };

interface NewProductionFormProps {
    productionToEdit?: ProductionFormValues & { perUnitCost: number; totalProductionCost: number };
    onFinish: () => void;
}

const generateBatchCode = async () => {
    const history = await dbLoad("production-history");
    const lastBatchNumber = history
        .map(p => p.batchCode)
        .filter(num => num && num.startsWith("BCH-"))
        .map(num => parseInt(num.replace("BCH-", ""), 10))
        .filter(num => !isNaN(num))
        .sort((a, b) => b - a)[0] || 0;
    
    const newNumber = lastBatchNumber + 1;
    return `BCH-${String(newNumber).padStart(4, '0')}`;
};

export function NewProductionForm({ productionToEdit, onFinish }: NewProductionFormProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const isEditMode = !!productionToEdit;

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [averageCosts, setAverageCosts] = useState<Record<string, number>>({});

  const fetchInventory = React.useCallback(async () => {
    setInventory(await dbLoad("inventory"));
  }, [])
   const fetchWorkers = React.useCallback(async () => {
    setWorkers(await dbLoad("workers"));
  }, [])
  const fetchPurchases = React.useCallback(async () => {
    setPurchases(await dbLoad("purchases"));
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchWorkers();
    fetchPurchases();
  }, [fetchInventory, fetchWorkers, fetchPurchases]);
  
  useEffect(() => {
    if (purchases.length > 0) {
        const itemCosts: Record<string, { totalCost: number; totalQuantity: number }> = {};
        purchases.forEach(purchase => {
            (purchase.items || []).forEach(item => {
                if (!itemCosts[item.itemId]) {
                    itemCosts[item.itemId] = { totalCost: 0, totalQuantity: 0 };
                }
                itemCosts[item.itemId].totalCost += item.quantity * item.unitPrice;
                itemCosts[item.itemId].totalQuantity += item.quantity;
            });
        });
        
        const avgs: Record<string, number> = {};
        for (const itemId in itemCosts) {
            if (itemCosts[itemId].totalQuantity > 0) {
                avgs[itemId] = itemCosts[itemId].totalCost / itemCosts[itemId].totalQuantity;
            }
        }
        setAverageCosts(avgs);
    }
  }, [purchases]);

  const form = useForm<ProductionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: async () => {
      if (isEditMode && productionToEdit) {
        return {
          ...productionToEdit,
          productionDate: new Date(productionToEdit.productionDate),
          supervisorId: productionToEdit.supervisorId || '',
        };
      }
      return {
        productionDate: new Date(),
        batchCode: await generateBatchCode(),
        rawMaterials: [],
        finishedGoods: [],
        laborCosts: [],
        otherExpenses: [],
        supervisorId: ''
      };
    },
  });

  const { fields: rawMaterialFields, append: appendRawMaterial, remove: removeRawMaterial } = useFieldArray({ control: form.control, name: "rawMaterials" });
  const { fields: finishedGoodFields, append: appendFinishedGood, remove: removeFinishedGood } = useFieldArray({ control: form.control, name: "finishedGoods" });
  const { fields: laborCostFields, append: appendLaborCost, remove: removeLaborCost } = useFieldArray({ control: form.control, name: "laborCosts" });
  const { fields: otherExpenseFields, append: appendOtherExpense, remove: removeOtherExpense } = useFieldArray({ control: form.control, name: "otherExpenses" });

  const watchedForm = form.watch();
  const watchedRawMaterials = watchedForm.rawMaterials;
  const watchedLaborCosts = watchedForm.laborCosts;
  const watchedOtherExpenses = watchedForm.otherExpenses;
  const watchedFinishedGoods = watchedForm.finishedGoods;

  const totalRawMaterialCost = (watchedRawMaterials || []).reduce((acc, item) => acc + (item.cost || 0), 0);
  const totalLaborCost = (watchedLaborCosts || []).reduce((acc, item) => acc + (item.cost || 0), 0);
  const totalOtherExpenses = (watchedOtherExpenses || []).reduce((acc, item) => acc + (item.amount || 0), 0);
  const totalProductionCost = totalRawMaterialCost + totalLaborCost + totalOtherExpenses;
  const totalFinishedGoodsQty = (watchedFinishedGoods || []).reduce((acc, item) => acc + (item.quantity || 0), 0);
  const perUnitCost = totalFinishedGoodsQty > 0 ? totalProductionCost / totalFinishedGoodsQty : 0;
  
   useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (!name) return;
      const values = value as ProductionFormValues;
  
      // Raw Material Cost Calculation
      if (name.startsWith('rawMaterials.')) {
        const index = parseInt(name.split('.')[1], 10);
        const material = (values.rawMaterials || [])[index];
        if (material && material.itemId && (name.endsWith('.quantity') || name.endsWith('.itemId'))) {
            const inventoryItem = inventory.find(i => i.id === material.itemId);
            const unitCost = averageCosts[material.itemId] || inventoryItem?.costPrice || 0;
            const cost = unitCost * (material.quantity || 0);

            if (material.cost !== cost) {
                form.setValue(`rawMaterials.${index}.cost`, cost, { shouldValidate: true });
            }
        }
      }
      
      // Labor Cost & Quantity Distribution
      if (name.startsWith('laborCosts.') || name.startsWith('finishedGoods.')) {
        const laborCosts = values.laborCosts || [];
        const finishedGoods = values.finishedGoods || [];
        const totalOutputQty = finishedGoods.reduce((sum, fg) => sum + (fg.quantity || 0), 0);

        let totalAssignedQty = 0;
        let unassignedWorkerIndex = -1;

        laborCosts.forEach((labor, index) => {
            const worker = workers.find(w => w.id === labor.workerId);
            if (!worker) return;

            // Update cost
            let newCost = 0;
            if (labor.workType === 'work_based') {
                 if (worker.productionRates && finishedGoods.length > 0) {
                    const rateInfo = worker.productionRates.find(r => r.itemId === finishedGoods[0]?.itemId);
                    if (rateInfo) {
                        newCost = (labor.quantity || 0) * rateInfo.rate;
                    }
                }
            } else { // salary-based
                const monthlySalary = worker.salary || 0;
                const time = labor.time || 0;
                switch (labor.timeUnit) {
                    case 'Hours': newCost = (monthlySalary / 30 / 8) * time; break;
                    case 'Days': newCost = (monthlySalary / 30) * time; break;
                    case 'Weeks': newCost = (monthlySalary / 4) * time; break;
                    case 'Month': newCost = monthlySalary * time; break;
                    default: newCost = 0;
                }
            }
            if (labor.cost !== newCost) {
                form.setValue(`laborCosts.${index}.cost`, newCost, { shouldValidate: true });
            }

            // Track assigned quantity
            if (worker.workType === 'work_based') {
                if (labor.quantity !== undefined && labor.quantity !== null && name !== `laborCosts.${index}.quantity`) {
                    totalAssignedQty += labor.quantity;
                } else if (name === `laborCosts.${index}.quantity`) {
                    // Do nothing this is the one being changed
                } else {
                    if (unassignedWorkerIndex === -1) unassignedWorkerIndex = index;
                }
            }
        });

        // Auto-fill logic
        if (unassignedWorkerIndex !== -1 && name !== `laborCosts.${unassignedWorkerIndex}.quantity`) {
            const currentEditingValue = form.getValues(name as keyof ProductionFormValues) || 0;
            const remainingQty = totalOutputQty - totalAssignedQty - Number(currentEditingValue);

            if (remainingQty > 0) {
                form.setValue(`laborCosts.${unassignedWorkerIndex}.quantity`, remainingQty, { shouldValidate: true });
            }
        }

        // Validate total work-based quantity against total output
        const totalWorkBasedQty = (values.laborCosts || [])
            .filter(lc => lc.workType === 'work_based')
            .reduce((sum, lc) => sum + (lc.quantity || 0), 0);

        if (totalWorkBasedQty > totalOutputQty) {
            form.setError("laborCosts", { 
                type: 'manual', 
                message: 'Total work-based quantity cannot exceed total finished goods quantity.' 
            });
        } else {
            form.clearErrors("laborCosts");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, inventory, averageCosts, workers]);



  const handleCreateItem = async (itemName: string) => {
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
    return newItem.id;
  }
  
  const handleCreateWorker = async (workerName: string) => {
    const existingWorkers = await dbLoad("workers");
    const newWorker = {
        id: `WORKER-${Date.now()}`,
        name: workerName,
        contact: '',
        balance: 0,
        status: 'Active',
        isQuickAdd: true,
        workType: 'salary'
    };
    existingWorkers.push(newWorker);
    await dbSave("workers", existingWorkers);
    await fetchWorkers();
    toast({ title: "Worker Quick-Added", description: `Added ${workerName}. Please complete their details later.`});
    return newWorker.id;
  }

  const onSubmit = async (data: ProductionFormValues) => {
    try {
        const productionHistory = await dbLoad("production-history");

        if (isEditMode && productionToEdit) {
             const index = productionHistory.findIndex(p => p.batchCode === productionToEdit.batchCode);
             if (index > -1) {
                 productionHistory[index] = { ...data, perUnitCost, totalProductionCost };
             }
        } else {
            const currentInventory: InventoryItem[] = await dbLoad("inventory");
            const currentWorkers: Worker[] = await dbLoad("workers");

            data.rawMaterials.forEach(material => {
                const itemIndex = currentInventory.findIndex(i => i.id === material.itemId);
                if (itemIndex === -1) throw new Error(`Raw material ${material.itemId} not found.`);
                if (currentInventory[itemIndex].stock < material.quantity) throw new Error(`Not enough stock for ${currentInventory[itemIndex].name}.`);
                currentInventory[itemIndex].stock -= material.quantity;
            });

            data.finishedGoods.forEach(good => {
                const itemIndex = currentInventory.findIndex(i => i.id === good.itemId);
                if (itemIndex === -1) throw new Error(`Finished good ${good.itemId} not found.`);
                currentInventory[itemIndex].stock += good.quantity;
                currentInventory[itemIndex].costPrice = perUnitCost;
            });
            await dbSave("inventory", currentInventory);
            setInventory(currentInventory);

            data.laborCosts?.forEach(labor => {
                const workerIndex = currentWorkers.findIndex(w => w.id === labor.workerId);
                if(workerIndex > -1) {
                    currentWorkers[workerIndex].balance += labor.cost;
                }
            });
            await dbSave("workers", currentWorkers);
            setWorkers(currentWorkers);
            
            productionHistory.push({ ...data, perUnitCost, totalProductionCost });
        }
      
        await dbSave("production-history", productionHistory);
        toast({
            title: isEditMode ? "Production Updated" : "Production Finalized",
            description: `Batch ${data.batchCode} has been ${isEditMode ? 'updated' : 'recorded'} successfully.`,
        });

        onFinish();

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to finalize production.",
      });
    }
  };
  
  const inventoryOptions = inventory.map(i => ({ value: i.id, label: i.name }));
  const workerOptions = workers.map(w => ({ value: w.id, label: w.name }));

  return (
    <Card className={cn(isEditMode && "border-0 shadow-none")}>
      <CardHeader className={cn(isEditMode && "p-0")}>
        <CardTitle>{isEditMode ? `Edit Batch: ${productionToEdit.batchCode}`: 'New Production Batch'}</CardTitle>
        {!isEditMode && <CardDescription>Record a new manufacturing or assembly batch.</CardDescription>}
      </CardHeader>
      <CardContent className={cn(isEditMode && "p-0 mt-6")}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

            <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-medium mb-4 text-primary">Production Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField control={form.control} name="productionDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Production Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}<Icons.calendar className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="batchCode" render={({ field }) => ( <FormItem><FormLabel>Batch Code</FormLabel><FormControl><Input {...field} readOnly /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="supervisorId" render={({ field }) => ( 
                        <FormItem>
                            <FormLabel>Supervisor (Optional)</FormLabel>
                             <CreatableSelect
                                options={workerOptions}
                                value={field.value || ''}
                                onChange={(value) => form.setValue('supervisorId', value)}
                                onCreate={handleCreateWorker}
                                createText={(value) => `+ Create "${value}"`}
                                placeholder="Select or create supervisor"
                            />
                            <FormMessage />
                        </FormItem> 
                    )} />
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="p-4 border rounded-lg">
                        <h3 className="text-lg font-medium mb-4 text-primary">Raw Materials Used</h3>
                        <div className="space-y-2">
                            {rawMaterialFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-10 gap-2 items-end">
                                    <div className="col-span-4"><FormLabel className={cn(index !== 0 && 'sr-only')}>Item</FormLabel>
                                        <CreatableSelect
                                          options={inventoryOptions}
                                          value={form.watch(`rawMaterials.${index}.itemId`)}
                                          onChange={(value) => form.setValue(`rawMaterials.${index}.itemId`, value)}
                                          onCreate={(value) => {
                                            handleCreateItem(value).then(newId => {
                                                form.setValue(`rawMaterials.${index}.itemId`, newId);
                                            })
                                          }}
                                          createText={(value) => `+ Create "${value}"`}
                                          placeholder="Select material"
                                        />
                                    </div>
                                    <div className="col-span-2"><FormLabel className={cn(index !== 0 && 'sr-only')}>Qty</FormLabel><FormField control={form.control} name={`rawMaterials.${index}.quantity`} render={({ field }) => (<Input type="number" placeholder="Qty" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />)} /></div>
                                    <div className="col-span-3"><FormLabel className={cn(index !== 0 && 'sr-only')}>Cost</FormLabel><FormField control={form.control} name={`rawMaterials.${index}.cost`} render={({ field }) => (<Input type="number" {...field} readOnly />)} /></div>
                                    <Button type="button" variant="destructive" size="icon" onClick={() => removeRawMaterial(index)}><Icons.trash className="h-4 w-4" /></Button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="outline" onClick={() => appendRawMaterial({ itemId: '', quantity: 1, cost: 0 })} className="mt-4"><Icons.plus className="mr-2" /> Add Material</Button>
                    </div>

                    <div className="p-4 border rounded-lg">
                        <h3 className="text-lg font-medium mb-4 text-primary">Labor / Worker Costs</h3>
                        <div className="space-y-2">
                             {laborCostFields.map((field, index) => {
                                const worker = workers.find(w => w.id === watchedLaborCosts?.[index]?.workerId);
                                const assignedWorkerIds = (watchedLaborCosts || []).map(lc => lc.workerId).filter(id => id);
                                const availableWorkerOptions = workerOptions.filter(opt => !assignedWorkerIds.includes(opt.value) || opt.value === form.watch(`laborCosts.${index}.workerId`));
                                return (
                                <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-4"><FormLabel className={cn(index !== 0 && 'sr-only')}>Worker</FormLabel>
                                    <CreatableSelect
                                        options={availableWorkerOptions}
                                        value={form.watch(`laborCosts.${index}.workerId`)}
                                        onChange={(value) => {
                                            const selectedWorker = workers.find(w => w.id === value);
                                            form.setValue(`laborCosts.${index}.workerId`, value);
                                            form.setValue(`laborCosts.${index}.workType`, selectedWorker?.workType || 'salary');
                                        }}
                                        onCreate={handleCreateWorker}
                                        createText={(value) => `+ Create "${value}"`}
                                        placeholder="Select worker"
                                    />
                                    </div>
                                    {worker?.workType === 'salary' ? (
                                        <>
                                            <div className="col-span-2"><FormLabel className={cn(index !== 0 && 'sr-only')}>Time</FormLabel><FormField control={form.control} name={`laborCosts.${index}.time`} render={({ field }) => (<Input type="number" placeholder="Time" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />)} /></div>
                                            <div className="col-span-2"><FormLabel className={cn(index !== 0 && 'sr-only')}>Unit</FormLabel><FormField control={form.control} name={`laborCosts.${index}.timeUnit`} render={({ field }) => (<Select onValueChange={(value) => {field.onChange(value);}} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Hours">Hours</SelectItem><SelectItem value="Days">Days</SelectItem><SelectItem value="Weeks">Weeks</SelectItem><SelectItem value="Month">Month</SelectItem></SelectContent></Select>)} /></div>
                                        </>
                                    ) : (
                                        <div className="col-span-4"><FormLabel className={cn(index !== 0 && 'sr-only')}>Quantity</FormLabel><FormField control={form.control} name={`laborCosts.${index}.quantity`} render={({ field }) => (<Input type="number" placeholder="Qty Produced" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />)} /></div>
                                    )}
                                    <div className="col-span-3"><FormLabel className={cn(index !== 0 && 'sr-only')}>Cost</FormLabel><FormField control={form.control} name={`laborCosts.${index}.cost`} render={({ field }) => (<Input type="number" {...field} readOnly />)} /></div>
                                    <Button type="button" variant="destructive" size="icon" onClick={() => removeLaborCost(index)}><Icons.trash className="h-4 w-4" /></Button>
                                </div>
                            )})}
                        </div>
                        <Button type="button" variant="outline" onClick={() => appendLaborCost({ workerId: '', workType: "salary", quantity: 0, cost: 0, time: 1, timeUnit: "Days" })} className="mt-4"><Icons.plus className="mr-2" /> Add Labor</Button>
                         <FormMessage>{(form.formState.errors.laborCosts as any)?.root?.message || (form.formState.errors.laborCosts as any)?.message}</FormMessage>
                    </div>

                    <div className="p-4 border rounded-lg">
                        <h3 className="text-lg font-medium mb-4 text-primary">Other Expenses</h3>
                         <div className="space-y-2">
                            {otherExpenseFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-10 gap-2 items-end">
                                    <div className="col-span-6"><FormLabel className={cn(index !== 0 && 'sr-only')}>Description</FormLabel><FormField control={form.control} name={`otherExpenses.${index}.description`} render={({ field }) => (<Input placeholder="e.g., Electricity" {...field} />)} /></div>
                                    <div className="col-span-3"><FormLabel className={cn(index !== 0 && 'sr-only')}>Amount</FormLabel><FormField control={form.control} name={`otherExpenses.${index}.amount`} render={({ field }) => (<Input type="number" placeholder="Amount" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />)} /></div>
                                    <Button type="button" variant="destructive" size="icon" onClick={() => removeOtherExpense(index)}><Icons.trash className="h-4 w-4" /></Button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="outline" onClick={() => appendOtherExpense({ description: '', amount: 0 })} className="mt-4"><Icons.plus className="mr-2" /> Add Expense</Button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-4 border rounded-lg">
                        <h3 className="text-lg font-medium mb-4 text-primary">Output / Finished Goods</h3>
                        <div className="space-y-2">
                             {finishedGoodFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-10 gap-2 items-end">
                                    <div className="col-span-6"><FormLabel className={cn(index !== 0 && 'sr-only')}>Product</FormLabel>
                                        <CreatableSelect
                                          options={inventoryOptions}
                                          value={form.watch(`finishedGoods.${index}.itemId`)}
                                          onChange={(value) => form.setValue(`finishedGoods.${index}.itemId`, value)}
                                          onCreate={(value) => {
                                            handleCreateItem(value).then(newId => {
                                               form.setValue(`finishedGoods.${index}.itemId`, newId)
                                            });
                                          }}
                                          createText={(value) => `+ Create "${value}"`}
                                          placeholder="Select product"
                                        />
                                    </div>
                                    <div className="col-span-3"><FormLabel className={cn(index !== 0 && 'sr-only')}>Qty</FormLabel><FormField control={form.control} name={`finishedGoods.${index}.quantity`} render={({ field }) => (<Input type="number" placeholder="Qty" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />)} /></div>
                                    <Button type="button" variant="destructive" size="icon" onClick={() => removeFinishedGood(index)}><Icons.trash className="h-4 w-4" /></Button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="outline" onClick={() => appendFinishedGood({ itemId: '', quantity: 1 })} className="mt-4"><Icons.plus className="mr-2" /> Add Product</Button>
                    </div>
                    <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                        <h3 className="text-lg font-medium text-primary">Production Summary</h3>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Raw Material Cost</span><span className="font-semibold">PKR {totalRawMaterialCost.toFixed(2)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Labor Cost</span><span className="font-semibold">PKR {totalLaborCost.toFixed(2)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Other Expenses</span><span className="font-semibold">PKR {totalOtherExpenses.toFixed(2)}</span></div>
                        <Separator />
                        <div className="flex justify-between items-center text-lg"><span className="font-bold">Total Production Cost</span><span className="font-bold">PKR {totalProductionCost.toFixed(2)}</span></div>
                        <Separator />
                        <div className="flex justify-between items-center text-muted-foreground"><span className="">Finished Goods Produced</span><span className="">{totalFinishedGoodsQty} Units</span></div>
                        <div className="flex justify-between items-center text-xl"><span className="font-bold text-primary">Per Unit Cost</span><span className="font-bold text-primary">PKR {perUnitCost.toFixed(2)}</span></div>
                    </div>
                </div>
            </div>

            <CardFooter className="flex justify-end gap-2 p-0 pt-6">
                <Button type="submit">
                    <Icons.plus className="mr-2" /> {isEditMode ? 'Save Changes' : 'Finalize Production' }
                </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
