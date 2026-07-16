import Link from "next/link";
import { turnstileSiteKey } from "@/lib/turnstile";
import Turnstile from "../Turnstile";

export const dynamic = "force-dynamic";
export const metadata = { title: "Üye ol" };

export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="auth-shell">
    <Link className="auth-brand" href="/"><span className="brand-mark">E</span><span><b>ENCLAVE</b><small>ORDER</small></span></Link>
    <section className="auth-card auth-card-compact">
      <p className="eyebrow"><span /> NEW PLAYER</p><h1>Aramıza<br /><em>katıl.</em></h1>
      <p className="auth-intro">Tek hesabınla Enclave uygulamasına ve güvenli web kütüphanene eriş.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <form action="/api/auth/signup" method="post">
        <label>Kullanıcı adı<input name="username" required autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_.-]{3,24}" placeholder="oyuncu_adi" /></label>
        <label>E-posta<input name="email" required type="email" autoComplete="email" maxLength={120} placeholder="oyuncu@eposta.com" /></label>
        <label>Parola<input name="password" required type="password" autoComplete="new-password" minLength={8} maxLength={128} placeholder="En az 8 karakter" /></label>
        <label>Parolayı tekrar et<input name="passwordConfirm" required type="password" autoComplete="new-password" minLength={8} maxLength={128} placeholder="Parolanı tekrar yaz" /></label>
        <label className="auth-honeypot" aria-hidden="true">Web sitesi<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <Turnstile siteKey={turnstileSiteKey()} />
        <button className="button primary" type="submit">Hesabımı oluştur <span>→</span></button>
      </form>
      <p className="auth-switch">Zaten hesabın var mı? <Link href="/login">Giriş yap</Link></p>
    </section>
    <aside className="auth-aside"><div className="auth-noise" /><p>ENCLAVE ID</p><strong>Tek hesap.<br />Tüm arşivin.<br /><em>Her yerde.</em></strong><small>Parolan Enclave sitesi tarafından saklanmaz. Hesap işlemleri şifreli bağlantıyla Supabase Auth üzerinde gerçekleştirilir.</small></aside>
  </main>;
}
