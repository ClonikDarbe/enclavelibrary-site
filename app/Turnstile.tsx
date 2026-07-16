export default function Turnstile({ siteKey }: { siteKey: string }) {
  if (!siteKey) return null;
  return <><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer /><div className="cf-turnstile" data-sitekey={siteKey} data-theme="dark" data-language="tr" /></>;
}
