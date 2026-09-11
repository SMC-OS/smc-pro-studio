import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Eye,
  FileText,
  Database,
  UserCheck,
  Globe,
  Clock,
  Download,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Mail,
  Building,
  KeyRound
} from "lucide-react";

interface PrivacyPolicyViewProps {
  onBackToApp?: () => void;
  onOpenComplianceHub?: () => void;
}

export default function PrivacyPolicyView({
  onBackToApp,
  onOpenComplianceHub
}: PrivacyPolicyViewProps) {
  const [openSection, setOpenSection] = useState<string | null>("section-1");
  const [copiedNotification, setCopiedNotification] = useState(false);

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  const copyDpoContact = () => {
    navigator.clipboard.writeText("dpo@smcpro.co.uk");
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in text-neutral-100 pb-16">
      {/* Toast */}
      {copiedNotification && (
        <div className="fixed top-24 right-6 z-50 bg-[#D4AF37] text-black px-5 py-3 rounded-lg font-mono text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>DPO email address copied to clipboard!</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 opacity-5 pointer-events-none">
          <ShieldCheck className="w-96 h-96 text-[#D4AF37]" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> UK GDPR & DPA 2018 — REVIEW PENDING
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest">
              PRODUCTION CONTROLS PENDING
            </span>
            <span className="text-neutral-500 text-xs font-mono">
              Draft — not yet in effect
            </span>
          </div>

          <h1 className="font-serif text-3xl md:text-5xl font-bold text-white tracking-tight">
            Privacy Policy & Data Security Directive
          </h1>

          <p className="text-neutral-300 text-sm md:text-base max-w-3xl leading-relaxed">
            SMC Pro Studio is designed to connect to separately configured production identity, API, storage, and payment providers. Protected data features remain unavailable until those providers and this notice are verified.
          </p>

          <div className="pt-4 flex flex-wrap gap-4 items-center">
            {onOpenComplianceHub && (
              <button
                onClick={onOpenComplianceHub}
                className="bg-[#D4AF37] hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Manage Privacy & Data Rights</span>
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 font-mono text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#D4AF37]" />
              <span>Export PDF Policy Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl p-5 space-y-2">
          <div className="p-2.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] w-fit">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-white">Encryption at Rest</h3>
          <p className="text-xs text-neutral-400">
            Storage encryption, retention, access controls, and deletion procedures must be confirmed for the selected production provider.
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl p-5 space-y-2">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 w-fit">
            <Eye className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-white">Zero Data Sale</h3>
          <p className="text-xs text-neutral-400">
            We never sell, monetise, or share project metrics with external advertising networks.
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl p-5 space-y-2">
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 w-fit">
            <Globe className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-white">UK Data Residency</h3>
          <p className="text-xs text-neutral-400">
            Hosting location, subprocessors, certifications, and transport controls will be documented after the production backend is selected.
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl p-5 space-y-2">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 w-fit">
            <UserCheck className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-white">Full DSAR Rights</h3>
          <p className="text-xs text-neutral-400">
            Instant right to access, rectify, or purge project records within 30 days under UK GDPR.
          </p>
        </div>
      </div>

      {/* Accordion Policy Breakdown */}
      <div className="space-y-4">
        <h2 className="font-serif text-2xl text-white font-bold flex items-center gap-2 border-b border-neutral-800 pb-3">
          <FileText className="w-6 h-6 text-[#D4AF37]" />
          <span>Full Legal & Operational Breakdown</span>
        </h2>

        {/* Section 1: Data Controller & Scope */}
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl overflow-hidden transition-all">
          <button
            onClick={() => toggleSection("section-1")}
            className="w-full p-6 text-left flex justify-between items-center hover:bg-neutral-900/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-[#D4AF37]" />
              <span className="font-serif text-lg font-semibold text-white">
                1. Data Controller Identification & Operational Scope
              </span>
            </div>
            {openSection === "section-1" ? (
              <ChevronUp className="w-5 h-5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-400" />
            )}
          </button>

          {openSection === "section-1" && (
            <div className="p-6 pt-0 space-y-4 text-xs text-neutral-300 leading-relaxed border-t border-neutral-800/60 mt-2">
              <p>
                SMC Pro Studio (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is the Data Controller responsible for personal data processed through our online web application, mobile AR survey tools, CNC manufacturing telemetry links, and WhatsApp messaging concierge.
              </p>
              <div className="bg-black/50 p-4 rounded-lg border border-neutral-800 space-y-2 font-mono text-[11px]">
                <div><span className="text-[#D4AF37]">Data Controller Name:</span> Not yet registered</div>
                <div><span className="text-[#D4AF37]">UK Companies House Ref:</span> Not yet registered</div>
                <div><span className="text-[#D4AF37]">ICO Registration Ref:</span> Not yet registered</div>
                <div><span className="text-[#D4AF37]">Registered Head Office:</span> Not yet confirmed</div>
                <div><span className="text-[#D4AF37]">Data Protection Officer (DPO):</span> <button onClick={copyDpoContact} className="underline hover:text-white text-emerald-400 cursor-pointer">dpo@smcpro.co.uk</button></div>
              </div>
              <p className="text-neutral-500 text-[11px]">
                These company registration details are pending final UK legal review and will be confirmed before this policy takes effect.
              </p>
            </div>
          )}
        </div>

        {/* Section 2: Data Types Collected */}
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl overflow-hidden transition-all">
          <button
            onClick={() => toggleSection("section-2")}
            className="w-full p-6 text-left flex justify-between items-center hover:bg-neutral-900/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-[#D4AF37]" />
              <span className="font-serif text-lg font-semibold text-white">
                2. Categories of Information Processed
              </span>
            </div>
            {openSection === "section-2" ? (
              <ChevronUp className="w-5 h-5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-400" />
            )}
          </button>

          {openSection === "section-2" && (
            <div className="p-6 pt-0 space-y-4 text-xs text-neutral-300 leading-relaxed border-t border-neutral-800/60 mt-2">
              <p>
                We collect data required to generate architectural quotes, schedule 3D laser templating, reserve physical stone slabs, and process payments:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-white">Customer Identification:</strong> Full name, billing address, site delivery address, phone number, and verified trade VAT credentials.</li>
                <li><strong className="text-white">Architectural Specifications:</strong> CAD floor plans, laser point cloud meshes, slab dimensions, sink cutout specifications, and edge profile preferences.</li>
                <li><strong className="text-white">Payment Telemetry:</strong> Stripe payment tokens, transaction IDs, invoice balance receipts, and escrow status. Card numbers are tokenised directly by Stripe and never enter SMC Pro servers.</li>
                <li><strong className="text-white">Technical Device Logs:</strong> Browser user agent, IP address, AR camera calibration metrics, and telemetry timestamp for fraud prevention.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Section 3: Payment Gateway & Stripe Processing */}
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl overflow-hidden transition-all">
          <button
            onClick={() => toggleSection("section-3")}
            className="w-full p-6 text-left flex justify-between items-center hover:bg-neutral-900/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-[#D4AF37]" />
              <span className="font-serif text-lg font-semibold text-white">
                3. Financial Security & Stripe Payment Gateway Compliance
              </span>
            </div>
            {openSection === "section-3" ? (
              <ChevronUp className="w-5 h-5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-400" />
            )}
          </button>

          {openSection === "section-3" && (
            <div className="p-6 pt-0 space-y-4 text-xs text-neutral-300 leading-relaxed border-t border-neutral-800/60 mt-2">
              <p>
                Payment processing for slab deposits, laser survey fees, and final fabrication balances is provided by Stripe Payments Europe, Ltd. (&quot;Stripe&quot;).
              </p>
              <p>
                Payments are currently disabled. Before activation, the Stripe integration, card-data flow, authentication requirements, and applicable compliance responsibilities must be verified and documented.
              </p>
            </div>
          )}
        </div>

        {/* Section 4: Data Retention & Purge Policy */}
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl overflow-hidden transition-all">
          <button
            onClick={() => toggleSection("section-4")}
            className="w-full p-6 text-left flex justify-between items-center hover:bg-neutral-900/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#D4AF37]" />
              <span className="font-serif text-lg font-semibold text-white">
                4. Retention Periods & Automated Data Lifecycle
              </span>
            </div>
            {openSection === "section-4" ? (
              <ChevronUp className="w-5 h-5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-400" />
            )}
          </button>

          {openSection === "section-4" && (
            <div className="p-6 pt-0 space-y-4 text-xs text-neutral-300 leading-relaxed border-t border-neutral-800/60 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/40 p-3.5 rounded-lg border border-neutral-800">
                  <span className="text-[#D4AF37] font-mono font-bold block mb-1">Unfinalised Quotes</span>
                  <p>Draft quotes and temporary dimension calculations are retained for 90 days before automated deletion.</p>
                </div>
                <div className="bg-black/40 p-3.5 rounded-lg border border-neutral-800">
                  <span className="text-[#D4AF37] font-mono font-bold block mb-1">Contractual & Tax Invoices</span>
                  <p>Invoices, signed slab agreements, and payment logs retained for 7 years to comply with UK HMRC accounting regulations.</p>
                </div>
                <div className="bg-black/40 p-3.5 rounded-lg border border-neutral-800">
                  <span className="text-[#D4AF37] font-mono font-bold block mb-1">3D LiDAR Survey Scans</span>
                  <p>Laser point cloud meshes are retained to support future service and repair requests. Retention period to be confirmed.</p>
                </div>
                <div className="bg-black/40 p-3.5 rounded-lg border border-neutral-800">
                  <span className="text-[#D4AF37] font-mono font-bold block mb-1">WhatsApp Telemetry</span>
                  <p>Chat transcripts retained for 12 months for quality assurance, then permanently sanitized.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Native Device Permissions & AI Content Disclosures */}
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl overflow-hidden transition-all">
          <button
            onClick={() => toggleSection("section-5")}
            className="w-full p-6 text-left flex justify-between items-center hover:bg-neutral-900/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-[#D4AF37]" />
              <span className="font-serif text-lg font-semibold text-white">
                5. Device Permissions Rationale & AI Data Safety Disclosures
              </span>
            </div>
            {openSection === "section-5" ? (
              <ChevronUp className="w-5 h-5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-400" />
            )}
          </button>

          {openSection === "section-5" && (
            <div className="p-6 pt-0 space-y-4 text-xs text-neutral-300 leading-relaxed border-t border-neutral-800/60 mt-2">
              <p>
                To comply with Apple App Store Guideline 5.1.1 and Google Play Data Safety policies:
              </p>
              <div className="space-y-3">
                <div className="bg-black/40 p-3.5 rounded-lg border border-neutral-800 space-y-1">
                  <span className="text-[#D4AF37] font-mono font-bold block">Camera Permission Rationale</span>
                  <p>
                    Requested on-demand only when accessing AR Room Visualizer or Slab Scanner. Camera video frames are processed transiently on-device to calculate room dimensions or match marble grain patterns. No raw video feed is transmitted or stored on remote servers.
                  </p>
                </div>
                <div className="bg-black/40 p-3.5 rounded-lg border border-neutral-800 space-y-1">
                  <span className="text-[#D4AF37] font-mono font-bold block">AI Engine Data Handling (Gemini 2.5 Flash)</span>
                  <p>
                    AI prompt inputs (such as quote parameters or material requests) are processed via enterprise zero-retention API endpoints. Prompts and customer photos are never used to train public AI foundation models.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DPO Contact Card */}
      <div className="bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-white">Have Privacy Questions?</h3>
            <p className="text-xs text-neutral-400">
              Contact our UK Data Protection Officer for DSAR requests or privacy audits.
            </p>
          </div>
        </div>

        <button
          onClick={copyDpoContact}
          className="bg-[#D4AF37] hover:bg-amber-400 text-black font-mono text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition-all cursor-pointer whitespace-nowrap"
        >
          Email Data Protection Officer
        </button>
      </div>
    </div>
  );
}
