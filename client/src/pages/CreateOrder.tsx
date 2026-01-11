import { useState } from "react";
import { useProducts } from "@/hooks/use-products";
import { useCreateOrder } from "@/hooks/use-orders";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type Product } from "@shared/schema";

interface CartItem {
  productId: number;
  product: Product;
  quantity: number;
}

export default function CreateOrder() {
  const { data: products, isLoading } = useProducts();
  const { mutateAsync: createOrder, isPending } = useCreateOrder();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    doctorName: "",
    address: ""
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
    toast({ title: "Added to cart", description: product.name });
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
        total: total.toString(), // Store as string for decimal type
        status: "draft",
        customerInfo,
        attachments: []
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-140px)]">
      {/* Product Selection Column */}
      <div className="lg:col-span-2 space-y-6 flex flex-col h-full">
        <div>
          <h1 className="text-2xl font-display font-bold">New Order</h1>
          <p className="text-muted-foreground">Select products to add to this order</p>
        </div>
        
        <div className="bg-card border border-border/50 rounded-2xl p-4 flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {products?.map(product => (
              <div 
                key={product.id} 
                className="bg-secondary/20 border border-border/50 rounded-xl overflow-hidden hover:border-primary/50 transition-all group"
              >
                <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                  <img 
                    src={Array.isArray(product.images) && product.images[0] ? String(product.images[0]) : "https://placehold.co/600x400/171A1D/D4B16A?text=Product"} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <button 
                    onClick={() => addToCart(product)}
                    className="absolute bottom-2 right-2 p-2 bg-primary text-primary-foreground rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold truncate">{product.name}</h3>
                  <p className="text-primary font-medium text-sm mt-1">${Number(product.price).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Summary Column */}
      <div className="bg-card border border-border rounded-2xl shadow-xl flex flex-col h-full overflow-hidden">
        <div className="p-6 border-b border-border bg-secondary/10">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" /> 
            Current Order
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Customer Details</h3>
            <input 
              className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="Doctor / Clinic Name"
              value={customerInfo.doctorName}
              onChange={e => setCustomerInfo({...customerInfo, doctorName: e.target.value})}
            />
            <textarea 
              className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none h-20"
              placeholder="Delivery Address"
              value={customerInfo.address}
              onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Items ({cart.length})</h3>
            
            <AnimatePresence>
              {cart.map(item => (
                <motion.div 
                  key={item.productId}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 bg-secondary/20 p-3 rounded-xl"
                >
                  <div className="w-12 h-12 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={Array.isArray(item.product.images) && item.product.images[0] ? String(item.product.images[0]) : "https://placehold.co/100x100/171A1D/D4B16A?text=img"} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                    <p className="text-xs text-muted-foreground">${Number(item.product.price).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="w-6 h-6 flex items-center justify-center bg-background rounded border hover:border-primary">-</button>
                    <span className="text-sm font-mono w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="w-6 h-6 flex items-center justify-center bg-background rounded border hover:border-primary">+</button>
                  </div>
                  <button onClick={() => removeFromCart(item.productId)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {cart.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">Your cart is empty.</p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-border bg-secondary/5 space-y-4">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">${total.toFixed(2)}</span>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={cart.length === 0 || isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="animate-spin" /> : <>Save Draft <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
