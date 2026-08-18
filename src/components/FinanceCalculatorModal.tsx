import React, { useState } from "react";
import { X, DollarSign, Calculator, CheckCircle2, ShieldCheck, ArrowRight, Info } from "lucide-react";

interface FinanceCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEstimate?: number;
}

export default function FinanceCalculatorModal({
  isOpen,
  onClose,
  initialEstimate = 4500
}: FinanceCalculatorModalProps) {
  const [projectTotal, setProjectTotal] = useState<number>(initialEstimate);
  const [depositPercent, setDepositPercent] = useState<number>(20);
  const [termMonths, setTermMonths] = useState<12 | 24 | 36>(24);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const depositAmount = (projectTotal * depositPercent) / 100;
  const loanAmount = projectTotal - depositAmount;

  // APR interest rate estimates:
  // 12 months: 0% APR interest free
  // 24 months: 4.9% APR
  // 36 months: 6.9% APR
  let apr = 0;
  if (termMonths === 24) apr = 0.049;
  if (termMonths === 36) apr = 0.069;

  const totalInterest = loanAmount * apr * (termMonths / 12);
  const totalPayable = loanAmount + totalInterest;
  const monthlyPayment = totalPayable / termMonths;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative animate-scale-up">
        
        {/* Modal Header */}
        <div className="bg-[#1A1A1A] text-white p-6 flex justify-between items-center border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold flex items-center justify-center text-gold">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-white">Monthly Payment Calculator</h3>
              <p className="text-[10px] font-mono text-gold uppercase tracking-widest">0% APR Interest-Free Available</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-full hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="font-serif text-2xl font-medium text-neutral-900">Application Submitted!</h4>
            <p className="text-xs text-neutral-600 max-w-xs mx-auto leading-relaxed">
              Your instant finance pre-approval reference has been generated. An SMC Stone Advisor will review your details shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleApply} className="p-6 space-y-6">
            
            {/* Project Cost Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-neutral-800 font-sans uppercase tracking-wider">
                  Total Project Cost:
                </label>
                <span className="font-serif text-xl font-bold text-gold">
                  £{projectTotal.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="25000"
                step="250"
                value={projectTotal}
                onChange={(e) => setProjectTotal(Number(e.target.value))}
                className="w-full accent-gold cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                <span>£1,000</span>
                <span>£12,500</span>
                <span>£25,000</span>
              </div>
            </div>

            {/* Deposit Percentage */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-neutral-800 font-sans uppercase tracking-wider">
                  Deposit Contribution ({depositPercent}%):
                </label>
                <span className="font-mono text-sm font-bold text-neutral-800">
                  £{depositAmount.toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 30, 50].map((pct) => (
                  <button
                    type="button"
                    key={pct}
                    onClick={() => setDepositPercent(pct)}
                    className={`py-1.5 rounded text-xs font-mono font-bold border transition-colors ${
                      depositPercent === pct
                        ? "bg-[#1A1A1A] text-gold border-[#1A1A1A]"
                        : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    {pct}% (£{((projectTotal * pct) / 100).toLocaleString()})
                  </button>
                ))}
              </div>
            </div>

            {/* Repayment Term */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-800 font-sans uppercase tracking-wider block">
                Repayment Duration:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTermMonths(12)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    termMonths === 12
                      ? "bg-gold/10 border-gold text-neutral-900 shadow-xs"
                      : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <span className="block text-xs font-bold font-mono">12 Months</span>
                  <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">0% APR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTermMonths(24)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    termMonths === 24
                      ? "bg-gold/10 border-gold text-neutral-900 shadow-xs"
                      : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <span className="block text-xs font-bold font-mono">24 Months</span>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">4.9% APR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTermMonths(36)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    termMonths === 36
                      ? "bg-gold/10 border-gold text-neutral-900 shadow-xs"
                      : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <span className="block text-xs font-bold font-mono">36 Months</span>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">6.9% APR</span>
                </button>
              </div>
            </div>

            {/* Calculated Monthly Payment Highlight Box */}
            <div className="bg-[#1A1A1A] text-white p-4 rounded-xl border border-gold/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-gold uppercase tracking-wider block">ESTIMATED MONTHLY PAYMENT</span>
                <span className="font-serif text-2xl font-bold text-white">
                  £{monthlyPayment.toFixed(2)}
                  <span className="text-xs font-sans font-normal text-neutral-400"> / mo</span>
                </span>
              </div>
              <div className="text-right text-[11px] font-mono text-neutral-400">
                <div>Finance: £{loanAmount.toLocaleString()}</div>
                <div>Term: {termMonths} months</div>
              </div>
            </div>

            {/* Informational note */}
            <div className="flex items-start gap-2 text-[10px] text-neutral-500 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
              <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
              <span>
                Credit provided subject to status. Representative 0% APR available on 12-month term with 20%+ deposit on stone fabrication orders.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 border border-neutral-300 hover:border-neutral-400 text-neutral-700 font-bold text-xs rounded-xl transition-colors uppercase tracking-wider font-mono"
              >
                Close
              </button>
              <button
                type="submit"
                className="w-2/3 py-3 bg-[#1A1A1A] hover:bg-gold text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 uppercase tracking-wider font-mono shadow-md cursor-pointer"
              >
                <span>Apply for Finance Pre-Approval</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
