import { useState } from "react";
import { useProducts, useCategories } from "@/hooks/use-products";
import { useCreateOrder } from "@/hooks/use-orders";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Search, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type Product } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CartItem {
  productId: number;
  product: Product;
  quantity: number;
}

export default function CreateOrder() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { mutateAsync: createOrder, isPending } = useCreateOrder();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    doctorName: "",
    address: ""
  });

  const filteredProducts = products?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { productId: product.id, product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((sum, item) => sum + (Number(item.product.price) * item.quantity), 0);

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    try {
      const orderData = {
        items: cart.map(item => ({
          productId: item.productId,
          name: item.product.name,
          quantity: item.quantity,
          price: Number(item.product.price)
        })),
        total: total.toString(),
        status: "draft",
        customerInfo,
        attachments: []
      };
      await createOrder(orderData as any);
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
                name="productSearch"
                id="productSearch"
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
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
          {categories?.map(cat => (
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
            {filteredProducts?.map(product => {
              const cartItem = cart.find(item => item.productId === product.id);
              const isOutOfStock = (product.stock ?? 0) <= 0;
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
                    {isOutOfStock && (
                      <div className="absolute top-3 right-3">
                        <Badge variant="destructive">Out of stock</Badge>
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
                            disabled={isOutOfStock}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          className="w-full rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all gap-2"
                          onClick={() => addToCart(product)}
                          disabled={isOutOfStock}
                        >
                          <Plus className="w-4 h-4" /> {isOutOfStock ? "Out of Stock" : "Add to Order"}
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
      <div className="lg:col-span-4 bg-card border border-border/40 rounded-3xl shadow-2xl flex flex-col h-full overflow-hidden relative">
        <div className="p-6 border-b border-border/40 bg-secondary/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <ShoppingBag className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-display font-bold text-xl tracking-tight">Order Details</h2>
          </div>
          {cart.length > 0 && (
             <Badge variant="outline" className="border-primary/30 text-primary">
               {cart.length} items
             </Badge>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Filter className="w-3 h-3" /> Customer Information
            </h3>
            <div className="space-y-3">
              <Input 
                className="bg-secondary/20 border-border/40 focus:ring-primary/20 h-11"
                name="doctorName"
                id="doctorName"
                placeholder="Doctor / Clinic Name"
                value={customerInfo.doctorName}
                onChange={e => setCustomerInfo({...customerInfo, doctorName: e.target.value})}
              />
              <textarea 
                className="w-full bg-secondary/20 border border-border/40 rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all resize-none h-24"
                name="address"
                id="address"
                placeholder="Detailed Delivery Address"
                value={customerInfo.address}
                onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Plus className="w-3 h-3" /> Selected Items
            </h3>
            
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {cart.map(item => {
                  const isOutOfStock = (item.product.stock ?? 0) <= 0;
                  return (
                  <motion.div 
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group flex items-center gap-4 bg-secondary/10 p-3 rounded-2xl border border-border/5 transition-colors hover:bg-secondary/20"
                  >
                    <div className="w-14 h-14 bg-secondary/30 rounded-xl overflow-hidden flex-shrink-0 border border-border/20 shadow-inner">
                      <img 
                        src={Array.isArray(item.product.images) && item.product.images[0] ? String(item.product.images[0]) : "https://placehold.co/100x100/171A1D/D4B16A?text=img"} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{item.product.name}</h4>
                      <p className="text-xs text-primary font-bold">฿{Number(item.product.price).toLocaleString()}</p>
                      {isOutOfStock && (
                        <p className="text-[10px] uppercase tracking-widest text-destructive mt-1">Out of stock</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 bg-background/50 rounded-lg p-1">
                      <button onClick={() => updateQuantity(item.productId, -1)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"><Minus className="w-3 h-3"/></button>
                      <span className="text-xs font-mono font-bold w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
                        disabled={isOutOfStock}
                      >
                        <Plus className="w-3 h-3"/>
                      </button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeFromCart(item.productId)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                );
                })}
              </AnimatePresence>

              {cart.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-60">
                  <div className="p-4 bg-secondary rounded-full">
                    <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">Your selection is empty</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="p-8 border-t border-border/40 bg-secondary/10 backdrop-blur-sm space-y-6">
          <div className="flex justify-between items-baseline">
            <span className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Grand Total</span>
            <div className="text-right">
              <span className="text-3xl font-display font-bold text-primary leading-none">฿{total.toLocaleString()}</span>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tighter">Vat Included</p>
            </div>
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={cart.length === 0 || isPending}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-lg font-bold shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 gap-3"
          >
            {isPending ? <Loader2 className="animate-spin w-6 h-6" /> : <>Complete Order <ArrowRight className="w-5 h-5" /></>}
          </Button>
        </div>
      </div>
    </div>
  );
}
