import { ArrowLeft, ShieldCheck } from "lucide-react";

interface DailyTreasureVaultProps {
  onNavigate?: (tab: string) => void;
}

/**
 * Phase 5 Gate 0 purge.
 *
 * This screen was an "Elite Rewards Hub": a fabricated points/loyalty
 * system (a hardcoded 750,000-point balance, a fake "Platinum Member since
 * 2018" VIP card for a named person who does not exist, daily login
 * "treasure chests"), a fabricated rewards marketplace with invented point
 * costs, a fabricated points transaction history referencing invented
 * client names, and — most seriously — a fabricated "Zero-Interest Trade
 * Credit" financial product with an invented £150,000 approved limit and
 * £112,400 available facility that a user could request to increase via a
 * form that only ever showed a fake success alert. None of this was ever a
 * real financial product or loyalty program.
 *
 * Per the approved Gate 0 decision, this is removed completely rather than
 * replaced with "Price on Application" wording — there is no unsupported
 * financial product left to gate, only a plain notice that the feature
 * isn't available. `onNavigate` is kept on the props interface so the
 * existing call site in App.tsx needs no change.
 */
export default function DailyTreasureVault({ onNavigate }: DailyTreasureVaultProps) {
  return (
    <div className="max-w-2xl mx-auto animate-fade-in text-neutral-100 pb-16">
      <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-8 space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate("dashboard")}
              className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white transition-all cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" /> SMC PRO
          </span>
        </div>
        <p className="text-sm text-neutral-300 leading-relaxed" role="status">
          Rewards and trade credit are not available. Contact SMC for the account terms applicable to your business.
        </p>
      </div>
    </div>
  );
}
