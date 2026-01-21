import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Home, ShoppingCart, FileText, Package } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function StaffDashboard() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = sessionStorage.getItem("authenticated_user");
    if (user) {
      setCurrentUser(JSON.parse(user));
    } else {
      window.location.href = createPageUrl("StaffSelection");
    }
  }, []);

  const { data: recentOrders = [] } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: () => base44.entities.Order.filter({}, "-created_date", 5)
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list()
  });

  const navItems = [
    { label: "Dashboard", path: "StaffDashboard", icon: Home, active: true },
    { label: "New Order", path: "CreateOrder", icon: ShoppingCart },
    { label: "My Orders", path: "StaffOrders", icon: FileText }
  ];

  if (!currentUser) return null;

  const todayOrders = recentOrders.filter(
    (order) => new Date(order.created_date).toDateString() === new Date().toDateString()
  );

  return (
    <DashboardLayout currentUser={currentUser} navItems={navItems}>
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-light text-white tracking-wide">
          Welcome back, <span className="text-amber-300">{currentUser.full_name}</span>
        </h1>
        <p className="text-white/40 mt-2">Ready to create some orders?</p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-6">
            <p className="text-white/40 text-sm uppercase tracking-wider">Today's Orders</p>
            <p className="text-3xl font-light text-amber-300 mt-2">{todayOrders.length}</p>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-6">
            <p className="text-white/40 text-sm uppercase tracking-wider">Products</p>
            <p className="text-3xl font-light text-white mt-2">{products.length}</p>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="p-6">
            <p className="text-white/40 text-sm uppercase tracking-wider">Pending</p>
            <p className="text-3xl font-light text-yellow-400 mt-2">
              {recentOrders.filter((o) => o.status === "pending").length}
            </p>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="p-6">
            <p className="text-white/40 text-sm uppercase tracking-wider">Shipped</p>
            <p className="text-3xl font-light text-green-400 mt-2">
              {recentOrders.filter((o) => o.status === "shipped").length}
            </p>
          </GlassCard>
        </motion.div>
      </div>

      {/* Quick Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-8"
      >
        <Link to={createPageUrl("CreateOrder")}>
          <GlassCard className="p-8 text-center group cursor-pointer">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/20 border border-amber-400/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-8 h-8 text-amber-300" />
            </div>
            <h3 className="text-xl text-white font-light tracking-wide">Create New Order</h3>
            <p className="text-white/40 mt-2 text-sm">Start a new sales order</p>
          </GlassCard>
        </Link>
      </motion.div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-xl text-white/80 font-light tracking-wide mb-4">Recent Orders</h2>
        <GlassCard className="overflow-hidden" hover={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/40 text-xs uppercase tracking-wider p-4">Order #</th>
                  <th className="text-left text-white/40 text-xs uppercase tracking-wider p-4">Customer</th>
                  <th className="text-left text-white/40 text-xs uppercase tracking-wider p-4">Amount</th>
                  <th className="text-left text-white/40 text-xs uppercase tracking-wider p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-white/40 p-8">
                      No orders yet. Create your first order!
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4 text-white font-mono text-sm">{order.order_number || order.id?.slice(0, 8)}</td>
                      <td className="p-4 text-white/80">{order.customer_name}</td>
                      <td className="p-4 text-amber-300">฿{order.total_amount?.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider ${
                          order.status === "delivered" ? "bg-green-500/20 text-green-400" :
                          order.status === "shipped" ? "bg-blue-500/20 text-blue-400" :
                          order.status === "packed" ? "bg-purple-500/20 text-purple-400" :
                          order.status === "confirmed" ? "bg-cyan-500/20 text-cyan-400" :
                          order.status === "cancelled" ? "bg-red-500/20 text-red-400" :
                          "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </motion.div>
    </DashboardLayout>
  );
}