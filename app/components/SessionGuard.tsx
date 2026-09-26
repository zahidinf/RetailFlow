"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes default in ms
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"];
const THROTTLE_MS = 30 * 1000; // Throttle activity updates to 1 per 30 seconds

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [timeoutMs, setTimeoutMs] = useState<number>(DEFAULT_IDLE_TIMEOUT_MS);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(0);

  const isPublicRoute =
    pathname === "/login" || pathname === "/change-password" || pathname === "/about";

  // Fetch configured timeout from server
  useEffect(() => {
    if (isPublicRoute) return;

    fetch("/api/session-timeout")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.idleTimeoutMinutes && Number.isInteger(data.idleTimeoutMinutes)) {
          setTimeoutMs(data.idleTimeoutMinutes * 60 * 1000);
        }
      })
      .catch(() => {
        // Fallback to default
      });
  }, [isPublicRoute, pathname]);

  const handleExpired = useCallback(() => {
    if (isPublicRoute) return;
    // Session expired client-side — redirect to login with expired notice
    router.push("/login?expired=1");
    router.refresh();
  }, [router, isPublicRoute]);

  const resetTimer = useCallback(() => {
    if (isPublicRoute) return;

    const now = Date.now();
    // Throttle: only reset if enough time passed
    if (now - lastActivityRef.current < THROTTLE_MS) {
      return;
    }
    lastActivityRef.current = now;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(handleExpired, timeoutMs);
  }, [handleExpired, timeoutMs, isPublicRoute]);

  useEffect(() => {
    if (isPublicRoute) return;

    // Start timer with current timeoutMs
    timerRef.current = setTimeout(handleExpired, timeoutMs);

    // Listen for user activity
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [resetTimer, handleExpired, timeoutMs, isPublicRoute]);

  return <>{children}</>;
}
