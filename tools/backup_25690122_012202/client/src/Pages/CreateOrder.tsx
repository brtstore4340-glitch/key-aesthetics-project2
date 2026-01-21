import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCreateOrder } from "@/hooks/use-orders";
import { useCategories, useProducts } from "@/hooks/use-products";
import { useToast } from "@/hooks/use-toast";
import { promotions } from "@/lib/constants";
import type { Product } from "@shared/schema";
import {
  ArrowRight,
  CheckCircle2,
  LayoutGrid,
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

interface CartItem {
  productId: number;
  product: Product;
  quantity: number;
  promotion: string;
}

export default function CreateOrder() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { mutateAsync: createOrder, isPending } = useCreateOrder();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  
  const [customerInfo, setCustomerInfo] = useState({
    doctorName: "",
    doctorId: "",
    phone: "",
    address: "",
  });
  const [discountInput, setDiscountInput] = useState("0");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "all" || p.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  // Cart Operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prev, { productId: product.id, product, quantity: 1, promotion: promotions[0] }];
    });
    toast({
      title: "Added to cart",
      description: `${product.name} added.`,
      duration: 1000,
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId === productId) {
            const newQuantity = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const setQuantity = (productId: number, value: string) => {
    const qty = parseInt(value);
    if (isNaN(qty) || qty < 0) return;
    
    if (qty === 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item))
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountInput("0");
    setCustomerInfo({ doctorName: "", doctorId: "", phone: "", address: "" });
  };

  // Calculations
  const subTotal = cart.reduce((sum, item) => {
    return sum + Number(item.product.price) * item.quantity;
  }, 0);

  const parseAmount = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    return Number.parseFloat(cleaned || "0");
  };

  const discount = parseAmount(discountInput);
  const taxableBase = Math.max(0, subTotal - discount);
  const vatAmount = taxableBase * 0.07;
  const grandTotal = taxableBase + vatAmount;

  const handleConfirmCheckout = () => {
    // Simulate processing
    toast({ title: "Processing payment...", duration: 1000 });
    
    setTimeout(() => {
        toast({ 
          title: "Payment Successful", 
          description: `Total ฿${grandTotal.toLocaleString()} received.`,
          duration: 3000
        });
        handleClearCart();
        setIsCheckoutOpen(false);
    }, 1000);
  };

  if (productsLoading || categoriesLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col lg:flex-row gap-6 pb-4">
      {/* LEFT COLUMN: PRODUCTS */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex flex-col gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm">
          {/* Header & Search */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-slate-800">Products</h1>
              <p className="text-sm text-muted-foreground">Select products to add to cart</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 bg-white border-slate-200"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
              className="rounded-full px-4"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              All
            </Button>
            {categories?.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="rounded-full px-4 whitespace-nowrap"
                style={
                  selectedCategory === cat.id
                    ? { backgroundColor: cat.colorTag, borderColor: cat.colorTag }
                    : {}
                }
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <ScrollArea className="flex-1 rounded-2xl border border-slate-100 bg-white/40 shadow-inner p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group relative bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col"
                onClick={() => addToCart(product)}
              >
                <div className="aspect-square bg-slate-50 relative overflow-hidden">
                  <img
                    src={
                      Array.isArray(product.images) && product.images[0]
                        ? String(product.images[0])
                        : "https://placehold.co/200x200/F1F5F9/94A3B8?text=Product"
                    }
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  {/* Overlay Add Button */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-white text-primary rounded-full p-2 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      <Plus className="w-6 h-6" />
                    </div>
                  </div>
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1">{product.name}</h3>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-primary font-bold">฿{Number(product.price).toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">Stock: {product.stock}</span>
                  </div>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p>No products found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* RIGHT COLUMN: CART */}
      <Card className="w-full lg:w-[400px] flex flex-col shadow-xl border-slate-200 h-full overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Current Order
            </CardTitle>
            <Badge variant="secondary" className="font-mono">
              {cart.length} Items
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 bg-white/50">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-60">
              <ShoppingCart className="w-16 h-16" />
              <p>Cart is empty</p>
              <p className="text-xs">Select products to start selling</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                className="flex gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm"
              >
                <div className="w-16 h-16 rounded-lg bg-slate-50 overflow-hidden flex-shrink-0 border border-slate-100">
                   <img
                    src={
                      Array.isArray(item.product.images) && item.product.images[0]
                        ? String(item.product.images[0])
                        : "https://placehold.co/100x100/F1F5F9/94A3B8?text=Img"
                    }
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium text-sm truncate leading-tight">{item.product.name}</p>
                    <button 
                      onClick={() => removeFromCart(item.productId)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => updateQuantity(item.productId, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Input
                        className="h-7 w-12 px-1 text-center font-mono text-sm"
                        value={item.quantity}
                        onChange={(e) => setQuantity(item.productId, e.target.value)}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => updateQuantity(item.productId, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="font-bold text-sm">
                      ฿{(Number(item.product.price) * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>

        <CardFooter className="flex-col bg-slate-50/80 border-t border-slate-100 p-4 gap-4 backdrop-blur-sm">
          <div className="w-full space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>฿{subTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-muted-foreground whitespace-nowrap">Discount</span>
              <Input 
                className="h-8 w-24 text-right" 
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
              />
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>VAT (7%)</span>
              <span>฿{vatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg text-slate-800">
              <span>Total</span>
              <span className="text-primary">฿{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 w-full">
            <Button 
              variant="outline" 
              className="col-span-1 border-destructive/20 text-destructive hover:bg-destructive/10"
              onClick={handleClearCart}
              disabled={cart.length === 0}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
            <Button 
              className="col-span-3 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20"
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
            >
              Checkout
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* CHECKOUT DIALOG */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-primary" />
              Order Summary & Payment
            </DialogTitle>
            <DialogDescription>
              Review the order details and complete customer information.
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6 py-4">
            {/* Left: Summary */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Order Items
              </h3>
              <div className="bg-slate-50 rounded-xl p-4 space-y-3 max-h-[300px] overflow-y-auto border border-slate-100">
                {cart.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.product.name}</span>
                      <div className="text-muted-foreground text-xs">
                        {item.quantity} x ฿{Number(item.product.price).toLocaleString()}
                      </div>
                    </div>
                    <span className="font-semibold">
                      ฿{(Number(item.product.price) * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-bold pt-2">
                  <span>Grand Total</span>
                  <span className="text-primary">฿{grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Right: Customer Info */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="w-4 h-4" /> Customer Information
              </h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Doctor Name</label>
                  <Input 
                    placeholder="ex. Dr. Somchai" 
                    value={customerInfo.doctorName}
                    onChange={(e) => setCustomerInfo({...customerInfo, doctorName: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Doctor ID</label>
                  <Input 
                    placeholder="Medical License ID" 
                    value={customerInfo.doctorId}
                    onChange={(e) => setCustomerInfo({...customerInfo, doctorId: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Phone</label>
                  <Input 
                    placeholder="08x-xxx-xxxx" 
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Address</label>
                  <Textarea 
                    placeholder="Shipping Address" 
                    className="h-20 resize-none"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCheckout} className="bg-primary text-white">
              Confirm Payment (Demo)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
