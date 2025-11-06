
"use client";

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
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { dbLoad, dbSave } from "@/lib/db";

const formSchema = z.object({
  itemId: z.string().min(1, "Please select an item."),
  adjustmentType: z.enum(["add", "subtract"]),
  quantity: z.number().min(1, "Quantity must be at least 1."),
  reason: z.string().min(3, "Please provide a reason for the adjustment."),
});

type AdjustmentFormValues = z.infer<typeof formSchema>;

type Item = {
    id: string;
    name: string;
    stock: number;
}

export function StockAdjustments() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [inventory, setInventory] = useState<Item[]>([]);
  const [currentItemStock, setCurrentItemStock] = useState<number | null>(null);

  useEffect(() => {
    const fetchInventory = async () => {
        const storedInventory = await dbLoad("inventory");
        setInventory(storedInventory);
    }
    fetchInventory();
  }, []);

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      adjustmentType: "add",
      quantity: 1,
    },
  });

  const handleItemChange = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if(item) {
        setCurrentItemStock(item.stock);
        form.setValue("itemId", itemId);
    }
  }

  const onSubmit = async (data: AdjustmentFormValues) => {
    try {
        const currentInventory: Item[] = await dbLoad("inventory");
        const itemIndex = currentInventory.findIndex(i => i.id === data.itemId);
        
        if (itemIndex === -1) {
            throw new Error("Item not found");
        }

        const item = currentInventory[itemIndex];
        let newStock = item.stock;

        if (data.adjustmentType === "add") {
            newStock += data.quantity;
        } else {
            if(item.stock < data.quantity) {
                form.setError("quantity", { message: "Cannot subtract more than available stock."});
                return;
            }
            newStock -= data.quantity;
        }

        currentInventory[itemIndex].stock = newStock;
        await dbSave("inventory", currentInventory);

        // Record the adjustment
        const adjustmentHistory = await dbLoad("stock-adjustments");
        const newAdjustment = {
            id: `ADJ-${Date.now()}`,
            date: new Date().toISOString(),
            ...data
        };
        adjustmentHistory.push(newAdjustment);
        await dbSave("stock-adjustments", adjustmentHistory);


        toast({
            title: "Stock Adjusted",
            description: `Stock for ${item.name} has been updated to ${newStock}.`,
        });
        
        setInventory(currentInventory);
        setCurrentItemStock(newStock);
        form.reset({
            adjustmentType: "add",
            quantity: 1,
            itemId: data.itemId,
            reason: ""
        });

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to adjust stock. Please try again.",
      });
    }
  };
  
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t('stockAdjustments')}</CardTitle>
        <CardDescription>Manually add or remove stock for items.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="itemId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Select Item</FormLabel>
                        <Select onValueChange={handleItemChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Choose an item to adjust" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {inventory.map(item => (
                                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {currentItemStock !== null && (
                            <p className="text-sm text-muted-foreground mt-2">Current Stock: {currentItemStock}</p>
                        )}
                        <FormMessage />
                        </FormItem>
                    )}
                />

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                    control={form.control}
                    name="adjustmentType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Adjustment Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="add">Add Stock (+)</SelectItem>
                                <SelectItem value="subtract">Remove Stock (-)</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                           <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Reason for Adjustment</FormLabel>
                    <FormControl>
                        <Textarea placeholder="e.g., Found extra items during count, Damaged goods, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <CardFooter className="flex justify-end gap-2 p-0 pt-6">
                <Button type="submit">
                    <Icons.plus className="mr-2" /> Adjust Stock
                </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
