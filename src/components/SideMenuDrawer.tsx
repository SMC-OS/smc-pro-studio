import React from "react";

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 2.159.684 4.158 1.848 5.794L2.5 21.5l3.826-1.326C7.904 21.285 9.88 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.85 0-3.571-.519-5.038-1.423l-.361-.223-2.26.783.796-2.225-.245-.374A7.95 7.95 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
  </svg>
);
import {
  X,
  Home,
  Sparkles,
  Layers,
  Calculator,
  Briefcase,
  User,
  UserPlus,
  Calendar,
  Camera,
  Columns,
  DollarSign,
  Flame,
  Award,
  Gift,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShieldCheck,
  MessageSquare,
  ShoppingBag,
  Database,
  BookOpen,
  Rocket,
  Compass,
  Globe,
  Boxes,
  Eye,
  CheckCircle2
} from "lucide-react";

interface SideMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onNavigate: (tab: any) => void;
  onOpenCompareModal: () => void;
  onOpenFinanceModal: () => void;
  onOpenAppointmentModal: () => void;
  onOpenReferralsModal: () => void;
  onOpenWhatsAppModal?: () => void;
  onOpenLegalDocsModal?: () => void;
  onOpenSignUpModal?: () => void;
  userRole?: "manager" | "client";
  onToggleRole?: (role: "manager" | "client") => void;
  selectedLanguage?: string;
  onSelectLanguage?: (lang: string) => void;
  userEmail: string;
  onLogout: () => void;
}

