import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Home, FileText, Search, Eye, Printer, X } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AccountingDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDeliveryNote, setShowDeliveryNote] = useState(false);
  const deliveryNoteRef = useRef(null);

  useEffect(() => {
    const user = sessionStorage.getItem("authenticated_user");
    if (user) {
      setCurrentUser(JSON.parse(user));
    } else {
      window.location.href = createPageUrl("StaffSelection");
    }
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["all-orders"],
    queryFn: () => base44.entities.Order.list("-created_date")
  });

  const navItems = [
    { label: "Dashboard", path: "AccountingDashboard", icon: Home, active: true },
    { label: "All Orders", path: "AccountingOrders", icon: FileText }
  ];

  if (!currentUser) return null;

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    confirmed: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    packed: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    shipped: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    delivered: "bg-green-500/20 text-green-400 border-green-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30"
  };

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const shippedOrders = orders.filter((o) => o.status === "shipped").length;

  const handlePrint = () => {
    if (!deliveryNoteRef.current) return;
    
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Delivery Note - ${selectedOrder?.order_number || "order"}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; }
            th { border-bottom: 2px solid #ddd; }
            td { border-bottom: 1px solid #eee; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #ddd; }
            .logo { font-size: 28px; font-weight: bold; color: #d97706; }
            .total-section { text-align: right; margin-top: 20px; }
          </style>
        </head>
        <body>${deliveryNoteRef.current.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <DashboardLayout currentUser={currentUser} navItems={navItems}>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-6">
            <p className="text-white/40 text-sm uppercase tracking-wider">Total Revenue</p>
            <p className="text-3xl font-light mt-2">
              <span className="bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">
                ฿{totalRevenue.toLocaleString()}
              </span>
            </p>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-6">
            <p className="text-white/40 text-sm uppercase tracking-wider">Pending Orders</p>
            <p className="text-3xl font-light text-yellow-400 mt-2">{pendingOrders}</p>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="p-6">
            <p className="text-white/40 text-sm uppercase tracking-wider">Shipped</p>
            <p className="text-3xl font-light text-blue-400 mt-2">{shippedOrders}</p>
          </GlassCard>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 backdrop-blur-xl border-b border-white/20 focus:border-amber-400/50 text-white placeholder:text-white/30 outline-none transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 rounded-xl bg-white/5 backdrop-blur-xl border-b border-white/20 text-white outline-none"
        >
          <option value="all" className="bg-neutral-900">All Status</option>
          <option value="pending" className="bg-neutral-900">Pending</option>
          <option value="confirmed" className="bg-neutral-900">Confirmed</option>
          <option value="packed" className="bg-neutral-900">Packed</option>
          <option value="shipped" className="bg-neutral-900">Shipped</option>
          <option value="delivered" className="bg-neutral-900">Delivered</option>
        </select>
      </div>

      {/* Orders Table */}
      <GlassCard className="overflow-hidden" hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/40 text-xs uppercase tracking-wider p-4">Order #</th>
                <th className="text-left text-white/40 text-xs uppercase tracking-wider p-4">Customer</th>
                <th className="text-left text-white/40 text-xs uppercase tracking-wider p-4">Date</th>
                <th className="text-left text-white/40 text-xs uppercase tracking-wider p-4">Amount</th>
                <th className="text-left text-white/40 text-xs uppercase tracking-wider p-4">Status</th>
                <th className="text-left text-white/40 text-xs uppercase tracking-wider p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><div className="h-4 bg-white/10 rounded w-20" /></td>
                    <td className="p-4"><div className="h-4 bg-white/10 rounded w-32" /></td>
                    <td className="p-4"><div className="h-4 bg-white/10 rounded w-24" /></td>
                    <td className="p-4"><div className="h-4 bg-white/10 rounded w-20" /></td>
                    <td className="p-4"><div className="h-4 bg-white/10 rounded w-16" /></td>
                    <td className="p-4"><div className="h-4 bg-white/10 rounded w-20" /></td>
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-white/40 p-8">No orders found</td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white font-mono text-sm">{order.order_number || order.id?.slice(0, 8)}</td>
                    <td className="p-4 text-white/80">{order.customer_name}</td>
                    <td className="p-4 text-white/60 text-sm">{format(new Date(order.created_date), "MMM d, yyyy")}</td>
                    <td className="p-4 text-amber-300">฿{order.total_amount?.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={cn("px-3 py-1 rounded-full text-xs uppercase tracking-wider border", statusColors[order.status])}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-white/60" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDeliveryNote(true);
                          }}
                          className="p-2 rounded-lg bg-white/5 hover:bg-amber-500/20 transition-colors"
                          title="Delivery Note"
                        >
                          <Printer className="w-4 h-4 text-amber-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Delivery Note Modal */}
      <AnimatePresence>
        {showDeliveryNote && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
            onClick={() => setShowDeliveryNote(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Actions Bar */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-white font-light text-xl">Delivery Note Preview</h2>
                <div className="flex gap-2">
                  <GlassButton onClick={handlePrint} size="sm" variant="gold" className="flex items-center gap-2">
                    <Printer className="w-4 h-4" /> Print / Save
                  </GlassButton>
                  <button
                    onClick={() => setShowDeliveryNote(false)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Delivery Note Document */}
              <div
                ref={deliveryNoteRef}
                className="bg-white text-gray-900 p-8 rounded-lg shadow-2xl"
                style={{ fontFamily: "Arial, sans-serif" }}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-200">
                  <div>
                    <h1 className="text-3xl font-bold text-amber-600 tracking-wider">JALOR</h1>
                    <p className="text-gray-500 text-sm mt-1">Premium Fulfillment</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold text-gray-700">DELIVERY NOTE</h2>
                    <p className="text-gray-500 text-sm mt-1">#{selectedOrder.order_number}</p>
                    <p className="text-gray-500 text-sm">{format(new Date(selectedOrder.created_date), "MMMM d, yyyy")}</p>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Ship To</h3>
                    <p className="font-semibold text-lg">{selectedOrder.customer_name}</p>
                    <p className="text-gray-600 mt-1">{selectedOrder.customer_address}</p>
                    <p className="text-gray-600">{selectedOrder.customer_phone}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Order Info</h3>
                    <p className="text-gray-600">Sales Rep: {selectedOrder.sales_rep_name || "N/A"}</p>
                    <p className="text-gray-600">Status: {selectedOrder.status?.toUpperCase()}</p>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 text-sm font-semibold text-gray-500 uppercase">Item</th>
                      <th className="text-center py-3 text-sm font-semibold text-gray-500 uppercase">Qty</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-500 uppercase">Price</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-3">{item.product_name}</td>
                        <td className="py-3 text-center">{item.quantity}</td>
                        <td className="py-3 text-right">฿{item.unit_price?.toLocaleString()}</td>
                        <td className="py-3 text-right">฿{item.total?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-500">Subtotal</span>
                      <span>฿{selectedOrder.subtotal?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-500">VAT (7%)</span>
                      <span>฿{selectedOrder.vat_amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-3 border-t-2 border-gray-200 font-bold text-lg">
                      <span>Total</span>
                      <span className="text-amber-600">฿{selectedOrder.total_amount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-4 border-t border-gray-200 text-center text-gray-400 text-sm">
                  <p>Thank you for your business!</p>
                  <p className="mt-1">JALOR Fulfillment System</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
