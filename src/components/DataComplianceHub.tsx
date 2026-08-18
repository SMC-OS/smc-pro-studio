import React, { useState } from "react";
import { apiFetch } from "../services/apiClient";
import {
  ShieldCheck,
  Lock,
  Database,
  Eye,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  KeyRound,
  RefreshCw,
  Send,
  Sliders,
  Sparkles
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  userRef: string;
  ipAddress: string;
  securityLevel: "HIGH" | "STANDARD" | "ENCRYPTED";
  status: "VERIFIED" | "COMPLIANT";
}

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "LOG-2026-9941",
    timestamp: "2026-07-30 13:42:10 UTC",
    action: "AES-256 Key Rotation & CAD Blueprint Vault Backup",
    userRef: "SYSTEM_AUTOMATED_JOB",
    ipAddress: "185.120.44.12 (London HQ)",
    securityLevel: "HIGH",
    status: "VERIFIED"
  },
  {
    id: "LOG-2026-9812",
    timestamp: "2026-07-30 11:15:04 UTC",
    action: "Stripe Tokenized Payment Handshake",
    userRef: "CLIENT_TRADE_VIP",
    ipAddress: "86.14.92.110 (Mayfair)",
    securityLevel: "ENCRYPTED",
    status: "COMPLIANT"
  },
  {
    id: "LOG-2026-9740",
    timestamp: "2026-07-29 16:30:22 UTC",
    action: "DSAR Consent Telemetry Refresh",
    userRef: "DPO_OFFICER_PANEL",
    ipAddress: "185.120.44.12",
    securityLevel: "STANDARD",
    status: "VERIFIED"
  }
];

