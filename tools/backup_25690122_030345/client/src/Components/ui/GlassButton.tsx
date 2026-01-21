import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function GlassButton({ children, className, variant = "default", ...props }) {
  return (
    <Button
      className={cn(
        "backdrop-blur-md transition-all duration-300",
        variant === "glass" && "bg-white/10 hover:bg-white/20 border border-white/10 text-white",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
