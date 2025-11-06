
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { dbLoad, dbSave } from "@/lib/db";
import { X, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAccessControl } from "@/hooks/use-access-control";

const formSchema = z.object({
  name: z.string().min(2, "Item name is required."),
  sku: z.string().optional(),
  variations: z.array(z.string()).optional(),
  initialStock: z.number().min(0, "Stock cannot be negative.").default(0),
  stockUnit: z.string().min(1, "Unit is required"),
  lowStockThreshold: z.number().min(0, "Threshold cannot be negative.").default(0),
  costPrice: z.number().min(0, "Cost price cannot be negative.").optional(),
  salePrice: z.number().min(0, "Sale price cannot be negative."),
  supplierId: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
});

type ItemFormValues = z.infer<typeof formSchema>;
type Supplier = { id: string; name: string; }

interface AddItemFormProps {
    itemToEdit?: ItemFormValues & { id: string, stock: number, price: number, unit: string, lowStock: number, isQuickAdd?: boolean };
    onFinish: () => void;
}

const generateItemId = async () => {
    const items = await dbLoad("inventory");
    const lastId = items
        .map(i => i.id)
        .filter(id => id && id.startsWith("ITEM-"))
        .map(id => parseInt(id.replace("ITEM-", ""), 10))
        .filter(num => !isNaN(num))
        .sort((a, b) => b - a)[0] || 0;
    return `ITEM-${String(lastId + 1).padStart(4, '0')}`;
};

