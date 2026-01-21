import { cn } from "@/lib/utils";

export default function GlassCard({ children, className, hover = true, ...props }) {
  return (
    <div
      className={cn(
        "relative rounded-2xl bg-white/5 border border-white/10 backdrop-blur-2xl shadow-xl",
        hover && "hover:bg-white/10 hover:border-white/20 transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
