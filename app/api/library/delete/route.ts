import { NextResponse } from "next/server";
import { accessToken, authHeaders, supabaseConfig } from "@/lib/enclave-auth";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  if (request.headers.get("origin") !== requestUrl.origin) return new NextResponse("Geçersiz istek.", { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 4_096) return new NextResponse("İstek çok büyük.", { status: 413 });

  const token = await accessToken();
  const config = supabaseConfig();
  if (!token || !config) return redirect("/login");

  const form = await request.formData();
  const gameKey = String(form.get("gameKey") || "").trim();
  if (!gameKey || gameKey.length > 180) return redirect("/library?error=invalid_game");

  const response = await fetch(`${config.url}/rest/v1/rpc/remove_enclave_web_library`, {
    method: "POST",
    headers: authHeaders(config.key, token),
    body: JSON.stringify({ target_game_key: gameKey }),
    cache: "no-store",
  });
  if (response.status === 401) return redirect("/api/auth/refresh?return_to=/library");
  if (!response.ok) return redirect("/library?error=remove_failed");
  return redirect("/library?removed=1");
}

function redirect(location: string) {
  return new NextResponse(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });
}
