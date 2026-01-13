import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  FileText, 
  Settings, 
  LogOut,
  PlusCircle,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => location === path;
  
  const links = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/orders", label: "Orders", icon: FileText },
    { href: "/products", label: "Products", icon: ShoppingBag },
  ];

  if (user?.role === "admin") {
    links.push({ href: "/promotions", label: "Promotions", icon: Gift });
    links.push({ href: "/settings", label: "Settings", icon: Settings });
  }

  const NavContent = () => (
    <div className="flex flex-col h-full bg-card/95 backdrop-blur-xl border-r border-border/40 p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-amber-300 shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground font-bold font-display">
          S
        </div>
        <div>
          <h1 className="font-display font-bold text-lg tracking-tight">System</h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{user?.role} Portal</p>
        </div>
      </div>

      <nav className="space-y-2 flex-1">
        {links.map((link) => {
          const active = isActive(link.href);
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className={`
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
              ${active 
                ? "bg-primary/10 text-primary font-medium" 
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }
            `}>
              <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
              {link.label}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-border/40">
           <Link href="/orders/new" className="
              flex items-center gap-3 px-4 py-3 rounded-xl
              bg-primary text-primary-foreground font-semibold
              shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5
              transition-all duration-300
           ">
            <PlusCircle className="w-5 h-5" />
            New Order
          </Link>
        </div>
      </nav>

      <div className="pt-6 border-t border-border/40">
        <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-secondary/30">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mint to-teal-400 flex items-center justify-center text-xs font-bold text-teal-950">
            {user?.username?.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
          </div>
        </div>
        <button 
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center active:scale-95 transition-transform"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] z-50 lg:hidden"
            >
              <NavContent />
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-[280px] h-screen sticky top-0">
        <NavContent />
      </div>
    </>
  );
}
