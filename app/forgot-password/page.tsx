import Link from "next/link";
import { turnstileSiteKey } from "@/lib/turnstile";
import Turnstile from "../Turnstile";

export const dynamic = "force-dynamic";
export const metadata = { title: "Şifremi unuttum" };

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;
  return <main className="auth-shell">
    <Link className="auth-brand" href="/"><span className="brand-mark">E</span><span><b>ENCLAVE</b><small>ORDER</small></span></Link>
    <section className="auth-card">
      <p className="eyebrow"><span /> ACCOUNT RECOVERY</p><h1>Hesabını<br /><em>geri al.</em></h1>
      <p className="auth-intro">E-posta adresini yaz. Hesap varsa güvenli parola yenileme bağlantısını göndereceğiz.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-success" role="status">{message}</p>}
      <form action="/api/auth/forgot-password" method="post">
        <label>E-posta<input name="email" required type="email" autoComplete="email" maxLength={120} placeholder="oyuncu@eposta.com" /></label>
        <label className="auth-honeypot" aria-hidden="true">Web sitesi<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <Turnstile siteKey={turnstileSiteKey()} />
        <button className="button primary" type="submit">Sıfırlama bağlantısı gönder <span>→</span></button>
      </form>
      <p className="auth-switch"><Link href="/login">← Giriş ekranına dön</Link></p>
    </section>
    <aside className="auth-aside"><div className="auth-noise" /><p>SECURE RECOVERY</p><strong>Yeni şifre.<br />Aynı arşiv.<br /><em>Kayıp yok.</em></strong><small>Güvenlik nedeniyle bir e-posta adresinin sistemde kayıtlı olup olmadığını açıklamayız.</small></aside>
  </main>;
}
