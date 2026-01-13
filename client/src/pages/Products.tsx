import { useCategories, useCreateProduct, useCreateProductsBatch, useProducts } from "@/hooks/use-products";
import { Loader2, Plus, Upload, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productFormSchema, type ProductFormValues } from "@/types/schemas";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import type { Category, Product, ProductInput } from "@/types/models";

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const createProductMutation = useCreateProduct();
  const createBatchMutation = useCreateProductsBatch();

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
      const payload: ProductInput = {
        name: data.name,
        price: Number(data.price),
        description: data.description ?? "",
        categoryId: data.categoryId || null,
        images: data.images ?? [],
        stock: data.stock,
        isEnabled: data.isEnabled,
      };

      await createProductMutation.mutateAsync(payload);
      toast({ title: "Product added successfully" });
      setIsAddModalOpen(false);
      form.reset();
    } catch (err: any) {
      toast({
        title: "Failed to add product",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleExportTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Product Name": "Example Product",
        "Normal Price": "100.00",
        "Pic (001.jpg)": "image_url_here",
        Unit: "10",
      },
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
        const json = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

        const defaultCategoryId = categories?.[0]?.id ?? null;

        const formattedProducts: ProductInput[] = json.map((row) => ({
          name: String(row["Product Name"] ?? ""),
          price: Number(row["Normal Price"] ?? 0),
          images: row["Pic (001.jpg)"] ? [String(row["Pic (001.jpg)"])] : [],
          stock: parseInt(String(row["Unit"] ?? 0), 10) || 0,
          categoryId: defaultCategoryId,
          description: "",
          isEnabled: true,
        }));

        await createBatchMutation.mutateAsync(formattedProducts);
        toast({
          title: "Success",
          description: `Uploaded ${formattedProducts.length} products`,
        });
      } catch (err: any) {
        toast({
          title: "Upload Failed",
          description: err.message,
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (isLoading)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );

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
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTemplate}
                className="gap-2"
              >
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
                                <Input
                                  {...field}
                                  type="number"
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value, 10);
                                    field.onChange(Number.isNaN(value) ? 0 : value);
                                  }}
                                />
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
                            <Select onValueChange={field.onChange} value={field.value ?? ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories?.map((cat: Category) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </SelectItem>
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
                              <Textarea
                                {...field}
                                value={field.value || ""}
                                placeholder="Product description..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          "Save Product"
                        )}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products?.map((product: Product) => (
          <div
            key={product.id}
            className="group bg-card border border-border/40 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="aspect-[4/3] bg-secondary/20 relative overflow-hidden">
              <img
                src={
                  Array.isArray(product.images) && product.images[0]
                    ? String(product.images[0])
                    : "https://placehold.co/600x400/171A1D/D4B16A?text=Product"
                }
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-3 right-3">
                <span
                  className={`px-2 py-1 text-xs font-bold rounded-full ${(product.stock ?? 0) > 0 ? "bg-mint/90 text-teal-950" : "bg-destructive/90 text-white"}`}
                >
                  {(product.stock ?? 0) > 0 ? "In Stock" : "Out of Stock"}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <h3 className="font-semibold text-lg leading-tight truncate">{product.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2 min-h-[2.5em]">
                  {product.description || "No description available"}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-lg font-bold text-primary">
                  ฿{Number(product.price).toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  {categories?.find((c: Category) => c.id === product.categoryId)?.name ||
                    "Uncategorized"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
