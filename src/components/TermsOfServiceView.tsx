import React, { useState } from "react";
import {
  FileText,
  ShieldAlert,
  CheckCircle,
  Scale,
  Award,
  Download,
  Building2,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles
} from "lucide-react";

interface TermsOfServiceViewProps {
  onBackToApp?: () => void;
  onOpenStripePayment?: () => void;
}

export default function TermsOfServiceView({
  onBackToApp,
  onOpenStripePayment
}: TermsOfServiceViewProps) {
  const [openSection, setOpenSection] = useState<string | null>("term-1");
  const [agreed, setAgreed] = useState(false);

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in text-neutral-100 pb-16">
      {/* Top Banner */}
      <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 opacity-5 pointer-events-none">
          <Scale className="w-96 h-96 text-[#D4AF37]" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> SMC PRO • BRITISH TRADE & CONSUMER TERMS
            </span>
            <span className="bg-neutral-800 text-neutral-300 border border-neutral-700 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest">
              JURISDICTION: ENGLAND & WALES
            </span>
          </div>

          <h1 className="font-serif text-3xl md:text-5xl font-bold text-white tracking-tight">
            Terms of Use & Fabrication Contract
          </h1>

          <p className="text-neutral-300 text-sm md:text-base max-w-3xl leading-relaxed">
            These terms govern all architectural stone estimates, laser templating surveys, CNC slab fabrications, slab reservations, and installations conducted by Simo Marble & Construction UK Ltd.
          </p>

          <div className="pt-4 flex flex-wrap gap-4 items-center">
            {onOpenStripePayment && (
              <button
                onClick={onOpenStripePayment}
                className="bg-[#D4AF37] hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Pay Deposit via Secure Stripe</span>
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 font-mono text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#D4AF37]" />
              <span>Download Contract PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl p-5 space-y-2">
          <div className="p-2.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] w-fit">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-white">±0.5mm Laser Accuracy</h3>
          <p className="text-xs text-neutral-400">
            Templating executed with 3D LiDAR laser sensors guarantees precision fitting within ±0.5mm tolerance.
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl p-5 space-y-2">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 w-fit">
            <CheckCircle className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-white">14-Day Quote Lock</h3>
          <p className="text-xs text-neutral-400">
            Calculated quotes locked for 14 calendar days upon initial issuance against material price fluctuations.
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl p-5 space-y-2">
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 w-fit">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-white">25-Year Stone Warranty</h3>
          <p className="text-xs text-neutral-400">
            Standard 25-year structural warranty on Quartz and Porcelain fabrications when installed on certified substrates.
          </p>
        </div>
      </div>

      {/* Contract Terms Accordion */}
      <div className="space-y-4">
        <h2 className="font-serif text-2xl text-white font-bold flex items-center gap-2 border-b border-neutral-800 pb-3">
          <FileText className="w-6 h-6 text-[#D4AF37]" />
          <span>Detailed Contract Clauses</span>
        </h2>

        {/* Term 1: Quotations & Price Locking */}
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection("term-1")}
            className="w-full p-6 text-left flex justify-between items-center hover:bg-neutral-900/60 transition-colors cursor-pointer"
          >
            <span className="font-serif text-lg font-semibold text-white">
              1. Quotations, Price Lock & Validity Period
            </span>
            {openSection === "term-1" ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
          </button>
          {openSection === "term-1" && (
            <div className="p-6 pt-0 space-y-3 text-xs text-neutral-300 leading-relaxed border-t border-neutral-800/60 mt-2">
              <p>
                All project estimates generated via SMC Pro are valid for 14 calendar days from creation. Once a 25% slab reservation deposit is cleared, material rates are locked against inflation.
              </p>
              <p>
                Estimates assume standard site access on ground or first floor. Crane lifts, hoist equipment, or restricted access in central London congestion zones are subject to additional logistics surcharges detailed prior to templating.
              </p>
            </div>
          )}
        </div>

        {/* Term 2: Material Characteristics & Vein Matching */}
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection("term-2")}
            className="w-full p-6 text-left flex justify-between items-center hover:bg-neutral-900/60 transition-colors cursor-pointer"
          >
            <span className="font-serif text-lg font-semibold text-white">
              2. Natural Stone Characteristics & Vein Variance
            </span>
            {openSection === "term-2" ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
          </button>
          {openSection === "term-2" && (
            <div className="p-6 pt-0 space-y-3 text-xs text-neutral-300 leading-relaxed border-t border-neutral-800/60 mt-2">
              <p>
                Natural stones (Marble, Granite, Quartzite) are unique products of nature. Shade variations, vein patterns, micro-fissures, and minor mineral inclusions are natural characteristics and do not constitute fabrication defects.
              </p>
              <p>
                For engineered Quartz and Sintered Porcelain, digital vein-matching algorithms optimize continuous flow across mitred waterfall edges. Customers may inspect physical RFID slabs at our Thames Bay Warehouse prior to CNC sawing.
              </p>
            </div>
          )}
        </div>

        {/* Term 3: Laser Templating & Site Preparation Requirements */}
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection("term-3")}
            className="w-full p-6 text-left flex justify-between items-center hover:bg-neutral-900/60 transition-colors cursor-pointer"
          >
            <span className="font-serif text-lg font-semibold text-white">
              3. Laser Templating & Site Readiness Requirements
            </span>
            {openSection === "term-3" ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
          </button>
          {openSection === "term-3" && (
            <div className="p-6 pt-0 space-y-3 text-xs text-neutral-300 leading-relaxed border-t border-neutral-800/60 mt-2">
              <p>
                On the scheduled laser survey date, all kitchen cabinets or vanity sub-frames must be fully fixed, level (within ±2mm over 3 metres), and rigid. Undermount sinks, hobs, and pop-up sockets must be present on site for physical measure verification.
              </p>
              <p>
                If a site visit fails due to unlevel cabinetry or missing appliances, a abortive laser survey fee of £175 + VAT will apply.
              </p>
            </div>
          )}
        </div>

        {/* Term 4: Payment Milestone Schedule */}
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection("term-4")}
            className="w-full p-6 text-left flex justify-between items-center hover:bg-neutral-900/60 transition-colors cursor-pointer"
          >
            <span className="font-serif text-lg font-semibold text-white">
              4. Payment Milestone Schedule & Escrow Terms
            </span>
            {openSection === "term-4" ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
          </button>
          {openSection === "term-4" && (
            <div className="p-6 pt-0 space-y-3 text-xs text-neutral-300 leading-relaxed border-t border-neutral-800/60 mt-2">
              <div className="bg-black/40 p-4 rounded-lg border border-neutral-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <span className="text-[#D4AF37]">Milestone 1: Slab Reservation</span>
                  <span className="text-white">25% Deposit</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <span className="text-[#D4AF37]">Milestone 2: Pre-CNC Fabrication</span>
                  <span className="text-white">50% Advance</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#D4AF37]">Milestone 3: Post-Installation Sign-off</span>
                  <span className="text-white">25% Final Balance</span>
                </div>
              </div>
              <p className="pt-2">
                All electronic card payments are processed securely via Stripe. Approved VIP Trade Partners enjoy Net 30 days credit terms subject to UK credit reference approval.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Acceptance Box */}
      <div className="bg-[#1A1A1A] border border-[#D4AF37]/40 rounded-2xl p-6 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-5 h-5 accent-[#D4AF37] rounded border-neutral-700 bg-neutral-900 cursor-pointer"
          />
          <span className="text-xs text-neutral-200">
            I confirm that I have read, understood, and accept the SMC Pro Technical Fabrication Terms of Use & Warranty Protocol.
          </span>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-neutral-800">
          <span className="text-[10px] font-mono text-neutral-500">
            Governing Law: Courts of England and Wales • Company Reg 08924102
          </span>
          {onOpenStripePayment && (
            <button
              disabled={!agreed}
              onClick={onOpenStripePayment}
              className={`font-mono text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition-all flex items-center gap-2 ${
                agreed
                  ? "bg-[#D4AF37] hover:bg-amber-400 text-black cursor-pointer shadow-lg"
                  : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700"
              }`}
            >
              <span>Proceed to Stripe Gateway</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