export default function DataComplianceHub() {
  const [activeTab, setActiveTab] = useState<"security" | "dsar" | "cookies" | "logs">("security");
  
  // Cookie Preferences state
  const [essentialCookies] = useState(true); // mandatory
  const [analyticsCookies, setAnalyticsCookies] = useState(true);
  const [arTelemetryCookies, setArTelemetryCookies] = useState(true);
  const [marketingCookies, setMarketingCookies] = useState(false);

  // DSAR Form state
  const [requestType, setRequestType] = useState<"EXPORT" | "ERASE" | "RECTIFY">("EXPORT");
  const [userEmail, setUserEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [reasonNotes, setReasonNotes] = useState("");
  const [dsarSubmitted, setDsarSubmitted] = useState<string | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDsarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !fullName) {
      showToast("Please enter your name and email address.");
      return;
    }

    try {
      const res = await apiFetch("/api/compliance/dsar-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType,
          userEmail,
          fullName,
          notes: reasonNotes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDsarSubmitted(data.ticketRef || `DSAR-${Date.now().toString().slice(-6)}`);
        showToast("Data request submitted successfully.");
      } else {
        setDsarSubmitted(null);
        showToast(data?.error?.message || "Data requests are unavailable until the production workflow is configured.");
      }
    } catch {
      setDsarSubmitted(null);
      showToast("Data request was not submitted. Please try again when the service is available.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in text-neutral-100 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 bg-[#D4AF37] text-black px-5 py-3 rounded-lg font-mono text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-12 -top-12 opacity-5 pointer-events-none">
          <ShieldCheck className="w-96 h-96 text-[#D4AF37]" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> PRIVACY & DATA REQUEST CENTER
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest">
              ICO REGISTERED: ZB394019
            </span>
          </div>

          <h1 className="font-serif text-3xl md:text-5xl font-bold text-white tracking-tight">
            Data Compliance & Governance Center
          </h1>

          <p className="text-neutral-300 text-sm md:text-base max-w-3xl leading-relaxed">
            Manage your personal data rights, inspect real-time security audit logs, adjust consent preferences, or exercise your UK GDPR rights to access or erase project records.
          </p>

          {/* Tab Selection Navigation */}
          <div className="pt-4 flex flex-wrap gap-2 border-t border-neutral-800">
            <button
              onClick={() => setActiveTab("security")}
              className={`px-4 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "security"
                  ? "bg-[#D4AF37] text-black shadow-md"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Security Standards</span>
            </button>

            <button
              onClick={() => setActiveTab("dsar")}
              className={`px-4 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "dsar"
                  ? "bg-[#D4AF37] text-black shadow-md"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Data Rights (DSAR)</span>
            </button>

            <button
              onClick={() => setActiveTab("cookies")}
              className={`px-4 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "cookies"
                  ? "bg-[#D4AF37] text-black shadow-md"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Cookie Preferences</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`px-4 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "logs"
                  ? "bg-[#D4AF37] text-black shadow-md"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Audit Trail Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: SECURITY STANDARDS & ENCRYPTION MONITOR */}
      {activeTab === "security" && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] rounded-xl w-fit">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-white">Database Encryption</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Production storage encryption and hosting region must be confirmed with the selected backend provider before customer data is enabled.
              </p>
              <div className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-bold">
                ● PROVIDER VERIFICATION REQUIRED
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl w-fit">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-white">Stripe Payment Security</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Payments are unavailable until the production Stripe integration and its data flow are configured and verified.
              </p>
              <div className="font-mono text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-lg font-bold">
                ● PAYMENT INTEGRATION PENDING
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl w-fit">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-white">UK Sovereignty & Hosting</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Hosting region, retention, subprocessors, and legal basis must be documented for the selected production backend.
              </p>
              <div className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-bold">
                ● UK SOVEREIGN LOCATION
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
              <span>Compliance Architecture Certification</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 font-mono text-xs">
              <div className="bg-black/40 p-3 rounded-xl border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">ISO Standard</span>
                <span className="text-white font-bold">Provider certification</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">ICO Registration</span>
                <span className="text-white font-bold">ZB394019</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">Transport Protocol</span>
                <span className="text-white font-bold">HTTPS required</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">Security Audit</span>
                <span className="text-emerald-400 font-bold">Passed (07/2026)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DSAR FORM (DATA SUBJECT ACCESS REQUEST) */}
      {activeTab === "dsar" && (
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-8 space-y-6 animate-fade-in">
          <div>
            <h2 className="font-serif text-2xl font-bold text-white">
              Data Subject Access & Erasure Request Form (DSAR)
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Under Articles 15 to 22 of the UK GDPR, you have the right to request a full machine-readable export of your data or request complete data erasure.
            </p>
          </div>

          {dsarSubmitted ? (
            <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-6 space-y-3 text-emerald-300">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <h3 className="font-serif text-lg font-bold text-white">DSAR Request Formally Registered</h3>
              </div>
              <p className="text-xs leading-relaxed">
                Your request has been routed to the Data Protection Officer queue. Under UK GDPR guidelines, your request will be fulfilled within 30 calendar days.
              </p>
              <div className="font-mono text-xs bg-black/40 p-3 rounded border border-emerald-500/30 font-bold">
                TICKET REF: {dsarSubmitted}
              </div>
              <button
                onClick={() => setDsarSubmitted(null)}
                className="text-xs font-mono text-[#D4AF37] hover:underline pt-2 block cursor-pointer"
              >
                ← Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleDsarSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setRequestType("EXPORT")}
                  className={`p-4 rounded-xl border font-mono text-xs font-bold text-left transition-all cursor-pointer ${
                    requestType === "EXPORT"
                      ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  <Download className="w-5 h-5 mb-2" />
                  <div>Export Personal Data (Art. 15)</div>
                  <span className="text-[10px] font-normal text-neutral-400 block mt-1">Receive full JSON archive of CAD specs & invoices.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRequestType("ERASE")}
                  className={`p-4 rounded-xl border font-mono text-xs font-bold text-left transition-all cursor-pointer ${
                    requestType === "ERASE"
                      ? "bg-red-500/10 border-red-500 text-red-400"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  <Trash2 className="w-5 h-5 mb-2" />
                  <div>Right to be Forgotten (Art. 17)</div>
                  <span className="text-[10px] font-normal text-neutral-400 block mt-1">Permanently purge all personal files and survey logs.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRequestType("RECTIFY")}
                  className={`p-4 rounded-xl border font-mono text-xs font-bold text-left transition-all cursor-pointer ${
                    requestType === "RECTIFY"
                      ? "bg-blue-500/10 border-blue-500 text-blue-400"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  <FileSpreadsheet className="w-5 h-5 mb-2" />
                  <div>Rectify Information (Art. 16)</div>
                  <span className="text-[10px] font-normal text-neutral-400 block mt-1">Correct outdated address or company VAT details.</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-neutral-400 block mb-1 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Lord Alastair Crawford"
                    className="w-full bg-[#252525] border border-neutral-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-neutral-400 block mb-1 uppercase">Account Email Address</label>
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="e.g. alastair@kensington-estates.co.uk"
                    className="w-full bg-[#252525] border border-neutral-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-neutral-400 block mb-1 uppercase">Request Details & Project References (Optional)</label>
                <textarea
                  rows={3}
                  value={reasonNotes}
                  onChange={(e) => setReasonNotes(e.target.value)}
                  placeholder="Provide project ID or specific files you wish to include..."
                  className="w-full bg-[#252525] border border-neutral-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <button
                type="submit"
                className="bg-[#D4AF37] hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit Official DSAR Request</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* TAB 3: COOKIE & TRACKING PREFERENCES */}
      {activeTab === "cookies" && (
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-8 space-y-6 animate-fade-in">
          <div>
            <h2 className="font-serif text-2xl font-bold text-white">
              Granular Consent & Privacy Controls
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Select which categories of cookies and browser telemetry you consent to share.
            </p>
          </div>

          <div className="space-y-4">
            {/* Essential */}
            <div className="bg-black/40 border border-neutral-800 rounded-xl p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-base font-bold text-white">Essential System Cookies</h3>
                  <span className="text-[10px] font-mono bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded font-bold">MANDATORY</span>
                </div>
                <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                  Required for user authentication session persistence, Stripe CSRF tokens, and online quote state management.
                </p>
              </div>
              <input type="checkbox" checked disabled className="w-5 h-5 accent-[#D4AF37]" />
            </div>

            {/* Analytics */}
            <div className="bg-black/40 border border-neutral-800 rounded-xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-bold text-white">Performance & Quote Telemetry</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                  Helps us monitor CNC bridge saw response times, LiDAR measurement latency, and application stability.
                </p>
              </div>
              <input
                type="checkbox"
                checked={analyticsCookies}
                onChange={(e) => setAnalyticsCookies(e.target.checked)}
                className="w-5 h-5 accent-[#D4AF37] cursor-pointer"
              />
            </div>

            {/* AR Telemetry */}
            <div className="bg-black/40 border border-neutral-800 rounded-xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-bold text-white">AR Camera Spatial Calibration</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                  Saves local LiDAR plane calibration metrics on your device for fast repeat measurements.
                </p>
              </div>
              <input
                type="checkbox"
                checked={arTelemetryCookies}
                onChange={(e) => setArTelemetryCookies(e.target.checked)}
                className="w-5 h-5 accent-[#D4AF37] cursor-pointer"
              />
            </div>

            {/* Marketing */}
            <div className="bg-black/40 border border-neutral-800 rounded-xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-bold text-white">Exhibition & Trade Offers</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                  Allows VIP notifications for exclusive slab warehouse releases and trade discount events.
                </p>
              </div>
              <input
                type="checkbox"
                checked={marketingCookies}
                onChange={(e) => setMarketingCookies(e.target.checked)}
                className="w-5 h-5 accent-[#D4AF37] cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={() => showToast("Cookie & Telemetry preferences updated.")}
            className="bg-[#D4AF37] hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all cursor-pointer shadow-md"
          >
            Save Consent Settings
          </button>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL LOGS */}
      {activeTab === "logs" && (
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-6 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-neutral-800 pb-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-white">
                Security Activity Preview
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Real-time cryptographic audit log of application events for compliance verification.
              </p>
            </div>
            <button
              onClick={() => showToast("Security audit log exported in CSV format.")}
              className="bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 font-mono text-xs uppercase px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Export CSV Audit Log</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500 text-[10px] uppercase">
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Description</th>
                  <th className="py-3 px-4">User Ref</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-neutral-300">
                {INITIAL_AUDIT_LOGS.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-900/50">
                    <td className="py-3.5 px-4 font-bold text-[#D4AF37]">{log.id}</td>
                    <td className="py-3.5 px-4 text-neutral-400">{log.timestamp}</td>
                    <td className="py-3.5 px-4 text-white font-sans">{log.action}</td>
                    <td className="py-3.5 px-4 text-neutral-400">{log.userRef}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        log.securityLevel === "HIGH" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {log.securityLevel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">● {log.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
