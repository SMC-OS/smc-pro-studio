import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 2.159.684 4.158 1.848 5.794L2.5 21.5l3.826-1.326C7.904 21.285 9.88 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.85 0-3.571-.519-5.038-1.423l-.361-.223-2.26.783.796-2.225-.245-.374A7.95 7.95 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
  </svg>
);
import {
  Calendar,
  MessageSquare,
  FileText,
  CreditCard,
  Camera,
  LifeBuoy,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  Sun,
  Moon,
  Sparkles,
  Share2,
  Star,
  Award,
  TrendingUp,
  Download,
  Maximize2,
  Minimize2,
  ChevronRight,
  Play,
  Pause,
  Repeat,
  Volume2,
  VolumeX,
  Film,
  DollarSign,
  Check,
  ExternalLink,
  Gift,
  ThumbsUp,
  Bot,
  Zap,
  X,
  Upload,
  User,
  HelpCircle,
  Image as ImageIcon,
  Send,
  PenTool,
  Package,
  Plus,
  RefreshCw,
  Truck,
  ArrowUpRight,
  ShieldAlert,
  Boxes,
  Layers,
  Sliders
} from "lucide-react";
import { Project, Material, MATERIALS_CATALOG } from "../App";

interface HomeDashboardProps {
  projects: Project[];
  activeUserEmail?: string;
  onNavigateTab: (tab: string) => void;
  onOpenAppointmentModal: () => void;
  onOpenFinanceModal: () => void;
  onOpenReferralsModal: () => void;
  onOpenPdfModal: (proj: Project) => void;
  onOpenSignoffModal: (proj: Project) => void;
  onOpenAiSupport?: (initialPrompt?: string) => void;
  onOpenWhatsAppModal?: () => void;
  materialsCatalog?: Material[];
  materialsStock?: Record<string, number>;
  onUpdateMaterialStock?: (matId: string, newStock: number) => void;
  userRole?: "manager" | "client";
  onToggleRole?: (role: "manager" | "client") => void;
  isGuest?: boolean;
  userEmail?: string;
  onOpenSignUpModal?: () => void;
}

