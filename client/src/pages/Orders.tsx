import { useOrders } from "@/hooks/use-orders";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge } from "@/components/StatusBadge";
import { Link } from "wouter";
import { format } from "date-fns";
import { Loader2, Search, Filter } from "lucide-react";
import { useState } from "react";

export default function Orders() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>(user?.role === 'accounting' ? "submitted" : "all");
  const { data: orders, isLoading } = useOrders(filter === "all" ? undefined : filter, user?.role);

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;
  }

  const filters = user?.role === 'accounting' 
    ? [{ id: "submitted", label: "To Pack" }, { id: "verified", label: "Shipped" }]
    : [
        { id: "all", label: "All Orders" },
        { id: "draft", label: "Drafts" },
        { id: "submitted", label: "Submitted" },
        { id: "verified", label: "Verified" },
      ];

  const pageTitle = user?.role === 'accounting' ? "Packing & Shipping" : "Orders";
  const pageDesc = user?.role === 'accounting' ? "Manage outgoing shipments and packing lists" : "Manage and track order status";

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">{pageTitle}</h1>
          <p className="text-muted-foreground">{pageDesc}</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-xl">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${filter === f.id 
                  ? "bg-secondary text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/30 border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-4 pl-6 font-semibold">Order No</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Items</th>
                <th className="p-4 font-semibold">Total</th>
                <th className="p-4 pr-6 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {orders?.map((order) => (
                <tr key={order.id} className="group hover:bg-secondary/20 transition-colors">
                  <td className="p-4 pl-6">
                    <span className="font-mono text-sm font-medium text-foreground">{order.orderNo}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">{format(new Date(order.createdAt!), 'MMM d, yyyy')}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(order.createdAt!), 'h:mm a')}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={order.status || 'draft'} />
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {order.items.length} items
                  </td>
                  <td className="p-4 text-sm font-semibold text-foreground">
                    ${Number(order.total).toFixed(2)}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <Link href={`/orders/${order.id}`} className="
                      inline-block px-3 py-1.5 text-xs font-medium text-primary border border-primary/20 rounded-lg
                      hover:bg-primary/10 transition-colors
                    ">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
              
              {(!orders || orders.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    No orders found matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
