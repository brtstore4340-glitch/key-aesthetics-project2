import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useCategories, useProducts } from "@/hooks/use-products";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@shared/routes";
import { type Category, type Product, insertProductSchema } from "@shared/schema";
import { Edit, FileDown, Loader2, Plus, Power, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as XLSX from "xlsx";

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const form = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      price: "",
      description: "",
      categoryId: undefined as unknown as number,
      images: [] as string[],
      stock: 0,
      isEnabled: true,
    },
  });

  const onSubmit = async (data: any) => {
    try {
      if (editingProduct) {
        await apiRequest(
          "PUT",
          api.products.update.path.replace(":id", editingProduct.id.toString()),
          data,
        );
        toast({ title: "Product updated successfully" });
      } else {
        await apiRequest("POST", api.products.create.path, data);
        toast({ title: "Product added successfully" });
      }
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      setIsAddModalOpen(false);
      setEditingProduct(null);
      form.reset();
    } catch (err: any) {
      toast({
        title: editingProduct ? "Failed to update product" : "Failed to add product",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      price: product.price.toString(),
      description: product.description || "",
      categoryId: product.categoryId || (undefined as unknown as number),
      images: product.images || [],
      stock: product.stock || 0,
      isEnabled: product.isEnabled ?? true,
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await apiRequest("DELETE", api.products.delete.path.replace(":id", deletingId.toString()));
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      toast({ title: "Product deleted successfully" });
    } catch (err: any) {
      toast({
        title: "Failed to delete product",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await apiRequest("PUT", api.products.update.path.replace(":id", product.id.toString()), {
        isEnabled: !product.isEnabled,
      });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      toast({
        title: product.isEnabled ? "Product deactivated" : "Product activated",
      });
    } catch (err: any) {
      toast({
        title: "Failed to update status",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleModalOpenChange = (open: boolean) => {
    setIsAddModalOpen(open);
    if (!open) {
      setEditingProduct(null);
      form.reset({
        name: "",
        price: "",
        description: "",
        categoryId: undefined as unknown as number,
        images: [] as string[],
        stock: 0,
        isEnabled: true,
      });
    }
  };

  const handleExportTemplate = () => {
    // Download the static template file
    const link = document.createElement("a");
    link.href = "/up_product_template.xlsx";
    link.download = "up_product_template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

        const formattedProducts = json.map((row) => ({
          name: String(row["Product Name"]),
          price: String(row["Normal Price"]),
          images: row["Pic (001.jpg)"] ? [String(row["Pic (001.jpg)"])] : [],
          stock: Number.parseInt(String(row.Unit)) || 0,
          categoryId: categories?.[0]?.id || null, // Default to first category
          description: "",
          isEnabled: true,
        }));

        await apiRequest("POST", api.products.batchCreate.path, formattedProducts);
        queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
        toast({ title: "Success", description: `Uploaded ${formattedProducts.length} products` });
      } catch (err: any) {
        toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
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
                  name="productUpload"
                  id="productUpload"
                />
                <Button variant="outline" size="sm" className="gap-2 pointer-events-none">
                  <Upload className="w-4 h-4" /> Batch Upload
                </Button>
              </div>

              <Dialog open={isAddModalOpen} onOpenChange={handleModalOpenChange}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                    <DialogDescription>
                      {editingProduct
                        ? "Update the product details below."
                        : "Enter the details of the new product to add it to the inventory."}
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
                                  onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
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
                            <Select
                              onValueChange={(v) => field.onChange(Number.parseInt(v))}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories?.map((cat: Category) => (
                                  <SelectItem key={cat.id} value={cat.id.toString()}>
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
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={form.formState.isSubmitting}
                      >
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

              {user?.role === "admin" && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(product)}
                    className={product.isEnabled ? "text-green-600" : "text-muted-foreground"}
                    title={product.isEnabled ? "Deactivate" : "Activate"}
                  >
                    <Power className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeletingId(product.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
