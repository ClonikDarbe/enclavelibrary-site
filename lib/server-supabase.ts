import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, ACTIVITY_COOKIE, INACTIVITY_SECONDS, REFRESH_COOKIE, supabaseConfig } from "./enclave-auth";

export async function authenticatedSupabase() {
  const config = supabaseConfig();
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value || "";
  const refresh = store.get(REFRESH_COOKIE)?.value || "";
  if (!config || !access || !refresh || !store.get(ACTIVITY_COOKIE)?.value) return null;
  const client = createClient(config.url, config.key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
  const result = await client.auth.setSession({ access_token: access, refresh_token: refresh });
  if (result.error || !result.data.session) return null;
  return { client, session: result.data.session };
}

export function writeSessionCookies(response: Response, session: { access_token: string; refresh_token: string; expires_in?: number }, secure = true) {
  const headers = response.headers;
  const options = `HttpOnly; ${secure ? "Secure; " : ""}SameSite=Lax; Path=/`;
  headers.append("Set-Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(session.access_token)}; Max-Age=${Math.max(60, session.expires_in || 3600)}; ${options}`);
  headers.append("Set-Cookie", `${REFRESH_COOKIE}=${encodeURIComponent(session.refresh_token)}; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; ${secure ? "Secure; " : ""}SameSite=Strict; Path=/api/auth`);
  headers.append("Set-Cookie", `${ACTIVITY_COOKIE}=active; Max-Age=${INACTIVITY_SECONDS}; HttpOnly; ${secure ? "Secure; " : ""}SameSite=Strict; Path=/`);
}
