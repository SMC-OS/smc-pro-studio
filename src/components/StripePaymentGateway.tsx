import { Lock, X } from "lucide-react";

interface StripePaymentGatewayProps {
  onClose?: () => void;
}

/**
 * Phase 5 Gate 0 purge (correction pass).
 *
 * This component previously ran a fully-built fake Stripe checkout: card
 * number/expiry/CVC fields defaulting the cardholder name and email to a
 * fabricated identity ("Lord Alastair Crawford",
 * "alastair@kensington-estates.co.uk"), a fabricated default quote ref
 * ("SMC-QUO-8842") and amount (£3,850), deposit-milestone buttons computing
 * believable £ figures from that fabricated total, a fake "3D Secure 2.0"
 * authentication modal, and — after a real API call to a Stripe endpoint
 * that has never existed on this server — a fallback that always faked a
 * "PAYMENT SUCCESSFUL" receipt (fake transaction ID, fake VAT breakdown, a
 * "Download Official Tax Invoice PDF" action, and a claim that "Slab
 * inventory locked & forwarded to CNC fabrication queue"). The submit
 * handler already failed safely before any of that ever ran, but the
 * unreachable code stayed in the bundle. All of it — the card form, the
 * fabricated defaults, the 3D Secure theater, and the fake receipt — is
 * removed entirely rather than left dormant, so nothing here can ever
 * simulate a successful payment or display believable transaction data.
 *
 * Every UI path that could open this component (TermsOfServiceView's and
 * LegalDocumentsModal's payment triggers, and TermsAndPrivacyModal's own
 * "Stripe Payment Gateway" tab) has also been disconnected — see those
 * files' own Gate 0 notes — so this component is not reachable from any
 * live control. It is kept only as an honest fallback in case a stale
 * reference to it is ever reintroduced.
 */
export default function StripePaymentGateway({ onClose }: StripePaymentGatewayProps) {
  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in text-neutral-100 pb-12">
      <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-8 space-y-4 shadow-2xl text-center">
        <div className="flex justify-end">
          {onClose && (
            <button onClick={onClose} className="text-neutral-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-xl font-bold text-white">Payments Not Currently Available</h2>
        <p className="text-xs text-neutral-400 leading-relaxed" role="status">
          Online payment processing has not been configured. Contact SMC to arrange payment for your project.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="w-full bg-[#D4AF37] hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all cursor-pointer shadow-md"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
