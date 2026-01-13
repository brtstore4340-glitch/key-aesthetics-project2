import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { FirebaseError } from "firebase/app";
import { onAuthChange, signInWithPin, signOutUser, loadUserProfile } from "@/services/auth";
import type { UserProfile } from "@/types/models";

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [_, setLocation] = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const profile = await loadUserProfile(firebaseUser.uid);
        setUser(profile);
      } catch (err) {
        setError(err as Error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = useCallback(
    async ({ username, pin }: { username: string; pin: string }) => {
      setIsLoggingIn(true);
      try {
        await signInWithPin(username, pin);
        setLocation("/");
      } catch (err) {
        if (err instanceof FirebaseError) {
          throw new Error("Invalid username or PIN");
        }
        throw err;
      } finally {
        setIsLoggingIn(false);
      }
    },
    [setLocation],
  );

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await signOutUser();
      setLocation("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }, [setLocation]);

  return {
    user,
    isLoading,
    error,
    login,
    logout,
    isLoggingIn,
    isLoggingOut,
  };
}
