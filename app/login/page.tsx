import Link from "next/link";
import { redirect } from "next/navigation";
import { accessToken } from "@/lib/enclave-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Güvenli giriş" };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await accessToken()) redirect("/library");
  const { error } = await searchParams;
  return <main className="auth-shell">
    <Link className="auth-brand" href="/"><span className="brand-mark">E</span><span><b>ENCLAVE</b><small>ORDER</small></span></Link>
    <section className="auth-card">
      <p className="eyebrow"><span /> SECURE ACCESS</p><h1>Hesabına<br /><em>geri dön.</em></h1>
      <p className="auth-intro">Uygulamada kullandığın Enclave hesabıyla giriş yap. Web paneli oyunlarını yalnızca görüntüler.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <form action="/api/auth/login" method="post">
        <input type="hidden" name="returnTo" value="/library" />
        <label>Kullanıcı adı veya e-posta<input name="identifier" required autoComplete="username" maxLength={120} placeholder="oyuncu@eposta.com" /></label>
        <label>Parola<input name="password" required type="password" autoComplete="current-password" minLength={8} maxLength={128} placeholder="••••••••••••" /></label>
        <button className="button primary" type="submit">Güvenli giriş <span>→</span></button>
      </form>
      <div className="auth-foot"><span>🔒 HttpOnly oturum</span><span>Salt okunur panel</span><span>RLS korumalı</span></div>
    </section>
    <aside className="auth-aside"><div className="auth-noise" /><p>ENCLAVE NETWORK</p><strong>Oyunların.<br />Düzenin.<br /><em>Her yerde.</em></strong><small>Kimlik doğrulama Supabase Auth üzerinden şifreli bağlantıyla yapılır. Parolan bu site tarafından kaydedilmez.</small></aside>
  </main>;
}
