import { X, ShieldCheck } from "lucide-react";

/**
 * Phase 5 Gate 0 legal-surface purge.
 *
 * This modal previously rendered binding-sounding Terms of Use clauses (a
 * £175+VAT abortive-survey fee, a 25-year manufacturer warranty, a 25%/50%/
 * 25% milestone-escrow schedule, a 14-day quote-lock policy) alongside a
 * live-looking Stripe card-payment form — none of it ever approved as
 * actual legal or commercial terms. The payment form itself was pre-filled
 * with realistic fake PII (a named cardholder, email, postcode, card
 * number) and its "real" submit handler contained unreachable dead code
 * that would fabricate a fake "Succeeded" Stripe payment (a random
 * `ch_stripe_...` id, a fake receipt) if the early-return guard above it
 * were ever accidentally removed — a live simulated-payment-success risk
 * sitting dormant in the codebase. All of that — the Stripe integration,
 * the acceptance checkbox, the payment/receipt views, the pre-filled PII,
 * the fabricated clauses — is removed here, not merely hidden behind a
 * flag, per the approved Gate 0 purge decision.
 *
 * This component now does exactly one thing: state plainly that terms and
 * payment are not yet available, with no action that could be mistaken for
 * acceptance, payment, a signature, or a generated certificate. The
 * `onProceedToPayment`/`quoteRef`/`depositAmount` props are kept on the
 * public interface so the existing call site in App.tsx needs no change,
 * but `onProceedToPayment` is never invoked — there is no path in this
 * component that could ever reach it.
 *
 * The Community Guidelines legal-review checkpoint (tasks/todo.md) stays
 * open; this purge doesn't close it — it only removes unapproved content
 * that should never have shipped ahead of that review.
 */
export interface LegalDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToPayment?: () => void;
  quoteRef?: string;
  depositAmount?: number;
}

export const LegalDocumentsModal: React.FC<LegalDocumentsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6">
      <div className="bg-[#121212] border border-[#D4AF37]/40 text-white rounded-2xl p-6 md:p-8 max-w-lg w-full relative shadow-2xl">
        <div className="flex justify-between items-start border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-2">
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" /> SMC PRO • LEGAL & COMPLIANCE
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-neutral-200 leading-relaxed pt-5" role="status">
          Terms and payment conditions are currently under legal review and are not available for acceptance. Contact SMC
          for the terms applicable to your project.
        </p>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl border border-neutral-700 cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default LegalDocumentsModal;
