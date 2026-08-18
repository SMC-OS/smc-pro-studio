import React, { useState } from "react";
import {
  FileText,
  Printer,
  Save,
  Send,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Layers,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Info
} from "lucide-react";

interface EstimatePart {
  id: string;
  name: string;
  length: number;
  width: number;
  materialId: string;
  thickness: string;
  edgeProfile: string;
  edgeLength: number;
  sinkCutouts: number;
  cooktopCutouts: number;
  faucetHoles: number;
  backsplashLength: number;
  backsplashHeight: number;
  material?: {
    id: string;
    name: string;
    class: string;
    price: number;
  };
  totalSqFt?: number;
  baseCost?: number;
  totalEdgeCost?: number;
  totalCutoutsCost?: number;
  surchargeCost?: number;
  surchargePct?: number;
  totalCost: number;
}

interface Project {
  id: string;
  name: string;
  address: string;
  status: string;
  notes: string;
  estimates: any[];
  createdAt: string;
  fabricationDetails?: any;
}

interface QuoteSummaryProps {
  estimateParts: EstimatePart[];
  calculatedEstimatePartsSummary: any[];
  activeEstimateGrandTotal: number;
  quoteNumber: string;
  setQuoteNumber: (num: string) => void;
  quoteNotes: string;
  setQuoteNotes: (notes: string) => void;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setActiveTab: (tab: any) => void;
  formatCurrency: (val: number) => string;
}

