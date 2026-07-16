import { NextResponse } from "next/server";
import { ACCESS_COOKIE, ACTIVITY_COOKIE, REFRESH_COOKIE, accessToken, authHeaders, supabaseConfig } from "@/lib/enclave-auth";

export async function POST(request: Request) {
  const token = await accessToken(); const config = supabaseConfig();
  if (!token || !config) return redirectSettings("Oturum gerekli.", "error");
  const form = await request.formData();
  const currentPassword = String(form.get("currentPassword") || ""); const password = String(form.get("newPassword") || ""); const confirm = String(form.get("confirmPassword") || "");
  if (password.length < 10 || password.length > 128 || password !== confirm || password === currentPassword) return redirectSettings("Yeni parola en az 10 karakter olmalı ve doğru tekrarlanmalıdır.", "error");
  const userResponse = await fetch(`${config.url}/auth/v1/user`, { headers: authHeaders(config.key, token), cache: "no-store" });
  const user = userResponse.ok ? await userResponse.json() as { email?: string } : null;
  if (!user?.email) return redirectSettings("Oturum doğrulanamadı.", "error");
  const verify = await fetch(`${config.url}/auth/v1/token?grant_type=password`, { method: "POST", headers: authHeaders(config.key), body: JSON.stringify({ email: user.email, password: currentPassword }), cache: "no-store" });
  if (!verify.ok) return redirectSettings("Mevcut parola yanlış.", "error");
  const update = await fetch(`${config.url}/auth/v1/user`, { method: "PUT", headers: authHeaders(config.key, token), body: JSON.stringify({ password }), cache: "no-store" });
  if (!update.ok) return redirectSettings("Parola güncellenemedi. Daha güçlü bir parola dene.", "error");
  const response = NextResponse.redirect(new URL("/login?message=Parolan+güncellendi.+Yeni+parolanla+giriş+yap.", request.url), 303);
  clearAuth(response); return response;
}
function redirectSettings(message: string, key: string) { const url = new URL("/security", "https://enclave.local"); url.searchParams.set(key, message); return new NextResponse(null, { status: 303, headers: { Location: `${url.pathname}${url.search}`, "Cache-Control": "no-store" } }); }
function clearAuth(response: NextResponse) { response.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 }); response.cookies.set(REFRESH_COOKIE, "", { path: "/api/auth", maxAge: 0 }); response.cookies.set(ACTIVITY_COOKIE, "", { path: "/", maxAge: 0 }); }
