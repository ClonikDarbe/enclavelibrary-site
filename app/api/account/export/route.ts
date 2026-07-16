import { accessToken, authHeaders, supabaseConfig } from "@/lib/enclave-auth";

export async function GET() {
  const token = await accessToken(); const config = supabaseConfig();
  if (!token || !config) return new Response("Oturum gerekli.", { status: 401 });
  const [userResponse, profileResponse, gamesResponse] = await Promise.all([
    fetch(`${config.url}/auth/v1/user`, { headers: authHeaders(config.key, token), cache: "no-store" }),
    fetch(`${config.url}/rest/v1/enclave_profiles?select=username,avatar_url,banner_url,bio,is_public,updated_at`, { headers: authHeaders(config.key, token), cache: "no-store" }),
    fetch(`${config.url}/rest/v1/enclave_web_library?select=game_key,title,platform,launcher,genre,developer,publisher,release_date,playtime_minutes,last_played,favorite,rating,achievements_unlocked,achievements_total,device_present,first_seen_at,last_seen_at,updated_at&order=title`, { headers: authHeaders(config.key, token), cache: "no-store" }),
  ]);
  if (!userResponse.ok || !profileResponse.ok || !gamesResponse.ok) return new Response("Veriler hazırlanamadı.", { status: 502 });
  const user = await userResponse.json() as { id?: string; email?: string; created_at?: string; last_sign_in_at?: string };
  const payload = { exportedAt: new Date().toISOString(), account: { id: user.id, email: user.email, createdAt: user.created_at, lastSignInAt: user.last_sign_in_at }, profile: await profileResponse.json(), library: await gamesResponse.json() };
  return Response.json(payload, { headers: { "Content-Disposition": `attachment; filename="enclave-data-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } });
}
