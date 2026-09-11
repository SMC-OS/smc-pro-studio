import React, { useState } from "react";
import { 
  Sparkles, 
  Upload, 
  FileText, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  ArrowLeft,
  Edit3, 
  ChevronRight,
  Layers,
  History,
  FileCheck,
  Ruler,
  Share2,
  Download,
  ShoppingBag,
  MapPin,
  Check
} from "lucide-react";

interface RecentEstimate {
  id: string;
  name: string;
  material: string;
  sqft: number;
  status: "Draft" | "Finalized" | "Expired";
  date: string;
}

interface OnlineQuoteHubProps {
  onInitializeNewQuote: () => void;
  onTriggerAiScan: () => void;
  onFocusManualEntry: () => void;
  onSelectRecentEstimate?: (estimate: RecentEstimate) => void;
  onOpenStripePayment?: () => void;
  formatCurrency?: (val: number) => string;
}

/**
 * Phase 5 Gate 0 purge.
 *
 * This hub previously seeded three fabricated "recent estimates" with
 * invented client project names and invented total prices (£24,850,
 * £18,200, £14,900) presented as real quote history, and computed a
 * fabricated "Calculated Live Estimate" / "Estimated Total Investment"
 * from an invented £/m² pricing formula that fed directly into a live
 * "Pay Deposit (Stripe)" button and a "Reserve Slabs" action that claimed
 * a confirmed 14-day slab reservation. None of it was ever approved
 * pricing or a real reservation system. Per the approved Gate 0 decision,
 * the seed data and pricing formula are removed and the Pay/Reserve
 * actions are disabled — see tasks/todo.md's Gate 0 entry.
 */
