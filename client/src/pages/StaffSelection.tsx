import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import FloatingParticles from "@/components/ui/FloatingParticles";
import UserGrid from "@/components/auth/UserGrid";
import PinPad from "@/components/auth/PinPad";

export default function StaffSelection() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pinError, setPinError] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["staff-users"],
    queryFn: () => base44.entities.User.list()
  });

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setPinError("");
  };

  const handlePinSubmit = async (pin) => {
    setIsVerifying(true);
    setPinError("");

    // Simulate verification delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (selectedUser.pin === pin) {
      // Store authenticated user in session
      sessionStorage.setItem("authenticated_user", JSON.stringify(selectedUser));
      
      // Redirect based on role
      const role = selectedUser.staff_role || "staff";
      if (role === "admin") {
        window.location.href = createPageUrl("AdminDashboard");
      } else if (role === "accounting") {
        window.location.href = createPageUrl("AccountingDashboard");
      } else {
        window.location.href = createPageUrl("StaffDashboard");
      }
    } else {
      setPinError("Incorrect PIN. Please try again.");
      setIsVerifying(false);
    }
  };

  const handleClosePinPad = () => {
    setSelectedUser(null);
    setPinError("");
  };

  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden">
      <FloatingParticles />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
        {/* Logo/Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-serif tracking-wider">
            <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
              JALOR
            </span>
          </h1>
          <p className="text-white/40 mt-3 tracking-[0.3em] uppercase text-sm">
            Fulfillment System
          </p>
        </motion.div>

        {/* Staff Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-4xl"
        >
          <div className="text-center mb-8">
            <h2 className="text-xl text-white/80 font-light tracking-wide">Select Your Profile</h2>
          </div>

          <UserGrid
            users={users}
            onSelectUser={handleSelectUser}
            isLoading={isLoading}
          />
        </motion.div>
      </div>

      {/* PIN Pad Modal */}
      <AnimatePresence>
        {selectedUser && (
          <PinPad
            user={selectedUser}
            onSubmit={handlePinSubmit}
            onClose={handleClosePinPad}
            isVerifying={isVerifying}
            error={pinError}
          />
        )}
      </AnimatePresence>
    </div>
  );
}