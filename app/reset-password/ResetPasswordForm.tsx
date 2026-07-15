"use client";

import { useEffect, useState } from "react";

export default function ResetPasswordForm() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("type") === "recovery" ? params.get("access_token") || "" : "";
    setToken(accessToken);
    setReady(true);
    if (window.location.hash) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, []);

  if (!ready) return <p className="form-success">Kurtarma bağlantısı doğrulanıyor…</p>;
  if (!token) return <p className="form-error" role="alert">Bu kurtarma bağlantısı geçersiz veya süresi dolmuş. Şifremi unuttum ekranından yeni bağlantı iste.</p>;

  return <form action="/api/auth/reset-password" method="post">
    <input type="hidden" name="accessToken" value={token} />
    <label>Yeni parola<input name="password" required type="password" autoComplete="new-password" minLength={8} maxLength={128} placeholder="En az 8 karakter" /></label>
    <label>Yeni parolayı tekrar et<input name="passwordConfirm" required type="password" autoComplete="new-password" minLength={8} maxLength={128} placeholder="Parolanı tekrar yaz" /></label>
    <button className="button primary" type="submit">Parolamı yenile <span>→</span></button>
  </form>;
}
