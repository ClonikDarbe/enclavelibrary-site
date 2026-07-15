import { NextResponse } from "next/server";
import { accessToken, authHeaders, supabaseConfig } from "@/lib/enclave-auth";

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 8_192) return redirectAdmin("İstek çok büyük.", "error");
  const token = await accessToken();
  const config = supabaseConfig();
  if (!token || !config) return redirectAdmin("Oturum gerekli.", "error");
  const form = await request.formData();
  const title = String(form.get("title") || "").trim();
  const body = String(form.get("body") || "").trim();
  if (title.length < 3 || title.length > 80 || body.length < 3 || body.length > 500) return redirectAdmin("Duyuru uzunluğunu kontrol et.", "error");
  const response = await fetch(`${config.url}/rest/v1/rpc/admin_publish_enclave_announcement`, { method: "POST", headers: authHeaders(config.key, token), body: JSON.stringify({ announcement_title: title, announcement_body: body }), cache: "no-store" });
  if (!response.ok) return redirectAdmin("Duyuru yayınlanamadı. Yönetici yetkisini kontrol et.", "error");
  return redirectAdmin("Duyuru yayınlandı.", "message");
}

function redirectAdmin(message: string, key: string) { const url = new URL("/admin", "https://enclave.local"); url.searchParams.set(key, message); return new NextResponse(null, { status: 303, headers: { Location: `${url.pathname}${url.search}`, "Cache-Control": "no-store" } }); }
