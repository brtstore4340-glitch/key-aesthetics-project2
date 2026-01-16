import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useOrders, useUpdateOrder } from "@/hooks/use-orders";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { toJpeg } from "html-to-image";
import { Download, Loader2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";

export default function Orders() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>(user?.role === "accounting" ? "submitted" : "all");
  const { data: orders, isLoading } = useOrders(filter === "all" ? undefined : filter, user?.role);
  const { mutateAsync: updateOrder } = useUpdateOrder();
  const { toast } = useToast();
  const pickingRef = useRef<HTMLDivElement | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  const filters =
    user?.role === "accounting"
      ? [
          { id: "submitted", label: "สั่งซื้อ" },
          { id: "verified", label: "กำลังจัด" },
        ]
      : [
          { id: "all", label: "ทั้งหมด" },
          { id: "draft", label: "บันทึก" },
          { id: "submitted", label: "สั่งซื้อ" },
          { id: "verified", label: "กำลังจัด" },
        ];

  const pageTitle = user?.role === "accounting" ? "Packing & Shipping" : "Orders";
  const pageDesc =
    user?.role === "accounting"
      ? "Manage outgoing shipments and packing lists"
      : "Manage and track order status";
  const sortedOrders = useMemo(() => {
    return (orders ?? []).slice().sort((a, b) => a.orderNo.localeCompare(b.orderNo));
  }, [orders]);

  const groupedTotals = useMemo(() => {
    const summary: Record<number, { name: string; quantity: number }> = {};
    sortedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const current = summary[item.productId] ?? { name: item.name, quantity: 0 };
        summary[item.productId] = {
          name: current.name,
          quantity: current.quantity + item.quantity,
        };
      });
    });
    return Object.entries(summary)
      .map(([productId, data]) => ({ productId: Number(productId), ...data }))
      .sort((a, b) => a.productId - b.productId);
  }, [sortedOrders]);

  const handleExportPickingList = async () => {
    if (!sortedOrders.length) {
      toast({
        title: "ไม่มีรายการสั่งซื้อ",
        description: "ไม่พบรายการสำหรับ export",
        variant: "destructive",
      });
      return;
    }
    if (!pickingRef.current) return;
    try {
      const dataUrl = await toJpeg(pickingRef.current, { quality: 0.95 });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `picking-list-${Date.now()}.jpeg`;
      link.click();

      const toUpdate = sortedOrders.filter((order) => order.status === "submitted");
      await Promise.all(toUpdate.map((order) => updateOrder({ id: order.id, status: "verified" })));
      toast({ title: "Export สำเร็จ", description: "สถานะอัปเดตเป็นกำลังจัดแล้ว" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">{pageTitle}</h1>
          <p className="text-muted-foreground">{pageDesc}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user?.role === "accounting" && (
            <Button variant="secondary" className="gap-2" onClick={handleExportPickingList}>
              <Download className="w-4 h-4" />
              Export Picking List
            </Button>
          )}
          <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-xl">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${
                  filter === f.id
                    ? "bg-secondary text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }
              `}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {user?.role === "accounting" && (
        <div className="border border-dashed border-border/60 rounded-2xl p-4 text-xs text-muted-foreground">
          Export จะสร้าง Picking List ตามเลขที่สั่งซื้อและเลขสินค้า พร้อมสรุปยอดท้ายเอกสาร
        </div>
      )}

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
                    <span className="font-mono text-sm font-medium text-foreground">
                      {order.orderNo}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">
                        {format(new Date(order.createdAt!), "MMM d, yyyy")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(order.createdAt!), "h:mm a")}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={order.status || "draft"} />
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{order.items.length} items</td>
                  <td className="p-4 text-sm font-semibold text-foreground">
                    ${Number(order.total).toFixed(2)}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <Link
                      href={`/orders/${order.id}`}
                      className="
                      inline-block px-3 py-1.5 text-xs font-medium text-primary border border-primary/20 rounded-lg
                      hover:bg-primary/10 transition-colors
                    "
                    >
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

      {user?.role === "accounting" && (
        <div className="absolute -left-[10000px] -top-[10000px]">
          <div ref={pickingRef} className="w-[900px] bg-white text-black p-6 space-y-4">
            <h2 className="text-xl font-bold">Picking List</h2>
            <div className="text-sm">Generated: {format(new Date(), "MMM d, yyyy • h:mm a")}</div>
            <table className="w-full text-xs border border-black border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-2">Order No</th>
                  <th className="border border-black p-2">Product No</th>
                  <th className="border border-black p-2">ผู้สั่ง</th>
                  <th className="border border-black p-2">เบอร์โทร</th>
                  <th className="border border-black p-2">User ID</th>
                  <th className="border border-black p-2">สินค้า</th>
                  <th className="border border-black p-2">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((order) =>
                  order.items
                    .slice()
                    .sort((a, b) => a.productId - b.productId)
                    .map((item, idx) => (
                      <tr key={`${order.id}-${item.productId}-${idx}`}>
                        <td className="border border-black p-2">{order.orderNo}</td>
                        <td className="border border-black p-2">{item.productId}</td>
                        <td className="border border-black p-2">
                          {order.customerInfo?.doctorName || "-"}
                        </td>
                        <td className="border border-black p-2">
                          {order.customerInfo?.phone || "-"}
                        </td>
                        <td className="border border-black p-2">{order.createdBy ?? "-"}</td>
                        <td className="border border-black p-2">{item.name}</td>
                        <td className="border border-black p-2 text-right">{item.quantity}</td>
                      </tr>
                    )),
                )}
              </tbody>
            </table>

            <div>
              <h3 className="font-semibold">Summary by Product Number</h3>
              <table className="w-full text-xs border border-black border-collapse mt-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-2">Product No</th>
                    <th className="border border-black p-2">ชื่อสินค้า</th>
                    <th className="border border-black p-2">รวมจำนวน</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedTotals.map((item) => (
                    <tr key={item.productId}>
                      <td className="border border-black p-2">{item.productId}</td>
                      <td className="border border-black p-2">{item.name}</td>
                      <td className="border border-black p-2 text-right">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
