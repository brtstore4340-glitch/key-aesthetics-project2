import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { 
  Home, Users, Package, FolderOpen, Settings, 
  TrendingUp, DollarSign, ShoppingCart, Clock 
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/ui/GlassCard";
import { motion } from "framer-motion";
import { format, subDays } from "date-fns";

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = sessionStorage.getItem("authenticated_user");
    if (user) {
      setCurrentUser(JSON.parse(user));
    } else {
      window.location.href = createPageUrl("StaffSelection");
    }
  }, []);

  const { data: orders = [] } = useQuery({
    queryKey: ["all-orders"],
    queryFn: () => base44.entities.Order.list("-created_date")
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list()
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.ProductCategory.list()
  });

  const navItems = [
    { label: "Dashboard", path: "AdminDashboard", icon: Home, active: true },
    { label: "Users", path: "AdminUsers", icon: Users },
    { label: "Categories", path: "AdminCategories", icon: FolderOpen },
    { label: "Products", path: "AdminProducts", icon: Package },
    { label: "All Orders", path: "AdminOrders", icon: ShoppingCart }
  ];

  if (!currentUser) return null;

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const todayOrders = orders.filter(
    (o) => new Date(o.created_date).toDateString() === new Date().toDateString()
  );
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const statusCounts = {
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    packed: orders.filter((o) => o.status === "packed").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length
  };

  const recentOrders = orders.slice(0, 5);

  // Calculate last 7 days revenue
  const last7DaysRevenue = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayOrders = orders.filter(
      (o) => new Date(o.created_date).toDateString() === date.toDateString()
    );
    return {
      date: format(date, "EEE"),
      revenue: dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    };
  });

  const maxRevenue = Math.max(...last7DaysRevenue.map((d) => d.revenue), 1);

  return (
    <DashboardLayout currentUser={currentUser} navItems={navItems}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-light text-white tracking-wide">
          Admin Dashboard
        </h1>
        <p className="text-white/40 mt-2">Overview of your business</p>
      </motion.div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <DollarSign className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-white/40 text-sm uppercase tracking-wider">Total Revenue</span>
            </div>
            <p className="text-2xl md:text-3xl font-light">
              <span className="bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">
                ฿{totalRevenue.toLocaleString()}
              </span>
            </p>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-white/40 text-sm uppercase tracking-wider">Today</span>
            </div>
            <p className="text-2xl md:text-3xl font-light text-green-400">
              ฿{todayRevenue.toLocaleString()}
            </p>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <ShoppingCart className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-white/40 text-sm uppercase tracking-wider">Orders</span>
            </div>
            <p className="text-2xl md:text-3xl font-light text-white">{orders.length}</p>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Package className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-white/40 text-sm uppercase tracking-wider">Products</span>
            </div>
            <p className="text-2xl md:text-3xl font-light text-white">{products.length}</p>
          </GlassCard>
        </motion.div>
      </div>

      {/* Charts & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard className="p-6" hover={false}>
            <h3 className="text-white/60 text-sm uppercase tracking-wider mb-6">Last 7 Days Revenue</h3>
            <div className="flex items-end gap-2 h-40">
              {last7DaysRevenue.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-amber-500/30 to-amber-400/60 rounded-t-lg transition-all duration-500"
                    style={{ height: `${(day.revenue / maxRevenue) * 100}%`, minHeight: "4px" }}
                  />
                  <span className="text-white/40 text-xs">{day.date}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Order Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <GlassCard className="p-6" hover={false}>
            <h3 className="text-white/60 text-sm uppercase tracking-wider mb-6">Order Status</h3>
            <div className="space-y-4">
              {[
                { label: "Pending", count: statusCounts.pending, color: "bg-yellow-400" },
                { label: "Confirmed", count: statusCounts.confirmed, color: "bg-cyan-400" },
                { label: "Packed", count: statusCounts.packed, color: "bg-purple-400" },
                { label: "Shipped", count: statusCounts.shipped, color: "bg-blue-400" },
                { label: "Delivered", count: statusCounts.delivered, color: "bg-green-400" }
              ].map((status) => (
                <div key={status.label} className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${status.color}`} />
                  <span className="text-white/60 flex-1">{status.label}</span>
                  <span className="text-white font-medium">{status.count}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Quick Links & Recent Orders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassCard className="p-6" hover={false}>
            <h3 className="text-white/60 text-sm uppercase tracking-wider mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link to={createPageUrl("AdminUsers")}>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span className="text-white/80">Manage Users</span>
                  <span className="ml-auto text-white/40 text-sm">{users.length}</span>
                </div>
              </Link>
              <Link to={createPageUrl("AdminCategories")}>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <FolderOpen className="w-5 h-5 text-blue-400" />
                  <span className="text-white/80">Categories</span>
                  <span className="ml-auto text-white/40 text-sm">{categories.length}</span>
                </div>
              </Link>
              <Link to={createPageUrl("AdminProducts")}>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <Package className="w-5 h-5 text-purple-400" />
                  <span className="text-white/80">Products</span>
                  <span className="ml-auto text-white/40 text-sm">{products.length}</span>
                </div>
              </Link>
            </div>
          </GlassCard>
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="md:col-span-2"
        >
          <GlassCard className="p-6" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white/60 text-sm uppercase tracking-wider">Recent Orders</h3>
              <Link to={createPageUrl("AdminOrders")} className="text-amber-400 text-sm hover:text-amber-300">
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {recentOrders.length === 0 ? (
                <p className="text-white/40 text-center py-4">No orders yet</p>
              ) : (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-white/5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate">{order.customer_name}</p>
                      <p className="text-white/40 text-sm">{order.order_number}</p>
                    </div>
                    <span className="text-amber-300">฿{order.total_amount?.toLocaleString()}</span>
                    <span className={`px-2 py-1 rounded text-xs uppercase ${
                      order.status === "delivered" ? "bg-green-500/20 text-green-400" :
                      order.status === "shipped" ? "bg-blue-500/20 text-blue-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {order.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
