import Link from "next/link";

export default function LegalPage({ eyebrow, title, updated = "16 Temmuz 2026", children }: { eyebrow: string; title: string; updated?: string; children: React.ReactNode }) {
  return <main className="legal-shell"><header className="profile-header"><Link className="brand" href="/"><span className="brand-mark">E</span><span><b>ENCLAVE</b><small>LEGAL</small></span></Link><nav><Link href="/privacy">Gizlilik</Link><Link href="/terms">Kullanım</Link><Link href="/contact">İletişim</Link></nav></header><article className="legal-document"><p className="eyebrow"><span /> {eyebrow}</p><h1>{title}</h1><small>Son güncelleme: {updated}</small><div>{children}</div></article></main>;
}
