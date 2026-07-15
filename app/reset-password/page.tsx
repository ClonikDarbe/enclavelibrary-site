import Link from "next/link";
import ResetPasswordForm from "./ResetPasswordForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Yeni parola" };

export default function ResetPassword() {
  return <main className="auth-shell">
    <Link className="auth-brand" href="/"><span className="brand-mark">E</span><span><b>ENCLAVE</b><small>ORDER</small></span></Link>
    <section className="auth-card">
      <p className="eyebrow"><span /> NEW PASSWORD</p><h1>Yeni bir<br /><em>parola seç.</em></h1>
      <p className="auth-intro">Güçlü ve başka sitelerde kullanmadığın bir parola belirle.</p>
      <ResetPasswordForm />
      <p className="auth-switch"><Link href="/login">← Giriş ekranına dön</Link></p>
    </section>
    <aside className="auth-aside"><div className="auth-noise" /><p>ENCRYPTED RESET</p><strong>Güvenli.<br />Hızlı.<br /><em>Kontrol sende.</em></strong><small>Kurtarma bağlantısı tek kullanımlıktır ve kısa süre sonra geçerliliğini kaybeder.</small></aside>
  </main>;
}
