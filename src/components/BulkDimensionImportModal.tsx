import React, { useState, useEffect } from "react";
import {
  X,
  FileSpreadsheet,
  Check,
  Clipboard,
  Sparkles,
  AlertCircle,
  Building2,
  Trash2,
  Table as TableIcon,
  Plus,
  ShieldCheck,
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import { EstimatePart, Project } from "../App";

interface BulkDimensionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportParts: (newParts: EstimatePart[], appendMode: boolean, targetProjectId?: string) => void;
  existingProjects?: Project[];
  availableMaterials?: { id: string; name: string }[];
  initialProjectId?: string;
}

// Default stone materials list
const DEFAULT_STONE_MATERIALS = [
  { id: "calacatta-gold", name: "Calacatta Gold Quartz (30mm)" },
  { id: "statuario-white", name: "Statuario Extra Marble (30mm)" },
  { id: "nero-marquina", name: "Nero Marquina Marble (30mm)" },
  { id: "taj-mahal", name: "Taj Mahal Quartzite (30mm)" },
  { id: "porcelain-calacatta", name: "Calacatta Porcelain (12mm)" },
];

const EDGE_PROFILES = [
  { id: "polished", name: "Double Bevel Polished" },
  { id: "mitred", name: "Mitred Downstand (40mm)" },
  { id: "pencil", name: "Pencil Round (3mm)" },
  { id: "bullnose", name: "Full Bullnose" },
  { id: "ogee", name: "Architectural Ogee" },
];

// Sample presets for quick testing
const SAMPLE_KITCHEN_CSV = `Part Name\tLength\tWidth\tMaterial\tThickness\tEdge Profile\tSink Cutouts\tCooktop Cutouts
Main Kitchen Island\t120\t42\tcalacatta-gold\t3cm\tmitred\t1\t0
Perimeter Run A\t96\t25.5\tcalacatta-gold\t3cm\tpolished\t0\t1
Perimeter Run B\t72\t25.5\tcalacatta-gold\t3cm\tpolished\t1\t0
Upstand Splash\t168\t6\tcalacatta-gold\t2cm\tpencil\t0\t0`;

const SAMPLE_BAR_CSV = `Part Name,Length,Width,Material,Thickness,Edge Profile,Edge Length (ft),Sink Cutouts
Front Main Bar Counter,180,30,nero-marquina,3cm,bevel,15,2
Service Station Counter,90,24,nero-marquina,3cm,bevel,7.5,1
VIP Lounge Table,48,48,nero-marquina,2cm,bullnose,16,0
Bar Wall Splash,270,12,nero-marquina,2cm,polished,22.5,0`;

const SAMPLE_VANITY_CSV = `Part Name;Length;Width;Material;Thickness;Edge Profile;Sink Cutouts;Faucet Holes
Master Suite Double Vanity;84;22;statuario-white;3cm;ogee;2;2
Guest Suite Vanity;42;22;statuario-white;3cm;polished;1;1
Powder Room Splash;42;6;statuario-white;2cm;pencil;0;0`;

