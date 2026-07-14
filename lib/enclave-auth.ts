import { cookies } from "next/headers";

export const ACCESS_COOKIE = "enclave_access";
export const REFRESH_COOKIE = "enclave_refresh";

export function supabaseConfig() {
  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)?.trim();
  const key = (process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY)?.trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export async function accessToken() {
  return (await cookies()).get(ACCESS_COOKIE)?.value ?? "";
}

export function authHeaders(key: string, token?: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${token || key}`,
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
