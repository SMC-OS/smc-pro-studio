// V1 launch-gate browser QA. Same usage as the other scripts/qa files (local stack + vite + ad-hoc playwright; ANON_KEY/SERVICE_KEY = local keys). Never run against staging/production.
// V1 launch-gate browser QA against the real local backend (no interception), at 375px and 1280px.
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { processAccountDeletions } from "../process-account-deletions.mjs";
const URL_ = "http://127.0.0.1:54321", APP = "http://127.0.0.1:5173";
const svc = createClient(URL_, process.env.SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const results = []; const check = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); };
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const created = [];
const PASSWORD = "Browser-QA-Pass-1";
function watch(page) {
  const errors = [], failed = [];
  page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("ERR_TUNNEL")) errors.push(`${m.text()} @ ${m.location().url}`); });
  page.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(APP)) failed.push(`${r.status()} ${r.url()}`); });
  return { errors, failed };
}
try {
  for (const vp of [{ width: 375, height: 812, tag: "375" }, { width: 1280, height: 900, tag: "1280" }]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const w = watch(page);
    for (const [path, heading] of [["/support", "Help and support"], ["/delete-account", "Delete your account"], ["/privacy", "Privacy Policy"], ["/terms", "Terms of Use"], ["/community-guidelines", null], ["/no-such-page", "Page not found"]]) {
      await page.goto(`${APP}${path}`, { waitUntil: "networkidle" });
      const h1 = heading ? await page.locator("h1").first().textContent() : "ok";
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      check(`[${vp.tag}] ${path} renders for a guest${heading ? ` ("${heading}")` : ""}, no overflow`, (!heading || h1?.includes(heading)) && !overflow, `h1=${h1} overflow=${overflow}`);
    }
    const draft = await page.goto(`${APP}/privacy`, { waitUntil: "networkidle" }).then(() => page.getByRole("note").textContent());
    check(`[${vp.tag}] Privacy Policy shows the draft notice`, /draft/i.test(draft ?? ""));
    const icons = await page.evaluate(async () => Promise.all(["/favicon.ico", "/favicon.svg", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png", "/icons/apple-touch-icon.png"].map(async (u) => [u, (await fetch(u)).status])));
    check(`[${vp.tag}] favicon, manifest and icons are served`, icons.every(([, s]) => s === 200), icons.filter(([, s]) => s !== 200).join(","));
    await page.goto(`${APP}/auth?mode=register`, { waitUntil: "networkidle" });
    if (!(await page.getByLabel("Full name").count())) await page.getByRole("button", { name: "Create account" }).first().click();
    await page.getByRole("button", { name: "professional" }).click();
    const opts = await page.locator("select").first().locator("option").allTextContents();
    check(`[${vp.tag}] signup professions exclude SMC Team`, opts.length > 5 && !opts.some((o) => /SMC Team/i.test(o)), opts.join("|"));
    await page.getByRole("link", { name: "Privacy Policy" }).click(); await page.waitForLoadState("networkidle");
    check(`[${vp.tag}] signup Privacy Policy link opens /privacy`, page.url().endsWith("/privacy"));
    await page.goBack(); await page.waitForLoadState("networkidle");
    if (!(await page.getByRole("link", { name: "Terms of Use" }).count())) { await page.getByRole("button", { name: "Create account" }).first().click(); }
    await page.getByRole("link", { name: "Terms of Use" }).click(); await page.waitForLoadState("networkidle");
    check(`[${vp.tag}] signup Terms of Use link opens /terms`, page.url().endsWith("/terms"));

    // Signed-in deletion journey.
    const email = `qa${Date.now().toString(36)}-${vp.tag}@example.test`;
    const { data: u } = await svc.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { display_name: "QA Leaver" } });
    created.push(u.user.id);
    await page.goto(`${APP}/auth`, { waitUntil: "networkidle" });
    await page.locator('input[type="email"]').fill(email); await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in securely" }).click(); await page.waitForTimeout(1500);
    await page.goto(`${APP}/settings`, { waitUntil: "networkidle" });
    const links = await page.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    check(`[${vp.tag}] Settings links support, privacy, terms and support email`, ["/support", "/privacy", "/terms"].every((h) => links.includes(h)) && links.some((h) => h?.startsWith("mailto:support@smcprostudio.app")));
    await page.goto(`${APP}/delete-account`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Delete my account" }).click();
    await page.getByLabel(/Type DELETE to confirm/).fill("DELETE");
    await page.getByRole("button", { name: "Request deletion" }).click();
    const scheduled = await page.getByText(/Unless you cancel, it will be deleted after/).waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
    check(`[${vp.tag}] /delete-account schedules deletion with a date`, scheduled);
    await page.screenshot({ path: `./v1-gate-delete-${vp.tag}.png`, fullPage: true });
    await page.getByRole("button", { name: "Cancel deletion" }).click();
    const cancelled = await page.getByText("Deletion cancelled. Your account will stay open.").waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
    check(`[${vp.tag}] cancellation within the window works`, cancelled);
    await page.getByRole("button", { name: "Delete my account" }).click();
    await page.getByLabel(/Type DELETE to confirm/).fill("DELETE");
    await page.getByRole("button", { name: "Request deletion" }).click(); await page.waitForTimeout(800);
    await svc.from("account_deletion_requests").update({ scheduled_for: new Date(Date.now() - 60000).toISOString() }).eq("user_id", u.user.id).eq("status", "requested");
    const summary = await processAccountDeletions(svc);
    const signIn = await createClient(URL_, process.env.ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password: PASSWORD });
    check(`[${vp.tag}] after processing the account cannot sign in`, summary.failures.length === 0 && Boolean(signIn.error));
    check(`[${vp.tag}] no console errors`, w.errors.length === 0, w.errors.slice(0, 3).join(" | "));
    check(`[${vp.tag}] no failed same-origin requests (incl. favicon)`, w.failed.length === 0, w.failed.slice(0, 3).join(" | "));
    await page.close();
  }
} finally {
  await browser.close();
  for (const id of created) { await svc.from("account_deletion_requests").delete().eq("user_id", id); await svc.auth.admin.deleteUser(id).catch(() => {}); }
}
const failed = results.filter((r) => !r).length; console.log(`\n${results.length - failed}/${results.length} browser checks passed`); process.exit(failed ? 1 : 0);
