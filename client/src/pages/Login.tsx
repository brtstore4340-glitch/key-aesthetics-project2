import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login, isLoggingIn, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  if (user) {
    setLocation("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ username, password });
      toast({ title: "Welcome back!", description: "Successfully logged in." });
    } catch (err: any) {
      toast({ 
        title: "Login failed", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-mint/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-card border border-border/50 p-8 rounded-2xl shadow-2xl relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-primary to-amber-300 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-6 transform rotate-3 hover:rotate-6 transition-transform duration-500">
             <span className="text-3xl font-bold text-primary-foreground font-display">S</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Sign in to manage your orders</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground ml-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              placeholder="Enter your username"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="
              w-full py-3.5 rounded-xl font-semibold text-primary-foreground
              bg-gradient-to-r from-primary to-amber-500
              shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30
              hover:-translate-y-0.5 active:translate-y-0
              disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none
              transition-all duration-200 ease-out flex items-center justify-center gap-2
            "
          >
            {isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-border/40 text-center">
           <p className="text-xs text-muted-foreground">
             Demo Credentials: <span className="font-mono text-primary">admin/admin</span> or <span className="font-mono text-primary">staff/staff</span>
           </p>
        </div>
      </div>
    </div>
  );
}
