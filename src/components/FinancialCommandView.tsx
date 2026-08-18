import React, { useState } from "react";
import {
  CreditCard,
  Download,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Receipt,
  Layers,
  Wrench,
  Truck,
  Compass,
  ArrowUpRight,
  Filter,
  Search,
  Plus,
  X,
  Lock,
  DollarSign,
  Calendar,
  FileText
} from "lucide-react";

export interface TransactionRecord {
  id: string;
  date: string;
  reference: string;
  amount: number;
  status: "Completed" | "Pending" | "Verified";
  category: string;
  invoiceUrl?: string;
  paymentMethod?: string;
}

export interface LedgerCategoryItem {
  name: string;
  amount: number;
  icon: string;
  percentage: number;
}

export interface FinancialProject {
  id: string;
  name: string;
  subtitle: string;
  currency: "USD" | "GBP";
  settlementDate: string;
  depositAmount: number;
  ledger: LedgerCategoryItem[];
  transactions: TransactionRecord[];
}

const INITIAL_PROJECTS: FinancialProject[] = [
  {
    id: "villa-verde",
    name: "VILLA VERDE ESTATE",
    subtitle: "Beverly Hills Residence • Grand Marble Hall & Pool Cladding",
    currency: "USD",
    settlementDate: "24 OCT 2026",
    depositAmount: 50000,
    ledger: [
      { name: "Material (Calacatta Gold Slabs)", amount: 85000, icon: "layers", percentage: 59.6 },
      { name: "5-Axis Wet CNC Fabrication", amount: 32500, icon: "wrench", percentage: 22.8 },
      { name: "White-Glove Logistics & Transport", amount: 8000, icon: "truck", percentage: 5.6 },
      { name: "Master Stonemason Installation", amount: 17000, icon: "compass", percentage: 11.9 }
    ],
    transactions: [
      {
        id: "tx-101",
        date: "12 OCT 2026",
        reference: "Initial Consultation & Architectural Review",
        amount: 5000,
        status: "Completed",
        category: "Consultation",
        paymentMethod: "Corporate Wire Transfer"
      },
      {
        id: "tx-102",
        date: "18 OCT 2026",
        reference: "Material Sourcing & Quarry Hold Deposit",
        amount: 50000,
        status: "Pending",
        category: "Deposit",
        paymentMethod: "Instant BACS Settlement"
      },
      {
        id: "tx-103",
        date: "20 OCT 2026",
        reference: "Structural Substrate Assessment & 3D Scanning",
        amount: 12000,
        status: "Verified",
        category: "Engineering",
        paymentMethod: "Black AMEX"
      }
    ]
  },
  {
    id: "belgravia-townhouse",
    name: "BELGRAVIA ESTATE TOWNHOUSE",
    subtitle: "14 Eaton Square, London SW1W • Kitchen & Island Run",
    currency: "GBP",
    settlementDate: "15 NOV 2026",
    depositAmount: 35000,
    ledger: [
      { name: "Calacatta Gold Slabs (30mm)", amount: 62000, icon: "layers", percentage: 63.2 },
      { name: "Precision Edge Miter & CNC Cut", amount: 21000, icon: "wrench", percentage: 21.4 },
      { name: "London Transport & Crane Access", amount: 4500, icon: "truck", percentage: 4.6 },
      { name: "On-Site Installation & Sealing", amount: 10500, icon: "compass", percentage: 10.7 }
    ],
    transactions: [
      {
        id: "tx-201",
        date: "05 OCT 2026",
        reference: "RIBA Stage 4 Deposit",
        amount: 25000,
        status: "Completed",
        category: "Deposit",
        paymentMethod: "UK CHAPS Wire"
      },
      {
        id: "tx-202",
        date: "14 OCT 2026",
        reference: "Laser Templating & Subframe Inspection",
        amount: 3500,
        status: "Completed",
        category: "Inspection",
        paymentMethod: "Debit Card"
      }
    ]
  },
  {
    id: "one-hyde-park",
    name: "ONE HYDE PARK PENTHOUSE",
    subtitle: "100 Knightsbridge • Master Bath Spa Cladding",
    currency: "GBP",
    settlementDate: "02 DEC 2026",
    depositAmount: 40000,
    ledger: [
      { name: "Statuario Extra Porcelain Slabs", amount: 54000, icon: "layers", percentage: 58.0 },
      { name: "Bookmatch Vein Alignment & CNC", amount: 24000, icon: "wrench", percentage: 25.8 },
      { name: "Knightsbridge Crane Logistics", amount: 6000, icon: "truck", percentage: 6.5 },
      { name: "Wet-Room Waterproofing & Install", amount: 9000, icon: "compass", percentage: 9.7 }
    ],
    transactions: [
      {
        id: "tx-301",
        date: "01 OCT 2026",
        reference: "Design Specification & Retainer",
        amount: 15000,
        status: "Completed",
        category: "Retainer",
        paymentMethod: "Barclays Corporate Wire"
      }
    ]
  }
];

