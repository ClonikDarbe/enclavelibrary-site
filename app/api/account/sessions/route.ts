import { NextResponse } from "next/server";
import { accessToken, authHeaders, supabaseConfig } from "@/lib/enclave-auth";

export async function POST() {
  const token = await accessToken(); const config = supabaseConfig();
  if (!token || !config) return redirect("Oturum gerekli.", "error");
  const response = await fetch(`${config.url}/auth/v1/logout?scope=others`, { method: "POST", headers: authHeaders(config.key, token), cache: "no-store" });
  return response.ok ? redirect("Diğer cihazlardaki oturumlar kapatıldı.", "message") : redirect("Diğer oturumlar kapatılamadı.", "error");
}
function redirect(message: string, key: string) { const url = new URL("/security", "https://enclave.local"); url.searchParams.set(key, message); return new NextResponse(null, { status: 303, headers: { Location: `${url.pathname}${url.search}`, "Cache-Control": "no-store" } }); }
