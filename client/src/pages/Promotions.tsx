import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { promotionFormSchema, type PromotionFormValues } from "@/types/schemas";
import { Loader2, Plus, Trash2, Tag, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { fetchPromotions, createPromotion, deletePromotion } from "@/services/promotions";
import { fetchProducts } from "@/services/products";
import type { Product, Promotion } from "@/types/models";
import { queryClient } from "@/lib/queryClient";

export default function Promotions() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: promotions, isLoading: isLoadingPromos } = useQuery<Promotion[]>({
    queryKey: ["promotions"],
    queryFn: fetchPromotions,
    enabled: user?.role === "admin" || user?.role === "staff",
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      name: "",
      productId: "",
      withdrawAmount: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PromotionFormValues) => {
      await createPromotion({
        name: data.name,
        productId: data.productId,
        withdrawAmount: data.withdrawAmount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      toast({ title: "Promotion created successfully" });
      form.reset();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deletePromotion(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      toast({ title: "Promotion deleted" });
    },
  });

  if (user?.role !== "admin" && user?.role !== "staff") {
    return <div className="p-8 text-center">Unauthorized. Only Admins and Staff can access this page.</div>;
  }

  if (isLoadingPromos)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Promotions</h1>
          <p className="text-muted-foreground">Manage exclusive offers and product campaigns</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {user?.role === "admin" && (
          <Card className="border-border/40 shadow-xl shadow-black/20 overflow-hidden h-fit">
            <CardHeader className="bg-primary/5 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Create Promotion</CardTitle>
                  <CardDescription>Setup a new product promotion</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Promotion Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Summer Special" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Product</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products?.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} (฿{Number(p.price).toLocaleString()})
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
                    name="withdrawAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Withdraw Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
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

                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="animate-spin" /> : "Create Promotion"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <div className={user?.role === "admin" ? "space-y-4" : "space-y-4 lg:col-span-2"}>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" /> Active Promotions
          </h2>
          {!promotions || promotions.length === 0 ? (
            <div className="p-8 text-center bg-secondary/10 rounded-2xl border border-dashed border-border/40">
              <p className="text-muted-foreground">No promotions found.</p>
            </div>
          ) : (
            promotions.map((promo: Promotion) => (
              <Card
                key={promo.id}
                className="border-border/40 overflow-hidden group hover:border-primary/50 transition-all"
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">{promo.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {products?.find((p) => p.id === promo.productId)?.name || "Unknown Product"} •
                      {" "}
                      {promo.withdrawAmount} Units
                    </p>
                  </div>
                  {user?.role === "admin" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteMutation.mutate(promo.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
