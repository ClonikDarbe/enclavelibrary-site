"use client";

import { useEffect } from "react";

export default function RecoveryRedirect() {
  useEffect(() => {
    if (window.location.pathname === "/reset-password") return;
    const fragment = window.location.hash.replace(/^#/, "");
    if (!fragment) return;
    const params = new URLSearchParams(fragment);
    if (params.get("type") !== "recovery" || !params.get("access_token")) return;
    window.location.replace(`/reset-password#${fragment}`);
  }, []);

  return null;
}
