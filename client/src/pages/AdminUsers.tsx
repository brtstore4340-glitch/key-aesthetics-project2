import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Home, Users, Package, FolderOpen, ShoppingCart, Plus, Edit2, Trash2, X, User } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import GlassInput from "@/components/ui/GlassInput";
import GlassUpload from "@/components/ui/GlassUpload";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AdminUsers() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    pin: "",
    staff_role: "staff",
    avatar_url: ""
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

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list()
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      closeModal();
    }
  });

  const navItems = [
    { label: "Dashboard", path: "AdminDashboard", icon: Home },
    { label: "Users", path: "AdminUsers", icon: Users, active: true },
    { label: "Categories", path: "AdminCategories", icon: FolderOpen },
    { label: "Products", path: "AdminProducts", icon: Package },
    { label: "All Orders", path: "AdminOrders", icon: ShoppingCart }
  ];

  if (!currentUser) return null;

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || "",
      email: user.email || "",
      pin: user.pin || "",
      staff_role: user.staff_role || "staff",
      avatar_url: user.avatar_url || ""
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      full_name: "",
      email: "",
      pin: "",
      staff_role: "staff",
      avatar_url: ""
    });
  };

  const handleSubmit = () => {
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        data: {
          pin: formData.pin,
          staff_role: formData.staff_role,
          avatar_url: formData.avatar_url
        }
      });
    }
  };

  const roleColors = {
    admin: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    accounting: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    staff: "bg-green-500/20 text-green-400 border-green-500/30"
  };

  return (
    <DashboardLayout currentUser={currentUser} navItems={navItems}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl text-white/80 font-light tracking-wide">User Management</h1>
        <p className="text-white/40 text-sm">Users are invited via the platform</p>
      </div>

      {/* Users Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <GlassCard key={i} className="p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/10" />
                <div className="flex-1">
                  <div className="h-5 bg-white/10 rounded w-2/3 mb-2" />
                  <div className="h-4 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : users.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <p className="text-white/60">No users found. Invite users through the platform.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className="p-6" hover={false}>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-amber-400/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{user.full_name || "No Name"}</h3>
                    <p className="text-white/40 text-sm truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs uppercase tracking-wider border",
                        roleColors[user.staff_role] || roleColors.staff
                      )}>
                        {user.staff_role || "staff"}
                      </span>
                      {user.pin && (
                        <span className="text-white/30 text-xs">PIN: ****</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openEditModal(user)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
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
                  <h2 className="text-xl text-white font-light">Edit User</h2>
                  <button onClick={closeModal} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Avatar Upload */}
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border-2 border-amber-400/30 flex items-center justify-center overflow-hidden">
                        {formData.avatar_url ? (
                          <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-amber-400/60" />
                        )}
                      </div>
                    </div>
                  </div>

                  <GlassUpload
                    label="Upload Avatar"
                    value={formData.avatar_url}
                    onUpload={(url) => setFormData({ ...formData, avatar_url: url })}
                    accept="image/*"
                  />

                  <GlassInput
                    label="Full Name"
                    value={formData.full_name}
                    disabled
                    className="opacity-50"
                  />

                  <GlassInput
                    label="Email"
                    value={formData.email}
                    disabled
                    className="opacity-50"
                  />

                  <GlassInput
                    label="PIN Code (4 digits)"
                    placeholder="Enter 4-digit PIN"
                    type="password"
                    maxLength={4}
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  />

                  <div className="space-y-2">
                    <label className="text-sm text-white/60 font-light tracking-wide">Role</label>
                    <select
                      value={formData.staff_role}
                      onChange={(e) => setFormData({ ...formData, staff_role: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-xl border-b border-white/20 text-white outline-none transition-all focus:border-amber-400/50"
                    >
                      <option value="staff" className="bg-neutral-900">Staff (Sales)</option>
                      <option value="accounting" className="bg-neutral-900">Accounting</option>
                      <option value="admin" className="bg-neutral-900">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <GlassButton onClick={closeModal} className="flex-1">
                    Cancel
                  </GlassButton>
                  <GlassButton
                    variant="gold"
                    onClick={handleSubmit}
                    disabled={updateUserMutation.isPending}
                    className="flex-1"
                  >
                    {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
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
