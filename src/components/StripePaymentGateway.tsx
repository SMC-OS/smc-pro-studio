import React, { useState } from "react";
import { apiFetch } from "../services/apiClient";
import {
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  FileText,
  Download,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Building,
  RotateCw,
  X
} from "lucide-react";

interface StripePaymentGatewayProps {
  quoteRef?: string;
  totalAmount?: number;
  customerName?: string;
  customerEmail?: string;
  onSuccess?: (paymentReceipt: PaymentReceipt) => void;
  onClose?: () => void;
}

export interface PaymentReceipt {
  paymentId: string;
  amountPaid: number;
  vatAmount: number;
  depositType: string;
  timestamp: string;
  cardLast4: string;
  quoteRef: string;
  status: "Succeeded" | "Processing";
}

export default function StripePaymentGateway({
  quoteRef = "SMC-QUO-8842",
  totalAmount = 3850,
  customerName = "",
  customerEmail = "",
  onSuccess,
  onClose
}: StripePaymentGatewayProps) {
  // Payment Type Choice
  const [depositChoice, setDepositChoice] = useState<"25_RESERVATION" | "50_FABRICATION" | "100_FULL" | "CUSTOM">("25_RESERVATION");
  const [customAmount, setCustomAmount] = useState<string>("500");

  // Form Fields
  const [nameOnCard, setNameOnCard] = useState(customerName || "Lord Alastair Crawford");
  const [email, setEmail] = useState(customerEmail || "alastair@kensington-estates.co.uk");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [postalCode, setPostalCode] = useState("SW1X 0LZ");

  // Flow & State
  const [isProcessing, setIsProcessing] = useState(false);
  const [show3dSecure, setShow3dSecure] = useState(false);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculate Payable Amount
  const getPayableAmount = (): number => {
    switch (depositChoice) {
      case "25_RESERVATION":
        return Math.round(totalAmount * 0.25);
      case "50_FABRICATION":
        return Math.round(totalAmount * 0.50);
      case "100_FULL":
        return totalAmount;
      case "CUSTOM":
        return parseFloat(customAmount) || 0;
      default:
        return Math.round(totalAmount * 0.25);
    }
  };

  const payableAmount = getPayableAmount();
  const vatAmount = Math.round(payableAmount - (payableAmount / 1.20));

  // Auto-format card number
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
    setCardNumber(formatted);
  };

  // Auto-format expiry
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 2) {
      raw = raw.slice(0, 2) + "/" + raw.slice(2);
    }
    setExpiry(raw);
  };

  // Card brand detection helper
  const getCardBrand = () => {
    const clean = cardNumber.replace(/\s/g, "");
    if (clean.startsWith("4")) return "VISA";
    if (clean.startsWith("5") || clean.startsWith("2")) return "MASTERCARD";
    if (clean.startsWith("34") || clean.startsWith("37")) return "AMEX";
    return "CARD";
  };

  // Handle Form Submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("Payments are unavailable until the production Stripe integration is configured.");
    setIsProcessing(false);
    return;

    if (cardNumber.replace(/\s/g, "").length < 15) {
      setErrorMessage("Please enter a valid 16-digit payment card number.");
      return;
    }

    if (!expiry || expiry.length < 5) {
      setErrorMessage("Please enter a valid card expiration date (MM/YY).");
      return;
    }

    if (!cvc || cvc.length < 3) {
      setErrorMessage("Please enter the 3-digit CVC code on the back of your card.");
      return;
    }

    setIsProcessing(true);

    try {
      // Call Express server Stripe API endpoint
      const response = await apiFetch("/api/stripe/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteRef,
          amount: payableAmount,
          currency: "gbp",
          depositType: depositChoice,
          customerName: nameOnCard,
          customerEmail: email,
          cardLast4: cardNumber.slice(-4) || "4242"
        })
      });

      const data = await response.json();

      if (data.requires3dSecure) {
        setShow3dSecure(true);
        setIsProcessing(false);
      } else if (data.success) {
        const newReceipt: PaymentReceipt = {
          paymentId: data.paymentId || `ch_stripe_${Math.random().toString(36).substr(2, 9)}`,
          amountPaid: payableAmount,
          vatAmount,
          depositType: depositChoice,
          timestamp: new Date().toISOString(),
          cardLast4: cardNumber.slice(-4) || "4242",
          quoteRef,
          status: "Succeeded"
        };
        setReceipt(newReceipt);
        setIsProcessing(false);
        if (onSuccess) onSuccess(newReceipt);
      } else {
        // Fallback simulation for smooth operation
        simulateSuccessfulPayment();
      }
    } catch {
      simulateSuccessfulPayment();
    }
  };

  const simulateSuccessfulPayment = () => {
    setShow3dSecure(false);
    setIsProcessing(false);
    setErrorMessage("Payments are unavailable until the production Stripe integration is configured.");
  };

  const complete3dSecure = () => {
    setShow3dSecure(false);
    setIsProcessing(false);
    setErrorMessage("3D Secure confirmation is unavailable until the production payment integration is configured.");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-neutral-100 pb-12">
      {/* 3D Secure Authentication Modal */}
      {show3dSecure && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <h3 className="font-serif text-lg font-bold text-white">3D Secure 2.0 Auth</h3>
              </div>
              <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">
                VERIFIED BY VISA / MASTERCARD ID
              </span>
            </div>

            <div className="text-xs text-neutral-300 space-y-3">
              <p>
                Your issuing bank requires biometric or passcode authentication to approve this transaction for <strong>SMC Pro Studio</strong>.
              </p>

              <div className="bg-black/50 p-4 rounded-xl border border-neutral-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Merchant:</span>
                  <span className="text-white font-bold">Simo Marble UK Ltd</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Amount:</span>
                  <span className="text-[#D4AF37] font-bold">£{payableAmount.toLocaleString("en-GB")} GBP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Quote Ref:</span>
                  <span className="text-white">{quoteRef}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <button
                onClick={complete3dSecure}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Complete Payment</span>
              </button>
              <button
                onClick={() => setShow3dSecure(false)}
                className="w-full text-xs font-mono text-neutral-400 hover:text-white text-center block cursor-pointer"
              >
                Cancel Authentication
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Receipt State */}
      {receipt ? (
        <div className="bg-[#1A1A1A] border border-emerald-500/40 rounded-2xl p-8 space-y-6 shadow-2xl animate-fade-in">
          <div className="flex justify-between items-start border-b border-neutral-800 pb-6">
            <div>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest flex items-center gap-1.5 w-fit mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> PAYMENT SUCCESSFUL
              </span>
              <h2 className="font-serif text-3xl font-bold text-white">Official Stripe Transaction Receipt</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Transaction cleared. Slab inventory locked & forwarded to CNC fabrication queue.
              </p>
            </div>
            {onClose && (
              <button onClick={onClose} className="text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Receipt Card Breakdown */}
          <div className="bg-black/50 border border-neutral-800 rounded-xl p-6 space-y-4 font-mono text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-neutral-800 pb-4">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Transaction ID</span>
                <span className="text-[#D4AF37] font-bold">{receipt.paymentId}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Quote Reference</span>
                <span className="text-white font-bold">{receipt.quoteRef}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Amount Paid (inc VAT)</span>
                <span className="text-emerald-400 font-bold text-sm">£{receipt.amountPaid.toLocaleString("en-GB")}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Card Last 4</span>
                <span className="text-white">•••• {receipt.cardLast4}</span>
              </div>
            </div>

            <div className="space-y-1 text-neutral-400 text-[11px]">
              <div className="flex justify-between">
                <span>Net Fabrication Amount:</span>
                <span>£{(receipt.amountPaid - receipt.vatAmount).toLocaleString("en-GB")}</span>
              </div>
              <div className="flex justify-between">
                <span>UK VAT (20%):</span>
                <span>£{receipt.vatAmount.toLocaleString("en-GB")}</span>
              </div>
              <div className="flex justify-between font-bold text-white border-t border-neutral-800 pt-1">
                <span>Total Cleared Funds:</span>
                <span>£{receipt.amountPaid.toLocaleString("en-GB")} GBP</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              onClick={() => window.print()}
              className="bg-[#D4AF37] hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Download Official Tax Invoice PDF</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all cursor-pointer border border-neutral-700"
              >
                Return to Application
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Payment Submission View */
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-8 space-y-6 shadow-2xl">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-neutral-800 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> STRIPE ENCRYPTED GATEWAY
                </span>
                <span className="bg-neutral-800 text-neutral-300 border border-neutral-700 px-2.5 py-0.5 rounded text-[10px] font-mono">
                  REF: {quoteRef}
                </span>
              </div>
              <h2 className="font-serif text-3xl font-bold text-white">Secure Stripe Payment Gateway</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Payment processing is unavailable until the production Stripe integration is configured and verified.
              </p>
            </div>
            {onClose && (
              <button onClick={onClose} className="text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4 text-red-400 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handlePaymentSubmit} className="space-y-6">
            {/* Step 1: Deposit Type Selector */}
            <div className="space-y-3">
              <label className="text-xs font-mono text-neutral-400 uppercase font-bold block">
                1. Select Deposit or Payment Milestone
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setDepositChoice("25_RESERVATION")}
                  className={`p-4 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                    depositChoice === "25_RESERVATION"
                      ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold">25% Slab Reservation</span>
                    <span className="text-[10px] bg-[#D4AF37]/20 px-1.5 py-0.5 rounded">RECOMMENDED</span>
                  </div>
                  <div className="text-lg font-bold text-white font-serif">
                    £{Math.round(totalAmount * 0.25).toLocaleString("en-GB")}
                  </div>
                  <span className="text-[10px] text-neutral-400 block mt-1">Locks physical slab lot in warehouse</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDepositChoice("50_FABRICATION")}
                  className={`p-4 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                    depositChoice === "50_FABRICATION"
                      ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  <div className="text-xs font-bold mb-1">50% Pre-Fabrication</div>
                  <div className="text-lg font-bold text-white font-serif">
                    £{Math.round(totalAmount * 0.50).toLocaleString("en-GB")}
                  </div>
                  <span className="text-[10px] text-neutral-400 block mt-1">Triggers CNC bridge saw cutting</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDepositChoice("100_FULL")}
                  className={`p-4 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                    depositChoice === "100_FULL"
                      ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  <div className="text-xs font-bold mb-1">100% Full Clearance</div>
                  <div className="text-lg font-bold text-white font-serif">
                    £{totalAmount.toLocaleString("en-GB")}
                  </div>
                  <span className="text-[10px] text-neutral-400 block mt-1">Clears total invoice balance</span>
                </button>
              </div>
            </div>

            {/* Step 2: Payment Details */}
            <div className="space-y-4 pt-2 border-t border-neutral-800">
              <label className="text-xs font-mono text-neutral-400 uppercase font-bold block">
                2. Card Details (Production integration pending)
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-neutral-400 block mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    value={nameOnCard}
                    onChange={(e) => setNameOnCard(e.target.value)}
                    placeholder="Name as it appears on card"
                    className="w-full bg-[#252525] border border-neutral-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-neutral-400 block mb-1">Billing Email (For Invoice Receipt)</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="billing@domain.co.uk"
                    className="w-full bg-[#252525] border border-neutral-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Card Number Input with Brand badge */}
              <div className="relative">
                <label className="text-[10px] font-mono text-neutral-400 block mb-1">Card Number</label>
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="4532 •••• •••• 8842"
                  className="w-full bg-[#252525] border border-neutral-700 rounded-lg p-3 pr-20 text-xs text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                />
                <span className="absolute right-3 bottom-2.5 text-[9px] font-mono bg-neutral-800 text-[#D4AF37] px-2 py-1 rounded font-bold border border-neutral-700">
                  {getCardBrand()}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-neutral-400 block mb-1">Expiry Date</label>
                  <input
                    type="text"
                    required
                    value={expiry}
                    onChange={handleExpiryChange}
                    placeholder="MM/YY"
                    className="w-full bg-[#252525] border border-neutral-700 rounded-lg p-3 text-xs text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-neutral-400 block mb-1">CVC Code</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, ""))}
                    placeholder="•••"
                    className="w-full bg-[#252525] border border-neutral-700 rounded-lg p-3 text-xs text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-neutral-400 block mb-1">Billing Postcode</label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SW1X 0LZ"
                    className="w-full bg-[#252525] border border-neutral-700 rounded-lg p-3 text-xs text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            </div>

            {/* Total Summary Bar & Action */}
            <div className="bg-black/50 border border-neutral-800 rounded-xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-mono text-neutral-400 uppercase block">Total Amount Payable Now</span>
                <span className="font-serif text-2xl font-bold text-[#D4AF37]">
                  £{payableAmount.toLocaleString("en-GB")} <span className="text-xs text-neutral-400 font-sans font-normal">GBP (inc 20% VAT)</span>
                </span>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="bg-[#D4AF37] hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Encrypting & Contacting Stripe...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay £{payableAmount.toLocaleString("en-GB")} Securely</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
