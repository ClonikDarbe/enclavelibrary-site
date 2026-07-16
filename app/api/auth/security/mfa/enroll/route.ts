import { authenticatedSupabase } from "@/lib/server-supabase";

export async function POST() {
  const auth = await authenticatedSupabase();
  if (!auth) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const result = await auth.client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Enclave Authenticator" });
  if (result.error) return Response.json({ error: "2FA kurulumu başlatılamadı." }, { status: 400 });
  return Response.json({ factorId: result.data.id, qrCode: result.data.totp.qr_code, secret: result.data.totp.secret }, { headers: { "Cache-Control": "no-store" } });
}
