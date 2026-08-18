import React, { useState } from "react";
import {
  ArrowLeft,
  Settings,
  Menu,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  ExternalLink,
  MessageSquare,
  Play,
  RotateCcw,
  Sparkles,
  Search,
  Sliders,
  User,
  X,
  FileText,
  Maximize2,
  Cpu,
  Wrench,
  Radio,
  Share2,
  ChevronRight
} from "lucide-react";

interface ProjectCommandViewProps {
  onOpenSideMenu?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export default function ProjectCommandView({
  onOpenSideMenu,
  onNavigateTab
}: ProjectCommandViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "measure" | "cad" | "milestones">("overview");
  const [showLidarModal, setShowLidarModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showAssetPreview, setShowAssetPreview] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Interactive state metrics
  const [syncingLidar, setSyncingLidar] = useState(false);
  const [pointDensity, setPointDensity] = useState(2.8);
  const [techStatus, setTechStatus] = useState("Active Sync");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSyncLidar = () => {
    setSyncingLidar(true);
    setTimeout(() => {
      setSyncingLidar(false);
      setPointDensity(+(2.8 + Math.random() * 0.4).toFixed(2));
      setTechStatus("Live Telemetry Synchronized");
      triggerToast("LiDAR Point Cloud re-scanned. Density updated to " + pointDensity + "M pts/m².");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#e2e2e2] font-sans pb-28 selection:bg-[#D4AF37] selection:text-[#000000]">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[300] bg-[#1A1A1A] border border-[#D4AF37]/60 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in backdrop-blur-md">
          <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-mono font-bold text-[#D4AF37]">COMMAND CENTER TELEMETRY</p>
            <p className="text-xs text-neutral-300 font-medium">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Top App Bar */}
      <header className="w-full top-0 sticky z-50 bg-[#000000] border-b border-[#353535] flex justify-between items-center px-4 md:px-12 py-3.5 shadow-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => (onOpenSideMenu ? onOpenSideMenu() : onNavigateTab && onNavigateTab("technical-library"))}
            className="p-2 text-[#D4AF37] hover:bg-neutral-900 rounded-lg transition-all cursor-pointer"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <img
              alt="SMC PRO Logo"
              className="h-8 w-auto object-contain brightness-110"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBXNV_RiofajRHjAoUdeRL9DEe2QkYbM7Tc0A4TQGbDMcjFQw7Q5zg9KIK2ijao316cxP_79D-6J5NzIHqGSsKu4We4TrVBU9wXJ-Oki7eDSGHaKKrZC6H9bitIoGlyNOMKRzOMOxJ7P98OaPN4DFpS7I8k6ifbcEAbyIrTMtqR8d6Yfx7XBkh3itiTP9iEqSYh_FMLknw4CwMtdIRxcCZr-5-A3zhzsZvV5yGDXPOTs9J_FTIffTZ0lCxFXwpnnkh4xJeo_osw6k"
            />
            <h1 className="font-serif text-lg md:text-xl font-bold text-white tracking-tight hidden md:block">
              <span className="text-[#D4AF37] font-bold">SMC PRO</span>
              <span className="text-neutral-500 font-light mx-2">|</span>
              Project Command Center
            </h1>
            <div className="md:hidden flex flex-col">
              <span className="font-mono text-[9px] text-[#D4AF37] uppercase font-bold">PROJECT</span>
              <span className="font-serif text-xs font-bold text-white">Mayfair Penthouse</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="font-mono text-[10px] text-[#D4AF37] uppercase tracking-wider font-bold">CURRENT PROJECT</span>
            <span className="font-serif text-sm font-bold text-white">MAYFAIR PENTHOUSE #ALPHA-7</span>
          </div>

          <div className="w-10 h-10 rounded-full border border-[#D4AF37] overflow-hidden shadow-md">
            <img
              className="w-full h-full object-cover"
              alt="Marcus L. Project Manager"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5X53E1sMuYzUhGblt8oRwqWuk3BJvhT-esPJToPB7TgAZoRzUbsv1c6QQelRAj2ZoFCVcOTvET5rONYHHFP54m_ME7EEcYIypuDLxwU752HYezeRxARMh5zkG5LIWpK2wHeNpkhr-9j9GEWnxCpCG1edMoh6HwYfLmxpOsPZ_a9q9pyEoykpXbX2pGYcIKDRYa9F03VdEKztd0EDQ1Mlxl6b4ATlpRfQU5F2loIO-HRxyetz2oJqe_lbM94t-zremoniOcL_Dk6Y"
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto space-y-12">
        
        {/* Hero Section */}
        <section className="relative min-h-[480px] flex items-end overflow-hidden border-b border-[#353535]">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-transparent z-10" />
            <img
              className="w-full h-full object-cover grayscale opacity-45 transition-transform duration-700 hover:scale-105"
              alt="Mayfair Penthouse Architectural Interior Render"
              src="https://lh3.googleusercontent.com/aida/AP1WRLscLIpauTAWhZZX3QhpQiR8SWZEObzaUuX4nLLD-Q7YGSurY0urLR6bckoNG3EDfDCwzqxSuXePwbSBszNVt3g_mCKxQZeYXqtMcQIaknPs4tTmYPY2bHX17lg8rj-o63L6C80zEgX6kCH9I5L3k9jaOZ8PPA7mRqte4EKppGuM_MnAf9Sa17x2u2GMh59Gwbtp6Gz3rCARIYL5gp_t2681d3JLh3UXfJwTvwALr_EHij9Oppw4vHeiZSo"
            />
          </div>

          <div className="relative z-20 px-4 md:px-12 pb-12 w-full pt-16">
            <div className="inline-block px-3.5 py-1 bg-[#D4AF37] text-black font-mono text-[10px] font-bold tracking-widest uppercase mb-4 rounded">
              ACTIVE PROJECT COMMAND
            </div>

            <h2 className="font-serif text-4xl md:text-6xl font-bold text-white mb-6">
              Mayfair Penthouse
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-[#D4AF37]" />
                  <span className="font-mono text-xs md:text-sm text-neutral-200">
                    Status: <strong className="text-white">Digital Templating Scheduled</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-[#D4AF37]" />
                  <span className="font-mono text-xs md:text-sm text-neutral-200">
                    Lead Tech: <strong className="text-white">Marcus L. (Master Fabricator)</strong>
                  </span>
                </div>
              </div>

              {/* Fabrication Timeline Card */}
              <div className="md:col-span-2 bg-[#1A1A1A]/80 backdrop-blur-xl p-6 rounded-2xl border-l-4 border-[#D4AF37] border-y border-r border-[#353535] shadow-2xl space-y-4">
                <div className="flex justify-between items-end">
                  <h3 className="font-mono text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                    FABRICATION TIMELINE
                  </h3>
                  <span className="font-mono text-xs font-bold text-white">65% Complete</span>
                </div>

                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-[#D4AF37] w-2/3 rounded-full transition-all duration-500" />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="text-[#D4AF37]">
                    <p className="font-mono text-[9px] uppercase opacity-60">Complete</p>
                    <p className="font-mono text-xs font-bold">Block Selection</p>
                  </div>
                  <div className="text-white border-l border-[#D4AF37]/30 pl-3">
                    <p className="font-mono text-[9px] uppercase text-[#D4AF37] font-bold animate-pulse">Active</p>
                    <p className="font-mono text-xs font-bold">Digital Templating</p>
                  </div>
                  <div className="text-neutral-500 border-l border-neutral-800 pl-3">
                    <p className="font-mono text-[9px] uppercase">Pending</p>
                    <p className="font-mono text-xs font-bold">CNC Precision Cutting</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 pt-3 border-t border-neutral-800 font-mono text-xs">
                  <div>
                    <p className="text-[10px] uppercase text-neutral-400">Pressure</p>
                    <p className="text-[#D4AF37] font-bold">60k PSI Waterjet</p>
                  </div>
                  <div className="border-l border-neutral-800 pl-3">
                    <p className="text-[10px] uppercase text-neutral-400">Path Accuracy</p>
                    <p className="text-[#D4AF37] font-bold">±0.1mm</p>
                  </div>
                  <div className="border-l border-neutral-800 pl-3">
                    <p className="text-[10px] uppercase text-neutral-400">Feed Rate</p>
                    <p className="text-[#D4AF37] font-bold">1200mm/min</p>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* Bento Grid Modules */}
        <section className="px-4 md:px-12 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Module: SMC Measure Integration */}
            <div className="lg:col-span-8 bg-[#1A1A1A]/70 backdrop-blur-md p-6 md:p-8 rounded-2xl border border-[#353535] space-y-6 shadow-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-white mb-1">SMC Measure Integration</h3>
                  <p className="text-xs font-mono text-neutral-400">Real-time telemetry & LiDAR point cloud stream from project site.</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                  <Cpu className="w-6 h-6" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6 flex flex-col justify-between">
                  <div className="p-4 bg-black border-l-2 border-[#D4AF37] rounded-r-xl space-y-1">
                    <p className="font-mono text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider">DIGITAL TWIN STATUS</p>
                    <p className="font-serif text-lg font-bold text-white">{techStatus}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 font-mono">
                    <div className="bg-black border border-neutral-800 p-4 rounded-xl">
                      <p className="text-[10px] text-neutral-400 mb-1">POINT CLOUD DENSITY</p>
                      <p className="text-xl font-bold text-[#D4AF37]">{pointDensity}M pts/m²</p>
                    </div>

                    <div className="bg-black border border-neutral-800 p-4 rounded-xl">
                      <p className="text-[10px] text-neutral-400 mb-1">MEASUREMENT VARIANCE</p>
                      <p className="text-xl font-bold text-[#D4AF37]">±0.05mm</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowLidarModal(true)}
                      className="w-full py-3.5 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-mono text-xs font-bold transition-all uppercase tracking-wider rounded-xl cursor-pointer active:scale-95 shadow-md flex items-center justify-center gap-2"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>View LiDAR Cloud</span>
                    </button>

                    <button
                      onClick={handleSyncLidar}
                      className="p-3.5 bg-black border border-neutral-800 hover:border-[#D4AF37] text-white rounded-xl transition-all cursor-pointer"
                      title="Re-sync LiDAR Telemetry"
                    >
                      <RotateCcw className={`w-4 h-4 ${syncingLidar ? "animate-spin text-[#D4AF37]" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* LiDAR Wireframe Graphic Box */}
                <div className="relative rounded-2xl overflow-hidden aspect-video md:aspect-auto border border-[#353535] group">
                  <img
                    className="w-full h-full object-cover grayscale opacity-80 group-hover:scale-105 transition-transform duration-700"
                    alt="Digital 3D Wireframe Point Cloud Kitchen Space"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7eRWz3fJ_RlJc2o3juNSZ9h59BMl3iX4dqhDXfy6F4hg2BnQ5wMNzB9w5zncw5tB4fLAOO29ezmIWzUerNua0crs-v79dmtJkjFth3Ufq-ylCvomjTslRx29WTAJsERi0KLiQN_N8Pejep3DsDQOUEIOPYk04H2uvbx0mhAG3Ukn_XfD3e4u552P20gl-6EIWhDSx5mtHbzWO11Kb7nyhGGZlKYaBb9UTYnc72MQTIWtxkkN9Xiv0Lsm1AbzVSnt1TuCiNKyJgr8"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex items-end p-4">
                    <span className="font-mono text-xs text-[#D4AF37] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-ping" />
                      <span>LIVE TELEMETRY STREAM ACTIVE</span>
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Column: Technical Shortcuts & Concierge */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Technical Spec Shortcuts */}
              <div className="bg-[#1A1A1A]/70 backdrop-blur-md p-6 rounded-2xl border border-[#353535] space-y-6 shadow-2xl">
                <h3 className="font-mono text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                  TECHNICAL SPEC SHORTCUTS
                </h3>

                <div className="space-y-3">
                  <button
                    onClick={() => onNavigateTab ? onNavigateTab("edge-profiles") : triggerToast("Loading Edge Profiles...")}
                    className="w-full flex items-center justify-between p-4 bg-black border border-neutral-800 hover:border-[#D4AF37] rounded-xl transition-all cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Layers className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-xs font-serif font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                        Signature Mitered Waterfall Edge
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => onNavigateTab ? onNavigateTab("substrate-specs") : triggerToast("Loading Substrate Assembly A-104...")}
                    className="w-full flex items-center justify-between p-4 bg-black border border-neutral-800 hover:border-[#D4AF37] rounded-xl transition-all cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-xs font-serif font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                        Substrate Assembly A-104
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => onNavigateTab ? onNavigateTab("joint-details") : triggerToast("Loading Joint Details...")}
                    className="w-full flex items-center justify-between p-4 bg-black border border-neutral-800 hover:border-[#D4AF37] rounded-xl transition-all cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-xs font-serif font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                        Invisible Seam & Joint Details
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                {/* Fabrication Asset Video Preview */}
                <div className="pt-2">
                  <p className="font-mono text-[10px] text-neutral-400 mb-2 uppercase">FABRICATION ASSET PREVIEW</p>
                  <div
                    onClick={() => setShowAssetPreview(true)}
                    className="h-32 w-full rounded-xl overflow-hidden relative border border-neutral-800 group cursor-pointer"
                  >
                    <img
                      className="w-full h-full object-cover grayscale brightness-50 group-hover:scale-105 transition-transform duration-500"
                      alt="Waterjet CNC Cutting Preview"
                      src="https://lh3.googleusercontent.com/aida/AP1WRLvbF8_S5KSZgJY-CP_PaTuDPKU6njoOoH1CE_f-h-_75YArB1BjjTM7ZowX-rT1aW7AZV04x2j6tHFqD_dU8nlWR_hecZA82gr-n0zA1m0NYQegQ9Dz5Ijso3lvKbRTGqRJ9NO1Y40fbv0mBMIFAW30zQZs89zn5EVj8zpCyl9Y0-jB7FtcdqpVHz_oI8HWLmFYN9XXMCGE-p_kYPS1gZw2x-TbEgX4tDO77Lqsg0TJpMl1b3hgMOL4qHk"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all">
                      <div className="w-12 h-12 rounded-full bg-[#D4AF37] flex items-center justify-center text-black shadow-lg">
                        <Play className="w-5 h-5 ml-0.5 fill-black" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* SMC Elite Support Concierge Card */}
              <div
                onClick={() => setShowChatModal(true)}
                className="bg-[#D4AF37] text-black p-6 rounded-2xl shadow-2xl flex flex-col justify-between cursor-pointer hover:bg-white transition-all group duration-300 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <MessageSquare className="w-8 h-8 text-black" />
                  <span className="font-mono text-[9px] font-bold bg-black text-[#D4AF37] px-2 py-0.5 rounded">
                    ELITE ONLY
                  </span>
                </div>

                <div>
                  <h4 className="font-serif text-2xl font-bold leading-tight">SMC Elite Support</h4>
                  <p className="text-xs font-mono text-neutral-800 mt-1">Direct project line to Master Fabricator Marcus L.</p>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest pt-2">
                  <span>Start Live Consultation</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

            </div>

          </div>
        </section>

      </main>

      {/* MODAL: LIDAR POINT CLOUD VIEWER */}
      {showLidarModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 z-[250] animate-fade-in text-neutral-200">
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/50 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase tracking-widest block">
                  3D TELEMETRY SIMULATOR
                </span>
                <h3 className="font-serif text-2xl font-bold text-white">Mayfair Penthouse • LiDAR Point Cloud</h3>
              </div>
              <button
                onClick={() => setShowLidarModal(false)}
                className="p-1.5 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden border border-[#D4AF37]/40 bg-black">
              <img
                className="w-full h-full object-cover"
                alt="LiDAR Point Cloud Full Resolution"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7eRWz3fJ_RlJc2o3juNSZ9h59BMl3iX4dqhDXfy6F4hg2BnQ5wMNzB9w5zncw5tB4fLAOO29ezmIWzUerNua0crs-v79dmtJkjFth3Ufq-ylCvomjTslRx29WTAJsERi0KLiQN_N8Pejep3DsDQOUEIOPYk04H2uvbx0mhAG3Ukn_XfD3e4u552P20gl-6EIWhDSx5mtHbzWO11Kb7nyhGGZlKYaBb9UTYnc72MQTIWtxkkN9Xiv0Lsm1AbzVSnt1TuCiNKyJgr8"
              />
              <div className="absolute bottom-4 left-4 z-10 bg-black/80 p-3 rounded-lg border border-neutral-800 font-mono text-xs text-[#D4AF37]">
                <p>Coordinates: X: 12.4m | Y: 8.9m | Z: 3.2m</p>
                <p>Resolution: 2,840,000 Points</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 font-mono text-xs">
              <button
                onClick={() => {
                  triggerToast("Point Cloud (.LAS / .PTS) export file generated.");
                  setShowLidarModal(false);
                }}
                className="bg-[#D4AF37] text-black font-bold px-6 py-3 rounded-xl uppercase hover:bg-white transition-all cursor-pointer"
              >
                Export Point Cloud (.LAS)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FABRICATION ASSET PREVIEW */}
      {showAssetPreview && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 z-[250] animate-fade-in text-neutral-200">
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/50 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase tracking-widest block">
                  ASSET RECORDING
                </span>
                <h3 className="font-serif text-2xl font-bold text-white">CNC Waterjet Cutting Pass Video</h3>
              </div>
              <button
                onClick={() => setShowAssetPreview(false)}
                className="p-1.5 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden border border-[#353535] bg-black">
              <img
                className="w-full h-full object-cover"
                alt="Waterjet Cutting Demo Video Frame"
                src="https://lh3.googleusercontent.com/aida/AP1WRLvbF8_S5KSZgJY-CP_PaTuDPKU6njoOoH1CE_f-h-_75YArB1BjjTM7ZowX-rT1aW7AZV04x2j6tHFqD_dU8nlWR_hecZA82gr-n0zA1m0NYQegQ9Dz5Ijso3lvKbRTGqRJ9NO1Y40fbv0mBMIFAW30zQZs89zn5EVj8zpCyl9Y0-jB7FtcdqpVHz_oI8HWLmFYN9XXMCGE-p_kYPS1gZw2x-TbEgX4tDO77Lqsg0TJpMl1b3hgMOL4qHk"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-mono font-bold bg-black/80 border border-[#D4AF37] text-[#D4AF37] px-4 py-2 rounded-lg">
                  PLAYING FABRICATION LOG #SMC-CUT-901
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHAT WITH MASTER FABRICATOR */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[250] animate-fade-in text-neutral-200">
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/50 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-[#D4AF37] overflow-hidden">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5X53E1sMuYzUhGblt8oRwqWuk3BJvhT-esPJToPB7TgAZoRzUbsv1c6QQelRAj2ZoFCVcOTvET5rONYHHFP54m_ME7EEcYIypuDLxwU752HYezeRxARMh5zkG5LIWpK2wHeNpkhr-9j9GEWnxCpCG1edMoh6HwYfLmxpOsPZ_a9q9pyEoykpXbX2pGYcIKDRYa9F03VdEKztd0EDQ1Mlxl6b4ATlpRfQU5F2loIO-HRxyetz2oJqe_lbM94t-zremoniOcL_Dk6Y"
                    alt="Marcus L."
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-white">Marcus L. • Master Fabricator</h3>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online for Mayfair Penthouse
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="p-1.5 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs max-h-60 overflow-y-auto">
              <div className="p-3 bg-black rounded-lg border border-neutral-800 text-neutral-300">
                <span className="text-[#D4AF37] font-bold block mb-1">Marcus L. (09:14 AM):</span>
                "Good morning! Templating team is on site at Mayfair Penthouse. LiDAR scan is complete and aligned to Assembly A-104."
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowChatModal(false);
                triggerToast("Message sent to Marcus L. Direct response expected < 15 mins.");
              }}
              className="space-y-3 font-mono text-xs"
            >
              <textarea
                rows={3}
                required
                placeholder="Type your message or technical question for Marcus..."
                className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-[#D4AF37]"
              />
              <button
                type="submit"
                className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl uppercase hover:bg-white transition-all cursor-pointer"
              >
                Send Direct Message
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
