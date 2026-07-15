import Link from "next/link";
import { notFound } from "next/navigation";
import { authHeaders, supabaseConfig } from "@/lib/enclave-auth";

export const dynamic = "force-dynamic";

type PublicGame = { title: string; platform: string; coverUrl?: string; bannerUrl?: string; playtimeMinutes?: number };
type PublicProfile = {
  profile: { username: string; avatarUrl?: string; bannerUrl?: string; bio?: string };
  stats: { games: number; minutes: number; platforms: number; favorites: number };
  games: PublicGame[];
};

export default async function PublicPlayerProfile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const config = supabaseConfig();
  if (!config) notFound();
  const response = await fetch(`${config.url}/rest/v1/rpc/get_public_enclave_profile`, {
    method: "POST",
    headers: authHeaders(config.key),
    body: JSON.stringify({ profile_username: decodeURIComponent(username) }),
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) notFound();
  const data = await response.json().catch(() => null) as PublicProfile | null;
  if (!data?.profile) notFound();
  const profile = data.profile;
  const avatar = safeHttps(profile.avatarUrl);
  const banner = safeHttps(profile.bannerUrl);

  return <main className="public-profile-shell">
    <header className="profile-header"><Link className="brand" href="/"><span className="brand-mark">E</span><span><b>ENCLAVE</b><small>ORDER</small></span></Link><nav><Link href="/login">Kendi hesabına gir</Link></nav></header>
    <section className="public-profile-hero" style={banner ? { backgroundImage: `linear-gradient(180deg,rgba(4,5,10,.15),#070810),url(${banner})` } : undefined}>
      <div className="profile-avatar">{avatar ? <img src={avatar} alt={`${profile.username} profil resmi`} referrerPolicy="no-referrer" /> : initials(profile.username)}</div>
      <div><p className="eyebrow"><span /> PUBLIC PLAYER PROFILE</p><h1>{profile.username}</h1><p>{profile.bio || "Enclave oyuncusu."}</p></div>
    </section>
    <section className="public-profile-content">
      <div className="profile-stat-grid"><article><span>OYUN</span><b>{data.stats.games}</b></article><article><span>OYUN SÜRESİ</span><b>{formatHours(data.stats.minutes)}</b></article><article><span>PLATFORM</span><b>{data.stats.platforms}</b></article><article><span>FAVORİ</span><b>{data.stats.favorites}</b></article></div>
      <div className="public-profile-title"><p className="eyebrow"><span /> VİTRİN</p><h2>En çok oynananlar</h2></div>
      <div className="public-game-grid">{data.games.map((game, index) => <article key={`${game.platform}:${game.title}:${index}`}>
        <div>{safeHttps(game.coverUrl || game.bannerUrl) ? <img src={safeHttps(game.coverUrl || game.bannerUrl)} alt="" referrerPolicy="no-referrer" /> : <span>{initials(game.title)}</span>}</div>
        <small>{game.platform}</small><h3>{game.title}</h3><p>{formatMinutes(game.playtimeMinutes)}</p>
      </article>)}</div>
    </section>
  </main>;
}

function safeHttps(value: unknown) { if (typeof value !== "string") return ""; try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : ""; } catch { return ""; } }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("tr") || "O"; }
function formatHours(value: number) { return `${Math.round((Number(value) || 0) / 60)} sa`; }
function formatMinutes(value?: number) { const minutes = Number(value) || 0; return minutes >= 60 ? `${Math.round(minutes / 6) / 10} saat` : `${minutes} dk`; }
