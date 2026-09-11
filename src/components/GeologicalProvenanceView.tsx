import { ArrowLeft, ShieldCheck } from "lucide-react";

interface GeologicalProvenanceViewProps {
  onNavigateHome: () => void;
  userEmail?: string;
}

/**
 * Phase 5 Gate 0 purge.
 *
 * This screen was a fabricated "blockchain ledger" for stone provenance:
 * invented geological hashes, invented IPFS content IDs, an invented
 * Ethereum Layer 2 block height, and — most seriously — invented strings
 * shaped exactly like real Stripe PaymentIntent client secrets (e.g.
 * "pi_3M9aL2x87Kd1009A_secret_99A") labelled "Financial Finality... Stripe
 * Verified", none of which were ever connected to a real payment. A "MINT
 * STONE TOKEN" button generated a brand new fabricated block on demand; a
 * "DOWNLOAD CERTIFICATE" action alerted a fake "Certificate generated and
 * saved" message with nothing actually produced; and "EXECUTE TRANSFER"
 * alerted a fake "successfully transferred on L2 blockchain" message that
 * only ever updated local component state. None of this was ever a real
 * blockchain, certificate, or ownership-transfer system.
 *
 * Per the approved Gate 0 decision, this fabricated blockchain-provenance
 * feature is removed entirely rather than sanitized in place — there is no
 * real system underneath it to gate.
 */
export default function GeologicalProvenanceView({ onNavigateHome }: GeologicalProvenanceViewProps) {
  return (
    <div className="max-w-2xl mx-auto animate-fade-in text-neutral-100 pb-16 pt-8 px-4">
      <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-8 space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateHome}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" /> SMC PRO
          </span>
        </div>
        <p className="text-sm text-neutral-300 leading-relaxed" role="status">
          Geological provenance records are not currently available. Contact SMC for the sourcing information
          applicable to your project.
        </p>
      </div>
    </div>
  );
}
