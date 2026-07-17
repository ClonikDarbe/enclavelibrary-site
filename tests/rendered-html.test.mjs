import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html", host: "localhost" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the Enclave Order landing page with security headers", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.match(response.headers.get("content-security-policy") ?? "", /img-src 'self' data: blob: https:/);

  const html = await response.text();
  assert.match(html, /Enclave Order/i);
  assert.match(html, /\/download\/windows/);
  assert.match(html, /Oyun arşivin/i);
  assert.match(html, /Kütüphanemi görüntüle/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps authentication server-side and the library read-only", async () => {
  const [loginRoute, authHelper, libraryPage, libraryExplorer, homePage, wrangler] = await Promise.all([
    readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/enclave-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/library/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/library/LibraryExplorer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
  ]);
  assert.match(loginRoute, /httpOnly:\s*true/);
  assert.match(loginRoute, /sameSite:\s*"strict"/);
  assert.match(authHelper, /SUPABASE_PUBLISHABLE_KEY/);
  assert.match(libraryPage, /enclave_web_library/);
  assert.match(libraryPage, /salt okunur/i);
  assert.match(libraryExplorer, /\/api\/game-art\?title=/);
  assert.match(homePage, /\/auth\/v1\/user/);
  assert.match(homePage, /className="nav-account"/);
  assert.match(homePage, /profileInitials/);
  assert.match(homePage, /safeAvatarUrl/);
  assert.doesNotMatch(libraryPage, /insert\(|update\(|delete\(/i);
  assert.match(wrangler, /"name":\s*"enclave-order"/);
});

test("returns admin sign-ins to the admin console", async () => {
  const [loginPage, loginRoute, adminPage] = await Promise.all([
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(adminPage, /\/login\?return_to=\/admin/);
  assert.match(loginPage, /safeReturnTo\(query\.return_to/);
  assert.match(loginPage, /name="returnTo" value=\{returnTo\}/);
  assert.match(loginRoute, /return_to/);
});

test("provides secure signup and password recovery flows", async () => {
  const [loginPage, signupRoute, forgotRoute, resetRoute, resetForm, recoveryRedirect, layout] = await Promise.all([
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/signup/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/forgot-password/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/reset-password/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/reset-password/ResetPasswordForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/RecoveryRedirect.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(loginPage, /\/forgot-password/);
  assert.match(loginPage, /\/signup/);
  assert.match(signupRoute, /\/auth\/v1\/signup/);
  assert.match(signupRoute, /httpOnly:\s*true/);
  assert.match(forgotRoute, /\/auth\/v1\/recover/);
  assert.match(forgotRoute, /https:\/\/enclavelibrary\.com\/reset-password/);
  assert.match(resetRoute, /method:\s*"PUT"/);
  assert.match(resetForm, /history\.replaceState/);
  assert.match(recoveryRedirect, /type"\)\s*!==\s*"recovery"/);
  assert.match(recoveryRedirect, /\/reset-password#/);
  assert.match(layout, /RecoveryRedirect/);
});

test("expires authenticated web sessions after fifteen minutes of inactivity", async () => {
  const [authHelper, activityRoute, activityGuard, libraryPage, logoutRoute] = await Promise.all([
    readFile(new URL("../lib/enclave-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/activity/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/library/SessionActivityGuard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/library/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/logout/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(authHelper, /INACTIVITY_SECONDS\s*=\s*15\s*\*\s*60/);
  assert.match(authHelper, /ACTIVITY_COOKIE/);
  assert.match(activityRoute, /httpOnly:\s*true/);
  assert.match(activityRoute, /maxAge:\s*INACTIVITY_SECONDS/);
  assert.match(activityGuard, /15\s*\*\s*60\s*\*\s*1000/);
  assert.match(activityGuard, /visibilitychange/);
  assert.match(activityGuard, /\/api\/auth\/logout/);
  assert.match(libraryPage, /SessionActivityGuard/);
  assert.match(logoutRoute, /ACTIVITY_COOKIE/);
});

test("provides privacy-safe player profiles and an owner-only admin console", async () => {
  const [profilePage, copyProfileUrl, profileRoute, publicProfile, adminPage, adminRoute, sql] = await Promise.all([
    readFile(new URL("../app/profile/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/profile/CopyProfileUrl.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/profile/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/u/[username]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/announcement/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/profile_admin.sql", import.meta.url), "utf8"),
  ]);
  assert.match(profilePage, /is_public/);
  assert.match(profilePage, /href={`\/u\/\${encodeURIComponent\(username\)}`}/);
  assert.doesNotMatch(copyProfileUrl, /KİŞİSEL PROFİL ADRESİN|enclavelibrary\.com/);
  assert.match(copyProfileUrl, /Bağlantıyı kopyala/);
  assert.match(profileRoute, /update_enclave_public_profile/);
  assert.match(publicProfile, /get_public_enclave_profile/);
  assert.doesNotMatch(publicProfile, /auth\.users|email/);
  assert.match(adminPage, /admin_enclave_dashboard/);
  assert.match(adminRoute, /admin_publish_enclave_announcement/);
  assert.match(sql, /security definer/i);
  assert.match(sql, /enclave_admins/);
  assert.match(sql, /revoke all on function/i);
});

test("uploads profile artwork into an owner-scoped storage folder", async () => {
  const [profilePage, picker, profileRoute, sql] = await Promise.all([
    readFile(new URL("../app/profile/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/profile/ProfileMediaPicker.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/profile/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/profile_admin.sql", import.meta.url), "utf8"),
  ]);
  assert.match(profilePage, /multipart\/form-data/);
  assert.match(picker, /image\/jpeg,image\/png,image\/webp/);
  assert.match(picker, /drawSquareCrop/);
  assert.match(picker, /new DataTransfer\(\)/);
  assert.match(picker, /image\/webp/);
  assert.match(picker, /Kare kırpmayı ayarla/);
  assert.match(profileRoute, /validImageSignature/);
  assert.match(profileRoute, /storage\/v1\/object\/profile-media/);
  assert.match(sql, /storage\.foldername\(name\).*auth\.uid\(\)/s);
});

test("protects account security actions without allowing email changes", async () => {
  const [securityPage, authHelper, logoutRoute, turnstile, loginRoute, mfaVerify, sql] = await Promise.all([
    readFile(new URL("../app/security/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/enclave-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/logout/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/turnstile.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/security/mfa/verify/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/profile_admin.sql", import.meta.url), "utf8"),
  ]);
  assert.match(securityPage, /web panelinden değiştirilemez/i);
  assert.doesNotMatch(securityPage, /type="email"|name="email"/i);
  assert.match(authHelper, /needsMfaChallenge/);
  assert.match(logoutRoute, /logout\?scope=local/);
  assert.match(turnstile, /siteverify/);
  assert.match(loginRoute, /verifyTurnstile/);
  assert.match(mfaVerify, /auth\.mfa\.challenge/);
  assert.match(mfaVerify, /auth\.mfa\.verify/);
  assert.match(sql, /delete_enclave_account/);
});

test("publishes Turkish privacy, KVKK, terms and contact pages", async () => {
  const pages = await Promise.all(["privacy", "kvkk", "terms", "contact"].map((name) => readFile(new URL(`../app/${name}/page.tsx`, import.meta.url), "utf8")));
  assert.match(pages[0], /Gizlilik/);
  assert.match(pages[1], /KVKK/);
  assert.match(pages[2], /Kullanım/);
  assert.match(pages[3], /İletişim/);
});

test("ships branded Supabase email templates with secure confirmation links", async () => {
  const [confirm, recovery] = await Promise.all([
    readFile(new URL("../supabase/email-templates/confirm-signup.html", import.meta.url), "utf8"),
    readFile(new URL("../supabase/email-templates/reset-password.html", import.meta.url), "utf8"),
  ]);
  for (const template of [confirm, recovery]) {
    assert.match(template, /\{\{ \.ConfirmationURL \}\}/);
    assert.match(template, /ENCLAVE/);
    assert.doesNotMatch(template, /<script|javascript:/i);
  }
  assert.match(confirm, /HESABIMI DOĞRULA/);
  assert.match(recovery, /PAROLAMI YENİLE/);
});

test("resolves a missing cover from an exact Steam title match", async () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  globalThis.caches = { default: { match: async () => undefined, put: async () => undefined } };
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith("https://steamcommunity.com/actions/SearchApps/")) {
      return Response.json([{ appid: "1086940", name: "Baldur's Gate 3" }]);
    }
    if (url.startsWith("https://store.steampowered.com/search/")) {
      return new Response('<a data-ds-appid="1086940"><span class="title">Baldur\'s Gate 3</span></a>');
    }
    if (url.startsWith("https://store.steampowered.com/api/appdetails")) {
      return Response.json({ "1086940": { success: true, data: { header_image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/header.jpg" } } });
    }
    return originalFetch(input, init);
  };

  try {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("art-test", `${process.pid}-${Date.now()}`);
    const { default: worker } = await import(workerUrl.href);
    const response = await worker.fetch(
      new Request("http://localhost/api/game-art?title=Baldur%27s%20Gate%203"),
      { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/header.jpg");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.caches = originalCaches;
  }
});

test("accepts one high-confidence SteamGridDB edition-title match when configured", async () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  globalThis.caches = { default: { match: async () => undefined, put: async () => undefined } };
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith("https://www.steamgriddb.com/api/v2/search/autocomplete/")) {
      assert.equal(init?.headers?.Authorization, "Bearer test-key");
      return Response.json({ success: true, data: [
        { id: 4321, name: "Game of Thrones" },
        { id: 1234, name: "A Game of Thrones: The Board Game" },
      ] });
    }
    if (url.startsWith("https://www.steamgriddb.com/api/v2/grids/game/1234")) {
      return Response.json({ success: true, data: [{ url: "https://cdn2.steamgriddb.com/grid/test.png", score: 99 }] });
    }
    return originalFetch(input, init);
  };

  try {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("steamgriddb-test", `${process.pid}-${Date.now()}`);
    const { default: worker } = await import(workerUrl.href);
    const response = await worker.fetch(
      new Request("http://localhost/api/game-art?title=A%20Game%20of%20Thrones%3A%20The%20Board%20Game%20-%20Digital%20Edition"),
      {
        ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
        STEAMGRIDDB_API_KEY: "test-key",
      },
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "https://cdn2.steamgriddb.com/grid/test.png");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.caches = originalCaches;
  }
});
