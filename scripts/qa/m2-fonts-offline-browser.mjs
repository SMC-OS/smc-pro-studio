// Phase M2 browser QA: self-hosted fonts render on an offline first launch.
// Serves a built bundle (default dist/) and loads it in a fresh browser
// context with every non-local request blocked (an offline phone with no
// cache), then checks the typography actually uses the bundled files.
//   CHROMIUM_PATH=... node scripts/qa/m2-fonts-offline-browser.mjs [distDir]
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const dist = process.argv[2] ?? fileURLToPath(new URL("../../dist", import.meta.url));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json" };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  const file = join(dist, path === "/" ? "index.html" : path);
  try {
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(await readFile(file));
  } catch {
    res.writeHead(200, { "content-type": "text/html" }).end(await readFile(join(dist, "index.html"))); // SPA fallback
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const results = [];
const check = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); };

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const external = [];
  await ctx.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(origin)) return route.continue();
    external.push(url);
    return route.abort("internetdisconnected");
  });
  const page = await ctx.newPage();
  await page.goto(`${origin}/`, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    // Force both families' latin faces to load, as rendering would.
    await Promise.all([document.fonts.load('500 16px "Inter"'), document.fonts.load('500 24px "Fraunces"')]);
    const faces = [...document.fonts].map((f) => ({ family: f.family.replace(/"/g, ""), status: f.status, weight: f.weight }));
    return {
      faces,
      inter: document.fonts.check('500 16px "Inter"'),
      fraunces: document.fonts.check('500 24px "Fraunces"'),
      bodyFont: getComputedStyle(document.body).fontFamily,
      appEnv: document.querySelector('meta[name="smc-app-env"]')?.getAttribute("content"),
      rendered: document.getElementById("root")?.childElementCount ?? 0,
    };
  });
  const loaded = (fam) => fonts.faces.filter((f) => f.family === fam && f.status === "loaded").length;
  check("app shell rendered offline", fonts.rendered > 0);
  check("Inter loaded from the bundle", fonts.inter && loaded("Inter") >= 1, JSON.stringify(fonts.faces.filter((f) => f.family === "Inter")));
  check("Fraunces loaded from the bundle", fonts.fraunces && loaded("Fraunces") >= 1, JSON.stringify(fonts.faces.filter((f) => f.family === "Fraunces")));
  check("body text uses Inter first", /^"?Inter"?/.test(fonts.bodyFont), fonts.bodyFont);
  const fontRequests = external.filter((u) => /fonts\.(googleapis|gstatic)\.com/.test(u));
  check("no Google Fonts request attempted", fontRequests.length === 0, fontRequests.join(" | "));
  console.log(`info: build environment ${fonts.appEnv}; blocked external requests: ${[...new Set(external.map((u) => new URL(u).host))].join(", ") || "none"}`);
  await page.screenshot({ path: process.env.SCREENSHOT ?? "/tmp/m2-fonts-offline.png" });
} finally {
  await browser.close();
  server.close();
}
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} offline font checks passed`);
process.exit(failed ? 1 : 0);
