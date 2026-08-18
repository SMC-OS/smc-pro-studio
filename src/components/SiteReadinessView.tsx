import React, { useState } from "react";
import {
  Check,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  UploadCloud,
  Camera,
  FileCheck,
  MapPin,
  Calendar,
  Thermometer,
  Droplets,
  Layers,
  ShieldCheck,
  X,
  RefreshCw,
  Info,
  Sparkles,
  ChevronDown
} from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  address: string;
}

interface SiteReadinessViewProps {
  onClose?: () => void;
  projects?: ProjectItem[];
  onSaveReportToProject?: (reportText: string) => void;
  onNavigate?: (tab: string) => void;
  onOpenAppointmentModal?: () => void;
}

interface ChecklistItem {
  id: string;
  category: "structural" | "access" | "utilities" | "protection";
  title: string;
  description: string;
  checked: boolean;
  isRequiredForFabrication: boolean;
  statusBadge?: string;
  specDetails?: string;
}

export default function SiteReadinessView({
  onClose,
  projects = [
    { id: "proj-1", name: "Mayfair Penthouse", address: "28 Kensington Palace Gardens, London" },
    { id: "proj-2", name: "Belgravia Mews", address: "14 Eaton Square, London" },
    { id: "proj-3", name: "Knightsbridge Estate", address: "52 Hans Place, London" }
  ],
  onSaveReportToProject,
  onNavigate,
  onOpenAppointmentModal
}: SiteReadinessViewProps) {
  const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id || "proj-1");
  const [targetDate, setTargetDate] = useState("");
  const [alertAcknowledged, setAlertAcknowledged] = useState(false);
  const [showSpecModal, setShowSpecModal] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [ambientTemp, setAmbientTemp] = useState(21);
  const [ambientHumidity, setAmbientHumidity] = useState(45);
  const [substrateType, setSubstrateType] = useState("Steel Reinforced Concrete");
  const [reportSaved, setReportSaved] = useState(false);

  // Initial Checklist Items
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: "check-1",
      category: "structural",
      title: "Floor Leveling (±2mm / 2m)",
      description: "Substrate must be rigid & non-deflecting.",
      checked: false,
      isRequiredForFabrication: true,
      specDetails: "TECHNICAL SPECIFICATION: Floor substrate must achieve a flatness of ±2mm over any 2m span. Maximum allowable deflection L/720 for natural marble and porcelain slabs."
    },
    {
      id: "check-2",
      category: "structural",
      title: "Cabinetry Reinforcement",
      description: "Structural integrity confirmed for 3cm Stone Loads.",
      checked: true,
      isRequiredForFabrication: true,
      statusBadge: "VERIFIED"
    },
    {
      id: "check-3",
      category: "access",
      title: "Path Clearance (Min 1200mm)",
      description: "Critical for slab transport; must be clear from entry to install zone.",
      checked: false,
      isRequiredForFabrication: true
    },
    {
      id: "check-4",
      category: "access",
      title: "Freight Elevator Booking",
      description: "Mandatory for all units above 3rd floor. Logistics confirmed?",
      checked: false,
      isRequiredForFabrication: false
    },
    {
      id: "check-5",
      category: "utilities",
      title: "Plumbing Rough-in Complete",
      description: "Under-mount sink cutouts & trap alignment mapped.",
      checked: true,
      isRequiredForFabrication: true,
      statusBadge: "VERIFIED"
    },
    {
      id: "check-6",
      category: "utilities",
      title: "GPO Electrical Relocation",
      description: "Pop-up power outlets & backsplash socket positioning set.",
      checked: false,
      isRequiredForFabrication: false
    },
    {
      id: "check-7",
      category: "protection",
      title: "Ramboard Floor Coverings",
      description: "Heavy-duty protection over finished hardwood or tile pathways.",
      checked: true,
      isRequiredForFabrication: false,
      statusBadge: "INSTALLED"
    },
    {
      id: "check-8",
      category: "protection",
      title: "Adjacent Surface Masking",
      description: "Low-tack protective films over luxury joinery and wall finishes.",
      checked: false,
      isRequiredForFabrication: false
    }
  ]);

  // Calculations
  const totalItems = checklist.length;
  const completedItems = checklist.filter(i => i.checked).length;
  const completionPercentage = Math.round((completedItems / totalItems) * 100);

  const criticalHolds = checklist.filter(i => i.isRequiredForFabrication && !i.checked).length;

  const toggleCheck = (id: string) => {
    setChecklist(prev =>
      prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const currentProjectObj = projects.find(p => p.id === selectedProject) || projects[0];

  const handleSimulateScan = () => {
    setIsScanning(true);
    setScanComplete(false);
    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
      // Auto check the floor leveling item
      setChecklist(prev =>
        prev.map(item => (item.id === "check-1" ? { ...item, checked: true } : item))
      );
    }, 2500);
  };

  const handleSaveReport = () => {
    const text = `[SITE READINESS REPORT v4.2]: ${completionPercentage}% Readiness Score (${completedItems}/${totalItems} Verified). ${criticalHolds} Critical Holds. Ambient Temp: ${ambientTemp}°C, Humidity: ${ambientHumidity}%. Substrate: ${substrateType}. Generated on ${new Date().toLocaleDateString()}.`;
    if (onSaveReportToProject) {
      onSaveReportToProject(text);
    }
    setReportSaved(true);
    setTimeout(() => setReportSaved(false), 3000);
  };

  // Circular gauge geometry
  const radius = 36;
  const circumference = 2 * Math.PI * radius; // ~226.2
  const strokeDashoffset = circumference - (circumference * completionPercentage) / 100;

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] pb-24 animate-fade-in">
      
      {/* TOP HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 md:px-8 py-4 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center text-gold shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gold block">
              SMC PROTOCOL v4.2
            </span>
            <h1 className="font-serif text-lg md:text-xl font-medium text-neutral-900 leading-none">
              Technical Site Readiness
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Project Selector */}
          <div className="relative hidden sm:block">
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 focus:border-gold rounded-xl pl-3 pr-8 py-2 text-xs font-mono font-bold text-neutral-800 appearance-none cursor-pointer"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-8 space-y-10">
        
        {/* DASHBOARD HEADER & CIRCULAR PROGRESS GAUGE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          <div className="lg:col-span-8 bg-neutral-50 border border-neutral-200 rounded-2xl p-6 md:p-8 space-y-4 flex flex-col justify-between shadow-xs">
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold text-gold uppercase tracking-[0.2em] block">
                SITE PROTOCOL SPECIFICATION v4.2
              </span>
              <h2 className="font-serif text-3xl md:text-4xl text-neutral-900 font-normal leading-tight">
                Site Readiness Protocol
              </h2>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-xl">
                Mandatory substrate, access, and environmental audit for <strong className="text-neutral-800">{currentProjectObj.name}</strong> ({currentProjectObj.address}). Fabrication hold is governed by this score.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-neutral-600 font-mono text-xs uppercase tracking-wider pt-4 border-t border-neutral-200/80">
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${criticalHolds > 0 ? "bg-red-500 animate-ping" : "bg-emerald-500"}`} />
                REF: <strong className="text-neutral-900">#{currentProjectObj.name.replace(/\s+/g, '-').toUpperCase()}-P99</strong>
              </span>
              <span className="flex items-center gap-1.5 text-neutral-500">
                <MapPin className="w-3.5 h-3.5 text-gold" />
                {currentProjectObj.address}
              </span>
              <span className="flex items-center gap-1.5 text-neutral-500">
                <Calendar className="w-3.5 h-3.5 text-gold" />
                TARGET:
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="bg-white border border-neutral-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-neutral-800"
                />
              </span>
            </div>
          </div>

          {/* DASHBOARD GAUGE CARD */}
          <div className="lg:col-span-4 bg-neutral-900 border border-neutral-800 text-white p-6 rounded-2xl flex items-center gap-6 relative overflow-hidden shadow-xl">
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  className="text-neutral-800"
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="6"
                />
                <circle
                  className="text-gold transition-all duration-1000"
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="square"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col text-center">
                <span className="font-serif text-2xl font-bold text-amber-400">
                  {completionPercentage}%
                </span>
                <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">
                  Score
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <p className="font-mono text-[10px] text-gold font-bold uppercase tracking-widest">
                Status Report
              </p>
              <p className="font-serif text-xl font-medium text-white">
                {criticalHolds > 0 ? `${criticalHolds} Critical Holds` : "All Checks Clear"}
              </p>
              <p className="font-mono text-[11px] text-neutral-400 italic">
                {criticalHolds > 0 ? "Fabrication Locked" : "Fabrication Unlocked ✓"}
              </p>
            </div>
          </div>

        </div>

        {/* CRITICAL READINESS ALERT BANNER */}
        {criticalHolds > 0 && (
          <div className="border border-red-200 bg-red-50/80 p-6 rounded-2xl relative overflow-hidden shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>

              <div className="flex-1 space-y-1">
                <h4 className="font-mono text-xs font-bold text-red-700 uppercase tracking-wider">
                  CRITICAL READINESS ALERT
                </h4>
                <p className="text-xs text-neutral-800 leading-relaxed">
                  Substrate floor leveling <strong className="text-red-700">(±2mm tolerance)</strong> and path clearance have not been fully verified. Fabrication hold remains active until forensic photo or laser scan verification is received.
                </p>
              </div>

              <button
                onClick={() => setAlertAcknowledged(true)}
                className={`px-6 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                  alertAcknowledged
                    ? "bg-emerald-600 text-white"
                    : "bg-neutral-900 hover:bg-gold text-white hover:text-neutral-950"
                }`}
              >
                {alertAcknowledged ? "Alert Acknowledged ✓" : "Acknowledge Hold"}
              </button>
            </div>
          </div>
        )}

        {/* CHECKLIST GRID (STRUCTURAL & ACCESS / UTILITIES & PROTECTION) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* CATEGORY 1: STRUCTURAL STABILITY */}
          <section className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-gold" />
                <h3 className="font-serif text-xl font-medium text-neutral-900">1. Structural Stability</h3>
              </div>
              <span className="font-mono text-[10px] text-neutral-500 font-bold uppercase tracking-wider bg-neutral-100 px-2 py-0.5 rounded">
                {checklist.filter(i => i.category === "structural" && i.checked).length} / {checklist.filter(i => i.category === "structural").length} Passed
              </span>
            </div>

            <div className="space-y-3">
              {checklist.filter(i => i.category === "structural").map(item => (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                    item.checked
                      ? "bg-amber-50/40 border-gold/60"
                      : "bg-neutral-50 border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div className="pt-0.5">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      item.checked ? "bg-gold border-gold text-neutral-950 font-bold" : "bg-white border-neutral-300 group-hover:border-gold"
                    }`}>
                      {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-sans text-xs font-bold text-neutral-900 flex items-center gap-2">
                        {item.title}
                        {item.isRequiredForFabrication && (
                          <span className="text-[9px] font-mono text-red-600 bg-red-100/80 px-1.5 py-0.2 rounded font-bold uppercase">
                            Mandatory
                          </span>
                        )}
                      </span>

                      {item.specDetails && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSpecModal(item.specDetails || null);
                          }}
                          className="text-neutral-400 hover:text-gold p-1"
                          title="View Technical Spec"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      )}

                      {item.statusBadge && item.checked && (
                        <span className="bg-gold text-neutral-950 text-[9px] px-2 py-0.5 font-mono font-bold rounded-full">
                          {item.statusBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 font-sans italic">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CATEGORY 2: SITE ACCESS */}
          <section className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold" />
                <h3 className="font-serif text-xl font-medium text-neutral-900">2. Site Access Logistics</h3>
              </div>
              <span className="font-mono text-[10px] text-neutral-500 font-bold uppercase tracking-wider bg-neutral-100 px-2 py-0.5 rounded">
                {checklist.filter(i => i.category === "access" && i.checked).length} / {checklist.filter(i => i.category === "access").length} Passed
              </span>
            </div>

            <div className="space-y-3">
              {checklist.filter(i => i.category === "access").map(item => (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                    item.checked
                      ? "bg-amber-50/40 border-gold/60"
                      : "bg-neutral-50 border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div className="pt-0.5">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      item.checked ? "bg-gold border-gold text-neutral-950 font-bold" : "bg-white border-neutral-300 group-hover:border-gold"
                    }`}>
                      {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-sans text-xs font-bold text-neutral-900 flex items-center gap-2">
                        {item.title}
                        {item.isRequiredForFabrication && (
                          <span className="text-[9px] font-mono text-red-600 bg-red-100/80 px-1.5 py-0.2 rounded font-bold uppercase">
                            Mandatory
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 font-sans italic">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CATEGORY 3: UTILITIES AUDIT */}
          <section className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-gold" />
                <h3 className="font-serif text-xl font-medium text-neutral-900">3. Utilities Audit</h3>
              </div>
              <span className="font-mono text-[10px] text-neutral-500 font-bold uppercase tracking-wider bg-neutral-100 px-2 py-0.5 rounded">
                {checklist.filter(i => i.category === "utilities" && i.checked).length} / {checklist.filter(i => i.category === "utilities").length} Passed
              </span>
            </div>

            <div className="space-y-3">
              {checklist.filter(i => i.category === "utilities").map(item => (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                    item.checked
                      ? "bg-amber-50/40 border-gold/60"
                      : "bg-neutral-50 border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div className="pt-0.5">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      item.checked ? "bg-gold border-gold text-neutral-950 font-bold" : "bg-white border-neutral-300 group-hover:border-gold"
                    }`}>
                      {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-sans text-xs font-bold text-neutral-900 flex items-center gap-2">
                        {item.title}
                      </span>
                      {item.statusBadge && item.checked && (
                        <span className="bg-gold text-neutral-950 text-[9px] px-2 py-0.5 font-mono font-bold rounded-full">
                          {item.statusBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 font-sans italic">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CATEGORY 4: SURFACE PROTECTION */}
          <section className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-gold" />
                <h3 className="font-serif text-xl font-medium text-neutral-900">4. Surface Protection</h3>
              </div>
              <span className="font-mono text-[10px] text-neutral-500 font-bold uppercase tracking-wider bg-neutral-100 px-2 py-0.5 rounded">
                {checklist.filter(i => i.category === "protection" && i.checked).length} / {checklist.filter(i => i.category === "protection").length} Passed
              </span>
            </div>

            <div className="space-y-3">
              {checklist.filter(i => i.category === "protection").map(item => (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                    item.checked
                      ? "bg-amber-50/40 border-gold/60"
                      : "bg-neutral-50 border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div className="pt-0.5">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      item.checked ? "bg-gold border-gold text-neutral-950 font-bold" : "bg-white border-neutral-300 group-hover:border-gold"
                    }`}>
                      {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-sans text-xs font-bold text-neutral-900 flex items-center gap-2">
                        {item.title}
                      </span>
                      {item.statusBadge && item.checked && (
                        <span className="bg-gold text-neutral-950 text-[9px] px-2 py-0.5 font-mono font-bold rounded-full">
                          {item.statusBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 font-sans italic">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* REMOTE FORENSIC VERIFICATION & SITE METRICS ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* REMOTE FORENSIC VERIFICATION */}
          <section className="lg:col-span-8 bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-xs relative">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono font-bold text-gold uppercase tracking-widest block mb-1">
                  RMV-404 VISION SYSTEM
                </span>
                <h3 className="font-serif text-2xl font-medium text-neutral-900">Remote Forensic Verification</h3>
              </div>
              <span className="font-mono text-[9px] text-neutral-500 tracking-[0.2em] border border-neutral-200 px-3 py-1 rounded bg-neutral-50 font-bold">
                REF: RMV-404
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Submit high-fidelity photography or 3D point cloud scans. Images are analyzed via Master Mason vision AI systems for substrate calibration and deflection verification.
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="w-full bg-neutral-900 hover:bg-gold text-white hover:text-neutral-950 px-6 py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <UploadCloud className="w-4 h-4 text-gold" />
                    Upload Site Forensics
                  </button>
                  <p className="text-[10px] text-center font-mono text-neutral-400 mt-2 uppercase tracking-wider">
                    MIN 20MP | RAW, JPG, TIFF, LAS, OBJ
                  </p>
                </div>
              </div>

              {/* Interactive Camera/Scan Viewfinder Card */}
              <div
                onClick={() => setShowUploadModal(true)}
                className="relative aspect-video rounded-xl bg-neutral-900 border border-neutral-800 group cursor-pointer overflow-hidden flex items-center justify-center p-4 shadow-inner"
              >
                <img
                  src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"
                  alt="Site reference"
                  className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-all duration-700 group-hover:scale-105 grayscale"
                />
                
                <div className="relative z-10 flex flex-col items-center gap-2 text-center p-4 bg-black/60 backdrop-blur-xs border border-white/10 rounded-xl w-4/5 text-white">
                  <Camera className="w-6 h-6 text-gold animate-pulse" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white">
                    Live View Finder
                  </span>
                  <span className="text-[9px] text-amber-400 font-mono">
                    {checklist.find(i => i.id === "check-1")?.checked ? "SCAN VERIFIED ✓" : "CLICK TO INITIALIZE SCAN"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* SITE METRICS REPORT */}
          <section className="lg:col-span-4 bg-neutral-50 border border-neutral-200 rounded-2xl p-6 space-y-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <h4 className="font-mono text-xs font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-gold" /> Site Environmental Metrics
                </h4>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-white border border-neutral-200 rounded-xl space-y-1">
                  <span className="font-mono text-[9px] text-neutral-500 uppercase block font-semibold">Ambient Temp</span>
                  <div className="font-serif text-2xl font-bold text-neutral-900 flex items-baseline">
                    {ambientTemp} <span className="text-sm font-sans text-gold ml-0.5">°C</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="35"
                    value={ambientTemp}
                    onChange={e => setAmbientTemp(parseInt(e.target.value))}
                    className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-gold"
                  />
                </div>

                <div className="p-3.5 bg-white border border-neutral-200 rounded-xl space-y-1">
                  <span className="font-mono text-[9px] text-neutral-500 uppercase block font-semibold">Humidity</span>
                  <div className="font-serif text-2xl font-bold text-neutral-900 flex items-baseline">
                    {ambientHumidity} <span className="text-sm font-sans text-gold ml-0.5">%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    value={ambientHumidity}
                    onChange={e => setAmbientHumidity(parseInt(e.target.value))}
                    className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-gold"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="font-mono text-[10px] text-neutral-500 font-bold uppercase block">Substrate Analysis</label>
                <select
                  value={substrateType}
                  onChange={e => setSubstrateType(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-medium text-neutral-800"
                >
                  <option value="Steel Reinforced Concrete">Steel Reinforced Concrete (L/720)</option>
                  <option value="Suspended Marine Plywood">Suspended Marine Plywood (18mm Dual)</option>
                  <option value="Sand/Cement Screed with Membrane">Sand/Cement Screed + Uncoupling</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 flex justify-between items-center text-[10px] font-mono text-neutral-500">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-gold" /> Neural-Net Validation Active
              </span>
              <span className="text-emerald-600 font-bold">OPTIMAL</span>
            </div>
          </section>

        </div>

        {/* PROTOCOL ENFORCEMENT & ACTION BUTTONS */}
        <div className="pt-8 border-t border-neutral-200 space-y-6">
          <div className="bg-neutral-900 text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 max-w-2xl">
              <p className="font-serif italic text-xl md:text-2xl text-amber-300">
                &quot;Precision is the foundation of luxury.&quot;
              </p>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                Ensure all checklist items are verified at least 48 hours prior to the installation window. Verified site readiness reports guarantee SMC 15-year structural stone warranty coverage.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <button
                onClick={handleSaveReport}
                className={`px-6 py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                  reportSaved
                    ? "bg-emerald-500 text-white"
                    : "bg-gold hover:bg-amber-400 text-neutral-950"
                }`}
              >
                <FileCheck className="w-4 h-4" />
                {reportSaved ? "Report Saved to Project! ✓" : "Attach Report to Project"}
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* MODAL 1: SPEC DETAILS TOOLTIP MODAL */}
      {showSpecModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-neutral-200">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2 text-gold">
                <Info className="w-5 h-5" />
                <h4 className="font-serif text-lg font-medium text-neutral-900">Technical Specification</h4>
              </div>
              <button onClick={() => setShowSpecModal(null)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-neutral-700 leading-relaxed font-sans">{showSpecModal}</p>
            <div className="pt-2 text-right">
              <button
                onClick={() => setShowSpecModal(null)}
                className="bg-neutral-900 text-white px-5 py-2 rounded-xl text-xs font-mono font-bold uppercase"
              >
                Close Spec
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD FORENSIC SCANNER MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl border border-neutral-200">
            <div className="flex justify-between items-start border-b border-neutral-200 pb-4">
              <div>
                <span className="text-[10px] font-mono text-gold font-bold tracking-widest uppercase block mb-1">
                  VISION FORENSICS SCANNER
                </span>
                <h3 className="font-serif text-2xl font-medium text-neutral-900">Site Forensics Analysis</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {scanComplete ? (
              <div className="py-6 text-center space-y-4">
                <CheckCircle2 className="w-14 h-14 text-gold mx-auto animate-bounce" />
                <div className="space-y-1">
                  <h4 className="font-serif text-xl font-medium text-neutral-900">Scan Analyzed Successfully!</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto font-sans">
                    Master Mason Vision AI has calibrated your substrate photo. Substrate Leveling <strong className="text-neutral-900">(±1.4mm variance)</strong> confirmed within specification!
                  </p>
                </div>
                <button
                  onClick={() => {
                    setScanComplete(false);
                    setShowUploadModal(false);
                  }}
                  className="bg-neutral-900 text-white px-8 py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Return to Checklist
                </button>
              </div>
            ) : isScanning ? (
              <div className="py-12 text-center space-y-6">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <RefreshCw className="w-12 h-12 text-gold animate-spin" />
                  <Camera className="w-6 h-6 text-neutral-900 absolute" />
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Analyzing Substrate Surface Vectors...
                  </p>
                  <p className="text-[11px] text-neutral-500 font-sans">Calculating surface coplanarity & deflection load limits...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-neutral-300 hover:border-gold rounded-2xl p-8 text-center space-y-3 bg-neutral-50 transition-colors cursor-pointer group">
                  <UploadCloud className="w-12 h-12 text-neutral-400 group-hover:text-gold mx-auto transition-colors" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-neutral-800">
                      Drag & Drop Site Photography or LiDAR Point Clouds
                    </p>
                    <p className="text-[10px] text-neutral-500 font-mono">Supports JPG, PNG, RAW, LAS, OBJ (Max 50MB)</p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-neutral-500 font-mono">
                  <span>Simulate Instant Camera Scan</span>
                  <button
                    onClick={handleSimulateScan}
                    className="bg-gold hover:bg-amber-400 text-neutral-950 px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider shadow-sm cursor-pointer"
                  >
                    Run AI Vision Scan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
