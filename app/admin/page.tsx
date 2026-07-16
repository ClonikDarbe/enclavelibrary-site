import Link from "next/link";
import { redirect } from "next/navigation";
import { accessToken, authHeaders, needsMfaChallenge, supabaseConfig } from "@/lib/enclave-auth";
import SessionActivityGuard from "../library/SessionActivityGuard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Yönetim merkezi" };

type Dashboard = {
  totalUsers: number; activeSessions: number; profileCount: number; syncedUsers: number;
  totalGames: number; missingArtwork: number; lastSyncAt?: string;
  recentUsers: { id: string; email?: string; createdAt?: string; lastSignInAt?: string }[];
  announcements: { id: number; title: string; body: string; createdAt: string }[];
};
type Release = { tag_name?: string; html_url?: string; published_at?: string; assets?: { download_count?: number }[] };

export default async function Admin({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const token = await accessToken();
  const config = supabaseConfig();
  if (!token || !config) redirect("/login?return_to=/admin");
  const [dashboardResponse, userResponse] = await Promise.all([
    fetch(`${config.url}/rest/v1/rpc/admin_enclave_dashboard`, { method: "POST", headers: authHeaders(config.key, token), body: "{}", cache: "no-store" }).catch(() => null),
    fetch(`${config.url}/auth/v1/user`, { headers: authHeaders(config.key, token), cache: "no-store" }).catch(() => null),
  ]);
  if (dashboardResponse?.status === 401 || userResponse?.status === 401) redirect("/api/auth/refresh?return_to=/admin");
  if (userResponse?.ok) {
    const user = await userResponse.json() as { factors?: { status?: string; factor_type?: string }[] };
    if (needsMfaChallenge(user, token)) redirect("/security/mfa?return_to=/admin");
  }
  const denied = dashboardResponse?.status === 403;
  const setupPending = dashboardResponse?.status === 404 || dashboardResponse?.status === 400;
  const dashboard = dashboardResponse?.ok ? await dashboardResponse.json() as Dashboard : null;
  const releaseResponse = dashboard ? await fetch("https://api.github.com/repos/ClonikDarbe/EnclaveLibrary-Releases/releases/latest", { headers: { Accept: "application/vnd.github+json", "User-Agent": "Enclave-Order-Web" }, cache: "no-store" }).catch(() => null) : null;
  const release = releaseResponse?.ok ? await releaseResponse.json() as Release : null;
  const downloads = release?.assets?.reduce((sum, asset) => sum + (asset.download_count || 0), 0) || 0;
  const { error, message } = await searchParams;

  return <main className="admin-shell"><SessionActivityGuard />
    <header className="profile-header"><Link className="brand" href="/"><span className="brand-mark">E</span><span><b>ENCLAVE</b><small>CONTROL</small></span></Link><nav><Link href="/library">Kütüphane</Link><Link href="/profile">Profil</Link><form action="/api/auth/logout" method="post"><button>Çıkış</button></form></nav></header>
    <section className="admin-content"><p className="eyebrow"><span /> OWNER CONSOLE</p><h1>Yönetim<br /><em>merkezi.</em></h1>
      {denied && <div className="admin-notice"><b>Bu hesap yönetici değil.</b><p>Panel yalnızca enclave_admins tablosuna eklenen proje sahibine açıktır.</p></div>}
      {setupPending && <div className="admin-notice"><b>Yönetim sistemi kurulum bekliyor.</b><p>Supabase SQL Editor’da supabase/profile_admin.sql dosyasını bir kez çalıştır.</p></div>}
      {dashboard && <>
        <div className="admin-metrics"><Metric label="KULLANICI" value={dashboard.totalUsers} /><Metric label="AKTİF OTURUM" value={dashboard.activeSessions} /><Metric label="SENKRON KULLANICI" value={dashboard.syncedUsers} /><Metric label="TOPLAM OYUN" value={dashboard.totalGames} /><Metric label="EKSİK GÖRSEL" value={dashboard.missingArtwork} alert={dashboard.missingArtwork > 0} /><Metric label="İNDİRME" value={downloads} /></div>
        <div className="admin-grid">
          <section className="admin-panel"><div className="admin-panel-title"><div><p className="eyebrow"><span /> HESAPLAR</p><h2>Son kullanıcılar</h2></div><small>Son senkron: {formatDate(dashboard.lastSyncAt)}</small></div><div className="admin-user-list">{dashboard.recentUsers.map((user) => <article key={user.id}><span>{initials(user.email || "U")}</span><div><b>{user.email || "E-posta yok"}</b><small>Kayıt: {formatDate(user.createdAt)} • Son giriş: {formatDate(user.lastSignInAt)}</small></div></article>)}</div></section>
          <section className="admin-panel"><p className="eyebrow"><span /> DUYURU YAYINLA</p>{error && <p className="form-error">{error}</p>}{message && <p className="form-success">{message}</p>}<form className="admin-form" action="/api/admin/announcement" method="post"><label>Başlık<input name="title" required minLength={3} maxLength={80} /></label><label>Mesaj<textarea name="body" required minLength={3} maxLength={500} /></label><button className="button primary">Yayınla</button></form></section>
          <section className="admin-panel"><p className="eyebrow"><span /> YAYIN DURUMU</p><h2>{release?.tag_name || "Sürüm bulunamadı"}</h2><p className="admin-muted">Yayın: {formatDate(release?.published_at)} • Toplam varlık indirmesi: {downloads}</p>{release?.html_url && <a className="profile-share" href={release.html_url} rel="noreferrer">GitHub sürümünü aç ↗</a>}<div className="security-log-note"><b>Başarısız giriş kayıtları</b><p>Ham kimlik doğrulama olayları güvenlik nedeniyle Supabase Auth Logs ve Cloudflare Security Events içinde tutulur; bu panel parola veya erişim anahtarı göstermez.</p></div></section>
          <section className="admin-panel"><p className="eyebrow"><span /> DUYURU GEÇMİŞİ</p><div className="announcement-list">{dashboard.announcements.length ? dashboard.announcements.map((item) => <article key={item.id}><b>{item.title}</b><p>{item.body}</p><small>{formatDate(item.createdAt)}</small></article>) : <p className="admin-muted">Henüz duyuru yok.</p>}</div></section>
        </div>
      </>}
    </section>
  </main>;
}

function Metric({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) { return <article className={alert ? "alert" : ""}><span>{label}</span><b>{Number(value || 0).toLocaleString("tr-TR")}</b></article>; }
function initials(value: string) { return value.split(/[@.\s]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("tr") || "U"; }
function formatDate(value?: string) { if (!value) return "—"; try { return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); } catch { return "—"; } }
