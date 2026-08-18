import React, { useState } from "react";
import { X, FileDown, Printer, Copy, Check, Sparkles, Building, MapPin, Calendar, FileText, ShieldCheck } from "lucide-react";
import { jsPDF } from "jspdf";

export interface EstimatePart {
  id?: string;
  name: string;
  length: number; // inches
  width: number; // inches
  materialId: string;
  thickness: string;
  edgeProfile: string;
  edgeLength: number; // linear feet
  sinkCutouts: number;
  cooktopCutouts: number;
  faucetHoles: number;
  backsplashLength: number; // inches
  backsplashHeight: number; // inches
}

export interface EdgeFinishingLog {
  id: string;
  timestamp: string;
  technician: string;
  step: string;
  profile: string;
  gritSequence: string;
  status: "Approved" | "In Progress" | "Pending Inspection";
}

export interface FabricationDetails {
  materialYieldPct: number;
  bsStandardCode: string;
  cuttingOrientation: string;
  grainContinuityVerified: boolean;
  subframeToleranceMm: number;
  wetCncMachineId: string;
  cuttingSequenceNotes: string;
  edgeFinishingLogs: EdgeFinishingLog[];
}

export interface Project {
  id: string;
  name: string;
  address: string;
  status: "Proposal" | "Slab Selected" | "Fabrication" | "Ready for Install" | "Completed";
  notes: string;
  estimates: EstimatePart[];
  createdAt: string;
  fabricationDetails?: FabricationDetails;
}

export interface Material {
  id: string;
  name: string;
  class: string;
  mohs: number;
  waterAbsorption: string;
  thicknesses: string[];
  finishes: string[];
  application: string[];
  price: number;
  technicalDetails: string;
  fabricationNotes: string;
  hasSpecialImage?: boolean;
  bgStyle?: string;
}

interface ProjectPdfModalProps {
  project: Project | null;
  onClose: () => void;
  getMaterialById: (id: string) => Material;
  formatCurrency: (val: number) => string;
}

