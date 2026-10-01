// V1-2/4/5/6 browser QA. Same usage as the other scripts/qa files.
// V1-2/V1-4/V1-5/V1-6 browser QA against the real backend: Settings, deletion request + cancel,
// no Express API dependency, only launched Network tabs.
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
const URL_ = "http://127.0.0.1:54321", APP = "http://127.0.0.1:5173";
const svc = createClient(URL_, process.env.SERVICE_KEY, { auth: { persistSession: false } });
const T = `qa${Date.now().toString(36)}`, email = `${T}@example.test`, PASSWORD = "Browser-QA-Pass-1";
const results = []; const check = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); };
const { data: u } = await svc.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { display_name: `${T} Cedar` } });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const apiCalls = []; page.on("request", (r) => { if (r.url().includes("/api/")) apiCalls.push(r.url()); });
  const errors = []; page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("ERR_TUNNEL") && !m.location().url.endsWith("favicon.ico")) errors.push(m.text() + " @ " + m.location().url); });
  await page.goto(`${APP}/network`, { waitUntil: "networkidle" });
  const tabs = await page.locator('[aria-label="Network categories"] [role="tab"]').allTextContents();
  check("Network shows only launched tabs", JSON.stringify(tabs) === JSON.stringify(["Professionals", "Materials"]), tabs.join(","));
  await page.goto(`${APP}/auth`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(email); await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in securely" }).click(); await page.waitForTimeout(1500);
  await page.goto(`${APP}/profile`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Settings" }).click(); await page.waitForLoadState("networkidle");
  const shown = await page.getByText(`${email}`).waitFor({ timeout: 5000 }).then(() => true).catch(() => false); check("Settings reachable from Profile and shows the account email", shown);
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByRole("button", { name: "Yes, request deletion" }).click(); await page.waitForTimeout(700);
  const { data: req } = await svc.from("account_deletion_requests").select("status, cancellation_requested_at").eq("user_id", u.user.id).single();
  check("request recorded for this user as 'requested'", req?.status === "requested");
  check("UI shows pending status, not 'deleted'", await page.getByText(/Deletion requested on/).isVisible());
  await page.screenshot({ path: "./v1-2-settings.png", fullPage: true });
  await page.reload({ waitUntil: "networkidle" });
  check("pending status persists across reload", await page.getByText(/Deletion requested on/).isVisible());
  await page.getByRole("button", { name: "Cancel deletion request" }).click(); await page.waitForTimeout(700);
  const { data: req2 } = await svc.from("account_deletion_requests").select("cancellation_requested_at").eq("user_id", u.user.id).single();
  check("cancellation recorded", Boolean(req2?.cancellation_requested_at));
  check("no Express /api calls from the social shell", apiCalls.length === 0, apiCalls.slice(0, 2).join(" "));
  check("no horizontal overflow", !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  check("no console errors", errors.length === 0, errors.slice(0, 2).join(" | "));
} finally {
  await browser.close();
  await svc.from("account_deletion_requests").delete().eq("user_id", u.user.id);
  await svc.auth.admin.deleteUser(u.user.id);
}
const failed = results.filter((r) => !r).length; console.log(`\n${results.length - failed}/${results.length} browser checks passed`); process.exit(failed ? 1 : 0);
