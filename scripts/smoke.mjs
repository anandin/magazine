// Smoke test: drive a real Chromium browser against the live deploy and assert
// the things that should be true of the unauthenticated landing surface. No
// auth needed — the signed-in flows require Google OAuth, which we test
// manually for now. Run with:
//
//   node scripts/smoke.mjs                       (against prod)
//   BASE=http://localhost:3000 node scripts/smoke.mjs
//
// Playwright is expected at /opt/node22/lib/node_modules/playwright in this
// dev sandbox; if you're running locally, `npm i -D playwright` and switch
// the import to "playwright".

import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";

const BASE = process.env.BASE || "https://cedar-hollow-sentinel.vercel.app";

const checks = [];
function assert(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  const tag = ok ? "✓" : "✗";
  console.log(`  ${tag} ${name}${detail ? " — " + detail : ""}`);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  ignoreHTTPSErrors: true,
});
const page = await ctx.newPage();

console.log(`\n→ ${BASE}/`);
const res = await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

assert("status 200", res?.status() === 200, `got ${res?.status()}`);
assert("title is 'The Sentinel'", (await page.title()) === "The Sentinel");

const masthead = (await page.locator(".mag-masthead").first().textContent()) || "";
assert(
  "masthead reads 'The Cedar Hollow Sentinel'",
  masthead.includes("Cedar Hollow Sentinel"),
);

const leadHeadline =
  (await page.locator(".mag-cover-lead-headline").first().textContent()) || "";
assert("anon lead headline present", leadHeadline.length > 0);

const signInCount = await page.locator("text=/sign in/i").count();
assert("sign-in CTA present", signInCount >= 1, `found ${signInCount}`);

const personaNames = await page.locator(".mag-masthead-card-name").allTextContents();
assert(
  "all 6 personas on landing",
  personaNames.length === 6,
  `found: ${personaNames.join(", ")}`,
);

await page.screenshot({ path: "scripts/smoke-landing.png", fullPage: false });
console.log("  ↳ screenshot: scripts/smoke-landing.png");

// API endpoints that should be public/safe
for (const path of ["/api/personas", "/agents/voss.png"]) {
  const r = await page.request.get(`${BASE}${path}`);
  assert(`GET ${path}`, r.status() === 200, `${r.status()}`);
}

// API endpoints that should 401 without auth
for (const [method, path, body] of [
  ["POST", "/api/issues/generate", {}],
  ["POST", "/api/preferences", { topics: [] }],
  ["POST", "/api/feedback", { kind: "article", target_id: "00000000-0000-0000-0000-000000000000", mode: "real" }],
]) {
  const r = await page.request.fetch(`${BASE}${path}`, {
    method,
    data: body,
  });
  assert(`${method} ${path} → 401 when anon`, r.status() === 401, `got ${r.status()}`);
}

await browser.close();

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exit(1);
