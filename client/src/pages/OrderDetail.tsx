import { useOrder, useUpdateOrderStatus } from "@/hooks/use-orders";
import { useAuth } from "@/hooks/use-auth";
import { useRoute, Link } from "wouter";
import { Loader2, ArrowLeft, CheckCircle2, Clock, XCircle, Download } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function OrderDetail() {
  const [, params] = useRoute("/orders/:id");
  const id = params?.id;

  const { data: order, isLoading } = useOrder(id);
  const { mutateAsync: updateOrder, isPending } = useUpdateOrderStatus();
  const { user } = useAuth();
  const { toast } = useToast();

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;
  if (!order) return <div className="p-12 text-center">Order not found</div>;

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (!id) return;
      await updateOrder({ id, status: newStatus, verifiedBy: user?.id });
      toast({ title: "Status updated", description: `Order marked as ${newStatus}` });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  const isStaff = user?.role === "staff";
  const isAdmin = user?.role === "admin";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div className="space-y-2">
          <Link href="/orders" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Orders
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-display font-bold">{order.orderNo}</h1>
            <StatusBadge status={order.status || 'draft'} />
          </div>
          <p className="text-muted-foreground">
            Created on {order.createdAt ? format(order.createdAt, "MMMM d, yyyy") : "-"} at {order.createdAt ? format(order.createdAt, "h:mm a") : "-"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 items-start">
          {order.status === 'draft' && (
            <button
              onClick={() => handleStatusChange('submitted')}
              disabled={isPending}
              className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              Submit Order
            </button>
          )}

          {isAdmin && order.status === 'submitted' && (
            <>
              <button
                onClick={() => handleStatusChange('verified')}
                disabled={isPending}
                className="px-6 py-2.5 bg-mint text-teal-950 rounded-xl font-medium shadow-lg shadow-mint/20 hover:bg-emerald-300 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Verify
              </button>
              <button
                onClick={() => handleStatusChange('cancelled')}
                disabled={isPending}
                className="px-6 py-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border/50">
              <h3 className="font-semibold text-lg">Order Items</h3>
            </div>
            <div className="divide-y divide-border/40">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-secondary/20">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">${Number(item.price).toFixed(2)} per unit</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${(Number(item.price) * item.quantity).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
              <div className="p-6 bg-secondary/10 flex justify-between items-center">
                <span className="font-bold text-lg">Total Amount</span>
                <span className="font-display font-bold text-2xl text-primary">${Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold mb-4 text-sm uppercase text-muted-foreground tracking-wider">Customer Info</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Doctor / Clinic</label>
                <p className="font-medium">{order.customerInfo?.doctorName || "N/A"}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Address</label>
                <p className="font-medium">{order.customerInfo?.address || "N/A"}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
             <h3 className="font-semibold mb-4 text-sm uppercase text-muted-foreground tracking-wider">Timeline</h3>
             <div className="space-y-6 relative pl-2">
               <div className="absolute left-[3px] top-2 bottom-2 w-0.5 bg-border/50"></div>
               
               <div className="relative pl-6">
                 <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-primary ring-4 ring-background"></div>
                 <p className="text-sm font-medium">Order Created</p>
                 <p className="text-xs text-muted-foreground">{format(new Date(order.createdAt!), 'MMM d, h:mm a')}</p>
               </div>

               {order.status !== 'draft' && (
                  <div className="relative pl-6">
                    <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-background"></div>
                    <p className="text-sm font-medium">Submitted</p>
                  </div>
               )}

               {order.status === 'verified' && (
                  <div className="relative pl-6">
                    <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-mint ring-4 ring-background"></div>
                    <p className="text-sm font-medium text-mint">Verified</p>
                    {order.verifiedAt && <p className="text-xs text-muted-foreground">{format(new Date(order.verifiedAt), 'MMM d, h:mm a')}</p>}
                  </div>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
