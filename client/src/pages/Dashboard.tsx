import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { Link } from "wouter";
import { StatusBadge } from "@/components/StatusBadge";
import { motion } from "framer-motion";
import { Plus, ArrowUpRight, Clock, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: orders, isLoading } = useOrders();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const recentOrders = orders?.slice(0, 5) || [];

  const stats = [
    { label: "Total Orders", value: orders?.length || 0, icon: FileText, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Pending", value: orders?.filter((o) => o.status === "submitted").length || 0, icon: Clock, color: "text-peach", bg: "bg-peach/10" },
    { label: "Verified", value: orders?.filter((o) => o.status === "verified").length || 0, icon: CheckCircle2, color: "text-mint", bg: "bg-mint/10" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Good {new Date().getHours() < 12 ? "Morning" : "Evening"},{" "}
            {user?.name?.split(" ")[0] ?? ""}
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening today.</p>
        </div>

        <Link
          href="/orders/new"
          className="
          inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold
          bg-primary text-primary-foreground shadow-lg shadow-primary/20
          hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0
          transition-all duration-200
        "
        >
          <Plus className="w-5 h-5" />
          Create New Order
        </Link>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <h3 className="text-3xl font-display font-bold mt-2">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-display font-bold">Recent Orders</h2>
          <Link href="/orders" className="text-sm font-medium text-primary hover:text-amber-400 flex items-center gap-1">
            View All <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
          {recentOrders.length > 0 ? (
            <div className="divide-y divide-border/40">
              {recentOrders.map((order) => (
                <div key={order.id} className="p-4 md:p-6 hover:bg-secondary/30 transition-colors group">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground font-display font-bold">
                        #{order.orderNo}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{order.orderNo}</h4>
                        <p className="text-sm text-muted-foreground">
                          {order.createdAt ? format(order.createdAt, "MMM d, yyyy • h:mm a") : "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-2 md:mt-0">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          ฿{Number(order.total).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">{order.items.length} items</p>
                      </div>
                      <StatusBadge status={order.status || "draft"} />
                      <Link
                        href={`/orders/${order.id}`}
                        className="p-2 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <ArrowUpRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <FileText className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-lg font-medium">No orders yet</h3>
              <p className="text-muted-foreground mt-1">Create your first order to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
