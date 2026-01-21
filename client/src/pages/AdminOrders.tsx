import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Home, Users, Package, FolderOpen, ShoppingCart, Search, Eye, Edit2, Check } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AdminOrders() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);
  const queryClient = useQueryClient();

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

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["all-orders"]);
      setEditingStatus(null);
    }
  });

  const navItems = [
    { label: "Dashboard", path: "AdminDashboard", icon: Home },
    { label: "Users", path: "AdminUsers", icon: Users },
    { label: "Categories", path: "AdminCategories", icon: FolderOpen },
    { label: "Products", path: "AdminProducts", icon: Package },
    { label: "All Orders", path: "AdminOrders", icon: ShoppingCart, active: true }
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

  const statuses = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"];

  return (
    <DashboardLayout currentUser={currentUser} navItems={navItems}>
      <h1 className="text-2xl text-white/80 font-light tracking-wide mb-6">All Orders</h1>

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
          {statuses.map((s) => (
            <option key={s} value={s} className="bg-neutral-900">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
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
                <th className="text-left text-white/40 text-xs uppercase tracking-wider p-4">Rep</th>
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
                    <td className="p-4"><div className="h-4 bg-white/10 rounded w-24" /></td>
                    <td className="p-4"><div className="h-4 bg-white/10 rounded w-16" /></td>
                    <td className="p-4"><div className="h-4 bg-white/10 rounded w-12" /></td>
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-white/40 p-8">No orders found</td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white font-mono text-sm">{order.order_number || order.id?.slice(0, 8)}</td>
                    <td className="p-4 text-white/80">{order.customer_name}</td>
                    <td className="p-4 text-white/60 text-sm">{format(new Date(order.created_date), "MMM d, yyyy")}</td>
                    <td className="p-4 text-amber-300">฿{order.total_amount?.toLocaleString()}</td>
                    <td className="p-4 text-white/60 text-sm">{order.sales_rep_name || "N/A"}</td>
                    <td className="p-4">
                      {editingStatus === order.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            defaultValue={order.status}
                            onChange={(e) => {
                              updateOrderMutation.mutate({
                                id: order.id,
                                data: { status: e.target.value }
                              });
                            }}
                            className="px-2 py-1 rounded-lg bg-white/10 text-white text-sm outline-none"
                          >
                            {statuses.map((s) => (
                              <option key={s} value={s} className="bg-neutral-900">
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setEditingStatus(null)}
                            className="p-1 rounded bg-white/10 hover:bg-white/20"
                          >
                            <Check className="w-3 h-3 text-green-400" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={cn("px-3 py-1 rounded-full text-xs uppercase tracking-wider border", statusColors[order.status])}>
                            {order.status}
                          </span>
                          <button
                            onClick={() => setEditingStatus(order.id)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            <Edit2 className="w-3 h-3 text-white/40" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <Eye className="w-4 h-4 text-white/60" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <GlassCard className="p-6" hover={false}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl text-white font-light">Order Details</h2>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs uppercase tracking-wider border",
                    statusColors[selectedOrder.status]
                  )}>
                    {selectedOrder.status}
                  </span>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-white/40 text-sm">Order Number</p>
                    <p className="text-white font-mono">{selectedOrder.order_number}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/40 text-sm">Customer</p>
                      <p className="text-white">{selectedOrder.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-sm">Phone</p>
                      <p className="text-white">{selectedOrder.customer_phone}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-white/40 text-sm">Address</p>
                    <p className="text-white">{selectedOrder.customer_address}</p>
                  </div>

                  <div>
                    <p className="text-white/40 text-sm">Sales Rep</p>
                    <p className="text-white">{selectedOrder.sales_rep_name || "N/A"}</p>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <p className="text-white/40 text-sm mb-3">Items</p>
                    {selectedOrder.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-white/80 mb-2">
                        <span>{item.product_name} × {item.quantity}</span>
                        <span>฿{item.total?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <div className="flex justify-between text-white/60 mb-2">
                      <span>Subtotal</span>
                      <span>฿{selectedOrder.subtotal?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-white/60 mb-2">
                      <span>VAT</span>
                      <span>฿{selectedOrder.vat_amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-300 text-lg pt-2 border-t border-white/10">
                      <span>Total</span>
                      <span>฿{selectedOrder.total_amount?.toLocaleString()}</span>
                    </div>
                  </div>

                  {(selectedOrder.citizen_id_url || selectedOrder.payment_slip_url) && (
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-white/40 text-sm mb-3">Documents</p>
                      <div className="flex gap-4">
                        {selectedOrder.citizen_id_url && (
                          <a href={selectedOrder.citizen_id_url} target="_blank" rel="noopener noreferrer"
                            className="w-24 h-24 rounded-xl overflow-hidden border border-white/20 hover:border-amber-400/50 transition-colors">
                            <img src={selectedOrder.citizen_id_url} alt="ID" className="w-full h-full object-cover" />
                          </a>
                        )}
                        {selectedOrder.payment_slip_url && (
                          <a href={selectedOrder.payment_slip_url} target="_blank" rel="noopener noreferrer"
                            className="w-24 h-24 rounded-xl overflow-hidden border border-white/20 hover:border-amber-400/50 transition-colors">
                            <img src={selectedOrder.payment_slip_url} alt="Slip" className="w-full h-full object-cover" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="mt-6 w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all"
                >
                  Close
                </button>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
