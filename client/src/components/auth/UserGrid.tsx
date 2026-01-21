import { User } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

export default function UserGrid({ users, onSelectUser, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {[...Array(4)].map((_, i) => (
          <GlassCard key={i} className="p-6 animate-pulse">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/10" />
              <div className="h-4 w-24 bg-white/10 rounded" />
            </div>
          </GlassCard>
        ))}
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-white/60">No staff members found. Please contact an administrator.</p>
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {users.map((user) => (
        <GlassCard
          key={user.id}
          onClick={() => onSelectUser(user)}
          className="p-6 cursor-pointer group"
        >
          <div className="flex flex-col items-center gap-4">
            {/* Avatar */}
            <div className={cn(
              "w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden",
              "bg-gradient-to-br from-amber-400/20 to-amber-600/10",
              "border-2 border-white/10 group-hover:border-amber-400/30",
              "transition-all duration-300 group-hover:scale-105",
              "flex items-center justify-center"
            )}>
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-amber-400/60" />
              )}
            </div>

            {/* Name */}
            <div className="text-center">
              <h3 className="text-white font-medium tracking-wide group-hover:text-amber-200 transition-colors">
                {user.full_name || user.email}
              </h3>
              <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">
                {user.staff_role || "Staff"}
              </p>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
