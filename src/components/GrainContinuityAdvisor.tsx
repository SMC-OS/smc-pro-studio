import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Eye,
  Info,
  Maximize2,
  Check,
  Zap,
  ShieldCheck,
  Scissors,
  Box,
  RefreshCw
} from "lucide-react";

interface GrainContinuityAdvisorProps {
  selectedMaterialId?: string;
  onApplyOrientation?: (orientation: "bookmatched" | "directional", yieldImpactPct: number) => void;
  className?: string;
}

interface MaterialVeinPreset {
  id: string;
  name: string;
  class: string;
  primaryColor: string;
  secondaryColor: string;
  veinColor: string;
  veinIntensity: number; // 1-5
  bgGradient: string;
  description: string;
}

const MATERIAL_PRESETS: MaterialVeinPreset[] = [
  {
    id: "calacatta-gold",
    name: "Calacatta Gold Quartz",
    class: "Sintered Quartz",
    primaryColor: "#f8f8f6",
    secondaryColor: "#e8e6e1",
    veinColor: "#c59b27",
    veinIntensity: 4,
    bgGradient: "from-[#fbfbfa] via-[#eeebe3] to-[#d8cca8]",
    description: "Bold Phoenix Gold dramatic veins on an ultra-white marble canvas. Requires precise miter mirroring."
  },
  {
    id: "emerald-quartzite",
    name: "Emerald Quartzite",
    class: "Natural Quartzite",
    primaryColor: "#0f2e23",
    secondaryColor: "#1a4738",
    veinColor: "#d4af37",
    veinIntensity: 5,
    bgGradient: "from-[#0a1e17] via-[#133c2e] to-[#255e4b]",
    description: "Deep oceanic green waves infused with gold dust layers. Strong directional orientation movement."
  },
  {
    id: "nero-marquina",
    name: "Nero Marquina",
    class: "Natural Fine Marble",
    primaryColor: "#121212",
    secondaryColor: "#1d1d1d",
    veinColor: "#ffffff",
    veinIntensity: 4,
    bgGradient: "from-[#090909] via-[#171717] to-[#262626]",
    description: "Obsidian black stone with sharp calcite white streak veins. Misalignments are highly visible."
  },
  {
    id: "taj-mahal",
    name: "Taj Mahal",
    class: "Natural Quartzite",
    primaryColor: "#ede7d9",
    secondaryColor: "#ded4bf",
    veinColor: "#bfa373",
    veinIntensity: 2,
    bgGradient: "from-[#f5f1e8] via-[#e5dccb] to-[#cebe9e]",
    description: "Subtle translucent ivory with soft caramel waves. Forgiving grain transitions across seams."
  }
];

