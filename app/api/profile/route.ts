import { NextResponse } from "next/server";
import { accessToken, authHeaders, supabaseConfig } from "@/lib/enclave-auth";

const USERNAME = /^[\p{L}\p{N}_.-]{3,24}$/u;

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 16_384) return new NextResponse("İstek çok büyük.", { status: 413 });
  const token = await accessToken();
  const config = supabaseConfig();
  if (!token || !config) return redirectProfile("Oturum gerekli.", "error");
  const form = await request.formData();
  const username = String(form.get("username") || "").trim();
  const bio = String(form.get("bio") || "").trim();
  const avatarUrl = String(form.get("avatarUrl") || "").trim();
  const bannerUrl = String(form.get("bannerUrl") || "").trim();
  if (!USERNAME.test(username) || bio.length > 240 || !validOptionalUrl(avatarUrl) || !validOptionalUrl(bannerUrl)) return redirectProfile("Profil bilgilerini kontrol et.", "error");
  const response = await fetch(`${config.url}/rest/v1/rpc/update_enclave_public_profile`, { method: "POST", headers: authHeaders(config.key, token), body: JSON.stringify({ new_username: username, new_bio: bio, new_avatar_url: avatarUrl, new_banner_url: bannerUrl, new_is_public: form.get("isPublic") === "on" }), cache: "no-store" });
  if (!response.ok) return redirectProfile(response.status === 404 ? "Profil sistemi henüz Supabase'e kurulmamış." : "Profil kaydedilemedi; kullanıcı adı kullanımda olabilir.", "error");
  return redirectProfile("Profilin güncellendi.", "message");
}

function validOptionalUrl(value: string) { if (!value) return true; try { return new URL(value).protocol === "https:"; } catch { return false; } }
function redirectProfile(message: string, key: string) { const url = new URL("/profile", "https://enclave.local"); url.searchParams.set(key, message); return new NextResponse(null, { status: 303, headers: { Location: `${url.pathname}${url.search}`, "Cache-Control": "no-store" } }); }
