import Link from "next/link";
import { redirect } from "next/navigation";
import { accessToken, authHeaders, supabaseConfig } from "@/lib/enclave-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kütüphanem" };

type Game = { title?: string; platform?: string; genre?: string; summary?: string; developer?: string; publisher?: string; releaseDate?: string; playtimeMinutes?: number; lastPlayed?: string; favorite?: boolean; rating?: number; achievementsUnlocked?: number; achievementsTotal?: number };
type SyncRow = { entity_id: string; payload: Game; updated_at: string };

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
  const games = rows.map((row) => ({ id: row.entity_id, updatedAt: row.updated_at, ...row.payload })).filter((game) => game.title);
  const minutes = games.reduce((sum, game) => sum + (Number(game.playtimeMinutes) || 0), 0);
  const platforms = new Set(games.map((game) => game.platform).filter(Boolean)).size;
  const username = user.user_metadata?.username || user.email?.split("@")[0] || "Oyuncu";

  return <main className="library-shell">
    <header className="library-header">
      <Link className="brand" href="/"><span className="brand-mark">E</span><span><b>ENCLAVE</b><small>ORDER</small></span></Link>
      <div className="library-user"><span><b>{username}</b><small>{user.email}</small></span><form action="/api/auth/logout" method="post"><button type="submit">Çıkış</button></form></div>
    </header>
    <section className="library-hero">
      <div><p className="eyebrow"><span /> CLOUD LIBRARY</p><h1>Kütüphanen.<br /><em>Her yerde.</em></h1><p>Bu panel salt okunurdur. Oyun indirme, çalıştırma ve kütüphane değiştirme işlemleri yalnızca masaüstü uygulamasında yapılır.</p></div>
      <div className="library-stats"><article><span>TOPLAM OYUN</span><strong>{games.length}</strong></article><article><span>PLATFORM</span><strong>{platforms}</strong></article><article><span>OYUN SÜRESİ</span><strong>{Math.round(minutes / 60)}<small>sa</small></strong></article></div>
    </section>
    <section className="library-content">
      <div className="library-title"><div><p className="eyebrow"><span /> SENİN ARŞİVİN</p><h2>Tüm oyunlar</h2></div><span>{games.length} kayıt • Buluttan senkronize</span></div>
      {games.length ? <div className="game-grid">{games.map((game, index) => <article className="game-card" key={game.id}>
        <div className={`game-art tone-${index % 6}`}><span>{initials(game.title!)}</span><small>{game.platform || "Enclave"}</small>{game.favorite && <b>★</b>}</div>
        <div className="game-info"><span>{game.genre || game.platform || "Oyun"}</span><h3>{game.title}</h3><p>{game.summary || `${game.developer || ""} ${game.publisher || ""}`.trim() || "Oyun ayrıntıları masaüstü uygulamasından eşitlendi."}</p><div><small>{formatMinutes(game.playtimeMinutes)}</small>{game.rating ? <small>★ {Number(game.rating).toFixed(1)}</small> : null}</div></div>
      </article>)}</div> : <div className="empty-library"><span>⌁</span><h3>Bulutta henüz oyun yok</h3><p>Masaüstü uygulamasında Bulut Senkronizasyonu’nu açıp eşitleme yaptığında oyunların burada görünecek.</p><a className="button primary" href="https://github.com/EnclaveStudios/EnclaveLibraryNext/releases/latest">Uygulamayı aç / indir ↗</a></div>}
    </section>
  </main>;
}

function initials(title: string) { return title.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function formatMinutes(value?: number) { const minutes = Number(value) || 0; return minutes >= 60 ? `${Math.round(minutes / 60)} saat` : `${minutes} dk`; }
