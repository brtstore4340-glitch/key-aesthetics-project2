import { useEffect, useMemo, useState } from "react";
import { useProducts } from "@/hooks/use-products";
import { useCreateOrder } from "@/hooks/use-orders";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Minus, ArrowRight, Search, ShoppingCart, ImagePlus, CreditCard } from "lucide-react";
import { type Product } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CartItem {
  productId: number;
  product: Product;
  quantity: number;
  promotion: string;
}

export default function CreateOrder() {
  const { data: products, isLoading } = useProducts();
  const { mutateAsync: createOrder, isPending } = useCreateOrder();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [customerInfo, setCustomerInfo] = useState({
    doctorName: "",
    doctorId: "",
    phone: "",
    address: ""
  });
  const [offeredPrice, setOfferedPrice] = useState("");
  const [discountInput, setDiscountInput] = useState("0");
  const [totalInput, setTotalInput] = useState("0");
  const [lastEdited, setLastEdited] = useState<"discount" | "total">("discount");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);

  const promotions = ["ไม่มีโปรโมชั่น", "ลด 5%", "ลด 10%", "แถมสินค้า"];

  const filteredProducts = products?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
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
      return [...prev, { productId: product.id, product, quantity: 1, promotion: promotions[0] }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => {
      const next = prev
        .map(item => {
          if (item.productId === productId) {
            return { ...item, quantity: item.quantity + delta };
          }
          return item;
        })
        .filter(item => item.quantity > 0);
      return next;
    });
  };

  const updatePromotion = (productId: number, promotion: string) => {
    setCart(prev => prev.map(item => (
      item.productId === productId ? { ...item, promotion } : item
    )));
  };

  const subTotal = cart.reduce((sum, item) => sum + (Number(item.product.price) * item.quantity), 0);
  const isRequiredInfoComplete = customerInfo.doctorName.trim().length > 0 && customerInfo.address.trim().length > 0;
  const canSubmit = cart.length > 0 && isRequiredInfoComplete && !isPending;

  const parseAmount = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    return Number.parseFloat(cleaned || "0");
  };

  useEffect(() => {
    if (lastEdited === "total") {
      const currentTotal = parseAmount(totalInput);
      const nextDiscount = Math.max(0, subTotal - currentTotal);
      setDiscountInput(nextDiscount.toFixed(2));
    } else {
      const currentDiscount = parseAmount(discountInput);
      const nextTotal = Math.max(0, subTotal - currentDiscount);
      setTotalInput(nextTotal.toFixed(2));
    }
  }, [subTotal]);

  const idCardPreview = useMemo(() => (idCardFile ? URL.createObjectURL(idCardFile) : ""), [idCardFile]);
  const paymentPreview = useMemo(() => (paymentFile ? URL.createObjectURL(paymentFile) : ""), [paymentFile]);

  useEffect(() => {
    return () => {
      if (idCardPreview) URL.revokeObjectURL(idCardPreview);
      if (paymentPreview) URL.revokeObjectURL(paymentPreview);
    };
  }, [idCardPreview, paymentPreview]);

  const handleDiscountChange = (value: string) => {
    setLastEdited("discount");
    setDiscountInput(value);
    const discountValue = parseAmount(value);
    const nextTotal = Math.max(0, subTotal - discountValue);
    setTotalInput(nextTotal.toFixed(2));
  };

  const handleTotalChange = (value: string) => {
    setLastEdited("total");
    setTotalInput(value);
    const totalValue = parseAmount(value);
    const nextDiscount = Math.max(0, subTotal - totalValue);
    setDiscountInput(nextDiscount.toFixed(2));
  };

  const buildOrderPayload = async (status: "draft" | "submitted") => {
    const attachments = [];
    const toDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

    if (idCardFile) {
      attachments.push({ type: "id_card" as const, url: await toDataUrl(idCardFile) });
    }
    if (paymentFile) {
      attachments.push({ type: "payment_slip" as const, url: await toDataUrl(paymentFile) });
    }

    return {
      items: cart.map(item => ({
        productId: item.productId,
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.product.price),
        promotion: item.promotion
      })),
      total: parseAmount(totalInput || subTotal.toFixed(2)).toString(),
      status,
      customerInfo: {
        ...customerInfo,
        offeredPrice
      },
      attachments
    };
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const orderData = await buildOrderPayload("draft");
      await createOrder(orderData as any);
      toast({ title: "Order created!", description: "Draft saved successfully." });
      setLocation("/orders");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCheckout = async () => {
    if (!canSubmit) {
      toast({ title: "กรอกข้อมูลไม่ครบ", description: "กรุณากรอกข้อมูลผู้ซื้อและเพิ่มสินค้าในตะกร้า", variant: "destructive" });
      return;
    }
    if (!idCardFile || !paymentFile) {
      toast({ title: "แนบไฟล์ไม่ครบ", description: "กรุณาแนบรูปบัตรประชาชนและสลิปชำระเงิน", variant: "destructive" });
      return;
    }
    try {
      const orderData = await buildOrderPayload("submitted");
      await createOrder(orderData as any);
      toast({ title: "Checkout สำเร็จ", description: "บันทึกคำสั่งซื้อเรียบร้อยแล้ว" });
      setCart([]);
      setDiscountInput("0");
      setTotalInput("0");
      setIdCardFile(null);
      setPaymentFile(null);
      setIsCheckoutOpen(false);
      setLocation("/orders");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-120px)] overflow-hidden">
      <div className="flex justify-end">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative h-11 w-11 rounded-full" aria-label="My cart">
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col gap-6">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                My Cart
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {cart.length === 0 && (
                <div className="text-center text-sm text-muted-foreground border border-dashed border-border/60 rounded-2xl py-10">
                  ยังไม่มีสินค้าในตะกร้า
                </div>
              )}
              {cart.map(item => (
                <div key={item.productId} className="flex gap-3 rounded-2xl border border-border/50 p-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-secondary/20 border border-border/30">
                    <img
                      src={Array.isArray(item.product.images) && item.product.images[0] ? String(item.product.images[0]) : "https://placehold.co/200x200/171A1D/D4B16A?text=Product"}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="font-semibold text-sm">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">฿{Number(item.product.price).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide text-primary/90">
                        {item.promotion}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1 rounded-lg border border-border/40 p-1">
                      <button
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-mono font-bold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs font-semibold text-primary">
                      ฿{(Number(item.product.price) * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 border-t border-border/50 pt-4">
              <p className="text-xs text-muted-foreground">Total = Sub Total - Discount</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sub Total</span>
                  <span className="font-semibold">฿{subTotal.toLocaleString()}</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Discount</label>
                  <Input
                    value={discountInput}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    inputMode="decimal"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Total</label>
                  <Input
                    value={totalInput}
                    onChange={(e) => handleTotalChange(e.target.value)}
                    inputMode="decimal"
                    className="h-10"
                  />
                </div>
              </div>

              <Button
                onClick={() => setIsCheckoutOpen(true)}
                disabled={cart.length === 0}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold"
              >
                Checkout
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <Card className="border-border/40 shadow-xl">
        <CardContent className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">ข้อมูลผู้ซื้อ</h1>
            <p className="text-muted-foreground text-sm">กรอกข้อมูลให้ครบถ้วนเพื่อบันทึกคำสั่งซื้อ</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="doctorName" className="text-sm font-medium">ชื่อ-นามสกุลแพทย์ (ระบุคำนำหน้า) *</label>
              <Input
                className="bg-secondary/20 border-border/40 focus:ring-primary/20 h-11"
                name="doctorName"
                id="doctorName"
                placeholder="นพ.สมชาย ใจดี"
                required
                value={customerInfo.doctorName}
                onChange={e => setCustomerInfo({ ...customerInfo, doctorName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="doctorId" className="text-sm font-medium">เลขบัตรประชาชน (ตัวเลขเท่านั้น)</label>
              <Input
                className="bg-secondary/20 border-border/40 focus:ring-primary/20 h-11"
                name="doctorId"
                id="doctorId"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="1234567890123"
                value={customerInfo.doctorId}
                onChange={e => {
                  const digitsOnly = e.target.value.replace(/\D/g, "");
                  setCustomerInfo({ ...customerInfo, doctorId: digitsOnly });
                }}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">เบอร์โทร</label>
              <Input
                className="bg-secondary/20 border-border/40 focus:ring-primary/20 h-11"
                name="phone"
                id="phone"
                placeholder="08x-xxx-xxxx"
                value={customerInfo.phone}
                onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="address" className="text-sm font-medium">ที่อยู่จัดส่งสินค้า *</label>
              <textarea
                className="w-full bg-secondary/20 border border-border/40 rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all resize-none h-24"
                name="address"
                id="address"
                placeholder="รายละเอียดที่อยู่จัดส่งสินค้า"
                value={customerInfo.address}
                onChange={e => setCustomerInfo({ ...customerInfo, address: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="rounded-xl"
            >
              บันทึกแบบร่าง
            </Button>
            {!isRequiredInfoComplete && (
              <p className="text-xs text-muted-foreground flex items-center">กรุณากรอกข้อมูลผู้ซื้อให้ครบ</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 shadow-xl flex-1 overflow-hidden">
        <CardContent className="p-6 h-full flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-display font-bold tracking-tight">เลือกสินค้า</h2>
              <p className="text-muted-foreground text-sm">เลือกสินค้า พร้อมระบุโปรโมชั่นในแต่ละรายการ</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 w-[220px] bg-secondary/20 border-border/40"
                name="productSearch"
                id="productSearch"
                placeholder="ค้นหาสินค้า"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-4">
            {filteredProducts?.map(product => {
              const cartItem = cart.find(item => item.productId === product.id);
              return (
                <div
                  key={product.id}
                  className="flex flex-col lg:flex-row gap-4 items-start lg:items-center border border-border/40 rounded-2xl p-4 bg-secondary/10"
                >
                  <div className="w-full lg:w-44 aspect-[4/3] rounded-xl overflow-hidden bg-secondary/20 border border-border/30">
                    <img
                      src={Array.isArray(product.images) && product.images[0] ? String(product.images[0]) : "https://placehold.co/600x400/171A1D/D4B16A?text=Product"}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-lg leading-tight">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">ราคา ฿{Number(product.price).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-background/70 rounded-lg p-1">
                        <button
                          onClick={() => cartItem ? updateQuantity(product.id, -1) : null}
                          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
                          disabled={!cartItem}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-mono font-bold w-5 text-center">{cartItem?.quantity ?? 0}</span>
                        <button
                          onClick={() => addToCart(product)}
                          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
                      <div className="text-sm text-muted-foreground">
                        {cartItem ? "เลือกโปรโมชั่นสำหรับสินค้านี้" : "กด + เพื่อเพิ่มสินค้าในคำสั่งซื้อ"}
                      </div>
                      <select
                        className="h-10 rounded-xl border border-border/40 bg-secondary/20 px-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5"
                        value={cartItem?.promotion ?? promotions[0]}
                        onChange={e => updatePromotion(product.id, e.target.value)}
                        disabled={!cartItem}
                      >
                        {promotions.map(promotion => (
                          <option key={promotion} value={promotion}>{promotion}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border/40 pt-6 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-widest">ราคารวม</p>
                <p className="text-3xl font-display font-bold text-primary">฿{subTotal.toLocaleString()}</p>
              </div>
              <div className="w-full sm:w-64 space-y-2">
                <label htmlFor="offeredPrice" className="text-sm font-medium">ราคาที่ผู้แทนเสนอ</label>
                <Input
                  className="bg-secondary/20 border-border/40 focus:ring-primary/20 h-11"
                  name="offeredPrice"
                  id="offeredPrice"
                  inputMode="decimal"
                  placeholder="กรอกราคาเสนอ"
                  value={offeredPrice}
                  onChange={e => setOfferedPrice(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-lg font-bold shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 gap-3"
            >
              {isPending ? <Loader2 className="animate-spin w-6 h-6" /> : <>บันทึก <ArrowRight className="w-5 h-5" /></>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แนบหลักฐานการชำระเงิน</DialogTitle>
            <DialogDescription>แนบรูปบัตรประชาชนและสลิปการชำระเงินก่อนยืนยันคำสั่งซื้อ</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-primary" />
                รูปบัตรประจำตัวประชาชน
              </label>
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setIdCardFile(e.target.files?.[0] ?? null)}
              />
              {idCardPreview && (
                <img src={idCardPreview} alt="ID card preview" className="w-full rounded-xl border border-border/40" />
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                รูปสลิปโอนเงินหรือสลิปบัตรเครดิต
              </label>
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setPaymentFile(e.target.files?.[0] ?? null)}
              />
              {paymentPreview && (
                <img src={paymentPreview} alt="Payment preview" className="w-full rounded-xl border border-border/40" />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsCheckoutOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleCheckout}>ยืนยัน Checkout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
