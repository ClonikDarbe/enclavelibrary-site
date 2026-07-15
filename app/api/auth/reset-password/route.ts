import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "@/lib/enclave-auth";

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 12_288) return new NextResponse("İstek çok büyük.", { status: 413 });
  const config = supabaseConfig();
  if (!config) return redirectLogin("Parola servisi şu anda kullanılamıyor.", "error");
  const form = await request.formData();
  const accessToken = String(form.get("accessToken") || "");
  const password = String(form.get("password") || "");
  const passwordConfirm = String(form.get("passwordConfirm") || "");
  if (!accessToken || accessToken.length > 4096 || password.length < 8 || password.length > 128 || password !== passwordConfirm) return redirectLogin("Kurtarma bağlantısı geçersiz veya parolalar eşleşmiyor.", "error");
  const updateResponse = await fetch(`${config.url}/auth/v1/user`, { method: "PUT", headers: authHeaders(config.key, accessToken), body: JSON.stringify({ password }), cache: "no-store" });
  if (!updateResponse.ok) return redirectLogin("Kurtarma bağlantısının süresi dolmuş. Yeni bağlantı iste.", "error");
  return redirectLogin("Parolan yenilendi. Şimdi yeni parolanla giriş yapabilirsin.", "message");
}

function redirectLogin(message: string, key: string) {
  const url = new URL("/login", "https://enclave.local");
  url.searchParams.set(key, message);
  return new NextResponse(null, { status: 303, headers: { Location: `${url.pathname}${url.search}`, "Cache-Control": "no-store" } });
}
