import { NextResponse } from "next/server";
import { ACCESS_COOKIE, ACTIVITY_COOKIE, REFRESH_COOKIE, accessToken, authHeaders, supabaseConfig } from "@/lib/enclave-auth";

export async function POST(request: Request) {
  const token = await accessToken(); const config = supabaseConfig();
  if (!token || !config) return redirect("Oturum gerekli.", "error");
  const form = await request.formData(); const password = String(form.get("password") || "");
  if (form.get("confirmation") !== "DELETE" || password.length < 8) return redirect("Silme onayını ve parolanı kontrol et.", "error");
  const userResponse = await fetch(`${config.url}/auth/v1/user`, { headers: authHeaders(config.key, token), cache: "no-store" });
  const user = userResponse.ok ? await userResponse.json() as { id?: string; email?: string } : null;
  if (!user?.id || !user.email) return redirect("Oturum doğrulanamadı.", "error");
  const verified = await fetch(`${config.url}/auth/v1/token?grant_type=password`, { method: "POST", headers: authHeaders(config.key), body: JSON.stringify({ email: user.email, password }), cache: "no-store" });
  if (!verified.ok) return redirect("Parola yanlış.", "error");
  await Promise.all(["avatar", "banner"].map((kind) => fetch(`${config.url}/storage/v1/object/profile-media/${encodeURIComponent(user.id!)}/${kind}`, { method: "DELETE", headers: authHeaders(config.key, token), cache: "no-store" }).catch(() => null)));
  const deleted = await fetch(`${config.url}/rest/v1/rpc/delete_enclave_account`, { method: "POST", headers: authHeaders(config.key, token), body: "{}", cache: "no-store" });
  if (!deleted.ok) return redirect("Hesap silinemedi. Supabase kurulumunu kontrol et.", "error");
  const response = NextResponse.redirect(new URL("/?account_deleted=1", request.url), 303); clearAuth(response); return response;
}
function redirect(message: string, key: string) { const url = new URL("/security", "https://enclave.local"); url.searchParams.set(key, message); return new NextResponse(null, { status: 303, headers: { Location: `${url.pathname}${url.search}`, "Cache-Control": "no-store" } }); }
function clearAuth(response: NextResponse) { response.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 }); response.cookies.set(REFRESH_COOKIE, "", { path: "/api/auth", maxAge: 0 }); response.cookies.set(ACTIVITY_COOKIE, "", { path: "/", maxAge: 0 }); }
