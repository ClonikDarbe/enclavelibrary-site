import Link from "next/link";
import { redirect } from "next/navigation";
import { accessToken, authHeaders, safeReturnTo, supabaseConfig } from "@/lib/enclave-auth";
import MfaManager from "../MfaManager";

export const dynamic = "force-dynamic";
export default async function MfaChallenge({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const token = await accessToken(); const config = supabaseConfig(); const query = await searchParams;
  if (!token || !config) redirect("/login");
  const response = await fetch(`${config.url}/auth/v1/user`, { headers: authHeaders(config.key, token), cache: "no-store" });
  if (!response.ok) redirect("/login");
  const user = await response.json() as { factors?: { id: string; status?: string; factor_type?: string }[] };
  const factor = user.factors?.find((item) => item.status === "verified" && item.factor_type === "totp");
  if (!factor) redirect(safeReturnTo(query.return_to || "/security"));
  return <main className="mfa-shell"><Link className="auth-brand" href="/"><span className="brand-mark">E</span><span><b>ENCLAVE</b><small>VERIFY</small></span></Link><MfaManager verifiedFactorId={factor.id} challengeMode returnTo={safeReturnTo(query.return_to || "/library")} /></main>;
}
