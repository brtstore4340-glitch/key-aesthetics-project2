import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { authService, type AuthUser } from "@/lib/services/authService";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [_, setLocation] = useLocation();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginMutation = useMutation({
    mutationFn: async ({ username, pin }: { username: string; pin: string }) => {
      return authService.loginWithPin({ username, pin });
    },
    onSuccess: (data) => {
      setUser(data);
      setError(null);
      setLocation("/");
    },
    onError: (err: Error) => {
      setError(err);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await authService.logout();
    },
    onSuccess: () => {
      setUser(null);
      setLocation("/login");
    },
    onError: (err: Error) => {
      setError(err);
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
