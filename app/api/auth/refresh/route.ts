import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, authHeaders, safeReturnTo, supabaseConfig } from "@/lib/enclave-auth";

export async function GET(request: Request) {
  const config = supabaseConfig();
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  const returnTo = safeReturnTo(new URL(request.url).searchParams.get("return_to"));
  if (!config || !refreshToken) return NextResponse.redirect(new URL("/login", request.url), 303);

  const tokenResponse = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST", headers: authHeaders(config.key), body: JSON.stringify({ refresh_token: refreshToken }), cache: "no-store",
  });
  const session = await tokenResponse.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
  if (!tokenResponse.ok || !session?.access_token || !session.refresh_token) {
    const failed = NextResponse.redirect(new URL("/login?error=Oturumun+süresi+doldu.", request.url), 303);
    failed.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 }); failed.cookies.set(REFRESH_COOKIE, "", { path: "/api/auth", maxAge: 0 });
    return failed;
  }
  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  const secure = new URL(request.url).protocol === "https:";
  response.cookies.set(ACCESS_COOKIE, session.access_token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: Math.max(60, session.expires_in ?? 3600) });
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, { httpOnly: true, secure, sameSite: "strict", path: "/api/auth", maxAge: 60 * 60 * 24 * 30 });
  return response;
}
