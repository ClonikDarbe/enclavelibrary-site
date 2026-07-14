import type { Metadata } from "next";
import { headers } from "next/headers";
import { Space_Grotesk, Syne } from "next/font/google";
import "./globals.css";

const body = Space_Grotesk({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const display = Syne({ variable: "--font-display", subsets: ["latin"], display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: { default: "Enclave Order — Oyun Arşivin. Tek Merkez.", template: "%s — Enclave Order" },
    description: "Tüm oyun kütüphaneni birleştir, güvenle eşitle ve web'den görüntüle.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title: "Enclave Order", description: "Oyun arşivin. Tek merkez.", type: "website", url: origin, images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "Enclave Order — Oyun arşivin. Tek merkez." }] },
    twitter: { card: "summary_large_image", title: "Enclave Order", description: "Oyun arşivin. Tek merkez.", images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body className={`${body.variable} ${display.variable}`}>{children}</body></html>;
}