export default function OnlineQuoteHub({
  onInitializeNewQuote,
  onTriggerAiScan,
  onFocusManualEntry,
  onSelectRecentEstimate,
  formatCurrency = (v) => `£${v.toLocaleString()}`
}: OnlineQuoteHubProps) {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [recentEstimates] = useState<RecentEstimate[]>([]);
  const [selectedArchiveFilter, setSelectedArchiveFilter] = useState<string>("all");

  // Step 2 Form States
  const [selectedMaterial, setSelectedMaterial] = useState<"marble" | "granite" | "quartz">("granite");
  const [widthMm, setWidthMm] = useState<number>(3200);
  const [lengthMm, setLengthMm] = useState<number>(1450);
  const [thicknessMm, setThicknessMm] = useState<number>(20);
  const [edgeProfile, setEdgeProfile] = useState<"bullnose" | "mitred" | "waterfall">("mitred");
  const [siteAddress, setSiteAddress] = useState<string>("");
  const [showNotification, setShowNotification] = useState<string | null>(null);

  const filteredEstimates = recentEstimates.filter((est) => {
    if (selectedArchiveFilter === "all") return true;
    return est.status.toLowerCase() === selectedArchiveFilter.toLowerCase();
  });

  const triggerToast = (msg: string) => {
    setShowNotification(msg);
    setTimeout(() => setShowNotification(null), 3500);
  };

  return (
    <div className="space-y-10 animate-fade-in text-neutral-100">
      {/* Global Notification Toast */}
      {showNotification && (
        <div className="fixed top-24 right-6 z-50 bg-[#D4AF37] text-black px-5 py-3 rounded-lg font-mono text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{showNotification}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse"></span>
            <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase font-bold">
              SMC PRO • TECHNICAL SPECIFICATION
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-white font-semibold tracking-tight">
            Online Quote
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            Request a quote for Marble, Granite, and Quartz in a few technical steps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeStep !== 1 && (
            <button
              onClick={() => setActiveStep(1)}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono uppercase tracking-wider px-3.5 py-2.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Overview Hub</span>
            </button>
          )}
          <button
            onClick={() => {
              setActiveStep(2);
              onInitializeNewQuote();
            }}
            className="bg-[#D4AF37] hover:bg-[#b5932a] text-black font-semibold text-xs tracking-wider uppercase px-4 py-2.5 rounded transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <span>+ New Specification</span>
          </button>
        </div>
      </div>

      {/* Progress Indicator (Minimalist Technical Steps) */}
      <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 w-full h-[1px] bg-neutral-800 -z-0"></div>
          
          {/* Step 1: INITIATE */}
          <button
            onClick={() => setActiveStep(1)}
            className="flex flex-col items-center bg-[#1A1A1A] px-3 z-10 group cursor-pointer"
          >
            <div
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                activeStep === 1
                  ? "bg-[#D4AF37] ring-4 ring-[#1A1A1A] shadow-[0_0_12px_rgba(212,175,55,0.6)] scale-110"
                  : activeStep > 1
                  ? "bg-emerald-500 ring-4 ring-[#1A1A1A]"
                  : "bg-neutral-700 ring-4 ring-[#1A1A1A] group-hover:bg-neutral-500"
              }`}
            />
            <span
              className={`text-[10px] font-mono tracking-widest uppercase mt-2 transition-colors ${
                activeStep === 1
                  ? "text-[#D4AF37] font-bold"
                  : "text-neutral-400 group-hover:text-neutral-200"
              }`}
            >
              1. INITIATE
            </span>
          </button>

          {/* Step 2: MATERIALS */}
          <button
            onClick={() => setActiveStep(2)}
            className="flex flex-col items-center bg-[#1A1A1A] px-3 z-10 group cursor-pointer"
          >
            <div
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                activeStep === 2
                  ? "bg-[#D4AF37] ring-4 ring-[#1A1A1A] shadow-[0_0_12px_rgba(212,175,55,0.6)] scale-110"
                  : activeStep > 2
                  ? "bg-emerald-500 ring-4 ring-[#1A1A1A]"
                  : "bg-neutral-700 ring-4 ring-[#1A1A1A] group-hover:bg-neutral-500"
              }`}
            />
            <span
              className={`text-[10px] font-mono tracking-widest uppercase mt-2 transition-colors ${
                activeStep === 2
                  ? "text-[#D4AF37] font-bold"
                  : "text-neutral-400 group-hover:text-neutral-200"
              }`}
            >
              2. MATERIALS
            </span>
          </button>

          {/* Step 3: DIMENSIONS */}
          <button
            onClick={() => setActiveStep(3)}
            className="flex flex-col items-center bg-[#1A1A1A] px-3 z-10 group cursor-pointer"
          >
            <div
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                activeStep === 3
                  ? "bg-[#D4AF37] ring-4 ring-[#1A1A1A] shadow-[0_0_12px_rgba(212,175,55,0.6)] scale-110"
                  : activeStep > 3
                  ? "bg-emerald-500 ring-4 ring-[#1A1A1A]"
                  : "bg-neutral-700 ring-4 ring-[#1A1A1A] group-hover:bg-neutral-500"
              }`}
            />
            <span
              className={`text-[10px] font-mono tracking-widest uppercase mt-2 transition-colors ${
                activeStep === 3
                  ? "text-[#D4AF37] font-bold"
                  : "text-neutral-400 group-hover:text-neutral-200"
              }`}
            >
              3. DIMENSIONS
            </span>
          </button>

          {/* Step 4: REVIEW */}
          <button
            onClick={() => setActiveStep(4)}
            className="flex flex-col items-center bg-[#1A1A1A] px-3 z-10 group cursor-pointer"
          >
            <div
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                activeStep === 4
                  ? "bg-[#D4AF37] ring-4 ring-[#1A1A1A] shadow-[0_0_12px_rgba(212,175,55,0.6)] scale-110"
                  : "bg-neutral-700 ring-4 ring-[#1A1A1A] group-hover:bg-neutral-500"
              }`}
            />
            <span
              className={`text-[10px] font-mono tracking-widest uppercase mt-2 transition-colors ${
                activeStep === 4
                  ? "text-[#D4AF37] font-bold"
                  : "text-neutral-400 group-hover:text-neutral-200"
              }`}
            >
              4. REVIEW
            </span>
          </button>
        </div>
      </div>

      {/* STEP 1: INITIATE & OVERVIEW */}
      {activeStep === 1 && (
        <div className="space-y-10 animate-fade-in">
          {/* Primary Action Area (Bento Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Start New Estimate Card */}
            <div className="md:col-span-8 bg-[#1A1A1A] border border-neutral-800 rounded-xl p-8 relative overflow-hidden group hover:border-[#D4AF37]/40 transition-all duration-300 flex flex-col justify-between min-h-[260px]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#252525] to-[#141414] opacity-80 z-0 pointer-events-none"></div>
              
              <div className="relative z-10 space-y-3">
                <span className="inline-block px-2.5 py-1 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px] font-mono rounded font-semibold uppercase tracking-widest">
                  Standard Workflow
                </span>
                <h2 className="font-serif text-2xl md:text-3xl text-white font-medium">
                  Start New Estimate
                </h2>
                <p className="text-neutral-400 text-sm max-w-md leading-relaxed">
                  Begin a new technical specification for your upcoming project. Ensure all architectural documentation and dimension measurements are prepared.
                </p>
              </div>

              <div className="relative z-10 pt-6">
                <button
                  onClick={() => {
                    setActiveStep(2);
                    onInitializeNewQuote();
                  }}
                  className="bg-[#D4AF37] text-black px-6 py-3.5 rounded font-mono text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors duration-200 flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <span>Initialize Workflow</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Decorative Architectural Icon Background */}
              <div className="absolute right-[-20px] bottom-[-30px] opacity-5 group-hover:opacity-15 transition-opacity duration-500 pointer-events-none">
                <span className="material-symbols-outlined text-[240px] text-white">architecture</span>
              </div>
            </div>

            {/* Options Stack */}
            <div className="md:col-span-4 flex flex-col gap-6">
              
              {/* AI Plan Analysis Card */}
              <div
                onClick={onTriggerAiScan}
                className="flex-1 bg-[#1A1A1A] border border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-xl p-6 flex flex-col justify-center items-center text-center transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-[0_0_20px_rgba(212,175,55,0.15)]"
              >
                <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-4 group-hover:bg-[#D4AF37]/20 transition-colors">
                  <Sparkles className="w-6 h-6 text-[#D4AF37] animate-pulse" />
                </div>
                <h3 className="font-serif text-lg text-white mb-1 font-medium">
                  AI Plan Analysis
                </h3>
                <p className="text-neutral-400 text-xs mb-4 leading-relaxed">
                  Upload CAD drawings or PDF blueprints for automated extraction.
                </p>
                <span className="font-mono text-[11px] font-bold tracking-wider text-[#D4AF37] flex items-center gap-1.5 uppercase group-hover:gap-2 transition-all">
                  Upload Docs <Upload className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* Manual Entry Card */}
              <div
                onClick={() => {
                  setActiveStep(2);
                  onFocusManualEntry();
                }}
                className="flex-1 bg-[#1A1A1A] border border-neutral-800 hover:border-neutral-500 rounded-xl p-6 flex flex-col justify-center items-center text-center transition-all duration-300 cursor-pointer group shadow-sm"
              >
                <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-4 group-hover:bg-neutral-700 transition-colors">
                  <Edit3 className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-serif text-lg text-white mb-1 font-medium">
                  Manual Entry
                </h3>
                <p className="text-neutral-400 text-xs mb-4 leading-relaxed">
                  Input dimensions and slab specifications directly into grid.
                </p>
                <span className="font-mono text-[11px] font-bold tracking-wider text-white flex items-center gap-1.5 uppercase group-hover:gap-2 transition-all">
                  Enter Data <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>

          {/* Recent Estimates Section */}
          <div className="space-y-6 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <h2 className="font-serif text-xl md:text-2xl text-white font-medium">
                  Recent Estimates
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Review and manage your previously calculated project quotes.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-neutral-400 mr-2">Filter:</span>
                <button
                  onClick={() => setSelectedArchiveFilter("all")}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded transition-colors uppercase font-semibold ${
                    selectedArchiveFilter === "all"
                      ? "bg-[#D4AF37] text-black font-bold"
                      : "bg-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedArchiveFilter("draft")}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded transition-colors uppercase font-semibold ${
                    selectedArchiveFilter === "draft"
                      ? "bg-amber-500 text-black font-bold"
                      : "bg-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  Drafts
                </button>
                <button
                  onClick={() => setSelectedArchiveFilter("finalized")}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded transition-colors uppercase font-semibold ${
                    selectedArchiveFilter === "finalized"
                      ? "bg-emerald-500 text-black font-bold"
                      : "bg-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  Finalized
                </button>
              </div>
            </div>

            {/* List of Recent Estimates */}
            <div className="space-y-3">
              {filteredEstimates.length === 0 && (
                <div className="text-center py-10 text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-lg">
                  No estimates yet. Start a new specification above.
                </div>
              )}
              {filteredEstimates.map((est) => (
                <div
                  key={est.id}
                  onClick={() => {
                    if (onSelectRecentEstimate) onSelectRecentEstimate(est);
                    setActiveStep(4);
                  }}
                  className="bg-[#1A1A1A] border border-neutral-800 rounded-lg p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-[#D4AF37]/50 transition-all duration-200 cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex w-12 h-12 bg-neutral-900 rounded border border-neutral-800 items-center justify-center shrink-0 group-hover:border-[#D4AF37]/40 transition-colors">
                      {est.status === "Finalized" ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : est.status === "Draft" ? (
                        <FileText className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-neutral-500" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-neutral-400 tracking-wider">
                          {est.id}
                        </span>
                        <span className="text-[10px] text-neutral-600">•</span>
                        <span className="font-mono text-[10px] text-neutral-400">
                          {est.date}
                        </span>
                      </div>

                      <h3 className="font-serif text-base text-white font-medium group-hover:text-[#D4AF37] transition-colors">
                        {est.name}
                      </h3>

                      <div className="text-xs text-neutral-400 mt-0.5">
                        {est.material} <span className="text-neutral-600">•</span> {est.sqft} sq ft
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-neutral-800">
                    <div className="font-mono text-xs font-bold text-white tracking-tight">
                      Price on Application
                    </div>

                    <div
                      className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-widest font-bold border ${
                        est.status === "Draft"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : est.status === "Finalized"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-red-500/10 text-red-400 border-red-500/30"
                      }`}
                    >
                      {est.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: TECHNICAL SPECIFICATIONS & MATERIAL CORE */}
      {(activeStep === 2 || activeStep === 3) && (
        <div className="space-y-12 animate-fade-in">
          <div className="flex flex-col gap-3 border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-2 text-xs font-mono text-[#D4AF37]">
              <span>TECHNICAL PARAMETERS</span>
            </div>
            <h2 className="font-serif text-2xl md:text-3xl text-white font-semibold">
              Step 2 & 3: Technical Specifications & Dimensions
            </h2>
            <p className="text-sm text-neutral-400 max-w-2xl">
              Define the material grade, precise dimensions, edge detailing, and delivery logistics for your architectural installation.
            </p>
          </div>

          {/* 1. Material Core Selector */}
          <section className="space-y-4">
            <h3 className="font-serif text-xl text-white flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-[#D4AF37]" />
              <span>1. Select Material Core</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Marble */}
              <div
                onClick={() => setSelectedMaterial("marble")}
                className={`h-[360px] relative rounded-xl overflow-hidden group cursor-pointer border transition-all duration-300 bg-[#1A1A1A] flex flex-col justify-between p-6 ${
                  selectedMaterial === "marble"
                    ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/40 shadow-[0_0_25px_rgba(212,175,55,0.2)]"
                    : "border-neutral-800 hover:border-neutral-600"
                }`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-60 mix-blend-luminosity group-hover:mix-blend-normal"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80')`
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                <div className="relative z-10 flex justify-between items-start">
                  <span className="bg-[#D4AF37] text-black font-mono text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider">
                    NATURAL STONE
                  </span>
                  {selectedMaterial === "marble" && (
                    <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black flex items-center justify-center">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="relative z-10 space-y-1">
                  <h4 className="font-serif text-2xl text-white font-medium">Marble</h4>
                  <p className="text-xs font-mono text-neutral-300">Calacatta & Carrara Grades</p>
                  <p className="text-[11px] text-neutral-400 pt-1">High porosity • Premium polished finish</p>
                </div>
              </div>

              {/* Granite */}
              <div
                onClick={() => setSelectedMaterial("granite")}
                className={`h-[360px] relative rounded-xl overflow-hidden group cursor-pointer border transition-all duration-300 bg-[#1A1A1A] flex flex-col justify-between p-6 ${
                  selectedMaterial === "granite"
                    ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/40 shadow-[0_0_25px_rgba(212,175,55,0.2)]"
                    : "border-neutral-800 hover:border-neutral-600"
                }`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-60 mix-blend-luminosity"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80')`
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                <div className="relative z-10 flex justify-between items-start">
                  <span className="bg-neutral-800 text-neutral-300 font-mono text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider border border-neutral-700">
                    IGNEOUS ROCK
                  </span>
                  {selectedMaterial === "granite" && (
                    <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black flex items-center justify-center">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="relative z-10 space-y-1">
                  <h4 className="font-serif text-2xl text-white font-medium">Granite</h4>
                  <p className="text-xs font-mono text-neutral-300">Absolute Black & Cosmic Gold</p>
                  <p className="text-[11px] text-neutral-400 pt-1">High density • Extremely scratch resistant</p>
                </div>
              </div>

              {/* Quartz */}
              <div
                onClick={() => setSelectedMaterial("quartz")}
                className={`h-[360px] relative rounded-xl overflow-hidden group cursor-pointer border transition-all duration-300 bg-[#1A1A1A] flex flex-col justify-between p-6 ${
                  selectedMaterial === "quartz"
                    ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/40 shadow-[0_0_25px_rgba(212,175,55,0.2)]"
                    : "border-neutral-800 hover:border-neutral-600"
                }`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-60 mix-blend-luminosity group-hover:mix-blend-normal"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80')`
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                <div className="relative z-10 flex justify-between items-start">
                  <span className="bg-neutral-800 text-neutral-300 font-mono text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider border border-neutral-700">
                    ENGINEERED
                  </span>
                  {selectedMaterial === "quartz" && (
                    <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black flex items-center justify-center">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="relative z-10 space-y-1">
                  <h4 className="font-serif text-2xl text-white font-medium">Quartz</h4>
                  <p className="text-xs font-mono text-neutral-300">Engineered Composites</p>
                  <p className="text-[11px] text-neutral-400 pt-1">Non-porous • Uniform pattern continuity</p>
                </div>
              </div>
            </div>
          </section>

          {/* 2 & 3. Dimensions & Edge Detailing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Dimensions Input */}
            <section className="space-y-4">
              <h3 className="font-serif text-xl text-white flex items-center gap-2.5">
                <Ruler className="w-5 h-5 text-[#D4AF37]" />
                <span>2. Slab Dimensions (mm)</span>
              </h3>

              <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl p-6 space-y-6">
                <div>
                  <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-2">
                    Width Overall (mm)
                  </label>
                  <div className="flex items-center border-b border-neutral-700 focus-within:border-[#D4AF37] pb-2 transition-colors">
                    <input
                      type="number"
                      value={widthMm}
                      onChange={(e) => setWidthMm(Number(e.target.value) || 0)}
                      className="bg-transparent border-none w-full font-mono text-xl text-white focus:outline-none"
                    />
                    <span className="font-mono text-xs text-neutral-500">mm</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-2">
                    Length Overall (mm)
                  </label>
                  <div className="flex items-center border-b border-neutral-700 focus-within:border-[#D4AF37] pb-2 transition-colors">
                    <input
                      type="number"
                      value={lengthMm}
                      onChange={(e) => setLengthMm(Number(e.target.value) || 0)}
                      className="bg-transparent border-none w-full font-mono text-xl text-white focus:outline-none"
                    />
                    <span className="font-mono text-xs text-neutral-500">mm</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-2">
                    Slab Thickness
                  </label>
                  <select
                    value={thicknessMm}
                    onChange={(e) => setThicknessMm(Number(e.target.value))}
                    className="bg-[#252525] border border-neutral-700 rounded text-white font-mono text-sm w-full p-3 focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value={12}>12 mm (Ultra-compact Ceramic / Porcelain)</option>
                    <option value={20}>20 mm (Standard Architectural Spec)</option>
                    <option value={30}>30 mm (Premium Solid Edge Spec)</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Edge Profile Selector */}
            <section className="space-y-4">
              <h3 className="font-serif text-xl text-white flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#D4AF37] text-xl">architecture</span>
                <span>3. Edge Detailing</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Bullnose */}
                <div
                  onClick={() => setEdgeProfile("bullnose")}
                  className={`bg-[#1A1A1A] border rounded-xl p-5 flex flex-col items-center gap-4 cursor-pointer transition-all ${
                    edgeProfile === "bullnose"
                      ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/30 bg-[#222222]"
                      : "border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  <svg className="text-neutral-400" fill="none" height="54" viewBox="0 0 64 64" width="54">
                    <path d="M10 54 L54 54 L54 30 C54 18.9543 45.0457 10 34 10 L10 10" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span className="font-mono text-xs text-center text-white font-semibold">BULLNOSE</span>
                </div>

                {/* Mitred */}
                <div
                  onClick={() => setEdgeProfile("mitred")}
                  className={`bg-[#1A1A1A] border rounded-xl p-5 flex flex-col items-center gap-4 cursor-pointer transition-all relative ${
                    edgeProfile === "mitred"
                      ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/30 bg-[#222222]"
                      : "border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  <div className="absolute top-2 right-2">
                    {edgeProfile === "mitred" && <Check className="w-3.5 h-3.5 text-[#D4AF37]" />}
                  </div>
                  <svg className="text-[#D4AF37]" fill="none" height="54" viewBox="0 0 64 64" width="54">
                    <path d="M10 54 L54 54 L54 10 L10 10 M54 10 L34 30" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span className="font-mono text-xs text-center text-[#D4AF37] font-semibold">MITRED (45°)</span>
                </div>

                {/* Waterfall */}
                <div
                  onClick={() => setEdgeProfile("waterfall")}
                  className={`bg-[#1A1A1A] border rounded-xl p-5 flex flex-col items-center gap-4 cursor-pointer transition-all ${
                    edgeProfile === "waterfall"
                      ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/30 bg-[#222222]"
                      : "border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  <svg className="text-neutral-400" fill="none" height="54" viewBox="0 0 64 64" width="54">
                    <path d="M10 10 L54 10 L54 54" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span className="font-mono text-xs text-center text-white font-semibold">WATERFALL</span>
                </div>
              </div>
            </section>
          </div>

          {/* 4. Site Location & Logistics */}
          <section className="space-y-4 pt-4 border-t border-neutral-800">
            <h3 className="font-serif text-xl text-white flex items-center gap-2.5">
              <MapPin className="w-5 h-5 text-[#D4AF37]" />
              <span>4. Logistics & Site Routing</span>
            </h3>

            <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl p-6">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <MapPin className="w-5 h-5 text-neutral-400 shrink-0 mt-1 md:mt-0" />
                <div className="flex-1 w-full space-y-1">
                  <label className="font-mono text-xs text-neutral-400 uppercase tracking-wider block">
                    Site Coordinates / Address
                  </label>
                  <input
                    type="text"
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                    className="w-full bg-[#252525] border border-neutral-700 rounded text-white font-mono text-sm px-4 py-2.5 focus:outline-none focus:border-[#D4AF37]"
                    placeholder="Enter site delivery address..."
                  />
                  <p className="text-xs text-neutral-500 pt-1">
                    Used to confirm delivery access and routing when your quote is prepared.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Step Action Bar Footer */}
          <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl">
            <div>
              <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider block">
                Pricing
              </span>
              <div className="font-mono text-xl font-bold text-[#D4AF37]">
                Price on Application
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => triggerToast("Specification draft saved to your project vault.")}
                className="flex-1 sm:flex-none border border-neutral-700 hover:border-white text-white font-mono text-xs font-bold uppercase tracking-wider px-5 py-3 rounded transition-colors"
              >
                Save Draft
              </button>
              <button
                onClick={() => setActiveStep(4)}
                className="flex-1 sm:flex-none bg-[#D4AF37] hover:bg-white text-black font-mono text-xs font-bold uppercase tracking-wider px-6 py-3 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Generate Full Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW & ESTIMATE SUMMARY */}
      {activeStep === 4 && (
        <div className="space-y-10 animate-fade-in">
          {/* Top Info Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-neutral-800 pb-4">
            <div>
              <h2 className="font-serif text-3xl text-white font-semibold">
                Project Estimate Summary
              </h2>
            </div>

            <button
              onClick={() => setActiveStep(2)}
              className="text-xs font-mono text-[#D4AF37] hover:underline flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" /> Modify Parameters
            </button>
          </div>

          {/* Hero Summary Card */}
          <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl p-8 relative overflow-hidden group shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] to-[#141414] opacity-70"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div>
                <span className="font-mono text-xs text-neutral-400 uppercase tracking-wider block mb-1">
                  Pricing
                </span>
                <div className="font-serif text-3xl md:text-4xl text-[#D4AF37] font-bold tracking-tight">
                  Price on Application
                </div>
                <p className="text-xs text-neutral-400 mt-2">
                  Confirmed by our team based on your specification.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button
                  onClick={() => triggerToast("Request sent — our team will follow up with your quote.")}
                  className="bg-[#D4AF37] hover:bg-white text-black px-6 py-3.5 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Request Quote</span>
                </button>
              </div>
            </div>
          </div>

          {/* Technical Breakdown Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left: Material & Specs Table */}
            <div className="md:col-span-8 space-y-6">
              {/* Material Details Card */}
              <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="w-full sm:w-1/3 h-44 rounded-lg overflow-hidden border border-neutral-800 relative shrink-0">
                    <img
                      src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
                      alt={selectedMaterial}
                      className="w-full h-full object-cover absolute inset-0"
                    />
                  </div>

                  <div className="w-full sm:w-2/3 space-y-3">
                    <span className="font-mono text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2.5 py-1 rounded inline-block uppercase font-bold tracking-wider">
                      SELECTED MATERIAL CORE
                    </span>
                    <h3 className="font-serif text-2xl text-white font-medium capitalize">
                      {selectedMaterial}
                    </h3>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-800">
                      <div>
                        <span className="font-mono text-[10px] text-neutral-400 block uppercase">Thickness</span>
                        <span className="font-mono text-sm text-white font-bold">{thicknessMm}mm Solid Core</span>
                      </div>
                      <div>
                        <span className="font-mono text-[10px] text-neutral-400 block uppercase">Finish</span>
                        <span className="font-mono text-sm text-white font-bold">Ultra Polished</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fabrication Details Table */}
              <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/60">
                      <th className="py-3.5 px-6 font-mono text-xs text-neutral-400 uppercase tracking-wider">
                        SPECIFICATION
                      </th>
                      <th className="py-3.5 px-6 font-mono text-xs text-neutral-400 uppercase tracking-wider text-right">
                        VALUE
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs divide-y divide-neutral-800">
                    <tr>
                      <td className="py-4 px-6 text-white font-medium">Total Surface Area</td>
                      <td className="py-4 px-6 text-right text-[#D4AF37] font-bold">{((widthMm * lengthMm) / 1000000).toFixed(1)} m²</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-white font-medium">Edge Profile</td>
                      <td className="py-4 px-6 text-right text-neutral-300">
                        {edgeProfile.toUpperCase()}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-white font-medium">Slab Thickness</td>
                      <td className="py-4 px-6 text-right text-neutral-300">
                        {thicknessMm}mm
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Next Steps */}
            <div className="md:col-span-4 space-y-6">
              <div className="bg-[#1A1A1A] border border-neutral-800 rounded-xl p-6 h-full flex flex-col justify-between relative overflow-hidden">
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                    <h3 className="font-mono text-xs text-white font-bold uppercase tracking-wider">
                      Next Steps
                    </h3>
                  </div>

                  <p className="font-mono text-xs text-neutral-400 leading-relaxed pt-2">
                    Our team will review your specification and confirm slab layout, pricing, and fabrication timeline.
                  </p>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => triggerToast("Sharing link copied to clipboard.")}
                    className="w-full border border-neutral-700 hover:border-white text-white font-mono text-xs font-bold uppercase tracking-wider py-3 rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share With Architect</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
