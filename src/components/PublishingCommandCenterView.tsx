import { ArrowLeft, Rocket } from "lucide-react";

interface PublishingCommandCenterViewProps {
  onClose?: () => void;
  onNavigateHome?: () => void;
  userEmail?: string;
}

/**
 * Phase 5 Gate 0 purge (correction pass).
 *
 * This view previously simulated a live production launch: it opened with
 * a fabricated "85% deployment progress" / "98% overall readiness" as if
 * a real deployment were already underway, and an "INITIALIZE DEPLOYMENT
 * SEQUENCE" / "Global Launch" button that always instantly faked success —
 * "DEPLOYMENT LIVE", "SYSTEM DEPLOYED & LIVE", "PORTFOLIO LIVE &
 * AUTHORIZED" — complete with a fabricated tracking code
 * ("SW3-KENSINGTON-3920") and fake console log lines ("FINAL LAUNCH
 * SEQUENCE EXECUTED. SYSTEM BROADCASTING LIVE."). None of it was backed by
 * a real deployment pipeline; clicking the button changed nothing outside
 * this component's own local state. Per the same Gate 0 decision already
 * applied to GeologicalProvenanceView.tsx and FinanceCalculatorModal.tsx —
 * a feature built entirely on fabricated telemetry, with no real backing
 * to preserve — the whole launch-ceremony UI is replaced with a plain,
 * honest notice rather than left dormant.
 */
export function PublishingCommandCenterView({ onClose, onNavigateHome }: PublishingCommandCenterViewProps) {
  const onBack = onClose || onNavigateHome;
  return (
    <div className="max-w-2xl mx-auto animate-fade-in text-neutral-100 pb-16 pt-8 px-4">
      <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-8 space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-gold/10 text-gold border border-gold/30 uppercase tracking-widest">
            <Rocket className="w-3 h-3" /> SMC PRO
          </span>
        </div>
        <p className="text-sm text-neutral-300 leading-relaxed" role="status">
          Deployment and publishing tooling is not currently available. This area will show real deployment status once a production pipeline is configured.
        </p>
      </div>
    </div>
  );
}
