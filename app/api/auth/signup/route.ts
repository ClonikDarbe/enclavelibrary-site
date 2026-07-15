import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, authHeaders, supabaseConfig } from "@/lib/enclave-auth";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME = /^[A-Za-z0-9_.-]{3,24}$/;

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 12_288) return new NextResponse("İstek çok büyük.", { status: 413 });
  const config = supabaseConfig();
  if (!config) return redirectSignup("Üyelik servisi şu anda kullanılamıyor.");
  const form = await request.formData();
  if (String(form.get("website") || "")) return redirectSuccess();
  const username = String(form.get("username") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const passwordConfirm = String(form.get("passwordConfirm") || "");
  if (!USERNAME.test(username) || !EMAIL.test(email) || password.length < 8 || password.length > 128 || password !== passwordConfirm) return redirectSignup("Bilgilerini ve parolaların eşleştiğini kontrol et.");

  const signupResponse = await fetch(`${config.url}/auth/v1/signup`, { method: "POST", headers: authHeaders(config.key), body: JSON.stringify({ email, password, data: { username } }), cache: "no-store" });
  const payload = await signupResponse.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
  if (!signupResponse.ok) return redirectSignup("Hesap oluşturulamadı. Bu e-posta veya kullanıcı adı kullanılıyor olabilir.");
  if (payload?.access_token && payload.refresh_token) {
    const response = NextResponse.redirect(new URL("/library", request.url), 303);
    const secure = new URL(request.url).protocol === "https:";
    response.cookies.set(ACCESS_COOKIE, payload.access_token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: Math.max(60, payload.expires_in ?? 3600) });
    response.cookies.set(REFRESH_COOKIE, payload.refresh_token, { httpOnly: true, secure, sameSite: "strict", path: "/api/auth", maxAge: 60 * 60 * 24 * 30 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  return redirectSuccess();
}

function redirectSignup(message: string) { return redirectWithMessage("/signup", "error", message); }
function redirectSuccess() { return redirectWithMessage("/login", "message", "Hesabın oluşturuldu. E-postana gelen doğrulama bağlantısından sonra giriş yapabilirsin."); }
function redirectWithMessage(path: string, key: string, message: string) {
  const url = new URL(path, "https://enclave.local");
  url.searchParams.set(key, message);
  return new NextResponse(null, { status: 303, headers: { Location: `${url.pathname}${url.search}`, "Cache-Control": "no-store" } });
}
