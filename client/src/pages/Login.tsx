import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Delete, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const { login, isLoggingIn, user } = useAuth();
  const presetUsers = ["admin", "staff", "account", "aaaaa"];
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [health, setHealth] = useState<"checking" | "ok" | "error">("checking");
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  useEffect(() => {
    let cancelled = false;
    const checkHealth = async () => {
      try {
        const res = await fetch(api.auth.health.path, { credentials: "include" });
        if (!cancelled) setHealth(res.ok ? "ok" : "error");
      } catch {
        if (!cancelled) setHealth("error");
      }
    };
    checkHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  if (user) return null;

  const handleNumpadClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4 && username) {
        handleLogin(username, newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleLogin = async (uname: string, upin: string) => {
    try {
      await login({ username: uname, pin: upin });
      // toast({ title: "Welcome back!", description: "Successfully logged in." });
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message,
        variant: "destructive",
      });
      setPin(""); // Clear PIN on failure
    }
  };

  const numpadButtons = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 px-4 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-mint/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-lg p-6 md:p-7 space-y-6 relative z-10">
        <div className="space-y-1 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-primary to-amber-300 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-6 transform rotate-3">
            <span className="text-3xl font-bold text-primary-foreground font-display">S</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">เข้าสู่ระบบ</h1>
          <p className="text-sm text-slate-500">ใช้รหัสพนักงานและ PIN 4 หลัก</p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-2">
            <span className="font-medium">สถานะระบบ:</span>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                health === "ok"
                  ? "bg-green-500"
                  : health === "checking"
                    ? "bg-amber-400"
                    : "bg-red-500"
              }`}
            />
            <span>
              {health === "ok"
                ? "พร้อมใช้งาน"
                : health === "checking"
                  ? "กำลังตรวจสอบ..."
                  : "เชื่อมต่อไม่ได้"}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2 text-center flex flex-col items-center">
            <select
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full max-w-[260px] px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-lg font-medium focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none text-slate-700"
            >
              <option value="" disabled>
                Select username
              </option>
              {presetUsers.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center gap-4 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: pin.length > i ? [1, 1.2, 1] : 1 }}
                className={`w-4 h-4 rounded-full border-2 transition-colors duration-200 ${
                  pin.length > i ? "bg-primary border-primary" : "border-slate-300"
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
            {numpadButtons.map((btn, i) => {
              if (btn === "") return <div key={i} />;
              if (btn === "back") {
                return (
                  <button
                    key={i}
                    onClick={handleBackspace}
                    className="aspect-square rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                  >
                    <Delete className="w-6 h-6" />
                  </button>
                );
              }
              return (
                <button
                  key={i}
                  onClick={() => handleNumpadClick(btn)}
                  disabled={isLoggingIn || !username}
                  className="aspect-square rounded-full bg-slate-50 text-slate-700 text-2xl font-semibold hover:bg-primary/10 hover:text-primary active:bg-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-sm border border-slate-100"
                >
                  {btn}
                </button>
              );
            })}
          </div>

          {isLoggingIn && (
            <div className="flex justify-center pt-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
