import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Home, Users, Package, FolderOpen, ShoppingCart, Plus, Edit2, Trash2, X, Upload, FileSpreadsheet } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import GlassInput from "@/components/ui/GlassInput";
import GlassUpload from "@/components/ui/GlassUpload";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AdminProducts() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    image_url: "",
    category_id: "",
    sku: "",
    in_stock: true
  });
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const bulkInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const user = sessionStorage.getItem("authenticated_user");
    if (user) {
      setCurrentUser(JSON.parse(user));
    } else {
      window.location.href = createPageUrl("StaffSelection");
    }
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.ProductCategory.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
    }
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (products) => base44.entities.Product.bulkCreate(products),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      setShowBulkModal(false);
      setBulkFile(null);
    }
  });

  const navItems = [
    { label: "Dashboard", path: "AdminDashboard", icon: Home },
    { label: "Users", path: "AdminUsers", icon: Users },
    { label: "Categories", path: "AdminCategories", icon: FolderOpen },
    { label: "Products", path: "AdminProducts", icon: Package, active: true },
    { label: "All Orders", path: "AdminOrders", icon: ShoppingCart }
  ];

  if (!currentUser) return null;

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      image_url: "",
      category_id: categories[0]?.id || "",
      sku: "",
      in_stock: true
    });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      description: product.description || "",
      price: product.price || 0,
      image_url: product.image_url || "",
      category_id: product.category_id || "",
      sku: product.sku || "",
      in_stock: product.in_stock !== false
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleSubmit = () => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkUploading(true);
    setBulkFile(file);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              price: { type: "number" },
              sku: { type: "string" },
              category_name: { type: "string" }
            }
          }
        }
      });

      if (result.status === "success" && result.output) {
        const productsToCreate = result.output.map((item) => {
          const category = categories.find(
            (c) => c.name.toLowerCase() === item.category_name?.toLowerCase()
          );
          return {
            name: item.name,
            description: item.description || "",
            price: parseFloat(item.price) || 0,
            sku: item.sku || "",
            category_id: category?.id || "",
            in_stock: true
          };
        });

        bulkCreateMutation.mutate(productsToCreate);
      }
    } catch (error) {
      console.error("Bulk upload failed:", error);
    } finally {
      setBulkUploading(false);
    }
  };

  const filteredProducts = categoryFilter === "all"
    ? products
    : products.filter((p) => p.category_id === categoryFilter);

  const getCategoryName = (categoryId) => {
    return categories.find((c) => c.id === categoryId)?.name || "Uncategorized";
  };

  return (
    <DashboardLayout currentUser={currentUser} navItems={navItems}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl text-white/80 font-light tracking-wide">Products</h1>
        <div className="flex gap-3">
          <GlassButton
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" /> Bulk Upload
          </GlassButton>
          <GlassButton variant="gold" onClick={openCreateModal} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Product
          </GlassButton>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-3 rounded-xl bg-white/5 backdrop-blur-xl border-b border-white/20 text-white outline-none"
        >
          <option value="all" className="bg-neutral-900">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id} className="bg-neutral-900">{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <GlassCard key={i} className="p-4 animate-pulse">
              <div className="aspect-square bg-white/10 rounded-xl mb-4" />
              <div className="h-4 bg-white/10 rounded w-2/3 mb-2" />
              <div className="h-4 bg-white/10 rounded w-1/2" />
            </GlassCard>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <p className="text-white/60 mb-4">No products yet. Add your first product!</p>
          <GlassButton variant="gold" onClick={openCreateModal}>
            Add Product
          </GlassButton>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className="overflow-hidden" hover={false}>
                <div className="aspect-square bg-white/5 overflow-hidden relative">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-white/20" />
                    </div>
                  )}
                  {!product.in_stock && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-red-400 font-medium">Out of Stock</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{product.name}</h3>
                      <p className="text-amber-300 mt-1">฿{product.price?.toLocaleString()}</p>
                      <p className="text-white/40 text-xs mt-1">{getCategoryName(product.category_id)}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => openEditModal(product)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-white/60" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Product Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <GlassCard className="p-6" hover={false}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl text-white font-light">
                    {editingProduct ? "Edit Product" : "New Product"}
                  </h2>
                  <button onClick={closeModal} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>

                <div className="space-y-4">
                  <GlassInput
                    label="Product Name"
                    placeholder="Enter product name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />

                  <div className="space-y-2">
                    <label className="text-sm text-white/60 font-light tracking-wide">Description</label>
                    <textarea
                      placeholder="Enter description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-xl border-b border-white/20 focus:border-amber-400/50 text-white placeholder:text-white/30 outline-none transition-all resize-none h-24"
                    />
                  </div>

                  <GlassInput
                    label="Price (฿)"
                    type="number"
                    placeholder="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  />

                  <GlassInput
                    label="SKU"
                    placeholder="Product SKU"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />

                  <div className="space-y-2">
                    <label className="text-sm text-white/60 font-light tracking-wide">Category</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-xl border-b border-white/20 text-white outline-none"
                    >
                      <option value="" className="bg-neutral-900">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id} className="bg-neutral-900">{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <GlassUpload
                    label="Product Image"
                    value={formData.image_url}
                    onUpload={(url) => setFormData({ ...formData, image_url: url })}
                    accept="image/*"
                  />

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.in_stock}
                      onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
                      className="w-5 h-5 rounded bg-white/10 border-white/20 checked:bg-amber-500"
                    />
                    <span className="text-white/80">In Stock</span>
                  </label>
                </div>

                <div className="flex gap-3 mt-6">
                  <GlassButton onClick={closeModal} className="flex-1">
                    Cancel
                  </GlassButton>
                  <GlassButton
                    variant="gold"
                    onClick={handleSubmit}
                    disabled={!formData.name || !formData.price || createMutation.isPending || updateMutation.isPending}
                    className="flex-1"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : editingProduct
                      ? "Update"
                      : "Create"}
                  </GlassButton>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowBulkModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <GlassCard className="p-6" hover={false}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl text-white font-light">Bulk Upload Products</h2>
                  <button onClick={() => setShowBulkModal(false)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-white/60 text-sm">
                    Upload an Excel file (.xlsx, .xls) with columns: name, description, price, sku, category_name
                  </p>

                  <input
                    ref={bulkInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleBulkUpload}
                    className="hidden"
                  />

                  <button
                    onClick={() => bulkInputRef.current?.click()}
                    disabled={bulkUploading || bulkCreateMutation.isPending}
                    className={cn(
                      "w-full p-8 rounded-2xl border-2 border-dashed border-white/20",
                      "hover:border-amber-400/50 hover:bg-white/5 transition-all",
                      "flex flex-col items-center gap-4"
                    )}
                  >
                    {bulkUploading || bulkCreateMutation.isPending ? (
                      <>
                        <div className="w-12 h-12 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                        <span className="text-white/60">Processing...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-12 h-12 text-amber-400/60" />
                        <span className="text-white/60">Click to select file</span>
                      </>
                    )}
                  </button>

                  {bulkFile && (
                    <p className="text-green-400 text-sm text-center">
                      File: {bulkFile.name}
                    </p>
                  )}
                </div>

                <GlassButton
                  onClick={() => setShowBulkModal(false)}
                  className="w-full mt-6"
                >
                  Close
                </GlassButton>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
