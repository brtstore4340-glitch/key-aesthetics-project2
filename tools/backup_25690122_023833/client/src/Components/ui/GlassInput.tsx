import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import React from "react";

const GlassInput = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      className={cn(
        "bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-primary/50 focus:ring-primary/20 backdrop-blur-md",
        className
      )}
      {...props}
    />
  );
});

GlassInput.displayName = "GlassInput";

export default GlassInput;
