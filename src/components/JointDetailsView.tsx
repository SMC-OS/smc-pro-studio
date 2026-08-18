import React, { useState } from "react";
import {
  ArrowLeft,
  Settings2,
  CheckCircle2,
  Layers,
  LayoutGrid,
  Download,
  ArrowRight,
  Camera,
  MessageSquare,
  Activity,
  FileText,
  ShieldCheck,
  Check,
  X,
  Upload,
  Info,
  Sparkles,
  RefreshCw,
  ExternalLink
} from "lucide-react";

interface JointDetailsViewProps {
  onBack?: () => void;
  onOpenConsultant?: () => void;
  onNavigateTab?: (tab: string) => void;
}

interface JointCatalogItem {
  code: string;
  title: string;
  description: string;
  tolerance: string;
  application: string;
  detailTitle: string;
  iconType: "butt" | "expansion" | "transition";
}

const JOINT_ITEMS: JointCatalogItem[] = [
  {
    code: "ST-01",
    title: "Butt Joint (Standard)",
    description: "Designed for vertical cladding where aesthetic continuity is paramount. Utilizes book-matched vein patterns.",
    tolerance: "0.5mm - 1mm",
    application: "Vertical Cladding & Waterfalls",
    detailTitle: "Detail: Book-Matched Grain Transition",
    iconType: "butt"
  },
  {
    code: "ST-EX",
    title: "Expansion Joint",
    description: "Essential for large-format floor installations & heated subfloors. Integrated with high-elasticity flexible sealants.",
    tolerance: "3mm - 5mm",
    application: "High-Traffic Flooring & Decks",
    detailTitle: "Callout: FLEXIBLE POLYMER BUFFER",
    iconType: "expansion"
  },
  {
    code: "MT-09",
    title: "Material Transition",
    description: "Technical interface details for stone-to-timber or stone-to-metal transitions using thermal expansion buffers.",
    tolerance: "1.5mm - 2.5mm",
    application: "Hybrid Flooring & Cabinet Junctions",
    detailTitle: "THERMAL BUFFER ZONE",
    iconType: "transition"
  }
];

