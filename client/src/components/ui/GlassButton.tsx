import { cn } from "@/lib/utils";

export default function GlassButton({ 
  children, 
  className, 
  variant = "default",
  size = "default",
  ...props 
}) {
  const variants = {
    default: "bg-gradient-to-b from-white/10 to-white/5 border-white/20 text-white hover:from-white/20 hover:to-white/10",
    gold: "bg-gradient-to-b from-amber-500/30 to-amber-600/20 border-amber-400/30 text-amber-200 hover:from-amber-500/40 hover:to-amber-600/30",
    danger: "bg-gradient-to-b from-red-500/30 to-red-600/20 border-red-400/30 text-red-200 hover:from-red-500/40 hover:to-red-600/30"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    default: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
    icon: "p-3"
  };

  return (
    <button
      className={cn(
        "relative rounded-xl border backdrop-blur-xl",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]",
        "transition-all duration-300 font-medium",
        "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_0_20px_rgba(255,255,255,0.1)]",
        "active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
