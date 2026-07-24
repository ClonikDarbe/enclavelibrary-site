import type { Metadata } from "next";
import { Space_Grotesk, Syne } from "next/font/google";
import "./globals.css";
import RecoveryRedirect from "./RecoveryRedirect";

const body = Space_Grotesk({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const display = Syne({ variable: "--font-display", subsets: ["latin"], display: "swap" });
const productionOrigin = "https://enclavelibrary.com";

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(productionOrigin),
    applicationName: "Enclave Library",
    title: { default: "Enclave Library — Oyun Arşivin Tek Merkezde", template: "%s — Enclave Library" },
    description: "Enclave Library ile Steam, Epic Games, GOG, Xbox ve diğer platformlardaki oyunlarını tek kütüphanede birleştir, güvenle eşitle ve web'den görüntüle.",
    keywords: ["Enclave Library", "oyun kütüphanesi", "oyun arşivi", "Steam kütüphanesi", "Epic Games kütüphanesi", "oyun launcher"],
    authors: [{ name: "Enclave Studios", url: productionOrigin }],
    creator: "Enclave Studios",
    publisher: "Enclave Studios",
    category: "gaming",
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Enclave Library — Oyun Arşivin Tek Merkezde",
      description: "Tüm oyun platformlarını tek, güvenli ve hızlı kütüphanede birleştir.",
      type: "website",
      siteName: "Enclave Library",
      locale: "tr_TR",
      url: productionOrigin,
      images: [{ url: `${productionOrigin}/og.png`, width: 1200, height: 630, alt: "Enclave Library — Oyun arşivin tek merkezde" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Enclave Library — Oyun Arşivin Tek Merkezde",
      description: "Tüm oyun platformlarını tek, güvenli ve hızlı kütüphanede birleştir.",
      images: [`${productionOrigin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body className={`${body.variable} ${display.variable}`}><RecoveryRedirect />{children}</body></html>;
}
