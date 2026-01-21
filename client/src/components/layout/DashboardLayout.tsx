import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Menu, X, LogOut, Home, ShoppingCart, FileText, 
  Users, Package, Settings, BarChart3 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import FloatingParticles from "@/components/ui/FloatingParticles";

export default function DashboardLayout({ children, currentUser, navItems }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem("authenticated_user");
    window.location.href = createPageUrl("Login");
  };

  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden">
      <FloatingParticles />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col z-20">
        <div className="h-full bg-white/5 border-r border-white/10 backdrop-blur-2xl p-6 flex flex-col">
          {/* Logo */}
          <div className="text-center mb-8 pb-6 border-b border-white/10">
            <h1 className="text-2xl font-serif tracking-wider">
              <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
                JALOR
              </span>
            </h1>
          </div>

          {/* User Info */}
          <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 flex items-center justify-center overflow-hidden">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-amber-400">{currentUser?.full_name?.[0] || "U"}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{currentUser?.full_name || "User"}</p>
                <p className="text-xs text-white/40 uppercase tracking-wider">{currentUser?.staff_role || "Staff"}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={createPageUrl(item.path)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                  "text-white/60 hover:text-white hover:bg-white/10",
                  item.active && "bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-200 border border-amber-400/20"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-light tracking-wide">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 mt-auto"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-light tracking-wide">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white/5 border-b border-white/10 backdrop-blur-2xl">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-serif tracking-wider">
            <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
              JALOR
            </span>
          </h1>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-white/5 border border-white/10"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-20 bg-neutral-950/95 backdrop-blur-xl pt-20"
          >
            <div className="p-6 space-y-4">
              {/* User Info */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 flex items-center justify-center">
                    <span className="text-amber-400 text-lg">{currentUser?.full_name?.[0] || "U"}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{currentUser?.full_name || "User"}</p>
                    <p className="text-xs text-white/40 uppercase tracking-wider">{currentUser?.staff_role || "Staff"}</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              {navItems.map((item, index) => (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={createPageUrl(item.path)}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-4 rounded-xl transition-all",
                      "text-white/60 hover:text-white hover:bg-white/10",
                      item.active && "bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-200"
                    )}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-lg font-light tracking-wide">{item.label}</span>
                  </Link>
                </motion.div>
              ))}

              {/* Logout */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navItems.length * 0.1 }}
                onClick={handleLogout}
                className="flex items-center gap-4 px-4 py-4 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
              >
                <LogOut className="w-6 h-6" />
                <span className="text-lg font-light tracking-wide">Logout</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen pt-20 md:pt-0">
        <div className="relative z-10 p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
