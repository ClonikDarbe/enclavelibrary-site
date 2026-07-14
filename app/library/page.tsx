import Link from "next/link";
import { redirect } from "next/navigation";
import { accessToken, authHeaders, supabaseConfig } from "@/lib/enclave-auth";
import LibraryExplorer, { type LibraryGame } from "./LibraryExplorer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kütüphanem" };

type WebLibraryRow = {
  game_key: string;
  title: string;
  platform: string;
  launcher: string;
  cover_url: string;
  banner_url: string;
  logo_url: string;
  genre: string;
  summary: string;
  developer: string;
  publisher: string;
  release_date: string;
  playtime_minutes: number;
  last_played: string;
  favorite: boolean;
  rating: number;
  achievements_unlocked: number;
  achievements_total: number;
  device_present: boolean;
  first_seen_at: string;
  last_seen_at: string;
  updated_at: string;
};

export default async function Library() {
  const token = await accessToken();
  if (!token) redirect("/login");
  const config = supabaseConfig();
  if (!config) redirect("/login?error=Giriş+servisi+yapılandırılmamış.");

  const fields = "game_key,title,platform,launcher,cover_url,banner_url,logo_url,genre,summary,developer,publisher,release_date,playtime_minutes,last_played,favorite,rating,achievements_unlocked,achievements_total,device_present,first_seen_at,last_seen_at,updated_at";
  const [userResponse, gamesResponse] = await Promise.all([
    fetch(`${config.url}/auth/v1/user`, { headers: authHeaders(config.key, token), cache: "no-store" }),
    fetch(`${config.url}/rest/v1/enclave_web_library?select=${fields}&hidden_from_web=eq.false&order=last_seen_at.desc`, { headers: authHeaders(config.key, token), cache: "no-store" }),
  ]);
  if (userResponse.status === 401 || gamesResponse.status === 401) redirect("/api/auth/refresh?return_to=/library");
  if (!userResponse.ok) redirect("/login?error=Oturum+doğrulanamadı.");

  const user = await userResponse.json() as { email?: string; user_metadata?: { username?: string } };
  const rows = gamesResponse.ok ? await gamesResponse.json() as WebLibraryRow[] : [];
  const setupPending = !gamesResponse.ok;
  const games: LibraryGame[] = rows.map((row) => ({
    id: row.game_key,
    updatedAt: row.updated_at,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    devicePresent: row.device_present,
    title: row.title,
    platform: row.platform,
    launcher: row.launcher,
    coverUrl: row.cover_url,
    bannerUrl: row.banner_url,
    logoUrl: row.logo_url,
    genre: row.genre,
    summary: row.summary,
    developer: row.developer,
    publisher: row.publisher,
    releaseDate: row.release_date,
    playtimeMinutes: row.playtime_minutes,
    lastPlayed: row.last_played,
    favorite: row.favorite,
    rating: row.rating,
    achievementsUnlocked: row.achievements_unlocked,
    achievementsTotal: row.achievements_total,
  }));
  const minutes = games.reduce((sum, game) => sum + (Number(game.playtimeMinutes) || 0), 0);
  const platforms = new Set(games.map((game) => game.platform).filter(Boolean)).size;
  const username = user.user_metadata?.username || user.email?.split("@")[0] || "Oyuncu";
  const latestSync = games[0]?.lastSeenAt;

  return <main className="library-shell">
    <header className="library-header">
      <Link className="brand" href="/"><span className="brand-mark">E</span><span><b>ENCLAVE</b><small>ORDER</small></span></Link>
      <div className="library-user"><span><b>{username}</b><small>{user.email}</small></span><form action="/api/auth/logout" method="post"><button type="submit">Çıkış</button></form></div>
    </header>
    <section className="library-hero">
      <div><p className="eyebrow"><span /> PLAYER ARCHIVE // ONLINE</p><h1>Kütüphanen.<br /><em>Her yerde.</em></h1><p>Salt okunur koleksiyonunda oyunlarını ara, platforma göre filtrele ve detaylarını güvenli web panelinden incele. Bilgisayardan kaldırılan oyunlar web arşivinde korunur.</p></div>
      <div className="library-stats"><article><span>TOPLAM OYUN</span><strong>{games.length}</strong></article><article><span>PLATFORM</span><strong>{platforms}</strong></article><article><span>OYUN SÜRESİ</span><strong>{Math.round(minutes / 60)}<small>sa</small></strong></article></div>
    </section>
    <LibraryExplorer games={games} latestSync={latestSync} setupPending={setupPending} />
  </main>;
}
