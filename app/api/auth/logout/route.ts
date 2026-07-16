import { NextResponse } from "next/server";
import { ACCESS_COOKIE, ACTIVITY_COOKIE, REFRESH_COOKIE, authHeaders, supabaseConfig } from "@/lib/enclave-auth";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ACCESS_COOKIE}=([^;]+)`))?.[1];
  const config = supabaseConfig();
  if (token && config) {
    await fetch(`${config.url}/auth/v1/logout?scope=local`, {
      method: "POST",
      headers: authHeaders(config.key, decodeURIComponent(token)),
      cache: "no-store",
    }).catch(() => null);
  }
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(ACCESS_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, path: "/api/auth", maxAge: 0 });
  response.cookies.set(ACTIVITY_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
