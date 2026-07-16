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
  return <div className="profile-url-card">
    <div><span>KİŞİSEL PROFİL ADRESİN</span><b>enclavelibrary.com{path}</b><small>{enabled ? "Profilin herkese açık." : "Bağlantının çalışması için herkese açık profili etkinleştir."}</small></div>
    <button type="button" onClick={copy}>{copied ? "Kopyalandı ✓" : "Bağlantıyı kopyala"}</button>
  </div>;
}