export default function HomeDashboard({
  projects,
  activeUserEmail = "alexander.wright@kensington.co.uk",
  onNavigateTab,
  onOpenAppointmentModal,
  onOpenFinanceModal,
  onOpenReferralsModal,
  onOpenPdfModal,
  onOpenSignoffModal,
  onOpenAiSupport,
  onOpenWhatsAppModal,
  materialsCatalog,
  materialsStock,
  onUpdateMaterialStock,
  userRole,
  onToggleRole,
  isGuest = false,
  userEmail = "",
  onOpenSignUpModal
}: HomeDashboardProps) {
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [activeLuxuryStone, setActiveLuxuryStone] = useState(0);
  const [productFilter, setProductFilter] = useState<"all" | "slabs" | "porcelain" | "artisan" | "islands">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmergencyBanner, setShowEmergencyBanner] = useState(true);
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isAiFloatingOpen, setIsAiFloatingOpen] = useState(false);
  const [aiQuickInput, setAiQuickInput] = useState("");
  const [internalRole, setInternalRole] = useState<"manager" | "client">(() => {
    try {
      const saved = localStorage.getItem("smc_dashboard_role");
      if (saved === "manager" || saved === "client") return saved;
    } catch {}
    return "client";
  });
  const [stockNotice, setStockNotice] = useState<string | null>(null);
  const [procurementToast, setProcurementToast] = useState<{
    matId: string;
    matName: string;
    stockSqFt: number;
    timestamp: string;
  } | null>(null);

  // Track stock levels ref
  const prevStockRef = useRef<Record<string, number>>({});

  const dashboardRole = userRole || internalRole;

  const handleRoleToggle = (role: "manager" | "client") => {
    setInternalRole(role);
    if (onToggleRole) {
      onToggleRole(role);
    }
    try {
      localStorage.setItem("smc_dashboard_role", role);
    } catch {}
  };

  // Automatically filter materials from MATERIALS_CATALOG where stockSqFt is less than 20
  const lowStockMaterials = useMemo(() => {
    const catalog = materialsCatalog && materialsCatalog.length > 0 ? materialsCatalog : MATERIALS_CATALOG;
    return catalog.filter((m) => {
      const currentStock = materialsStock ? (materialsStock[m.id] ?? 0) : 0;
      return currentStock < 20;
    });
  }, [materialsCatalog, materialsStock]);

  // Keep stock levels tracked without auto-popping alert toast on initial loads
  useEffect(() => {
    const catalog = materialsCatalog && materialsCatalog.length > 0 ? materialsCatalog : MATERIALS_CATALOG;
    catalog.forEach((m) => {
      const currentStock = materialsStock ? (materialsStock[m.id] ?? 0) : 0;
      prevStockRef.current[m.id] = currentStock;
    });
  }, [materialsCatalog, materialsStock]);

  const handleRestockItem = (matId: string, matName: string, addSqFt: number) => {
    const current = materialsStock ? (materialsStock[matId] ?? 0) : 0;
    const newStock = current + addSqFt;
    if (onUpdateMaterialStock) {
      onUpdateMaterialStock(matId, newStock);
    }
    setStockNotice(`Restocked ${matName}: +${addSqFt} sq ft (New Stock: ${newStock} sq ft)`);
    if (procurementToast && procurementToast.matId === matId && newStock >= 20) {
      setProcurementToast(null);
    }
    setTimeout(() => setStockNotice(null), 4000);
  };

  const handleBatchRestock = () => {
    lowStockMaterials.forEach((m) => {
      const current = materialsStock ? (materialsStock[m.id] ?? 0) : 0;
      if (onUpdateMaterialStock) {
        onUpdateMaterialStock(m.id, current + 50);
      }
    });
    setStockNotice(`Batch restocked ${lowStockMaterials.length} low-stock material(s) by +50 sq ft each!`);
    setProcurementToast(null);
    setTimeout(() => setStockNotice(null), 4000);
  };

  const handleSimulateLowStock = () => {
    if (onUpdateMaterialStock) {
      onUpdateMaterialStock("concrete-matte", 15);
      onUpdateMaterialStock("statuario-extra", 12);
      onUpdateMaterialStock("iron-oxidized", 18);
    }
    setProcurementToast({
      matId: "concrete-matte",
      matName: "Concrete Matte Porcelain",
      stockSqFt: 15,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });
    setStockNotice("Simulated low stock levels (< 20 sq ft) triggered procurement alert!");
    setTimeout(() => setStockNotice(null), 4000);
  };

  // Determine current time greeting
  const greetingTime = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  // Primary active project (defaults to first project)
  const primaryProject = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    return (
      projects.find((p) => p.status === "Fabrication" || p.status === "Ready for Install") ||
      projects[0]
    );
  }, [projects]);

  // Compute total balance due across projects
  const { totalBalanceDue, nextDueDate, isFullyPaid } = useMemo(() => {
    if (!projects || projects.length === 0) {
      return { totalBalanceDue: 0, nextDueDate: "N/A", isFullyPaid: true };
    }
    // Calculate total estimated cost minus paid milestone ratio
    let balance = 0;
    projects.forEach((p) => {
      const projVal = p.estimates.reduce((acc, est) => {
        return acc + (est.length * est.width * 2.5) + (est.edgeLength * 12);
      }, 3500);
      if (p.status === "Proposal") balance += projVal * 0.9;
      else if (p.status === "Slab Selected") balance += projVal * 0.5;
      else if (p.status === "Fabrication") balance += projVal * 0.3;
      else if (p.status === "Ready for Install") balance += projVal * 0.1;
      else if (p.status === "Completed") balance += 0;
    });

    return {
      totalBalanceDue: Math.round(balance),
      nextDueDate: "12 August 2026",
      isFullyPaid: balance <= 0
    };
  }, [projects]);

  // Gallery items sample dataset
  const galleryItems = [
    {
      id: "gal-1",
      title: "Initial Laser Site Survey",
      stage: "Before",
      date: "14 June 2026",
      url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: "gal-2",
      title: "Calacatta Gold CNC Bridge Saw Cutting",
      stage: "During",
      date: "28 July 2026",
      url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: "gal-3",
      title: "Mitered Edge Waterfall Island Assembly",
      stage: "During",
      date: "02 August 2026",
      url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: "gal-4",
      title: "Polished Kitchen Worktop Completed",
      stage: "Completed",
      date: "05 August 2026",
      url: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80"
    }
  ];

  /**
   * Phase 5 Gate 0 purge: these previously seeded a fabricated "recent
   * documents" list (invented contract/invoice/warranty-certificate PDF
   * names implying a real signed contract and a real paid deposit exist)
   * and a fabricated notifications timeline (a named mason, a specific
   * fake "Payment Received (£4,250.00)" transaction, and a claim that
   * slabs were reserved in a warehouse). None of it was ever real. Both
   * lists start empty; the cards that render them are unchanged and will
   * show real documents/notifications once a real backend supplies them.
   */
  const recentDocuments: { name: string; type: string; date: string; size: string }[] = [];

  const notifications: { id: string; title: string; desc: string; time: string; icon: typeof PenTool; color: string }[] = [];

  const [isPlayingVideo, setIsPlayingVideo] = useState(true);
  const [isMutedVideo, setIsMutedVideo] = useState(true);
  const [isLoopingVideo, setIsLoopingVideo] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoHasError, setVideoHasError] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const videoPlaylist = [
    {
      id: "v1",
      title: "Marble Fabrication & CNC Milling",
      desc: "Watch 5-axis waterjet precision cutting Calacatta Gold & Nero Marquina slabs in SMC Pro London workshop.",
      url: "https://cdn.coverr.co/videos/coverr-marble-countertop-kitchen-design-5432/1080p.mp4",
      fallbackUrl: "https://assets.mixkit.co/videos/preview/mixkit-modern-kitchen-interior-with-marble-countertop-41580-large.mp4",
      poster: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      tag: "4K CRAFTSMANSHIP"
    },
    {
      id: "v2",
      title: "Kensington Luxury Kitchen Installation",
      desc: "Full waterfall edge assembly and seamless joinery installation by SMC Pro Master Masons.",
      url: "https://assets.mixkit.co/videos/preview/mixkit-modern-kitchen-interior-with-marble-countertop-41580-large.mp4",
      fallbackUrl: "https://cdn.coverr.co/videos/coverr-marble-countertop-kitchen-design-5432/1080p.mp4",
      poster: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80",
      tag: "BESPOKE INTERIOR"
    },
    {
      id: "v3",
      title: "Carrara & Quarried Stone Sourcing",
      desc: "Direct-from-quarry inspection in Tuscany, Italy with certified block grading for UK luxury residences.",
      url: "https://cdn.coverr.co/videos/coverr-marble-countertop-kitchen-design-5432/1080p.mp4",
      fallbackUrl: "https://assets.mixkit.co/videos/preview/mixkit-modern-kitchen-interior-with-marble-countertop-41580-large.mp4",
      poster: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80",
      tag: "QUARRY DIRECT"
    }
  ];

  const currentVideo = videoPlaylist[activeVideoIndex];

  const togglePlayVideo = () => {
    if (videoRef.current) {
      if (isPlayingVideo) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlayingVideo(!isPlayingVideo);
    }
  };

  const toggleMuteVideo = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMutedVideo;
      setIsMutedVideo(!isMutedVideo);
    }
  };

  const toggleLoopVideo = () => {
    if (videoRef.current) {
      videoRef.current.loop = !isLoopingVideo;
      setIsLoopingVideo(!isLoopingVideo);
    }
  };

  const toggleFullscreenVideo = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      } else {
        if (videoRef.current.requestFullscreen) {
          videoRef.current.requestFullscreen().catch(() => {});
        } else if ((videoRef.current as any).webkitRequestFullscreen) {
          (videoRef.current as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      }
    }
  };

  const handleVideoError = () => {
    console.warn("SMC Pro Video Stream: Network error or video file failed to load. Displaying studio fallback poster.");
    setVideoHasError(true);
  };

  const handleAiSendPrompt = (promptText: string) => {
    if (onOpenAiSupport) {
      onOpenAiSupport(promptText);
    } else {
      onNavigateTab("ai-support");
    }
    setIsAiFloatingOpen(false);
  };

  const isDark = themeMode === "dark";

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? "bg-neutral-950 text-neutral-100" : "bg-neutral-50/60 text-neutral-900"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {/* HEADER TOOLBAR: WEATHER & THEME CONTROLS */}
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
              SMC PRO Online • Studio Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark / Light Mode Switcher */}
            <button
              onClick={() => setThemeMode(isDark ? "light" : "dark")}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono ${
                isDark
                  ? "bg-neutral-900 border-neutral-800 text-gold hover:bg-neutral-800"
                  : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100 shadow-xs"
              }`}
              title="Toggle Light / Dark Mode"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
              <span className="hidden sm:inline">{isDark ? "Light" : "Dark"} Mode</span>
            </button>
          </div>
        </div>

        {/* 🎬 OPENING SHORT ANIMATION MP4 VIDEO SHOWCASE */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative rounded-3xl overflow-hidden border border-gold/40 shadow-2xl bg-neutral-950 group"
        >
          {/* Top Video Header Tag */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <span className="px-3 py-1 bg-neutral-900/90 backdrop-blur-md border border-gold/40 text-gold text-[10px] font-mono font-bold rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-md">
              <Film className="w-3 h-3 text-gold animate-pulse" />
              {currentVideo.tag}
            </span>
          </div>

          {/* Top Right Controls (Play/Pause, Mute/Unmute, Auto-Loop & Fullscreen) */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button
              onClick={togglePlayVideo}
              className="p-2.5 rounded-full bg-gold hover:bg-amber-400 text-neutral-950 font-bold transition-all cursor-pointer shadow-md"
              title={isPlayingVideo ? "Pause Video" : "Play Video"}
            >
              {isPlayingVideo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <button
              onClick={toggleMuteVideo}
              className="p-2.5 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-md"
              title={isMutedVideo ? "Unmute Audio" : "Mute Audio"}
            >
              {isMutedVideo ? <VolumeX className="w-4 h-4 text-gold" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={toggleLoopVideo}
              className={`p-2.5 rounded-full border backdrop-blur-md transition-all cursor-pointer shadow-md ${
                isLoopingVideo
                  ? "bg-black/70 text-gold border-gold/50"
                  : "bg-black/70 text-neutral-400 border-white/20 hover:text-white"
              }`}
              title={isLoopingVideo ? "Looping Enabled (Click to Disable)" : "Looping Disabled (Click to Enable)"}
            >
              <Repeat className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreenVideo}
              className="p-2.5 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-md"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Video"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-gold" /> : <Maximize2 className="w-4 h-4 text-white" />}
            </button>
          </div>

          {/* Video Container with Aspect Ratio */}
          <div className="relative aspect-video sm:aspect-[21/9] w-full bg-neutral-950 overflow-hidden flex items-center justify-center">
            {videoHasError ? (
              <div className="relative w-full h-full">
                <img
                  src={currentVideo.poster}
                  alt={currentVideo.title}
                  className="w-full h-full object-cover filter brightness-90 transition-all duration-700"
                />
                <div className="absolute top-4 right-24 z-20 bg-black/80 text-amber-300 border border-amber-400/40 text-[10px] font-mono font-bold px-3 py-1.5 rounded-full backdrop-blur-md shadow-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>STUDIO PREVIEW MODE</span>
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                key={currentVideo.id}
                autoPlay
                loop={isLoopingVideo}
                muted={isMutedVideo}
                playsInline
                poster={currentVideo.poster}
                onError={handleVideoError}
                className="w-full h-full object-cover transition-all duration-700 filter brightness-90 group-hover:brightness-100"
              >
                <source src={currentVideo.url} type="video/mp4" onError={handleVideoError} />
                <source src={currentVideo.fallbackUrl} type="video/mp4" onError={handleVideoError} />
                Your browser does not support HTML5 video playback.
              </video>
            )}

            {/* Gradient Overlays for Elegance */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/60 via-transparent to-neutral-950/60 pointer-events-none" />

            {/* Bottom Title Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 z-20 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1 max-w-xl bg-black/60 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/10 shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gold animate-ping" />
                  <span className="text-[11px] font-mono text-gold uppercase tracking-wider font-bold">
                    SMC PRO • Active Animation Showcase
                  </span>
                </div>
                <h3 className="font-serif text-lg sm:text-2xl font-bold text-white tracking-wide">
                  {currentVideo.title}
                </h3>
              </div>

              {/* Video Playlist Selectors */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 shrink-0">
                {videoPlaylist.map((v, idx) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setActiveVideoIndex(idx);
                      setIsPlayingVideo(true);
                      setVideoHasError(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer whitespace-nowrap border ${
                      activeVideoIndex === idx
                        ? "bg-gold text-neutral-950 font-bold border-amber-400 shadow-md scale-105"
                        : "bg-black/60 hover:bg-neutral-900 text-neutral-300 border-white/10 backdrop-blur-md"
                    }`}
                  >
                    <span>Clip {idx + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* 👋 CLEAN HERO HEADER BANNER */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className={`p-6 sm:p-8 rounded-3xl border relative overflow-hidden shadow-xl transition-all ${
            isDark
              ? "bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-gold/40 text-white"
              : "bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white border-neutral-800"
          }`}
        >
          {/* Subtle Gold Ambient Background Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-gold uppercase tracking-widest bg-gold/15 px-3 py-1 rounded-full border border-gold/40">
                  SMC PRO • London Stone Collection
                </span>
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                Bespoke Marble, Quartz &amp; Architectural Stone Collection
              </h1>

              <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl font-sans leading-relaxed">
                Explore quarried Italian marble slabs, engineered quartz worktops, and handcrafted artisan stone products.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => onNavigateTab("artisan-shop")}
                className="px-5 py-3 bg-gold hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Package className="w-4 h-4" />
                <span>Browse Stone Products</span>
              </button>
              <button
                onClick={() => onNavigateTab("design-studio")}
                className="px-5 py-3 bg-neutral-900 hover:bg-black text-white border border-white/20 font-mono text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <PenTool className="w-4 h-4 text-gold" />
                <span>3D Visualizer</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* 💎 PRIMARY FEATURED PRODUCTS SHOWCASE GRID (PRODUCT-FIRST FOCUS) */}
        <div className="space-y-6 my-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-4 border-neutral-200/80 dark:border-neutral-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-0.5 rounded-full bg-gold/15 border border-gold/40 text-gold font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-gold" /> SMC PRO PRODUCT CATALOG
                </span>
                <span className="text-[10px] font-mono text-neutral-400 uppercase">In-Stock &amp; Ready to Ship</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Featured Products &amp; Quarried Stone
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-xl">
                Discover Italian porcelain slabs, natural Carrara marble, and artisan stonework for high-end interiors.
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 shrink-0">
              {[
                { id: "all", label: "All Products" },
                { id: "slabs", label: "Natural Slabs" },
                { id: "porcelain", label: "Porcelain & Quartz" },
                { id: "artisan", label: "Artisan Crafts" },
                { id: "islands", label: "Waterfall Islands" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setProductFilter(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    productFilter === tab.id
                      ? "bg-gold text-neutral-950 border-amber-400 shadow-md"
                      : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-gold/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                id: "fp-1",
                name: "Calacatta Gold Italian Porcelain",
                category: "porcelain",
                categoryName: "Porcelain & Quartz",
                finish: "Silk Polish",
                thickness: "20mm",
                mohs: "Mohs 7",
                image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
                badge: "Best Seller"
              },
              {
                id: "fp-2",
                name: "Statuario Extra Bookmatched Marble",
                category: "slabs",
                categoryName: "Natural Slabs",
                finish: "Bookmatched",
                thickness: "30mm",
                mohs: "Mohs 4",
                image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
                badge: "Quarried Italy"
              },
              {
                id: "fp-3",
                name: "Nero Marquina Velvet Marble",
                category: "slabs",
                categoryName: "Natural Slabs",
                finish: "Honed Satin",
                thickness: "20mm",
                mohs: "Mohs 4",
                image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80",
                badge: "Deep Black"
              },
              {
                id: "fp-4",
                name: "Taj Mahal Brazilian Quartzite",
                category: "slabs",
                categoryName: "Natural Slabs",
                finish: "Leathered Finish",
                thickness: "30mm",
                mohs: "Mohs 7.5",
                image: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=800&q=80",
                badge: "Scratchproof"
              },
              {
                id: "fp-5",
                name: "Patagonian Crystal Quartzite",
                category: "slabs",
                categoryName: "Natural Slabs",
                finish: "Polished Translucent",
                thickness: "20mm",
                mohs: "Mohs 7",
                image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80",
                badge: "Backlit Ready"
              },
              {
                id: "fp-6",
                name: "Hand-Carved Carrara Marble Sink",
                category: "artisan",
                categoryName: "Artisan Stone Crafts",
                finish: "Honed & Sealed",
                thickness: "Solid Block",
                mohs: "Carved Block",
                image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
                badge: "Limited Edition"
              },
              {
                id: "fp-7",
                name: "Brass Inlaid Marble Coaster Set",
                category: "artisan",
                categoryName: "Artisan Stone Crafts",
                finish: "Polished & Inlaid",
                thickness: "Set of 6",
                mohs: "Calacatta & Nero",
                image: "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=800&q=80",
                badge: "Gift Boxed"
              },
              {
                id: "fp-8",
                name: "Cascading Waterfall Kitchen Island",
                category: "islands",
                categoryName: "Waterfall Islands",
                finish: "Double Miter Apron",
                thickness: "30mm Mitered",
                mohs: "Custom Fit",
                image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
                badge: "Master Mason"
              }
            ]
              .filter((p) => productFilter === "all" || p.category === productFilter)
              .map((prod) => (
                <div
                  key={prod.id}
                  className={`group rounded-2xl border transition-all duration-300 overflow-hidden shadow-md flex flex-col justify-between ${
                    isDark
                      ? "bg-neutral-900 border-neutral-800 hover:border-gold/60 shadow-neutral-950/50"
                      : "bg-white border-neutral-200 hover:border-gold shadow-xs"
                  }`}
                >
                  {/* Image Container with Badges */}
                  <div className="relative aspect-4/3 overflow-hidden bg-neutral-950">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-95 group-hover:brightness-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                    {/* Top Left Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-gold/40 text-gold font-mono text-[10px] font-bold uppercase shadow-md">
                        {prod.badge}
                      </span>
                    </div>

                  </div>

                  {/* Product Details */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-gold uppercase tracking-wider font-bold">
                        {prod.categoryName}
                      </span>
                      <h3 className="font-serif font-bold text-base text-neutral-900 dark:text-neutral-100 leading-snug line-clamp-1 group-hover:text-gold transition-colors">
                        {prod.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500 dark:text-neutral-400 pt-0.5">
                        <span>{prod.finish}</span>
                        <span>•</span>
                        <span>{prod.thickness}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-end gap-2">
                      <button
                        onClick={() => onNavigateTab("artisan-shop")}
                        className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-800 hover:bg-gold hover:text-neutral-950 text-gold border border-gold/30 font-mono text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>View in Shop</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 📦 MANAGER INVENTORY LOW-STOCK RESTOCK SUMMARY PANEL (MANAGER-ONLY PERMISSION BOUNDARY) */}
        {/* ========================================================= */}
        {dashboardRole === "manager" && (
          <section className={`p-6 sm:p-7 rounded-2xl border transition-all shadow-md relative overflow-hidden space-y-6 ${
            isDark
              ? "bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border-amber-500/30 shadow-[0_0_30px_rgba(212,175,55,0.06)]"
              : "bg-gradient-to-br from-white via-amber-50/30 to-white border-amber-400/40 shadow-xs"
          }`}>
            {/* Panel Top Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-neutral-200/80 dark:border-neutral-800">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-gold flex items-center justify-center shrink-0 shadow-xs">
                <Boxes className="w-6 h-6 text-amber-600 dark:text-gold" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-amber-600 dark:text-gold uppercase tracking-widest font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    SMC PRO WAREHOUSE MANAGER
                  </span>
                  {lowStockMaterials.length > 0 ? (
                    <span className="text-[10px] font-mono text-rose-700 dark:text-rose-400 font-bold bg-rose-100 dark:bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-300 dark:border-rose-800 flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      {lowStockMaterials.length} Materials Under 20 sq ft Threshold
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      All Inventory Stocked (≥ 20 sq ft)
                    </span>
                  )}
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  Manager Restock Summary Panel
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-sans">
                  Automatically filters materials from <code className="text-amber-600 dark:text-gold font-mono font-bold bg-amber-500/10 px-1 py-0.5 rounded">MATERIALS_CATALOG</code> where warehouse stock is under <strong>20 sq ft</strong> for immediate identification and restocking.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {lowStockMaterials.length > 0 && (
                <button
                  onClick={handleBatchRestock}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  title="Restock all low-stock items by +50 sq ft"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Batch Restock All (+50 sq ft)</span>
                </button>
              )}
              <button
                onClick={() => onNavigateTab("catalog")}
                className="px-3.5 py-2 bg-neutral-900 dark:bg-neutral-800 hover:bg-black text-amber-400 dark:text-gold border border-amber-500/30 font-mono text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Open Vault Catalog</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Toast Notification Banner */}
          {stockNotice && (
            <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{stockNotice}</span>
              </div>
              <button onClick={() => setStockNotice(null)} className="text-neutral-500 hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* List of Low Stock Materials (< 20 sq ft) */}
          {lowStockMaterials.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lowStockMaterials.map((mat) => {
                  const currentStock = materialsStock ? (materialsStock[mat.id] ?? 0) : 0;
                  const shortage = Math.max(0, 20 - currentStock);
                  const progressPct = Math.min(100, Math.round((currentStock / 20) * 100));
                  const isLowInventory = currentStock < 20;

                  return (
                    <div
                      key={mat.id}
                      className={`p-4 rounded-xl border-2 transition-all space-y-3.5 relative overflow-hidden group ${
                        isLowInventory
                          ? isDark
                            ? "bg-neutral-900/95 border-rose-500/80 hover:border-rose-500 shadow-[0_4px_20px_rgba(225,29,72,0.2)] ring-1 ring-rose-500/40 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-rose-500"
                            : "bg-rose-50/60 border-rose-500/80 hover:border-rose-600 shadow-sm ring-1 ring-rose-500/30 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-rose-500"
                          : isDark
                          ? "bg-neutral-900/90 border-amber-500/30 hover:border-amber-400 shadow-xs"
                          : "bg-white border-amber-300/80 hover:border-amber-500 shadow-xs"
                      }`}
                    >
                      {/* Material Swatch Header */}
                      <div className="flex items-start justify-between gap-3 pl-1">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-lg border shadow-inner shrink-0 relative overflow-hidden ${
                              isLowInventory ? "border-rose-500/60 ring-2 ring-rose-500/20" : "border-amber-500/40"
                            }`}
                            style={{ background: mat.bgStyle || "linear-gradient(135deg, #333 0%, #111 100%)" }}
                          >
                            <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono bg-black/80 text-amber-300 px-1 rounded">
                              {mat.class[0]}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono text-amber-600 dark:text-gold uppercase tracking-wider font-bold block">
                              {mat.class}
                            </span>
                            <h3 className="font-serif font-bold text-sm text-neutral-900 dark:text-neutral-100 leading-tight">
                              {mat.name}
                            </h3>
                            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                              Mohs {mat.mohs} • {mat.thicknesses.join(", ")}
                            </span>
                          </div>
                        </div>

                        {isLowInventory ? (
                          <span className="text-[9px] font-mono font-extrabold bg-rose-500 text-white px-2 py-0.5 rounded-md border border-rose-600 shrink-0 shadow-sm flex items-center gap-1 animate-pulse">
                            <ShieldAlert className="w-3 h-3 text-white" /> LOW STOCK
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
                            OK STOCK
                          </span>
                        )}
                      </div>

                      {/* Stock Level Display & Progress Gauge */}
                      <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 space-y-2">
                        <div className="flex justify-between items-baseline text-xs font-mono">
                          <span className="text-neutral-500 dark:text-neutral-400 text-[10px]">Current Warehouse Stock:</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                            {currentStock} sq ft <span className="text-neutral-400 text-[10px] font-normal">/ 20 sq ft min</span>
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(8, progressPct)}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                          <span>Shortage: <strong className="text-amber-600 dark:text-gold font-bold">-{shortage} sq ft</strong></span>
                          <span className="text-neutral-400">No transit order active</span>
                        </div>
                      </div>

                      {/* Quick Restock Action Buttons */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-mono text-neutral-400 block uppercase font-bold">Quick Restock Actions:</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => handleRestockItem(mat.id, mat.name, 50)}
                            className="py-1.5 px-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-gold border border-amber-500/40 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> +50 Sq Ft
                          </button>
                          <button
                            onClick={() => handleRestockItem(mat.id, mat.name, 100)}
                            className="py-1.5 px-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> +100 Sq Ft
                          </button>
                          <div className="flex items-center justify-between border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-800 px-1">
                            <button
                              onClick={() => {
                                const curr = materialsStock ? (materialsStock[mat.id] ?? 0) : 0;
                                const nextStock = Math.max(0, curr - 5);
                                if (onUpdateMaterialStock) onUpdateMaterialStock(mat.id, nextStock);
                                if (nextStock < 20) {
                                  setProcurementToast({
                                    matId: mat.id,
                                    matName: mat.name,
                                    stockSqFt: nextStock,
                                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                  });
                                }
                              }}
                              className="text-xs font-bold text-neutral-600 dark:text-neutral-300 px-1.5 hover:text-rose-500 cursor-pointer"
                              title="Decrease stock by 5 sq ft"
                            >
                              -
                            </button>
                            <span className="text-[10px] font-mono font-bold text-neutral-900 dark:text-neutral-100">
                              {currentStock}
                            </span>
                            <button
                              onClick={() => handleRestockItem(mat.id, mat.name, 10)}
                              className="text-xs font-bold text-neutral-600 dark:text-neutral-300 px-1.5 hover:text-emerald-500 cursor-pointer"
                              title="Increase stock by 10 sq ft"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Empty State: All items have stock >= 20 sq ft */
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-neutral-900 dark:text-neutral-100">
                  All Materials Adequately Stocked (≥ 20 sq ft)
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                  Every stone slab specification in <code className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">MATERIALS_CATALOG</code> currently meets or exceeds the minimum warehouse inventory threshold of 20 sq ft.
                </p>
              </div>
              <button
                onClick={handleSimulateLowStock}
                className="px-4 py-2 bg-neutral-900 dark:bg-neutral-800 hover:bg-black text-amber-400 dark:text-gold border border-amber-500/30 font-mono text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Simulate Low-Stock Demo (&lt; 20 sq ft)</span>
              </button>
            </div>
          )}
        </section>
        )}

        {/* 🏛️ QINWAN LONDON INSPIRED LUXURY ANIMATED STONE EXHIBITION SHOWCASE */}
        <div className="relative overflow-hidden rounded-3xl bg-neutral-950 border border-gold/40 p-6 md:p-10 shadow-2xl space-y-6 text-white my-4">
          {/* Animated Gold Particles & Lighting Ambient Background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/15 via-neutral-950 to-neutral-950 pointer-events-none" />
          <motion.div 
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.05, 1] 
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" 
          />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10 border-b border-neutral-800/80 pb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-gold/20 border border-gold/40 text-gold font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-gold animate-spin" /> SMC PRO LONDON EXHIBITION
                </span>
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Mayfair &amp; Kensington Showcase</span>
              </div>
              <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">
                Architectural Stone Artistry &amp; Gold-Veined Masterpieces
              </h2>
              <p className="text-xs md:text-sm text-neutral-300 max-w-2xl leading-relaxed">
                Experience London's premier stone fabrication craftsmanship. Hand-curated Carrara marble, Italian Calacatta Oro, and bookmatched quartzite engineered for high-end residential interiors.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono text-neutral-400">Curated Slabs:</span>
              <span className="px-3 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-gold font-mono text-xs font-bold">
                48 Slabs In-Stock
              </span>
            </div>
          </div>

          {/* Interactive Animated Slab Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
            {/* Left Column: Interactive 3D Slab Preview with Shimmer Vein Light */}
            <div className="lg:col-span-7 relative group rounded-2xl overflow-hidden border border-gold/30 bg-neutral-900 h-72 md:h-96 shadow-2xl flex items-center justify-center">
              {/* Shimmer Light Beam Effect */}
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent skew-x-12 z-20 pointer-events-none"
              />

              {/* Stone Texture Background */}
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                   style={{
                     backgroundImage: `url(${
                       [
                         "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
                         "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
                         "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80",
                         "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80"
                       ][activeLuxuryStone]
                     })`
                   }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent z-10" />

              {/* Floating Qinwan London Luxury Badge */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-neutral-950/90 backdrop-blur-md border border-gold/50 px-3 py-1.5 rounded-xl shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-serif text-xs font-bold text-gold tracking-wide">
                  {["Calacatta Oro Gold", "Nero Marquina Velvet", "Patagonian Quartzite", "Statuario Extra Bookmatched"][activeLuxuryStone]}
                </span>
              </div>

              {/* Interactive Hotspot Pins */}
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-1/3 right-1/4 z-20 cursor-pointer p-2 rounded-full bg-amber-500/30 border border-gold text-gold shadow-lg"
                title="Gold Vein Grain Reflection"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
              </motion.div>

              {/* Bottom Specs Bar */}
              <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 bg-neutral-950/90 backdrop-blur-md border border-neutral-800 p-3 rounded-xl">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[9px] font-mono text-neutral-400 block uppercase">Finish</span>
                    <span className="text-xs font-bold text-white">Silk Polish &amp; Bookmatched</span>
                  </div>
                  <div className="h-6 w-px bg-neutral-800" />
                  <div>
                    <span className="text-[9px] font-mono text-neutral-400 block uppercase">Origin</span>
                    <span className="text-xs font-bold text-gold">Carrara &amp; Tuscany, Italy</span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab("artisan-shop")}
                  className="px-3.5 py-1.5 bg-gold hover:bg-amber-400 text-neutral-950 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  <span>View Slab Inventory</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Column: 4 Luxury Selector Cards */}
            <div className="lg:col-span-5 space-y-2.5 flex flex-col justify-center">
              {[
                { title: "Calacatta Oro Gold", desc: "Warm gold veining on bright Italian porcelain canvas." },
                { title: "Nero Marquina Velvet", desc: "Deep black marble with white lightning veining." },
                { title: "Patagonian Quartzite", desc: "Translucent crystal quartzite with backlighting options." },
                { title: "Statuario Extra Bookmatched", desc: "Symmetrical bookmatched marble for kitchen islands." }
              ].map((item, idx) => (
                <button
                  key={item.title}
                  onClick={() => setActiveLuxuryStone(idx)}
                  className={`w-full p-3.5 rounded-2xl text-left transition-all border cursor-pointer flex items-center justify-between group ${
                    activeLuxuryStone === idx
                      ? "bg-neutral-900 border-gold shadow-lg ring-1 ring-gold/50"
                      : "bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${activeLuxuryStone === idx ? "bg-gold" : "bg-neutral-700"}`} />
                      <h4 className={`font-serif text-sm font-bold ${activeLuxuryStone === idx ? "text-gold" : "text-white"}`}>
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-neutral-400 font-sans pl-4">
                      {item.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 🌟 PERSUASIVE SIGN UP PROMPT BANNER FOR GUESTS */}
        {(isGuest || !userEmail) && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border border-amber-500/40 p-6 md:p-8 shadow-2xl space-y-5 animate-fade-in">
            {/* Subtle Gold Accent Lighting */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 dark:text-gold font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" /> SMC Pro VIP Access
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">100% Free • No Credit Card Required</span>
                </div>

                <h2 className="font-serif text-xl md:text-2xl font-bold text-white tracking-tight leading-snug">
                  Create Your Free Account to Save Custom 3D Designs & Track Slab Templating
                </h2>

                <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                  Unlock full enterprise features: save your kitchen model estimates, track live marble & quartz fabrication milestones, and download instant PDF quotes. Sign up in under 30 seconds with <strong>Email</strong>, <strong>Google</strong>, <strong>Apple ID</strong>, or <strong>Facebook</strong>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-200 bg-neutral-900/80 p-2 rounded-xl border border-neutral-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Save 3D Kitchen Projects</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-200 bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Live Templating GPS Status</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-200 bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>PDF Quotes & Warranty Vault</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto shrink-0 relative z-10">
                <button
                  onClick={onOpenSignUpModal}
                  className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 text-center uppercase tracking-wider"
                >
                  <User className="w-4 h-4" />
                  <span>Create Account / Sign In</span>
                </button>
                <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-neutral-400">
                  <span>Sign up in 1 click via:</span>
                  <span className="font-bold text-neutral-200">Gmail • Apple • Facebook</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 📊 TOP CARD: PRIMARY PROJECT OVERVIEW */}
        {primaryProject && (
          <div
            className={`p-6 rounded-2xl border shadow-md transition-all space-y-5 ${
              isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200/90 shadow-xs"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-neutral-200/60 dark:border-neutral-800">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gold block">
                  Active Workload Tracking
                </span>
                <h2 className="font-serif text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  {primaryProject.name}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-gold" />
                  {primaryProject.address || "Address not yet set"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
                    primaryProject.status === "Completed"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {primaryProject.status}
                </span>

                {primaryProject.status === "Completed" && (
                  <button
                    onClick={() => onOpenSignoffModal(primaryProject)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs animate-pulse"
                  >
                    <PenTool className="w-3.5 h-3.5" /> Sign-off
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar & Key Dates */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-neutral-500 dark:text-neutral-400 font-bold">Project Completion Progress</span>
                <span className="text-gold font-bold text-sm">
                  {primaryProject.status === "Completed"
                    ? "100%"
                    : primaryProject.status === "Ready for Install"
                    ? "85%"
                    : primaryProject.status === "Fabrication"
                    ? "70%"
                    : "40%"}
                </span>
              </div>

              <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-amber-500 via-gold to-emerald-500 h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{
                    width:
                      primaryProject.status === "Completed"
                        ? "100%"
                        : primaryProject.status === "Ready for Install"
                        ? "85%"
                        : primaryProject.status === "Fabrication"
                        ? "70%"
                        : "40%"
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl border border-neutral-200/60 dark:border-neutral-800">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block">Estimated Completion</span>
                  <strong className="text-neutral-900 dark:text-neutral-100 font-serif">Not yet set</strong>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl border border-neutral-200/60 dark:border-neutral-800">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block">Next Scheduled Appointment</span>
                  <strong className="text-amber-600 dark:text-amber-400 font-serif">Not yet scheduled</strong>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl border border-neutral-200/60 dark:border-neutral-800 sm:col-span-2 lg:col-span-1">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block">Material Specification</span>
                  <strong className="text-neutral-900 dark:text-neutral-100 font-serif">Not yet selected</strong>
                </div>
              </div>
            </div>

            {/* 📈 PROJECT TIMELINE VISUAL STEPS */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-bold block">
                Workflow Milestone Roadmap
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold block">Consultation</span>
                  <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400">Completed</span>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold block">Laser Survey</span>
                  <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400">Completed</span>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 shadow-xs">
                  <Clock className="w-4 h-4 mx-auto mb-1 text-amber-600 dark:text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                  <span className="text-xs font-bold block">Templating</span>
                  <span className="text-[9px] font-mono text-amber-700 dark:text-amber-300 font-bold">In Progress</span>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500">
                  <span className="text-xs font-mono font-bold block mb-1">04</span>
                  <span className="text-xs font-semibold block">Fabrication</span>
                  <span className="text-[9px] font-mono text-neutral-400">Pending</span>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500">
                  <span className="text-xs font-mono font-bold block mb-1">05</span>
                  <span className="text-xs font-semibold block">Installation</span>
                  <span className="text-[9px] font-mono text-neutral-400">Pending</span>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500">
                  <span className="text-xs font-mono font-bold block mb-1">06</span>
                  <span className="text-xs font-semibold block">Sign-Off</span>
                  <span className="text-[9px] font-mono text-neutral-400">Pending</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 🚨 QUICK ACTIONS (LARGE TOUCH BUTTONS) */}
        <div className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            
            <button
              onClick={onOpenAppointmentModal}
              className={`p-4 rounded-2xl border text-left transition-all hover:scale-105 cursor-pointer shadow-xs group ${
                isDark ? "bg-neutral-900 border-neutral-800 hover:border-gold" : "bg-white border-neutral-200/90 hover:border-gold"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2.5 group-hover:bg-gold group-hover:text-black transition-colors">
                <Calendar className="w-5 h-5" />
              </div>
              <strong className="text-xs font-bold block text-neutral-900 dark:text-neutral-100">Book Appointment</strong>
              <span className="text-[10px] text-neutral-400 block font-mono">Survey &amp; Fitting</span>
            </button>

            <button
              onClick={() => onNavigateTab("messages")}
              className={`p-4 rounded-2xl border text-left transition-all hover:scale-105 cursor-pointer shadow-xs group ${
                isDark ? "bg-neutral-900 border-neutral-800 hover:border-gold" : "bg-white border-neutral-200/90 hover:border-gold"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2.5 group-hover:bg-gold group-hover:text-black transition-colors">
                <MessageSquare className="w-5 h-5" />
              </div>
              <strong className="text-xs font-bold block text-neutral-900 dark:text-neutral-100">Message SMC Pro</strong>
              <span className="text-[10px] text-neutral-400 block font-mono">Direct Support</span>
            </button>

            <button
              onClick={() => onNavigateTab("estimator")}
              className={`p-4 rounded-2xl border text-left transition-all hover:scale-105 cursor-pointer shadow-xs group ${
                isDark ? "bg-neutral-900 border-neutral-800 hover:border-gold" : "bg-white border-neutral-200/90 hover:border-gold"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2.5 group-hover:bg-gold group-hover:text-black transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <strong className="text-xs font-bold block text-neutral-900 dark:text-neutral-100">View Quotes</strong>
              <span className="text-[10px] text-neutral-400 block font-mono">Estimates &amp; Specs</span>
            </button>

            <button
              onClick={onOpenFinanceModal}
              className={`p-4 rounded-2xl border text-left transition-all hover:scale-105 cursor-pointer shadow-xs group ${
                isDark ? "bg-neutral-900 border-neutral-800 hover:border-gold" : "bg-white border-neutral-200/90 hover:border-gold"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:bg-gold group-hover:text-black transition-colors">
                <CreditCard className="w-5 h-5" />
              </div>
              <strong className="text-xs font-bold block text-neutral-900 dark:text-neutral-100">Pay Invoice</strong>
              <span className="text-[10px] text-neutral-400 block font-mono">Secure Portal</span>
            </button>

            <button
              onClick={() => onNavigateTab("projects")}
              className={`p-4 rounded-2xl border text-left transition-all hover:scale-105 cursor-pointer shadow-xs group ${
                isDark ? "bg-neutral-900 border-neutral-800 hover:border-gold" : "bg-white border-neutral-200/90 hover:border-gold"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-2.5 group-hover:bg-gold group-hover:text-black transition-colors">
                <Camera className="w-5 h-5" />
              </div>
              <strong className="text-xs font-bold block text-neutral-900 dark:text-neutral-100">Upload Photos</strong>
              <span className="text-[10px] text-neutral-400 block font-mono">Site Progress</span>
            </button>

            <button
              onClick={() => handleAiSendPrompt("Request urgent support regarding my stone installation site readiness")}
              className={`p-4 rounded-2xl border text-left transition-all hover:scale-105 cursor-pointer shadow-xs group ${
                isDark ? "bg-neutral-900 border-neutral-800 hover:border-gold" : "bg-white border-neutral-200/90 hover:border-gold"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center mb-2.5 group-hover:bg-gold group-hover:text-black transition-colors">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <strong className="text-xs font-bold block text-neutral-900 dark:text-neutral-100">Request Support</strong>
              <span className="text-[10px] text-neutral-400 block font-mono">Emergency Hotline</span>
            </button>

          </div>
        </div>

        {/* TWO-COLUMN DASHBOARD CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN (8 COLS) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 📅 UPCOMING APPOINTMENT & WEATHER PREP CARD */}
            <div
              className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
                isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200/90"
              }`}
            >
              <div className="flex justify-between items-center border-b pb-3 border-neutral-200/60 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-neutral-900 dark:text-neutral-100">
                      Upcoming Appointment
                    </h3>
                    <p className="text-[10px] font-mono text-neutral-400">Scheduled Visit Details</p>
                  </div>
                </div>

                <button
                  onClick={onOpenAppointmentModal}
                  className="text-xs text-gold hover:underline font-mono font-bold cursor-pointer"
                >
                  Reschedule
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-neutral-400 block uppercase">Visit Type &amp; Time</span>
                  <strong className="text-neutral-900 dark:text-neutral-100 block font-semibold">
                    Not yet scheduled
                  </strong>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-neutral-400 block uppercase">Assigned Mason</span>
                  <strong className="text-neutral-900 dark:text-neutral-100 block font-semibold">
                    Not yet assigned
                  </strong>
                </div>
              </div>
            </div>

            {/* 📷 PROJECT GALLERY (BEFORE / DURING / COMPLETED) */}
            <div
              className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
                isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200/90"
              }`}
            >
              <div className="flex justify-between items-center border-b pb-3 border-neutral-200/60 dark:border-neutral-800">
                <div>
                  <h3 className="font-serif font-bold text-base text-neutral-900 dark:text-neutral-100">
                    Project Photo Gallery Timeline
                  </h3>
                  <p className="text-[10px] font-mono text-neutral-400">High-Resolution Site Documentation</p>
                </div>
                <button
                  onClick={() => onNavigateTab("projects")}
                  className="text-xs text-gold hover:underline font-mono font-bold flex items-center gap-1 cursor-pointer"
                >
                  View All Photos <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {galleryItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setActivePhotoModal(item.url)}
                    className="group relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 cursor-pointer aspect-4/3 shadow-2xs hover:border-gold transition-all"
                  >
                    <img
                      src={item.url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end text-white">
                      <span className="bg-gold text-black text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded w-fit mb-1">
                        {item.stage}
                      </span>
                      <strong className="text-[11px] font-semibold leading-tight line-clamp-1">{item.title}</strong>
                      <span className="text-[9px] font-mono text-neutral-300">{item.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 📄 RECENT DOCUMENTS */}
            <div
              className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
                isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200/90"
              }`}
            >
              <div className="flex justify-between items-center border-b pb-3 border-neutral-200/60 dark:border-neutral-800">
                <div>
                  <h3 className="font-serif font-bold text-base text-neutral-900 dark:text-neutral-100">
                    Recent Documents &amp; Certificates
                  </h3>
                  <p className="text-[10px] font-mono text-neutral-400">PDF Contracts, Invoices &amp; Guarantees</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentDocuments.length === 0 && (
                  <div className="sm:col-span-2 py-6 text-center text-xs text-neutral-400 font-mono">
                    No documents yet.
                  </div>
                )}
                {recentDocuments.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-between gap-2 hover:border-gold transition-all"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <strong className="text-xs font-bold block text-neutral-900 dark:text-neutral-100 truncate">
                          {doc.name}
                        </strong>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {doc.type} • {doc.date}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (primaryProject) onOpenPdfModal(primaryProject);
                      }}
                      className="p-2 text-neutral-500 hover:text-gold hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ❤️ CUSTOMER SATISFACTION / REVIEW CARD */}
            <div
              className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
                isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200/90"
              }`}
            >
              <div className="flex items-center gap-3 border-b pb-3 border-neutral-200/60 dark:border-neutral-800">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-neutral-900 dark:text-neutral-100">
                    Customer Experience &amp; Review
                  </h3>
                  <p className="text-[10px] font-mono text-neutral-400">Rate Your Installation Craftsmanship</p>
                </div>
              </div>

              {reviewSubmitted ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <strong className="text-sm font-bold text-emerald-900 dark:text-emerald-200 block">
                    Thank you for your feedback!
                  </strong>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Your review has been recorded.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Your Rating:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setUserRating(star)}
                          className="p-1 cursor-pointer transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= userRating
                                ? "text-amber-500 fill-amber-500"
                                : "text-neutral-300 dark:text-neutral-700"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share comments on stone quality, edge polishing, or site cleanliness..."
                    className="w-full text-xs p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:border-gold"
                  />

                  <button
                    onClick={() => setReviewSubmitted(true)}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-gold border border-gold/40 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                  >
                    Submit Review
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN (4 COLS) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 💰 OUTSTANDING BALANCE CARD */}
            <div
              className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
                isDark
                  ? "bg-gradient-to-b from-neutral-900 to-neutral-950 border-neutral-800"
                  : "bg-gradient-to-b from-white to-neutral-50 border-neutral-200/90"
              }`}
            >
              <div className="flex justify-between items-center border-b pb-3 border-neutral-200/60 dark:border-neutral-800">
                <span className="text-[10px] font-mono text-gold font-bold uppercase tracking-widest">
                  Financial Statement
                </span>
                <span className="text-xs font-mono font-bold text-neutral-400">GBP £</span>
              </div>

              {isFullyPaid ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <strong className="text-xs font-bold block">No Outstanding Payments</strong>
                    <span className="text-[10px]">Your account balance is fully paid up to date.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 block font-mono">Total Outstanding Due</span>
                    <strong className="font-serif text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                      £{totalBalanceDue.toLocaleString()}
                    </strong>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono block mt-1">
                      Due Date: {nextDueDate}
                    </span>
                  </div>

                  <button
                    onClick={onOpenFinanceModal}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" /> Pay Now via Secure Portal
                  </button>
                </div>
              )}
            </div>

            {/* 🔔 REAL-TIME NOTIFICATIONS */}
            <div
              className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
                isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200/90"
              }`}
            >
              <div className="flex justify-between items-center border-b pb-3 border-neutral-200/60 dark:border-neutral-800">
                <h3 className="font-serif font-bold text-base text-neutral-900 dark:text-neutral-100">
                  Project Activity Feed
                </h3>
                <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  Live Updates
                </span>
              </div>

              <div className="space-y-3">
                {notifications.length === 0 && (
                  <div className="py-6 text-center text-xs text-neutral-400 font-mono">
                    No activity yet.
                  </div>
                )}
                {notifications.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-neutral-150 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-800/40 flex items-start gap-3"
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${item.color}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 leading-tight">
                        <strong className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block">
                          {item.title}
                        </strong>
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-300">{item.desc}</p>
                        <span className="text-[9px] font-mono text-neutral-400 block pt-0.5">{item.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ⭐ FEATURED OFFERS */}
            <div
              className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
                isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200/90"
              }`}
            >
              <div className="flex items-center gap-2 border-b pb-3 border-neutral-200/60 dark:border-neutral-800">
                <Gift className="w-4 h-4 text-gold" />
                <h3 className="font-serif font-bold text-base text-neutral-900 dark:text-neutral-100">
                  Featured Client Perks
                </h3>
              </div>

              {/*
                Phase 5 Gate 0 purge: this card previously advertised a
                fabricated "15% Off Waterfall Edge Profiles" promotion and a
                fabricated "£250 Credit Per Referred Client" reward — the
                same fabricated cash-referral figure already removed from
                ReferralsModal.tsx. Neither was ever a real offer. Per that
                same approved decision, no unsupported promotion is shown
                here; the entry point to the (already-purged) referrals
                feature is kept without asserting a reward amount.
              */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-1">
                  <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest block">
                    Trade Referrals
                  </span>
                  <p className="text-[10px] text-neutral-600 dark:text-neutral-400">
                    Refer a client and share your link — contact SMC for current terms.
                  </p>
                  <button
                    onClick={onOpenReferralsModal}
                    className="text-[10px] text-gold font-mono font-bold hover:underline block pt-1"
                  >
                    Share Referral Link &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* 📞 CONTACT SMC PRO */}
            <div
              className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
                isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200/90"
              }`}
            >
              <div className="flex items-center gap-2 border-b pb-3 border-neutral-200/60 dark:border-neutral-800">
                <Phone className="w-4 h-4 text-gold" />
                <h3 className="font-serif font-bold text-base text-neutral-900 dark:text-neutral-100">
                  Contact SMC Pro Desk
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <a
                  href="tel:+442079460912"
                  className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 hover:border-gold flex items-center justify-center gap-2 font-bold text-neutral-800 dark:text-neutral-200"
                >
                  <Phone className="w-3.5 h-3.5 text-gold" /> Direct Call
                </a>

                <button
                  onClick={onOpenWhatsAppModal || (() => window.open("https://wa.me/442079460912", "_blank"))}
                  className="p-3 rounded-xl border border-emerald-400/60 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2 font-bold cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/80 transition-all shadow-2xs"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> WhatsApp
                </button>

                <a
                  href="mailto:concierge@smcpro.co.uk"
                  className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 hover:border-gold flex items-center justify-center gap-2 font-bold text-neutral-800 dark:text-neutral-200"
                >
                  <Mail className="w-3.5 h-3.5 text-gold" /> Email Studio
                </a>

                <button
                  onClick={() => alert("SMC Pro Showroom: 14 Kensington High Street, London W8 4SG")}
                  className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 hover:border-gold flex items-center justify-center gap-2 font-bold text-neutral-800 dark:text-neutral-200 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-gold" /> Directions
                </button>
              </div>
            </div>

            {/* 🏆 REFERRAL PROGRAMME BRIEF */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-neutral-900 to-neutral-950 text-white border border-gold/30 shadow-md space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono text-gold font-bold uppercase tracking-widest">
                  VIP Client Referral
                </span>
                <Award className="w-5 h-5 text-gold" />
              </div>
              <div>
                <strong className="text-sm font-bold block">Invite Friends &amp; Architects</strong>
                <p className="text-[11px] text-neutral-300 mt-0.5">
                  Share your referral link with SMC to invite friends and architects.
                </p>
              </div>
              <button
                onClick={onOpenReferralsModal}
                className="w-full py-2 bg-gold hover:bg-amber-400 text-black font-bold text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer"
              >
                Invite Friends Now
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* 💬 FLOATING AI ASSISTANT WIDGET */}
      <div className="fixed bottom-20 md:bottom-6 right-6 z-40">
        {!isAiFloatingOpen ? (
          <button
            onClick={() => setIsAiFloatingOpen(true)}
            className="p-4 rounded-full bg-gradient-to-r from-neutral-900 to-black text-gold border-2 border-gold/60 shadow-2xl hover:scale-110 transition-transform cursor-pointer flex items-center gap-2 group"
          >
            <Bot className="w-6 h-6 animate-pulse text-gold" />
            <span className="text-xs font-bold font-serif text-white pr-1 hidden sm:inline">
              Ask SMC AI Assistant
            </span>
          </button>
        ) : (
          <div className="bg-neutral-900 text-white border border-gold/40 rounded-2xl w-80 sm:w-96 shadow-2xl p-4 space-y-3 animate-fade-in">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-gold" />
                <div>
                  <strong className="text-xs font-bold block">SMC Pro AI Assistant</strong>
                  <span className="text-[9px] font-mono text-emerald-400">Online • Stone Advisor</span>
                </div>
              </div>
              <button
                onClick={() => setIsAiFloatingOpen(false)}
                className="text-neutral-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-300">
              How can I assist your stone project today? Tap a quick prompt below or type a query:
            </p>

            <div className="space-y-1.5">
              {[
                "Where is my project?",
                "Book a survey appointment",
                "Show my invoices & balance",
                "How do I clean quartz & marble?"
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAiSendPrompt(prompt)}
                  className="w-full text-left p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 border border-neutral-700 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>"{prompt}"</span>
                  <Zap className="w-3 h-3 text-gold" />
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={aiQuickInput}
                onChange={(e) => setAiQuickInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && aiQuickInput.trim()) {
                    handleAiSendPrompt(aiQuickInput.trim());
                    setAiQuickInput("");
                  }
                }}
                placeholder="Ask anything..."
                className="w-full text-xs bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-white outline-none focus:border-gold"
              />
              <button
                onClick={() => {
                  if (aiQuickInput.trim()) {
                    handleAiSendPrompt(aiQuickInput.trim());
                    setAiQuickInput("");
                  }
                }}
                className="p-2 bg-gold text-black font-bold rounded-lg hover:bg-amber-400 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PHOTO MODAL OVERLAY */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-4xl w-full bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 p-2">
            <button
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-black transition-colors cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={activePhotoModal} alt="Enlarged Site Documentation" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* 🚨 PROCUREMENT RESTOCK NOTIFICATION TOAST (MANAGER ONLY) */}
      {procurementToast && dashboardRole === "manager" && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-50 max-w-md w-[calc(100vw-2rem)] bg-neutral-950/95 border-2 border-rose-500 shadow-[0_12px_40px_rgba(225,29,72,0.35)] rounded-2xl p-4.5 text-white space-y-3 backdrop-blur-xl animate-slide-in">
          <div className="flex items-start justify-between gap-3 border-b border-rose-900/60 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/60 flex items-center justify-center shrink-0 text-rose-400 shadow-inner">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-rose-400 bg-rose-950/90 px-2 py-0.5 rounded border border-rose-800/80 inline-block">
                  AUTOMATED PROCUREMENT ALERT
                </span>
                <h4 className="font-serif font-bold text-sm text-neutral-100 leading-tight mt-0.5">
                  Restock Threshold Breach (&lt; 20 sq ft)
                </h4>
              </div>
            </div>
            <button
              onClick={() => setProcurementToast(null)}
              className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Dismiss Alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-neutral-300 font-sans space-y-1">
            <p className="leading-snug">
              Warehouse stock for <strong className="text-amber-400 font-serif">{procurementToast.matName}</strong> has dropped to{" "}
              <strong className="text-rose-400 font-mono font-bold text-sm bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40">{procurementToast.stockSqFt} sq ft</strong> (Minimum threshold: 20 sq ft).
            </p>
            <p className="text-[10px] text-neutral-400 font-mono flex items-center justify-between pt-1">
              <span>Triggered at {procurementToast.timestamp}</span>
              <span className="text-amber-400/90 font-semibold">Procurement Re-order Auto-Queued</span>
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                handleRestockItem(procurementToast.matId, procurementToast.matName, 50);
                setProcurementToast(null);
              }}
              className="flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-mono text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Issue Restock (+50 sq ft)</span>
            </button>
            <button
              onClick={() => {
                onNavigateTab("catalog");
                setProcurementToast(null);
              }}
              className="py-2.5 px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
            >
              <span>Vault Catalog</span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
