import { NextResponse } from "next/server";
import { accessToken, authHeaders, supabaseConfig } from "@/lib/enclave-auth";

export async function POST(request: Request) {
  const token = await accessToken(); const config = supabaseConfig();
  if (!token || !config) return redirect("Oturum gerekli.", "error");
  const form = await request.formData(); const kind = String(form.get("kind") || "");
  if (kind !== "avatar" && kind !== "banner") return redirect("Geçersiz görsel türü.", "error");
  const [userResponse, profileResponse] = await Promise.all([
    fetch(`${config.url}/auth/v1/user`, { headers: authHeaders(config.key, token), cache: "no-store" }),
    fetch(`${config.url}/rest/v1/enclave_profiles?select=username,avatar_url,banner_url,bio,is_public&limit=1`, { headers: authHeaders(config.key, token), cache: "no-store" }),
  ]);
  if (!userResponse.ok || !profileResponse.ok) return redirect("Profil okunamadı.", "error");
  const user = await userResponse.json() as { id?: string }; const profiles = await profileResponse.json() as { username: string; avatar_url?: string; banner_url?: string; bio?: string; is_public?: boolean }[]; const profile = profiles[0];
  if (!user.id || !profile) return redirect("Profil bulunamadı.", "error");
  await fetch(`${config.url}/storage/v1/object/profile-media/${encodeURIComponent(user.id)}/${kind}`, { method: "DELETE", headers: authHeaders(config.key, token), cache: "no-store" }).catch(() => null);
  const update = await fetch(`${config.url}/rest/v1/rpc/update_enclave_public_profile`, { method: "POST", headers: authHeaders(config.key, token), body: JSON.stringify({ new_username: profile.username, new_bio: profile.bio || "", new_avatar_url: kind === "avatar" ? "" : profile.avatar_url || "", new_banner_url: kind === "banner" ? "" : profile.banner_url || "", new_is_public: Boolean(profile.is_public) }), cache: "no-store" });
  return update.ok ? redirect("Profil görseli kaldırıldı.", "message") : redirect("Görsel kaldırılamadı.", "error");
}
function redirect(message: string, key: string) { const url = new URL("/security", "https://enclave.local"); url.searchParams.set(key, message); return new NextResponse(null, { status: 303, headers: { Location: `${url.pathname}${url.search}`, "Cache-Control": "no-store" } }); }
