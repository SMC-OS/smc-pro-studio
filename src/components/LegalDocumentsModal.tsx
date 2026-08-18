import React, { useState, Component } from "react";
import { apiFetch } from "../services/apiClient";
import {
  X,
  ShieldCheck,
  Lock,
  CreditCard,
  Building2,
  Download,
  Scale,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";

// Initialize Stripe JS instance with environment key or fallback test key
const stripePublishableKey = ((import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY) || "pk_test_51SMCPROKEY2026EXAMPLE";
const stripePromise = loadStripe(stripePublishableKey);

interface StripeErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface StripeErrorBoundaryState {
  hasError: boolean;
}

class StripeErrorBoundary extends Component<
  StripeErrorBoundaryProps,
  StripeErrorBoundaryState
> {
  public props: StripeErrorBoundaryProps;
  public state: StripeErrorBoundaryState = { hasError: false };

  constructor(props: StripeErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(): StripeErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn("Stripe Elements Error boundary caught issue:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const DirectStripeFallbackForm: React.FC<{
  quoteRef: string;
  depositAmount: number;
  onPaymentSuccess: (paymentResult: any) => void;
}> = ({ quoteRef, depositAmount, onPaymentSuccess }) => {
  const [cardholderName, setCardholderName] = useState("Lord Alastair Crawford");
  const [email, setEmail] = useState("alastair@kensington-estates.co.uk");
  const [postcode, setPostcode] = useState("SW1X 0LZ");
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvc, setCvc] = useState("888");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(false);
    setPaymentError("Payments are unavailable until the production Stripe integration is configured.");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-900 border border-[#D4AF37]/40 rounded-xl p-4 space-y-3">
      {paymentError && <p className="text-xs text-amber-300" role="alert">{paymentError}</p>}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-xs font-mono font-bold text-white">Secure Encrypted Card Checkout</span>
        </div>
        <span className="text-[10px] font-mono text-amber-400 font-bold">Payments not configured</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-mono text-neutral-400 block mb-1">Cardholder Name</label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            required
            className="w-full bg-black/70 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono text-neutral-400 block mb-1">Billing Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-black/70 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-mono text-neutral-400 block mb-1">Card Number</label>
        <input
          type="text"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          required
          className="w-full bg-black/70 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:border-[#D4AF37] outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-mono text-neutral-400 block mb-1">Expiry</label>
          <input
            type="text"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            required
            className="w-full bg-black/70 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:border-[#D4AF37] outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono text-neutral-400 block mb-1">CVC</label>
          <input
            type="text"
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            required
            className="w-full bg-black/70 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:border-[#D4AF37] outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono text-neutral-400 block mb-1">Postcode</label>
          <input
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            required
            className="w-full bg-black/70 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:border-[#D4AF37] outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isProcessing}
        className="w-full bg-[#D4AF37] hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
      >
        {isProcessing ? "Processing Escrow Payment..." : `Pay Now £${depositAmount.toLocaleString()} GBP`}
      </button>
    </form>
  );
};

export interface LegalDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToPayment?: () => void;
  quoteRef?: string;
  depositAmount?: number;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#ffffff",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSmoothing: "antialiased",
      fontSize: "13px",
      "::placeholder": {
        color: "#737373"
      },
      iconColor: "#D4AF37"
    },
    invalid: {
      color: "#ef4444",
      iconColor: "#ef4444"
    }
  }
};

