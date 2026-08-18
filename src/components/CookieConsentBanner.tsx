import React, { useState, useEffect } from "react";
import { ShieldCheck, Cookie, Check, X, Settings } from "lucide-react";

interface CookieConsentProps {
  onOpenPrivacyModal?: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentProps> = ({ onOpenPrivacyModal }) => {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Always required
    functional: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem("smc_cookie_consent");
    if (!consent) {
      // Show after brief delay for smooth entrance
      const timer = setTimeout(() => setShowBanner(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const consentData = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("smc_cookie_consent", JSON.stringify(consentData));
    setShowBanner(false);
  };

  const handleRejectNonEssential = () => {
    const consentData = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("smc_cookie_consent", JSON.stringify(consentData));
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    const consentData = {
      ...preferences,
      essential: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("smc_cookie_consent", JSON.stringify(consentData));
    setShowPreferences(false);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-[9999] bg-[#121212]/95 backdrop-blur-xl text-white border border-[#D4AF37]/40 rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      {!showPreferences ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] shrink-0">
              <Cookie className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-serif text-sm font-bold text-white tracking-wide">UK GDPR & Cookie Privacy</h4>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                SMC Pro uses essential browser storage for app preferences and, when configured, authenticated sessions. Optional analytics require separate consent and configuration.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-neutral-800">
            <button
              onClick={handleAcceptAll}
              className="w-full sm:w-auto flex-1 py-2 px-3 rounded-xl bg-[#D4AF37] hover:bg-amber-400 text-black font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Accept All
            </button>

            <button
              onClick={handleRejectNonEssential}
              className="w-full sm:w-auto py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-xs font-medium transition-all cursor-pointer"
            >
              Essential Only
            </button>

            <button
              onClick={() => setShowPreferences(true)}
              className="w-full sm:w-auto p-2 rounded-xl border border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-white transition-all cursor-pointer"
              title="Customize Preferences"
            >
              <Settings className="w-4 h-4 mx-auto" />
            </button>
          </div>

          {onOpenPrivacyModal && (
            <div className="text-[10px] text-center text-neutral-400 pt-1">
              Read our full{" "}
              <button
                onClick={onOpenPrivacyModal}
                className="text-[#D4AF37] hover:underline font-mono cursor-pointer"
              >
                Privacy Policy & Cookie Statement
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <h4 className="font-serif text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#D4AF37]" /> Cookie Preferences
            </h4>
            <button
              onClick={() => setShowPreferences(false)}
              className="p-1 text-neutral-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 text-xs">
            <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Strictly Necessary</span>
                <span className="text-[10px] text-neutral-400">Security tokens, active session auth & state</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded">Always Active</span>
            </div>

            <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Functional State</span>
                <span className="text-[10px] text-neutral-400">Remember active tab, slab filters & AR calibration</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.functional}
                onChange={(e) => setPreferences((p) => ({ ...p, functional: e.target.checked }))}
                className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Performance Telemetry</span>
                <span className="text-[10px] text-neutral-400">Anonymous load time & rendering error logs</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences((p) => ({ ...p, analytics: e.target.checked }))}
                className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={handleSavePreferences}
            className="w-full py-2.5 rounded-xl bg-[#D4AF37] hover:bg-amber-400 text-black font-mono text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            Save My Preferences
          </button>
        </div>
      )}
    </div>
  );
};