export default function QuoteSummary({
  estimateParts,
  calculatedEstimatePartsSummary,
  activeEstimateGrandTotal,
  quoteNumber,
  setQuoteNumber,
  quoteNotes,
  setQuoteNotes,
  projects,
  setProjects,
  setActiveTab,
  formatCurrency
}: QuoteSummaryProps) {
  
  // Local state managers
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [issueDate, setIssueDate] = useState("2026-07-20");
  const [validUntil, setValidUntil] = useState("2026-08-20");
  
  const [bindSelectedProjectId, setBindSelectedProjectId] = useState<string>("");
  const [bindSuccess, setBindSuccess] = useState<string | null>(null);
  
  const [dispatchStatus, setDispatchStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);

  const handleBindToProject = () => {
    if (!bindSelectedProjectId) return;
    
    // Add current estimate parts to the selected project's estimates
    setProjects(prevProjects => 
      prevProjects.map(p => {
        if (p.id === bindSelectedProjectId) {
          // Copy existing and append new parts
          return {
            ...p,
            estimates: [
              ...p.estimates,
              ...JSON.parse(JSON.stringify(estimateParts))
            ],
            notes: p.notes + `\n\n[System Log - Bound Quote #EST-${quoteNumber}]: Auto-imported layout estimate parts totaling ${formatCurrency(activeEstimateGrandTotal)}.`
          };
        }
        return p;
      })
    );
    
    setBindSuccess(`Successfully compiled and bound all quote items directly into the active timeline of "${projects.find(p => p.id === bindSelectedProjectId)?.name}".`);
    setTimeout(() => setBindSuccess(null), 6000);
  };

  const handleDispatchClient = () => {
    setDispatchStatus("sending");
    setTimeout(() => {
      setDispatchStatus("success");
      setTimeout(() => setDispatchStatus("idle"), 5000);
    }, 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="quote-summary-tab-container" className="space-y-8 animate-fade-in text-[#1A1A1A]">
      
      {/* HEADER CONTROLS */}
      <div className="no-print bg-[#FBFBFA] border border-neutral-200 p-5 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab("estimator")}
            className="group flex items-center gap-1.5 text-xs font-mono font-bold text-neutral-500 hover:text-gold transition-colors uppercase tracking-widest cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            Back to Design Estimator
          </button>
          <div className="flex items-center gap-3 mt-1">
            <h2 className="font-serif text-2xl font-light text-neutral-900">
              SMC PRO | Quote Summary <span className="text-gold font-sans font-bold">#EST-{quoteNumber}</span>
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono bg-gold/10 text-gold border border-gold/20 font-bold tracking-wider uppercase">
              Provisional Ledger
            </span>
          </div>
        </div>

        {/* Toolbar buttons */}
        <div className="flex flex-wrap gap-2.5 items-center">
          <button
            onClick={() => setIsEditingMetadata(!isEditingMetadata)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer ${
              isEditingMetadata 
                ? "bg-gold text-white border-gold" 
                : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            {isEditingMetadata ? "Apply Metadata" : "Edit Details"}
          </button>

          <button
            onClick={handlePrint}
            className="bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print/Save PDF
          </button>

          <button
            onClick={handleDispatchClient}
            disabled={dispatchStatus === "sending"}
            className="bg-neutral-900 hover:bg-gold hover:text-white text-white px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            {dispatchStatus === "sending" ? "Dispatching..." : dispatchStatus === "success" ? "Dispatched!" : "Dispatch to Client"}
          </button>
        </div>
      </div>

      {/* METADATA EDITOR PANEL */}
      {isEditingMetadata && (
        <div className="no-print bg-neutral-50 border border-neutral-200 p-6 rounded-2xl animate-fade-in grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Quote Reference Code</label>
            <input
              type="text"
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
              className="w-full bg-white border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs font-semibold transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Project / Site Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Lansdowne Residences SW7"
              className="w-full bg-white border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs font-semibold transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Authorized Representative</label>
            <input
              type="text"
              value={clientContact}
              onChange={(e) => setClientContact(e.target.value)}
              placeholder="e.g. James Sterling MRICS"
              className="w-full bg-white border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs font-medium transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Client Trade Email</label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="e.g. j.sterling@sterlingconstruction.co.uk"
              className="w-full bg-white border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs font-medium transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Ledger Issue Date</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full bg-white border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs font-mono transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Valuation Valid Until</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full bg-white border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs font-mono transition-all"
            />
          </div>
        </div>
      )}

      {/* FEEDBACK BANNERS */}
      {dispatchStatus === "success" && (
        <div className="no-print p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center gap-2.5 animate-fade-in">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0 animate-bounce" />
          <div>
            <strong>Client Copy Dispatched!</strong> A detailed PDF-rendered technical quote has been successfully sent to <span className="font-bold underline">{clientEmail}</span> and archived in your SMC system.
          </div>
        </div>
      )}

      {/* PRIMARY BIND CONTROLS */}
      <div className="no-print bg-white border border-neutral-200 p-5 rounded-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gold/10 text-gold rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif text-lg font-medium text-neutral-900">Bind Valuation to Active Project Pipeline</h4>
            <p className="text-xs text-neutral-500">Attach these quote parts and price calculations directly to a customer account for installation scheduling.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={bindSelectedProjectId}
            onChange={(e) => setBindSelectedProjectId(e.target.value)}
            className="flex-1 bg-neutral-50 border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded-lg px-3.5 py-2.5 text-xs font-medium"
          >
            <option value="">-- Choose Project Record to Bind Estimate --</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name} ({proj.address}) [{proj.status}]
              </option>
            ))}
          </select>
          <button
            onClick={handleBindToProject}
            disabled={!bindSelectedProjectId}
            className="bg-[#1A1A1A] hover:bg-gold text-white disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Bind to Selected Project
          </button>
        </div>

        {bindSuccess && (
          <div className="p-3.5 bg-gold/10 border border-gold/20 text-gold-900 rounded-lg text-xs flex items-center gap-2.5 animate-fade-in">
            <Sparkles className="w-4 h-4 text-gold flex-shrink-0" />
            <span>{bindSuccess}</span>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* IMMERSIVE QUOTE SUMMARY DOCUMENT (THE PRINT LAYOUT) */}
      {/* ========================================================= */}
      <div id="smc-printable-quote-dossier" className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-12 shadow-md relative overflow-hidden print:border-0 print:p-0 print:shadow-none">
        
        {/* Subtle top header gold band for printable aesthetics */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-neutral-200 via-gold to-neutral-200"></div>

        {/* Brand Letterhead */}
        <div className="flex flex-col md:flex-row justify-between items-start border-b border-neutral-150 pb-8 gap-6">
          <div className="space-y-3">
            {/* SMC Logo */}
            <div className="flex items-center gap-3.5">
              <img 
                alt="SMC PRO Logo" 
                className="h-8 w-auto object-contain mix-blend-multiply" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBXNV_RiofajRHjAoUdeRL9DEe2QkYbM7Tc0A4TQGbDMcjFQw7Q5zg9KIK2ijao316cxP_79D-6J5NzIHqGSsKu4We4TrVBU9wXJ-Oki7eDSGHaKKrZC6H9bitIoGlyNOMKRzOMOxJ7P98OaPN4DFpS7I8k6ifbcEAbyIrTMtqR8d6Yfx7XBkh3itiTP9iEqSYh_FMLknw4CwMtdIRxcCZr-5-A3zhzsZvV5yGDXPOTs9J_FTIffTZ0lCxFXwpnnkh4xJeo_osw6k"
              />
              <span className="font-serif text-2xl tracking-widest font-semibold text-[#1A1A1A]">
                SMC <span className="text-gold font-sans font-bold text-xl">PRO</span>
              </span>
              <span className="h-5 w-px bg-neutral-200"></span>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 font-bold">STONEMASON CHANNELS</span>
            </div>
            
            <div className="text-xs text-neutral-500 font-medium space-y-0.5 font-sans">
              <p>Stone Measurement & Cutting Solutions Ltd</p>
              <p>Battersea Design District, Unit 4C</p>
              <p>London, SW11 4BB • United Kingdom</p>
              <p className="font-mono text-[10px] text-neutral-400 mt-1">VAT: GB 928 4102 38 • TEL: +44 (0) 20 7412 9000</p>
            </div>
          </div>

          <div className="text-right md:text-right space-y-1 md:self-stretch flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-gold font-bold tracking-widest uppercase block">OFFICIAL VALUATION</span>
              <h1 className="font-serif text-4xl font-light text-neutral-900 gold-glow">
                EST-{quoteNumber}
              </h1>
            </div>
            <div className="text-xs text-neutral-500 font-mono space-y-0.5 mt-4 md:mt-0">
              <p>DATE: {issueDate}</p>
              <p>VALID UNTIL: {validUntil}</p>
              <p>REPRESENTATIVE ID: PRO-SMC-4902</p>
            </div>
          </div>
        </div>

        {/* Client & Dossier Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b border-neutral-150">
          <div className="space-y-2.5">
            <span className="text-[9px] font-mono text-neutral-400 font-bold tracking-widest uppercase block">PRO PARTNER / CLIENT RECIPIENT</span>
            <div className="p-4 bg-[#FBFBFA] border border-neutral-150 rounded-xl space-y-1 font-sans">
              <h4 className="font-serif text-base font-semibold text-neutral-900">{clientName}</h4>
              <p className="text-xs text-neutral-600 font-medium">Attn: {clientContact}</p>
              <p className="text-xs text-neutral-400 font-mono">{clientEmail}</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <span className="text-[9px] font-mono text-neutral-400 font-bold tracking-widest uppercase block">SYSTEM ESTIMATION REPORT</span>
            <div className="p-4 bg-[#FBFBFA] border border-neutral-150 rounded-xl space-y-1 font-mono text-[11px] leading-relaxed">
              <div className="flex justify-between">
                <span className="text-neutral-500">ALGORITHM CORE:</span>
                <span className="text-neutral-800 font-bold">Prism-Core™ OCR v4.2.1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">SECTIONS DEFINED:</span>
                <span className="text-neutral-800 font-bold">{estimateParts.length} Slab Blocks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">BASE CURRENCY:</span>
                <span className="text-neutral-800 font-bold">GBP (£) - Sterling</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">FABRICATION STATUS:</span>
                <span className="text-neutral-800 text-gold font-bold">Plausible Ledger</span>
              </div>
            </div>
          </div>
        </div>

        {/* Parts Line Item Breakdown Table */}
        <div className="py-8 space-y-4">
          <span className="text-[9px] font-mono text-neutral-400 font-bold tracking-widest uppercase block">COUNTERTOP & BACKSPLASH BLOCK DETAILS</span>
          
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="bg-[#FBFBFA] border-b border-neutral-200 text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                  <th className="py-3.5 px-4 font-bold">Slab Block Component</th>
                  <th className="py-3.5 px-3 font-bold text-center">Dimensions (in)</th>
                  <th className="py-3.5 px-3 font-bold text-center">Thickness</th>
                  <th className="py-3.5 px-3 font-bold text-center">Material Choice</th>
                  <th className="py-3.5 px-3 font-bold">Edge Profile</th>
                  <th className="py-3.5 px-3 font-bold text-center">Cutouts</th>
                  <th className="py-3.5 px-4 font-bold text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-neutral-150">
                {calculatedEstimatePartsSummary.map((part, index) => (
                  <tr key={part.id || index} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 px-4 font-medium text-neutral-900">
                      <div>
                        <div className="font-semibold">{part.name}</div>
                        {part.backsplashLength > 0 && (
                          <div className="text-[9px] text-neutral-400 font-mono mt-0.5">
                            INC. BACKSPLASH: {part.backsplashLength}" x {part.backsplashHeight}"
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-3 font-mono text-center text-neutral-600">
                      {part.length}" x {part.width}"
                      <span className="block text-[9px] text-neutral-400">
                        (~{part.totalSqFt ? part.totalSqFt.toFixed(1) : ((part.length * part.width) / 144).toFixed(1)} sq ft)
                      </span>
                    </td>
                    <td className="py-4 px-3 text-center text-neutral-600 font-mono font-medium">
                      {part.thickness}
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-100 text-[#1A1A1A] font-bold text-[9px] uppercase font-mono">
                        {part.material?.name || "Premium Stone"}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-neutral-600">
                      <div>
                        <div className="font-medium text-xs">{part.edgeProfile}</div>
                        {part.edgeLength > 0 && (
                          <div className="text-[9px] text-neutral-400 font-mono">
                            SPAN: {part.edgeLength} LF
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center font-mono">
                      {part.sinkCutouts + part.cooktopCutouts + part.faucetHoles > 0 ? (
                        <div className="space-y-0.5 text-[10px]">
                          {part.sinkCutouts > 0 && <span className="block">Sink x{part.sinkCutouts}</span>}
                          {part.cooktopCutouts > 0 && <span className="block">Hob x{part.cooktopCutouts}</span>}
                          {part.faucetHoles > 0 && <span className="block">Tap x{part.faucetHoles}</span>}
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-right text-neutral-900">
                      {formatCurrency(part.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary cost tally block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-8 border-t border-neutral-150">
          
          {/* Notes column */}
          <div className="lg:col-span-7 space-y-3 font-sans">
            <span className="text-[9px] font-mono text-neutral-400 font-bold tracking-widest uppercase block">FABRICATION & ENGINEERING ADVISORY</span>
            <div className="p-5 bg-[#FBFBFA] border border-neutral-150 rounded-2xl space-y-2.5">
              <div className="flex items-start gap-2 text-gold">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="text-xs font-bold uppercase tracking-wider">Vein Alignment & Material Guard</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {quoteNotes}
              </p>
              <div className="pt-2 text-[10px] text-neutral-400 font-mono leading-relaxed space-y-1">
                <p>• Slabs reserved matching sequence codes: B8492-V2-A / B8492-V2-B for ultimate bookmatch alignment.</p>
                <p>• Recommended cutting path: dual-phase diamond circular blade with water pressure &gt;250 bar.</p>
              </div>
            </div>
          </div>

          {/* Pricing breakdown column */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[9px] font-mono text-neutral-400 font-bold tracking-widest uppercase block text-right print:text-right">VALUATION RECONCILIATION</span>
            
            <div className="bg-[#FBFBFA] border border-neutral-150 rounded-2xl p-5 space-y-3 font-sans">
              <div className="flex justify-between text-xs font-medium text-neutral-500">
                <span>Material Sheet Costs:</span>
                <span className="font-mono text-neutral-800 font-semibold">
                  {formatCurrency(calculatedEstimatePartsSummary.reduce((acc, p) => acc + (p.baseCost || 0), 0))}
                </span>
              </div>
              <div className="flex justify-between text-xs font-medium text-neutral-500">
                <span>Mitered & Finished Edges:</span>
                <span className="font-mono text-neutral-800 font-semibold">
                  {formatCurrency(calculatedEstimatePartsSummary.reduce((acc, p) => acc + (p.totalEdgeCost || 0), 0))}
                </span>
              </div>
              <div className="flex justify-between text-xs font-medium text-neutral-500">
                <span>CNC Precision Cutouts:</span>
                <span className="font-mono text-neutral-800 font-semibold">
                  {formatCurrency(calculatedEstimatePartsSummary.reduce((acc, p) => acc + (p.totalCutoutsCost || 0), 0))}
                </span>
              </div>
              <div className="flex justify-between text-xs font-medium text-neutral-500">
                <span>Fabrication Tension Surcharge:</span>
                <span className="font-mono text-neutral-800 font-semibold">
                  {formatCurrency(calculatedEstimatePartsSummary.reduce((acc, p) => acc + (p.surchargeCost || 0), 0))}
                </span>
              </div>

              <div className="h-px bg-neutral-200 my-2"></div>

              <div className="flex justify-between items-baseline text-neutral-900">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Net Valuation:</span>
                <span className="font-serif text-2xl font-bold text-[#1A1A1A]">
                  {formatCurrency(activeEstimateGrandTotal)}
                </span>
              </div>
              <div className="flex justify-between items-baseline text-neutral-500 text-[10px] font-mono">
                <span>Estimated VAT (20.00%):</span>
                <span>{formatCurrency(activeEstimateGrandTotal * 0.20)}</span>
              </div>
              <div className="flex justify-between items-baseline text-neutral-900 font-bold border-t border-neutral-150 pt-2.5">
                <span className="text-xs font-mono">TOTAL PAYABLE (INC. VAT):</span>
                <span className="text-base font-serif font-bold text-gold">
                  {formatCurrency(activeEstimateGrandTotal * 1.20)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Footer Info */}
        <div className="pt-8 border-t border-neutral-150 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[10px] font-mono text-neutral-400">
          <div>
            <p>SMC PRO ADVANCED DIGITAL BLUEPRINT ESTIMATION LEDGER</p>
            <p className="mt-0.5">TERMS: 50% DEPOSIT PRIOR TO MATERIAL HARVEST, BALANCE UPON SITE SIGN-OFF.</p>
          </div>
          <div className="text-right">
            <p>APPROVED BY: SMC ALGORITHM CORE</p>
            <p className="mt-0.5 text-gold font-bold">DIGITALLY SECURED WORKSPACE</p>
          </div>
        </div>

      </div>

    </div>
  );
}
