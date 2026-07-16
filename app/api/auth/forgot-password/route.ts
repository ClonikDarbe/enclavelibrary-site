import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "@/lib/enclave-auth";
import { verifyTurnstile } from "@/lib/turnstile";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_MESSAGE = "Hesap varsa parola yenileme bağlantısı e-posta adresine gönderildi.";

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 8_192) return new NextResponse("İstek çok büyük.", { status: 413 });
  const config = supabaseConfig();
  if (!config) return redirectMessage("error", "Kurtarma servisi şu anda kullanılamıyor.");
  const form = await request.formData();
  if (String(form.get("website") || "")) return redirectMessage("message", GENERIC_MESSAGE);
  if (!await verifyTurnstile(request, form)) return redirectMessage("error", "Güvenlik doğrulaması başarısız. Tekrar dene.");
  const email = String(form.get("email") || "").trim().toLowerCase();
  if (!EMAIL.test(email)) return redirectMessage("error", "Geçerli bir e-posta adresi yaz.");
  await fetch(`${config.url}/auth/v1/recover`, { method: "POST", headers: authHeaders(config.key), body: JSON.stringify({ email, redirect_to: "https://enclavelibrary.com/reset-password" }), cache: "no-store" }).catch(() => null);
  return redirectMessage("message", GENERIC_MESSAGE);
}

function redirectMessage(key: string, message: string) {
  const url = new URL("/forgot-password", "https://enclave.local");
  url.searchParams.set(key, message);
  return new NextResponse(null, { status: 303, headers: { Location: `${url.pathname}${url.search}`, "Cache-Control": "no-store" } });
}
