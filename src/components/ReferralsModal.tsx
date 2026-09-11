import { X, Award } from "lucide-react";

interface ReferralsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Phase 5 Gate 0 purge.
 *
 * This modal previously advertised a fabricated cash-referral program: a
 * fixed "£250 credit per referred project", a claim that "£250 cashback is
 * transferred directly to your bank account", a fabricated 5% partner
 * discount, and fabricated referral stats (3 referrals, 2 completed jobs,
 * £500 rewards earned) tied to a static, non-functional referral
 * code/link. None of this was ever a real financial program. Per the
 * approved Gate 0 decision to remove the referral cash program entirely,
 * it is removed here rather than replaced with "Price on Application"
 * wording — there is no unsupported financial product left to gate.
 */
export default function ReferralsModal({ isOpen, onClose }: ReferralsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative">
        <div className="bg-[#1A1A1A] text-white p-6 flex justify-between items-center border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold flex items-center justify-center text-gold">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-medium text-white">Referrals</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-neutral-700 leading-relaxed" role="status">
            A referral program is not currently available. Contact SMC for the referral terms applicable to your
            account.
          </p>
          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="bg-[#1A1A1A] hover:bg-gold text-white text-xs font-mono font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
