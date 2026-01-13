import { useProducts, useCategories, useCreateProduct, useBatchCreateProducts } from "@/hooks/use-products";
import { Loader2, Plus, Upload, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import type { Category } from "@/lib/services/dbService";

const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  price: z.string().min(1, "Price is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  images: z.array(z.string()).default([]),
  stock: z.number().min(0),
  isEnabled: z.boolean(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { mutateAsync: createProduct } = useCreateProduct();
  const { mutateAsync: batchCreateProducts } = useBatchCreateProducts();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      price: "",
      description: "",
      categoryId: "",
      images: [],
      stock: 0,
      isEnabled: true,
    },
  });

  const onSubmit = async (data: ProductFormValues) => {
    try {
      await createProduct({
        ...data,
        categoryId: data.categoryId,
        description: data.description || "",
      });
      toast({ title: "Product added successfully" });
      setIsAddModalOpen(false);
      form.reset();
    } catch (err: any) {
      toast({ title: "Failed to add product", description: err.message, variant: "destructive" });
    }
  };

  const handleExportTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "Product Name": "Example Product", "Normal Price": "100.00", "Pic (001.jpg)": "image_url_here", "Unit": "10" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "product_template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        const defaultCategoryId = categories?.[0]?.id ?? "";
        const formattedProducts = json.map((row) => ({
          name: String(row["Product Name"]),
          price: String(row["Normal Price"]),
          images: row["Pic (001.jpg)"] ? [String(row["Pic (001.jpg)"])] : [],
          stock: Number.parseInt(String(row["Unit"])) || 0,
          categoryId: defaultCategoryId,
          description: "",
          isEnabled: true,
        }));

        await batchCreateProducts(formattedProducts);
        toast({ title: "Success", description: `Uploaded ${formattedProducts.length} products` });
      } catch (err: any) {
        toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your inventory catalog</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === "admin" && (
            <>
              <Button variant="outline" size="sm" onClick={handleExportTemplate} className="gap-2">
                <FileDown className="w-4 h-4" /> Template
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  title="Upload Excel"
                />
                <Button variant="outline" size="sm" className="gap-2 pointer-events-none">
                  <Upload className="w-4 h-4" /> Batch Upload
                </Button>
              </div>

              <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>
                      Enter the details of the new product to add it to the inventory.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter product name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price (฿)</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" step="0.01" placeholder="0.00" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="stock"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stock</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" onChange={(e) => field.onChange(Number.parseInt(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories?.map((cat: Category) => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} value={field.value || ""} placeholder="Product description..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "Save Product"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products?.map((product) => (
          <div key={product.id} className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="aspect-[4/3] bg-secondary/10 relative">
              <img
                src={Array.isArray(product.images) && product.images[0] ? String(product.images[0]) : "https://placehold.co/600x400/171A1D/D4B16A?text=Product"}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-5 space-y-2">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="font-semibold text-lg leading-tight">{product.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                </div>
                <span className="text-lg font-bold text-primary">฿{Number(product.price).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Stock: {product.stock ?? 0}</span>
                <span>{product.isEnabled ? "Enabled" : "Disabled"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