export default function GrainContinuityAdvisor({
  selectedMaterialId = "calacatta-gold",
  onApplyOrientation,
  className = ""
}: GrainContinuityAdvisorProps) {
  const [activeMaterialId, setActiveMaterialId] = useState<string>(selectedMaterialId);
  const [miterType, setMiterType] = useState<"waterfall" | "corner90" | "apron50">("waterfall");
  const [activeViewMode, setActiveViewMode] = useState<"compare" | "bookmatched" | "directional">("compare");
  const [activeDimension, setActiveDimension] = useState<"3d" | "2d">("3d");
  const [showSeamMarkers, setShowSeamMarkers] = useState<boolean>(true);
  const [appliedOrientation, setAppliedOrientation] = useState<"bookmatched" | "directional" | null>(null);
  const [customRotation, setCustomRotation] = useState<number>(0);

  const activeMaterial = MATERIAL_PRESETS.find((m) => m.id === activeMaterialId) || MATERIAL_PRESETS[0];

  const handleApply = (orientation: "bookmatched" | "directional") => {
    setAppliedOrientation(orientation);
    const yieldImpact = orientation === "bookmatched" ? 18 : 0; // +18% slab allowance for bookmatched
    if (onApplyOrientation) {
      onApplyOrientation(orientation, yieldImpact);
    }
  };

  const handleFlipOrientation = () => {
    if (activeViewMode === "bookmatched") {
      setActiveViewMode("directional");
    } else if (activeViewMode === "directional") {
      setActiveViewMode("bookmatched");
    } else {
      setActiveViewMode("bookmatched");
    }
  };

  return (
    <div className={`bg-[#121212] border border-[#333333] rounded-2xl p-6 text-[#e2e2e2] shadow-2xl space-y-6 ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/30 to-black border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] text-[#D4AF37] uppercase font-bold tracking-widest bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20">
                SMC PRO PRECISION ENGINE
              </span>
              <span className="font-mono text-[10px] text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800">
                BS EN 1469 READY
              </span>
              <span className="font-mono text-[10px] text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1" title="Data sent to AI is processed securely via Google Gemini cloud models under SMC Pro privacy guidelines">
                ✨ AI-Generated Output • Powered by Google Gemini
              </span>
            </div>
            <h3 className="font-serif text-xl font-bold text-white mt-0.5">
              Grain Continuity Advisor™
            </h3>
          </div>
        </div>

        {/* 3D vs 2D Perspective Toggle */}
        <div className="flex items-center gap-2 bg-black p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => setActiveDimension("3d")}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeDimension === "3d"
                ? "bg-[#D4AF37] text-black shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Miter Corner</span>
          </button>
          <button
            onClick={() => setActiveDimension("2d")}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeDimension === "2d"
                ? "bg-[#D4AF37] text-black shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2D Flat Layout</span>
          </button>
        </div>
      </div>

      {/* Visual Layout Switcher Bar */}
      <div className="bg-black/90 border border-[#D4AF37]/30 p-3 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-inner">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="font-mono text-[10px] uppercase font-bold text-neutral-400 px-2 hidden sm:inline">
            LAYOUT ORIENTATION:
          </span>
          <div className="flex items-center bg-[#1a1a1a] p-1 rounded-xl border border-neutral-800 w-full sm:w-auto justify-between">
            <button
              onClick={() => setActiveViewMode("compare")}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
                activeViewMode === "compare"
                  ? "bg-[#D4AF37] text-black shadow-md"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Side-by-Side Compare
            </button>
            <button
              onClick={() => setActiveViewMode("bookmatched")}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeViewMode === "bookmatched"
                  ? "bg-[#D4AF37] text-black shadow-md"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bookmatched</span>
            </button>
            <button
              onClick={() => setActiveViewMode("directional")}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeViewMode === "directional"
                  ? "bg-[#D4AF37] text-black shadow-md"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Directional</span>
            </button>
          </div>
        </div>

        {/* Flip Orientation Toggle */}
        <button
          onClick={handleFlipOrientation}
          className="w-full md:w-auto px-4 py-2 bg-[#D4AF37]/15 border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black text-[#D4AF37] text-xs font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Flip Layout Mode ({activeViewMode === "directional" ? "Directional → Bookmatched" : "Bookmatched → Directional"})</span>
        </button>
      </div>

      {/* Control Strip: Material Selector & Joint Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Material Selection */}
        <div className="space-y-1.5">
          <label className="font-mono text-[10px] uppercase font-bold text-neutral-400 flex items-center justify-between">
            <span>Slab Surface Preset</span>
            <span className="text-[#D4AF37]">{activeMaterial.class}</span>
          </label>
          <select
            value={activeMaterialId}
            onChange={(e) => setActiveMaterialId(e.target.value)}
            className="w-full bg-black border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-serif font-bold focus:outline-none focus:border-[#D4AF37]"
          >
            {MATERIAL_PRESETS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.class})
              </option>
            ))}
          </select>
        </div>

        {/* Joint Geometry Selection */}
        <div className="space-y-1.5">
          <label className="font-mono text-[10px] uppercase font-bold text-neutral-400">
            Mitered Seam Geometry
          </label>
          <select
            value={miterType}
            onChange={(e) => setMiterType(e.target.value as any)}
            className="w-full bg-black border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-semibold focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="waterfall">Waterfall Edge (Horizontal to Vertical)</option>
            <option value="corner90">90° L-Corner Joint (Deck-to-Deck)</option>
            <option value="apron50">50mm Drop Apron Miter Edge</option>
          </select>
        </div>

        {/* Inspection Toggle Tools */}
        <div className="space-y-1.5">
          <label className="font-mono text-[10px] uppercase font-bold text-neutral-400">
            Inspection Overlay Tools
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSeamMarkers(!showSeamMarkers)}
              className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all ${
                showSeamMarkers
                  ? "bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]"
                  : "bg-black border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showSeamMarkers ? "Seam Markers On" : "Seam Markers Off"}</span>
            </button>
            <button
              onClick={() => setCustomRotation((r) => (r + 90) % 360)}
              className="py-2.5 px-3 bg-black border border-neutral-800 hover:border-[#D4AF37] text-neutral-300 hover:text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5"
              title="Rotate Grain Flow 90°"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{customRotation}°</span>
            </button>
          </div>
        </div>

           {/* Main Visual Render Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        <AnimatePresence mode="popLayout">
          {/* PANEL 1: BOOKMATCHED SEAM */}
          {(activeViewMode === "compare" || activeViewMode === "bookmatched") && (
            <motion.div
              key="panel-bookmatched"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className={`bg-black/90 border border-[#D4AF37]/40 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden group ${
                activeViewMode === "bookmatched" ? "lg:col-span-2 max-w-3xl mx-auto w-full" : ""
              }`}
            >
              
              {/* Top Label & Badge */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    RECOMMENDED FOR HIGH-VEIN STONE
                  </span>
                  <h4 className="font-serif text-lg font-bold text-white mt-0.5">
                    Bookmatched Mirror Seam
                  </h4>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xl font-bold text-[#D4AF37]">98%</span>
                  <span className="font-mono text-[9px] text-neutral-400 block uppercase">
                    Vein Continuity
                  </span>
                </div>
              </div>

              {/* Interactive SVG Visual Canvas - Bookmatched */}
              <div className="relative aspect-video rounded-xl overflow-hidden border border-neutral-800 bg-[#0a0a0a] flex items-center justify-center p-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`bm-canvas-${activeMaterialId}-${activeDimension}-${miterType}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <svg className="w-full h-full" viewBox="0 0 500 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Defs for Stone Gradients & Patterns */}
                      <defs>
                        <linearGradient id="leftSlabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={activeMaterial.primaryColor} />
                          <stop offset="100%" stopColor={activeMaterial.secondaryColor} />
                        </linearGradient>
                        <linearGradient id="rightSlabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={activeMaterial.secondaryColor} />
                          <stop offset="100%" stopColor={activeMaterial.primaryColor} />
                        </linearGradient>
                        <linearGradient id="leftApronGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor={activeMaterial.secondaryColor} />
                          <stop offset="100%" stopColor="#111" />
                        </linearGradient>
                        <linearGradient id="rightApronGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor={activeMaterial.primaryColor} />
                          <stop offset="100%" stopColor="#111" />
                        </linearGradient>
                      </defs>

                      {activeDimension === "3d" ? (
                        /* 3D ISOMETRIC MITER CORNER COMPONENT (BOOKMATCHED) */
                        <g transform={`rotate(${customRotation}, 250, 140)`}>
                          {/* Shadow / Base */}
                          <ellipse cx="240" cy="235" rx="160" ry="35" fill="#000000" opacity="0.6" />

                          {/* TOP DECK - LEFT HALF */}
                          <polygon
                            points="90,110 240,40 240,150 90,110"
                            fill="url(#leftSlabGrad)"
                            stroke="#444"
                            strokeWidth="1.5"
                          />

                          {/* TOP DECK - RIGHT HALF (BOOKMATCHED MIRROR) */}
                          <polygon
                            points="240,40 390,110 240,150 240,40"
                            fill="url(#rightSlabGrad)"
                            stroke="#444"
                            strokeWidth="1.5"
                          />

                          {/* FRONT APRON VERTICAL - LEFT FACE */}
                          <polygon
                            points="90,110 240,150 240,225 90,185"
                            fill="url(#leftApronGrad)"
                            stroke="#333"
                            strokeWidth="1.5"
                          />

                          {/* FRONT APRON VERTICAL - RIGHT FACE */}
                          <polygon
                            points="240,150 390,110 390,185 240,225"
                            fill="url(#rightApronGrad)"
                            stroke="#333"
                            strokeWidth="1.5"
                          />

                          {/* 3D MITER SEAM HIGHLIGHT LINE (TOP DECK TO APRON) */}
                          <polyline
                            points="240,40 240,150 240,225"
                            stroke="#D4AF37"
                            strokeWidth="2.5"
                            strokeDasharray="4 2"
                          />

                          {/* BOOKMATCHED VEIN PATTERN ON 3D TOP DECK */}
                          <g stroke={activeMaterial.veinColor} strokeWidth="3" strokeLinecap="round" opacity="0.9">
                            {/* Left Top Deck Veins */}
                            <path d="M 120 100 Q 180 75, 240 95" fill="none" />
                            <path d="M 140 120 Q 190 90, 240 135" fill="none" />

                            {/* Right Top Deck Veins (Mirrored at X=240) */}
                            <path d="M 360 100 Q 300 75, 240 95" fill="none" />
                            <path d="M 340 120 Q 290 90, 240 135" fill="none" />

                            {/* Waterfall Veins Dropping Down Apron Front */}
                            <path d="M 240 95 L 240 225" stroke="#D4AF37" strokeWidth="2" strokeDasharray="3 3" />
                            <path d="M 140 120 Q 170 150, 170 200" fill="none" opacity="0.75" />
                            <path d="M 340 120 Q 310 150, 310 200" fill="none" opacity="0.75" />
                          </g>

                          {/* CONTINUITY MARKERS */}
                          {showSeamMarkers && (
                            <g>
                              <circle cx="240" cy="95" r="5" fill="#10b981" />
                              <circle cx="240" cy="95" r="9" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2" />
                              <circle cx="240" cy="135" r="5" fill="#10b981" />
                              <circle cx="240" cy="135" r="9" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2" />
                              <circle cx="240" cy="150" r="5" fill="#10b981" />
                              <circle cx="240" cy="150" r="9" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2" />
                            </g>
                          )}

                          {/* 3D Corner Annotations */}
                          <text x="130" y="70" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">DECK A</text>
                          <text x="310" y="70" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">DECK B (MIRROR)</text>
                          <text x="120" y="160" fill="#a3a3a3" fontSize="8" fontFamily="monospace">APRON DROP</text>
                          <text x="210" y="30" fill="#D4AF37" fontSize="9" fontFamily="monospace" fontWeight="bold">3D MITER SEAM</text>
                        </g>
                      ) : (
                        /* 2D FLAT LAYOUT (BOOKMATCHED) */
                        <g transform={`rotate(${customRotation}, 250, 150)`}>
                          {/* Left Deck Slab */}
                          <path
                            d="M 20 20 L 230 20 L 230 280 L 20 280 Z"
                            fill="url(#leftSlabGrad)"
                            stroke="#333"
                            strokeWidth="1.5"
                          />

                          {/* Right / Apron Slab (Bookmatched Mirror) */}
                          <path
                            d="M 230 20 L 480 20 L 480 280 L 230 280 Z"
                            fill="url(#rightSlabGrad)"
                            stroke="#333"
                            strokeWidth="1.5"
                          />

                          {/* 45° Miter Seam Line */}
                          <line
                            x1="230"
                            y1="20"
                            x2="230"
                            y2="280"
                            stroke="#D4AF37"
                            strokeWidth="2.5"
                            strokeDasharray="4 2"
                          />

                          {/* VEIN PATTERN - LEFT SLAB */}
                          <g stroke={activeMaterial.veinColor} strokeWidth="3.5" strokeLinecap="round" opacity="0.85">
                            <path d="M 40 50 Q 120 90, 230 140" fill="none" />
                            <path d="M 120 90 Q 170 60, 230 80" fill="none" strokeWidth="2" />
                            <path d="M 30 180 Q 110 200, 230 230" fill="none" />
                            <path d="M 110 200 Q 160 250, 230 260" fill="none" strokeWidth="2" />
                          </g>

                          {/* VEIN PATTERN - RIGHT SLAB (MIRRORED) */}
                          <g stroke={activeMaterial.veinColor} strokeWidth="3.5" strokeLinecap="round" opacity="0.85">
                            <path d="M 420 50 Q 340 90, 230 140" fill="none" />
                            <path d="M 340 90 Q 290 60, 230 80" fill="none" strokeWidth="2" />
                            <path d="M 430 180 Q 350 200, 230 230" fill="none" />
                            <path d="M 350 200 Q 300 250, 230 260" fill="none" strokeWidth="2" />
                          </g>

                          {/* GREEN CONTINUITY ALIGNMENT HIGHLIGHT MARKERS */}
                          {showSeamMarkers && (
                            <g>
                              <circle cx="230" cy="80" r="6" fill="#10b981" fillOpacity="0.8" />
                              <circle cx="230" cy="80" r="10" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2" />
                              <circle cx="230" cy="140" r="6" fill="#10b981" fillOpacity="0.8" />
                              <circle cx="230" cy="140" r="10" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2" />
                              <circle cx="230" cy="230" r="6" fill="#10b981" fillOpacity="0.8" />
                              <circle cx="230" cy="230" r="10" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2" />
                              <circle cx="230" cy="260" r="6" fill="#10b981" fillOpacity="0.8" />
                              <circle cx="230" cy="260" r="10" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2" />
                            </g>
                          )}

                          <text x="35" y="270" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">SLAB A (FACE UP)</text>
                          <text x="375" y="270" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">SLAB B (MIRROR FACE)</text>
                          <text x="180" y="15" fill="#D4AF37" fontSize="9" fontFamily="monospace" fontWeight="bold">MITER SEAM</text>
                        </g>
                      )}
                    </svg>
                  </motion.div>
                </AnimatePresence>

                {/* HUD Badge Overlay */}
                <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-500/40 text-[10px] font-mono text-emerald-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>FLAWLESS VEIN CONTINUITY DETECTED</span>
                </div>
              </div>

              {/* Spec Breakdown */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl space-y-1">
                  <span className="text-[10px] text-neutral-400 uppercase block">SLAB ALLOWANCE IMPACT</span>
                  <span className="text-amber-400 font-bold block">+15% to +20% Slabs</span>
                  <span className="text-[9px] text-neutral-500">Requires paired consecutive A/B slab lot</span>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl space-y-1">
                  <span className="text-[10px] text-neutral-400 uppercase block">BS MASONRY GRADE</span>
                  <span className="text-emerald-400 font-bold block">Grade 1 Luxury Finish</span>
                  <span className="text-[9px] text-neutral-500">Ideal for high-end kitchen islands</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleApply("bookmatched")}
                className={`w-full py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  appliedOrientation === "bookmatched"
                    ? "bg-emerald-500 text-black shadow-lg"
                    : "bg-[#D4AF37] hover:bg-white text-black shadow-md"
                }`}
              >
                {appliedOrientation === "bookmatched" ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Applied to Active Estimate (+18% Yield Allowance)</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Select Bookmatched Orientation for Estimate</span>
                  </>
                )}
              </button>

            </motion.div>
          )}

          {/* PANEL 2: DIRECTIONAL / PARALLEL SEAM */}
          {(activeViewMode === "compare" || activeViewMode === "directional") && (
            <motion.div
              key="panel-directional"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className={`bg-black/90 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden group ${
                activeViewMode === "directional" ? "lg:col-span-2 max-w-3xl mx-auto w-full" : ""
              }`}
            >
              
              {/* Top Label & Badge */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-[10px] text-amber-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    STANDARD YIELD CUT (DIRECTIONAL)
                  </span>
                  <h4 className="font-serif text-lg font-bold text-white mt-0.5">
                    Directional Monodirectional Seam
                  </h4>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xl font-bold text-amber-400">52%</span>
                  <span className="font-mono text-[9px] text-neutral-400 block uppercase">
                    Vein Continuity
                  </span>
                </div>
              </div>

              {/* Interactive SVG Visual Canvas - Directional */}
              <div className="relative aspect-video rounded-xl overflow-hidden border border-neutral-800 bg-[#0a0a0a] flex items-center justify-center p-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`dir-canvas-${activeMaterialId}-${activeDimension}-${miterType}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <svg className="w-full h-full" viewBox="0 0 500 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {activeDimension === "3d" ? (
                        /* 3D ISOMETRIC MITER CORNER COMPONENT (DIRECTIONAL) */
                        <g transform={`rotate(${customRotation}, 250, 140)`}>
                          {/* Shadow / Base */}
                          <ellipse cx="240" cy="235" rx="160" ry="35" fill="#000000" opacity="0.6" />

                          {/* TOP DECK - LEFT HALF */}
                          <polygon
                            points="90,110 240,40 240,150 90,110"
                            fill="url(#leftSlabGrad)"
                            stroke="#444"
                            strokeWidth="1.5"
                          />

                          {/* TOP DECK - RIGHT HALF (UNMIRRORED DIRECTIONAL SHIFT) */}
                          <polygon
                            points="240,40 390,110 240,150 240,40"
                            fill="url(#leftSlabGrad)"
                            stroke="#444"
                            strokeWidth="1.5"
                          />

                          {/* FRONT APRON VERTICAL - LEFT FACE */}
                          <polygon
                            points="90,110 240,150 240,225 90,185"
                            fill="url(#leftApronGrad)"
                            stroke="#333"
                            strokeWidth="1.5"
                          />

                          {/* FRONT APRON VERTICAL - RIGHT FACE */}
                          <polygon
                            points="240,150 390,110 390,185 240,225"
                            fill="url(#leftApronGrad)"
                            stroke="#333"
                            strokeWidth="1.5"
                          />

                          {/* 3D MITER SEAM HIGHLIGHT LINE */}
                          <polyline
                            points="240,40 240,150 240,225"
                            stroke="#f59e0b"
                            strokeWidth="2.5"
                            strokeDasharray="4 2"
                          />

                          {/* DIRECTIONAL VEIN PATTERN ON 3D TOP DECK (OFFSETS & DISCONTINUITY) */}
                          <g stroke={activeMaterial.veinColor} strokeWidth="3" strokeLinecap="round" opacity="0.85">
                            {/* Left Top Deck Veins */}
                            <path d="M 120 100 Q 180 75, 240 95" fill="none" />
                            <path d="M 140 120 Q 190 90, 240 135" fill="none" />

                            {/* Right Top Deck Veins (Unmirrored - Offsets at Seam) */}
                            <path d="M 240 65 Q 310 80, 380 120" fill="none" />
                            <path d="M 240 105 Q 310 125, 370 150" fill="none" />

                            {/* Non-Matching Drop Down Apron */}
                            <path d="M 140 120 Q 170 150, 170 200" fill="none" opacity="0.6" />
                            <path d="M 310 125 Q 340 155, 340 205" fill="none" opacity="0.6" />
                          </g>

                          {/* RED MISALIGNMENT MARKERS ON 3D MITER */}
                          {showSeamMarkers && (
                            <g>
                              <circle cx="240" cy="95" r="5" fill="#ef4444" />
                              <line x1="240" y1="65" x2="240" y2="95" stroke="#ef4444" strokeWidth="2" />

                              <circle cx="240" cy="135" r="5" fill="#ef4444" />
                              <line x1="240" y1="105" x2="240" y2="135" stroke="#ef4444" strokeWidth="2" />
                            </g>
                          )}

                          {/* 3D Corner Annotations */}
                          <text x="130" y="70" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">DECK A</text>
                          <text x="310" y="70" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">DECK A (SHIFTED)</text>
                          <text x="120" y="160" fill="#a3a3a3" fontSize="8" fontFamily="monospace">APRON DROP</text>
                          <text x="210" y="30" fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="bold">OFFSET SEAM</text>
                        </g>
                      ) : (
                        /* 2D FLAT LAYOUT (DIRECTIONAL) */
                        <g transform={`rotate(${customRotation}, 250, 150)`}>
                          {/* Left Deck Slab */}
                          <path
                            d="M 20 20 L 230 20 L 230 280 L 20 280 Z"
                            fill="url(#leftSlabGrad)"
                            stroke="#333"
                            strokeWidth="1.5"
                          />

                          {/* Right / Apron Slab (Directional - Unmirrored parallel shift) */}
                          <path
                            d="M 230 20 L 480 20 L 480 280 L 230 280 Z"
                            fill="url(#leftSlabGrad)"
                            stroke="#333"
                            strokeWidth="1.5"
                          />

                          {/* 45° Miter Seam Line */}
                          <line
                            x1="230"
                            y1="20"
                            x2="230"
                            y2="280"
                            stroke="#f59e0b"
                            strokeWidth="2.5"
                            strokeDasharray="4 2"
                          />

                          {/* VEIN PATTERN - LEFT SLAB */}
                          <g stroke={activeMaterial.veinColor} strokeWidth="3.5" strokeLinecap="round" opacity="0.85">
                            <path d="M 40 50 Q 120 90, 230 140" fill="none" />
                            <path d="M 120 90 Q 170 60, 230 80" fill="none" strokeWidth="2" />
                            <path d="M 30 180 Q 110 200, 230 230" fill="none" />
                            <path d="M 110 200 Q 160 250, 230 260" fill="none" strokeWidth="2" />
                          </g>

                          {/* VEIN PATTERN - RIGHT SLAB (SAME DIRECTION AS LEFT = VEINS HIT SEAM AT BAD ANGLES) */}
                          <g stroke={activeMaterial.veinColor} strokeWidth="3.5" strokeLinecap="round" opacity="0.85">
                            <path d="M 230 50 Q 310 90, 420 140" fill="none" />
                            <path d="M 230 180 Q 310 200, 430 230" fill="none" />
                          </g>

                          {/* RED MISALIGNMENT MARKERS */}
                          {showSeamMarkers && (
                            <g>
                              <circle cx="230" cy="80" r="6" fill="#ef4444" fillOpacity="0.8" />
                              <line x1="230" y1="50" x2="230" y2="80" stroke="#ef4444" strokeWidth="2" />
                              <circle cx="230" cy="140" r="6" fill="#ef4444" fillOpacity="0.8" />
                              <circle cx="230" cy="230" r="6" fill="#ef4444" fillOpacity="0.8" />
                              <line x1="230" y1="180" x2="230" y2="230" stroke="#ef4444" strokeWidth="2" />
                            </g>
                          )}

                          <text x="35" y="270" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">SLAB A (RUN 1)</text>
                          <text x="365" y="270" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">SLAB A (RUN 2 - SHIFTED)</text>
                          <text x="180" y="15" fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="bold">OFFSET SEAM</text>
                        </g>
                      )}
                    </svg>
                  </motion.div>
                </AnimatePresence>

                {/* HUD Badge Overlay */}
                <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-amber-500/40 text-[10px] font-mono text-amber-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>NOTICEABLE VEIN OFFSET AT 45° MITER</span>
                </div>
              </div>

              {/* Spec Breakdown */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl space-y-1">
                  <span className="text-[10px] text-neutral-400 uppercase block">SLAB ALLOWANCE IMPACT</span>
                  <span className="text-emerald-400 font-bold block">Standard Yield (0% Extra)</span>
                  <span className="text-[9px] text-neutral-500">Maximum square footage utilization</span>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl space-y-1">
                  <span className="text-[10px] text-neutral-400 uppercase block">BS MASONRY GRADE</span>
                  <span className="text-amber-400 font-bold block">Grade 2 Commercial Finish</span>
                  <span className="text-[9px] text-neutral-500">Suitable for muted/uniform stone patterns</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleApply("directional")}
                className={`w-full py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  appliedOrientation === "directional"
                    ? "bg-amber-500 text-black shadow-lg"
                    : "bg-neutral-800 hover:bg-neutral-700 text-white shadow-md border border-neutral-700"
                }`}
              >
                {appliedOrientation === "directional" ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Applied Standard Directional Orientation</span>
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4 text-amber-400" />
                    <span>Select Directional Orientation (Standard Yield)</span>
                  </>
                )}
              </button>

            </motion.div>
          )}
        </AnimatePresence>
      </div>      </div>

      {/* Advisory Insight Footer */}
      <div className="p-4 bg-black border border-neutral-800 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
          <p className="text-neutral-300 leading-relaxed">
            <strong className="text-white font-sans">SMC Fabrication Recommendation:</strong> For highly veined porcelain and quartzites like <strong className="text-[#D4AF37]">{activeMaterial.name}</strong>, bookmatching across mitered waterfall aprons eliminates visible grain cuts and maximizes property re-sale valuation.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-neutral-400">CNC TOOLING TOLERANCE:</span>
          <span className="text-[#D4AF37] font-bold">±0.1mm Waterjet Kerf</span>
        </div>
      </div>

    </div>
  );
}
