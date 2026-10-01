// Phase M1 browser QA: native safe areas, against the real local backend.
// Simulates a notched phone by setting the --safe-area-inset-* variables that
// Capacitor 8 injects on Android (the shell prefers them over env()):
//   portrait  390x844, top 59 (Dynamic Island), bottom 34 (home indicator)
//   landscape 844x390, left/right 59 (notch), bottom 21
// Checks: header stays below the status bar while scrolling; the status-bar
// strip absorbs taps; bottom nav sits above the home indicator; no tappable
// control is hit-testable under system UI; a real dialog stays inside the safe
// region; no horizontal overflow.
//   SERVICE_KEY=... CHROMIUM_PATH=... node m1-native-layout-browser.mjs
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const URL_ = "http://127.0.0.1:54321", APP = "http://127.0.0.1:5173";
const svc = createClient(URL_, process.env.SERVICE_KEY, { auth: { persistSession: false } });
const T = `qa${Date.now().toString(36)}`, PASSWORD = "Browser-QA-Pass-1";
const results = [];
const check = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); };
const created = [];

async function user(tag, metadata) {
  const { data, error } = await svc.auth.admin.createUser({ email: `${T}-${tag}@example.test`, password: PASSWORD, email_confirm: true, user_metadata: metadata });
  if (error) throw error;
  created.push(data.user.id);
  return data.user;
}

const insetsScript = (insets) => {
  const apply = () => {
    for (const [k, v] of Object.entries(insets)) document.documentElement.style.setProperty(`--safe-area-inset-${k}`, `${v}px`);
  };
  if (document.documentElement) apply();
  document.addEventListener("DOMContentLoaded", apply);
};

// Interactive elements whose own centre is hit-testable inside a forbidden zone.
const exposedUnderSystemUi = (zones) =>
  [...document.querySelectorAll("a[href], button, input, select, textarea, [role='button'], [tabindex]:not([tabindex='-1'])")]
    .filter((el) => el.offsetParent || getComputedStyle(el).position === "fixed")
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && r.height > 0)
    .filter(({ el, r }) => {
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const inZone = (cy < zones.top) || (cy > innerHeight - zones.bottom) || (cx < zones.left) || (cx > innerWidth - zones.right);
      if (!inZone || cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return false;
      const hit = document.elementFromPoint(cx, cy);
      return hit === el || el.contains(hit);
    })
    .map(({ el, r }) => `${el.tagName}:${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 20)}@${Math.round(r.left)},${Math.round(r.top)}`);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const viewer = await user("viewer", { display_name: `${T} Viewer`, account_type: "customer" });
  const target = await user("target", { display_name: `${T} Target`, account_type: "customer" });

  // ---------- Portrait: Dynamic Island + home indicator ----------
  const P = { top: 59, bottom: 34, left: 0, right: 0 };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await ctx.addInitScript(insetsScript, P);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("ERR_TUNNEL") && !m.location().url.endsWith("favicon.ico")) errors.push(m.text()); });

  await page.goto(`${APP}/auth`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(`${T}-viewer@example.test`);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await page.waitForTimeout(1500);

  await page.goto(`${APP}/network`, { waitUntil: "networkidle" });
  // scrollTo, not mouse.wheel: in Playwright's mobile emulation the wheel pans
  // the visual viewport instead of scrolling the page.
  await page.evaluate(() => {
    const filler = document.createElement("div");
    filler.style.height = "2000px";
    document.querySelector("#main-content").appendChild(filler);
    window.scrollTo(0, 900);
  });
  await page.waitForTimeout(300);
  const layout = await page.evaluate(() => {
    const header = document.querySelector("header").getBoundingClientRect();
    const strip = document.elementFromPoint(195, 30);
    const nav = [...document.querySelectorAll("nav a, nav button")].filter((e) => e.offsetParent || getComputedStyle(e).position === "fixed").map((e) => e.getBoundingClientRect());
    return {
      scrolled: scrollY,
      headerTop: header.top,
      stripIsShield: strip?.getAttribute("aria-hidden") === "true" && getComputedStyle(strip).position === "fixed",
      stripBg: strip ? getComputedStyle(strip).backgroundColor : null,
      navMaxBottom: Math.max(...nav.map((r) => r.bottom)),
      navCount: nav.length,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  check("page actually scrolled", layout.scrolled > 500, String(layout.scrolled));
  check("sticky header stays below the status bar", layout.headerTop >= P.top, `top=${layout.headerTop}`);
  check("status-bar strip covers and absorbs taps in the top inset", layout.stripIsShield, String(layout.stripBg));
  check("status-bar strip uses the light shell surface", layout.stripBg === "rgb(251, 248, 242)", String(layout.stripBg));
  check("bottom navigation sits above the home indicator", layout.navCount > 0 && layout.navMaxBottom <= 844 - P.bottom, `maxBottom=${layout.navMaxBottom}`);
  check("no horizontal overflow (portrait)", !layout.overflow);
  const exposedP = await page.evaluate(exposedUnderSystemUi, P);
  check("no tappable control under the status bar or home indicator", exposedP.length === 0, exposedP.join(" | "));
  await page.screenshot({ path: "/opt/qa/m1-portrait-scrolled.png" });

  // Real dialog (BlockButton confirmation) on another member's profile.
  await page.goto(`${APP}/profile/${target.id}`, { waitUntil: "networkidle" });
  const block = page.getByRole("button", { name: /^Block/ }).first();
  await block.waitFor({ timeout: 8000 });
  await block.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  const d = await dialog.boundingBox();
  check("dialog stays inside the safe region", d.y >= P.top && d.y + d.height <= 844 - P.bottom, JSON.stringify(d));
  const exposedD = await page.evaluate(exposedUnderSystemUi, P);
  check("no dialog control under system UI", exposedD.length === 0, exposedD.join(" | "));
  await page.screenshot({ path: "/opt/qa/m1-portrait-dialog.png" });
  await page.keyboard.press("Escape");

  // ---------- Landscape: side notch ----------
  const L = { top: 0, bottom: 21, left: 59, right: 59 };
  const lctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await lctx.addInitScript(insetsScript, L);
  const lpage = await lctx.newPage();
  await lpage.goto(`${APP}/network`, { waitUntil: "networkidle" });
  const lOverflow = await lpage.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  check("no horizontal overflow (landscape)", !lOverflow);
  const exposedL = await lpage.evaluate(exposedUnderSystemUi, L);
  check("no tappable control under the notch (landscape)", exposedL.length === 0, exposedL.join(" | "));
  await lpage.screenshot({ path: "/opt/qa/m1-landscape.png" });

  // ---------- Plain browser tab: insets are zero, nothing shifts ----------
  const wctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const wpage = await wctx.newPage();
  await wpage.goto(`${APP}/network`, { waitUntil: "networkidle" });
  const web = await wpage.evaluate(() => ({
    headerTop: document.querySelector("header").getBoundingClientRect().top,
    stripHeight: [...document.querySelectorAll('div[aria-hidden="true"]')].find((e) => getComputedStyle(e).position === "fixed" && getComputedStyle(e).top === "0px")?.getBoundingClientRect().height,
  }));
  check("browser tab: no inset, header at the top, strip has zero height", web.headerTop === 0 && web.stripHeight === 0, JSON.stringify(web));

  check("no unexpected console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close(); await lctx.close(); await wctx.close();
} finally {
  await browser.close();
  for (const id of created) await svc.auth.admin.deleteUser(id).catch(() => {});
}
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} browser checks passed`);
process.exit(failed ? 1 : 0);
