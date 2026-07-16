import Link from "next/link";
import { redirect } from "next/navigation";
import { accessToken, authHeaders, supabaseConfig } from "@/lib/enclave-auth";
import SessionActivityGuard from "../library/SessionActivityGuard";
import CopyProfileUrl from "./CopyProfileUrl";
import ProfileMediaPicker from "./ProfileMediaPicker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Oyuncu profili" };

type ProfileRow = { username?: string; avatar_url?: string; banner_url?: string; bio?: string; is_public?: boolean };
type GameRow = { title: string; platform: string; cover_url?: string; playtime_minutes?: number; last_played?: string; favorite?: boolean };

export default async function Profile({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const token = await accessToken();
  const config = supabaseConfig();
  if (!token || !config) redirect("/login");
  const userResponse = await fetch(`${config.url}/auth/v1/user`, { headers: authHeaders(config.key, token), cache: "no-store" });
  if (userResponse.status === 401) redirect("/api/auth/refresh?return_to=/profile");
  if (!userResponse.ok) redirect("/login");
  const user = await userResponse.json() as { id: string; email?: string; user_metadata?: Record<string, unknown> };
  const [profileResponse, gamesResponse] = await Promise.all([
    fetch(`${config.url}/rest/v1/enclave_profiles?select=username,avatar_url,banner_url,bio,is_public&id=eq.${encodeURIComponent(user.id)}&limit=1`, { headers: authHeaders(config.key, token), cache: "no-store" }),
    fetch(`${config.url}/rest/v1/enclave_web_library?select=title,platform,cover_url,playtime_minutes,last_played,favorite&hidden_from_web=eq.false&order=playtime_minutes.desc`, { headers: authHeaders(config.key, token), cache: "no-store" }),
  ]);
  const rows = profileResponse.ok ? await profileResponse.json() as ProfileRow[] : [];
  const games = gamesResponse.ok ? await gamesResponse.json() as GameRow[] : [];
  const profile = rows[0];
  const fallbackName = String(user.user_metadata?.username || user.email?.split("@")[0] || "Oyuncu");
  const username = profile?.username || fallbackName;
  const avatar = safeHttps(profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture);
  const banner = safeHttps(profile?.banner_url);
  const minutes = games.reduce((sum, game) => sum + (Number(game.playtime_minutes) || 0), 0);
  const platforms = new Set(games.map((game) => game.platform).filter(Boolean)).size;
  const favorites = games.filter((game) => game.favorite).length;
  const recentGames = [...games].filter((game) => game.last_played).sort((a, b) => Date.parse(b.last_played || "") - Date.parse(a.last_played || "")).slice(0, 5);
  const { error, message } = await searchParams;
  const setupPending = !profileResponse.ok && profileResponse.status !== 200;

  return <main className="profile-shell">
    <SessionActivityGuard />
    <header className="profile-header"><Link className="brand" href="/"><span className="brand-mark">E</span><span><b>ENCLAVE</b><small>ORDER</small></span></Link><nav><Link href="/library">Kütüphane</Link><form action="/api/auth/logout" method="post"><button>Çıkış</button></form></nav></header>
    <section className="profile-hero" style={banner ? { backgroundImage: `linear-gradient(180deg,rgba(5,6,12,.12),#070810),url(${banner})` } : undefined}>
      <div className="profile-avatar">{avatar ? <img src={avatar} alt={`${username} profil resmi`} referrerPolicy="no-referrer" /> : initials(username)}</div>
      <div><p className="eyebrow"><span /> PLAYER PROFILE</p><h1>{username}</h1><p>{profile?.bio || "Kütüphanesini tek merkezde yöneten Enclave oyuncusu."}</p>{profile?.is_public ? <Link className="profile-share" href={`/u/${encodeURIComponent(username)}`}>Herkese açık profili görüntüle ↗</Link> : <span className="profile-private">GİZLİ PROFİL</span>}</div>
    </section>
    <section className="profile-body">
      <div className="profile-stat-grid"><article><span>OYUN</span><b>{games.length}</b></article><article><span>OYUN SÜRESİ</span><b>{Math.round(minutes / 60)}<small> sa</small></b></article><article><span>PLATFORM</span><b>{platforms}</b></article><article><span>FAVORİ</span><b>{favorites}</b></article></div>
      <CopyProfileUrl username={username} enabled={Boolean(profile?.is_public)} />
      <div className="profile-columns">
        <section className="profile-panel"><p className="eyebrow"><span /> PROFİL AYARLARI</p>{error && <p className="form-error">{error}</p>}{message && <p className="form-success">{message}</p>}{setupPending && <p className="form-error">Profil sistemi Supabase kurulumu bekliyor.</p>}
          <form action="/api/profile" method="post" encType="multipart/form-data">
            <ProfileMediaPicker avatar={avatar} banner={banner} username={username} />
            <label>Kullanıcı adı<input name="username" defaultValue={username} required minLength={3} maxLength={24} /></label>
            <label>Biyografi<textarea name="bio" defaultValue={profile?.bio || ""} maxLength={240} placeholder="Oyuncu profilinden biraz bahset…" /></label>
            <input name="currentAvatarUrl" type="hidden" value={profile?.avatar_url || ""} />
            <input name="currentBannerUrl" type="hidden" value={profile?.banner_url || ""} />
            <label className="profile-public-toggle"><input name="isPublic" type="checkbox" defaultChecked={Boolean(profile?.is_public)} /><span><b>Herkese açık profil</b><small>Paylaşım bağlantısına sahip kişiler oyun istatistiklerini görebilir.</small></span></label>
            <button className="button primary" disabled={setupPending}>Profili kaydet</button>
          </form>
        </section>
        <section className="profile-panel profile-games-panel"><div className="profile-panel-heading"><p className="eyebrow"><span /> EN ÇOK OYNANANLAR</p><small>OYUN SÜRESİNE GÖRE</small></div><div className="profile-game-list">{games.slice(0, 8).map((game, index) => <article key={`${game.platform}:${game.title}`}><b className="profile-game-rank">{String(index + 1).padStart(2, "0")}</b><img src={`/api/game-art?title=${encodeURIComponent(game.title)}&platform=${encodeURIComponent(game.platform)}`} alt="" referrerPolicy="no-referrer" /><div><b>{game.title}</b><small>{game.platform} • {formatMinutes(game.playtime_minutes)}</small></div></article>)}</div>{recentGames.length > 0 && <><p className="eyebrow profile-recent-heading"><span /> SON OYNANANLAR</p><div className="profile-recent-list">{recentGames.map((game) => <span key={`${game.platform}:${game.title}:recent`}><b>{game.title}</b><small>{formatDate(game.last_played)}</small></span>)}</div></>}</section>
      </div>
    </section>
  </main>;
}

function safeHttps(value: unknown) { if (typeof value !== "string") return ""; try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : ""; } catch { return ""; } }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("tr") || "O"; }
function formatMinutes(value?: number) { const minutes = Number(value) || 0; return minutes >= 60 ? `${Math.round(minutes / 6) / 10} saat` : `${minutes} dk`; }
function formatDate(value?: string) { if (!value) return "—"; try { return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value)); } catch { return "—"; } }
