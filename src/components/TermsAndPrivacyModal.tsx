import React, { useState } from "react";
import { X, ShieldCheck, Lock, FileText, CheckCircle2, Sliders, Sparkles, CreditCard } from "lucide-react";
import PrivacyPolicyView from "./PrivacyPolicyView";
import TermsOfServiceView from "./TermsOfServiceView";
import DataComplianceHub from "./DataComplianceHub";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "summary" | "privacy" | "terms" | "compliance";
}

/**
 * Phase 5 Gate 0 purge (correction pass): this modal previously had its own
 * "Stripe Payment Gateway" tab, giving any visitor who opened it (via the
 * footer Terms/Privacy links or the cookie banner) a direct, un-gated path
 * to the live payment form regardless of whether TermsOfServiceView's own
 * trigger was disabled. That tab is removed — payments are not reachable
 * from this modal at all now, not just disabled once opened.
 */
export const TermsAndPrivacyModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  initialTab = "summary"
}) => {
  const [activeTab, setActiveTab] = useState<"summary" | "privacy" | "terms" | "compliance">(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-[#D4AF37]/40 text-white rounded-2xl p-6 md:p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto space-y-6 relative shadow-2xl custom-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer z-10"
          title="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-4 pr-10">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-3.5 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "summary"
                ? "bg-[#D4AF37] text-black shadow-md"
                : "bg-neutral-900 text-neutral-400 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("privacy")}
            className={`px-3.5 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "privacy"
                ? "bg-[#D4AF37] text-black shadow-md"
                : "bg-neutral-900 text-neutral-400 hover:text-white"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setActiveTab("terms")}
            className={`px-3.5 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "terms"
                ? "bg-[#D4AF37] text-black shadow-md"
                : "bg-neutral-900 text-neutral-400 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Use</span>
          </button>

          <button
            onClick={() => setActiveTab("compliance")}
            className={`px-3.5 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "compliance"
                ? "bg-[#D4AF37] text-black shadow-md"
                : "bg-neutral-900 text-neutral-400 hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Data Compliance & DSAR</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "summary" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-xl md:text-2xl font-bold text-white tracking-tight">
                  SMC PRO Governance & Compliance Hub
                </h3>
                <p className="text-xs font-mono text-[#D4AF37] uppercase tracking-wider">
                  Production privacy configuration requires verification
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-sans text-neutral-300 leading-relaxed">
              <section className="bg-black/40 p-4 rounded-xl border border-neutral-800 space-y-2">
                <h4 className="font-serif text-sm font-semibold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#D4AF37]" /> 1. Data Encryption & Confidentiality
                </h4>
                <p>
                  Production hosting, encryption, retention, and access controls depend on the selected backend provider and must be verified before customer data is enabled.
                </p>
              </section>

              <section className="bg-black/40 p-4 rounded-xl border border-neutral-800 space-y-2">
                <h4 className="font-serif text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#D4AF37]" /> 2. UK GDPR & Cookie Usage
                </h4>
                <p>
                  Under the Data Protection Act 2018 and UK GDPR, SMC Pro collects only necessary operational telemetry to provide live project tracking, AR slab calibration, and automated WhatsApp communication. We never sell or transfer partner data to third-party ad networks.
                </p>
              </section>

              <section className="bg-black/40 p-4 rounded-xl border border-neutral-800 space-y-2">
                <h4 className="font-serif text-sm font-semibold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#D4AF37]" /> 3. Payment integration pending
                </h4>
                <p>
                  Online payment processing is not currently available. Payment methods and card-data handling will be documented here once a production payment provider is configured.
                </p>
              </section>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-800">
              <span className="text-[10px] font-mono text-neutral-400">
                Draft — pending final UK legal review
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab("privacy")}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs py-2.5 px-4 rounded-xl uppercase tracking-wider cursor-pointer border border-neutral-700"
                >
                  View Full Privacy Policy
                </button>
                <button
                  onClick={onClose}
                  className="bg-[#D4AF37] hover:bg-amber-400 text-black font-mono font-bold text-xs py-2.5 px-6 rounded-xl uppercase tracking-wider cursor-pointer shadow-md transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "privacy" && (
          <PrivacyPolicyView
            onOpenComplianceHub={() => setActiveTab("compliance")}
          />
        )}

        {activeTab === "terms" && (
          <TermsOfServiceView />
        )}

        {activeTab === "compliance" && (
          <DataComplianceHub />
        )}
      </div>
    </div>
  );
};
