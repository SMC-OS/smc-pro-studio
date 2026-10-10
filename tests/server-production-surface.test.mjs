import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production server exposes only reviewed launch APIs and no simulated prototype endpoints", async () => {
  const source = await read("server.ts");

  assert.match(source, /"\/api\/system\/health"/);
  assert.match(source, /"\/api\/auth\/session"/);
  assert.match(source, /"\/api\/gemini\/chat"/);

  const removedRoutes = [
    "/api/whatsapp/chat",
    "/api/whatsapp/threads",
    "/api/whatsapp/dispatch-direct",
    "/api/telemetry/cnc-status",
    "/api/telemetry/ar-measurements",
    "/api/inventory/slabs",
    "/api/inventory/sync-now",
    "/api/qr/verify",
    "/api/qr/batch-verify",
    "/api/auth/verify-trade-credentials",
    "/api/beta/stress-test",
    "/api/beta/feedback",
    "/api/stripe/create-payment-intent",
    "/api/stripe/process-payment",
    "/api/compliance/dsar-request",
  ];

  for (const route of removedRoutes) {
    assert.equal(source.includes(route), false, `production server must not expose ${route}`);
  }

  assert.doesNotMatch(source, /requireDemoMode/);
  assert.doesNotMatch(source, /Math\.random\(\)/);
  assert.doesNotMatch(source, /simulated:\s*true/);
  assert.doesNotMatch(source, /creditLimitGbp/);
  assert.doesNotMatch(source, /verified:\s*true/);
  assert.doesNotMatch(source, /slabInventoryDatabase/);
});

test("technical assistant explicitly refuses fabricated operational claims", async () => {
  const source = await read("server.ts");
  assert.match(source, /Never invent a price, stock level, booking slot, project status, certification, warranty term, test result or manufacturer specification/);
  assert.match(source, /Never present an approximate measurement as a professional template or survey/);
  assert.match(source, /Do not claim to have performed inspections, scans, measurements, certifications or warehouse checks/);
});
