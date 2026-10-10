// Usage: requires a running local Supabase stack + `vite` dev server on 127.0.0.1:5173 pointed at it,
// and an ad-hoc `npm i playwright` (not a project dependency). ANON_KEY / SERVICE_KEY env vars = local keys.
// Never run against staging or production: it creates and deletes users.
// Slice E browser QA against the REAL local backend. No route interception,
// no mocked RPC: every request goes to the running PostgREST/Postgres stack.
import { chromium } from "playwright";
const URL_ = "http://127.0.0.1:54321", APP = "http://127.0.0.1:5173";
const { ANON_KEY: ANON, SERVICE_KEY: SERVICE } = process.env;
const T = `qa${Date.now().toString(36)}`;
const PASSWORD = "Browser-QA-Pass-1";
const created = [];
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); };

async function mkUser(i, meta, patch, pp) {
  const email = `${T}-${i}@example.test`;
  const r = await fetch(`${URL_}/auth/v1/admin/users`, { method: "POST", headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json" }, body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: meta }) });
  const u = await r.json(); created.push(u.id);
  const tok = await (await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ email, password: PASSWORD }) })).json();
  const h = { apikey: ANON, authorization: `Bearer ${tok.access_token}`, "content-type": "application/json" };
  await fetch(`${URL_}/rest/v1/profiles?id=eq.${u.id}`, { method: "PATCH", headers: h, body: JSON.stringify(patch) });
  if (pp) await fetch(`${URL_}/rest/v1/professional_profiles?user_id=eq.${u.id}`, { method: "PATCH", headers: h, body: JSON.stringify(pp) });
}

const pros = [];
for (let i = 0; i < 24; i++) {
  const cat = i % 3 === 0 ? "architect" : i % 3 === 1 ? "stone_fabricator" : "installer";
  const area = i % 2 === 0 ? `Leeds ${T}` : `London ${T}`;
  pros.push({ name: `${T} Pro ${String(i).padStart(2, "0")}`, cat, area });
}
let i = 0;
for (const p of pros) await mkUser(i++, { account_type: "professional", display_name: p.name, professional_category: p.cat }, { onboarding_completed: true, bio: `secretbio-${T}` }, { service_area: p.area, company_name: `${T} Co ${i}`, website_url: `https://secret-${T}.invalid` });
await mkUser(i++, { account_type: "professional", display_name: `${T} Hidden Private`, professional_category: "architect" }, { onboarding_completed: true, visibility: "private" }, { service_area: `Leeds ${T}` });

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  for (const vp of [{ width: 375, height: 812, tag: "mobile" }, { width: 1280, height: 900, tag: "desktop" }]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const rpc = [];
    page.on("response", (r) => { if (r.url().includes("/rest/v1/rpc/search_public_professionals")) rpc.push({ status: r.status(), url: r.url() }); });
    const consoleErrors = []; const blocked = [];
    page.on("response", (r) => { if (r.status() >= 400) console.log(`  [${vp.tag}] HTTP ${r.status()} ${r.url()}`); });
    page.on("console", (m) => { if (m.type() === "error") { if (!m.text().includes("ERR_TUNNEL_CONNECTION_FAILED")) consoleErrors.push(m.text() + " @ " + m.location().url); else blocked.push(m.location().url); }; });
    await page.goto(`${APP}/network`, { waitUntil: "networkidle" });
    await page.getByLabel("Search Network").fill(T);
    await page.waitForTimeout(900); await page.waitForLoadState("networkidle");
    const firstPage = await page.locator("li:has(a[href^=\"/profile/\"])").count();
    check(`[${vp.tag}] free-text search renders first real page of 20`, firstPage === 20, `rendered ${firstPage}`);
    check(`[${vp.tag}] requests hit the real RPC (200)`, rpc.length > 0 && rpc.every((r) => r.status === 200), `${rpc.length} calls`);
    await page.getByRole("button", { name: "Load more" }).click();
    await page.waitForLoadState("networkidle"); await page.waitForTimeout(300);
    const all = await page.locator("ul li p.text-sm.font-semibold").allTextContents();
    check(`[${vp.tag}] Load more appends remaining 4 with no duplicates`, all.length === 24 && new Set(all).size === 24, `${all.length} rows`);
    check(`[${vp.tag}] order is stable alphabetical`, JSON.stringify(all) === JSON.stringify(pros.map((p) => p.name)));
    check(`[${vp.tag}] Load more hidden at end`, (await page.getByRole("button", { name: "Load more" }).count()) === 0);
    const body = await page.content();
    check(`[${vp.tag}] private profile and private fields never rendered`, !body.includes("Hidden Private") && !body.includes(`secretbio-${T}`) && !body.includes(`secret-${T}`));
    await page.getByLabel("Filter by profession").selectOption("architect");
    await page.waitForTimeout(500); await page.waitForLoadState("networkidle");
    const arch = await page.locator("ul li p.text-xs.font-medium").allTextContents();
    check(`[${vp.tag}] profession filter`, arch.length === 8 && arch.every((t) => /architect/i.test(t)), `${arch.length} rows`);
    await page.getByLabel("Filter by location or service area").fill(`Leeds ${T}`);
    await page.waitForTimeout(900); await page.waitForLoadState("networkidle");
    const combo = await page.locator("li:has(a[href^=\"/profile/\"])").count();
    check(`[${vp.tag}] combined profession + area + text`, combo === 4, `${combo} rows`);
    await page.getByLabel("Search Network").fill(`${T}-nothing`);
    await page.waitForTimeout(900); await page.waitForLoadState("networkidle");
    check(`[${vp.tag}] empty state with Clear filters`, await page.getByText("No professionals match these filters").isVisible());
    await page.screenshot({ path: `./slice-e-${vp.tag}-empty.png`, fullPage: true });
    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.waitForTimeout(900); await page.waitForLoadState("networkidle");
    await page.getByLabel("Search Network").fill(T);
    await page.waitForTimeout(900); await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `./slice-e-${vp.tag}-results.png`, fullPage: false });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check(`[${vp.tag}] no horizontal overflow`, !overflow);
    check(`[${vp.tag}] no console errors`, consoleErrors.length === 0, consoleErrors.slice(0, 2).join(" | "));
    if (blocked.length) console.log(`  (sandbox-blocked external requests: ${[...new Set(blocked.map((u) => new URL(u).host))].join(", ")})`); await page.close();
  }
} finally {
  await browser.close();
  for (const id of created) await fetch(`${URL_}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}` } });
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} browser checks passed`);
process.exit(failed ? 1 : 0);
