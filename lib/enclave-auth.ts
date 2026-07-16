import { cookies } from "next/headers";

export const ACCESS_COOKIE = "enclave_access";
export const REFRESH_COOKIE = "enclave_refresh";
export const ACTIVITY_COOKIE = "enclave_activity";
export const INACTIVITY_SECONDS = 15 * 60;

export function supabaseConfig() {
  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)?.trim();
  const key = (process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY)?.trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export async function accessToken() {
  const store = await cookies();
  if (!store.get(ACTIVITY_COOKIE)?.value) return "";
  return store.get(ACCESS_COOKIE)?.value ?? "";
}

export function authHeaders(key: string, token?: string) {
  return {
    apikey: key,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  };
}

export function safeReturnTo(value: string | null, fallback = "/library") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://enclave.local");
    return url.origin === "https://enclave.local" ? `${url.pathname}${url.search}` : fallback;
  } catch { return fallback; }
}

type MfaUser = { factors?: { status?: string; factor_type?: string }[] };

export function needsMfaChallenge(user: MfaUser, token: string) {
  const hasVerifiedTotp = user.factors?.some((factor) => factor.status === "verified" && factor.factor_type === "totp");
  if (!hasVerifiedTotp) return false;
  try {
    const payload = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!payload) return true;
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    return (JSON.parse(atob(padded)) as { aal?: string }).aal !== "aal2";
  } catch {
    return true;
  }
}
