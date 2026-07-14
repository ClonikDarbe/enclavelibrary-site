"use client";

import { useMemo, useState } from "react";

export type LibraryGame = {
  id: string;
  updatedAt: string;
  title: string;
  platform?: string;
  launcher?: string;
  coverUrl?: string;
  bannerUrl?: string;
  logoUrl?: string;
  genre?: string;
  summary?: string;
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  playtimeMinutes?: number;
  lastPlayed?: string;
  favorite?: boolean;
  rating?: number;
  achievementsUnlocked?: number;
  achievementsTotal?: number;
};

type Props = { games: LibraryGame[]; latestSync?: string };

export default function LibraryExplorer({ games, latestSync }: Props) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("Tümü");
  const [sort, setSort] = useState("title");
  const [selected, setSelected] = useState<LibraryGame | null>(null);

  const platforms = useMemo(() => {
    const counts = new Map<string, number>();
    for (const game of games) {
      const name = game.platform || "Diğer";
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "tr"));
  }, [games]);

  const visibleGames = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr");
    return games
      .filter((game) => platform === "Tümü" || (game.platform || "Diğer") === platform)
      .filter((game) => !normalized || `${game.title} ${game.genre || ""} ${game.developer || ""}`.toLocaleLowerCase("tr").includes(normalized))
      .sort((a, b) => {
        if (sort === "playtime") return (Number(b.playtimeMinutes) || 0) - (Number(a.playtimeMinutes) || 0);
        if (sort === "recent") return Date.parse(b.lastPlayed || b.updatedAt) - Date.parse(a.lastPlayed || a.updatedAt);
        return a.title.localeCompare(b.title, "tr");
      });
  }, [games, platform, query, sort]);

  return <section className="library-content">
    <div className="library-title">
      <div><p className="eyebrow"><span /> SENİN ARŞİVİN</p><h2>Oyun kasası</h2></div>
      <span>{games.length} oyun • {latestSync ? `${formatDate(latestSync)} senkronize` : "Bulut bağlantısı aktif"}</span>
    </div>

    <div className="library-toolbar" aria-label="Kütüphane araçları">
      <label className="library-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Oyun, tür veya stüdyo ara..." aria-label="Oyun ara" /></label>
      <label className="library-sort"><span>SIRALA</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="title">A–Z</option><option value="recent">Son oynanan</option><option value="playtime">Oynama süresi</option></select></label>
    </div>

    <div className="platform-tabs" role="tablist" aria-label="Platform filtresi">
      <button className={platform === "Tümü" ? "active" : ""} onClick={() => setPlatform("Tümü")} role="tab" aria-selected={platform === "Tümü"}><span>TÜMÜ</span><b>{games.length}</b></button>
      {platforms.map(([name, count]) => <button key={name} className={platform === name ? "active" : ""} onClick={() => setPlatform(name)} role="tab" aria-selected={platform === name}><span>{platformLabel(name)}</span><b>{count}</b></button>)}
    </div>

    <div className="library-result-row"><p><b>{visibleGames.length}</b> oyun gösteriliyor</p>{query || platform !== "Tümü" ? <button onClick={() => { setQuery(""); setPlatform("Tümü"); }}>Filtreleri temizle</button> : null}</div>

    {visibleGames.length ? <div className="game-grid">{visibleGames.map((game) => <button className="game-card" key={game.id} onClick={() => setSelected(game)}>
      <div className="game-art">
        <span className="game-art-fallback">{initials(game.title)}</span>
        {game.coverUrl ? <img src={game.coverUrl} alt={`${game.title} kapak görseli`} loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
        <div className="game-art-shade" />
        {game.logoUrl ? <img className="game-logo" src={game.logoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <strong>{game.title}</strong>}
        <small>{platformLabel(game.platform || "Enclave")}</small>{game.favorite && <b className="favorite-mark">★</b>}
      </div>
      <div className="game-info"><span>{game.genre || game.developer || "OYUN"}</span><h3>{game.title}</h3><p>{game.summary || `${game.developer || ""} ${game.publisher || ""}`.trim() || "Detayları görmek için kartı aç."}</p><div><small>{formatMinutes(game.playtimeMinutes)}</small><small>DETAYLAR <i>↗</i></small></div></div>
    </button>)}</div> : <div className="empty-library"><span>⌁</span><h3>Bu filtrede oyun yok</h3><p>Arama kelimeni veya seçili platformu değiştirerek tekrar deneyebilirsin.</p><button className="button primary" onClick={() => { setQuery(""); setPlatform("Tümü"); }}>Tüm oyunları göster</button></div>}

    {selected ? <div className="game-modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
      <article className="game-modal" role="dialog" aria-modal="true" aria-label={`${selected.title} detayları`} onMouseDown={(event) => event.stopPropagation()}>
        <button className="game-modal-close" onClick={() => setSelected(null)} aria-label="Detayları kapat">×</button>
        <div className="game-modal-visual">
          <span>{initials(selected.title)}</span>
          {selected.bannerUrl || selected.coverUrl ? <img src={selected.bannerUrl || selected.coverUrl} alt="" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
          <div />
          {selected.logoUrl ? <img className="game-modal-logo" src={selected.logoUrl} alt={selected.title} referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <h3>{selected.title}</h3>}
        </div>
        <div className="game-modal-body">
          <p className="eyebrow"><span /> {platformLabel(selected.platform || "Enclave")}</p>
          <h2>{selected.title}</h2>
          <p>{selected.summary || "Bu oyun için açıklama henüz masaüstü uygulamasından eşitlenmedi."}</p>
          <div className="game-detail-grid"><Detail label="TÜR" value={selected.genre || "—"} /><Detail label="GELİŞTİRİCİ" value={selected.developer || "—"} /><Detail label="OYUN SÜRESİ" value={formatMinutes(selected.playtimeMinutes)} /><Detail label="YAYIN TARİHİ" value={selected.releaseDate || "—"} /><Detail label="PUAN" value={selected.rating ? `${Number(selected.rating).toFixed(1)} / 5` : "—"} /><Detail label="BAŞARIM" value={selected.achievementsTotal ? `${selected.achievementsUnlocked || 0} / ${selected.achievementsTotal}` : "—"} /></div>
          <small className="read-only-note">SALT OKUNUR • Oynamak ve düzenlemek için masaüstü uygulamasını kullan.</small>
        </div>
      </article>
    </div> : null}
  </section>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><b>{value}</b></div>; }
function initials(title: string) { return title.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function formatMinutes(value?: number) { const minutes = Number(value) || 0; return minutes >= 60 ? `${Math.round(minutes / 6) / 10} saat` : `${minutes} dk`; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Buluttan" : new Intl.DateTimeFormat("tr", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date); }
function platformLabel(value: string) {
  const labels: Record<string, string> = { "Epic Games": "EPIC", "GOG Galaxy": "GOG", "Ubisoft Connect": "UBISOFT", "Rockstar Games": "ROCKSTAR", "Riot Games": "RIOT", "Amazon Games": "AMAZON", "Harici Oyunlar": "HARİCİ" };
  return labels[value] || value.toLocaleUpperCase("tr");
}
