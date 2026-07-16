export function turnstileSiteKey() { return (process.env.TURNSTILE_SITE_KEY || "").trim(); }

export async function verifyTurnstile(request: Request, form: FormData) {
  const secret = (process.env.TURNSTILE_SECRET_KEY || "").trim();
  if (!secret) return true;
  const token = String(form.get("cf-turnstile-response") || "");
  if (!token || token.length > 2048) return false;
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token, remoteip: request.headers.get("cf-connecting-ip") || undefined }),
    cache: "no-store",
  }).catch(() => null);
  const result = response?.ok ? await response.json().catch(() => null) as { success?: boolean } | null : null;
  return result?.success === true;
}
