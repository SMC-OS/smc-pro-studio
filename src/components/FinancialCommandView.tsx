import { ShieldCheck, Lock } from "lucide-react";

/**
 * Phase 5 Gate 0 purge (correction pass).
 *
 * This view previously seeded three fabricated luxury projects ("VILLA
 * VERDE ESTATE", "BELGRAVIA ESTATE TOWNHOUSE", "ONE HYDE PARK PENTHOUSE")
 * with fabricated six-figure cost ledgers and fabricated multi-thousand
 * pound/dollar transaction histories citing real-sounding payment
 * channels ("Black AMEX", "Barclays Corporate Wire", "SMC Escrow
 * Guarantee Account"). Worse, unlike every other payment flow in this
 * app, its "Confirm & Pay" handler was not gated behind a disabled
 * guard — it unconditionally created a new "Completed" transaction
 * record after a short delay and reported "Payment of £X verified
 * successfully!", and its receipt modal claimed "Invoice PDF statement
 * generated and downloaded!" with no real file. None of it was backed by
 * a real ledger, payment provider, or document generator. Per the same
 * Gate 0 decision already applied to StripePaymentGateway.tsx and
 * FinanceCalculatorModal.tsx, the entire fabricated ledger and the live
 * fake-success payment flow are removed rather than left dormant.
 */
export default function FinancialCommandView() {
  return (
    <div className="bg-[#131313] min-h-screen text-[#e2e2e2] font-sans pb-24 pt-4 px-4 sm:px-6 md:px-12 animate-fade-in">
      <div className="max-w-xl mx-auto w-full pt-16">
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-2xl p-8 space-y-4 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl text-white font-bold">Financial Command</h1>
          <p className="text-sm text-neutral-400 leading-relaxed" role="status">
            Project ledgers and payment processing are not currently available. Contact SMC for current project cost breakdowns and settlement statements.
          </p>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase text-neutral-500 bg-[#111111] px-2.5 py-1 rounded-lg border border-[#292929]">
            <Lock className="w-3 h-3" /> Payment provider not configured
          </div>
        </div>
      </div>
    </div>
  );
}
