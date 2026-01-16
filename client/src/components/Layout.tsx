import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function Layout({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-primary">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 w-full lg:max-w-[calc(100vw-280px)] p-4 md:p-8 lg:p-10 pb-24 lg:pb-10 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
