import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProducts, useCategories } from "@/hooks/use-products";
import { useCreateOrder } from "@/hooks/use-orders";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Minus, ArrowRight, Search, ChevronLeft } from "lucide-react";
import { api } from "@shared/routes";
import { type Product, type Promotion } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CartItem {
  productId: number;
  product: Product;
  quantity: number;
  promotion: string;
}

export default function CreateOrder() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { mutateAsync: createOrder, isPending } = useCreateOrder();
  const { data: promotionsData } = useQuery<Promotion[]>({
    queryKey: [api.promotions.list.path],
    queryFn: async () => {
      const res = await fetch(api.promotions.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch promotions");
      return api.promotions.list.responses[200].parse(await res.json());
    },
  });
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [customerInfo, setCustomerInfo] = useState({
    doctorName: "",
    medicalLicense: "",
    phone: "",
    address: ""
  });
  const [offeredPrice, setOfferedPrice] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [requestedQuantity, setRequestedQuantity] = useState(1);
  const [selectedPromotion, setSelectedPromotion] = useState("");
  const [isCartOneSaved, setIsCartOneSaved] = useState(false);
  const cartTwoRef = useRef<HTMLDivElement>(null);

  const activePromotions = useMemo(
    () => promotionsData?.filter(promotion => promotion.isActive) ?? [],
    [promotionsData],
  );
  const promotionOptions = useMemo(() => {
    if (activePromotions.length === 0) {
      return ["ไม่มีโปรโมชั่น"];
    }
    return activePromotions.map(promotion => promotion.name);
  }, [activePromotions]);

  useEffect(() => {
    if (!selectedCategoryId && categories && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const filteredProducts = products?.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategoryId ? product.categoryId === selectedCategoryId : true;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product, quantity = 1, promotion = promotionOptions[0]) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + quantity, promotion } 
            : item
        );
      }
      return [...prev, { productId: product.id, product, quantity, promotion }];
    });
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setRequestedQuantity(1);
    setSelectedPromotion(promotionOptions[0]);
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    addToCart(selectedProduct, requestedQuantity, selectedPromotion || promotionOptions[0]);
    setSelectedProduct(null);
    setRequestedQuantity(1);
    toast({ title: "เพิ่มสินค้าแล้ว", description: "สินค้าได้ถูกเพิ่มลงตะกร้าแล้ว" });
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
  const isRequiredInfoComplete = customerInfo.doctorName.trim().length > 0 && customerInfo.address.trim().length > 0;
  const canSubmit = cart.length > 0 && isRequiredInfoComplete && !isPending;

  const handleDraftSave = () => {
    setIsCartOneSaved(true);
    toast({ title: "บันทึกฉบับร่างแล้ว", description: "เลื่อนไปยังรายการสินค้า" });
    requestAnimationFrame(() => {
      cartTwoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const orderData = {
        items: cart.map(item => ({
          productId: item.productId,
          name: item.product.name,
          quantity: item.quantity,
          price: Number(item.product.price),
          promotion: item.promotion
        })),
        total: total.toString(),
        status: "draft",
        customerInfo: {
          ...customerInfo,
          offeredPrice
        },
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
    <div className="flex flex-col gap-6 h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
      <Card className={`border-border/40 shadow-xl ${isCartOneSaved ? "opacity-90" : ""}`}>
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
              <label htmlFor="medicalLicense" className="text-sm font-medium">เลข ว. แพทย์ (ตัวเลขเท่านั้น)</label>
              <Input
                className="bg-secondary/20 border-border/40 focus:ring-primary/20 h-11"
                name="medicalLicense"
                id="medicalLicense"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="123456"
                value={customerInfo.medicalLicense}
                onChange={e => {
                  const digitsOnly = e.target.value.replace(/\D/g, "");
                  setCustomerInfo({ ...customerInfo, medicalLicense: digitsOnly });
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
              onClick={handleDraftSave}
              disabled={isPending}
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

      <Card ref={cartTwoRef} className="border-border/40 shadow-xl min-h-[calc(100vh-200px)] overflow-hidden">
        <CardContent className="p-6 h-full flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-display font-bold tracking-tight">เลือกสินค้า</h2>
              <p className="text-muted-foreground text-sm">เลือกสินค้าในแต่ละหมวดหมู่ พร้อมดูรายละเอียดก่อนเพิ่มลงตะกร้า</p>
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

          <div className="flex flex-wrap gap-3">
            {(categories ?? []).slice(0, 3).map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  selectedCategoryId === category.id
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="relative flex-1 overflow-hidden">
            <div
              className={`flex h-full w-[200%] transition-transform duration-500 ${
                selectedProduct ? "-translate-x-1/2" : "translate-x-0"
              }`}
            >
              <div className="w-1/2 pr-6 flex flex-col gap-6 overflow-y-auto no-scrollbar">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts?.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="text-left border border-border/40 rounded-2xl p-4 bg-secondary/10 hover:border-primary/40 hover:shadow-md transition-all"
                    >
                      <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-secondary/20 border border-border/30">
                        <img
                          src={Array.isArray(product.images) && product.images[0] ? String(product.images[0]) : "https://placehold.co/600x400/171A1D/D4B16A?text=Product"}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-3 space-y-1">
                        <h3 className="font-semibold text-base leading-tight">{product.name}</h3>
                        <p className="text-xs text-muted-foreground">ราคา ฿{Number(product.price).toLocaleString()}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="border-t border-border/40 pt-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground uppercase tracking-widest">สรุปรายการสินค้า</p>
                      <p className="text-2xl font-display font-bold text-primary">฿{total.toLocaleString()}</p>
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

                  {cart.length === 0 ? (
                    <p className="text-sm text-muted-foreground">ยังไม่มีสินค้าในตะกร้า</p>
                  ) : (
                    <div className="space-y-3">
                      {cart.map(item => (
                        <div key={item.productId} className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/60 px-4 py-3">
                          <div className="space-y-1">
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">โปรโมชั่น: {item.promotion}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.productId, -1)}
                              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-mono font-bold w-6 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.productId, 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-lg font-bold shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 gap-3"
                  >
                    {isPending ? <Loader2 className="animate-spin w-6 h-6" /> : <>บันทึก <ArrowRight className="w-5 h-5" /></>}
                  </Button>
                </div>
              </div>

              <div className="w-1/2 pl-6 border-l border-border/40 flex flex-col gap-6 overflow-y-auto no-scrollbar">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedProduct(null)}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h3 className="text-xl font-display font-bold tracking-tight">รายละเอียดสินค้า</h3>
                    <p className="text-sm text-muted-foreground">ตรวจสอบรายละเอียดก่อนเพิ่มลงตะกร้า</p>
                  </div>
                </div>

                {selectedProduct ? (
                  <div className="space-y-6">
                    <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-secondary/20 border border-border/30">
                      <img
                        src={Array.isArray(selectedProduct.images) && selectedProduct.images[0] ? String(selectedProduct.images[0]) : "https://placehold.co/600x400/171A1D/D4B16A?text=Product"}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-xl font-semibold">{selectedProduct.name}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>รายการ</span>
                          <span className="text-foreground text-right max-w-[60%]">
                            {selectedProduct.description || "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>หมวดหมู่</span>
                          <span className="text-foreground">
                            {categories?.find(category => category.id === selectedProduct.categoryId)?.name ?? "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>ราคา</span>
                          <span className="text-foreground">฿{Number(selectedProduct.price).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="promotionSelect" className="text-sm font-medium">Promotion</label>
                      <select
                        id="promotionSelect"
                        className="h-11 w-full rounded-xl border border-border/40 bg-secondary/20 px-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5"
                        value={selectedPromotion}
                        onChange={e => setSelectedPromotion(e.target.value)}
                      >
                        {promotionOptions.map(promotion => (
                          <option key={promotion} value={promotion}>{promotion}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">จำนวนที่ขอเบิก</label>
                      <div className="flex items-center gap-3 bg-background/70 rounded-lg p-2 border border-border/40">
                        <button
                          onClick={() => setRequestedQuantity(prev => Math.max(1, prev - 1))}
                          className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          className="w-16 text-center bg-transparent font-mono text-lg focus:outline-none"
                          type="number"
                          min={1}
                          value={requestedQuantity}
                          onChange={e => setRequestedQuantity(Math.max(1, Number(e.target.value) || 1))}
                        />
                        <button
                          onClick={() => setRequestedQuantity(prev => prev + 1)}
                          className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <Button
                      onClick={handleAddToCart}
                      className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-lg font-bold shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all active:scale-95"
                    >
                      Add to cart
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-muted-foreground">
                    เลือกสินค้าจากรายการทางซ้ายเพื่อดูรายละเอียด
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
