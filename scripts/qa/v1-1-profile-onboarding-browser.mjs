// V1-1 browser QA. Same usage as the other scripts/qa files (local stack + vite + ad-hoc playwright; SERVICE_KEY for cleanup only).
// V1-1 browser QA: real sign-up through the UI -> complete profile -> discoverable to guests. Real backend, no interception.
// V1-1 browser QA: real sign-up through the UI -> complete profile -> discoverable to guests. Real backend, no interception.
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
const URL_ = "http://127.0.0.1:54321", APP = "http://127.0.0.1:5173";
const svc = createClient(URL_, process.env.SERVICE_KEY, { auth: { persistSession: false } });
const T = `qa${Date.now().toString(36)}`, email = `${T}@example.test`, PASSWORD = "Browser-QA-Pass-1";
const results = []; const check = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); };
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  for (const vp of [{ width: 360, height: 640, tag: "small" }]) {
    const page = await browser.newPage({ viewport: vp });
    const errors = []; page.on("console", (m) => { const u = m.location().url; if (m.type() === "error" && !m.text().includes("ERR_TUNNEL") && !u.endsWith("favicon.ico") && !u.includes("/api/auth/session")) errors.push(m.text()); });
    await page.goto(`${APP}/auth?mode=register`, { waitUntil: "networkidle" });
    if (!(await page.getByLabel("Full name").count())) await page.getByRole("button", { name: "Create account" }).first().click();
    await page.getByLabel("Full name").fill(`${T} Birch Stoneworks`);
    await page.getByRole("button", { name: "professional" }).click();
    await page.locator("select").first().selectOption("stone_fabricator");
    await page.locator('input[type="email"]').fill(email);
    const pw = page.locator('input[autocomplete="new-password"]'); await pw.nth(0).fill(PASSWORD); await pw.nth(1).fill(PASSWORD);
    await page.locator('input[type="checkbox"]').check();
    await page.locator("form").getByRole("button", { name: "Create account" }).click();
    await page.waitForTimeout(2000);
    // Email confirmation is on (as in supabase/config.toml): confirm through the admin API,
    // standing in for the emailed link, then sign in through the UI.
    const { data: list } = await svc.auth.admin.listUsers({ perPage: 200 });
    const signedUp = list.users.find((x) => x.email === email);
    if (signedUp && !signedUp.email_confirmed_at) {
      await svc.auth.admin.updateUserById(signedUp.id, { email_confirm: true });
      await page.goto(`${APP}/auth`, { waitUntil: "networkidle" });
      await page.locator('input[type="email"]').fill(email); await page.locator('input[type="password"]').first().fill(PASSWORD);
      await page.getByRole("button", { name: "Sign in securely" }).click(); await page.waitForTimeout(1500);
    }
    await page.goto(`${APP}/profile`, { waitUntil: "networkidle" });
    check("new professional sees the 'Complete your profile' prompt", await page.getByText("Complete your profile to appear in the Network.").waitFor({ timeout: 5000 }).then(() => true).catch(() => false));
    const guest = await browser.newPage({ viewport: vp });
    await guest.goto(`${APP}/network`, { waitUntil: "networkidle" });
    await guest.getByLabel("Search Network").fill(T); await guest.waitForTimeout(900); await guest.waitForLoadState("networkidle");
    check("not discoverable before completion", await guest.getByText("No professionals match these filters").isVisible());
    await page.getByRole("link", { name: "Complete profile" }).click(); await page.waitForLoadState("networkidle");
    await page.getByLabel("Service area").waitFor(); const nudge = await page.locator("p", { hasText: "To appear in Network search" }).textContent().catch(() => null); check("edit form explains what's missing", nudge === "To appear in Network search, add your service area.", String(nudge));
    await page.getByLabel("Service area").fill(`Harrogate ${T}`);
    await page.getByLabel(/Company name/).fill(`${T} Birch Ltd`);
    await page.getByLabel(/Website/).fill("birch.example.co.uk");
    await page.screenshot({ path: "./v1-1-edit.png", fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check("edit form has no horizontal overflow at 360px", !overflow);
    const small = await page.evaluate(() => [...document.querySelectorAll("form input, form select, form textarea, form button")].filter((e) => e.type !== "radio" && e.getBoundingClientRect().height < 44 && e.offsetParent).map((e) => e.outerHTML.slice(0, 60)));
    check("form controls meet the 44px touch target", small.length === 0, small.join(" | "));
    await page.getByRole("button", { name: "Save profile" }).click(); await page.waitForTimeout(800); await page.waitForLoadState("networkidle");
    check("returns to Profile with confirmation, prompt gone", await page.getByText("Profile saved.").isVisible() && !(await page.getByText("Complete your profile to appear in the Network.").count()));
    await guest.reload({ waitUntil: "networkidle" });
    await guest.getByLabel("Search Network").fill(T); await guest.waitForTimeout(900); await guest.waitForLoadState("networkidle");
    check("guest now finds them with company and area", await guest.getByText(`${T} Birch Stoneworks`).isVisible() && await guest.getByText(`${T} Birch Ltd`).isVisible() && await guest.getByText(`Harrogate ${T}`).isVisible());
    check("no console errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  }
} finally {
  await browser.close();
  const { data } = await svc.auth.admin.listUsers({ perPage: 200 });
  for (const u of data.users.filter((x) => x.email === email)) await svc.auth.admin.deleteUser(u.id);
}
const failed = results.filter((r) => !r).length; console.log(`\n${results.length - failed}/${results.length} browser checks passed`); process.exit(failed ? 1 : 0);
