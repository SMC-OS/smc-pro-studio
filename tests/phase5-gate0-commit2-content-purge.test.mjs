import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Regression coverage for Phase 5 Gate 0, Commit 2: the pricing/content
// purge, covering both the originally-scoped 14 files (App.tsx +
// dependents, ArtisanShopView, BulkSlabReserveView, DigitalCuratorView,
// GeologicalProvenanceView, SlabYieldGranularReport, SubstrateSpecsView,
// EdgeProfilesView, GlobalSearchModal, CrmPipelineView,
// ExhibitionWalkthroughView, DataComplianceHub, QuoteSummary,
// SlabYieldSummaryChart) and every file found and fixed during the two
// "dependent rendering code" sweeps that followed: HomeDashboard,
// AccountView, GuestWelcomeScreen, BookAppointmentModal,
// FinanceCalculatorModal, PrivacyPolicyView, StripePaymentGateway,
// TermsAndPrivacyModal, UnifiedCustomerInbox, ProjectTimelineVisualizer,
// FinancialCommandView, PublishingCommandCenterView, SiteReadinessView,
// TechnicalLibraryView, ProjectVelocityChart, RenovationQuiz,
// BulkDimensionImportModal, JointDetailsView, ProjectCommandView,
// StaffCrewManagementView, and InteractiveCalendarGrid.
//
// Commit 1 (the social-shell default / legacy-app opt-in mechanism) has
// its own regression coverage in
// tests/phase5-gate0-commit1-production-safety.test.mjs so each commit's
// tests are independently readable and runnable.

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// Many of the purged files carry deliberate "Phase 5 Gate 0 purge" doc
// comments that describe, in prose, the fabricated content that used to
// live there (matching this repo's existing documentation convention).
// Banned-literal assertions must not false-positive on that documentation,
// so they run against comment-stripped source.
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
const readCode = async (path) => stripComments(await read(path));

// =======================================================================
// Per-file known-literal regression checks
// =======================================================================

test("App.tsx no longer contains fabricated slab origins/weights or the fake reservation ticket", async () => {
  const app = await readCode("src/App.tsx");
  assert.doesNotMatch(app, /Carrara, Italy/);
  assert.doesNotMatch(app, /324 kg/);
  assert.doesNotMatch(app, /successfully reserved for fabrication/);
  assert.doesNotMatch(app, /M\. Davies \(Master Mason\)/);
  assert.doesNotMatch(app, /A\. Hughes \(Edge Finishing Specialist\)/);
  assert.doesNotMatch(app, /S\. Patel \(Quality Assurance Inspector\)/);
  assert.doesNotMatch(app, /C\. Thorne \(Sintered Stone Tech\)/);
  assert.doesNotMatch(app, /R\. Sterling \(CNC Operator\)/);
});