// Stripe Elements Inner Payment Form Component
const StripePaymentFormContent: React.FC<{
  quoteRef: string;
  depositAmount: number;
  onPaymentSuccess: (paymentResult: any) => void;
}> = ({ quoteRef, depositAmount, onPaymentSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [cardholderName, setCardholderName] = useState("Lord Alastair Crawford");
  const [email, setEmail] = useState("alastair@kensington-estates.co.uk");
  const [postcode, setPostcode] = useState("SW1X 0LZ");
  const [cardError, setCardError] = useState<string | null>(null);
  const [isCardComplete, setIsCardComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardError("Payments are unavailable until the production Stripe integration is configured.");
    setIsProcessing(false);
    return;

    try {
      if (stripe && elements) {
        const cardElement = elements.getElement(CardElement) as any;
        if (cardElement) {
          // Attempt real or simulated backend payment intent handshake
          const res = await apiFetch("/api/stripe/create-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quoteRef,
              amount: depositAmount,
              customerEmail: email,
              depositType: "25_RESERVATION"
            })
          });

          const data = await res.json();

          if (data.clientSecret && data.isLiveStripe) {
            const result = await stripe.confirmCardPayment(data.clientSecret, {
              payment_method: {
                card: cardElement,
                billing_details: {
                  name: cardholderName,
                  email: email,
                  address: { postal_code: postcode }
                }
              }
            });

            if (result.error) {
              setCardError(result.error.message || "Payment verification failed.");
              setIsProcessing(false);
              return;
            }

            if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
              onPaymentSuccess({
                paymentId: result.paymentIntent.id,
                status: "Succeeded",
                amountPaid: depositAmount,
                timestamp: new Date().toISOString(),
                cardLast4: "4242",
                receiptUrl: "#"
              });
              setIsProcessing(false);
              return;
            }
          }
        }
      }

      // High-fidelity fallback endpoint or simulation mode
      const processRes = await apiFetch("/api/stripe/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteRef,
          amount: depositAmount,
          currency: "gbp",
          depositType: "25_RESERVATION",
          customerName: cardholderName,
          customerEmail: email,
          cardLast4: "8842"
        })
      });

      const processData = await processRes.json();

      setTimeout(() => {
        setIsProcessing(false);
        onPaymentSuccess({
          paymentId: processData.paymentId || `ch_stripe_${Math.random().toString(36).substring(2, 10)}`,
          status: "Succeeded",
          amountPaid: depositAmount,
          timestamp: new Date().toISOString(),
          cardLast4: "8842"
        });
      }, 1000);

    } catch (err: any) {
      console.error("Payment Submission Error:", err);
      setCardError(err.message || "An error occurred during payment processing. Please check details.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmitPayment} className="space-y-4 bg-black/60 border border-[#D4AF37]/30 rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#D4AF37]" />
          <span className="font-serif text-sm font-bold text-white">
            Stripe Secure Card Elements
          </span>
        </div>
        <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold flex items-center gap-1">
          <Lock className="w-3 h-3" /> PAYMENT INTEGRATION PENDING
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
            Cardholder Full Name
          </label>
          <input
            type="text"
            required
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-neutral-800 focus:border-[#D4AF37] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono transition-colors"
            placeholder="e.g. Lord Alastair Crawford"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
            Billing Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-neutral-800 focus:border-[#D4AF37] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono transition-colors"
            placeholder="client@example.co.uk"
          />
        </div>
      </div>

      {/* Stripe CardElement */}
      <div>
        <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
          Card Number & Security Token (Stripe Elements)
        </label>
        <div className="bg-[#1A1A1A] border border-neutral-800 focus-within:border-[#D4AF37] rounded-lg p-3 transition-all">
          <CardElement
            options={CARD_ELEMENT_OPTIONS}
            onChange={(e) => {
              setIsCardComplete(e.complete);
              if (e.error) setCardError(e.error.message);
              else setCardError(null);
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
        <span className="flex items-center gap-1 text-neutral-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 256-Bit SSL Encrypted Handshake
        </span>
        <div className="flex items-center gap-2">
          <span>Postcode:</span>
          <input
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            className="w-20 bg-[#1A1A1A] border border-neutral-800 rounded px-1.5 py-0.5 text-[10px] text-white font-mono outline-none"
          />
        </div>
      </div>

      {cardError && (
        <div className="bg-red-950/60 border border-red-800/80 rounded-lg p-2.5 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{cardError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isProcessing || !isCardComplete || Boolean(cardError)}
        className="w-full bg-[#D4AF37] hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Sparkles className="w-4 h-4 animate-spin text-black" />
            <span>Verifying Stripe Payment Token...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            <span>Confirm & Pay £{depositAmount.toLocaleString("en-GB", { minimumFractionDigits: 2 })} GBP</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};

export const LegalDocumentsModal: React.FC<LegalDocumentsModalProps> = ({
  isOpen,
  onClose,
  onProceedToPayment,
  quoteRef = "SMC-QUO-8842",
  depositAmount = 962.50
}) => {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 30) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-[#D4AF37]/40 text-white rounded-2xl p-6 md:p-8 max-w-4xl w-full max-h-[94vh] flex flex-col relative shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-neutral-800 pb-5 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> SMC PRO • LEGAL & COMPLIANCE
              </span>
              <span className="bg-neutral-800 text-neutral-300 border border-neutral-700 px-2.5 py-0.5 rounded text-[10px] font-mono">
                REF: {quoteRef}
              </span>
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-white tracking-tight">
              Legal Directives & Fabrication Terms
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Please review the binding Terms of Use and Privacy Policy below before confirming your deposit payment.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
            title="Close Legal Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 my-3 border-b border-neutral-800 pb-3 shrink-0">
          <button
            onClick={() => setActiveTab("terms")}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "terms"
                ? "bg-[#D4AF37] text-black shadow-md"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Terms of Use & Contract</span>
          </button>

          <button
            onClick={() => setActiveTab("privacy")}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "privacy"
                ? "bg-[#D4AF37] text-black shadow-md"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy (UK GDPR)</span>
          </button>

          <button
            onClick={() => window.print()}
            className="ml-auto text-xs font-mono text-neutral-400 hover:text-[#D4AF37] flex items-center gap-1.5 transition-colors cursor-pointer hidden md:flex"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>

        {/* Scrollable Legal Content Container */}
        {!paymentReceipt && (
          <div
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto pr-3 space-y-5 text-xs text-neutral-300 leading-relaxed bg-black/40 border border-neutral-800 rounded-xl p-5 custom-scrollbar my-2 max-h-[36vh]"
          >
            {activeTab === "terms" ? (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-[#1A1A1A] p-3.5 rounded-lg border border-[#D4AF37]/30 space-y-1">
                  <h3 className="font-serif text-sm md:text-base font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#D4AF37]" /> Simo Marble & Construction UK Ltd Fabrication Contract
                  </h3>
                  <p className="text-neutral-400 text-[11px] font-mono">
                    Jurisdiction: Courts of England and Wales • Company Reg: 08924102 • ICO Ref: ZB394019
                  </p>
                </div>

                <section className="space-y-1.5">
                  <h4 className="font-serif text-xs font-bold text-[#D4AF37]">
                    1. Quotations, Pricing & Validity Period
                  </h4>
                  <p>
                    1.1. All official estimates issued via SMC Pro Studio remain valid for 14 calendar days from the issuance timestamp. Upon payment of a 25% slab reservation deposit, raw material rates are locked against market inflation.
                  </p>
                  <p>
                    1.2. Quotations assume ground-floor or direct lift access. Central London Congestion Zone logistics, hoist riggers, or high-rise crane installations are subject to separate access assessments.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h4 className="font-serif text-xs font-bold text-[#D4AF37]">
                    2. Laser Templating & Substrate Readiness
                  </h4>
                  <p>
                    2.1. On the designated laser survey date, all base cabinetry must be fully leveled (within ±2mm variance across 3 metres), permanently anchored, and rigid. Sinks, hobs, pop-up sockets, and tapware must be available on site.
                  </p>
                  <p>
                    2.2. Incomplete site readiness requiring a re-survey will incur a standard abortive laser fee of £175 + VAT.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h4 className="font-serif text-xs font-bold text-[#D4AF37]">
                    3. Natural Stone Characteristics & Vein Matching
                  </h4>
                  <p>
                    3.1. Natural stones (Marble, Granite, Quartzite) feature unique natural veining, mineral spots, and micro-fissures inherent to mined geological materials.
                  </p>
                  <p>
                    3.2. Digital vein matching algorithms are employed for mitred waterfall edges on Porcelain and Quartz. Physical RFID slab inspection is available at our Thames Bay Warehouse prior to CNC bridge sawing.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h4 className="font-serif text-xs font-bold text-[#D4AF37]">
                    4. Payment Milestones & Milestone Escrow
                  </h4>
                  <p>
                    4.1. Milestone 1: 25% Slab Reservation Deposit (Locks inventory).
                  </p>
                  <p>
                    4.2. Milestone 2: 50% Advance Payment prior to CNC machine cutting.
                  </p>
                  <p>
                    4.3. Milestone 3: 25% Final Balance upon completion of on-site installation.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h4 className="font-serif text-xs font-bold text-[#D4AF37]">
                    5. Warranty & Care Guidelines
                  </h4>
                  <p>
                    5.1. Quartz and Sintered Porcelain carry a 25-Year Manufacturer Warranty against structural defects when installed on certified substrates.
                  </p>
                </section>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-[#1A1A1A] p-3.5 rounded-lg border border-emerald-500/30 space-y-1">
                  <h3 className="font-serif text-sm md:text-base font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" /> UK GDPR & DPA 2018 Privacy Directives
                  </h3>
                  <p className="text-neutral-400 text-[11px] font-mono">
                    SMC Pro intends to operate in accordance with applicable UK data-protection law. The final production data flows, providers, retention schedule, and operating procedures require review before launch.
                  </p>
                </div>

                <section className="space-y-1.5">
                  <h4 className="font-serif text-xs font-bold text-emerald-400">
                    1. Information We Collect
                  </h4>
                  <p>
                    We process client contact identifiers, site delivery locations, CAD 3D LiDAR point cloud scans, slab cut-sheets, and Stripe tokenized payment receipts strictly for contract execution.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h4 className="font-serif text-xs font-bold text-emerald-400">
                    2. Financial Telemetry & Stripe Security
                  </h4>
                  <p>
                    Payments are disabled until the production Stripe integration is completed and its card-data flow has been verified.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h4 className="font-serif text-xs font-bold text-emerald-400">
                    3. Your Data Rights (DSAR)
                  </h4>
                  <p>
                    Under Articles 15 to 22 of UK GDPR, you maintain full right to access, rectify, export, or request deletion of personal records within 30 days by emailing dpo@smcpro.co.uk.
                  </p>
                </section>
              </div>
            )}
          </div>
        )}

        {/* Payment Confirmation Receipt View */}
        {paymentReceipt && (
          <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-6 text-center space-y-4 animate-fade-in my-3">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-white">Stripe Payment Confirmed</h3>
              <p className="text-xs font-mono text-emerald-400 mt-1">
                Transaction ID: {paymentReceipt.paymentId}
              </p>
            </div>
            <div className="bg-black/60 rounded-lg p-4 max-w-md mx-auto text-left font-mono text-xs space-y-1.5 border border-neutral-800">
              <div className="flex justify-between text-neutral-400">
                <span>Quote Reference:</span>
                <span className="text-white font-bold">{quoteRef}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Amount Charged:</span>
                <span className="text-emerald-400 font-bold">£{paymentReceipt.amountPaid.toLocaleString("en-GB", { minimumFractionDigits: 2 })} GBP</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Card Ending:</span>
                <span className="text-white">•••• {paymentReceipt.cardLast4}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Timestamp:</span>
                <span className="text-neutral-300">{new Date(paymentReceipt.timestamp).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 border border-neutral-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download Receipt
              </button>
              <button
                onClick={() => {
                  if (onProceedToPayment) onProceedToPayment();
                  onClose();
                }}
                className="bg-[#D4AF37] hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase tracking-wider py-2 px-6 rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Checkbox & Integrated Stripe Elements Section */}
        {!paymentReceipt && (
          <div className="pt-3 border-t border-neutral-800 space-y-3 shrink-0 bg-[#121212]">
            {/* Acceptance Checkbox */}
            <div className="bg-black/50 border border-[#D4AF37]/30 rounded-xl p-3.5 flex items-center justify-between gap-4">
              <label htmlFor="acceptTerms" className="flex items-center gap-3 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  name="acceptTerms"
                  checked={isAccepted}
                  onChange={(e) => setIsAccepted(e.target.checked)}
                  className="w-5 h-5 accent-[#D4AF37] rounded border-neutral-700 bg-neutral-900 cursor-pointer shrink-0"
                />
                <span className="text-xs text-neutral-200 group-hover:text-white transition-colors">
                  I have read and agree to the <strong className="text-white">Terms of Use</strong> and <strong className="text-white">Privacy Policy</strong> for SMC Pro Studio.
                </span>
              </label>

              <span className="text-[10px] font-mono text-neutral-400 hidden sm:inline-block">
                {isAccepted ? "✓ Terms Accepted" : "Check box to enable payment"}
              </span>
            </div>

            {/* Embedded Stripe Elements Form (Unlocked after checking terms) */}
            {isAccepted ? (
              <StripeErrorBoundary
                fallback={
                  <DirectStripeFallbackForm
                    quoteRef={quoteRef}
                    depositAmount={depositAmount}
                    onPaymentSuccess={(res) => setPaymentReceipt(res)}
                  />
                }
              >
                <Elements stripe={stripePromise}>
                  <StripePaymentFormContent
                    quoteRef={quoteRef}
                    depositAmount={depositAmount}
                    onPaymentSuccess={(res) => setPaymentReceipt(res)}
                  />
                </Elements>
              </StripeErrorBoundary>
            ) : (
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex items-center justify-between gap-4 opacity-75">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-neutral-800 text-neutral-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold text-neutral-300">
                      Stripe Card Payment Locked
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      Please check the box above to accept terms and reveal card input fields.
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-neutral-500 block">Deposit Amount</span>
                  <span className="font-serif text-sm font-bold text-[#D4AF37]">
                    £{depositAmount.toLocaleString("en-GB", { minimumFractionDigits: 2 })} GBP
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default LegalDocumentsModal;
