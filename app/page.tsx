import Link from "next/link";

const releaseUrl = "/download/windows";
const releaseRepositoryUrl = "https://github.com/ClonikDarbe/EnclaveLibrary-Releases";

function Mark() {
  return <span className="brand-mark" aria-hidden="true">E</span>;
}

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Enclave Order ana sayfa">
          <Mark />
          <span><b>ENCLAVE</b><small>ORDER</small></span>
        </Link>
        <nav aria-label="Ana menü">
          <a href="#features">Özellikler</a>
          <a href="#security">Güvenlik</a>
          <Link className="nav-login" href="/login">Hesabına gir</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow"><span /> ENCLAVE 2.0 // CLOUD ONLINE</p>
          <h1>Oyun dünyan.<br /><em>Tek bir evren.</em></h1>
          <p className="hero-lead">Launcher kalabalığını sustur. Steam’den Epic’e, GOG’dan Xbox’a tüm koleksiyonunu tek bir hızlı ve güvenli oyuncu merkezinde topla.</p>
          <div className="hero-actions">
            <a className="button primary" href={releaseUrl}>Şimdi indir <span>↓</span></a>
            <Link className="button ghost" href="/login">Kütüphanemi görüntüle</Link>
          </div>
          <div className="trust-row">
            <span><i>◆</i> 8+ platform</span><span><i>◆</i> Salt okunur web</span><span><i>◆</i> Güvenli cloud sync</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="Enclave Order oyuncu merkezi vitrini">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="vault-card">
            <div className="vault-top"><span>ENCLAVE // PLAYER HUB</span><b>ONLINE</b></div>
            <div className="vault-content">
              <p>KÜTÜPHANE</p><strong>247</strong><small>oyun • tek evren</small>
              <div className="platform-stack"><span>ST</span><span>EP</span><span>GO</span><span>XB</span><i>+5</i></div>
            </div>
            <div className="vault-footer"><span>ZERO-LAG CLOUD LINK</span><b>SYNCED</b></div>
          </div>
          <div className="signal-card signal-a"><span>SON OYNANAN</span><b>Counter-Strike 2</b><small>128 saat</small></div>
          <div className="signal-card signal-b"><span>CLOUD STATUS</span><b>Senkronize</b><small>14 sn önce</small></div>
        </div>
      </section>

      <section className="ticker" aria-label="Desteklenen platformlar">
        <span>STEAM</span><i>◆</i><span>EPIC GAMES</span><i>◆</i><span>GOG</span><i>◆</i><span>XBOX</span><i>◆</i><span>UBISOFT</span><i>◆</i><span>EA APP</span>
      </section>

      <section className="feature-section" id="features">
        <div className="section-heading">
          <p className="eyebrow"><span /> TEK UYGULAMA. TAM KONTROL.</p>
          <h2>Launcher kalabalığını sil.<br /><em>Oyuna gir.</em></h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card feature-main">
            <span className="feature-no">01</span><div className="icon-box">⌁</div>
            <h3>Birleşik kütüphane</h3><p>Farklı platformlardaki oyunlarını otomatik tara, düzenle ve tek koleksiyonda gör.</p>
            <div className="mini-library"><span /><span /><span /><span /></div>
          </article>
          <article className="feature-card"><span className="feature-no">02</span><div className="icon-box">◈</div><h3>Bulutla eşitlenir</h3><p>Koleksiyonun ve oyun bilgilerin cihazların arasında hesabına özel olarak güncel kalır.</p></article>
          <article className="feature-card"><span className="feature-no">03</span><div className="icon-box">◎</div><h3>Web’den göz at</h3><p>Giriş yaptığında oyunlarını ve detaylarını her yerden gör. Web panelinde indirme veya çalıştırma yoktur.</p></article>
        </div>
      </section>

      <section className="security-section" id="security">
        <div className="security-copy">
          <p className="eyebrow light"><span /> GÜVENLİK, EKLENTİ DEĞİL TEMELDİR.</p>
          <h2>Verin değil,<br /><em>oyunların görünür.</em></h2>
          <p>Web paneli salt okunur tasarlandı. Parolalar Enclave sunucularında tutulmaz; oturumlar güvenli HttpOnly çerezlerle korunur ve her oyuncu yalnızca kendi kayıtlarına erişebilir.</p>
          <ul><li><b>RLS</b> Kullanıcı bazlı veri izolasyonu</li><li><b>EDGE</b> Cloudflare DDoS filtreleme</li><li><b>ZERO WRITE</b> Web kütüphanesinde veri değiştirme yok</li></ul>
        </div>
        <div className="shield" aria-hidden="true"><div><Mark /><span>ENCLAVE<br />SECURE ACCESS</span><b>PROTECTED</b></div></div>
      </section>

      <section className="cta-section">
        <p className="eyebrow"><span /> SİSTEM HAZIR</p><h2>Sıradaki oyun<br />seni bekliyor.</h2><p>Enclave Order’ı indir veya güvenli web panelinden koleksiyonuna göz at.</p>
        <div className="hero-actions centered"><a className="button primary" href={releaseUrl}>Son sürümü indir <span>↓</span></a><Link className="button dark" href="/login">Web hesabına gir</Link></div>
      </section>

      <footer><Link className="brand" href="/"><Mark /><span><b>ENCLAVE</b><small>ORDER</small></span></Link><p>© 2026 Enclave Studios. Oyunların, senin evrenin.</p><div><a href="#security">Güvenlik</a><a href={releaseRepositoryUrl} rel="noreferrer">GitHub</a></div></footer>
    </main>
  );
}
