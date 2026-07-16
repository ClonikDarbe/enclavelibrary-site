"use client";

import { useState } from "react";

type Enrollment = { factorId: string; qrCode: string; secret: string };

export default function MfaManager({ verifiedFactorId = "", challengeMode = false, returnTo = "/security" }: { verifiedFactorId?: string; challengeMode?: boolean; returnTo?: string }) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function enroll() {
    setBusy(true); setError("");
    const response = await fetch("/api/auth/security/mfa/enroll", { method: "POST" });
    const data = await response.json().catch(() => null);
    if (!response.ok) setError(data?.error || "Kurulum başlatılamadı."); else setEnrollment(data);
    setBusy(false);
  }

  async function verify() {
    const factorId = challengeMode ? verifiedFactorId : enrollment?.factorId;
    if (!factorId || !/^\d{6}$/.test(code)) { setError("6 haneli kodu kontrol et."); return; }
    setBusy(true); setError("");
    const response = await fetch("/api/auth/security/mfa/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ factorId, code, returnTo }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) { setError(data?.error || "Kod doğrulanamadı."); setBusy(false); return; }
    window.location.assign(data.returnTo || returnTo);
  }

  if (challengeMode) return <section className="mfa-challenge-card"><p className="eyebrow"><span /> TWO-FACTOR CHECK</p><h1>Güvenlik<br /><em>kodu.</em></h1><p>Authenticator uygulamandaki 6 haneli kodu gir.</p>{error && <p className="form-error">{error}</p>}<input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" /><button className="button primary" onClick={verify} disabled={busy}>{busy ? "Doğrulanıyor…" : "Doğrula"}</button></section>;

  return <div className="mfa-manager">{error && <p className="form-error">{error}</p>}{!enrollment ? <button className="settings-action" type="button" onClick={enroll} disabled={busy}>{busy ? "Hazırlanıyor…" : "Authenticator ile 2FA kur"}</button> : <div className="mfa-enrollment"><img src={enrollment.qrCode} alt="Authenticator QR kodu" /><div><b>QR kodunu tara</b><p>Google Authenticator, Microsoft Authenticator veya benzeri bir uygulamayla tara.</p><code>{enrollment.secret}</code><input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6 haneli kod" /><button className="button primary" type="button" onClick={verify} disabled={busy}>2FA&apos;yı etkinleştir</button></div></div>}</div>;
}
