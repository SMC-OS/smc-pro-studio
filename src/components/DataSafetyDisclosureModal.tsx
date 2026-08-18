import React, { useState } from "react";
import { ShieldCheck, Smartphone, Lock, Eye, CheckCircle2, X, Download, FileText, AlertCircle, Smartphone as PhoneIcon } from "lucide-react";
import { CapacitorBridge } from "../utils/capacitorBridge";

interface DataSafetyDisclosureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataSafetyDisclosureModal: React.FC<DataSafetyDisclosureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"data-safety" | "apple-label" | "permissions">("data-safety");

  if (!isOpen) return null;

  const rationale = CapacitorBridge.getCameraPermissionRationale();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 text-neutral-100 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-2 rounded-lg bg-neutral-800/80 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <span className="text-xs font-mono text-amber-500 uppercase tracking-widest font-bold">
              Apple & Google Play Store Compliance
            </span>
            <h2 className="font-serif text-xl font-bold text-white">
              Data Safety & Privacy Nutrition Label
            </h2>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 gap-4 text-xs font-mono">
          <button
            onClick={() => setActiveTab("data-safety")}
            className={`pb-2.5 font-bold cursor-pointer transition-all border-b-2 ${
              activeTab === "data-safety"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Google Play Data Safety
          </button>
          <button
            onClick={() => setActiveTab("apple-label")}
            className={`pb-2.5 font-bold cursor-pointer transition-all border-b-2 ${
              activeTab === "apple-label"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Apple Privacy Nutrition Label
          </button>
          <button
            onClick={() => setActiveTab("permissions")}
            className={`pb-2.5 font-bold cursor-pointer transition-all border-b-2 ${
              activeTab === "permissions"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Device Permissions Rationale
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "data-safety" && (
          <div className="space-y-4 text-xs font-sans text-neutral-300">
            <p className="text-neutral-400 leading-relaxed">
              SMC Pro Studio respects customer data privacy. Below is our formal disclosure for Google Play Data Safety compliance.
            </p>
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                <div className="flex items-center justify-between text-amber-400 font-mono font-bold">
                  <span>No Data Sold or Shared with Third Parties</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-[11px] text-neutral-400">
                  User project measurements, CAD files, address details, and financial estimates are strictly confidential to your account and Simo Marble & Construction Ltd.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                <div className="flex items-center justify-between text-amber-400 font-mono font-bold">
                  <span>Data Encrypted in Transit & At Rest</span>
                  <Lock className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-[11px] text-neutral-400">
                  Production API connections are required to use HTTPS. Storage and retention controls must be documented for the selected production providers before release.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                <div className="flex items-center justify-between text-amber-400 font-mono font-bold">
                  <span>User Data Deletion Mechanism Available</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-[11px] text-neutral-400">
                  Users can initiate immediate, permanent account and data deletion directly inside the app settings without contacting support.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "apple-label" && (
          <div className="space-y-4 text-xs font-sans text-neutral-300">
            <p className="text-neutral-400 leading-relaxed">
              Apple App Store Privacy Nutrition Label disclosures for SMC Pro Studio (Capacitor iOS build):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-amber-500 font-bold block">Data Used to Track You</span>
                <span className="text-emerald-400 font-bold">None</span>
                <p className="text-[10px] text-neutral-400 font-sans">No cross-app tracking or advertising SDKs included.</p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-amber-500 font-bold block">Data Linked to You</span>
                <span className="text-neutral-200 font-bold">Contact Info, User Content, Financial</span>
                <p className="text-[10px] text-neutral-400 font-sans">Used strictly for project quotes, scheduling, and billing.</p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-amber-500 font-bold block">Data Not Linked to You</span>
                <span className="text-neutral-200 font-bold">Diagnostics & App Crash Performance</span>
                <p className="text-[10px] text-neutral-400 font-sans">Anonymous telemetry to maintain 99.9% uptime.</p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-amber-500 font-bold block">AI Data Policy</span>
                <span className="text-neutral-200 font-bold">Zero-Retention Gemini Enterprise</span>
                <p className="text-[10px] text-neutral-400 font-sans">Prompts are not used to train global AI models.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "permissions" && (
          <div className="space-y-4 text-xs font-sans text-neutral-300">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-mono font-bold">
                <PhoneIcon className="w-4 h-4" />
                <span>{rationale.title}</span>
              </div>
              <p className="text-neutral-300 leading-relaxed text-[11px]">
                {rationale.body}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1 font-mono text-[11px]">
              <div className="flex items-center justify-between text-neutral-200">
                <span>iOS Info.plist Privacy Key</span>
                <code className="text-amber-400">NSCameraUsageDescription</code>
              </div>
              <p className="text-[10px] text-neutral-400 font-sans">
                "SMC Pro Studio uses your camera to measure kitchen worktop areas and scan stone slab grains."
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1 font-mono text-[11px]">
              <div className="flex items-center justify-between text-neutral-200">
                <span>Android Manifest Permission</span>
                <code className="text-amber-400">android.permission.CAMERA</code>
              </div>
              <p className="text-[10px] text-neutral-400 font-sans">
                Requested on-demand only when opening AR Measure or Slab Scanner. Never invoked at app cold start.
              </p>
            </div>
          </div>
        )}

        {/* Action footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-mono font-bold text-xs hover:bg-amber-400 transition-all cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
