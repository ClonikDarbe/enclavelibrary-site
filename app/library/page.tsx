import Link from "next/link";
import { redirect } from "next/navigation";
import { accessToken, authHeaders, supabaseConfig } from "@/lib/enclave-auth";
import LibraryExplorer, { type LibraryGame } from "./LibraryExplorer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kütüphanem" };

type GamePayload = Omit<LibraryGame, "id" | "updatedAt">;
type SyncRow = { entity_id: string; payload: GamePayload; updated_at: string };

export default async function Library() {
  const token = await accessToken();
  if (!token) redirect("/login");
  const config = supabaseConfig();
  if (!config) redirect("/login?error=Giriş+servisi+yapılandırılmamış.");

  const [userResponse, gamesResponse] = await Promise.all([
    fetch(`${config.url}/auth/v1/user`, { headers: authHeaders(config.key, token), cache: "no-store" }),
    fetch(`${config.url}/rest/v1/enclave_sync_items?select=entity_id,payload,updated_at&entity_type=eq.game&deleted_at=is.null&order=updated_at.desc`, { headers: authHeaders(config.key, token), cache: "no-store" }),
  ]);
  if (userResponse.status === 401 || gamesResponse.status === 401) redirect("/api/auth/refresh?return_to=/library");
  if (!userResponse.ok || !gamesResponse.ok) redirect("/login?error=Kütüphane+şu+anda+açılamıyor.");

  const user = await userResponse.json() as { email?: string; user_metadata?: { username?: string } };
  const rows = await gamesResponse.json() as SyncRow[];
  const games = rows
    .map((row) => ({ id: row.entity_id, updatedAt: row.updated_at, ...row.payload }))
    .filter((game): game is LibraryGame => Boolean(game.title));
  const minutes = games.reduce((sum, game) => sum + (Number(game.playtimeMinutes) || 0), 0);
  const platforms = new Set(games.map((game) => game.platform).filter(Boolean)).size;
  const username = user.user_metadata?.username || user.email?.split("@")[0] || "Oyuncu";
  const latestSync = games[0]?.updatedAt;

  return <main className="library-shell">
    <header className="library-header">
      <Link className="brand" href="/"><span className="brand-mark">E</span><span><b>ENCLAVE</b><small>ORDER</small></span></Link>
      <div className="library-user"><span><b>{username}</b><small>{user.email}</small></span><form action="/api/auth/logout" method="post"><button type="submit">Çıkış</button></form></div>
    </header>
    <section className="library-hero">
      <div><p className="eyebrow"><span /> PLAYER ARCHIVE // ONLINE</p><h1>Kütüphanen.<br /><em>Her yerde.</em></h1><p>Salt okunur koleksiyonunda oyunlarını ara, platforma göre filtrele ve detaylarını güvenli web panelinden incele. Değişiklik ve çalıştırma işlemleri masaüstü uygulamasında kalır.</p></div>
      <div className="library-stats"><article><span>TOPLAM OYUN</span><strong>{games.length}</strong></article><article><span>PLATFORM</span><strong>{platforms}</strong></article><article><span>OYUN SÜRESİ</span><strong>{Math.round(minutes / 60)}<small>sa</small></strong></article></div>
    </section>
    <LibraryExplorer games={games} latestSync={latestSync} />
  </main>;
}
