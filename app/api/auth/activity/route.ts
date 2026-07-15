import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE, ACTIVITY_COOKIE, INACTIVITY_SECONDS } from "@/lib/enclave-auth";

export async function POST(request: Request) {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  const active = store.get(ACTIVITY_COOKIE)?.value;
  if (!accessToken || !active) return new NextResponse("Oturum gerekli.", { status: 401, headers: { "Cache-Control": "no-store" } });
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(ACTIVITY_COOKIE, "active", {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: INACTIVITY_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
