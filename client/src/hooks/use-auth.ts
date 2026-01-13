import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type LoginInput } from "@/lib/schema";
import { authenticateUser, getCurrentUser, logoutUser } from "@/lib/mock-data";
import { useLocation } from "wouter";

export function useAuth() {
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => getCurrentUser(),
    retry: false,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginInput) => {
      return authenticateUser(credentials.username, credentials.pin);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["auth-user"], data);
      setLocation("/");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      logoutUser();
    },
    onSuccess: () => {
      queryClient.setQueryData(["auth-user"], null);
      setLocation("/login");
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
