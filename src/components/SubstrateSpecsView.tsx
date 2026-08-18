import React, { useState } from "react";
import {
  ArrowLeft,
  Settings2,
  CheckCircle2,
  Layers,
  Search,
  Download,
  Calendar,
  Layers3,
  Activity,
  HardHat,
  ShieldCheck,
  Check,
  X,
  FileCheck,
  Sparkles,
  Info,
  Clock,
  Thermometer,
  Droplets,
  Building2,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Wrench,
  AlertTriangle
} from "lucide-react";

interface SubstrateSpecsViewProps {
  onBack?: () => void;
  onNavigateTab?: (tab: string) => void;
  onBookAppointment?: () => void;
}

export default function SubstrateSpecsView({
  onBack,
  onNavigateTab,
  onBookAppointment
}: SubstrateSpecsViewProps) {
  const [activeLayer, setActiveLayer] = useState<string | null>("marble");
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState({
    temp: 22.4,
    humidity: 45,
    dewPoint: 10.2,
    substrateRh: 72
  });
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState(false);

  // Site survey form state
  const [surveyAddress, setSurveyAddress] = useState("");
  const [surveyDate, setSurveyDate] = useState("2026-08-01");
  const [surveySubstrateType, setSurveySubstrateType] = useState("Cast Concrete");
  const [surveyNotes, setSurveyNotes] = useState("");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleRefreshTelemetry = () => {
    setIsRefreshingTelemetry(true);
    setTimeout(() => {
      setTelemetry({
        temp: +(21.5 + Math.random() * 2).toFixed(1),
        humidity: Math.floor(42 + Math.random() * 6),
        dewPoint: +(9.8 + Math.random() * 1).toFixed(1),
        substrateRh: Math.floor(70 + Math.random() * 4)
      });
      setIsRefreshingTelemetry(false);
      triggerToast("Site Survey Telemetry updated from wireless BLE sensors.");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-[#e2e2e2] font-sans pb-28 selection:bg-[#D4AF37] selection:text-[#000000]">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[300] bg-[#1A1A1A] border border-[#D4AF37]/60 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in backdrop-blur-md">
          <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-mono font-bold text-[#D4AF37]">SUBSTRATE TELEMETRY</p>
            <p className="text-xs text-neutral-300 font-medium">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="w-full top-0 sticky z-50 bg-[#000000] border-b border-[#353535] flex items-center justify-between px-4 md:px-12 h-16 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (onBack ? onBack() : onNavigateTab && onNavigateTab("technical-library"))}
            className="p-2 rounded-lg text-[#D4AF37] hover:bg-neutral-900 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 font-mono text-xs"
            title="Back to Technical Library"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          
          <div className="h-6 w-px bg-[#353535]" />

          <div className="flex items-center gap-2">
            <img
              alt="SMC PRO Logo"
              className="h-8 object-contain brightness-110"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBXNV_RiofajRHjAoUdeRL9DEe2QkYbM7Tc0A4TQGbDMcjFQw7Q5zg9KIK2ijao316cxP_79D-6J5NzIHqGSsKu4We4TrVBU9wXJ-Oki7eDSGHaKKrZC6H9bitIoGlyNOMKRzOMOxJ7P98OaPN4DFpS7I8k6ifbcEAbyIrTMtqR8d6Yfx7XBkh3itiTP9iEqSYh_FMLknw4CwMtdIRxcCZr-5-A3zhzsZvV5yGDXPOTs9J_FTIffTZ0lCxFXwpnnkh4xJeo_osw6k"
            />
            <h1 className="font-serif text-lg md:text-xl font-bold text-white tracking-tight ml-2">
              Substrate Specs
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-block text-[10px] font-mono text-[#D4AF37] border border-[#D4AF37]/30 px-2.5 py-1 rounded bg-black">
            ASSEMBLY: A-104
          </span>
          <button
            onClick={() => triggerToast("Downloading Substrate CAD Vector Pack (A-104 DWG & PDF)...")}
            className="p-2 text-[#D4AF37] hover:bg-neutral-900 rounded-lg transition-all cursor-pointer"
            title="Download Substrate Spec CAD Pack"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto space-y-12 pt-6">
        
        {/* Hero Section: CAD Cross-Section Diagram */}
        <section className="px-4 md:px-12 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-2 border-b border-[#353535] pb-3">
            <div>
              <span className="font-mono text-xs text-[#D4AF37] font-bold uppercase tracking-widest block">
                Assembly Detail A-104
              </span>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-white">
                Luxury Floor Substrate Assembly
              </h2>
            </div>
            <div className="text-left sm:text-right font-mono text-[11px] text-neutral-400">
              <span className="block text-white">Coord: 51.5074° N, 0.1278° W</span>
              <span className="block text-[#D4AF37]">Scale: 1:10 @ A3</span>
            </div>
          </div>

          {/* CAD Interactive Diagram Canvas */}
          <div className="relative w-full rounded-2xl bg-[#090909] border border-[#353535] overflow-hidden p-6 md:p-10 shadow-2xl">
            
            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#D4AF37]/5 to-transparent h-20 w-full animate-pulse pointer-events-none" />

            <div className="flex flex-col lg:flex-row gap-8 items-center">
              
              {/* Diagram Graphic Layer Stack */}
              <div className="w-full lg:w-3/4 space-y-2 relative">
                
                {/* Layer 1: 20mm Marble */}
                <div
                  onClick={() => setActiveLayer("marble")}
                  className={`p-4 border-2 rounded-xl transition-all cursor-pointer relative overflow-hidden ${
                    activeLayer === "marble"
                      ? "border-[#D4AF37] bg-[#D4AF37]/15 shadow-lg shadow-[#D4AF37]/10"
                      : "border-[#D4AF37]/40 bg-white/5 hover:border-[#D4AF37]"
                  }`}
                >
                  <div className="flex justify-between items-center relative z-10">
                    <span className="font-serif text-sm font-bold text-white">1. 20mm Natural Marble / Quartzite Slab</span>
                    <span className="font-mono text-xs font-bold text-[#D4AF37]">Tol: ±1.5mm Planarity</span>
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-neutral-400">
                    High-density natural stone layer. Surface prep require zero deflection & dry lay indexing.
                  </div>
                </div>

                {/* Layer 2: Adhesive Bed */}
                <div
                  onClick={() => setActiveLayer("adhesive")}
                  className={`p-3 border rounded-xl transition-all cursor-pointer relative ${
                    activeLayer === "adhesive"
                      ? "border-[#D4AF37] bg-[#D4AF37]/20 font-bold"
                      : "border-[#4c4546] bg-[#2a2a2a]/40 hover:border-[#D4AF37]"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-neutral-200">2. S1 Flexible Polymer Adhesive Bed (4mm-6mm Notch)</span>
                    <span className="font-mono text-[10px] text-neutral-400">Class C2FTE S1</span>
                  </div>
                </div>

                {/* Layer 3: Decoupling Membrane */}
                <div
                  onClick={() => setActiveLayer("membrane")}
                  className={`p-2.5 border rounded-xl transition-all cursor-pointer ${
                    activeLayer === "membrane"
                      ? "border-[#D4AF37] bg-[#D4AF37] text-black font-bold shadow-md"
                      : "border-[#D4AF37]/60 bg-[#D4AF37]/80 text-black hover:bg-[#D4AF37]"
                  }`}
                >
                  <div className="flex justify-between items-center font-mono text-xs">
                    <span className="font-bold">3. Uncoupling / Anti-Fracture Membrane</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider">Shear Stress Relief</span>
                  </div>
                </div>

                {/* Layer 4: Concrete Base Layer */}
                <div
                  onClick={() => setActiveLayer("concrete")}
                  className={`p-6 border rounded-xl transition-all cursor-pointer relative overflow-hidden ${
                    activeLayer === "concrete"
                      ? "border-[#D4AF37] bg-[#1f1f1f] shadow-lg"
                      : "border-[#353535] bg-[#131313] hover:border-neutral-500"
                  }`}
                >
                  <div
                    className="absolute inset-0 opacity-15 bg-cover bg-center pointer-events-none"
                    style={{
                      backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAoI-uB5BC1LwEJnlQJKUjwTmRvU2ndVrNUFNVmP9mGz0uQ5xe80_DGyvi5sJiB8yXENm9w9THqze2WPC-pCEv9qX8OC4Y8MQW0ewt5M-nOwxAd0NIvW35JzphHrzCxtgv6za6BcG9Unrk4u2DYDpFMVdgc3KzgsRyNziEVWMEylJcnDENJ1atCaChoMbyc0Z7ffqE9vA_heL3oZCT8d6geHBKH_tI7FCFLp2jXCX1vcySG2LO1hOIhcwTKG4wmjsOEZh-z2-NiwKM')`
                    }}
                  />
                  <div className="relative z-10 space-y-1">
                    <span className="font-serif text-sm font-bold text-white block">
                      4. Structural Concrete Slab or Screed (Min 150mm)
                    </span>
                    <span className="font-mono text-xs text-neutral-400 block">
                      Compressive strength &gt; 30 N/mm² | Moisture content &lt; 2.0% CM
                    </span>
                  </div>
                </div>

              </div>

              {/* Sidebar Callout Details Box */}
              <div className="w-full lg:w-1/4 bg-[#1a1a1a] border border-[#D4AF37]/40 p-5 rounded-xl space-y-4 shadow-xl">
                <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
                  <Info className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-wider">
                    Layer Inspector
                  </span>
                </div>

                {activeLayer === "marble" && (
                  <div className="space-y-3 font-mono text-xs">
                    <h4 className="font-bold text-white text-sm">Natural Marble / Quartzite</h4>
                    <p className="text-neutral-400 leading-relaxed">
                      20mm thick slabs require L/720 deflection limit to prevent hairline cracking along natural veining.
                    </p>
                    <div className="p-2 bg-black rounded border border-neutral-800 text-[#D4AF37] font-bold">
                      Max Weight: ~54 kg/m²
                    </div>
                  </div>
                )}

                {activeLayer === "adhesive" && (
                  <div className="space-y-3 font-mono text-xs">
                    <h4 className="font-bold text-white text-sm">C2FTE S1 Flexible Adhesive</h4>
                    <p className="text-neutral-400 leading-relaxed">
                      100% solid bed coverage achieved using 10mm x 10mm square notched trowel back-buttering technique.
                    </p>
                    <div className="p-2 bg-black rounded border border-neutral-800 text-[#D4AF37] font-bold">
                      Pot Life: 45 Minutes @ 20°C
                    </div>
                  </div>
                )}

                {activeLayer === "membrane" && (
                  <div className="space-y-3 font-mono text-xs">
                    <h4 className="font-bold text-white text-sm">Uncoupling Membrane</h4>
                    <p className="text-neutral-400 leading-relaxed">
                      Neutralizes differential movement between rigid stone floor and expanding subfloor substrate.
                    </p>
                    <div className="p-2 bg-black rounded border border-neutral-800 text-[#D4AF37] font-bold">
                      Movement Absorption: ±3.5mm
                    </div>
                  </div>
                )}

                {activeLayer === "concrete" && (
                  <div className="space-y-3 font-mono text-xs">
                    <h4 className="font-bold text-white text-sm">Structural Concrete Substrate</h4>
                    <p className="text-neutral-400 leading-relaxed">
                      Must cure for minimum 28 days prior to tiling. Surface scabbling required to remove laitance.
                    </p>
                    <div className="p-2 bg-black rounded border border-neutral-800 text-[#D4AF37] font-bold">
                      Substrate RH: &lt; 75%
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        </section>

        {/* Structural Requirements Matrix */}
        <section className="px-4 md:px-12">
          <div className="bg-[#1a1a1a] border border-[#353535] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-[#353535] bg-black/60 flex justify-between items-center">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#D4AF37]" />
                Structural Requirements Matrix
              </h3>
              <span className="text-[10px] font-mono text-neutral-400">BS 5385 / ASTM C119 COMPLIANT</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="bg-black border-b border-[#353535] text-[#D4AF37]">
                    <th className="p-4 uppercase">Substrate Type</th>
                    <th className="p-4 uppercase">Max Deflection</th>
                    <th className="p-4 uppercase">Recommended Prep</th>
                    <th className="p-4 uppercase">Cure Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#353535] text-neutral-300">
                  <tr className="hover:bg-neutral-900 transition-colors">
                    <td className="p-4 text-white font-bold">Suspended Timber Joists</td>
                    <td className="p-4 text-[#D4AF37] font-bold">L/720</td>
                    <td className="p-4">Lateral noggings + 18mm WBP Marine Plywood or Cement Board</td>
                    <td className="p-4 text-neutral-500">N/A (Dry Subfloor)</td>
                  </tr>
                  <tr className="hover:bg-neutral-900 transition-colors">
                    <td className="p-4 text-white font-bold">Sand / Cement Screed</td>
                    <td className="p-4 text-[#D4AF37] font-bold">L/360</td>
                    <td className="p-4">Anti-fracture decoupling mat (full coverage) + Acrylic Primer</td>
                    <td className="p-4 text-neutral-400">21 Days Minimum</td>
                  </tr>
                  <tr className="hover:bg-neutral-900 transition-colors">
                    <td className="p-4 text-white font-bold">Cast Reinforced Concrete</td>
                    <td className="p-4 text-[#D4AF37] font-bold">L/360</td>
                    <td className="p-4">Mechanical shot-blasting / scabbling + Primer G coating</td>
                    <td className="p-4 text-neutral-400">6 Weeks Minimum</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Wall Reinforcement Guide */}
        <section className="px-4 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-2xl font-bold text-white mb-2">Wall Reinforcement Guide</h3>
              <p className="text-neutral-400 text-xs md:text-sm leading-relaxed">
                Vertical stone cladding requires precise calculation of load-bearing capacity. For stone slabs exceeding 40kg/m², mechanical fixings are mandatory as per SMC technical protocol.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-5 bg-[#1a1a1a] border border-[#353535] hover:border-[#D4AF37] rounded-xl flex items-start gap-4 transition-all">
                <div className="p-3 bg-black rounded-lg text-[#D4AF37] border border-[#D4AF37]/30 shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif text-base font-bold text-white mb-1">Mechanical Fixing Anchors</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Stainless steel 'Z' brackets or kerf-cut anchors. Mandatory for external facades and vertical installations above 3 meters in height.
                  </p>
                </div>
              </div>

              <div className="p-5 bg-[#1a1a1a] border border-[#353535] hover:border-[#D4AF37] rounded-xl flex items-start gap-4 transition-all">
                <div className="p-3 bg-black rounded-lg text-[#D4AF37] border border-[#D4AF37]/30 shrink-0">
                  <Layers3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif text-base font-bold text-white mb-1">High-Polymer Adhesive Bonding</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Class C2FTE high-polymer adhesive. Only applicable for calibrated stone on rendered solid masonry or 12mm cement-backer boards.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Visual Image Box */}
          <div className="relative group bg-[#1a1a1a] border border-[#353535] rounded-2xl overflow-hidden min-h-[380px] flex flex-col justify-between shadow-2xl">
            <div
              className="h-72 w-full bg-cover bg-center group-hover:scale-105 transition-transform duration-700"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDf1MF0dT3sFaMjHFY81PS0SqXbYHt_FgrP396Z2NFBIqcoLTXFKYG4MR_Egk13QwnjySLS6BDcOepuIoYbAn6gtTWAIVY8VV3oDfRw5rpN9PF7qShx52W8FMPWfS-0Uq1X4T7H_aaki_XUu0R8lUF16RqLZaTrf3fsp8HMyJXygpWAF3egPVUt3BfzUZvhmCqlYzS7KRd51biGHDo6rAlXQEwYxNW14FM8zfmXm3gP1f12r6LVh9G8sxSH3LdPMnwz7WMins9gFbg')`
              }}
            />
            <div className="p-5 bg-black border-t border-[#353535] flex justify-between items-center font-mono">
              <span className="text-xs font-bold text-[#D4AF37]">Ref: SMC-W-22 Anchor Detail</span>
              <span className="px-2.5 py-1 bg-[#D4AF37] text-black font-bold text-[10px] rounded uppercase">
                SMC CERTIFIED
              </span>
            </div>
          </div>

        </section>

        {/* Site Survey Telemetry Banner */}
        <section className="px-4 md:px-12">
          <div className="bg-[#1a1a1a] border-l-4 border-[#D4AF37] border-y border-r border-[#353535] p-6 md:p-8 rounded-r-2xl space-y-6 shadow-xl relative">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-[#D4AF37] animate-pulse" />
                <div>
                  <h3 className="font-serif text-xl font-bold text-white">Site Survey Telemetry</h3>
                  <p className="text-xs font-mono text-neutral-400">Real-time environmental sensing for adhesive curing window.</p>
                </div>
              </div>

              <button
                onClick={handleRefreshTelemetry}
                className="self-start sm:self-auto bg-black hover:bg-neutral-900 border border-[#D4AF37]/40 text-[#D4AF37] px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingTelemetry ? "animate-spin text-white" : ""}`} />
                <span>Sync Sensors</span>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 font-mono">
              <div className="p-4 bg-black rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 uppercase block mb-1">Ambient Temp</span>
                <span className="text-2xl font-bold text-[#D4AF37]">{telemetry.temp}°C</span>
              </div>

              <div className="p-4 bg-black rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 uppercase block mb-1">Rel. Humidity</span>
                <span className="text-2xl font-bold text-[#D4AF37]">{telemetry.humidity}%</span>
              </div>

              <div className="p-4 bg-black rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 uppercase block mb-1">Dew Point</span>
                <span className="text-2xl font-bold text-white">{telemetry.dewPoint}°C</span>
              </div>

              <div className="p-4 bg-black rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 uppercase block mb-1">Substrate RH</span>
                <span className="text-2xl font-bold text-white">{telemetry.substrateRh}%</span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex items-center gap-2 text-xs font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Optimal conditions for C2FTE adhesive curing detected (No moisture condensation risk).</span>
            </div>
          </div>
        </section>

        {/* SMC Master Standard CTA Section */}
        <section className="px-4 md:px-12">
          <div className="bg-black border-2 border-[#D4AF37] p-8 md:p-12 rounded-2xl relative overflow-hidden shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl text-center lg:text-left">
              <span className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-widest block">
                GUARANTEED STRUCTURAL WARRANTY
              </span>
              <h3 className="font-serif text-3xl md:text-4xl font-bold text-[#D4AF37]">
                SMC Master Standard Certification
              </h3>
              <p className="text-xs md:text-sm text-neutral-300 leading-relaxed font-sans">
                All substrates MUST be verified by a certified SMC technician prior to stone installation to maintain the 15-year structural warranty against debonding and cracking.
              </p>

              <div className="flex flex-wrap gap-3 justify-center lg:justify-start font-mono text-[11px] text-neutral-400">
                <span className="px-3 py-1.5 border border-neutral-800 rounded bg-neutral-950 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#D4AF37]" /> Moisture Content &lt; 2.0%
                </span>
                <span className="px-3 py-1.5 border border-neutral-800 rounded bg-neutral-950 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#D4AF37]" /> Tensile Pull Strength &gt; 1.5 N/mm²
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowSurveyModal(true)}
              className="bg-[#D4AF37] hover:bg-white text-black px-8 py-4 rounded-xl font-mono text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
            >
              Book Technician Site-Survey
            </button>
          </div>
        </section>

      </main>

      {/* MODAL: BOOK TECHNICIAN SITE-SURVEY */}
      {showSurveyModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[250] animate-fade-in text-neutral-200">
          <div className="bg-[#1a1a1a] border border-[#D4AF37]/50 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase tracking-widest block">
                  TECHNICAL COMPLIANCE
                </span>
                <h3 className="font-serif text-2xl font-bold text-white">Book Substrate Technician</h3>
              </div>
              <button
                onClick={() => setShowSurveyModal(false)}
                className="p-1.5 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowSurveyModal(false);
                triggerToast(`Technician survey requested for ${surveyAddress || "Site Location"}. Confirmation code: #SMC-SRV-802.`);
              }}
              className="space-y-4 font-mono text-xs"
            >
              <div className="space-y-1">
                <label className="text-neutral-400 block">Site Address / Project Name</label>
                <input
                  type="text"
                  required
                  value={surveyAddress}
                  onChange={(e) => setSurveyAddress(e.target.value)}
                  placeholder="e.g. 14 Kensington Park Gardens, London W11"
                  className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-400 block">Preferred Survey Date</label>
                  <input
                    type="date"
                    required
                    value={surveyDate}
                    onChange={(e) => setSurveyDate(e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-400 block">Substrate Type</label>
                  <select
                    value={surveySubstrateType}
                    onChange={(e) => setSurveySubstrateType(e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Cast Concrete">Cast Concrete Slab</option>
                    <option value="Sand/Cement Screed">Sand / Cement Screed</option>
                    <option value="Suspended Timber">Suspended Timber Joists</option>
                    <option value="Underfloor Heating">Underfloor Heating System</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400 block">Notes / Specific Access Constraints</label>
                <textarea
                  rows={3}
                  value={surveyNotes}
                  onChange={(e) => setSurveyNotes(e.target.value)}
                  placeholder="e.g. UFH hydro pressure test complete, moisture CM meter needed..."
                  className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="w-full bg-[#D4AF37] hover:bg-white text-black font-bold py-3.5 rounded-xl transition-all cursor-pointer uppercase tracking-wider shadow-lg"
                >
                  Confirm Technician Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