test("App.tsx no longer seeds a fabricated verified-batch ledger history", async () => {
  const app = await readCode("src/App.tsx");
  assert.doesNotMatch(app, /SMC Thames Warehouse Ledger/);
  assert.doesNotMatch(app, /batchVerificationCode: "SMC-BATCH-VAL/);
  assert.doesNotMatch(app, /ledgerHash: "0x/);
});

test("App.tsx no longer fakes an AI drawing-scan analysis or auto-fills a fabricated quote", async () => {
  const app = await readCode("src/App.tsx");
  assert.doesNotMatch(app, /Prism-Core Auto-Quote complete/);
  assert.doesNotMatch(app, /Slab Block A - Main L-Section/);
  assert.doesNotMatch(app, /IMPORT LAYOUT & AUTO-FILL QUOTE/);
  assert.doesNotMatch(app, /SMC Prism-Core™ AI Drawing Scanner/);
  assert.doesNotMatch(app, /const \[isAnalyzingDrawing/);
});

test("ArtisanShopView no longer contains the fabricated sample orders or named default customer", async () => {
  const shop = await readCode("src/components/ArtisanShopView.tsx");
  assert.doesNotMatch(shop, /Sir Alex Vance/);
  assert.doesNotMatch(shop, /42 Park Lane, Mayfair/);
  assert.doesNotMatch(shop, /BS EN 1186 food contact certified/);
  assert.doesNotMatch(shop, /SMC Dedicated White-Glove Transit/);
  assert.match(shop, /export const DEFAULT_SAMPLE_ORDERS: ShopOrder\[\] = \[\];/);
});

test("ArtisanShopView no longer computes any numeric price from basePrice/priceDelta, and never shows a genuine £0 line", async () => {
  const shop = await readCode("src/components/ArtisanShopView.tsx");
  assert.doesNotMatch(shop, /basePrice/);
  assert.doesNotMatch(shop, /priceDelta/);
  assert.doesNotMatch(shop, /\bunitPrice\b/);
  assert.doesNotMatch(shop, /cartSubtotal/);
  assert.doesNotMatch(shop, /\bvatTax\b/);
  assert.doesNotMatch(shop, /\bcartTotal\b/);
  assert.doesNotMatch(shop, /baseFreightCost/);
  assert.doesNotMatch(shop, /heavyHandlingFee/);
  assert.doesNotMatch(shop, /paymentDiscount/);
  assert.doesNotMatch(shop, /FREE £0/);
  assert.doesNotMatch(shop, /£255 — Save 15%/);
  assert.doesNotMatch(shop, /Transit Damage Guarantee Insurance/);
  assert.doesNotMatch(shop, /Guarantees instant zero-cost replacement/);
  // baseRates (invented per-zone freight rates) removed from DeliveryZone
  assert.doesNotMatch(shop, /baseRates:/);
});

test("ArtisanShopView no longer runs the fake payment-method simulator (Stripe test cards, fabricated bank account, crypto wallet)", async () => {
  const shop = await readCode("src/components/ArtisanShopView.tsx");
  assert.doesNotMatch(shop, /4242 4242 4242 4242/);
  assert.doesNotMatch(shop, /GB88 BARC 2000 0088 9420 19/);
  assert.doesNotMatch(shop, /0x71C7656EC7ab88b098defB751B7401B5f6d8976F/);
  assert.doesNotMatch(shop, /Klarna Pay in 3 Interest-Free Installments/);
  assert.doesNotMatch(shop, /Instant soft credit check/);
  assert.doesNotMatch(shop, /Certificate of Authenticity & Tax Invoice generated instantly/);
  assert.match(shop, /Online payment is not currently available\./);
});

test("BulkSlabReserveView no longer fakes stock counts or a downloadable certificate", async () => {
  const view = await readCode("src/components/BulkSlabReserveView.tsx");
  assert.doesNotMatch(view, /142 Slabs Available/);
  assert.doesNotMatch(view, /DOWNLOAD CERTIFICATE/);
  assert.doesNotMatch(view, /Official Block Allocation Certificate/);
  assert.doesNotMatch(view, /Math\.floor\(100000 \+ Math\.random\(\) \* 900000\)/);
});

test("DigitalCuratorView no longer contains fabricated origin/price/stock fields", async () => {
  const view = await readCode("src/components/DigitalCuratorView.tsx");
  assert.doesNotMatch(view, /pricePerSqFt/);
  assert.doesNotMatch(view, /stockSlabs/);
  assert.doesNotMatch(view, /Warehouse Location: London Vault #4/);
  assert.doesNotMatch(view, /Curator Sample Kit Dispatched/);
});

test("GeologicalProvenanceView no longer fakes a blockchain ledger or Stripe-shaped secrets", async () => {
  const view = await readCode("src/components/GeologicalProvenanceView.tsx");
  assert.doesNotMatch(view, /pi_3M9aL2x87Kd1009A_secret_99A/);
  assert.doesNotMatch(view, /stripeTxHash/);
  assert.doesNotMatch(view, /ipfsCid/);
  assert.doesNotMatch(view, /MINT STONE TOKEN/);
  assert.doesNotMatch(view, /successfully transferred on L2 blockchain/);
});

test("SlabYieldGranularReport no longer fabricates yield percentages or a fake PDF export", async () => {
  const view = await readCode("src/components/SlabYieldGranularReport.tsx");
  assert.doesNotMatch(view, /88\.5/);
  assert.doesNotMatch(view, /certified by SMC Pro Digital Twin/);
  assert.doesNotMatch(view, /Audit Exported/);
});

test("SlabYieldSummaryChart no longer falls back to a fabricated yield, area, or BS/CNC identifiers", async () => {
  const view = await readCode("src/components/SlabYieldSummaryChart.tsx");
  assert.doesNotMatch(view, /\|\| 88\.5/);
  assert.doesNotMatch(view, /68\.5, 48\.0, 54\.2, 72\.0, 39\.5/);
  assert.doesNotMatch(view, /"BS EN 1469"/);
  assert.doesNotMatch(view, /"CNC-WATERJET-01"/);
  assert.doesNotMatch(view, /\|\| 89\.2/);
});

test("EdgeProfilesView and SubstrateSpecsView no longer claim a 15-year structural warranty", async () => {
  const edge = await readCode("src/components/EdgeProfilesView.tsx");
  const substrate = await readCode("src/components/SubstrateSpecsView.tsx");
  assert.doesNotMatch(edge, /15-year structural warranty/);
  assert.doesNotMatch(substrate, /15-year structural warranty/);
  assert.doesNotMatch(edge, /SMC Certified/);
});

test("GlobalSearchModal no longer claims a specific fabricated slab count or a mismatched price field", async () => {
  const modal = await readCode("src/components/GlobalSearchModal.tsx");
  assert.doesNotMatch(modal, /48 Slabs/);
  assert.doesNotMatch(modal, /pricePerSqm/);
});

test("CrmPipelineView no longer seeds fabricated named clients, deal values, or staff managers", async () => {
  const crm = await readCode("src/components/CrmPipelineView.tsx");
  assert.doesNotMatch(crm, /Alexander Wright/);
  assert.doesNotMatch(crm, /Lady Sarah Spencer/);
  assert.doesNotMatch(crm, /Marcus Vance/);
  assert.doesNotMatch(crm, /Dr\. Oliver Harris/);
  assert.doesNotMatch(crm, /Victoria Sterling/);
  assert.doesNotMatch(crm, /James Sterling \(Senior Mason\)/);
  assert.doesNotMatch(crm, /271,500/);
  assert.match(crm, /const INITIAL_LEADS: CrmLead\[\] = \[\];/);
});

test("ExhibitionWalkthroughView no longer fakes a warranty certificate export or a package hash", async () => {
  const view = await readCode("src/components/ExhibitionWalkthroughView.tsx");
  assert.doesNotMatch(view, /warranty certificates/);
  assert.doesNotMatch(view, /SMC-EXHIBIT-2026-99A/);
  assert.doesNotMatch(view, /downloaded successfully/);
});

test("DataComplianceHub no longer claims a fabricated ICO registration, security audit pass, or audit log", async () => {
  const hub = await readCode("src/components/DataComplianceHub.tsx");
  assert.doesNotMatch(hub, /ZB394019/);
  assert.doesNotMatch(hub, /Passed \(07\/2026\)/);
  assert.doesNotMatch(hub, /Stripe Tokenized Payment Handshake/);
  assert.doesNotMatch(hub, /exported in CSV format/);
  assert.match(hub, /const INITIAL_AUDIT_LOGS: AuditLogEntry\[\] = \[\];/);
});

test("QuoteSummary no longer claims a fabricated dispatch success, VAT number, or slab reservation codes", async () => {
  const quote = await readCode("src/components/QuoteSummary.tsx");
  assert.doesNotMatch(quote, /successfully sent to/);
  assert.doesNotMatch(quote, /VAT: GB 928 4102 38/);
  assert.doesNotMatch(quote, /B8492-V2-A/);
  assert.doesNotMatch(quote, /PRO-SMC-4902/);
  assert.doesNotMatch(quote, /Prism-Core™ OCR v4\.2\.1/);
  assert.doesNotMatch(quote, /James Sterling MRICS/);
});

test("AccountView, GuestWelcomeScreen, and BookAppointmentModal no longer default to or suggest a fabricated identity", async () => {
  const account = await readCode("src/components/AccountView.tsx");
  const guest = await readCode("src/components/GuestWelcomeScreen.tsx");
  const appt = await readCode("src/components/BookAppointmentModal.tsx");
  assert.doesNotMatch(account, /useState\("Alexander Wright"\)/);
  assert.doesNotMatch(account, /Kensington Architectural Studio/);
  assert.doesNotMatch(account, /alexander\.wright@kensington-arch\.co\.uk/);
  assert.doesNotMatch(guest, /Lord Alexander Wright/);
  assert.doesNotMatch(appt, /e\.g\. Alexander Wright/);
});

test("HomeDashboard no longer shows a fabricated payment notification, named mason, or live weather claim", async () => {
  const dash = await readCode("src/components/HomeDashboard.tsx");
  assert.doesNotMatch(dash, /Payment Received \(£4,250\.00\)/);
  assert.doesNotMatch(dash, /Marco Bellini/);
  assert.doesNotMatch(dash, /London, UK: <strong>22°C<\/strong> Clear/);
  assert.doesNotMatch(dash, /Quote_SMC_8821_Kensington\.pdf/);
  assert.doesNotMatch(dash, /SMC_Client_Contract_Signoff\.pdf/);
  assert.doesNotMatch(dash, /BS_EN_1469_Warranty_Certificate\.pdf/);
  assert.doesNotMatch(dash, /15% Off Waterfall Edge Profiles/);
  assert.doesNotMatch(dash, /Earn £250 Credit Per Referred Client/);
  assert.doesNotMatch(dash, /Credits Earned: <strong className="text-gold">£750\.00<\/strong>/);
  assert.doesNotMatch(dash, /Unlock Extended Warranty/);
  assert.doesNotMatch(dash, /warranty file SMC-PRO-8842/);
  assert.match(dash, /const recentDocuments: \{ name: string; type: string; date: string; size: string \}\[\] = \[\];/);
  assert.match(dash, /No documents yet\./);
  assert.match(dash, /No activity yet\./);
});

test("FinanceCalculatorModal no longer advertises fabricated APR rates or fakes a finance pre-approval", async () => {
  const finance = await readCode("src/components/FinanceCalculatorModal.tsx");
  assert.doesNotMatch(finance, /4\.9% APR/);
  assert.doesNotMatch(finance, /6\.9% APR/);
  assert.doesNotMatch(finance, /0% APR Interest-Free/);
  assert.doesNotMatch(finance, /instant finance pre-approval reference has been generated/);
  assert.doesNotMatch(finance, /Apply for Finance Pre-Approval/);
  assert.match(finance, /Financing options are not currently available\./);
});

test("PrivacyPolicyView no longer states an unverified Companies House number, ICO registration, or office address", async () => {
  const policy = await readCode("src/components/PrivacyPolicyView.tsx");
  assert.doesNotMatch(policy, /08924102/);
  assert.doesNotMatch(policy, /ZB394019/);
  assert.doesNotMatch(policy, /12 Hans Crescent/);
  assert.doesNotMatch(policy, /lifetime stone warranty/);
  assert.match(policy, /Not yet registered/);
});

test("StripePaymentGateway no longer defaults a fabricated cardholder identity or amount, and cannot simulate a successful payment", async () => {
  const stripe = await readCode("src/components/StripePaymentGateway.tsx");
  assert.doesNotMatch(stripe, /Lord Alastair Crawford/);
  assert.doesNotMatch(stripe, /alastair@kensington-estates\.co\.uk/);
  assert.doesNotMatch(stripe, /SMC-QUO-8842/);
  assert.doesNotMatch(stripe, /PAYMENT SUCCESSFUL/);
  assert.doesNotMatch(stripe, /Official Stripe Transaction Receipt/);
  assert.doesNotMatch(stripe, /3D Secure/);
  assert.doesNotMatch(stripe, /cardNumber/);
  assert.match(stripe, /Payments Not Currently Available/);
});

test("TermsAndPrivacyModal no longer exposes a direct Stripe Payment Gateway tab or an 'Accept & Close' acceptance action", async () => {
  const modal = await readCode("src/components/TermsAndPrivacyModal.tsx");
  assert.doesNotMatch(modal, /Stripe Payment Gateway/);
  assert.doesNotMatch(modal, /"stripe"/);
  assert.doesNotMatch(modal, /Accept & Close/);
  assert.doesNotMatch(modal, /processed via tokenized Stripe endpoints/);
});

test("UnifiedCustomerInbox no longer seeds fabricated conversation threads or a fabricated staff sender name", async () => {
  const inbox = await readCode("src/components/UnifiedCustomerInbox.tsx");
  assert.doesNotMatch(inbox, /Alexander Wright/);
  assert.doesNotMatch(inbox, /Lady Sarah Spencer/);
  assert.doesNotMatch(inbox, /David Vance \(3D Templater\)/);
  assert.doesNotMatch(inbox, /James Sterling \(SMC Pro\)/);
  assert.match(inbox, /const INITIAL_THREADS: ConversationThread\[\] = \[\];/);
  assert.match(inbox, /No conversations yet\./);
});

test("ProjectTimelineVisualizer no longer assigns a fabricated named technical lead or a fabricated warranty-issuance claim", async () => {
  const timeline = await readCode("src/components/ProjectTimelineVisualizer.tsx");
  assert.doesNotMatch(timeline, /Marcus L\. \(LiDAR Specialist\)/);
  assert.doesNotMatch(timeline, /M\. Davies \(Master Mason\)/);
  assert.doesNotMatch(timeline, /warranty issuance/);
});

test("StaffCrewManagementView and InteractiveCalendarGrid no longer seed fabricated staff, CSCS numbers, or scheduled tasks", async () => {
  const staff = await readCode("src/components/StaffCrewManagementView.tsx");
  const calendar = await readCode("src/components/InteractiveCalendarGrid.tsx");
  assert.doesNotMatch(staff, /James Sterling/);
  assert.doesNotMatch(staff, /David Vance/);
  assert.doesNotMatch(staff, /Viktor Kowalski/);
  assert.doesNotMatch(staff, /CSCS-9842019/);
  assert.match(staff, /const INITIAL_STAFF: StaffMember\[\] = \[\];/);
  assert.doesNotMatch(calendar, /Spencer Hall Estate/);
  assert.doesNotMatch(calendar, /James Sterling \+ Mark Reynolds/);
  assert.match(calendar, /const INITIAL_SCHEDULE: ScheduledTask\[\] = \[\];/);
});

test("FinancialCommandView no longer seeds fabricated luxury-project ledgers or runs a live fake-success payment flow", async () => {
  const fin = await readCode("src/components/FinancialCommandView.tsx");
  assert.doesNotMatch(fin, /VILLA VERDE ESTATE/);
  assert.doesNotMatch(fin, /BELGRAVIA ESTATE TOWNHOUSE/);
  assert.doesNotMatch(fin, /ONE HYDE PARK PENTHOUSE/);
  assert.doesNotMatch(fin, /verified successfully/);
  assert.doesNotMatch(fin, /SMC Escrow Guarantee Account/);
  assert.doesNotMatch(fin, /Download Certified PDF/);
  assert.match(fin, /not currently available/);
});

test("PublishingCommandCenterView no longer fakes an instant live deployment launch", async () => {
  const pub = await readCode("src/components/PublishingCommandCenterView.tsx");
  assert.doesNotMatch(pub, /DEPLOYMENT LIVE/);
  assert.doesNotMatch(pub, /SYSTEM DEPLOYED & LIVE/);
  assert.doesNotMatch(pub, /SW3-KENSINGTON-3920/);
  assert.doesNotMatch(pub, /FINAL LAUNCH SEQUENCE EXECUTED/);
  assert.doesNotMatch(pub, /useState<number>\(85\)/);
  assert.match(pub, /not currently available/);
});

test("SiteReadinessView no longer fakes an AI substrate scan or a warranty-guarantee claim", async () => {
  const site = await readCode("src/components/SiteReadinessView.tsx");
  assert.doesNotMatch(site, /Scan Analyzed Successfully/);
  assert.doesNotMatch(site, /Master Mason Vision AI/);
  assert.doesNotMatch(site, /±1\.4mm variance/);
  assert.doesNotMatch(site, /guarantee SMC 15-year structural stone warranty/);
});

test("TechnicalLibraryView no longer claims fabricated stock status or unverified ISO/ASTM/BS certification", async () => {
  const lib = await readCode("src/components/TechnicalLibraryView.tsx");
  assert.doesNotMatch(lib, /stockStatus/);
  assert.doesNotMatch(lib, /"IN STOCK"/);
  assert.doesNotMatch(lib, /ISO 10545-13/);
  assert.doesNotMatch(lib, /ASTM C119 Compliant/);
  assert.doesNotMatch(lib, /BS 5385 Certified/);
  assert.doesNotMatch(lib, /ISO 9001 Certified/);
  assert.doesNotMatch(lib, /PDF Download Started/);
});

test("ProjectVelocityChart no longer claims a fabricated certification badge", async () => {
  const chart = await readCode("src/components/ProjectVelocityChart.tsx");
  assert.doesNotMatch(chart, /BS Guild Certified/);
});

test("RenovationQuiz no longer advertises fabricated reward points or a certificate of mastery", async () => {
  const quiz = await readCode("src/components/RenovationQuiz.tsx");
  assert.doesNotMatch(quiz, /CERTIFICATE OF MASTERY/);
  assert.doesNotMatch(quiz, /Quiz Reward/);
  assert.doesNotMatch(quiz, /trade vault points/);
  assert.doesNotMatch(quiz, /Trade Rank Achieved/);
  assert.doesNotMatch(quiz, /Master Surface Specialist/);
});

test("BulkDimensionImportModal, JointDetailsView, and ProjectCommandView no longer claim fabricated certification, verification scores, or a fabricated named fabricator", async () => {
  const bulk = await readCode("src/components/BulkDimensionImportModal.tsx");
  const joint = await readCode("src/components/JointDetailsView.tsx");
  const cmd = await readCode("src/components/ProjectCommandView.tsx");
  assert.doesNotMatch(bulk, /BS EN 1469 Verified Data Pipeline/);
  assert.doesNotMatch(joint, /99\.4% compliant/);
  assert.doesNotMatch(joint, /TIGHT SEAM PASS/);
  assert.doesNotMatch(joint, /SMC-CHK-904/);
  assert.doesNotMatch(cmd, /Marcus L\./);
  assert.doesNotMatch(cmd, /Mayfair Penthouse #ALPHA-7/);
  assert.doesNotMatch(cmd, /Direct response expected < 15 mins/);
});

// =======================================================================
// Honest unavailable / "Price on Application" / "Request Quote" copy renders
// =======================================================================

test("purged catalog and slab views show honest 'Price on Application' copy instead of a fabricated price", async () => {
  const app = await readCode("src/App.tsx");
  const shop = await readCode("src/components/ArtisanShopView.tsx");
  const curator = await readCode("src/components/DigitalCuratorView.tsx");
  const bulk = await readCode("src/components/BulkSlabReserveView.tsx");
  for (const [name, content] of [["App.tsx", app], ["ArtisanShopView.tsx", shop], ["DigitalCuratorView.tsx", curator], ["BulkSlabReserveView.tsx", bulk]]) {
    assert.match(content, /Price on Application/, `${name} should render honest "Price on Application" copy`);
  }
});

test("reservation/provenance/dispatch/exhibition/finance views show an honest unavailable state", async () => {
  const bulk = await readCode("src/components/BulkSlabReserveView.tsx");
  assert.match(bulk, /Block reservations are not currently available\. Contact SMC to arrange a reservation for your project\./);

  const provenance = await readCode("src/components/GeologicalProvenanceView.tsx");
  assert.match(provenance, /Geological provenance records are not currently available\./);

  const quote = await readCode("src/components/QuoteSummary.tsx");
  assert.match(quote, /Dispatch unavailable\./);
  assert.match(quote, /Emailing this quote is not currently available\./);

  const exhibition = await readCode("src/components/ExhibitionWalkthroughView.tsx");
  assert.match(exhibition, /Contact SMC to request the specs, CAD files, and slab telemetry logs on file/);

  const financial = await readCode("src/components/FinancialCommandView.tsx");
  assert.match(financial, /not currently available/);

  const publishing = await readCode("src/components/PublishingCommandCenterView.tsx");
  assert.match(publishing, /not currently available/);
});

test("empty CRM/audit-log/staff/schedule/inbox seeds render an honest empty state rather than a fabricated £0 total", async () => {
  const crm = await readCode("src/components/CrmPipelineView.tsx");
  assert.match(crm, /"No leads yet"/);

  const hub = await readCode("src/components/DataComplianceHub.tsx");
  assert.match(hub, /No audit events recorded yet\./);
  assert.match(hub, /Not yet registered/);
  assert.match(hub, /Not yet audited/);

  const staff = await readCode("src/components/StaffCrewManagementView.tsx");
  assert.match(staff, /No staff registered yet\./);

  const calendar = await readCode("src/components/InteractiveCalendarGrid.tsx");
  assert.match(calendar, /No site activity scheduled yet\./);

  const inbox = await readCode("src/components/UnifiedCustomerInbox.tsx");
  assert.match(inbox, /No conversations yet\./);
});

test("fabrication yield reports show 'Not yet recorded' instead of a guessed percentage", async () => {
  const report = await readCode("src/components/SlabYieldGranularReport.tsx");
  assert.match(report, /Not yet recorded/);

  const chart = await readCode("src/components/SlabYieldSummaryChart.tsx");
  assert.match(chart, /Not yet recorded/);

  const app = await readCode("src/App.tsx");
  assert.match(app, /materialYieldPct: 0/);
  assert.match(app, /"Not yet recorded"/);
});

// =======================================================================
// Payment, reservation, signature, certificate-generation, and
// fake-success controls are absent
// =======================================================================

test("no fake-success payment/order/reservation confirmations remain in the purged files", async () => {
  const files = [
    "src/App.tsx",
    "src/components/ArtisanShopView.tsx",
    "src/components/BulkSlabReserveView.tsx",
    "src/components/GeologicalProvenanceView.tsx",
    "src/components/QuoteSummary.tsx",
    "src/components/ExhibitionWalkthroughView.tsx",
    "src/components/DataComplianceHub.tsx",
    "src/components/StripePaymentGateway.tsx",
    "src/components/FinancialCommandView.tsx",
    "src/components/PublishingCommandCenterView.tsx",
    "src/components/SiteReadinessView.tsx",
    "src/components/JointDetailsView.tsx",
    "src/components/ProjectCommandView.tsx",
    "src/components/FinanceCalculatorModal.tsx"
  ];
  const bannedPhrases = [
    /successfully reserved for fabrication/,
    /successfully transferred on L2 blockchain/,
    /MINT STONE TOKEN/,
    /DOWNLOAD CERTIFICATE/,
    /Certificate .* generated and (saved|emailed)/,
    /downloaded successfully/,
    /Architectural Specs Package downloaded successfully/,
    /Audit Exported/,
    /Client Copy Dispatched/,
    /PAYMENT SUCCESSFUL/,
    /verified successfully/,
    /DEPLOYMENT LIVE/,
    /Scan Analyzed Successfully/,
    /instant finance pre-approval reference has been generated/
  ];
  for (const path of files) {
    const content = await readCode(path);
    for (const phrase of bannedPhrases) {
      assert.doesNotMatch(content, phrase, `${path} should not contain fake-success phrase ${phrase}`);
    }
  }
});

test("ArtisanShopView's checkout no longer fabricates a completed order after the disabled guard", async () => {
  const shop = await readCode("src/components/ArtisanShopView.tsx");
  assert.match(
    shop,
    /Checkout is unavailable until the production payment and order integrations are configured\./
  );
  assert.doesNotMatch(shop, /SMC Dedicated White-Glove Transit/);
  assert.doesNotMatch(shop, /DPD Specialist Freight/);
});

test("checkout form fields no longer pre-fill a fabricated customer identity", async () => {
  const shop = await readCode("src/components/ArtisanShopView.tsx");
  assert.doesNotMatch(shop, /useState\("Sir Alex Vance"\)/);
  assert.doesNotMatch(shop, /useState\("trade@smcpro\.co\.uk"\)/);
});

// =======================================================================
// Allowlisted full-src static scan
//
// A broader safety net independent of the per-file assertions above: walks
// every .ts/.tsx file under src/ and fails if any of the most distinctive
// fabricated literals discovered across both Gate 0 commits appear outside
// a documentation comment. This intentionally uses specific, multi-word,
// distinctive strings (fabricated names, fake reference codes, fake
// receipts) rather than broad patterns like /£[0-9]/ or /price/i, so it
// does not flag legitimate currency-formatting infrastructure (e.g.
// formatCurrency helpers) or real user-entered values. Files that
// legitimately quote these strings as documentation (this test file, the
// bundle scanner, and each purged file's own explanatory comments) are
// excluded from the scan or read comment-stripped, matching readCode()
// above.
// =======================================================================

const ALLOWLISTED_PATHS = [
  // This test file and its sibling intentionally reference the banned
  // literals in assertions/strings, not as live fabricated content.
  "tests/phase5-gate0-commit2-content-purge.test.mjs",
  "tests/phase5-gate0-commit1-production-safety.test.mjs",
  // The bundle scanner's own banned-literal list necessarily quotes them.
  "scripts/scan-bundle-for-fabricated-content.mjs"
];

const FULL_SRC_BANNED_LITERALS = [
  "Alexander Wright",
  "Lady Sarah Spencer",
  "Marcus Vance",
  "Dr. Oliver Harris",
  "Victoria Sterling",
  "Sir Alex Vance",
  "James Sterling (Senior Mason)",
  "David Vance (Chief Templater)",
  "Sophie Taylor (Sales Director)",
  "Mark Reynolds (Site Lead)",
  "M. Davies (Master Mason)",
  "A. Hughes (Edge Finishing Specialist)",
  "S. Patel (Quality Assurance Inspector)",
  "C. Thorne (Sintered Stone Tech)",
  "R. Sterling (CNC Operator)",
  "Lord Alastair Crawford",
  "Lord Alexander Wright",
  "Marco Bellini",
  "Viktor Kowalski",
  "Marcus L. (LiDAR Specialist)",
  "271,500",
  "42 Park Lane, Mayfair",
  "ZB394019",
  "08924102",
  "12 Hans Crescent",
  "BS EN 1186 food contact certified",
  "15-year structural warranty",
  "pi_3M9aL2x87Kd1009A_secret_99A",
  "SMC Thames Warehouse Ledger",
  "SMC-BATCH-VAL-9X82F1",
  "0x7f8a91c4d2e5b603a129",
  "successfully reserved for fabrication",
  "successfully transferred on L2 blockchain",
  "MINT STONE TOKEN",
  "DOWNLOAD CERTIFICATE",
  "SMC-EXHIBIT-2026-99A",
  "Prism-Core Auto-Quote complete",
  "Client Copy Dispatched",
  "142 Slabs Available",
  "Payment Received (£4,250.00)",
  "Earn £250 Credit Per Referred Client",
  "warranty file SMC-PRO-8842",
  "instant finance pre-approval reference has been generated",
  "£255 — Save 15%",
  "FREE £0",
  "Transit Damage Guarantee Insurance",
  "4242 4242 4242 4242",
  "GB88 BARC 2000 0088 9420 19",
  "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  "VILLA VERDE ESTATE",
  "BELGRAVIA ESTATE TOWNHOUSE",
  "ONE HYDE PARK PENTHOUSE",
  "SMC Escrow Guarantee Account",
  "SW3-KENSINGTON-3920",
  "FINAL LAUNCH SEQUENCE EXECUTED",
  "Master Mason Vision AI",
  "TIGHT SEAM PASS",
  "SMC-CHK-904",
  "Mayfair Penthouse #ALPHA-7",
  "CERTIFICATE OF MASTERY",
  "PAYMENT SUCCESSFUL"
];

async function walkSrcFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkSrcFiles(full)));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

test("allowlisted full-src scan: no known fabricated literal survives anywhere under src/ outside documentation comments", async () => {
  const srcDir = fileURLToPath(new URL("../src", import.meta.url));
  const repoRoot = fileURLToPath(new URL("..", import.meta.url));
  const files = await walkSrcFiles(srcDir);
  assert.ok(files.length > 50, "sanity check: expected to find the project's source files");

  const findings = [];
  for (const file of files) {
    const relPath = relative(repoRoot, file).replace(/\\/g, "/");
    if (ALLOWLISTED_PATHS.includes(relPath)) continue;

    const raw = await readFile(file, "utf8");
    const code = stripComments(raw);
    for (const literal of FULL_SRC_BANNED_LITERALS) {
      if (code.includes(literal)) {
        findings.push(`${relPath}: "${literal}"`);
      }
    }
  }

  assert.deepEqual(findings, [], `Found fabricated literal(s) outside documentation comments:\n${findings.join("\n")}`);
});
