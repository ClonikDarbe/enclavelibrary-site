import { authenticatedSupabase, writeSessionCookies } from "@/lib/server-supabase";
import { safeReturnTo } from "@/lib/enclave-auth";

export async function POST(request: Request) {
  const auth = await authenticatedSupabase();
  if (!auth) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const body = await request.json().catch(() => null) as { factorId?: string; code?: string; returnTo?: string } | null;
  if (!body?.factorId || !/^[0-9]{6}$/.test(body.code || "")) return Response.json({ error: "Kod geçersiz." }, { status: 400 });
  const challenge = await auth.client.auth.mfa.challenge({ factorId: body.factorId });
  if (challenge.error) return Response.json({ error: "Doğrulama başlatılamadı." }, { status: 400 });
  const verified = await auth.client.auth.mfa.verify({ factorId: body.factorId, challengeId: challenge.data.id, code: body.code || "" });
  if (verified.error || !verified.data.session) return Response.json({ error: "Kod yanlış veya süresi dolmuş." }, { status: 400 });
  const returnTo = safeReturnTo(body.returnTo || "/security", "/security");
  const response = Response.json({ ok: true, returnTo }, { headers: { "Cache-Control": "no-store" } });
  writeSessionCookies(response, verified.data.session, new URL(request.url).protocol === "https:");
  return response;
}