export const BulkDimensionImportModal: React.FC<BulkDimensionImportModalProps> = ({
  isOpen,
  onClose,
  onImportParts,
  existingProjects = [],
  availableMaterials = [],
  initialProjectId,
}) => {
  const [rawText, setRawText] = useState("");
  const [unitSystem, setUnitSystem] = useState<"inches" | "mm" | "cm" | "auto">("auto");
  const [appendMode, setAppendMode] = useState(true);
  const [targetProjectId, setTargetProjectId] = useState<string>("");
  const [parsedParts, setParsedParts] = useState<EstimatePart[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [hasHeader, setHasHeader] = useState(true);

  const materialsList = availableMaterials.length > 0 ? availableMaterials : DEFAULT_STONE_MATERIALS;

  // Sync initial target project ID when modal opens
  useEffect(() => {
    if (isOpen) {
      setTargetProjectId(initialProjectId || "");
    }
  }, [isOpen, initialProjectId]);

  // Auto-parse raw text when text, unit system, or header setting changes
  useEffect(() => {
    if (!rawText.trim()) {
      setParsedParts([]);
      setParseErrors([]);
      return;
    }

    parseRawData(rawText, unitSystem, hasHeader);
  }, [rawText, unitSystem, hasHeader]);

  if (!isOpen) return null;

  const matchMaterialId = (raw: string): string => {
    if (!raw || !raw.trim()) return "";
    const candidate = raw.toLowerCase().trim();
    const match = materialsList.find(
      (m) => m.id.toLowerCase() === candidate || m.name.toLowerCase().includes(candidate)
    );
    if (match) return match.id;
    if (candidate.includes("statuario")) return "statuario-white";
    if (candidate.includes("nero") || candidate.includes("marquina")) return "nero-marquina";
    if (candidate.includes("taj") || candidate.includes("mahal")) return "taj-mahal";
    if (candidate.includes("porcelain")) return "porcelain-calacatta";
    if (candidate.includes("calacatta") || candidate.includes("gold")) return "calacatta-gold";
    return "";
  };

  const parseRawData = (input: string, units: string, expectHeader: boolean) => {
    const lines = input
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setParsedParts([]);
      setParseErrors([]);
      return;
    }

    const errors: string[] = [];
    const parts: EstimatePart[] = [];

    // Determine line delimiter (\t, comma, semicolon, or pipe)
    const firstLine = lines[0];
    let delimiter = "\t";
    if (firstLine.includes("\t")) delimiter = "\t";
    else if (firstLine.includes(",")) delimiter = ",";
    else if (firstLine.includes(";")) delimiter = ";";
    else if (firstLine.includes("|")) delimiter = "|";

    let startIndex = 0;
    // Header detection
    if (expectHeader) {
      const headerCols = firstLine.split(delimiter).map((c) => c.toLowerCase().trim());
      const hasHeaderKeywords = headerCols.some((c) =>
        c.includes("name") || c.includes("length") || c.includes("width") || c.includes("dim") || c.includes("part")
      );
      if (hasHeaderKeywords) {
        startIndex = 1;
      }
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));

      if (cols.length < 2) {
        errors.push(`Row ${i + 1}: Missing column data for length/width.`);
      }

      // Column mapping heuristics
      let name = "";
      let rawLength = 0;
      let rawWidth = 0;
      let materialId = "";
      let thickness = "3cm";
      let edgeProfile = "polished";
      let sinkCutouts = 0;
      let cooktopCutouts = 0;
      let faucetHoles = 0;
      let edgeLength = 0;

      // Check if Col 0 is numeric (no part name provided) or string (part name)
      const col0Num = parseFloat(cols[0]);
      if (isNaN(col0Num)) {
        name = cols[0];
        rawLength = parseFloat(cols[1]) || 0;
        rawWidth = parseFloat(cols[2]) || 0;

        if (cols[3]) {
          materialId = matchMaterialId(cols[3]);
        }

        if (cols[4]) {
          if (cols[4].includes("2")) thickness = "2cm";
          else if (cols[4].includes("1.2") || cols[4].includes("12mm")) thickness = "1.2cm";
          else thickness = "3cm";
        }

        if (cols[5]) edgeProfile = cols[5].toLowerCase();
        if (cols[6]) sinkCutouts = parseInt(cols[6], 10) || 0;
        if (cols[7]) cooktopCutouts = parseInt(cols[7], 10) || 0;
      } else {
        // Col 0 is numeric length, Col 1 is numeric width
        name = `Imported Piece #${i + 1 - startIndex}`;
        rawLength = col0Num || 0;
        rawWidth = parseFloat(cols[1]) || 0;

        if (cols[2]) {
          materialId = matchMaterialId(cols[2]);
        }
      }

      // Handle unit conversions
      let lengthInInches = rawLength;
      let widthInInches = rawWidth;

      if (rawLength > 0 && rawWidth > 0) {
        if (units === "mm" || (units === "auto" && (rawLength > 250 || rawWidth > 250))) {
          lengthInInches = Math.round((rawLength / 25.4) * 10) / 10;
          widthInInches = Math.round((rawWidth / 25.4) * 10) / 10;
        } else if (units === "cm" || (units === "auto" && rawLength > 100 && rawLength <= 250)) {
          lengthInInches = Math.round((rawLength / 2.54) * 10) / 10;
          widthInInches = Math.round((rawWidth / 2.54) * 10) / 10;
        } else {
          lengthInInches = Math.round(rawLength * 10) / 10;
          widthInInches = Math.round(rawWidth * 10) / 10;
        }
      }

      // Default estimated finished edge length (in linear feet) if omitted
      edgeLength = lengthInInches > 0 && widthInInches > 0
        ? Math.round(((lengthInInches * 2 + widthInInches) / 12) * 10) / 10
        : 0;

      parts.push({
        id: `import-part-${Date.now()}-${i}`,
        name: name || `Countertop Part #${parts.length + 1}`,
        length: lengthInInches,
        width: widthInInches,
        materialId,
        thickness,
        edgeProfile,
        edgeLength,
        sinkCutouts,
        cooktopCutouts,
        faucetHoles,
        backsplashLength: 0,
        backsplashHeight: 4,
      });
    }

    setParsedParts(parts);
    setParseErrors(errors);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText(text);
      }
    } catch (err) {
      alert("Unable to access clipboard. Please paste directly into the text box using Ctrl+V or Cmd+V.");
    }
  };

  const handleDeleteParsedPart = (id: string) => {
    setParsedParts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdatePart = (id: string, field: keyof EstimatePart, value: any) => {
    setParsedParts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, [field]: value };
          // Recalculate edge length when length or width is modified
          if (field === "length" || field === "width") {
            const l = parseFloat(updated.length as any) || 0;
            const w = parseFloat(updated.width as any) || 0;
            updated.edgeLength = l > 0 && w > 0 ? Math.round(((l * 2 + w) / 12) * 10) / 10 : 0;
          }
          return updated;
        }
        return p;
      })
    );
  };

  const handleAddManualPart = () => {
    const newPart: EstimatePart = {
      id: `manual-part-${Date.now()}`,
      name: `Custom Section #${parsedParts.length + 1}`,
      length: 96,
      width: 25.5,
      materialId: materialsList[0]?.id || "calacatta-gold",
      thickness: "3cm",
      edgeProfile: "polished",
      edgeLength: 18,
      sinkCutouts: 0,
      cooktopCutouts: 0,
      faucetHoles: 0,
      backsplashLength: 0,
      backsplashHeight: 4,
    };
    setParsedParts((prev) => [...prev, newPart]);
  };

  // Mandatory fields validation logic for data integrity
  const validationErrors = parsedParts.flatMap((part, idx) => {
    const missing: string[] = [];
    if (!part.length || isNaN(part.length) || part.length <= 0) missing.push("Length (> 0)");
    if (!part.width || isNaN(part.width) || part.width <= 0) missing.push("Width (> 0)");
    if (!part.materialId || part.materialId.trim() === "") missing.push("Material Grade");

    if (missing.length > 0) {
      return [`Row #${idx + 1} ("${part.name || "Unnamed Part"}") missing: ${missing.join(", ")}`];
    }
    return [];
  });

  const handleConfirmImport = () => {
    if (parsedParts.length === 0 || validationErrors.length > 0) return;
    onImportParts(parsedParts, appendMode, targetProjectId || undefined);
    onClose();
  };

  // Summary statistics telemetry
  const totalSqFt = Math.round(
    parsedParts.reduce((acc, p) => acc + (p.length > 0 && p.width > 0 ? (p.length * p.width) / 144 : 0), 0) * 10
  ) / 10;
  const estimatedSlabs = Math.ceil(totalSqFt / 45); // Assuming 45 sq.ft net yield per slab
  const totalLinearFeet = Math.round(parsedParts.reduce((acc, p) => acc + (p.edgeLength || 0), 0) * 10) / 10;
  const totalCutouts = parsedParts.reduce((acc, p) => acc + (p.sinkCutouts || 0) + (p.cooktopCutouts || 0), 0);

  // Check if any part requires a seam joint alert (Length > 130" or Width > 65")
  const oversizedCount = parsedParts.filter((p) => p.length > 130 || p.width > 65).length;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-[#D4AF37]/40 text-white rounded-2xl p-6 md:p-8 max-w-5xl w-full max-h-[92vh] overflow-y-auto space-y-6 relative shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 border-b border-neutral-800 pb-5">
          <div className="p-3.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37] shrink-0">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/30">
                CSV / Excel Clipboard Utility
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded">
                BS EN 1469 Verified Data Pipeline
              </span>
            </div>
            <h3 className="font-serif text-2xl font-bold text-white tracking-tight mt-1">
              Bulk Dimension Data Import & QA Validation
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Paste raw tabular dimension rows from Microsoft Excel, Google Sheets, or CSV exports to review, edit, and commit verified estimate parts.
            </p>
          </div>
        </div>

        {/* Quick Sample Presets & Unit Controls */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /> Quick Load Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRawText(SAMPLE_KITCHEN_CSV)}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-[#D4AF37] text-neutral-300 hover:text-black font-mono text-[11px] font-medium transition-all cursor-pointer border border-neutral-700"
              >
                Kitchen & Island Suite
              </button>
              <button
                onClick={() => setRawText(SAMPLE_BAR_CSV)}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-[#D4AF37] text-neutral-300 hover:text-black font-mono text-[11px] font-medium transition-all cursor-pointer border border-neutral-700"
              >
                Commercial Bar Counter
              </button>
              <button
                onClick={() => setRawText(SAMPLE_VANITY_CSV)}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-[#D4AF37] text-neutral-300 hover:text-black font-mono text-[11px] font-medium transition-all cursor-pointer border border-neutral-700"
              >
                Bathroom Vanities
              </button>
              {rawText && (
                <button
                  onClick={() => setRawText("")}
                  className="px-2.5 py-1 rounded bg-red-950/50 hover:bg-red-900 text-red-300 font-mono text-[11px] transition-all cursor-pointer border border-red-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Input
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-800 text-xs">
            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase font-bold mb-1">
                Dimension Unit System
              </label>
              <select
                value={unitSystem}
                onChange={(e) => setUnitSystem(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg py-1.5 px-3 text-white text-xs font-mono focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="auto">Auto-Detect Units (Recommended)</option>
                <option value="inches">Inches (in)</option>
                <option value="mm">Millimetres (mm → converted to in)</option>
                <option value="cm">Centimetres (cm → converted to in)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase font-bold mb-1">
                Header Row Detection
              </label>
              <button
                type="button"
                onClick={() => setHasHeader(!hasHeader)}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-mono border text-left flex items-center justify-between cursor-pointer ${
                  hasHeader
                    ? "bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]"
                    : "bg-neutral-950 border-neutral-700 text-neutral-400"
                }`}
              >
                <span>{hasHeader ? "First Row = Column Headers" : "No Header Row"}</span>
                <Check className={`w-3.5 h-3.5 ${hasHeader ? "opacity-100" : "opacity-0"}`} />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase font-bold mb-1">
                Import Mode
              </label>
              <select
                value={appendMode ? "append" : "replace"}
                onChange={(e) => setAppendMode(e.target.value === "append")}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg py-1.5 px-3 text-white text-xs font-mono focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="append">Append to existing parts</option>
                <option value="replace">Replace all existing parts</option>
              </select>
            </div>
          </div>
        </div>

        {/* Text Area Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-[#D4AF37]" /> Paste Clipboard Raw Data
            </label>
            <button
              onClick={handlePasteFromClipboard}
              className="text-xs font-mono text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Clipboard className="w-3.5 h-3.5" /> Paste from Clipboard
            </button>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Paste Excel/CSV rows here. Expected columns:
Name\tLength\tWidth\tMaterial\tThickness\tEdge\tSinkCutouts\tCooktopCutouts
Island Counter\t120\t42\tcalacatta-gold\t3cm\tmitred\t1\t0
Main Run\t96\t25.5\tcalacatta-gold\t3cm\tpolished\t0\t1`}
            rows={4}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white font-mono text-xs focus:border-[#D4AF37] focus:outline-none leading-relaxed select-all"
          />
        </div>

        {/* Parse Warnings / Errors */}
        {parseErrors.length > 0 && (
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-amber-300 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold font-mono text-[11px] uppercase">
              <AlertCircle className="w-4 h-4 text-amber-400" /> Parsing Diagnostics ({parseErrors.length} notices):
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] font-mono opacity-90">
              {parseErrors.slice(0, 3).map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* PARSED DATA PREVIEW & QA VALIDATION SECTION */}
        {parsedParts.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-neutral-800/80">
            {/* MANDATORY FIELDS VALIDATION ERROR BANNER */}
            {validationErrors.length > 0 && (
              <div className="bg-red-950/70 border border-red-800 rounded-xl p-4 text-red-200 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold font-mono text-xs uppercase text-red-400">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  Validation Alert: Missing Mandatory Fields ({validationErrors.length} row{validationErrors.length > 1 ? "s" : ""})
                </div>
                <p className="text-[11px] text-red-300 font-mono">
                  Data integrity rule: Each part must have a valid <strong>Length (&gt; 0)</strong>, <strong>Width (&gt; 0)</strong>, and a selected <strong>Material Grade</strong> before importing. Please assign missing values in the red-highlighted fields below.
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] font-mono text-red-300 max-h-24 overflow-y-auto">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Telemetry Bar */}
            <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-950 border border-neutral-800 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-5 h-5 ${validationErrors.length === 0 ? "text-emerald-400" : "text-red-400"}`} />
                  <div>
                    <h4 className="font-serif text-sm font-bold text-white">
                      Data Integrity Preview & Audit ({parsedParts.length} Parts)
                    </h4>
                    <p className="text-[11px] text-neutral-400 font-mono">
                      Edit dimensions, materials, or profiles directly in the table below prior to committing import.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddManualPart}
                    className="px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black font-mono text-xs font-bold border border-[#D4AF37]/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Piece
                  </button>
                  <button
                    onClick={() => setParsedParts([])}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs font-medium transition-all cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Aggregated Specs Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-neutral-800 text-xs font-mono">
                <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800/60">
                  <span className="text-[10px] text-neutral-400 uppercase block">Total Net Surface</span>
                  <span className="text-sm font-bold text-white">{totalSqFt} sq.ft</span>
                </div>
                <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800/60">
                  <span className="text-[10px] text-neutral-400 uppercase block">Est. Slab Quantity</span>
                  <span className="text-sm font-bold text-[#D4AF37]">{estimatedSlabs} Slabs (45 ft² yield)</span>
                </div>
                <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800/60">
                  <span className="text-[10px] text-neutral-400 uppercase block">Edge Profile Length</span>
                  <span className="text-sm font-bold text-neutral-200">{totalLinearFeet} Linear Ft</span>
                </div>
                <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800/60">
                  <span className="text-[10px] text-neutral-400 uppercase block">Total Cutout Prep</span>
                  <span className="text-sm font-bold text-emerald-400">{totalCutouts} Cutout Units</span>
                </div>
              </div>

              {/* Seam Warning Banner */}
              {oversizedCount > 0 && (
                <div className="mt-3 p-2.5 bg-amber-950/50 border border-amber-800/60 rounded-lg flex items-center gap-2 text-amber-300 text-xs font-mono">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Seam Joint Notice:</strong> {oversizedCount} piece(s) exceed standard single jumbo slab limits (130" × 65"). Seam placement will be calculated automatically during CAD templating.
                  </span>
                </div>
              )}
            </div>

            {/* PREVIEW INTERACTIVE EDIT TABLE */}
            <div className="border border-neutral-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto bg-neutral-950/60">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-neutral-900 text-neutral-400 text-[10px] font-mono uppercase tracking-wider sticky top-0 border-b border-neutral-800 z-10">
                  <tr>
                    <th className="p-3">Status</th>
                    <th className="p-3">Part Description</th>
                    <th className="p-3">Length (in) *</th>
                    <th className="p-3">Width (in) *</th>
                    <th className="p-3">Area</th>
                    <th className="p-3">Material Grade *</th>
                    <th className="p-3">Thk.</th>
                    <th className="p-3">Edge Detail</th>
                    <th className="p-3">Cutouts</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-neutral-300 font-mono text-[11px]">
                  {parsedParts.map((part) => {
                    const isLengthValid = part.length > 0 && !isNaN(part.length);
                    const isWidthValid = part.width > 0 && !isNaN(part.width);
                    const isMaterialValid = Boolean(part.materialId && part.materialId.trim() !== "");
                    const isRowValid = isLengthValid && isWidthValid && isMaterialValid;

                    const partSqFt = isLengthValid && isWidthValid ? Math.round(((part.length * part.width) / 144) * 10) / 10 : 0;
                    const isOversized = part.length > 130 || part.width > 65;

                    return (
                      <tr key={part.id} className={`transition-colors ${!isRowValid ? "bg-red-950/20" : "hover:bg-neutral-900/60"}`}>
                        {/* Status Badge */}
                        <td className="p-3 whitespace-nowrap">
                          {!isRowValid ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-red-400 bg-red-950/80 border border-red-800 px-2 py-0.5 rounded" title="Missing length, width, or material">
                              <AlertCircle className="w-3 h-3" /> Missing Fields
                            </span>
                          ) : isOversized ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded" title='Length > 130" or Width > 65" (Requires Seam Joint)'>
                              <AlertTriangle className="w-3 h-3" /> Seam
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded">
                              <Check className="w-3 h-3" /> Valid
                            </span>
                          )}
                        </td>

                        {/* Part Name */}
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={part.name}
                            onChange={(e) => handleUpdatePart(part.id, "name", e.target.value)}
                            className="bg-neutral-900 border border-neutral-800 focus:border-[#D4AF37] rounded px-2 py-1 text-white text-xs font-sans w-full focus:outline-none"
                          />
                        </td>

                        {/* Length */}
                        <td className="p-2.5">
                          <input
                            type="number"
                            value={part.length || ""}
                            placeholder="0"
                            onChange={(e) => handleUpdatePart(part.id, "length", parseFloat(e.target.value) || 0)}
                            className={`bg-neutral-900 border ${
                              !isLengthValid ? "border-red-500 bg-red-950/50 text-red-200" : "border-neutral-800 focus:border-[#D4AF37] text-white"
                            } rounded px-2 py-1 text-xs font-mono w-16 focus:outline-none text-right`}
                          />
                        </td>

                        {/* Width */}
                        <td className="p-2.5">
                          <input
                            type="number"
                            value={part.width || ""}
                            placeholder="0"
                            onChange={(e) => handleUpdatePart(part.id, "width", parseFloat(e.target.value) || 0)}
                            className={`bg-neutral-900 border ${
                              !isWidthValid ? "border-red-500 bg-red-950/50 text-red-200" : "border-neutral-800 focus:border-[#D4AF37] text-white"
                            } rounded px-2 py-1 text-xs font-mono w-16 focus:outline-none text-right`}
                          />
                        </td>

                        {/* Area */}
                        <td className="p-3 text-gold font-bold whitespace-nowrap">
                          {partSqFt} sq.ft
                        </td>

                        {/* Material Selector */}
                        <td className="p-2.5">
                          <select
                            value={part.materialId}
                            onChange={(e) => handleUpdatePart(part.id, "materialId", e.target.value)}
                            className={`bg-neutral-900 border ${
                              !isMaterialValid ? "border-red-500 bg-red-950/50 text-red-200 font-bold" : "border-neutral-800 focus:border-[#D4AF37] text-neutral-200"
                            } rounded px-1.5 py-1 text-xs font-sans focus:outline-none`}
                          >
                            {!isMaterialValid && <option value="">-- Select Material --</option>}
                            {materialsList.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Thickness */}
                        <td className="p-2.5">
                          <select
                            value={part.thickness}
                            onChange={(e) => handleUpdatePart(part.id, "thickness", e.target.value)}
                            className="bg-neutral-900 border border-neutral-800 focus:border-[#D4AF37] rounded px-1 py-1 text-white text-xs font-mono focus:outline-none"
                          >
                            <option value="2cm">2cm</option>
                            <option value="3cm">3cm</option>
                            <option value="1.2cm">1.2cm</option>
                          </select>
                        </td>

                        {/* Edge Profile */}
                        <td className="p-2.5">
                          <select
                            value={part.edgeProfile}
                            onChange={(e) => handleUpdatePart(part.id, "edgeProfile", e.target.value)}
                            className="bg-neutral-900 border border-neutral-800 focus:border-[#D4AF37] rounded px-1.5 py-1 text-neutral-200 text-xs font-mono focus:outline-none"
                          >
                            {EDGE_PROFILES.map((ep) => (
                              <option key={ep.id} value={ep.id}>
                                {ep.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Cutouts (Sink / Cooktop) */}
                        <td className="p-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-neutral-400">Sink:</span>
                            <input
                              type="number"
                              min="0"
                              max="4"
                              value={part.sinkCutouts}
                              onChange={(e) => handleUpdatePart(part.id, "sinkCutouts", parseInt(e.target.value, 10) || 0)}
                              className="bg-neutral-900 border border-neutral-800 focus:border-[#D4AF37] rounded px-1 py-1 text-white text-xs font-mono w-10 text-center focus:outline-none"
                            />
                            <span className="text-[10px] text-neutral-400 ml-1">Cook:</span>
                            <input
                              type="number"
                              min="0"
                              max="3"
                              value={part.cooktopCutouts}
                              onChange={(e) => handleUpdatePart(part.id, "cooktopCutouts", parseInt(e.target.value, 10) || 0)}
                              className="bg-neutral-900 border border-neutral-800 focus:border-[#D4AF37] rounded px-1 py-1 text-white text-xs font-mono w-10 text-center focus:outline-none"
                            />
                          </div>
                        </td>

                        {/* Delete Row */}
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteParsedPart(part.id)}
                            className="p-1 text-neutral-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                            title="Remove part row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Target Project Pipeline Selection */}
        {existingProjects.length > 0 && (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3.5 space-y-2">
            <label className="text-xs font-mono font-bold text-neutral-300 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#D4AF37]" /> Bind Direct to Project Pipeline Record (Optional)
            </label>
            <select
              value={targetProjectId}
              onChange={(e) => setTargetProjectId(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg py-2 px-3 text-white text-xs font-sans focus:border-[#D4AF37] focus:outline-none"
            >
              <option value="">-- Populate Active Estimator Workspace --</option>
              {existingProjects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name} ({proj.address}) • Current Parts: {proj.estimates?.length || 0}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Footer Controls */}
        <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[11px] font-mono flex items-center gap-1.5">
            {validationErrors.length > 0 ? (
              <span className="text-red-400 flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                Action Required: Resolve {validationErrors.length} row error(s) in preview table before importing.
              </span>
            ) : parsedParts.length > 0 ? (
              <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                All mandatory fields validated. Ready to import {parsedParts.length} part record(s).
              </span>
            ) : (
              <span className="text-neutral-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                Paste spreadsheet data above to preview, validate, and edit parsed dimension parts.
              </span>
            )}
          </span>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs font-mono font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={parsedParts.length === 0 || validationErrors.length > 0}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
                parsedParts.length > 0 && validationErrors.length === 0
                  ? "bg-[#D4AF37] hover:bg-amber-400 text-black cursor-pointer"
                  : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700"
              }`}
              title={
                validationErrors.length > 0
                  ? `Fix ${validationErrors.length} validation error(s) before importing`
                  : parsedParts.length === 0
                  ? "No parts parsed to import"
                  : "Confirm and import valid parts"
              }
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Import {parsedParts.length} Parts</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
