import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Home, ShoppingCart, FileText, ArrowLeft, ArrowRight, Minus, Plus, Check } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import GlassInput from "@/components/ui/GlassInput";
import GlassUpload from "@/components/ui/GlassUpload";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const VAT_RATE = 0.07;

export default function CreateOrder() {
  const [currentUser, setCurrentUser] = useState(null);
  const [step, setStep] = useState(1);
  const [cart, setCart] = useState({});
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    address: ""
  });
  const [documents, setDocuments] = useState({
    citizen_id: null,
    payment_slip: null
  });
  const [customTotal, setCustomTotal] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const user = sessionStorage.getItem("authenticated_user");
    if (user) {
      setCurrentUser(JSON.parse(user));
    } else {
      window.location.href = createPageUrl("StaffSelection");
    }
  }, []);

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.ProductCategory.list()
  });

  const createOrderMutation = useMutation({
    mutationFn: (orderData) => base44.entities.Order.create(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries(["orders"]);
      setStep(5); // Success step
    }
  });

  const navItems = [
    { label: "Dashboard", path: "StaffDashboard", icon: Home },
    { label: "New Order", path: "CreateOrder", icon: ShoppingCart, active: true },
    { label: "My Orders", path: "StaffOrders", icon: FileText }
  ];

  if (!currentUser) return null;

  const updateQuantity = (productId, delta) => {
    setCart((prev) => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      if (newQty === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newQty };
    });
  };

  const getCartItems = () => {
    return Object.entries(cart).map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId);
      return {
        product_id: productId,
        product_name: product?.name,
        quantity,
        unit_price: product?.price || 0,
        total: quantity * (product?.price || 0)
      };
    });
  };

  const subtotal = getCartItems().reduce((sum, item) => sum + item.total, 0);
  const vatAmount = subtotal * VAT_RATE;
  const calculatedTotal = subtotal + vatAmount;
  const finalTotal = customTotal !== null ? customTotal : calculatedTotal;

  const generateOrderNumber = () => {
    const date = new Date();
    const prefix = "JLR";
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${dateStr}-${random}`;
  };

  const handleSubmitOrder = () => {
    const orderData = {
      order_number: generateOrderNumber(),
      customer_name: customerInfo.name,
      customer_phone: customerInfo.phone,
      customer_address: customerInfo.address,
      items: getCartItems(),
      subtotal,
      vat_amount: vatAmount,
      total_amount: finalTotal,
      status: "pending",
      citizen_id_url: documents.citizen_id,
      payment_slip_url: documents.payment_slip,
      sales_rep_id: currentUser.id,
      sales_rep_name: currentUser.full_name
    };
    createOrderMutation.mutate(orderData);
  };

  const canProceedStep1 = Object.keys(cart).length > 0;
  const canProceedStep2 = customerInfo.name && customerInfo.phone && customerInfo.address;

  const steps = [
    { num: 1, label: "Products" },
    { num: 2, label: "Details" },
    { num: 3, label: "Documents" },
    { num: 4, label: "Review" }
  ];

  return (
    <DashboardLayout currentUser={currentUser} navItems={navItems}>
      {/* Step Indicator */}
      {step < 5 && (
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 md:gap-4">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div
                  className={cn(
                    "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    step >= s.num
                      ? "bg-gradient-to-br from-amber-400/30 to-amber-600/20 border border-amber-400/50 text-amber-200"
                      : "bg-white/5 border border-white/20 text-white/40"
                  )}
                >
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className={cn(
                  "hidden md:block ml-2 text-sm",
                  step >= s.num ? "text-amber-200" : "text-white/40"
                )}>
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div className={cn(
                    "w-8 md:w-16 h-0.5 mx-2",
                    step > s.num ? "bg-amber-400/50" : "bg-white/10"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 1: Product Selection */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className="text-xl text-white/80 font-light tracking-wide mb-6">Select Products</h2>

            {productsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <GlassCard key={i} className="p-4 animate-pulse">
                    <div className="aspect-square bg-white/10 rounded-xl mb-4" />
                    <div className="h-4 bg-white/10 rounded mb-2" />
                    <div className="h-4 w-1/2 bg-white/10 rounded" />
                  </GlassCard>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <GlassCard
                    key={product.id}
                    className={cn(
                      "p-4 transition-all",
                      cart[product.id] && "border-amber-400/50 bg-amber-500/10"
                    )}
                    hover={false}
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-white/5 mb-4">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                          No Image
                        </div>
                      )}
                    </div>
                    <h3 className="text-white font-medium truncate">{product.name}</h3>
                    <p className="text-amber-300 font-light mt-1">฿{product.price?.toLocaleString()}</p>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-4">
                      <button
                        onClick={() => updateQuantity(product.id, -1)}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                          cart[product.id]
                            ? "bg-white/10 text-white hover:bg-white/20"
                            : "bg-white/5 text-white/30 cursor-not-allowed"
                        )}
                        disabled={!cart[product.id]}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-white text-lg font-medium w-12 text-center">
                        {cart[product.id] || 0}
                      </span>
                      <button
                        onClick={() => updateQuantity(product.id, 1)}
                        className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 flex items-center justify-center transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}

            {/* Cart Summary & Next */}
            <div className="fixed bottom-0 left-0 right-0 md:left-64 p-4 bg-neutral-950/90 backdrop-blur-xl border-t border-white/10">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-sm">Cart Total</p>
                  <p className="text-2xl text-amber-300 font-light">฿{subtotal.toLocaleString()}</p>
                </div>
                <GlassButton
                  variant="gold"
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                  className="flex items-center gap-2"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </GlassButton>
              </div>
            </div>
            <div className="h-24" />
          </motion.div>
        )}

        {/* Step 2: Customer Details */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-xl mx-auto"
          >
            <h2 className="text-xl text-white/80 font-light tracking-wide mb-6">Customer Details</h2>

            <GlassCard className="p-6 space-y-6" hover={false}>
              <GlassInput
                label="Customer Name"
                placeholder="Enter full name"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              />
              <GlassInput
                label="Phone Number"
                placeholder="Enter phone number"
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
              />
              <div className="space-y-2">
                <label className="text-sm text-white/60 font-light tracking-wide">
                  Delivery Address
                </label>
                <textarea
                  placeholder="Enter delivery address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-xl border-b border-white/20 focus:border-amber-400/50 text-white placeholder:text-white/30 outline-none transition-all duration-300 focus:bg-white/10 focus:ring-1 focus:ring-amber-400/30 resize-none h-32"
                />
              </div>

              {/* Order Summary */}
              <div className="pt-6 border-t border-white/10">
                <h3 className="text-white/60 text-sm uppercase tracking-wider mb-4">Order Summary</h3>
                {getCartItems().map((item) => (
                  <div key={item.product_id} className="flex justify-between text-white/80 mb-2">
                    <span>{item.product_name} × {item.quantity}</span>
                    <span>฿{item.total.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between text-white/60 mt-4 pt-4 border-t border-white/10">
                  <span>Subtotal</span>
                  <span>฿{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>VAT (7%)</span>
                  <span>฿{vatAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-300 text-lg mt-2 pt-2 border-t border-white/10">
                  <span>Total</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={customTotal !== null ? customTotal : calculatedTotal}
                      onChange={(e) => setCustomTotal(parseFloat(e.target.value) || 0)}
                      className="w-32 bg-white/5 border-b border-white/20 text-right px-2 py-1 rounded text-amber-300 outline-none focus:border-amber-400/50"
                    />
                  </div>
                </div>
              </div>
            </GlassCard>

            <div className="flex justify-between mt-6">
              <GlassButton onClick={() => setStep(1)} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </GlassButton>
              <GlassButton
                variant="gold"
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
                className="flex items-center gap-2"
              >
                Next <ArrowRight className="w-4 h-4" />
              </GlassButton>
            </div>
          </motion.div>
        )}

        {/* Step 3: Documents */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-xl mx-auto"
          >
            <h2 className="text-xl text-white/80 font-light tracking-wide mb-6">Upload Documents</h2>

            <div className="space-y-6">
              <GlassUpload
                label="Citizen ID Card"
                value={documents.citizen_id}
                onUpload={(url) => setDocuments({ ...documents, citizen_id: url })}
                accept="image/*"
              />

              <GlassUpload
                label="Payment Slip"
                value={documents.payment_slip}
                onUpload={(url) => setDocuments({ ...documents, payment_slip: url })}
                accept="image/*"
              />
            </div>

            <div className="flex justify-between mt-8">
              <GlassButton onClick={() => setStep(2)} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </GlassButton>
              <GlassButton
                variant="gold"
                onClick={() => setStep(4)}
                className="flex items-center gap-2"
              >
                Review Order <ArrowRight className="w-4 h-4" />
              </GlassButton>
            </div>
          </motion.div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto"
          >
            <h2 className="text-xl text-white/80 font-light tracking-wide mb-6">Review Order</h2>

            <GlassCard className="p-6" hover={false}>
              {/* Customer Info */}
              <div className="mb-6 pb-6 border-b border-white/10">
                <h3 className="text-white/60 text-sm uppercase tracking-wider mb-4">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4 text-white/80">
                  <div>
                    <p className="text-white/40 text-sm">Name</p>
                    <p>{customerInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-sm">Phone</p>
                    <p>{customerInfo.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-white/40 text-sm">Address</p>
                    <p>{customerInfo.address}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6 pb-6 border-b border-white/10">
                <h3 className="text-white/60 text-sm uppercase tracking-wider mb-4">Order Items</h3>
                {getCartItems().map((item) => (
                  <div key={item.product_id} className="flex justify-between text-white/80 mb-2">
                    <span>{item.product_name} × {item.quantity}</span>
                    <span>฿{item.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Documents */}
              <div className="mb-6 pb-6 border-b border-white/10">
                <h3 className="text-white/60 text-sm uppercase tracking-wider mb-4">Documents</h3>
                <div className="flex gap-4">
                  {documents.citizen_id && (
                    <div className="w-24 h-24 rounded-xl overflow-hidden border border-white/20">
                      <img src={documents.citizen_id} alt="ID" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {documents.payment_slip && (
                    <div className="w-24 h-24 rounded-xl overflow-hidden border border-white/20">
                      <img src={documents.payment_slip} alt="Slip" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {!documents.citizen_id && !documents.payment_slip && (
                    <p className="text-white/40">No documents uploaded</p>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="text-right">
                <p className="text-white/40 text-sm">Total Amount</p>
                <p className="text-3xl text-amber-300 font-light">฿{finalTotal.toLocaleString()}</p>
              </div>
            </GlassCard>

            <div className="flex justify-between mt-6">
              <GlassButton onClick={() => setStep(3)} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </GlassButton>
              <GlassButton
                variant="gold"
                onClick={handleSubmitOrder}
                disabled={createOrderMutation.isPending}
                className="flex items-center gap-2"
              >
                {createOrderMutation.isPending ? "Creating..." : "Submit Order"}
              </GlassButton>
            </div>
          </motion.div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center py-12"
          >
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-500/30 to-green-600/20 border border-green-400/50 flex items-center justify-center mb-6">
              <Check className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-2xl text-white font-light tracking-wide mb-4">Order Created Successfully!</h2>
            <p className="text-white/60 mb-8">Your order has been submitted and is now pending processing.</p>
            <div className="flex flex-col gap-4">
              <GlassButton
                variant="gold"
                onClick={() => {
                  setStep(1);
                  setCart({});
                  setCustomerInfo({ name: "", phone: "", address: "" });
                  setDocuments({ citizen_id: null, payment_slip: null });
                  setCustomTotal(null);
                }}
                className="w-full"
              >
                Create Another Order
              </GlassButton>
              <GlassButton
                onClick={() => window.location.href = createPageUrl("StaffDashboard")}
                className="w-full"
              >
                Back to Dashboard
              </GlassButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
