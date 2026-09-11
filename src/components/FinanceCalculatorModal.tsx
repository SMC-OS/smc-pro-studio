import { X, Calculator } from "lucide-react";

interface FinanceCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEstimate?: number;
}

/**
 * Phase 5 Gate 0 purge.
 *
 * This modal previously advertised a fully fabricated consumer finance
 * product: specific representative APR figures (0% / 4.9% / 6.9%) for
 * 12/24/36-month terms, a live-looking monthly-payment calculator built
 * on those invented rates, and an "Apply for Finance Pre-Approval" button
 * that always faked a successful outcome ("Your instant finance
 * pre-approval reference has been generated. An SMC Stone Advisor will
 * review your details shortly.") with no lender, no credit check, and no
 * backend of any kind behind it. Advertising specific APR figures for a
 * credit product that doesn't exist is a real-world compliance risk, not
 * just a display issue, so the fabricated rates and the fake application
 * flow are removed entirely rather than genericized — there is no
 * unsupported financial product left to gate.
 */
export default function FinanceCalculatorModal({
  isOpen,
  onClose
}: FinanceCalculatorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative animate-scale-up">
        <div className="bg-[#1A1A1A] text-white p-6 flex justify-between items-center border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold flex items-center justify-center text-gold">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-medium text-white">Project Financing</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-full hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-center">
          <p className="text-sm text-neutral-600 leading-relaxed" role="status">
            Financing options are not currently available. Contact SMC to discuss payment arrangements for your project.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#1A1A1A] hover:bg-gold text-white font-bold text-xs rounded-xl transition-colors uppercase tracking-wider font-mono"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
