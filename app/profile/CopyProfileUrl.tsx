"use client";

import { useState } from "react";

export default function CopyProfileUrl({ username, enabled }: { username: string; enabled: boolean }) {
  const [copied, setCopied] = useState(false);
  const path = `/u/${encodeURIComponent(username)}`;
  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  if (!enabled) return null;
  return <button className="profile-copy-link" type="button" onClick={copy} aria-label="Herkese açık profil bağlantısını kopyala">
    {copied ? "Kopyalandı ✓" : "Bağlantıyı kopyala"}
  </button>;
}
