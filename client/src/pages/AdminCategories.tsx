import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Home, Users, Package, FolderOpen, ShoppingCart, Plus, Edit2, Trash2, X } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import GlassInput from "@/components/ui/GlassInput";
import GlassUpload from "@/components/ui/GlassUpload";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminCategories() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image_url: "",
    sort_order: 0
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const user = sessionStorage.getItem("authenticated_user");
    if (user) {
      setCurrentUser(JSON.parse(user));
    } else {
      window.location.href = createPageUrl("StaffSelection");
    }
  }, []);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.ProductCategory.list("sort_order")
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["categories"]);
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProductCategory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["categories"]);
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["categories"]);
    }
  });

  const navItems = [
    { label: "Dashboard", path: "AdminDashboard", icon: Home },
    { label: "Users", path: "AdminUsers", icon: Users },
    { label: "Categories", path: "AdminCategories", icon: FolderOpen, active: true },
    { label: "Products", path: "AdminProducts", icon: Package },
    { label: "All Orders", path: "AdminOrders", icon: ShoppingCart }
  ];

  if (!currentUser) return null;

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "", image_url: "", sort_order: categories.length });
    setShowModal(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || "",
      description: category.description || "",
      image_url: category.image_url || "",
      sort_order: category.sort_order || 0
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: "", description: "", image_url: "", sort_order: 0 });
  };

  const handleSubmit = () => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <DashboardLayout currentUser={currentUser} navItems={navItems}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl text-white/80 font-light tracking-wide">Product Categories</h1>
        <GlassButton variant="gold" onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Category
        </GlassButton>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <GlassCard key={i} className="p-6 animate-pulse">
              <div className="aspect-video bg-white/10 rounded-xl mb-4" />
              <div className="h-5 bg-white/10 rounded w-2/3 mb-2" />
              <div className="h-4 bg-white/10 rounded w-1/2" />
            </GlassCard>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <p className="text-white/60 mb-4">No categories yet. Create your first category!</p>
          <GlassButton variant="gold" onClick={openCreateModal}>
            Create Category
          </GlassButton>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className="overflow-hidden" hover={false}>
                <div className="aspect-video bg-white/5 overflow-hidden">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="w-12 h-12 text-white/20" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{category.name}</h3>
                      {category.description && (
                        <p className="text-white/40 text-sm mt-1 line-clamp-2">{category.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-2">
                      <button
                        onClick={() => openEditModal(category)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-white/60" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
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

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={closeModal}
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
                  <h2 className="text-xl text-white font-light">
                    {editingCategory ? "Edit Category" : "New Category"}
                  </h2>
                  <button onClick={closeModal} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>

                <div className="space-y-4">
                  <GlassInput
                    label="Category Name"
                    placeholder="Enter category name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />

                  <div className="space-y-2">
                    <label className="text-sm text-white/60 font-light tracking-wide">Description</label>
                    <textarea
                      placeholder="Enter description (optional)"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-xl border-b border-white/20 focus:border-amber-400/50 text-white placeholder:text-white/30 outline-none transition-all resize-none h-24"
                    />
                  </div>

                  <GlassUpload
                    label="Category Image"
                    value={formData.image_url}
                    onUpload={(url) => setFormData({ ...formData, image_url: url })}
                    accept="image/*"
                  />

                  <GlassInput
                    label="Sort Order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <GlassButton onClick={closeModal} className="flex-1">
                    Cancel
                  </GlassButton>
                  <GlassButton
                    variant="gold"
                    onClick={handleSubmit}
                    disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
                    className="flex-1"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : editingCategory
                      ? "Update"
                      : "Create"}
                  </GlassButton>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
