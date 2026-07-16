import { NextResponse } from "next/server";
import { accessToken, authHeaders, supabaseConfig } from "@/lib/enclave-auth";

const USERNAME = /^[\p{L}\p{N}_.-]{3,24}$/u;

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 10_000_000) return redirectProfile("Görsel dosyaları çok büyük.", "error");
  const token = await accessToken();
  const config = supabaseConfig();
  if (!token || !config) return redirectProfile("Oturum gerekli.", "error");
  const form = await request.formData();
  const username = String(form.get("username") || "").trim();
  const bio = String(form.get("bio") || "").trim();
  let avatarUrl = String(form.get("currentAvatarUrl") || "").trim();
  let bannerUrl = String(form.get("currentBannerUrl") || "").trim();
  if (!USERNAME.test(username) || bio.length > 240 || !validOptionalUrl(avatarUrl) || !validOptionalUrl(bannerUrl)) return redirectProfile("Profil bilgilerini kontrol et.", "error");
  const avatarFile = asFile(form.get("avatarFile"));
  const bannerFile = asFile(form.get("bannerFile"));
  const avatarError = validateImage(avatarFile, 3_000_000);
  const bannerError = validateImage(bannerFile, 6_000_000);
  if (avatarError || bannerError) return redirectProfile(avatarError || bannerError || "Görsel geçersiz.", "error");
  if (avatarFile || bannerFile) {
    const userResponse = await fetch(`${config.url}/auth/v1/user`, { headers: authHeaders(config.key, token), cache: "no-store" });
    if (!userResponse.ok) return redirectProfile("Oturum doğrulanamadı.", "error");
    const user = await userResponse.json() as { id?: string };
    if (!user.id) return redirectProfile("Oturum doğrulanamadı.", "error");
    if (avatarFile) {
      const uploaded = await uploadImage(config, token, user.id, "avatar", avatarFile);
      if (!uploaded) return redirectProfile("Profil fotoğrafı yüklenemedi. Storage kurulumunu kontrol et.", "error");
      avatarUrl = uploaded;
    }
    if (bannerFile) {
      const uploaded = await uploadImage(config, token, user.id, "banner", bannerFile);
      if (!uploaded) return redirectProfile("Kapak görseli yüklenemedi. Storage kurulumunu kontrol et.", "error");
      bannerUrl = uploaded;
    }
  }
  const response = await fetch(`${config.url}/rest/v1/rpc/update_enclave_public_profile`, { method: "POST", headers: authHeaders(config.key, token), body: JSON.stringify({ new_username: username, new_bio: bio, new_avatar_url: avatarUrl, new_banner_url: bannerUrl, new_is_public: form.get("isPublic") === "on" }), cache: "no-store" });
  if (!response.ok) return redirectProfile(response.status === 404 ? "Profil sistemi henüz Supabase'e kurulmamış." : "Profil kaydedilemedi; kullanıcı adı kullanımda olabilir.", "error");
  return redirectProfile("Profilin güncellendi.", "message");
}

function validOptionalUrl(value: string) { if (!value) return true; try { return new URL(value).protocol === "https:"; } catch { return false; } }
function asFile(value: FormDataEntryValue | null) { return value instanceof File && value.size > 0 ? value : null; }
function validateImage(file: File | null, maxSize: number) {
  if (!file) return "";
  if (file.size > maxSize) return `Görsel en fazla ${Math.round(maxSize / 1_000_000)} MB olabilir.`;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Yalnızca JPG, PNG veya WEBP yükleyebilirsin.";
  return "";
}
async function uploadImage(config: { url: string; key: string }, token: string, userId: string, kind: "avatar" | "banner", file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validImageSignature(bytes, file.type)) return "";
  const path = `${encodeURIComponent(userId)}/${kind}`;
  const response = await fetch(`${config.url}/storage/v1/object/profile-media/${path}`, { method: "POST", headers: { apikey: config.key, Authorization: `Bearer ${token}`, "Content-Type": file.type, "x-upsert": "true", "Cache-Control": "3600" }, body: bytes, cache: "no-store" });
  if (!response.ok) return "";
  return `${config.url}/storage/v1/object/public/profile-media/${path}?v=${Date.now()}`;
}
function validImageSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}
function redirectProfile(message: string, key: string) { const url = new URL("/profile", "https://enclave.local"); url.searchParams.set(key, message); return new NextResponse(null, { status: 303, headers: { Location: `${url.pathname}${url.search}`, "Cache-Control": "no-store" } }); }
