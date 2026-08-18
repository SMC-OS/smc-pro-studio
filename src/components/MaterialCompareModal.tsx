import React from "react";
import {
  X,
  RotateCcw,
  Sparkles,
  Calculator,
  AlertTriangle,
  CheckCircle,
  Info,
  Thermometer,
  Droplets,
  ShieldCheck,
  ChevronDown,
  Layers,
  ArrowRight,
  TrendingDown,
  Check,
  Heart
} from "lucide-react";
import { Material } from "../App";

interface MaterialCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  materialAId: string;
  materialBId: string;
  onSelectMaterialA: (id: string) => void;
  onSelectMaterialB: (id: string) => void;
  onSwapMaterials: () => void;
  onSelectForQuote: (materialId: string) => void;
  materialsStock?: Record<string, number>;
  favoriteMaterialIds?: string[];
  onToggleFavorite?: (id: string) => void;
}

export default function MaterialCompareModal({
  isOpen,
  onClose,
  materials,
  materialAId,
  materialBId,
  onSelectMaterialA,
  onSelectMaterialB,
  onSwapMaterials,
  onSelectForQuote,
  materialsStock = {},
  favoriteMaterialIds = [],
  onToggleFavorite
}: MaterialCompareModalProps) {
  if (!isOpen) return null;

  const matA = materials.find((m) => m.id === materialAId) || materials[0];
  const matB = materials.find((m) => m.id === materialBId) || materials[1] || materials[0];

  const stockA = materialsStock[matA.id] ?? matA.stockSqFt ?? 0;
  const stockB = materialsStock[matB.id] ?? matB.stockSqFt ?? 0;

  // Helper properties derived from material classification
  const getHeatRating = (mat: Material) => {
    if (mat.class === "Porcelain") {
      return {
        label: "Extreme (Up to 1200°C)",
        badge: "Thermal Shock Proof",
        color: "text-emerald-700 bg-emerald-50 border-emerald-200"
      };
    } else if (mat.class === "Quartz") {
      return {
        label: "Moderate (Up to 150°C)",
        badge: "Requires Trivet",
        color: "text-amber-700 bg-amber-50 border-amber-200"
      };
    } else {
      return {
        label: "High (Up to 300°C)",
        badge: "Heat Safe",
        color: "text-blue-700 bg-blue-50 border-blue-200"
      };
    }
  };

  const getUvRating = (mat: Material) => {
    if (mat.class === "Porcelain") {
      return { label: "100% UV Proof", note: "Indoor & Outdoor BBQ" };
    } else if (mat.class === "Quartz") {
      return { label: "Indoor Only", note: "UV discolors resin binders" };
    } else {
      return { label: "UV Stable", note: "Indoor & Outdoor (Sealer required)" };
    }
  };

  const getAcidRating = (mat: Material) => {
    if (mat.class === "Porcelain") {
      return { label: "100% Chemical & Acid Proof", note: "Zero reaction to bleach, wine, or citrus" };
    } else if (mat.class === "Quartz") {
      return { label: "High Stain Protection", note: "Non-porous resin matrix" };
    } else {
      return { label: "Acid Sensitive", note: "Lemon/vinegar will etch unsealed marble" };
    }
  };

  const heatA = getHeatRating(matA);
  const heatB = getHeatRating(matB);
  const uvA = getUvRating(matA);
  const uvB = getUvRating(matB);
  const acidA = getAcidRating(matA);
  const acidB = getAcidRating(matB);

  // Price difference calculation
  const priceDiff = matA.price - matB.price;
  const pricePctDiff = matB.price > 0 ? Math.round((Math.abs(priceDiff) / matB.price) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-[100] animate-fade-in overflow-y-auto">
      <div className="bg-white border border-neutral-200 rounded-xl max-w-5xl w-full my-auto shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="bg-[#1A1A1A] text-white p-5 sm:p-6 flex justify-between items-center border-b border-neutral-800 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-gold/20 text-gold text-[10px] font-mono uppercase font-bold tracking-widest px-2.5 py-0.5 rounded border border-gold/30">
                SMC TECHNICAL MATRIX
              </span>
              <span className="text-xs font-mono text-neutral-400 hidden sm:inline">
                ID: SPEC-COMPARE-v2
              </span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-light tracking-tight text-white flex items-center gap-2">
              Side-by-Side Material Spec Comparison
            </h3>
            <p className="text-xs text-neutral-400 max-w-2xl">
              Compare Mohs hardness, porosity, thermal tolerances, and price per sqft to present technical options directly to clients.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSwapMaterials}
              className="bg-neutral-800 hover:bg-gold hover:text-white text-neutral-300 text-xs font-mono px-3 py-2 rounded border border-neutral-700 transition-colors flex items-center gap-1.5"
              title="Swap Left and Right materials"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Swap Positions</span>
            </button>

            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition-colors"
              aria-label="Close Comparison Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY CONTENT */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-[#FBFBFA]">
          
          {/* MATERIAL SELECTORS & CARDS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* MATERIAL A CARD */}
            <div className="bg-white border-2 border-gold/60 rounded-xl p-4 sm:p-5 shadow-xs space-y-4 relative">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-gold">
                  MATERIAL A (LEFT)
                </span>
                <span className="text-xs font-bold text-neutral-900 bg-neutral-100 px-2.5 py-0.5 rounded font-mono">
                  £{matA.price} / sqft
                </span>
              </div>

              {/* Selector Dropdown A */}
              <div className="relative">
                <select
                  value={matA.id}
                  onChange={(e) => onSelectMaterialA(e.target.value)}
                  className="w-full bg-white border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded-lg p-2.5 pr-8 text-sm font-semibold text-neutral-800 appearance-none cursor-pointer shadow-xs hover:border-neutral-300 transition-all"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id} disabled={m.id === matB.id}>
                      {m.name} ({m.class}) - £{m.price}/sqft
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Preview Block A */}
              <div className="h-28 rounded-lg overflow-hidden relative border border-neutral-200 flex items-center justify-center group">
                {matA.hasSpecialImage ? (
                  <img
                    src="/src/assets/images/luxury_countertop_1784523702433.jpg"
                    alt={matA.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 opacity-80" style={{ backgroundImage: matA.bgStyle }} />
                )}
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(matA.id)}
                    className={`absolute top-2 right-2 p-1.5 rounded-full transition-all cursor-pointer ${
                      favoriteMaterialIds.includes(matA.id)
                        ? "bg-white text-rose-600 border border-rose-200 shadow-xs"
                        : "bg-black/60 text-white/80 hover:text-rose-400 hover:bg-black/80"
                    }`}
                    title={favoriteMaterialIds.includes(matA.id) ? "Remove from Favorites" : "Save to Favorites"}
                  >
                    <Heart className={`w-3.5 h-3.5 ${favoriteMaterialIds.includes(matA.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                  </button>
                )}
                <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded border border-white/10">
                  {matA.class}
                </div>
              </div>

              {/* Quick Action A */}
              <button
                onClick={() => {
                  onSelectForQuote(matA.id);
                  onClose();
                }}
                className="w-full bg-[#1A1A1A] hover:bg-gold text-white text-xs font-semibold uppercase tracking-wider py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Calculator className="w-3.5 h-3.5" /> Select for Quote
              </button>
            </div>

            {/* MATERIAL B CARD */}
            <div className="bg-white border-2 border-neutral-300 rounded-xl p-4 sm:p-5 shadow-xs space-y-4 relative">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-neutral-500">
                  MATERIAL B (RIGHT)
                </span>
                <span className="text-xs font-bold text-neutral-900 bg-neutral-100 px-2.5 py-0.5 rounded font-mono">
                  £{matB.price} / sqft
                </span>
              </div>

              {/* Selector Dropdown B */}
              <div className="relative">
                <select
                  value={matB.id}
                  onChange={(e) => onSelectMaterialB(e.target.value)}
                  className="w-full bg-white border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded-lg p-2.5 pr-8 text-sm font-semibold text-neutral-800 appearance-none cursor-pointer shadow-xs hover:border-neutral-300 transition-all"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id} disabled={m.id === matA.id}>
                      {m.name} ({m.class}) - £{m.price}/sqft
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Preview Block B */}
              <div className="h-28 rounded-lg overflow-hidden relative border border-neutral-200 flex items-center justify-center group">
                {matB.hasSpecialImage ? (
                  <img
                    src="/src/assets/images/luxury_countertop_1784523702433.jpg"
                    alt={matB.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 opacity-80" style={{ backgroundImage: matB.bgStyle }} />
                )}
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(matB.id)}
                    className={`absolute top-2 right-2 p-1.5 rounded-full transition-all cursor-pointer ${
                      favoriteMaterialIds.includes(matB.id)
                        ? "bg-white text-rose-600 border border-rose-200 shadow-xs"
                        : "bg-black/60 text-white/80 hover:text-rose-400 hover:bg-black/80"
                    }`}
                    title={favoriteMaterialIds.includes(matB.id) ? "Remove from Favorites" : "Save to Favorites"}
                  >
                    <Heart className={`w-3.5 h-3.5 ${favoriteMaterialIds.includes(matB.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                  </button>
                )}
                <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded border border-white/10">
                  {matB.class}
                </div>
              </div>

              {/* Quick Action B */}
              <button
                onClick={() => {
                  onSelectForQuote(matB.id);
                  onClose();
                }}
                className="w-full bg-[#1A1A1A] hover:bg-gold text-white text-xs font-semibold uppercase tracking-wider py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Calculator className="w-3.5 h-3.5" /> Select for Quote
              </button>
            </div>

          </div>

          {/* PRICE COMPARISON SUMMARY CARD */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/10 text-gold flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 font-mono">
                  Price Valuation Delta
                </h4>
                <p className="text-xs text-neutral-600 mt-0.5">
                  {priceDiff === 0 ? (
                    <span>Both materials are priced identically at <strong className="font-bold">£{matA.price} / sq ft</strong>.</span>
                  ) : priceDiff < 0 ? (
                    <span>
                      <strong className="text-emerald-700 font-bold">{matA.name}</strong> is{" "}
                      <strong className="text-emerald-700 font-bold">£{Math.abs(priceDiff)}/sqft ({pricePctDiff}%) lower cost</strong>{" "}
                      than {matB.name}.
                    </span>
                  ) : (
                    <span>
                      <strong className="text-emerald-700 font-bold">{matB.name}</strong> is{" "}
                      <strong className="text-emerald-700 font-bold">£{priceDiff}/sqft ({pricePctDiff}%) lower cost</strong>{" "}
                      than {matA.name}.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
              <span className={`px-3 py-1 rounded font-bold ${priceDiff <= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-neutral-100 text-neutral-700"}`}>
                A: £{matA.price}/sqft
              </span>
              <span className="text-neutral-300">vs</span>
              <span className={`px-3 py-1 rounded font-bold ${priceDiff >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-neutral-100 text-neutral-700"}`}>
                B: £{matB.price}/sqft
              </span>
            </div>
          </div>

          {/* SPECIFICATION COMPARISON MATRIX TABLE */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-neutral-100 px-5 py-3 border-b border-neutral-200 flex justify-between items-center">
              <h4 className="font-serif text-sm font-semibold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-gold" />
                Technical Specifications Table
              </h4>
              <span className="text-[10px] font-mono text-neutral-400">
                LAB CERTIFIED PARAMETERS
              </span>
            </div>

            <div className="divide-y divide-neutral-150 text-xs">
              
              {/* ROW 1: Classification */}
              <div className="grid grid-cols-12 p-3 sm:p-4 hover:bg-neutral-50/50 transition-colors items-center">
                <div className="col-span-12 sm:col-span-4 font-semibold text-neutral-700 pb-1 sm:pb-0">
                  Material Class
                </div>
                <div className="col-span-6 sm:col-span-4 font-mono text-neutral-800 font-bold flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${matA.class === "Porcelain" ? "bg-blue-500" : matA.class === "Quartz" ? "bg-purple-500" : "bg-amber-500"}`} />
                  {matA.class}
                </div>
                <div className="col-span-6 sm:col-span-4 font-mono text-neutral-800 font-bold flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${matB.class === "Porcelain" ? "bg-blue-500" : matB.class === "Quartz" ? "bg-purple-500" : "bg-amber-500"}`} />
                  {matB.class}
                </div>
              </div>

              {/* ROW 2: Mohs Hardness */}
              <div className="grid grid-cols-12 p-3 sm:p-4 hover:bg-neutral-50/50 transition-colors items-center">
                <div className="col-span-12 sm:col-span-4 font-semibold text-neutral-700 pb-1 sm:pb-0">
                  Mohs Hardness (Scratch)
                </div>
                <div className="col-span-6 sm:col-span-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-neutral-900 text-sm">{matA.mohs} / 10</span>
                    {matA.mohs > matB.mohs && (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
                        + HARDER
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden max-w-[140px]">
                    <div
                      className={`h-full rounded-full ${matA.mohs >= 8 ? "bg-emerald-500" : matA.mohs >= 6 ? "bg-gold" : "bg-amber-500"}`}
                      style={{ width: `${(matA.mohs / 10) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="col-span-6 sm:col-span-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-neutral-900 text-sm">{matB.mohs} / 10</span>
                    {matB.mohs > matA.mohs && (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
                        + HARDER
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden max-w-[140px]">
                    <div
                      className={`h-full rounded-full ${matB.mohs >= 8 ? "bg-emerald-500" : matB.mohs >= 6 ? "bg-gold" : "bg-amber-500"}`}
                      style={{ width: `${(matB.mohs / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* ROW 3: Water Absorption */}
              <div className="grid grid-cols-12 p-3 sm:p-4 hover:bg-neutral-50/50 transition-colors items-center">
                <div className="col-span-12 sm:col-span-4 font-semibold text-neutral-700 pb-1 sm:pb-0">
                  Water Absorption (Porosity)
                </div>
                <div className="col-span-6 sm:col-span-4 font-mono space-y-0.5">
                  <div className="font-bold text-neutral-900">{matA.waterAbsorption}</div>
                  <span className="text-[10px] text-neutral-500 font-sans block">
                    {matA.class === "Natural Stone" ? "Requires Sealer" : "Non-Porous"}
                  </span>
                </div>
                <div className="col-span-6 sm:col-span-4 font-mono space-y-0.5">
                  <div className="font-bold text-neutral-900">{matB.waterAbsorption}</div>
                  <span className="text-[10px] text-neutral-500 font-sans block">
                    {matB.class === "Natural Stone" ? "Requires Sealer" : "Non-Porous"}
                  </span>
                </div>
              </div>

              {/* ROW 4: Thermal & Heat Tolerance */}
              <div className="grid grid-cols-12 p-3 sm:p-4 hover:bg-neutral-50/50 transition-colors items-center">
                <div className="col-span-12 sm:col-span-4 font-semibold text-neutral-700 pb-1 sm:pb-0 flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-gold" />
                  Heat Tolerance
                </div>
                <div className="col-span-6 sm:col-span-4 space-y-1">
                  <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${heatA.color}`}>
                    {heatA.badge}
                  </span>
                  <div className="text-[11px] font-medium text-neutral-800">{heatA.label}</div>
                </div>
                <div className="col-span-6 sm:col-span-4 space-y-1">
                  <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${heatB.color}`}>
                    {heatB.badge}
                  </span>
                  <div className="text-[11px] font-medium text-neutral-800">{heatB.label}</div>
                </div>
              </div>

              {/* ROW 5: Acid & Stain Resistance */}
              <div className="grid grid-cols-12 p-3 sm:p-4 hover:bg-neutral-50/50 transition-colors items-center">
                <div className="col-span-12 sm:col-span-4 font-semibold text-neutral-700 pb-1 sm:pb-0 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-gold" />
                  Stain & Acid Resistance
                </div>
                <div className="col-span-6 sm:col-span-4 space-y-0.5">
                  <div className="font-semibold text-neutral-800">{acidA.label}</div>
                  <div className="text-[10px] text-neutral-500">{acidA.note}</div>
                </div>
                <div className="col-span-6 sm:col-span-4 space-y-0.5">
                  <div className="font-semibold text-neutral-800">{acidB.label}</div>
                  <div className="text-[10px] text-neutral-500">{acidB.note}</div>
                </div>
              </div>

              {/* ROW 6: UV & Weatherability */}
              <div className="grid grid-cols-12 p-3 sm:p-4 hover:bg-neutral-50/50 transition-colors items-center">
                <div className="col-span-12 sm:col-span-4 font-semibold text-neutral-700 pb-1 sm:pb-0">
                  Outdoor & UV Capability
                </div>
                <div className="col-span-6 sm:col-span-4 space-y-0.5">
                  <div className="font-semibold text-neutral-800">{uvA.label}</div>
                  <div className="text-[10px] text-neutral-500">{uvA.note}</div>
                </div>
                <div className="col-span-6 sm:col-span-4 space-y-0.5">
                  <div className="font-semibold text-neutral-800">{uvB.label}</div>
                  <div className="text-[10px] text-neutral-500">{uvB.note}</div>
                </div>
              </div>

              {/* ROW 7: Standard Thickness Gauges */}
              <div className="grid grid-cols-12 p-3 sm:p-4 hover:bg-neutral-50/50 transition-colors items-center">
                <div className="col-span-12 sm:col-span-4 font-semibold text-neutral-700 pb-1 sm:pb-0">
                  Available Gauges
                </div>
                <div className="col-span-6 sm:col-span-4 font-mono text-neutral-800 font-medium">
                  {matA.thicknesses.join(", ")}
                </div>
                <div className="col-span-6 sm:col-span-4 font-mono text-neutral-800 font-medium">
                  {matB.thicknesses.join(", ")}
                </div>
              </div>

              {/* ROW 8: Available Finishes */}
              <div className="grid grid-cols-12 p-3 sm:p-4 hover:bg-neutral-50/50 transition-colors items-center">
                <div className="col-span-12 sm:col-span-4 font-semibold text-neutral-700 pb-1 sm:pb-0">
                  Surface Finishes
                </div>
                <div className="col-span-6 sm:col-span-4 text-neutral-800 font-medium">
                  {matA.finishes.join(", ")}
                </div>
                <div className="col-span-6 sm:col-span-4 text-neutral-800 font-medium">
                  {matB.finishes.join(", ")}
                </div>
              </div>

              {/* ROW 9: Warehouse Stock */}
              <div className="grid grid-cols-12 p-3 sm:p-4 hover:bg-neutral-50/50 transition-colors items-center">
                <div className="col-span-12 sm:col-span-4 font-semibold text-neutral-700 pb-1 sm:pb-0">
                  Warehouse Stock
                </div>
                <div className="col-span-6 sm:col-span-4 font-mono">
                  <span className={`font-bold ${stockA <= 20 ? "text-amber-600" : "text-neutral-900"}`}>
                    {stockA} sq ft
                  </span>
                  <span className="text-[10px] text-neutral-400 block font-sans">
                    {stockA <= 20 ? "Low Stock Level" : "Sufficient Inventory"}
                  </span>
                </div>
                <div className="col-span-6 sm:col-span-4 font-mono">
                  <span className={`font-bold ${stockB <= 20 ? "text-amber-600" : "text-neutral-900"}`}>
                    {stockB} sq ft
                  </span>
                  <span className="text-[10px] text-neutral-400 block font-sans">
                    {stockB <= 20 ? "Low Stock Level" : "Sufficient Inventory"}
                  </span>
                </div>
              </div>

              {/* ROW 10: Approved Applications */}
              <div className="grid grid-cols-12 p-3 sm:p-4 hover:bg-neutral-50/50 transition-colors items-center">
                <div className="col-span-12 sm:col-span-4 font-semibold text-neutral-700 pb-1 sm:pb-0">
                  Approved Applications
                </div>
                <div className="col-span-6 sm:col-span-4 flex flex-wrap gap-1">
                  {matA.application.map((app, idx) => (
                    <span key={idx} className="bg-neutral-100 text-neutral-700 text-[10px] px-2 py-0.5 rounded font-medium">
                      {app}
                    </span>
                  ))}
                </div>
                <div className="col-span-6 sm:col-span-4 flex flex-wrap gap-1">
                  {matB.application.map((app, idx) => (
                    <span key={idx} className="bg-neutral-100 text-neutral-700 text-[10px] px-2 py-0.5 rounded font-medium">
                      {app}
                    </span>
                  ))}
                </div>
              </div>

              {/* ROW 11: Fabrication Notes */}
              <div className="grid grid-cols-12 p-3 sm:p-4 hover:bg-neutral-50/50 transition-colors">
                <div className="col-span-12 sm:col-span-4 font-semibold text-neutral-700 pb-1 sm:pb-0">
                  Fabrication Guidance
                </div>
                <div className="col-span-6 sm:col-span-4 text-[11px] text-neutral-600 leading-relaxed pr-2">
                  {matA.fabricationNotes}
                </div>
                <div className="col-span-6 sm:col-span-4 text-[11px] text-neutral-600 leading-relaxed pl-2 border-l border-neutral-100 sm:border-l-0">
                  {matB.fabricationNotes}
                </div>
              </div>

            </div>
          </div>

          {/* TAILORED RECOMMENDATION BANNER */}
          <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold font-mono text-xs uppercase tracking-wider">
              <Info className="w-4 h-4 text-amber-700" />
              SMC Trade Client Selection Advice
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>{matA.name} ({matA.class})</strong> vs <strong>{matB.name} ({matB.class})</strong>:{" "}
              {matA.class === "Porcelain" || matB.class === "Porcelain" ? (
                <span>
                  Sintered Porcelain delivers max scratch rating ({Math.max(matA.mohs, matB.mohs)} Mohs) and total immunity to outdoor UV rays & hot pans, but requires perimeter stress-relief cuts during fabrication.
                </span>
              ) : matA.class === "Quartz" || matB.class === "Quartz" ? (
                <span>
                  Engineered Quartz provides zero porosity and high impact resistance with effortless fabrication, recommended primarily for indoor residential kitchens.
                </span>
              ) : (
                <span>
                  Natural Stone offers timeless mineral depth and unique vein patterning; double penetrating sealer application is mandatory prior to client handoff.
                </span>
              )}
            </p>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 bg-white border-t border-neutral-200 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <div className="text-xs text-neutral-500 font-mono text-center sm:text-left">
            Select a material above to populate directly into the active estimate.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              Close Comparison
            </button>
            <button
              onClick={() => {
                onSelectForQuote(matA.id);
                onClose();
              }}
              className="bg-[#1A1A1A] hover:bg-gold text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              Load {matA.name} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