export const ProjectPdfModal: React.FC<ProjectPdfModalProps> = ({
  project,
  onClose,
  getMaterialById,
  formatCurrency
}) => {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!project) return null;

  // Calculate detailed pricing elements
  const itemsBreakdown = project.estimates.map((part) => {
    const mat = getMaterialById(part.materialId);
    const mainAreaSqFt = (part.length * part.width) / 144;
    const bsAreaSqFt = (part.backsplashLength * part.backsplashHeight) / 144;
    const totalSqFt = mainAreaSqFt + bsAreaSqFt;

    let baseStoneCost = totalSqFt * mat.price;
    let thicknessMultiplier = 1.0;
    if (part.thickness === "12mm") thicknessMultiplier = 0.90;
    if (part.thickness === "30mm") thicknessMultiplier = 1.25;
    baseStoneCost = baseStoneCost * thicknessMultiplier;

    let edgeCostPerFoot = 0;
    switch (part.edgeProfile) {
      case "Mitered Apron (2 in)": edgeCostPerFoot = 25; break;
      case "Mitered Apron (3 in)": edgeCostPerFoot = 35; break;
      case "Demi-Bullnose": edgeCostPerFoot = 15; break;
      case "Ogee": edgeCostPerFoot = 20; break;
      default: edgeCostPerFoot = 0;
    }
    const edgeCost = part.edgeLength * edgeCostPerFoot;

    const cutoutsCost = (part.sinkCutouts * 250) + (part.cooktopCutouts * 200) + (part.faucetHoles * 40);

    let diffSurchargePct = 0;
    if (mat.class === "Porcelain") diffSurchargePct = 0.15;
    else if (mat.id === "taj-mahal") diffSurchargePct = 0.20;
    else if (mat.class === "Natural Stone" && mat.id === "bianco-carrara") diffSurchargePct = 0.10;

    const subtotalBeforeSurcharge = baseStoneCost + edgeCost + cutoutsCost;
    const surchargeAmount = subtotalBeforeSurcharge * diffSurchargePct;
    const partTotalCost = subtotalBeforeSurcharge + surchargeAmount;

    return {
      part,
      mat,
      totalSqFt,
      baseStoneCost,
      edgeCost,
      cutoutsCost,
      surchargeAmount,
      partTotalCost
    };
  });

  const totalProjectValue = itemsBreakdown.reduce((acc, item) => acc + item.partTotalCost, 0);

  // Generate jsPDF File
  const handleDownloadPDF = () => {
    try {
      setIsGenerating(true);
      const JsPDFClass = typeof jsPDF === "function" ? jsPDF : (jsPDF as any)?.jsPDF || (jsPDF as any)?.default;
      if (!JsPDFClass) {
        throw new Error("PDF generator unavailable.");
      }
      const doc = new JsPDFClass({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      let y = 45;

      // Header Banner / Logo
      doc.setFillColor(26, 26, 26); // Dark Charcoal
      doc.rect(0, 0, pageWidth, 80, "F");

      doc.setTextColor(212, 175, 55); // Gold Accent
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("STONE & MARBLE ATELIER", margin, 38);

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Bespoke Natural Stone & Slab Fabrication", margin, 52);
      doc.text("London Atelier & CNC Fabrication Works | Confidential Quote Proposal", margin, 64);

      y = 110;

      // Project Title & Status Box
      doc.setTextColor(26, 26, 26);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(project.name, margin, y);

      y += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Site Address: ${project.address}`, margin, y);
      
      y += 14;
      doc.text(`Project Status: ${project.status}  |  Created Date: ${project.createdAt}`, margin, y);

      y += 25;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);

      y += 20;

      // Table Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(26, 26, 26);
      doc.text("FABRICATION & MATERIAL SPECIFICATIONS", margin, y);

      y += 15;

      // Table Header Row
      doc.setFillColor(245, 245, 243);
      doc.rect(margin, y, pageWidth - (margin * 2), 22, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text("ITEM / PART NAME", margin + 8, y + 14);
      doc.text("MATERIAL & THICKNESS", margin + 140, y + 14);
      doc.text("DIMENSIONS & EDGE", margin + 280, y + 14);
      doc.text("APERTURES", margin + 400, y + 14);
      doc.text("EST. VALUE", pageWidth - margin - 60, y + 14);

      y += 22;

      // Table Content Rows
      itemsBreakdown.forEach((item, index) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        const isEven = index % 2 === 0;
        if (isEven) {
          doc.setFillColor(252, 252, 252);
          doc.rect(margin, y, pageWidth - (margin * 2), 36, "F");
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(26, 26, 26);
        doc.text(item.part.name, margin + 8, y + 14);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`${item.part.length}" x ${item.part.width}" (${item.totalSqFt.toFixed(1)} sq ft)`, margin + 8, y + 26);

        // Material
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50, 50, 50);
        doc.text(item.mat.name, margin + 140, y + 14);
        doc.setFont("helvetica", "normal");
        doc.text(`${item.mat.class} | ${item.part.thickness}`, margin + 140, y + 26);

        // Edge & Backsplash
        doc.text(item.part.edgeProfile, margin + 280, y + 14);
        doc.text(`Edge: ${item.part.edgeLength} ft | BS: ${item.part.backsplashLength}"`, margin + 280, y + 26);

        // Cutouts
        const cutoutsText = `${item.part.sinkCutouts} Sink / ${item.part.cooktopCutouts} Cooktop`;
        doc.text(cutoutsText, margin + 400, y + 14);

        // Price
        doc.setFont("helvetica", "bold");
        doc.setTextColor(26, 26, 26);
        doc.text(formatCurrency(item.partTotalCost), pageWidth - margin - 60, y + 20);

        doc.setDrawColor(240, 240, 240);
        doc.line(margin, y + 36, pageWidth - margin, y + 36);

        y += 36;
      });

      y += 20;

      // Notes Section if any
      if (project.notes) {
        if (y > 680) {
          doc.addPage();
          y = 50;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(26, 26, 26);
        doc.text("SLAB INSPECTION & SHOP NOTES:", margin, y);

        y += 12;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(80, 80, 80);

        const splitNotes = doc.splitTextToSize(project.notes, pageWidth - (margin * 2));
        doc.text(splitNotes, margin, y);
        y += splitNotes.length * 11 + 15;
      }

      // Financial Total Box
      if (y > 680) {
        doc.addPage();
        y = 50;
      }

      const totalBoxWidth = 240;
      const totalBoxX = pageWidth - margin - totalBoxWidth;

      doc.setFillColor(250, 250, 248);
      doc.setDrawColor(220, 220, 215);
      doc.roundedRect(totalBoxX, y, totalBoxWidth, 70, 4, 4, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("GRAND TOTAL VALUATION", totalBoxX + 15, y + 22);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(26, 26, 26);
      doc.text(formatCurrency(totalProjectValue), totalBoxX + 15, y + 46);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("Includes CNC fabrication, edge profiles & fitting", totalBoxX + 15, y + 58);

      y += 90;

      // Guarantee & Signature Footer
      if (y > 720) {
        doc.addPage();
        y = 50;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(212, 175, 55);
      doc.text("ATELIER QUALITY ASSURANCE & WARRANTY", margin, y);

      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("1. All natural stone slabs inspected with 3D digital laser scanner for vein continuity.", margin, y);
      y += 10;
      doc.text("2. 10-Year Stain & Structural Integrity Warranty provided upon installation completion.", margin, y);
      y += 10;
      doc.text("3. High-precision waterjet aperture cutouts with reinforced fiber rod under-supports.", margin, y);

      y += 35;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, margin + 180, y);
      doc.line(pageWidth - margin - 180, y, pageWidth - margin, y);

      y += 12;
      doc.text("Authorized Fabrication Manager", margin, y);
      doc.text("Client Acceptance Signature", pageWidth - margin - 180, y);

      // Save PDF
      const safeFilename = project.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      doc.save(`Stone_Atelier_${safeFilename}_Proposal.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Browser Print trigger
  const handlePrint = () => {
    window.print();
  };

  // Copy textual summary
  const handleCopySummary = () => {
    const text = `MARBLE & STONE ATELIER - CLIENT PROPOSAL
Project: ${project.name}
Site Address: ${project.address}
Status: ${project.status}
Created Date: ${project.createdAt}

ESTIMATE PARTS BREAKDOWN:
${itemsBreakdown.map((i, idx) => `${idx + 1}. ${i.part.name}
   Material: ${i.mat.name} (${i.mat.class} ${i.part.thickness})
   Dimensions: ${i.part.length}" x ${i.part.width}" (${i.totalSqFt.toFixed(1)} sq ft)
   Edge: ${i.part.edgeProfile} (${i.part.edgeLength} linear ft)
   Value: ${formatCurrency(i.partTotalCost)}`).join("\n\n")}

TOTAL PORTFOLIO INVESTMENT: ${formatCurrency(totalProjectValue)}
Notes: ${project.notes || "N/A"}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Top Control Header */}
        <div className="bg-neutral-900 text-white p-4 sm:p-5 flex justify-between items-center border-b border-neutral-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gold/20 text-gold flex items-center justify-center font-serif font-bold text-lg">
              S
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-white leading-tight">Client Presentation & PDF Proposal</h3>
              <p className="text-[11px] text-neutral-400 font-mono">STONE & MARBLE ATELIER LONDON • OFFICIAL QUOTE</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Summary"}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
              title="Print view"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gold hover:bg-amber-500 text-neutral-950 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span>{isGenerating ? "Building PDF..." : "Export PDF"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable & Document Preview Canvas Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 bg-[#FAFAFA] flex-1 print:p-0 print:bg-white">
          
          {/* Header Brand Bar */}
          <div className="bg-neutral-900 text-white rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm border border-neutral-800">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-gold font-bold tracking-widest uppercase">OFFICIAL FABRICATION PROPOSAL</span>
              <h2 className="font-serif text-2xl font-bold tracking-wide text-white">STONE & MARBLE ATELIER</h2>
              <p className="text-xs text-neutral-400">Precision Waterjet & CNC Slab Fabrication • London, UK</p>
            </div>
            <div className="text-left sm:text-right space-y-1 font-mono text-xs border-t sm:border-t-0 border-neutral-800 pt-3 sm:pt-0 w-full sm:w-auto">
              <div className="text-gold font-bold">{formatCurrency(totalProjectValue)}</div>
              <div className="text-neutral-400 text-[11px]">{project.estimates.length} Slab Part(s) Included</div>
              <div className="text-neutral-500 text-[10px]">Date: {project.createdAt}</div>
            </div>
          </div>

          {/* Client & Project Details Card */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-neutral-100">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">Project Title</span>
                <h3 className="font-serif text-xl font-bold text-neutral-900">{project.name}</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
                <span className="w-2 h-2 rounded-full bg-gold"></span>
                Status: {project.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-600 font-sans pt-1">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-neutral-800 block text-[11px] font-bold uppercase tracking-wider">Site Address</strong>
                  <span>{project.address}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-neutral-800 block text-[11px] font-bold uppercase tracking-wider">Proposal Reference</strong>
                  <span className="font-mono">REF-{project.id.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Specification Table */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-neutral-100/70 px-5 py-3 border-b border-neutral-200 flex justify-between items-center">
              <h4 className="font-serif text-sm font-bold text-neutral-800 tracking-wide uppercase">Fabrication & Material Breakdown</h4>
              <span className="text-[11px] font-mono text-neutral-500 font-medium">{project.estimates.length} Item(s)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-700">
                <thead className="bg-neutral-50 font-mono text-[10px] uppercase text-neutral-500 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 font-bold">Item Name</th>
                    <th className="px-4 py-3 font-bold">Material & Specs</th>
                    <th className="px-4 py-3 font-bold">Dimensions & Area</th>
                    <th className="px-4 py-3 font-bold">Edge Profile</th>
                    <th className="px-4 py-3 font-bold">Apertures</th>
                    <th className="px-4 py-3 font-bold text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-sans">
                  {itemsBreakdown.map((item, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-neutral-900">
                        {item.part.name}
                        {item.part.backsplashHeight > 0 && (
                          <span className="block text-[10px] text-neutral-400 font-normal mt-0.5">
                            Incl. {item.part.backsplashHeight}" Backsplash
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <strong className="text-neutral-800 font-medium block">{item.mat.name}</strong>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {item.mat.class} • {item.part.thickness}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px]">
                        <div>{item.part.length}" × {item.part.width}"</div>
                        <span className="text-[10px] text-neutral-400">({item.totalSqFt.toFixed(1)} sq ft)</span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-800 block">{item.part.edgeProfile}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">{item.part.edgeLength} linear ft</span>
                      </td>

                      <td className="px-4 py-3 text-[11px]">
                        {item.part.sinkCutouts > 0 && <div className="text-neutral-700">• {item.part.sinkCutouts} Sink Cutout</div>}
                        {item.part.cooktopCutouts > 0 && <div className="text-neutral-700">• {item.part.cooktopCutouts} Cooktop Cutout</div>}
                        {item.part.faucetHoles > 0 && <div className="text-neutral-500 text-[10px]">• {item.part.faucetHoles} Faucet Hole(s)</div>}
                        {item.part.sinkCutouts === 0 && item.part.cooktopCutouts === 0 && item.part.faucetHoles === 0 && (
                          <span className="text-neutral-400 italic">None</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 text-sm">
                        {formatCurrency(item.partTotalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes & Quality Guarantee Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Shop Notes */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-2 shadow-2xs">
              <h5 className="font-serif text-sm font-bold text-neutral-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-gold" />
                Slab Inspection & Shop Notes
              </h5>
              <p className="text-xs text-neutral-600 leading-relaxed font-sans bg-neutral-50 p-3 rounded-lg border border-neutral-100 min-h-[70px]">
                {project.notes || "No additional shop notes provided for this project."}
              </p>
            </div>

            {/* Quality Assurance Terms */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-2.5 shadow-2xs">
              <h5 className="font-serif text-sm font-bold text-neutral-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-gold" />
                Atelier Guarantee & Craft Standards
              </h5>
              <ul className="text-[11px] text-neutral-600 space-y-1.5 font-sans">
                <li className="flex items-start gap-1.5">
                  <span className="text-gold font-bold">•</span>
                  <span><strong>10-Year Stain & Seal Warranty</strong> applied to all porous natural stone surfaces.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-gold font-bold">•</span>
                  <span><strong>Precision 3D Laser Templating</strong> on site ensures seamless wall scribing (&lt;1mm tolerance).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-gold font-bold">•</span>
                  <span><strong>Under-support Rodding</strong> on sink and cooktop aperture bridge spans.</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom Total Valuation Box */}
          <div className="bg-neutral-900 text-white rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md border border-neutral-800">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-gold font-bold uppercase tracking-wider">TOTAL CLIENT INVESTMENT</span>
              <h3 className="font-serif text-3xl font-bold text-white">{formatCurrency(totalProjectValue)}</h3>
              <p className="text-xs text-neutral-400">All prices include material supply, CNC fabrication, edge polish, and delivery.</p>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="w-full sm:w-auto bg-gold hover:bg-amber-500 text-neutral-950 font-semibold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                {isGenerating ? "Building PDF..." : "Download PDF Proposal"}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ProjectPdfModal;
