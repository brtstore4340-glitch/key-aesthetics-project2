import { useState } from "react";
import { useProducts, useCategories } from "@/hooks/use-products";
import { useCreateOrder } from "@/hooks/use-orders";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Product } from "@/lib/services/dbService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
}

export default function CreateOrder() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { mutateAsync: createOrder, isPending } = useCreateOrder();
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    doctorName: "",
    address: "",
  });

  const filteredProducts = products?.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId: product.id, product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const total = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    try {
      const orderData = {
        items: cart.map((item) => ({
          productId: item.productId,
          name: item.product.name,
          quantity: item.quantity,
          price: Number(item.product.price),
        })),
        total,
        status: "draft",
        customerInfo,
        attachments: [],
        createdBy: user?.id,
      };
      await createOrder(orderData);
      toast({ title: "Order created!", description: "Draft saved successfully." });
      setLocation("/orders");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-120px)] overflow-hidden">
      {/* Product Selection Column */}
      <div className="lg:col-span-8 flex flex-col h-full space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Product Selection</h1>
            <p className="text-muted-foreground">Select premium products for your order</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 w-[200px] bg-secondary/20 border-border/40"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <Button
            variant={!selectedCategory ? "default" : "secondary"}
            size="sm"
            className="rounded-full"
            onClick={() => setSelectedCategory(null)}
          >
            All Products
          </Button>
          {categories?.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "secondary"}
              size="sm"
              className="rounded-full whitespace-nowrap"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProducts?.map((product) => {
              const cartItem = cart.find((item) => item.productId === product.id);
              return (
                <Card
                  key={product.id}
                  className="group relative border-border/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden hover:-translate-y-1"
                >
                  <div className="aspect-[4/3] bg-secondary/10 relative overflow-hidden">
                    <img
                      src={Array.isArray(product.images) && product.images[0] ? String(product.images[0]) : "https://placehold.co/600x400/171A1D/D4B16A?text=Product"}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {cartItem && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-primary text-primary-foreground shadow-lg animate-in zoom-in duration-300">
                          {cartItem.quantity} selected
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors truncate">
                        {product.name}
                      </h3>
                      <span className="text-xl font-bold text-primary shrink-0">
                        ฿{Number(product.price).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {cartItem ? (
                        <div className="flex items-center justify-between w-full bg-secondary/40 rounded-xl p-1 animate-in slide-in-from-bottom-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-background shadow-sm"
                            onClick={() => updateQuantity(product.id, -1)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="font-mono font-bold text-sm px-4">{cartItem.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-background shadow-sm"
                            onClick={() => updateQuantity(product.id, 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          className="w-full rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all gap-2"
                          onClick={() => addToCart(product)}
                        >
                          <Plus className="w-4 h-4" /> Add to Order
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Order Summary Column */}
      <div className="lg:col-span-4 flex flex-col h-full bg-card border border-border/40 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <ShoppingBag className="w-6 h-6 text-primary" />
          <h2 className="font-display font-bold text-xl tracking-tight">Order Details</h2>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Start adding products to your order</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {cart.map((item) => (
                  <motion.div
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-4 p-3 rounded-xl bg-secondary/20"
                  >
                    <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden">
                      <img
                        src={Array.isArray(item.product.images) && item.product.images[0] ? String(item.product.images[0]) : "https://placehold.co/600x400/171A1D/D4B16A?text=Product"}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{item.product.name}</h4>
                      <p className="text-xs text-muted-foreground">฿{Number(item.product.price).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" onClick={() => updateQuantity(item.productId, -1)}>
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="font-mono text-sm font-bold">{item.quantity}</span>
                      <Button size="icon" variant="ghost" onClick={() => updateQuantity(item.productId, 1)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeFromCart(item.productId)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-border/40 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Doctor Name</label>
            <Input
              value={customerInfo.doctorName}
              onChange={(e) => setCustomerInfo((prev) => ({ ...prev, doctorName: e.target.value }))}
              placeholder="Enter doctor name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Delivery Address</label>
            <Input
              value={customerInfo.address}
              onChange={(e) => setCustomerInfo((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Enter address"
            />
          </div>

          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span>฿{total.toLocaleString()}</span>
          </div>

          <Button
            className="w-full rounded-xl shadow-lg shadow-primary/20"
            size="lg"
            disabled={isPending || cart.length === 0}
            onClick={handleSubmit}
          >
            {isPending ? <Loader2 className="animate-spin w-6 h-6" /> : <>Complete Order <ArrowRight className="w-5 h-5" /></>}
          </Button>
        </div>
      </div>
    </div>
  );
}
