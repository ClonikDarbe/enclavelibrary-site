import Link from "next/link";
import { redirect } from "next/navigation";
import { accessToken, authHeaders, needsMfaChallenge, supabaseConfig } from "@/lib/enclave-auth";
import SessionActivityGuard from "../library/SessionActivityGuard";
import MfaManager from "./MfaManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hesap ve güvenlik" };

export default async function Security({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const token = await accessToken(); const config = supabaseConfig();
  if (!token || !config) redirect("/login?return_to=/security");
  const response = await fetch(`${config.url}/auth/v1/user`, { headers: authHeaders(config.key, token), cache: "no-store" });
  if (response.status === 401) redirect("/api/auth/refresh?return_to=/security");
  if (!response.ok) redirect("/login?return_to=/security");
  const user = await response.json() as { email?: string; created_at?: string; last_sign_in_at?: string; factors?: { id: string; status?: string; factor_type?: string }[] };
  if (needsMfaChallenge(user, token)) redirect("/security/mfa?return_to=/security");
  const verifiedFactor = user.factors?.find((factor) => factor.status === "verified" && factor.factor_type === "totp");
  const { error, message } = await searchParams;
  return <main className="settings-shell"><SessionActivityGuard /><header className="profile-header"><Link className="brand" href="/"><span className="brand-mark">E</span><span><b>ENCLAVE</b><small>SECURITY</small></span></Link><nav><Link href="/library">Kütüphane</Link><Link href="/profile">Profil</Link><form action="/api/auth/logout" method="post"><button>Çıkış</button></form></nav></header>
    <section className="settings-content"><p className="eyebrow"><span /> ACCOUNT CONTROL</p><h1>Hesap ve<br /><em>güvenlik.</em></h1>{error && <p className="form-error">{error}</p>}{message && <p className="form-success">{message}</p>}
      <div className="settings-grid">
        <section className="settings-card"><span className="settings-index">01</span><h2>Hesap bilgileri</h2><p>E-posta adresin kimlik doğrulama hesabına bağlıdır ve web panelinden değiştirilemez.</p><div className="settings-value"><span>E-POSTA</span><b>{user.email}</b></div><div className="settings-value"><span>SON GİRİŞ</span><b>{formatDate(user.last_sign_in_at)}</b></div></section>
        <section className="settings-card"><span className="settings-index">02</span><h2>İki aşamalı doğrulama</h2><p>Parolana ek olarak Authenticator uygulamasından tek kullanımlık kod ister.</p>{verifiedFactor ? <><div className="security-enabled"><b>2FA ETKİN</b><span>Authenticator hesabına bağlı.</span></div><form action="/api/auth/security/mfa/unenroll" method="post"><input type="hidden" name="factorId" value={verifiedFactor.id} /><button className="settings-link-button">2FA&apos;yı devre dışı bırak</button></form></> : <MfaManager />}</section>
        <section className="settings-card"><span className="settings-index">03</span><h2>Parolayı değiştir</h2><form className="settings-form" action="/api/account/password" method="post"><input name="currentPassword" type="password" required minLength={8} maxLength={128} autoComplete="current-password" placeholder="Mevcut parola" /><input name="newPassword" type="password" required minLength={10} maxLength={128} autoComplete="new-password" placeholder="Yeni parola (en az 10 karakter)" /><input name="confirmPassword" type="password" required minLength={10} maxLength={128} autoComplete="new-password" placeholder="Yeni parolayı tekrar et" /><button className="settings-action">Parolayı güncelle</button></form></section>
        <section className="settings-card"><span className="settings-index">04</span><h2>Oturumlar</h2><p>Bu tarayıcıdaki oturum 15 dakika işlem yapılmadığında kapanır. Diğer cihazlardaki tüm oturumları tek seferde sonlandırabilirsin.</p><div className="current-session"><i /> <div><b>Bu web oturumu</b><small>Aktif • {formatDate(user.last_sign_in_at)}</small></div></div><form action="/api/account/sessions" method="post"><button className="settings-action">Diğer oturumları kapat</button></form></section>
        <section className="settings-card"><span className="settings-index">05</span><h2>Veriler ve görseller</h2><p>Kütüphane ve profil verilerinin JSON kopyasını indirebilir veya yüklediğin profil görsellerini kaldırabilirsin.</p><a className="settings-action" href="/api/account/export">Verilerimi indir</a><div className="settings-inline-actions"><form action="/api/account/profile-media" method="post"><input type="hidden" name="kind" value="avatar" /><button>Profil fotoğrafını kaldır</button></form><form action="/api/account/profile-media" method="post"><input type="hidden" name="kind" value="banner" /><button>Kapak görselini kaldır</button></form></div></section>
        <section className="settings-card danger-card"><span className="settings-index">06</span><h2>Hesabı sil</h2><p>Profilin, web kütüphanen ve yüklediğin görseller kalıcı olarak silinir. Bu işlem geri alınamaz.</p><form className="settings-form" action="/api/account/delete" method="post"><input name="password" type="password" required minLength={8} maxLength={128} autoComplete="current-password" placeholder="Onaylamak için parolan" /><label className="danger-confirm"><input name="confirmation" type="checkbox" value="DELETE" required /><span>Hesabımın kalıcı olarak silineceğini anlıyorum.</span></label><button className="danger-action">Hesabımı kalıcı olarak sil</button></form></section>
      </div>
    </section>
  </main>;
}
function formatDate(value?: string) { if (!value) return "—"; try { return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); } catch { return "—"; } }
