import { NextResponse } from "next/server";
import { authenticatedSupabase } from "@/lib/server-supabase";

export async function POST(request: Request) {
  const auth = await authenticatedSupabase();
  if (!auth) return redirect("Oturum gerekli.", "error");
  const form = await request.formData(); const factorId = String(form.get("factorId") || "");
  if (!/^[0-9a-f-]{36}$/i.test(factorId)) return redirect("Güvenlik faktörü geçersiz.", "error");
  const result = await auth.client.auth.mfa.unenroll({ factorId });
  return result.error ? redirect("2FA'yı kapatmak için yeniden giriş yapıp güvenlik kodunu doğrula.", "error") : redirect("İki aşamalı doğrulama kapatıldı.", "message");
}
function redirect(message: string, key: string) { const url = new URL("/security", "https://enclave.local"); url.searchParams.set(key, message); return new NextResponse(null, { status: 303, headers: { Location: `${url.pathname}${url.search}`, "Cache-Control": "no-store" } }); }
