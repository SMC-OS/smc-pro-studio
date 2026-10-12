// V1-7 browser QA: offline / network-loss behaviour against the real local backend.
// Uses Playwright's context.setOffline() to cut the connection the way a phone losing
// signal would. Run from a folder with playwright + @supabase/supabase-js installed:
//   SERVICE_KEY=... CHROMIUM_PATH=... node v1-7-offline-browser.mjs
// Checks, at 375px (mobile) and 1280px (desktop):
//  - the offline banner appears under the header and never covers the navigation
//  - it clears on reconnection with a brief "back online" message
//  - a signed-in member stays signed in throughout (no redirect, no session loss)
//  - editing a profile offline keeps every typed value, offers Try again,
//    and Try again succeeds once the connection is back (nothing auto-submits)
//  - a failed read (Messages) re-runs itself once on reconnection
//  - a normal server refusal is shown as itself, with no Try again
//  - no horizontal overflow, no unexpected console errors
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const URL_ = "http://127.0.0.1:54321", APP = "http://127.0.0.1:5173";
const svc = createClient(URL_, process.env.SERVICE_KEY, { auth: { persistSession: false } });
const T = `qa${Date.now().toString(36)}`, PASSWORD = "Browser-QA-Pass-1";
const OFFLINE_TEXT = "You're offline. Some actions may be unavailable until your connection returns.";
const BACK_TEXT = "You're back online.";
const ACTION_MSG = "We couldn't reach SMC Pro Studio. Check your connection, then try again.";
const results = [];
const check = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); };
const created = [];

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  for (const vp of [{ width: 375, height: 740, tag: "375" }, { width: 1280, height: 800, tag: "1280" }]) {
    const email = `${T}-${vp.tag}@example.test`;
    const { data: u, error } = await svc.auth.admin.createUser({
      email, password: PASSWORD, email_confirm: true,
      user_metadata: { display_name: `${T} Offline ${vp.tag}`, account_type: "customer" },
    });
    if (error) throw error;
    created.push(u.user.id);

    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const errors = [];
    let offlinePhase = false;
    let refusalPhase = false;
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const text = m.text();
      // While deliberately offline the browser itself logs the failed requests; those are the test, not a defect.
      if (refusalPhase && /status of 403/.test(text)) return; // the injected refusal below
      if (offlinePhase && /ERR_INTERNET_DISCONNECTED|Failed to fetch|Failed to load resource/.test(text)) return;
      if (text.includes("ERR_TUNNEL") || m.location().url.endsWith("favicon.ico") || m.location().url.includes("/api/auth/session")) return;
      errors.push(text);
    });

    await page.goto(`${APP}/auth`, { waitUntil: "networkidle" });
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in securely" }).click();
    await page.waitForTimeout(1500);
    await page.goto(`${APP}/profile/edit`, { waitUntil: "networkidle" });
    await page.getByLabel("Display name").waitFor({ timeout: 8000 });
    // The web client keeps its session in sessionStorage (src/services/supabaseClient.ts).
    const tokenKey = () => page.evaluate(() => {
      const k = Object.keys(sessionStorage).find((x) => x.includes("auth-token"));
      return k && JSON.parse(sessionStorage.getItem(k) ?? "null")?.access_token ? k : null;
    });
    const keyBefore = await tokenKey();
    check(`[${vp.tag}] signed in, edit form loaded`, !!keyBefore);

    // --- go offline -------------------------------------------------------
    offlinePhase = true;
    await context.setOffline(true);
    const banner = page.getByText(OFFLINE_TEXT);
    check(`[${vp.tag}] offline banner appears`, await banner.waitFor({ timeout: 4000 }).then(() => true).catch(() => false));
    const region = page.locator('#main-content > [role="status"]');
    check(`[${vp.tag}] banner is a polite live region`, (await region.getAttribute("aria-live")) === "polite");
    const geo = await page.evaluate((text) => {
      const p = [...document.querySelectorAll("p")].find((e) => e.textContent?.includes(text));
      const r = p.getBoundingClientRect();
      const navs = [...document.querySelectorAll("nav, header")].filter((n) => n.offsetParent || getComputedStyle(n).position === "fixed").map((n) => n.getBoundingClientRect()).filter((b) => b.width && b.height);
      const overlaps = navs.some((b) => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top);
      return { overlaps, position: getComputedStyle(p).position, top: r.top, overflow: document.documentElement.scrollWidth > window.innerWidth };
    }, OFFLINE_TEXT);
    check(`[${vp.tag}] banner doesn't cover header or navigation`, !geo.overlaps && geo.position === "static", JSON.stringify(geo));
    check(`[${vp.tag}] no horizontal overflow while offline`, !geo.overflow);
    await page.screenshot({ path: `/opt/qa/v1-7-offline-${vp.tag}.png` });

    // --- edit while offline: values kept, Try again offered -----------------
    const values = { name: `${T} Renamed ${vp.tag}`, area: `Leeds ${T}` };
    await page.getByLabel("Display name").fill(values.name);
    const area = page.getByLabel(/Service area|Location/).first();
    const hasArea = (await area.count()) > 0;
    if (hasArea) await area.fill(values.area);
    await page.getByRole("button", { name: "Save profile" }).click();
    const msg = page.getByText(ACTION_MSG);
    check(`[${vp.tag}] offline save shows the connection message`, await msg.waitFor({ timeout: 6000 }).then(() => true).catch(() => false));
    check(`[${vp.tag}] still on the edit form, values kept`, page.url().endsWith("/profile/edit") && (await page.getByLabel("Display name").inputValue()) === values.name && (!hasArea || (await area.inputValue()) === values.area));
    const retry = page.getByRole("button", { name: "Try again" });
    check(`[${vp.tag}] Try again is offered`, await retry.isVisible());
    check(`[${vp.tag}] session kept while offline`, keyBefore !== null && (await tokenKey()) === keyBefore);

    // --- reconnect ----------------------------------------------------------
    await context.setOffline(false);
    offlinePhase = false;
    check(`[${vp.tag}] banner clears on reconnection`, await banner.waitFor({ state: "detached", timeout: 4000 }).then(() => true).catch(() => false));
    check(`[${vp.tag}] brief "back online" confirmation`, await page.getByText(BACK_TEXT).isVisible());
    await page.waitForTimeout(1500);
    check(`[${vp.tag}] nothing auto-submitted on reconnection`, page.url().endsWith("/profile/edit") && (await retry.isVisible()));
    await retry.click();
    await page.waitForURL(/\/profile$/, { timeout: 8000 }).catch(() => {});
    check(`[${vp.tag}] Try again saves with the kept values`, await page.getByText("Profile saved.").waitFor({ timeout: 5000 }).then(() => true).catch(() => false));
    const { data: row } = await svc.from("profiles").select("display_name").eq("id", u.user.id).single();
    check(`[${vp.tag}] server has the exact values typed while offline`, row?.display_name === values.name, String(row?.display_name));
    check(`[${vp.tag}] still signed in after reconnection (not sent to sign-in)`, !page.url().includes("/auth") && (await tokenKey()) === keyBefore);
    await page.waitForTimeout(4200);
    check(`[${vp.tag}] "back online" message clears itself`, !(await page.getByText(BACK_TEXT).count()));

    // --- a read that failed offline re-runs once on reconnection --------------
    offlinePhase = true;
    await context.setOffline(true);
    await page.evaluate(() => { history.pushState({}, "", "/messages"); dispatchEvent(new PopStateEvent("popstate")); });
    const readNote = page.getByText("You're offline. We'll try again when your connection returns.");
    const sawNote = await readNote.waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
    check(`[${vp.tag}] failed read explains it will retry`, sawNote);
    await context.setOffline(false);
    offlinePhase = false;
    check(`[${vp.tag}] read recovers by itself once back online`, await readNote.waitFor({ state: "detached", timeout: 6000 }).then(() => true).catch(() => false) && !(await page.getByText(ACTION_MSG).count()));

    // --- a genuine server refusal is not dressed up as a connection problem ----
    await page.goto(`${APP}/profile/edit`, { waitUntil: "networkidle" });
    await page.getByLabel("Display name").waitFor();
    refusalPhase = true;
    await page.route("**/rest/v1/**", (route) => route.request().method() === "GET" ? route.continue() : route.fulfill({
      status: 403, contentType: "application/json",
      body: JSON.stringify({ code: "42501", message: "new row violates row-level security policy", details: null, hint: null }),
    }));
    await page.getByLabel("Display name").fill(`${T} Refused`);
    await page.getByRole("button", { name: "Save profile" }).click();
    await page.getByRole("alert").first().waitFor({ timeout: 5000 }).catch(() => {});
    const alertText = (await page.getByRole("alert").first().textContent().catch(() => "")) ?? "";
    check(`[${vp.tag}] server refusal shows its own safe message, no Try again`, alertText.length > 0 && !alertText.includes(ACTION_MSG) && !(await page.getByRole("button", { name: "Try again" }).count()), alertText.trim());
    check(`[${vp.tag}] refused input kept`, (await page.getByLabel("Display name").inputValue()) === `${T} Refused`);
    await page.unroute("**/rest/v1/**");
    refusalPhase = false;

    check(`[${vp.tag}] no unexpected console errors`, errors.length === 0, errors.slice(0, 3).join(" | "));
    await context.close();
  }
} finally {
  await browser.close();
  for (const id of created) await svc.auth.admin.deleteUser(id).catch(() => {});
}
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} browser checks passed`);
process.exit(failed ? 1 : 0);