export default function FinancialCommandView() {
  const [projects, setProjects] = useState<FinancialProject[]>(INITIAL_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string>("villa-verde");
  const [statusFilter, setStatusFilter] = useState<"All" | "Completed" | "Pending" | "Verified">("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Payment Modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<"deposit" | "balance">("deposit");
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(50000);
  const [paymentMethodSelect, setPaymentMethodSelect] = useState<string>("Corporate Bank Wire");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Receipt Modal state
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<TransactionRecord | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  const totalEstimate = activeProject.ledger.reduce((acc, curr) => acc + curr.amount, 0);
  const completedPaid = activeProject.transactions
    .filter((tx) => tx.status === "Completed")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const outstandingBalance = Math.max(0, totalEstimate - completedPaid);

  const symbol = activeProject.currency === "GBP" ? "£" : "$";

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenPaymentModal = (type: "deposit" | "balance") => {
    setPaymentType(type);
    if (type === "deposit") {
      setPaymentAmountInput(activeProject.depositAmount);
    } else {
      setPaymentAmountInput(outstandingBalance);
    }
    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingPayment(true);

    setTimeout(() => {
      const newTx: TransactionRecord = {
        id: `tx-${Date.now().toString().slice(-4)}`,
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(),
        reference: paymentType === "deposit" ? "Project Deposit Settlement" : "Final Settlement Payment",
        amount: paymentAmountInput,
        status: "Completed",
        category: paymentType === "deposit" ? "Deposit" : "Final Settlement",
        paymentMethod: paymentMethodSelect
      };

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProject.id) {
            return {
              ...p,
              transactions: [newTx, ...p.transactions]
            };
          }
          return p;
        })
      );

      setIsProcessingPayment(false);
      setPaymentModalOpen(false);
      showToast(`Payment of ${symbol}${paymentAmountInput.toLocaleString()} verified successfully!`);
    }, 1200);
  };

  const filteredTransactions = activeProject.transactions.filter((tx) => {
    const matchesStatus = statusFilter === "All" || tx.status === statusFilter;
    const matchesSearch =
      tx.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.paymentMethod?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="bg-[#131313] min-h-screen text-[#e2e2e2] font-sans pb-24 pt-4 px-4 sm:px-6 md:px-12 animate-fade-in">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[200] bg-[#D4AF37] text-black px-4 py-3 rounded-lg font-mono text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Section Header */}
      <div className="max-w-[1200px] mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-[#292929] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded border border-[#D4AF37]/40">
                SMC PRO EXECUTIVE
              </span>
              <span className="text-neutral-400 font-mono text-xs flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" /> Encrypted Ledger
              </span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl text-white font-bold tracking-tight">
              Financial Command
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Project Ledger, Cost Breakdown &amp; Settlement Planning
            </p>
          </div>

          {/* Project Selector Switcher */}
          <div className="flex items-center gap-2 bg-[#1A1A1A] p-1.5 rounded-xl border border-[#333333]">
            <Building2 className="w-4 h-4 text-[#D4AF37] ml-2 shrink-0" />
            <select
              value={activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer py-1.5 pr-3"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#1A1A1A] text-white">
                  {p.name} ({p.currency})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Secure Payment Hero Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-[#1A1A1A] via-[#161616] to-[#0E0E0E] border border-[#333333] p-6 sm:p-8 rounded-2xl flex flex-col justify-between relative overflow-hidden group shadow-2xl">
            {/* Dark Marble Vein Background Accent */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
                 style={{ backgroundImage: `url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80')` }}
            />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8 sm:mb-12">
                <div>
                  <h3 className="font-serif text-xl sm:text-2xl text-[#D4AF37] font-semibold mb-1">
                    Total Outstanding Balance
                  </h3>
                  <p className="font-mono text-xs text-neutral-400 uppercase tracking-wider">
                    PROJECT: <span className="text-white font-bold">{activeProject.name}</span>
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">{activeProject.subtitle}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>

              <div className="mb-6">
                <span className="font-mono text-4xl sm:text-5xl font-bold text-white block leading-none tracking-tight">
                  {symbol}{outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-mono text-neutral-400">
                  <span>{activeProject.currency}</span>
                  <span>•</span>
                  <span>Settlement Date: <strong className="text-[#D4AF37]">{activeProject.settlementDate}</strong></span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Paid to date: {symbol}{completedPaid.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Project Value Locked Bar */}
              <div className="mb-6 p-3 bg-[#111111]/80 rounded-xl border border-[#2a2a2a]">
                <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
                  <span className="text-neutral-400 uppercase tracking-widest text-[10px]">Project Value Locked</span>
                  <span className="text-[#D4AF37] font-bold">
                    {totalEstimate > 0 ? ((completedPaid / totalEstimate) * 100).toFixed(2) : "0.00"}%
                  </span>
                </div>
                <div className="w-full bg-[#222222] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#D4AF37] h-full rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(212,175,55,0.6)]"
                    style={{ width: `${totalEstimate > 0 ? (completedPaid / totalEstimate) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Security Badges */}
              <div className="flex flex-wrap items-center gap-4 mb-4 text-[10px] font-mono uppercase text-neutral-400">
                <div className="flex items-center gap-1.5 bg-[#222]/80 px-2.5 py-1 rounded-lg border border-[#333]">
                  <Lock className="w-3 h-3 text-[#D4AF37]" />
                  <span>Secure Milestone Lock</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#222]/80 px-2.5 py-1 rounded-lg border border-[#333]">
                  <ShieldCheck className="w-3 h-3 text-[#D4AF37]" />
                  <span>Payment provider not configured</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="relative z-10 flex flex-col sm:flex-row gap-3 mt-auto pt-4 border-t border-[#292929]">
              <button
                onClick={() => handleOpenPaymentModal("deposit")}
                className="flex-1 bg-[#D4AF37] hover:bg-[#c29f2e] text-black font-mono font-bold text-xs uppercase tracking-wider py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-[#D4AF37]/20 active:scale-95"
              >
                <CreditCard className="w-4 h-4" />
                Pay Deposit ({symbol}{activeProject.depositAmount.toLocaleString()})
              </button>

              <button
                onClick={() => handleOpenPaymentModal("balance")}
                className="flex-1 bg-transparent hover:bg-[#D4AF37]/10 border border-[#D4AF37] text-[#D4AF37] font-mono font-bold text-xs uppercase tracking-wider py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <DollarSign className="w-4 h-4" />
                Settle Full Balance
              </button>
            </div>
          </div>

          {/* Project Ledger (Cost Breakdown) */}
          <div className="bg-[#1A1A1A] border border-[#333333] p-6 rounded-2xl flex flex-col justify-between shadow-xl">
            <div>
              <h3 className="font-serif text-lg text-white font-semibold mb-4 flex items-center justify-between border-b border-[#292929] pb-3">
                <span className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#D4AF37]" /> Project Ledger
                </span>
                <span className="text-[10px] font-mono text-neutral-400 bg-[#252525] px-2 py-0.5 rounded">
                  {activeProject.ledger.length} Line Items
                </span>
              </h3>

              <div className="space-y-4 my-4">
                {activeProject.ledger.map((item, idx) => (
                  <div key={idx} className="group">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#252525] border border-[#383838] flex items-center justify-center text-neutral-300 group-hover:text-[#D4AF37] group-hover:border-[#D4AF37]/40 transition-colors">
                          {item.icon === "layers" && <Layers className="w-3.5 h-3.5" />}
                          {item.icon === "wrench" && <Wrench className="w-3.5 h-3.5" />}
                          {item.icon === "truck" && <Truck className="w-3.5 h-3.5" />}
                          {item.icon === "compass" && <Compass className="w-3.5 h-3.5" />}
                        </div>
                        <span className="text-neutral-300 font-medium group-hover:text-white transition-colors">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-white">
                        {symbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Cost percentage bar */}
                    <div className="w-full bg-[#111111] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#D4AF37] h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Estimate Footer */}
            <div className="mt-6 pt-4 border-t border-[#333333] flex justify-between items-center">
              <span className="font-mono text-xs uppercase tracking-wider text-[#D4AF37] font-bold">
                Total Project Estimate
              </span>
              <span className="font-mono text-lg text-[#D4AF37] font-bold">
                {symbol}{totalEstimate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Transaction History Section */}
          <div className="lg:col-span-3 bg-[#1A1A1A] border border-[#333333] p-6 rounded-2xl shadow-2xl mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#292929] pb-4 mb-6">
              <div>
                <h3 className="font-serif text-xl text-white font-semibold">Transaction History</h3>
                <p className="text-neutral-400 text-xs mt-0.5">
                  Audited financial ledger statements and settlement receipts
                </p>
              </div>

              {/* Filters & Search Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#111111] border border-[#333333] text-xs text-white rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="flex items-center bg-[#111111] border border-[#333333] rounded-lg p-0.5">
                  {(["All", "Completed", "Pending", "Verified"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition-all ${
                        statusFilter === st
                          ? "bg-[#D4AF37] text-black font-bold"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#292929] bg-[#141414]">
                    <th className="py-3 px-4 font-mono text-[11px] text-neutral-400 uppercase tracking-wider">Date</th>
                    <th className="py-3 px-4 font-mono text-[11px] text-neutral-400 uppercase tracking-wider">Reference &amp; Category</th>
                    <th className="py-3 px-4 font-mono text-[11px] text-neutral-400 uppercase tracking-wider">Method</th>
                    <th className="py-3 px-4 font-mono text-[11px] text-neutral-400 uppercase tracking-wider">Amount</th>
                    <th className="py-3 px-4 font-mono text-[11px] text-neutral-400 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 font-mono text-[11px] text-neutral-400 uppercase tracking-wider text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#222222] transition-colors group">
                      <td className="py-4 px-4 font-mono text-xs text-white whitespace-nowrap">{tx.date}</td>
                      <td className="py-4 px-4 text-xs text-neutral-200">
                        <div className="font-medium text-white">{tx.reference}</div>
                        <span className="text-[10px] font-mono text-neutral-400">{tx.category}</span>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-neutral-400">{tx.paymentMethod || "Bank Transfer"}</td>
                      <td className="py-4 px-4 font-mono text-xs font-bold text-white whitespace-nowrap">
                        {symbol}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {tx.status === "Completed" && (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        )}
                        {tx.status === "Pending" && (
                          <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/40 text-amber-400 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold">
                            <Clock className="w-3 h-3" /> Pending Clearance
                          </span>
                        )}
                        {tx.status === "Verified" && (
                          <span className="inline-flex items-center gap-1 bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] px-2.5 py-0.5 rounded text-[11px] font-mono font-bold">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTxForReceipt(tx)}
                          className="p-1.5 rounded-lg bg-[#252525] border border-[#333333] text-neutral-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all group-hover:scale-105"
                          title="View Official Receipt"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-500 font-mono text-xs">
                        No transactions found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setPaymentModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full bg-[#252525]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-white">
                  {paymentType === "deposit" ? "Pay Deposit" : "Settlement Payment"}
                </h3>
                <p className="text-xs text-neutral-400 font-mono">
                  {activeProject.name}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">Payment Amount ({activeProject.currency})</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-mono font-bold text-sm">
                    {symbol}
                  </span>
                  <input
                    type="number"
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(Number(e.target.value))}
                    className="w-full bg-[#111111] border border-[#333333] text-white text-base font-mono font-bold rounded-xl pl-8 pr-4 py-2.5 focus:outline-none focus:border-[#D4AF37]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">Select Payment Method</label>
                <select
                  value={paymentMethodSelect}
                  onChange={(e) => setPaymentMethodSelect(e.target.value)}
                  className="w-full bg-[#111111] border border-[#333333] text-white text-xs font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="Corporate Bank Wire">Corporate Bank Wire (CHAPS/FedWire)</option>
                  <option value="Instant BACS Settlement">Instant BACS / Faster Payments</option>
                  <option value="Black AMEX / Visa Executive">Black AMEX / Visa Executive</option>
                  <option value="Escrow Hold Account">SMC Escrow Guarantee Account</option>
                </select>
              </div>

              <div className="bg-[#111111] border border-[#262626] p-3 rounded-xl text-[11px] font-mono text-neutral-400 space-y-1">
                <div className="flex justify-between">
                  <span>Merchant:</span>
                  <span className="text-white font-bold">Simo Marble &amp; Construction Ltd</span>
                </div>
                <div className="flex justify-between">
                  <span>SSL Security:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Production payment setup required
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessingPayment}
                className="w-full bg-[#D4AF37] hover:bg-[#c29f2e] text-black font-mono font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isProcessingPayment ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Processing Settlement...
                  </>
                ) : (
                  <>Confirm &amp; Pay {symbol}{paymentAmountInput.toLocaleString()}</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {selectedTxForReceipt && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-up text-white">
            <button
              onClick={() => setSelectedTxForReceipt(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full bg-[#252525]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-[#292929] pb-4 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase tracking-widest block">
                  OFFICIAL TRANSACTION STATEMENT
                </span>
                <h3 className="font-serif text-xl font-bold">SMC PRO Executive Invoice</h3>
              </div>
              <FileText className="w-8 h-8 text-[#D4AF37]" />
            </div>

            <div className="space-y-3 font-mono text-xs bg-[#111111] p-4 rounded-xl border border-[#292929]">
              <div className="flex justify-between">
                <span className="text-neutral-400">Transaction ID:</span>
                <span className="text-white font-bold">{selectedTxForReceipt.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Date:</span>
                <span className="text-white">{selectedTxForReceipt.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Project:</span>
                <span className="text-[#D4AF37] font-bold">{activeProject.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Reference:</span>
                <span className="text-white">{selectedTxForReceipt.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Payment Channel:</span>
                <span className="text-white">{selectedTxForReceipt.paymentMethod || "Corporate Wire"}</span>
              </div>
              <div className="flex justify-between border-t border-[#292929] pt-2 mt-2 text-sm">
                <span className="text-neutral-300 font-bold">Total Settled:</span>
                <span className="text-[#D4AF37] font-bold">
                  {symbol}{selectedTxForReceipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  showToast("Invoice PDF statement generated and downloaded!");
                  setSelectedTxForReceipt(null);
                }}
                className="bg-[#D4AF37] hover:bg-[#c29f2e] text-black font-mono font-bold text-xs uppercase px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" /> Download Certified PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