export default function SideMenuDrawer({
  isOpen,
  onClose,
  activeTab,
  onNavigate,
  onOpenCompareModal,
  onOpenFinanceModal,
  onOpenAppointmentModal,
  onOpenReferralsModal,
  onOpenWhatsAppModal,
  onOpenLegalDocsModal,
  onOpenSignUpModal,
  userRole = "client",
  onToggleRole,
  selectedLanguage = "en",
  onSelectLanguage,
  userEmail,
  onLogout
}: SideMenuDrawerProps) {
  if (!isOpen) return null;

  const handleItemClick = (tabName: string) => {
    onNavigate(tabName);
    onClose();
  };

  const languages = [
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "ar", name: "العربية", flag: "🇦🇪" },
    { code: "it", name: "Italiano", flag: "🇮🇹" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
    { code: "es", name: "Español", flag: "🇪🇸" }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-sm bg-[#111111] text-white h-full shadow-2xl flex flex-col justify-between z-10 border-r border-neutral-800 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-800/80 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-gold/10 border border-gold/40 flex items-center justify-center p-1 overflow-hidden">
              <img
                alt="SMC PRO Logo"
                className="w-full h-full object-contain filter brightness-0 invert"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBXNV_RiofajRHjAoUdeRL9DEe2QkYbM7Tc0A4TQGbDMcjFQw7Q5zg9KIK2ijao316cxP_79D-6J5NzIHqGSsKu4We4TrVBU9wXJ-Oki7eDSGHaKKrZC6H9bitIoGlyNOMKRzOMOxJ7P98OaPN4DFpS7I8k6ifbcEAbyIrTMtqR8d6Yfx7XBkh3itiTP9iEqSYh_FMLknw4CwMtdIRxcCZr-5-A3zhzsZvV5yGDXPOTs9J_FTIffTZ0lCxFXwpnnkh4xJeo_osw6k"
              />
            </div>
            <div>
              <h2 className="font-serif text-base tracking-wider font-semibold text-white">SMC PRO STUDIO</h2>
              <span className="text-[9px] font-mono tracking-widest text-gold uppercase block">Simo Marble & Construction</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800/60 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 custom-scrollbar">
          
          {/* 🌟 PROMINENT SIGN UP / REGISTER CTA BUTTON */}
          <div className="bg-gradient-to-r from-amber-500/20 via-neutral-900 to-amber-500/20 border border-amber-500/50 rounded-2xl p-3.5 shadow-lg space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                  New Client Account
                </span>
              </div>
              <span className="text-[9px] font-mono text-neutral-400">100% Free</span>
            </div>
            
            <p className="text-[11px] text-neutral-300 font-sans leading-tight">
              Sign up now to save custom 3D kitchen models &amp; track slab cutting live.
            </p>

            <button
              onClick={() => {
                if (onOpenSignUpModal) onOpenSignUpModal();
                onClose();
              }}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 rounded-xl font-mono text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <UserPlus className="w-4 h-4 text-neutral-950" />
              <span>Create Account / Sign In</span>
            </button>
          </div>

          {/* 🏡 CLEARLY DELINEATED CLIENT-SPECIFIC VIEW / HOMEOWNER PORTAL */}
          <div className="bg-neutral-900/90 border border-gold/40 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gold/20 border border-gold/40 flex items-center justify-center">
                  <Eye className="w-3.5 h-3.5 text-gold" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Client View</span>
                  <span className="text-[9px] font-mono text-neutral-400 block">Homeowner Project Portal</span>
                </div>
              </div>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                userRole === "client" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-neutral-800 text-neutral-400"
              }`}>
                {userRole === "client" ? "ACTIVE VIEW" : "INACTIVE"}
              </span>
            </div>

            <p className="text-[10px] text-neutral-300 leading-snug">
              Access 3D visualizers, live templating status, PDF invoices, and digital material samples.
            </p>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={() => {
                  if (onToggleRole) onToggleRole("client");
                  handleItemClick("dashboard");
                }}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                  userRole === "client"
                    ? "bg-gold text-neutral-950 border-gold shadow-sm"
                    : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
                }`}
              >
                <User className="w-3 h-3" />
                <span>Switch Client View</span>
              </button>

              <button
                onClick={() => {
                  if (onToggleRole) onToggleRole("manager");
                  handleItemClick("dashboard");
                }}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                  userRole === "manager"
                    ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-sm"
                    : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
                }`}
              >
                <Boxes className="w-3 h-3" />
                <span>Manager Mode</span>
              </button>
            </div>
          </div>

          {/* 🌐 MULTI-LANGUAGE SELECTION BAR */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-gold" />
                <span className="text-[10px] font-mono text-neutral-300 font-bold uppercase tracking-wider">
                  Select Language / اللغة
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    if (onSelectLanguage) onSelectLanguage(lang.code);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    selectedLanguage === lang.code
                      ? "bg-gold/20 text-gold border-gold font-bold"
                      : "bg-neutral-950/60 hover:bg-neutral-800 text-neutral-300 border-neutral-800"
                  }`}
                >
                  <span className="text-xs">{lang.flag}</span>
                  <span className="text-[10px] truncate">{lang.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* User Badge */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center p-1 overflow-hidden">
                <img
                  alt="SMC PRO Logo"
                  className="w-full h-full object-contain filter brightness-0 invert"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBXNV_RiofajRHjAoUdeRL9DEe2QkYbM7Tc0A4TQGbDMcjFQw7Q5zg9KIK2ijao316cxP_79D-6J5NzIHqGSsKu4We4TrVBU9wXJ-Oki7eDSGHaKKrZC6H9bitIoGlyNOMKRzOMOxJ7P98OaPN4DFpS7I8k6ifbcEAbyIrTMtqR8d6Yfx7XBkh3itiTP9iEqSYh_FMLknw4CwMtdIRxcCZr-5-A3zhzsZvV5yGDXPOTs9J_FTIffTZ0lCxFXwpnnkh4xJeo_osw6k"
                />
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-semibold text-neutral-200 block truncate max-w-[160px]">{userEmail}</span>
                <span className="text-[9px] font-mono text-gold flex items-center gap-1 font-bold">
                  <ShieldCheck className="w-3 h-3 text-gold" /> VIP Trade Partner
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Badges */}
          <div className="space-y-2">
            {onOpenWhatsAppModal && (
              <button
                onClick={() => {
                  onOpenWhatsAppModal();
                  onClose();
                }}
                className="w-full bg-gradient-to-r from-emerald-950/80 to-neutral-900 hover:from-emerald-900/90 hover:to-neutral-800 border border-emerald-500/40 hover:border-emerald-400 p-2.5 rounded-lg text-left transition-all flex items-center justify-between group cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> WhatsApp
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                  24/7 LIVE
                </span>
              </button>
            )}

            <button
              onClick={() => {
                onOpenAppointmentModal();
                onClose();
              }}
              className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-gold/50 p-2.5 rounded-lg text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2 text-gold text-xs font-bold font-mono">
                <Calendar className="w-3.5 h-3.5" /> Book Survey &amp; Laser Templating
              </div>
              <span className="text-[10px] text-neutral-400 block font-mono">Book Slot</span>
            </button>
          </div>

          {/* Main Navigation Items */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 font-bold px-2 block mb-2">
              CORE WORKFLOWS
            </span>

            <button
              onClick={() => handleItemClick("dashboard")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Home className="w-4 h-4" />
                <span>Home Dashboard</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => handleItemClick("digital-curator")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "digital-curator" || activeTab === "curator"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Compass className="w-4 h-4 text-gold" />
                <span>The Digital Curator</span>
              </div>
              <span className="text-[9px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-mono font-bold">VAULT</span>
            </button>

            <button
              onClick={() => handleItemClick("design-studio")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "design-studio" || activeTab === "ai-support"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-gold" />
                <span>AI Design Studio</span>
              </div>
              <span className="text-[9px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-mono font-bold">AI</span>
            </button>

            <button
              onClick={() => handleItemClick("estimator")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "estimator"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Calculator className="w-4 h-4" />
                <span>Instant Quote</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => handleItemClick("projects")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "projects"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Briefcase className="w-4 h-4" />
                <span>My Projects & Tracker</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => handleItemClick("project-command")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "project-command"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-gold" />
                <span>Project Command Center</span>
              </div>
              <span className="text-[9px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-mono font-bold">SMC PRO</span>
            </button>

            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 font-bold px-2 block mb-2 pt-2">
              COMMERCIAL SUITE
            </span>

            <button
              onClick={() => handleItemClick("crm")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "crm"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Briefcase className="w-4 h-4 text-gold" />
                <span>CRM &amp; Lead Pipeline</span>
              </div>
              <span className="text-[9px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-mono font-bold">CRM</span>
            </button>

            <button
              onClick={() => handleItemClick("analytics")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "analytics"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Commercial Analytics</span>
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold font-mono">ROI</span>
            </button>

            <button
              onClick={() => handleItemClick("staff")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "staff"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-amber-400" />
                <span>Staff &amp; Site Crew</span>
              </div>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">CSCS</span>
            </button>

            <button
              onClick={() => handleItemClick("calendar")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "calendar"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>Multi-Site Calendar</span>
              </div>
              <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-mono font-bold">DISPATCH</span>
            </button>

            <button
              onClick={() => handleItemClick("inbox")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "inbox"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Unified Customer Inbox</span>
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">OMNI</span>
            </button>

            <button
              onClick={() => handleItemClick("provenance-blockchain")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "provenance-blockchain" || activeTab === "blockchain" || activeTab === "provenance"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-gold" />
                <span>Geological Provenance &amp; Ledger</span>
              </div>
              <span className="text-[9px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-mono font-bold">L2 PROOF</span>
            </button>

            <button
              onClick={() => handleItemClick("walkthrough")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "walkthrough" || activeTab === "exhibition"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-gold" />
                <span>Architectural 3D Walkthrough</span>
              </div>
              <span className="text-[9px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-mono font-bold">SHOWROOM</span>
            </button>

            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 font-bold px-2 block mb-2 pt-3">
              INTERNAL DEV &amp; STAFF CONSOLE
            </span>

            <button
              onClick={() => handleItemClick("publishing-command")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "publishing-command"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white opacity-80"
              }`}
            >
              <div className="flex items-center gap-3">
                <Rocket className="w-4 h-4 text-gold" />
                <span>Publishing Command Center</span>
              </div>
              <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono font-bold">STAFF ONLY</span>
            </button>

            <button
              onClick={() => handleItemClick("beta-deployment")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "beta-deployment"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white opacity-80"
              }`}
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>CNC Telemetry &amp; Beta Hub</span>
              </div>
              <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono font-bold">STAFF ONLY</span>
            </button>

            <button
              onClick={() => handleItemClick("account")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "account"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <User className="w-4 h-4" />
                <span>Account & Profile</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>

          {/* Legal, Privacy & Payment Gateway Section */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] font-bold px-2 block mb-2">
              GOVERNANCE & PAYMENTS
            </span>

            <button
              onClick={() => handleItemClick("stripe-payment")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "stripe-payment" || activeTab === "stripe"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Stripe Payment Gateway</span>
              </div>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">PAYMENTS PENDING</span>
            </button>

            <button
              onClick={() => handleItemClick("data-compliance")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "data-compliance" || activeTab === "compliance"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-gold" />
                <span>Data Compliance & DSAR Hub</span>
              </div>
              <span className="text-[9px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-mono font-bold">GDPR</span>
            </button>

            <button
              onClick={() => handleItemClick("privacy-policy")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "privacy-policy" || activeTab === "privacy"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-gold" />
                <span>Privacy Policy Directive</span>
              </div>
              <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono">v4.2</span>
            </button>

            <button
              onClick={() => handleItemClick("terms-of-service")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "terms-of-service" || activeTab === "terms"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-gold" />
                <span>Terms of Use & Contract</span>
              </div>
              <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono">UK LAW</span>
            </button>

            {onOpenLegalDocsModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLegalDocsModal();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium text-neutral-300 hover:bg-neutral-900 hover:text-white transition-all border border-[#D4AF37]/30 bg-[#D4AF37]/5"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                  <span>Accept Terms Modal</span>
                </div>
                <span className="text-[9px] bg-[#D4AF37] text-black px-1.5 py-0.5 rounded font-mono font-bold">MODAL</span>
              </button>
            )}
          </div>

          {/* Secondary Features & Tools */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 font-bold px-2 block mb-2">
              CATALOGUE & INTERACTIVE TOOLS
            </span>

            <button
              onClick={() => handleItemClick("measure-tool")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "measure-tool"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Camera className="w-4 h-4 text-gold animate-pulse" />
                <span>SMC Measure Tool (AR)</span>
              </div>
              <span className="text-[9px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-mono font-bold">AR HUD</span>
            </button>

            <button
              onClick={() => handleItemClick("site-readiness")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "site-readiness"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-gold" />
                <span>Site Readiness Protocol</span>
              </div>
              <span className="text-[9px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-mono font-bold">v4.2</span>
            </button>

            <button
              onClick={() => handleItemClick("technical-library")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "technical-library" || activeTab === "library"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-gold" />
                <span>Technical Library & Specs</span>
              </div>
              <span className="text-[9px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-mono font-bold">2024 SPEC</span>
            </button>

            <button
              onClick={() => handleItemClick("joint-details")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "joint-details"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-gold" />
                <span>Joint Details (Invisible Seam)</span>
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">CAD &lt;0.5mm</span>
            </button>

            <button
              onClick={() => handleItemClick("substrate-specs")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "substrate-specs" || activeTab === "substrates"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-gold" />
                <span>Substrate Specs (A-104)</span>
              </div>
              <span className="text-[9px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-mono font-bold">MATRIX</span>
            </button>

            <button
              onClick={() => handleItemClick("edge-profiles")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "edge-profiles"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-gold" />
                <span>Edge Profiles & Specs</span>
              </div>
              <span className="text-[9px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-mono font-bold">CAD DWG</span>
            </button>

            <button
              onClick={() => handleItemClick("catalog")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "catalog"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4" />
                <span>Materials Catalogue</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">Quartz / Marble</span>
            </button>

            <button
              onClick={() => handleItemClick("artisan-shop")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "artisan-shop"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4 text-gold" />
                <span>Artisan Atelier & Shop</span>
              </div>
              <span className="text-[9px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-mono font-bold">SHOP</span>
            </button>

            <button
              onClick={() => handleItemClick("slab-reserve")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "slab-reserve"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-gold" />
                <span>Bulk Slab Reserve</span>
              </div>
              <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold">VAULT</span>
            </button>

            <button
              onClick={() => {
                onOpenCompareModal();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium text-neutral-300 hover:bg-neutral-900 hover:text-white transition-all"
            >
              <div className="flex items-center gap-3">
                <Columns className="w-4 h-4 text-gold" />
                <span>Compare Stones & Specs</span>
              </div>
              <span className="text-[9px] bg-neutral-800 text-gold px-1.5 py-0.5 rounded font-mono">Side-by-Side</span>
            </button>

            <button
              onClick={() => handleItemClick("inspiration")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "inspiration"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4" />
                <span>Inspiration & Lookbook</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => handleItemClick("referral-command")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "referral-command"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Referral Command Center</span>
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">£250 Bonus</span>
            </button>

            <button
              onClick={() => handleItemClick("vault")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "vault"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Gift className="w-4 h-4 text-gold animate-bounce" />
                <span>Daily Treasure Vault</span>
              </div>
              <span className="text-[9px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-mono font-bold">DAILY</span>
            </button>

            <button
              onClick={() => handleItemClick("quiz")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "quiz"
                  ? "bg-gold text-[#111111] font-bold"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Renovation Quiz</span>
              </div>
              <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold">+350 PTS</span>
            </button>
          </div>

          {/* Live Support / Concierge */}
          <div className="pt-2">
            <button
              onClick={() => handleItemClick("ai-support")}
              className="w-full bg-gradient-to-r from-neutral-900 to-neutral-800 border border-gold/30 hover:border-gold p-3 rounded-xl flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-gold animate-pulse" />
                <div className="text-left">
                  <span className="text-xs font-bold text-white block">SMC Concierge Chat</span>
                  <span className="text-[10px] text-neutral-400 block">Ask Simo Stone Mason Experts</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gold" />
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800/80 bg-black/60 flex items-center justify-between">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-xs text-neutral-400 hover:text-red-400 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
          <span className="text-[10px] font-mono text-neutral-600">v2.4 PRO</span>
        </div>

      </div>
    </div>
  );
}
