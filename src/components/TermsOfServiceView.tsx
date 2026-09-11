import { Building2, Scale } from "lucide-react";

interface TermsOfServiceViewProps {
  onBackToApp?: () => void;
  onOpenStripePayment?: () => void;
}

/**
 * Phase 5 Gate 0 legal-surface purge.
 *
 * This view previously presented fabricated binding-sounding contract
 * terms as if they were SMC's real Terms of Use: a ±0.5mm laser-accuracy
 * guarantee, a 14-day quote lock, a 25-year stone warranty, a £175+VAT
 * abortive-survey fee, a 25%/50%/25% payment-milestone/escrow schedule,
 * and "Net 30 days credit terms" for trade partners — plus an acceptance
 * checkbox and a "Proceed to Stripe Gateway" action that would hand off
 * into the same payment flow LegalDocumentsModal.tsx's own purge removed.
 * None of it was ever approved as real legal or commercial terms. All of
 * it is removed here, not merely hidden, per the approved Gate 0 purge
 * decision — `onOpenStripePayment` is kept on the public interface so the
 * existing call site in App.tsx needs no change, but nothing in this
 * component ever invokes it any more.
 *
 * This view now states plainly that terms are not yet available, with no
 * acceptance action, no download/print action, and no path toward
 * payment. The Community Guidelines legal-review checkpoint
 * (tasks/todo.md) stays open — this purge removes unapproved content, it
 * does not close that review.
 */
export default function TermsOfServiceView(_props: TermsOfServiceViewProps) {
  return (
    <div className="max-w-3xl mx-auto animate-fade-in text-neutral-100 pb-16">
      <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 opacity-5 pointer-events-none">
          <Scale className="w-96 h-96 text-[#D4AF37]" />
        </div>

        <div className="relative z-10 space-y-4">
          <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest flex items-center gap-1.5 w-fit">
            <Building2 className="w-3 h-3" /> SMC PRO • LEGAL & COMPLIANCE
          </span>

          <h1 className="font-serif text-2xl md:text-3xl font-bold text-white tracking-tight">Terms of Use</h1>

          <p className="text-sm text-neutral-300 leading-relaxed" role="status">
            Terms and payment conditions are currently under legal review and are not available for acceptance. Contact
            SMC for the terms applicable to your project.
          </p>
        </div>
      </div>
    </div>
  );
}
