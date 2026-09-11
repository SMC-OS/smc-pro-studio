import { ArrowLeft, UserPlus } from "lucide-react";

interface ReferralsCommandViewProps {
  onNavigate?: (tab: string) => void;
  onOpenRewardsModal?: () => void;
}

/**
 * Phase 5 Gate 0 purge.
 *
 * This screen was a "Referral Command Center" built entirely around a
 * fabricated cash-referral program: an invented "2,500 PTS (£250 credit)
 * per verified referral" claim, six months of invented referral-growth and
 * point-accrual chart data, a fabricated £1,245.00 "earned trade credit"
 * total, four fabricated named referred clients with invented point
 * balances, fabricated milestone tiers, and a PDF export that generated a
 * polished-looking but entirely fictitious "Referral Performance & Point
 * Accrual Report" (complete with an invented account ID and a fake
 * verification hash) using only this hardcoded data. None of it was ever a
 * real financial or loyalty program.
 *
 * Per the approved Gate 0 decision to remove the referral cash program
 * entirely, this is removed here rather than replaced with "Price on
 * Application" wording — there is no unsupported financial product left to
 * gate. `onOpenRewardsModal` is kept on the props interface so any
 * existing call site needs no change, but it is never invoked.
 */
export default function ReferralsCommandView({ onNavigate }: ReferralsCommandViewProps) {
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
          <span className="bg-gold/10 text-gold border border-gold/30 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest flex items-center gap-1.5">
            <UserPlus className="w-3 h-3" /> SMC PRO
          </span>
        </div>
        <p className="text-sm text-neutral-300 leading-relaxed" role="status">
          A referral program is not currently available. Contact SMC for the referral terms applicable to your
          account.
        </p>
      </div>
    </div>
  );
}
