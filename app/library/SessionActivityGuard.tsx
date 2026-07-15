"use client";

import { useEffect } from "react";

const TIMEOUT_MS = 15 * 60 * 1000;
const HEARTBEAT_MS = 30 * 1000;
const STORAGE_KEY = "enclave_last_activity";

export default function SessionActivityGuard() {
  useEffect(() => {
    let lastActivity = Date.now();
    let lastHeartbeat = 0;
    let lastStoredAt = 0;
    let signingOut = false;
    try {
      const stored = Number(window.localStorage.getItem(STORAGE_KEY));
      if (Number.isFinite(stored) && stored > 0) lastActivity = stored;
    } catch { /* Storage can be unavailable in hardened browsers. */ }

    const signOut = async () => {
      if (signingOut) return;
      signingOut = true;
      try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin", cache: "no-store" }).catch(() => null);
      window.location.replace("/login?message=15+dakika+hareketsizlik+nedeniyle+oturumun+kapat%C4%B1ld%C4%B1.");
    };

    const heartbeat = async () => {
      const response = await fetch("/api/auth/activity", { method: "POST", credentials: "same-origin", cache: "no-store" }).catch(() => null);
      if (!response || response.status === 401) await signOut();
    };

    const recordActivity = () => {
      if (signingOut) return;
      const now = Date.now();
      lastActivity = now;
      if (now - lastStoredAt >= 1_000) {
        lastStoredAt = now;
        try { window.localStorage.setItem(STORAGE_KEY, String(now)); } catch { /* noop */ }
      }
      if (now - lastHeartbeat >= HEARTBEAT_MS) {
        lastHeartbeat = now;
        void heartbeat();
      }
    };

    const checkTimeout = () => {
      if (Date.now() - lastActivity >= TIMEOUT_MS) void signOut();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActivity >= TIMEOUT_MS) void signOut();
      else recordActivity();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      const value = Number(event.newValue);
      if (Number.isFinite(value)) lastActivity = Math.max(lastActivity, value);
    };

    recordActivity();
    const events: Array<keyof WindowEventMap> = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"];
    for (const event of events) window.addEventListener(event, recordActivity, { passive: true });
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const timer = window.setInterval(checkTimeout, 5_000);
    return () => {
      window.clearInterval(timer);
      for (const event of events) window.removeEventListener(event, recordActivity);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
