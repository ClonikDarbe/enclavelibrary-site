"use client";

import { useEffect, useMemo, useState } from "react";

export type LibraryGame = {
  id: string;
  updatedAt: string;
  firstSeenAt: string;
  lastSeenAt: string;
  devicePresent: boolean;
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

type Props = { games: LibraryGame[]; latestSync?: string; setupPending?: boolean };
type Scope = "all" | "device" | "archive";

export default function LibraryExplorer({ games, latestSync, setupPending = false }: Props) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("Tümü");
  const [scope, setScope] = useState<Scope>("all");
  const [sort, setSort] = useState("title");
  const [selected, setSelected] = useState<LibraryGame | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translationLoading, setTranslationLoading] = useState(false);
  const deviceCount = games.filter((game) => game.devicePresent).length;
  const archiveCount = games.length - deviceCount;

  useEffect(() => {
    if (!selected?.summary || translations[selected.id]) {
      setTranslationLoading(false);
      return;
    }

    const controller = new AbortController();
    setTranslationLoading(true);
    void fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: selected.summary }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("translation_failed");
        return response.json() as Promise<{ translation?: string }>;
      })
      .then((payload) => {
        if (payload.translation) setTranslations((current) => ({ ...current, [selected.id]: payload.translation! }));
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") {
          setTranslations((current) => ({ ...current, [selected.id]: "Türkçe açıklama şu anda hazırlanamadı. Biraz sonra tekrar deneyebilirsin." }));
        }
      })
      .finally(() => setTranslationLoading(false));

    return () => controller.abort();
  }, [selected, translations]);

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
      .filter((game) => scope === "all" || (scope === "device" ? game.devicePresent : !game.devicePresent))
      .filter((game) => platform === "Tümü" || (game.platform || "Diğer") === platform)
      .filter((game) => !normalized || `${game.title} ${game.genre || ""} ${game.developer || ""}`.toLocaleLowerCase("tr").includes(normalized))
      .sort((a, b) => {
        if (sort === "playtime") return (Number(b.playtimeMinutes) || 0) - (Number(a.playtimeMinutes) || 0);
        if (sort === "recent") return Date.parse(b.lastPlayed || b.lastSeenAt) - Date.parse(a.lastPlayed || a.lastSeenAt);
        return a.title.localeCompare(b.title, "tr");
      });
  }, [games, platform, query, scope, sort]);

  return <section className="library-content">
    <div className="library-title">
      <div><p className="eyebrow"><span /> SENİN ARŞİVİN</p><h2>Oyun kasası</h2></div>
      <span>{games.length} oyun • {latestSync ? `${formatDate(latestSync)} senkronize` : "İlk eşitleme bekleniyor"}</span>
    </div>

    <div className="library-scope-tabs" aria-label="Arşiv durumu">
      <button className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}><span>TÜM ARŞİV</span><b>{games.length}</b></button>
      <button className={scope === "device" ? "active" : ""} onClick={() => setScope("device")}><span>UYGULAMADA</span><b>{deviceCount}</b></button>
      <button className={scope === "archive" ? "active" : ""} onClick={() => setScope("archive")}><span>ARŞİVDE</span><b>{archiveCount}</b></button>
    </div>

    <div className="library-toolbar" aria-label="Kütüphane araçları">
      <label className="library-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Oyun, tür veya stüdyo ara..." aria-label="Oyun ara" /></label>
      <label className="library-sort"><span>SIRALA</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="title">A–Z</option><option value="recent">Son oynanan</option><option value="playtime">Oynama süresi</option></select></label>
    </div>

    <div className="platform-tabs" role="tablist" aria-label="Platform filtresi">
      <button className={platform === "Tümü" ? "active" : ""} onClick={() => setPlatform("Tümü")} role="tab" aria-selected={platform === "Tümü"}><span>TÜMÜ</span><b>{games.length}</b></button>
      {platforms.map(([name, count]) => <button key={name} className={platform === name ? "active" : ""} onClick={() => setPlatform(name)} role="tab" aria-selected={platform === name}><span>{platformLabel(name)}</span><b>{count}</b></button>)}
    </div>

    <div className="library-result-row"><p><b>{visibleGames.length}</b> oyun gösteriliyor</p>{query || platform !== "Tümü" || scope !== "all" ? <button onClick={() => { setQuery(""); setPlatform("Tümü"); setScope("all"); }}>Filtreleri temizle</button> : null}</div>

    {setupPending ? <div className="empty-library setup-library"><span>◇</span><h3>Web arşivi kurulmayı bekliyor</h3><p>Yeni güvenli kütüphane tablosu kurulduktan ve masaüstü uygulaması ilk eşitlemeyi yaptıktan sonra oyunların burada görünecek.</p></div> : visibleGames.length ? <div className="game-grid">{visibleGames.map((game) => <button className={`game-card${game.devicePresent ? "" : " archived"}`} key={game.id} onClick={() => setSelected(game)}>
      <div className="game-art">
        <span className="game-art-fallback">{initials(game.title)}</span>
        {game.coverUrl ? <img src={game.coverUrl} alt={`${game.title} kapak görseli`} loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
        <div className="game-art-shade" />
        {game.logoUrl ? <img className="game-logo" src={game.logoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <strong>{game.title}</strong>}
        <small>{platformLabel(game.platform || "Enclave")}</small>{game.favorite && <b className="favorite-mark">★</b>}
      </div>
      <div className="game-info"><span className={`presence-badge ${game.devicePresent ? "device" : "archive"}`}>{game.devicePresent ? "UYGULAMADA" : "WEB ARŞİVİ"}</span><span>{game.genre || game.developer || "OYUN"}</span><h3>{game.title}</h3><div><small>{formatMinutes(game.playtimeMinutes)}</small><small>AÇIKLAMA VE DETAYLAR <i>↗</i></small></div></div>
    </button>)}</div> : <div className="empty-library"><span>⌁</span><h3>Bu filtrede oyun yok</h3><p>Masaüstü uygulamasını açıp ilk web kütüphanesi eşitlemesini yapabilir veya filtrelerini değiştirebilirsin.</p><button className="button primary" onClick={() => { setQuery(""); setPlatform("Tümü"); setScope("all"); }}>Tüm oyunları göster</button></div>}

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
          <p className="eyebrow"><span /> {platformLabel(selected.platform || "Enclave")} // {selected.devicePresent ? "UYGULAMADA" : "WEB ARŞİVİ"}</p>
          <h2>{selected.title}</h2>
          <p>{selected.summary ? (translationLoading ? "Türkçe açıklama hazırlanıyor…" : translations[selected.id] || "Türkçe açıklama hazırlanıyor…") : "Bu oyun için açıklama henüz masaüstü uygulamasından eşitlenmedi."}</p>
          <div className="game-detail-grid"><Detail label="TÜR" value={selected.genre || "—"} /><Detail label="GELİŞTİRİCİ" value={selected.developer || "—"} /><Detail label="OYUN SÜRESİ" value={formatMinutes(selected.playtimeMinutes)} /><Detail label="YAYIN TARİHİ" value={selected.releaseDate || "—"} /><Detail label="PUAN" value={selected.rating ? `${Number(selected.rating).toFixed(1)} / 5` : "—"} /><Detail label="İLK EKLENME" value={formatDate(selected.firstSeenAt)} /></div>
          <small className="read-only-note">Google Drive save sistemi bu arşivden tamamen ayrıdır.</small>
          <form className="web-archive-remove" action="/api/library/delete" method="post" onSubmit={(event) => { if (!window.confirm(`${selected.title} kütüphaneden kaldırılsın mı? Uygulamadaki kütüphane kaydı da otomatik kaldırılır; kurulu oyun dosyalarına ve save dosyalarına dokunulmaz.`)) event.preventDefault(); }}>
            <input type="hidden" name="gameKey" value={selected.id} />
            <button type="submit">Web arşivinden kaldır</button>
          </form>
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
