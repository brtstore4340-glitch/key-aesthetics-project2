import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";

const TIMEOUT = 10 * 60 * 1000; // 10 minutes
const CHECK_INTERVAL = 1000; // 1 second

export function InactivityHandler() {
  const { user, logout } = useAuth();
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!user) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    
    // Updating a ref is very cheap, so we can do it on every event without throttling
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    // Check for inactivity periodically
    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current > TIMEOUT) {
        logout();
      }
    }, CHECK_INTERVAL);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
    };
  }, [user, logout]);

  return null;
}