export function AddItemForm({ itemToEdit, onFinish }: AddItemFormProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { isReadOnly } = useAccessControl();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [variationInput, setVariationInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const isEditMode = !!itemToEdit;


  useEffect(() => {
    const fetchSuppliers = async () => {
      const storedSuppliers = await dbLoad("suppliers");
      setSuppliers(storedSuppliers);
    };
    fetchSuppliers();
    if(isEditMode && itemToEdit?.image) {
        setImagePreview(itemToEdit.image);
    }
  }, [isEditMode, itemToEdit]);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
      name: itemToEdit.name,
      sku: itemToEdit.sku || '',
      variations: itemToEdit.variations || [],
      initialStock: itemToEdit.stock,
      stockUnit: itemToEdit.unit,
      lowStockThreshold: itemToEdit.lowStock,
      costPrice: itemToEdit.costPrice,
      salePrice: itemToEdit.price,
      supplierId: itemToEdit.supplierId,
      description: itemToEdit.description || '',
      image: itemToEdit.image || '',
    } : {
      name: "",
      sku: "",
      initialStock: 0,
      lowStockThreshold: 10,
      stockUnit: 'piece',
      salePrice: 0,
      costPrice: 0,
      variations: [],
      supplierId: "",
      description: "",
      image: "",
    },
  });

  const variations = form.watch('variations') || [];

  const handleAddVariation = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && variationInput.trim()) {
        e.preventDefault();
        const newVariation = variationInput.trim();
        if (!variations.includes(newVariation)) {
            form.setValue('variations', [...variations, newVariation]);
        }
        setVariationInput('');
    }
  };

  const removeVariation = (variationToRemove: string) => {
    form.setValue('variations', variations.filter(v => v !== variationToRemove));
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        form.setValue("image", result);
      };
      reader.readAsDataURL(file);
    }
  };


  const onSubmit = async (data: ItemFormValues) => {
    try {
      const existingInventory = await dbLoad("inventory");

      // Check for duplicate names
      const duplicate = existingInventory.find(
        (item: any) => item.name.toLowerCase() === data.name.toLowerCase() && item.id !== itemToEdit?.id
      );

      if (duplicate) {
        toast({
          variant: "destructive",
          title: "Duplicate Item",
          description: `An item with the name "${data.name}" already exists.`,
        });
        return;
      }

      if (isEditMode) {
        const index = existingInventory.findIndex(i => i.id === itemToEdit.id);
        if (index > -1) {
            existingInventory[index] = {
                ...existingInventory[index],
                name: data.name,
                sku: data.sku,
                variations: data.variations,
                stock: data.initialStock,
                unit: data.stockUnit,
                lowStock: data.lowStockThreshold,
                costPrice: data.costPrice,
                price: data.salePrice,
                supplierId: data.supplierId,
                description: data.description,
                image: data.image,
                isQuickAdd: false // Profile is now complete
            }
        }
      } else {
         const newItem = {
          id: await generateItemId(),
          name: data.name,
          sku: data.sku,
          variations: data.variations,
          stock: data.initialStock,
          unit: data.stockUnit,
          lowStock: data.lowStockThreshold,
          costPrice: data.costPrice,
          price: data.salePrice, // 'price' is used for sales
          supplierId: data.supplierId,
          description: data.description,
          image: data.image,
        };
        existingInventory.push(newItem);
      }
      
      await dbSave("inventory", existingInventory);
      
      toast({
        title: isEditMode ? "Item Updated" : "Item Added",
        description: `${data.name} has been ${isEditMode ? 'updated' : 'added'}.`,
      });
      onFinish();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'add'} item. Please try again.`,
      });
    }
  };
  
  const cardTitle = isEditMode ? "Edit Item" : t('addItem');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{cardTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Item Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Steel Pipe (1-inch)" {...field} disabled={isReadOnly} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>SKU / Barcode (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., SP-001" {...field} value={field.value || ''} disabled={isReadOnly} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="variations"
                render={() => (
                    <FormItem>
                        <FormLabel>Variations / Attributes</FormLabel>
                        <FormControl>
                            <div className="flex flex-col gap-2">
                                <Input 
                                    placeholder="e.g., Large, Medium, Small, Red, 22no (then press Enter)" 
                                    value={variationInput}
                                    onChange={(e) => setVariationInput(e.target.value)}
                                    onKeyDown={handleAddVariation}
                                    disabled={isReadOnly}
                                />
                                 <div className="flex flex-wrap gap-2">
                                    {variations.map((variation) => (
                                        <Badge key={variation} variant="secondary" className="flex items-center gap-1">
                                            {variation}
                                            <button type="button" onClick={() => !isReadOnly && removeVariation(variation)} className="rounded-full hover:bg-background/50">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <FormField
                    control={form.control}
                    name="initialStock"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{isEditMode ? 'Current Stock' : 'Opening Stock'}</FormLabel>
                        <FormControl>
                           <Input type="number" {...field} 
                           value={field.value === 0 ? '' : field.value}
                           onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                           disabled={isReadOnly}
                           />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="stockUnit"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="piece">Piece</SelectItem>
                                <SelectItem value="kg">Kilogram (kg)</SelectItem>
                                <SelectItem value="gram">Gram (g)</SelectItem>
                                <SelectItem value="liter">Liter (l)</SelectItem>
                                <SelectItem value="meter">Meter (m)</SelectItem>
                                <SelectItem value="box">Box</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="lowStockThreshold"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Low Stock Alert</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} 
                            value={field.value === 0 ? '' : field.value}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                            disabled={isReadOnly}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Purchase Price (Optional)</FormLabel>
                        <FormControl>
                           <Input type="number" placeholder="0.00" {...field} 
                           value={field.value === 0 ? '' : field.value}
                           onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                           disabled={isReadOnly}
                           />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="salePrice"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sale Price</FormLabel>
                        <FormControl>
                           <Input type="number" placeholder="0.00" {...field} 
                           value={field.value === 0 ? '' : field.value}
                           onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                           disabled={isReadOnly}
                           />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
             <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Default Supplier (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a supplier" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {suppliers.map(supplier => (
                                <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormItem>
                <FormLabel>Item Image (Optional)</FormLabel>
                 <FormControl>
                    <div className="flex items-center gap-4">
                        <label htmlFor="image-upload" className={cn("cursor-pointer border-2 border-dashed rounded-lg p-4 text-center w-full hover:bg-muted/50", isReadOnly && "cursor-not-allowed opacity-50")}>
                            {imagePreview ? (
                                <img src={imagePreview} alt="Item preview" className="h-24 w-24 object-contain mx-auto" />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <ImageIcon className="h-8 w-8" />
                                    <span>Click to upload image</span>
                                </div>
                            )}
                        </label>
                        <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={isReadOnly} />
                    </div>
                </FormControl>
            </FormItem>
            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Item description or notes" {...field} value={field.value || ''} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <CardFooter className="flex justify-end gap-2 p-0 pt-6">
                <Button type="submit" disabled={isReadOnly}>
                    <Icons.plus className="mr-2" /> {isEditMode ? 'Save Changes' : 'Save Item'}
                </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
