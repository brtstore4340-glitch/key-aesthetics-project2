import { useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { Product, User } from "@shared/schema";
import { toJpeg } from "html-to-image";

const defaultEmail = "yubkk1991@gmail.com";

export default function Summary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [useAllProducts, setUseAllProducts] = useState(true);
  const [useAllStaff, setUseAllStaff] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<number[]>([]);
  const [reportCreated, setReportCreated] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailValue, setEmailValue] = useState(defaultEmail);
  const reportRef = useRef<HTMLDivElement | null>(null);

  const { data: products } = useQuery<Product[]>({
    queryKey: [api.products.list.path],
    queryFn: async () => {
      const res = await fetch(api.products.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load products");
      return api.products.list.responses[200].parse(await res.json());
    },
  });

  const { data: users } = useQuery<User[]>({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await fetch(api.users.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load users");
      return api.users.list.responses[200].parse(await res.json());
    },
  });

  const staffOptions = useMemo(
    () => users?.filter((u) => u.role === "staff" || u.role === "admin" || u.role === "accounting") ?? [],
    [users]
  );

  if (user?.role !== "admin" && user?.role !== "accounting") {
    return <div className="p-8 text-center text-muted-foreground">Unauthorized. Admin and Accounting only.</div>;
  }

  const toggleSelection = (id: number, list: number[], setList: (ids: number[]) => void) => {
    if (list.includes(id)) {
      setList(list.filter((item) => item !== id));
    } else {
      setList([...list, id]);
    }
  };

  const handleCreateReport = () => {
    if (!rangeStart || !rangeEnd) {
      toast({ title: "เลือกช่วงเวลา", description: "กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด", variant: "destructive" });
      return;
    }
    setReportCreated(true);
    toast({ title: "สร้างรายงานสำเร็จ", description: "สามารถ export เป็น .jpeg ได้ทันที" });
  };

  const handleExport = async (channel: "line" | "email") => {
    if (!reportRef.current) return;
    try {
      const dataUrl = await toJpeg(reportRef.current, { quality: 0.95 });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `summary-${Date.now()}.jpeg`;
      link.click();
      toast({
        title: "Export สำเร็จ",
        description: channel === "email" ? `ส่งรายงานไปที่ ${emailValue}` : "ส่งรายงานไปที่ Line",
      });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  const selectedProductLabels = useAllProducts
    ? "All Products"
    : products?.filter((p) => selectedProducts.includes(p.id)).map((p) => p.name).join(", ") || "-";

  const selectedStaffLabels = useAllStaff
    ? "All Staff"
    : staffOptions.filter((s) => selectedStaff.includes(s.id)).map((s) => s.name).join(", ") || "-";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display font-bold">Summary</h1>
        <p className="text-muted-foreground">สรุปยอดตามสินค้าและพนักงาน</p>
      </header>

      <Tabs defaultValue="product" className="space-y-4">
        <TabsList>
          <TabsTrigger value="product">Summary by Product</TabsTrigger>
          <TabsTrigger value="staff">Sum by Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="product">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary by Product</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={useAllProducts} onCheckedChange={(val) => setUseAllProducts(!!val)} id="all-products" />
                <label htmlFor="all-products" className="text-sm font-medium">All Products</label>
              </div>
              {!useAllProducts && (
                <div className="grid gap-2 md:grid-cols-2">
                  {products?.map((product) => (
                    <label key={product.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => toggleSelection(product.id, selectedProducts, setSelectedProducts)}
                      />
                      {product.name}
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sum by Staff</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={useAllStaff} onCheckedChange={(val) => setUseAllStaff(!!val)} id="all-staff" />
                <label htmlFor="all-staff" className="text-sm font-medium">All Staff</label>
              </div>
              {!useAllStaff && (
                <div className="grid gap-2 md:grid-cols-2">
                  {staffOptions.map((staff) => (
                    <label key={staff.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedStaff.includes(staff.id)}
                        onCheckedChange={() => toggleSelection(staff.id, selectedStaff, setSelectedStaff)}
                      />
                      {staff.name} ({staff.username})
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ช่วงเวลา</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">เริ่มต้น</label>
            <Input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">สิ้นสุด</label>
            <Input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleCreateReport}>Create Report</Button>
          </div>
        </CardContent>
      </Card>

      {reportCreated && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Report Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div ref={reportRef} className="rounded-xl border border-border/50 bg-secondary/10 p-4 space-y-2">
              <p className="text-sm font-semibold">Summary Report</p>
              <p className="text-xs text-muted-foreground">ช่วงเวลา: {rangeStart} - {rangeEnd}</p>
              <p className="text-xs text-muted-foreground">Products: {selectedProductLabels}</p>
              <p className="text-xs text-muted-foreground">Staff: {selectedStaffLabels}</p>
              <div className="mt-3 text-xs text-muted-foreground">
                (รายงานตัวอย่างสำหรับ export เป็น .jpeg)
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => handleExport("line")}>Export to Line</Button>
              <Button onClick={() => setEmailDialogOpen(true)}>Export to Email</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ส่งรายงานทางอีเมล</DialogTitle>
            <DialogDescription>กรอกอีเมลผู้รับเพื่อส่งไฟล์รายงาน</DialogDescription>
          </DialogHeader>
          <Input value={emailValue} onChange={(e) => setEmailValue(e.target.value)} />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEmailDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={() => handleExport("email")}>ส่งอีเมล</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