export default function JointDetailsView({
  onBack,
  onOpenConsultant,
  onNavigateTab
}: JointDetailsViewProps) {
  const [activeCatalogFilter, setActiveCatalogFilter] = useState<string>("All");
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showConsultantModal, setShowConsultantModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<"scanning" | "verified">("verified");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTimeout(() => {
          setUploadedPhoto(reader.result as string);
          setIsUploading(false);
          triggerToast("Joint verification photo uploaded. Analysis score: 99.4% compliant.");
        }, 1000);
      };
      reader.readAsDataURL(file);
    }
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
            <p className="text-xs font-mono font-bold text-[#D4AF37]">SYSTEM NOTIFICATION</p>
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
              Joint Details
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-block text-[10px] font-mono text-[#D4AF37] border border-[#D4AF37]/30 px-2 py-1 rounded bg-black">
            SPEC ID: SMC-JNT-2024
          </span>
          <button
            onClick={() => triggerToast("Calibration parameters updated: CAD cross-section tolerance set to ±0.28mm.")}
            className="p-2 text-[#D4AF37] hover:bg-neutral-900 rounded-lg transition-all cursor-pointer"
            title="Configure Specifications"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto space-y-12 pt-6">
        
        {/* Hero Section: Invisible Seam Technology */}
        <section className="px-4 md:px-12 pt-4 pb-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Left Narrative */}
            <div className="lg:w-1/3 space-y-4">
              <span className="text-xs font-mono text-[#D4AF37] font-bold uppercase tracking-widest block">
                PRECISION ENGINEERING
              </span>
              <h2 className="font-serif text-3xl md:text-5xl font-bold text-white leading-tight">
                Invisible Seam Technology
              </h2>
              <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
                Achieving seamless aesthetic continuity through microscopic tolerance management and structural adhesive integration.
              </p>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#D4AF37]/40 rounded-lg shadow-md">
                <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
                <span className="font-mono text-xs font-bold text-[#D4AF37] uppercase tracking-widest">
                  Tolerance &lt; 0.5mm
                </span>
              </div>
            </div>

            {/* Right Interactive CAD Banner */}
            <div className="lg:w-2/3 w-full relative h-[380px] md:h-[420px] overflow-hidden rounded-2xl border border-[#353535] group shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-transparent z-10" />
              <img
                className="w-full h-full object-cover grayscale brightness-75 group-hover:scale-105 transition-transform duration-700"
                alt="Technical CAD architectural drawing of the Invisible Seam"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcTSEeGtSaZbQJ3_1AxskmJYx8nhmg_PFElsSOjKcpTH2bZgFFdfFT1jqB3b0_Tqyqo8w04G75vjqkafLT9sVPUsL2Z34dJCslkXL-a1q2A3ztwadtWYHQ13gnA9M9ejKikVwxuzOZ3uHRwXjs1T_TA5S3Vb1f6lo5Lhn6nnpqtmaFMnfjHwHNmtrbtWRljxWBoa4N5vggK6W1e1Tpjag7AadsxHpvYcRzP97f-jY-LlbKBPVjIZpi4qa5VF4kfyrhvpO8L2b_eIA"
              />
              
              {/* Overlay HUD stats */}
              <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-ping" />
                  <span className="font-mono text-xs text-white font-bold uppercase tracking-widest">
                    Active Cross-Section Analysis
                  </span>
                </div>
                <div className="flex items-center gap-3 opacity-90">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  <span className="font-mono text-[11px] text-neutral-300 uppercase tracking-widest">
                    Forensic Scan: 0.28mm Deviation
                  </span>
                </div>
                <div className="flex items-center gap-3 opacity-90">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-mono text-[11px] text-emerald-400 font-bold uppercase tracking-widest">
                    Structural Integrity: 99.8%
                  </span>
                </div>
              </div>

              {/* Action overlay top right */}
              <div className="absolute top-4 right-4 z-20">
                <button
                  onClick={() => {
                    setScanStatus("scanning");
                    setTimeout(() => {
                      setScanStatus("verified");
                      triggerToast("Laser scan re-calibrated. Joint deviation: 0.22mm (Optimal)");
                    }, 1200);
                  }}
                  className="bg-black/80 hover:bg-black text-[#D4AF37] border border-[#D4AF37]/50 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${scanStatus === "scanning" ? "animate-spin text-white" : ""}`} />
                  <span>{scanStatus === "scanning" ? "Rescanning..." : "Recalibrate"}</span>
                </button>
              </div>

            </div>

          </div>
        </section>

        {/* Joint Catalog Section */}
        <section className="px-4 md:px-12">
          <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#353535] pb-4">
            <div>
              <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
                <Layers className="w-6 h-6 text-[#D4AF37]" />
                Joint Catalog
              </h3>
              <p className="text-xs font-mono text-neutral-400 mt-0.5">
                Standardized SMC architectural specifications for marble, quartz, & sintered slabs.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#D4AF37] bg-neutral-900 border border-[#D4AF37]/30 px-3 py-1 rounded-full w-fit">
              3 CONFIGURATIONS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {JOINT_ITEMS.map((item) => (
              <div
                key={item.code}
                className="group bg-[#1A1A1A] p-6 md:p-8 border border-[#353535] hover:border-[#D4AF37] rounded-xl transition-all duration-300 relative flex flex-col justify-between shadow-xl"
              >
                <div>
                  <div className="mb-6 flex justify-between items-start">
                    <div className="w-12 h-12 rounded-xl bg-black border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-xs font-bold text-[#D4AF37] bg-black px-2.5 py-1 rounded border border-[#D4AF37]/30">
                      CODE: {item.code}
                    </span>
                  </div>

                  <h4 className="font-serif text-xl font-bold text-white mb-2 group-hover:text-[#D4AF37] transition-colors">
                    {item.title}
                  </h4>

                  <p className="text-neutral-400 text-xs leading-relaxed mb-6">
                    {item.description}
                  </p>

                  {/* Micro Visual Schema Box */}
                  <div className="mb-6 p-4 border border-[#D4AF37]/20 bg-black/60 rounded-xl flex flex-col items-center space-y-2">
                    {item.iconType === "butt" && (
                      <div className="w-full h-12 flex gap-1 mb-1">
                        <div className="w-1/2 h-full border-r border-[#D4AF37]/50 bg-neutral-900 relative overflow-hidden">
                          <div
                            className="absolute inset-0 opacity-20"
                            style={{
                              background:
                                "repeating-linear-gradient(45deg, transparent, transparent 10px, #D4AF37 10px, #D4AF37 11px)"
                            }}
                          />
                        </div>
                        <div className="w-1/2 h-full border-l border-[#D4AF37]/50 bg-neutral-900 relative overflow-hidden">
                          <div
                            className="absolute inset-0 opacity-20"
                            style={{
                              background:
                                "repeating-linear-gradient(-45deg, transparent, transparent 10px, #D4AF37 10px, #D4AF37 11px)"
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {item.iconType === "expansion" && (
                      <div className="w-full flex items-center justify-center gap-3 py-3 border-y border-[#D4AF37]/20 my-1">
                        <div className="w-4 h-4 border border-[#D4AF37] flex items-center justify-center">
                          <div className="w-2 h-2 bg-[#D4AF37] animate-pulse" />
                        </div>
                        <span className="font-mono text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider">
                          ELASTOMERIC POLYMER
                        </span>
                      </div>
                    )}

                    {item.iconType === "transition" && (
                      <div className="w-full space-y-1">
                        <div className="flex justify-between text-[9px] font-mono text-neutral-400">
                          <span>STONE</span>
                          <span>TIMBER / STEEL</span>
                        </div>
                        <div className="h-4 w-full flex rounded overflow-hidden">
                          <div className="w-[45%] bg-neutral-800" />
                          <div className="w-[10%] bg-[#D4AF37]/40 border-x border-[#D4AF37]" />
                          <div className="w-[45%] bg-neutral-700" />
                        </div>
                      </div>
                    )}

                    <span className="font-mono text-[10px] text-[#D4AF37] uppercase tracking-widest font-bold">
                      {item.detailTitle}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-[#353535]">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 font-mono">Tolerance</span>
                    <span className="text-white font-mono font-bold">{item.tolerance}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 font-mono">Application</span>
                    <span className="text-white font-mono font-bold">{item.application}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Engineering Matrix Section */}
        <section className="px-4 md:px-12">
          <div className="bg-[#1A1A1A] border border-[#353535] rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 md:px-8 py-5 border-b border-[#353535] bg-black/60 flex justify-between items-center">
              <div>
                <h3 className="font-serif text-xl font-bold text-white">Engineering Matrix</h3>
                <p className="text-xs font-mono text-neutral-400">Mechanical performance ratings by joint configuration.</p>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800 px-2.5 py-1 rounded">
                ISO 9001 TESTED
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-black border-b border-[#353535]">
                    <th className="px-6 py-4 font-mono text-xs text-[#D4AF37] uppercase">Joint Type</th>
                    <th className="px-6 py-4 font-mono text-xs text-[#D4AF37] uppercase">Min/Max Gap</th>
                    <th className="px-6 py-4 font-mono text-xs text-[#D4AF37] uppercase">Adhesive Specification</th>
                    <th className="px-6 py-4 font-mono text-xs text-[#D4AF37] uppercase">Movement %</th>
                    <th className="px-6 py-4 font-mono text-xs text-[#D4AF37] uppercase">Tensile Strength</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#353535] font-mono text-xs">
                  <tr className="hover:bg-neutral-900 transition-colors">
                    <td className="px-6 py-4 text-white font-bold">ST-01 Standard</td>
                    <td className="px-6 py-4 text-neutral-300">0.3mm / 0.8mm</td>
                    <td className="px-6 py-4 text-[#D4AF37] font-bold">SMC-ULTRA Epox-V2</td>
                    <td className="px-6 py-4 text-neutral-400">± 2%</td>
                    <td className="px-6 py-4 text-white font-bold">45 MPa</td>
                  </tr>
                  <tr className="hover:bg-neutral-900 transition-colors">
                    <td className="px-6 py-4 text-white font-bold">ST-EX Expansion</td>
                    <td className="px-6 py-4 text-neutral-300">3.0mm / 5.0mm</td>
                    <td className="px-6 py-4 text-[#D4AF37] font-bold">FlexSil-90 Elite</td>
                    <td className="px-6 py-4 text-neutral-400">± 15%</td>
                    <td className="px-6 py-4 text-white font-bold">22 MPa</td>
                  </tr>
                  <tr className="hover:bg-neutral-900 transition-colors">
                    <td className="px-6 py-4 text-white font-bold">MT-Hybrid</td>
                    <td className="px-6 py-4 text-neutral-300">1.5mm / 2.5mm</td>
                    <td className="px-6 py-4 text-[#D4AF37] font-bold">BondMaster Poly-X</td>
                    <td className="px-6 py-4 text-neutral-400">± 8%</td>
                    <td className="px-6 py-4 text-white font-bold">38 MPa</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Installation Guidelines & Photo Verification Section */}
        <section className="px-4 md:px-12 flex flex-col md:flex-row gap-8">
          
          {/* Left Checklist */}
          <div className="md:w-1/2 space-y-6">
            <h3 className="font-serif text-2xl font-bold text-white">Installation Guidelines</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-5 bg-[#1A1A1A] border-l-2 border-[#D4AF37] rounded-r-xl">
                <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-white font-bold text-sm mb-1">Site Ambient Conditions</h5>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    Ambient temperature must be maintained between 18°C–24°C for 48 hours pre and post-installation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 bg-[#1A1A1A] border-l-2 border-[#353535] rounded-r-xl">
                <CheckCircle2 className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-white font-bold text-sm mb-1">Substrate Planarity</h5>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    Sub-surface planarity must not exceed ±1mm deviation over a 3-meter span.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 bg-[#1A1A1A] border-l-2 border-[#353535] rounded-r-xl">
                <CheckCircle2 className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-white font-bold text-sm mb-1">Adhesive Curing Time</h5>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    Zero foot traffic for first 12 hours. Full structural load capacity reached at 72 hours.
                  </p>
                </div>
              </div>

              {/* Photo Verification Upload */}
              <div className="p-5 bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#D4AF37]" />
                  <h5 className="text-white font-bold text-sm">Photo Verification Sign-Off</h5>
                </div>
                <p className="text-neutral-400 text-xs">
                  Upload high-resolution macro shots of the joint interface for remote engineering sign-off.
                </p>

                {uploadedPhoto ? (
                  <div className="relative rounded-lg overflow-hidden border border-[#D4AF37] h-36">
                    <img src={uploadedPhoto} alt="Uploaded Joint Verification" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-3 text-center">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                          VERIFIED: TIGHT SEAM PASS (0.3mm)
                        </span>
                        <p className="text-[10px] font-mono text-neutral-300">Remote sign-off ticket #SMC-CHK-904</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUploadedPhoto(null)}
                      className="absolute top-2 right-2 p-1 bg-black/80 hover:bg-red-900 text-white rounded-full cursor-pointer"
                      title="Remove Photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-24 border border-dashed border-[#353535] hover:border-[#D4AF37] rounded-lg flex flex-col items-center justify-center bg-black/40 cursor-pointer transition-all">
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    {isUploading ? (
                      <RefreshCw className="w-6 h-6 text-[#D4AF37] animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-[#D4AF37] mb-1" />
                        <span className="text-xs font-mono text-neutral-300 font-bold">
                          Click or Drag Macro Joint Photo
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500">JPG, PNG up to 10MB</span>
                      </>
                    )}
                  </label>
                )}
              </div>

            </div>
          </div>

          {/* Right Engineering Consultant Support Card */}
          <div className="md:w-1/2 bg-[#1A1A1A] border border-[#353535] p-8 rounded-2xl flex flex-col justify-center items-center text-center space-y-4 shadow-xl relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-black border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] mb-2 shadow-inner">
              <MessageSquare className="w-8 h-8" />
            </div>

            <h4 className="font-serif text-2xl font-bold text-white">Technical Support</h4>

            <p className="text-neutral-400 text-xs md:text-sm max-w-sm leading-relaxed">
              Need a custom joint specification for a unique structural requirement? Our engineering team is available for real-time consultation.
            </p>

            <button
              onClick={() => setShowConsultantModal(true)}
              className="w-full py-4 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-mono text-xs font-bold transition-all duration-300 uppercase tracking-widest cursor-pointer rounded-xl active:scale-95 shadow-lg"
            >
              Contact Engineering Consultant
            </button>
          </div>

        </section>

        {/* Primary Action Banner */}
        <section className="px-4 md:px-12">
          <button
            onClick={() => triggerToast("Downloading Technical Drawings PDF (Joint Details Pack 2024)...")}
            className="w-full bg-[#D4AF37] text-black h-16 rounded-xl flex items-center justify-center gap-3 font-mono font-bold text-xs uppercase tracking-[0.2em] transition-all hover:bg-white active:scale-98 group shadow-2xl cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>Download Technical Drawings (.PDF)</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </section>

      </main>

      {/* MODAL: CONTACT ENGINEERING CONSULTANT */}
      {showConsultantModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[250] animate-fade-in text-neutral-200">
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/50 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase tracking-widest block">
                  DIRECT LINE • SMC ENGINEERING
                </span>
                <h3 className="font-serif text-2xl font-bold text-white">Consult Engineering Team</h3>
              </div>
              <button
                onClick={() => setShowConsultantModal(false)}
                className="p-1.5 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowConsultantModal(false);
                triggerToast("Engineering consultation ticket submitted. Response time: < 2 hours.");
              }}
              className="space-y-4 font-mono text-xs"
            >
              <div className="space-y-1">
                <label className="text-neutral-400 block">Project Reference / Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SMC-2024-MAYFAIR-ISLAND"
                  className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400 block">Joint Type / Issue Query</label>
                <select className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-[#D4AF37]">
                  <option value="butt">ST-01 Butt Joint Specification</option>
                  <option value="expansion">ST-EX Expansion Joint & Sealants</option>
                  <option value="transition">MT-09 Material Transition Buffer</option>
                  <option value="custom">Custom Cantilever / Overhang Support</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400 block">Specific Requirements / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Describe stone type, slab thickness, heating cables, or site constraints..."
                  className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="w-full bg-[#D4AF37] hover:bg-white text-black font-bold py-3 rounded-xl transition-all cursor-pointer uppercase tracking-wider"
                >
                  Submit Consultation Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
