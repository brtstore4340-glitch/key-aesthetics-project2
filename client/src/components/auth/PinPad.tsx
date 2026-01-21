import { useState } from "react";
import { X, Delete, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function PinPad({ user, onSubmit, onClose, isVerifying, error }) {
  const [pin, setPin] = useState("");

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        onSubmit(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "delete"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-sm"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 left-0 p-2 text-white/60 hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        {/* Glass Container */}
        <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl p-8 overflow-hidden">
          {/* User Info */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border-2 border-amber-400/30 flex items-center justify-center mb-4 overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl text-amber-400">{user.full_name?.[0] || "?"}</span>
              )}
            </div>
            <h2 className="text-xl font-light text-white tracking-wide">{user.full_name || user.email}</h2>
            <p className="text-white/40 text-sm mt-1">Enter your PIN</p>
          </div>

          {/* PIN Display */}
          <div className="flex justify-center gap-4 mb-8">
            {[0, 1, 2, 3].map((index) => (
              <motion.div
                key={index}
                animate={{
                  scale: pin.length > index ? 1.1 : 1,
                  backgroundColor: pin.length > index ? "rgba(251, 191, 36, 0.3)" : "rgba(255, 255, 255, 0.1)"
                }}
                className={cn(
                  "w-4 h-4 rounded-full border-2 transition-all duration-200",
                  pin.length > index ? "border-amber-400 bg-amber-400/30" : "border-white/30 bg-white/10"
                )}
              />
            ))}
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-red-400 text-center text-sm mb-4"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3">
            {numbers.map((num, index) => (
              <div key={index} className="aspect-square">
                {num === null ? (
                  <div />
                ) : num === "delete" ? (
                  <button
                    onClick={handleDelete}
                    disabled={isVerifying || pin.length === 0}
                    className={cn(
                      "w-full h-full rounded-full flex items-center justify-center",
                      "bg-white/5 border border-white/10 backdrop-blur-xl",
                      "text-white/60 hover:text-white hover:bg-white/10",
                      "transition-all duration-200 active:scale-95",
                      "disabled:opacity-30 disabled:cursor-not-allowed"
                    )}
                  >
                    <Delete className="w-6 h-6" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleNumberClick(num)}
                    disabled={isVerifying || pin.length >= 4}
                    className={cn(
                      "w-full h-full rounded-full flex items-center justify-center",
                      "bg-gradient-to-b from-white/10 to-white/5 border border-white/20",
                      "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]",
                      "text-white text-2xl font-light",
                      "hover:from-white/20 hover:to-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]",
                      "transition-all duration-200 active:scale-95",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {num}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Loading Overlay */}
          {isVerifying && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-3xl">
              <div className="w-12 h-12 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
