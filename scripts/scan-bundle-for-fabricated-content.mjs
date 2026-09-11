#!/usr/bin/env node
// Phase 5 Gate 0 verification: scans the production bundle (dist/) for
// literal strings known to belong to fabricated pricing/stock/identity/
// certification content removed in Commit 1 and Commit 2 of the Gate 0
// purge. Run after `npm run build`:
//
//   node scripts/scan-bundle-for-fabricated-content.mjs
//
// Exits non-zero and prints every match if anything is found.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DIST_DIR = fileURLToPath(new URL("../dist", import.meta.url));

const BANNED_LITERALS = [
  // Fabricated named individuals reused across seeds
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

  // Fabricated deal/pipeline/order values
  "271,500",
  "42 Park Lane, Mayfair",

  // Fabricated certifications / registrations
  "ZB394019",
  "BS EN 1186 food contact certified",
  "15-year structural warranty",

  // Fabricated blockchain / ledger / payment-shaped secrets
  "pi_3M9aL2x87Kd1009A_secret_99A",
  "SMC Thames Warehouse Ledger",
  "SMC-BATCH-VAL-9X82F1",
  "0x7f8a91c4d2e5b603a129",

  // Fabricated fake-success / fake-export claims
  "successfully reserved for fabrication",
  "successfully transferred on L2 blockchain",
  "MINT STONE TOKEN",
  "DOWNLOAD CERTIFICATE",
  "Official Block Allocation Certificate",
  "SMC-EXHIBIT-2026-99A",
  "Prism-Core Auto-Quote complete",
  "IMPORT LAYOUT & AUTO-FILL QUOTE",
  "Client Copy Dispatched",
  "142 Slabs Available",

  // Fabricated fixed inventory/pricing text distinctive to the removed catalog
  "Warehouse Location: London Vault #4",
  "Curator Sample Kit Dispatched",

  // Fabricated dashboard notifications / documents / perks (HomeDashboard.tsx)
  "Payment Received (£4,250.00)",
  "Marco Bellini",
  "Quote_SMC_8821_Kensington.pdf",
  "SMC_Client_Contract_Signoff.pdf",
  "BS_EN_1469_Warranty_Certificate.pdf",
  "15% Off Waterfall Edge Profiles",
  "Earn £250 Credit Per Referred Client",
  "Credits Earned",
  "Unlock Extended Warranty",
  "warranty file SMC-PRO-8842",

  // Fabricated finance product (FinanceCalculatorModal.tsx)
  "instant finance pre-approval reference has been generated",
  "Apply for Finance Pre-Approval",

  // Fabricated checkout pricing/insurance claims (ArtisanShopView.tsx)
  "£255 — Save 15%",
  "FREE £0",
  "Transit Damage Guarantee Insurance",
  "Guarantees instant zero-cost replacement",

  // Fabricated fake payment-method simulator (ArtisanShopView.tsx checkout)
  "4242 4242 4242 4242",
  "GB88 BARC 2000 0088 9420 19",
  "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  "Klarna Pay in 3 Interest-Free Installments",
  "Instant soft credit check",
  "Certificate of Authenticity & Tax Invoice generated instantly",

  // Fabricated legal/company identity (PrivacyPolicyView.tsx)
  "08924102",
  "12 Hans Crescent",
  "lifetime stone warranty",

  // Fabricated live payment gateway (StripePaymentGateway.tsx)
  "SMC-QUO-8842",
  "PAYMENT SUCCESSFUL",
  "Official Stripe Transaction Receipt",

  // Fabricated Stripe-tab exposure / acceptance action (TermsAndPrivacyModal.tsx)
  "processed via tokenized Stripe endpoints",

  // Fabricated conversation threads (UnifiedCustomerInbox.tsx)
  "David Vance (3D Templater)",

  // Fabricated technical lead / warranty issuance (ProjectTimelineVisualizer.tsx)
  "Marcus L. (LiDAR Specialist)",
  "warranty issuance",

  // Fabricated staff/schedule seeds (StaffCrewManagementView.tsx, InteractiveCalendarGrid.tsx)
  "Viktor Kowalski",
  "CSCS-9842019",
  "James Sterling + Mark Reynolds",

  // Fabricated luxury-project ledgers and live fake payment (FinancialCommandView.tsx)
  "VILLA VERDE ESTATE",
  "BELGRAVIA ESTATE TOWNHOUSE",
  "ONE HYDE PARK PENTHOUSE",
  "SMC Escrow Guarantee Account",
  "Download Certified PDF",

  // Fabricated instant-live-deployment ceremony (PublishingCommandCenterView.tsx)
  "SW3-KENSINGTON-3920",
  "FINAL LAUNCH SEQUENCE EXECUTED",
  "SYSTEM DEPLOYED & LIVE",

  // Fabricated AI substrate scan / warranty guarantee (SiteReadinessView.tsx)
  "Scan Analyzed Successfully",
  "Master Mason Vision AI",
  "guarantee SMC 15-year structural stone warranty",

  // Fabricated certification claims (TechnicalLibraryView.tsx, BulkDimensionImportModal.tsx)
  "ASTM C119 Compliant",
  "BS 5385 Certified",
  "ISO 9001 Certified",
  "BS EN 1469 Verified Data Pipeline",

  // Fabricated certification badge (ProjectVelocityChart.tsx)
  "BS Guild Certified",

  // Fabricated reward/certificate gamification (RenovationQuiz.tsx)
  "CERTIFICATE OF MASTERY",
  "Master Surface Specialist",

  // Fabricated verification score / sign-off (JointDetailsView.tsx)
  "TIGHT SEAM PASS",
  "SMC-CHK-904",

  // Fabricated named fabricator and fake chat (ProjectCommandView.tsx)
  "Mayfair Penthouse #ALPHA-7",
  "Direct response expected < 15 mins"
];

function collectFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (/\.(js|mjs|cjs|html|css|json)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const files = collectFiles(DIST_DIR);
if (files.length === 0) {
  console.error(`No bundle files found under ${DIST_DIR}. Run "npm run build" first.`);
  process.exit(2);
}

let findings = 0;
for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const literal of BANNED_LITERALS) {
    if (content.includes(literal)) {
      findings++;
      console.error(`FOUND: "${literal}" in ${file}`);
    }
  }
}

console.log(`Scanned ${files.length} bundle file(s) for ${BANNED_LITERALS.length} banned literal(s).`);
if (findings > 0) {
  console.error(`${findings} prohibited match(es) found in the production bundle.`);
  process.exit(1);
}
console.log("No prohibited fabricated content found in the production bundle.");
