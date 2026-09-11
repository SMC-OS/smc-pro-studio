import React, { useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  Award,
  ChevronRight,
  ArrowRight,
  Calculator,
  Search,
  Filter,
  Layers,
  FileText,
  User,
  X,
  MessageSquare,
  HelpCircle,
  Building,
  Check,
  Zap,
  Tag,
  Gift,
  Calendar,
  Send,
  Sliders,
  Maximize2,
  Eye,
  Info,
  ChevronDown,
  Volume2,
  VolumeX,
  Compass,
  Briefcase,
  ExternalLink,
  Flame,
  Droplet,
  Sun,
  Moon,
  Laptop
} from "lucide-react";
import { Material } from "../App";

interface GuestWelcomeScreenProps {
  onLogin: () => void;
  onRegister: () => void;
  onExploreAsGuest: () => void;
  onOpenEstimator?: () => void;
  onOpenConsultation?: () => void;
  materialsCatalog: Material[];
  formatCurrency: (val: number) => string;
}

export default function GuestWelcomeScreen({
  onLogin,
  onRegister,
  onExploreAsGuest,
  onOpenEstimator,
  onOpenConsultation,
  materialsCatalog,
  formatCurrency
}: GuestWelcomeScreenProps) {
  // Theme Toggle Mode (Dark / Light for Guest Home)
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("EN");

  // Hero Media State
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const [heroImageIndex, setHeroImageIndex] = useState<number>(0);

  const heroImages = [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1920&q=80"
  ];

  // Material Collection Filter
  const [selectedMaterialCategory, setSelectedMaterialCategory] = useState<string>("All");
  const [selectedMaterialDetailModal, setSelectedMaterialDetailModal] = useState<Material | null>(null);

  // Worktop Quote Request State
  const [estShape, setEstShape] = useState<"L-Shape" | "Galley" | "Island + Straight" | "U-Shape" | "Single Run">("Island + Straight");
  const [estSizeFeet, setEstSizeFeet] = useState<number>(24);
  const [estMaterialType, setEstMaterialType] = useState<string>("Quartz");
  const [estEdge, setEstEdge] = useState<string>("Waterfall Mitre");
  const [estIncludeBacksplash, setEstIncludeBacksplash] = useState<boolean>(true);
  const [estEstimateSubmitted, setEstEstimateSubmitted] = useState<boolean>(false);

  // Consultation Modal / Form
  const [showConsultationModal, setShowConsultationModal] = useState<boolean>(false);
  const [consultationType, setConsultationType] = useState<"Site Visit" | "Showroom" | "Video Call">("Site Visit");
  const [consultName, setConsultName] = useState<string>("");
  const [consultPhone, setConsultPhone] = useState<string>("");
  const [consultEmail, setConsultEmail] = useState<string>("");
  const [consultPostcode, setConsultPostcode] = useState<string>("");
  const [consultDate, setConsultDate] = useState<string>("");
  const [consultSuccess, setConsultSuccess] = useState<boolean>(false);

  // Postcode Coverage Checker
  const [coveragePostcode, setCoveragePostcode] = useState<string>("");
  const [coverageResult, setCoverageResult] = useState<{ checked: boolean; covered: boolean; area?: string } | null>(null);

  // Modals & Drawers
  const [showFaqModal, setShowFaqModal] = useState<boolean>(false);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [showInspirationModal, setShowInspirationModal] = useState<boolean>(false);
  const [showAiBotDrawer, setShowAiBotDrawer] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

  // AI Assistant Chat State
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    { sender: "bot", text: "Welcome to SMC Pro Stone & Construction! I am your AI Master Stonemason Assistant. Ask me anything about Quartz vs Marble, 2026 UK interior trends, or cost per sq meter." }
  ]);
  const [aiInputText, setAiInputText] = useState<string>("");

  const handleSendAiMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInputText.trim()) return;
    const userMsg = aiInputText;
    setAiChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setAiInputText("");

    setTimeout(() => {
      let botReply = "Our stonemasons work across Quartz, Marble, Granite, Porcelain and Dekton. Tell me about your project and I can point you to the right next step.";
      if (userMsg.toLowerCase().includes("quote") || userMsg.toLowerCase().includes("cost") || userMsg.toLowerCase().includes("price")) {
        botReply = "Pricing depends on your specific layout, material and finish, so we don't quote a figure here. Use the Request a Quote section below to submit your kitchen layout details, and our team will send you a price based on specification.";
      } else if (userMsg.toLowerCase().includes("warranty") || userMsg.toLowerCase().includes("guarantee")) {
        botReply = "Warranty and workmanship terms vary by project and are confirmed with your quote. Please contact SMC for the terms applicable to your installation.";
      } else if (userMsg.toLowerCase().includes("postcode") || userMsg.toLowerCase().includes("area") || userMsg.toLowerCase().includes("london")) {
        botReply = "Coverage area and survey availability are confirmed when you request a quote — please get in touch with your postcode and we'll let you know.";
      }
      setAiChatMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
    }, 600);
  };

  // Services List
  const servicesList = [
    { name: "Quartz Worktops", desc: "Non-porous, stain-resistant engineered stone in a wide range of vein designs.", icon: Layers, tag: "Most Popular" },
    { name: "Marble Worktops", desc: "Timeless natural Italian marble crafted for luxury residential kitchens.", icon: Award, tag: "Luxury Classic" },
    { name: "Granite Worktops", desc: "Ultra-hard, heat-proof natural stone worktops.", icon: Flame, tag: "Ultra Durable" },
    { name: "Kitchen Renovations", desc: "End-to-end management from cabinetry prep to stone templating & fitting.", icon: Building, tag: "Full Service" },
    { name: "Bathroom Renovations", desc: "Full stone cladding, custom shower trays, and floating vanity slabs.", icon: Droplet, tag: "Bespoke Fit" },
    { name: "Home Extensions", desc: "Architectural masonry, external stone facades, and structural coping.", icon: MapPin, tag: "Architectural" },
    { name: "Flooring & Tiles", desc: "Large-format porcelain and natural stone flooring with underfloor heating prep.", icon: ShieldCheck, tag: "Large Format" },
    { name: "Staircases & Treads", desc: "Floating stone steps, mitred risers, and LED channel routing.", icon: ChevronRight, tag: "Precision Cut" },
    { name: "Fireplaces & Hearths", desc: "Bookmatched marble and quartzite hearth surrounds.", icon: Flame, tag: "Fire Safe" },
    { name: "Interior Design & CAD", desc: "Full 3D grain continuity renderings and digital slab layout preview before cutting.", icon: Compass, tag: "3D Visualizer" }
  ];

  // Why Choose Us
  const whyUsPoints = [
    { title: "Transparent Pricing", desc: "Quotes based on your exact specification, with no hidden fees.", icon: Calculator },
    { title: "Free Home Survey", desc: "Complimentary on-site survey before you commit.", icon: Tag },
    { title: "Premium Materials", desc: "Quartz, marble, granite, porcelain and Dekton slabs.", icon: Sparkles },
    { title: "3D Laser Templating", desc: "Room dimensions captured before cutting begins.", icon: Clock }
  ];

  // Material Collections filter
  const materialCategories = ["All", "Quartz", "Marble", "Granite", "Porcelain", "Dekton"];
  
  const filteredMaterials = materialsCatalog.filter(m => {
    if (selectedMaterialCategory === "All") return true;
    if (selectedMaterialCategory === "Quartz") return m.class === "Quartz";
    if (selectedMaterialCategory === "Marble") return m.class === "Natural Stone" && m.name.toLowerCase().includes("marble");
    if (selectedMaterialCategory === "Granite") return m.class === "Natural Stone" && !m.name.toLowerCase().includes("marble");
    if (selectedMaterialCategory === "Porcelain") return m.class === "Porcelain";
    if (selectedMaterialCategory === "Dekton") return m.name.toLowerCase().includes("borghini") || m.class === "Porcelain";
    return true;
  });

  return (
    <div className={`min-h-screen w-full transition-colors duration-300 font-sans selection:bg-[#D4AF37]/30 selection:text-white ${
      themeMode === "dark" ? "bg-[#0f0f11] text-neutral-100" : "bg-neutral-50 text-neutral-900"
    }`}>
      
      {/* ========================================================= */}
      {/* TOP NAVIGATION BAR */}
      {/* ========================================================= */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-colors ${
        themeMode === "dark" 
          ? "bg-[#0f0f11]/90 border-neutral-800/80 text-white" 
          : "bg-white/90 border-neutral-200 text-neutral-900"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={onExploreAsGuest}>
            <img 
              alt="SMC PRO Logo" 
              className="h-10 w-auto object-contain mix-blend-multiply group-hover:scale-105 transition-transform" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBXNV_RiofajRHjAoUdeRL9DEe2QkYbM7Tc0A4TQGbDMcjFQw7Q5zg9KIK2ijao316cxP_79D-6J5NzIHqGSsKu4We4TrVBU9wXJ-Oki7eDSGHaKKrZC6H9bitIoGlyNOMKRzOMOxJ7P98OaPN4DFpS7I8k6ifbcEAbyIrTMtqR8d6Yfx7XBkh3itiTP9iEqSYh_FMLknw4CwMtdIRxcCZr-5-A3zhzsZvV5yGDXPOTs9J_FTIffTZ0lCxFXwpnnkh4xJeo_osw6k"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-lg tracking-tight">SMC PRO</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 uppercase tracking-widest">
                  UK STONE &amp; CONST
                </span>
              </div>
              <p className="text-[10px] font-mono text-neutral-400 tracking-wider uppercase">
                Premier Stone &amp; Construction Services
              </p>
            </div>
          </div>

          {/* Quick Nav Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium tracking-wide">
            <a href="#about" className="hover:text-[#D4AF37] transition-colors">About Us</a>
            <a href="#services" className="hover:text-[#D4AF37] transition-colors">Services</a>
            <a href="#why-us" className="hover:text-[#D4AF37] transition-colors">Why SMC Pro</a>
            <a href="#materials" className="hover:text-[#D4AF37] transition-colors">Materials</a>
            <a href="#estimator" className="hover:text-[#D4AF37] transition-colors flex items-center gap-1 text-[#D4AF37] font-bold">
              <Calculator className="w-3.5 h-3.5" /> Request a Quote
            </a>
            <a href="#contact" className="hover:text-[#D4AF37] transition-colors">Contact</a>
          </nav>

          {/* Header Action Controls */}
          <div className="flex items-center gap-3">

            {/* Theme Toggle */}
            <button
              onClick={() => setThemeMode(prev => prev === "dark" ? "light" : "dark")}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                themeMode === "dark" ? "border-neutral-800 bg-neutral-900 text-amber-400 hover:bg-neutral-800" : "border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
              title="Toggle Dark/Light Mode"
            >
              {themeMode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Language Selector */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className={`text-xs font-mono font-bold px-2 py-1.5 rounded-xl border focus:outline-none cursor-pointer ${
                themeMode === "dark" ? "bg-neutral-900 border-neutral-800 text-neutral-300" : "bg-neutral-100 border-neutral-200 text-neutral-800"
              }`}
            >
              <option value="EN">🇬🇧 EN</option>
              <option value="IT">🇮🇹 IT</option>
              <option value="FR">🇫🇷 FR</option>
              <option value="DE">🇩🇪 DE</option>
              <option value="ES">🇪🇸 ES</option>
            </select>

            {/* Login & Register Buttons */}
            <button
              onClick={onLogin}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all cursor-pointer"
            >
              Log In
            </button>
            <button
              onClick={onRegister}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-neutral-950 hover:brightness-110 shadow-md transition-all cursor-pointer"
            >
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 1. HERO SECTION */}
      {/* ========================================================= */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden border-b border-neutral-800/60">
        
        {/* Full-width Background Image / Slider */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroImages[heroImageIndex]}
            alt="SMC Pro Luxury Stone Worktop"
            className="w-full h-full object-cover object-center transform scale-105 transition-all duration-1000 filter brightness-65"
          />
          <div className={`absolute inset-0 ${
            themeMode === "dark" 
              ? "bg-gradient-to-t from-[#0f0f11] via-[#0f0f11]/60 to-black/70" 
              : "bg-gradient-to-t from-neutral-50 via-neutral-900/40 to-black/80"
          }`} />
        </div>

        {/* Hero Slider Dot Controls */}
        <div className="absolute bottom-8 right-8 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
          {heroImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setHeroImageIndex(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                heroImageIndex === idx ? "bg-[#D4AF37] w-6" : "bg-white/40 hover:bg-white"
              }`}
            />
          ))}
        </div>

        {/* Hero Content Box */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-8 pt-12 pb-20">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-[#D4AF37]/50 shadow-xl">
            <Sparkles className="w-4 h-4 text-[#D4AF37] animate-pulse" />
            <span className="text-xs font-semibold text-[#D4AF37]">
              UK Master Stonemasons &amp; Construction Specialist
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-white tracking-tight leading-[1.1] drop-shadow-2xl">
            Premium Stone &amp; Construction Services <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA771C]">
              From Design to Installation
            </span>
          </h1>

          {/* Subheading */}
          <p className="max-w-2xl mx-auto text-base sm:text-xl text-neutral-200 font-normal leading-relaxed drop-shadow-md">
            Transforming homes with expert craftsmanship, premium materials, and complete end-to-end project management across the UK.
          </p>

          {/* Hero Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={onRegister}
              className="px-8 py-4 rounded-xl text-base font-semibold bg-gradient-to-r from-[#D4AF37] via-[#C59B27] to-[#996515] text-neutral-950 hover:brightness-110 shadow-2xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4" /> Get Started
            </button>
            <button
              onClick={onLogin}
              className="px-8 py-4 rounded-xl text-base font-semibold bg-black/80 hover:bg-black text-white border border-[#D4AF37]/50 backdrop-blur-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              Log In
            </button>
            <a
              href="#estimator"
              className="px-8 py-4 rounded-xl text-base font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-[#D4AF37]" /> Request a Free Quote
            </a>
            <button
              onClick={onExploreAsGuest}
              className="w-full sm:w-auto px-6 py-4 rounded-xl text-base font-medium text-[#D4AF37] hover:underline flex items-center justify-center gap-1 cursor-pointer"
            >
              Explore Platform as Guest <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. ABOUT SMC PRO */}
      {/* ========================================================= */}
      <section id="about" className={`py-20 px-6 border-b ${
        themeMode === "dark" ? "bg-[#121215] border-neutral-800" : "bg-white border-neutral-200"
      }`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-mono font-bold uppercase">
              <Award className="w-3.5 h-3.5" /> About SMC Pro
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight leading-tight">
              Crafting Architectural Elegance <br />
              <span className="text-[#D4AF37]">With Unrivaled Precision</span>
            </h2>
            <p className="text-sm sm:text-base text-neutral-400 leading-relaxed font-sans">
              <strong>SMC Pro</strong> is a UK specialist in luxury stone fabrication, bespoke quartz worktops, marble cladding, and full residential construction management.
            </p>
            <p className="text-sm sm:text-base text-neutral-400 leading-relaxed font-sans">
              From initial 3D laser survey to precision waterjet cutting in our Surrey workshop, our team manages every stage of your stone installation.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-start gap-3 p-3 bg-black/20 rounded-xl border border-neutral-800">
                <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase font-mono">End-to-End Management</h4>
                  <p className="text-[11px] text-neutral-400">Demolition, plumbing, prep &amp; stone installation.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-black/20 rounded-xl border border-neutral-800">
                <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase font-mono">CAD Design &amp; Planning</h4>
                  <p className="text-[11px] text-neutral-400">3D slab layout preview before cutting.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-4">
              <button
                onClick={() => setShowConsultationModal(true)}
                className="px-6 py-3 rounded-xl bg-[#D4AF37] text-neutral-950 font-mono text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer"
              >
                Book a Free Survey
              </button>
              <button
                onClick={onExploreAsGuest}
                className="px-6 py-3 rounded-xl border border-neutral-700 font-mono text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all cursor-pointer"
              >
                View Material Catalog &rarr;
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="relative rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl group">
              <img
                src="https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80"
                alt="Master Stonemason at work"
                className="w-full h-[450px] object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 p-6 bg-black/80 backdrop-blur-md rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center text-[#D4AF37] font-mono text-xs font-bold uppercase">
                  <span>3D Laser Templating Unit</span>
                </div>
                <p className="text-xs text-neutral-300">
                  Our 3D laser scanners capture room dimensions before cutting begins, so your slabs are made to fit your exact space.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. OUR SERVICES */}
      {/* ========================================================= */}
      <section id="services" className={`py-20 px-6 border-b ${
        themeMode === "dark" ? "bg-[#0f0f11] border-neutral-800" : "bg-neutral-100 border-neutral-200"
      }`}>
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
              Bespoke Stonework &amp; Construction Solutions
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight">Our Core Services</h2>
            <p className="text-xs sm:text-sm text-neutral-400">
              From individual kitchen island slabs to complex full-home construction extensions, we deliver unmatched technical craftsmanship.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicesList.map((svc, index) => {
              const IconComp = svc.icon;
              return (
                <div
                  key={index}
                  className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between ${
                    themeMode === "dark"
                      ? "bg-[#18181c] border-neutral-800/90 hover:border-[#D4AF37]/60 hover:shadow-xl"
                      : "bg-white border-neutral-200 hover:border-[#D4AF37] hover:shadow-lg"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-black transition-colors">
                        <IconComp className="w-6 h-6" />
                      </div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-neutral-800 text-[#D4AF37] border border-[#D4AF37]/30">
                        {svc.tag}
                      </span>
                    </div>
                    <h3 className="text-xl font-serif font-bold group-hover:text-[#D4AF37] transition-colors">
                      {svc.name}
                    </h3>
                    <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                      {svc.desc}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-neutral-800/40 flex items-center justify-end mt-4">
                    <button
                      onClick={onExploreAsGuest}
                      className="text-xs font-mono font-bold text-[#D4AF37] flex items-center gap-1 group-hover:translate-x-1 transition-transform cursor-pointer"
                    >
                      Explore Service <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. WHY CHOOSE SMC PRO? */}
      {/* ========================================================= */}
      <section id="why-us" className={`py-20 px-6 border-b ${
        themeMode === "dark" ? "bg-[#141418] border-neutral-800" : "bg-white border-neutral-200"
      }`}>
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
              The SMC Pro Standard
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight">Why Choose SMC Pro?</h2>
            <p className="text-xs sm:text-sm text-neutral-400">
              We combine centuries-old stonemasonry techniques with state-of-the-art 3D laser mapping and CNC waterjet technology.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyUsPoints.map((pt, i) => {
              const IconComp = pt.icon;
              return (
                <div
                  key={i}
                  className={`p-6 rounded-2xl border transition-all ${
                    themeMode === "dark"
                      ? "bg-[#1b1b20] border-neutral-800 hover:border-[#D4AF37]/50"
                      : "bg-neutral-50 border-neutral-200 hover:border-[#D4AF37]"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] mb-4">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-serif font-bold mb-1">{pt.title}</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed font-sans">{pt.desc}</p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. MATERIAL COLLECTION BROWSER */}
      {/* ========================================================= */}
      <section id="materials" className={`py-20 px-6 border-b ${
        themeMode === "dark" ? "bg-[#0f0f11] border-neutral-800" : "bg-white border-neutral-200"
      }`}>
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                World-Class Slabs
              </span>
              <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight">Material Collection</h2>
              <p className="text-xs sm:text-sm text-neutral-400">
                Browse our material collection across Quartz, Marble, Granite, Porcelain, and Dekton slabs.
              </p>
            </div>

            {/* Material Category Selector */}
            <div className="flex flex-wrap items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-neutral-800">
              {materialCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedMaterialCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    selectedMaterialCategory === cat
                      ? "bg-[#D4AF37] text-neutral-950 shadow-md"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Material Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredMaterials.slice(0, 8).map((mat) => (
              <div
                key={mat.id}
                onClick={() => setSelectedMaterialDetailModal(mat)}
                className={`group rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between ${
                  themeMode === "dark" ? "bg-[#18181c] border-neutral-800 hover:border-[#D4AF37]" : "bg-neutral-50 border-neutral-200 hover:border-[#D4AF37]"
                }`}
              >
                <div>
                  <div className="relative h-48 overflow-hidden bg-neutral-900">
                    <img
                      src={mat.img || mat.image || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80"}
                      alt={mat.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono font-bold text-[#D4AF37] border border-[#D4AF37]/30">
                      Mohs {mat.mohs}
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase">{mat.class}</span>
                    </div>
                    <h4 className="text-lg font-serif font-bold group-hover:text-[#D4AF37] transition-colors">{mat.name}</h4>
                    <p className="text-xs text-neutral-400 line-clamp-2 font-sans">{mat.technicalDetails}</p>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-neutral-800/40 flex items-center justify-between mt-2">
                  <span className="text-xs font-mono font-bold text-[#D4AF37]">
                    Price on Application
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400 group-hover:text-white transition-colors flex items-center gap-1">
                    Inspect Specs <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-4">
            <button
              onClick={onExploreAsGuest}
              className="px-8 py-3 rounded-xl border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Explore Full Slab Catalog in Studio &rarr;
            </button>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 9. HOW IT WORKS */}
      {/* ========================================================= */}
      <section className={`py-20 px-6 border-b ${
        themeMode === "dark" ? "bg-[#121215] border-neutral-800" : "bg-neutral-100 border-neutral-200"
      }`}>
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
              Simple 5-Step Process
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight">How It Works</h2>
            <p className="text-xs sm:text-sm text-neutral-400">
              Our end-to-end workflow from initial concept to fitting.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { num: "01", title: "Request a Quote", desc: "Tell us about your project or request a free consultation." },
              { num: "02", title: "Home Survey", desc: "Our engineers perform a 3D laser survey at your property." },
              { num: "03", title: "Design & Slabs", desc: "Select exact slab vein orientation with 3D CAD preview." },
              { num: "04", title: "Fabrication", desc: "Precision CNC waterjet cutting in our Surrey workshop." },
              { num: "05", title: "Fitting", desc: "Installation at your property by our stone fitting team." }
            ].map((st, i) => (
              <div
                key={i}
                className={`p-6 rounded-2xl border relative flex flex-col justify-between ${
                  themeMode === "dark" ? "bg-[#18181f] border-neutral-800" : "bg-white border-neutral-200 shadow-sm"
                }`}
              >
                <div>
                  <span className="font-serif text-3xl font-bold text-[#D4AF37] block mb-2">{st.num}</span>
                  <h4 className="text-base font-serif font-bold mb-1">{st.title}</h4>
                  <p className="text-xs text-neutral-400 font-sans leading-relaxed">{st.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-800/40 text-[10px] font-mono text-[#D4AF37] font-bold">
                  Step {i + 1} of 5
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 10. GET AN INSTANT ESTIMATE (QUICK ESTIMATOR) */}
      {/* ========================================================= */}
      <section id="estimator" className={`py-20 px-6 border-b ${
        themeMode === "dark" ? "bg-gradient-to-b from-[#0f0f11] via-[#1a1811] to-[#0f0f11] border-neutral-800" : "bg-amber-50/50 border-amber-200"
      }`}>
        <div className="max-w-5xl mx-auto space-y-10">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-mono font-bold uppercase">
              <Calculator className="w-3.5 h-3.5" /> Request a Quote
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight">Tell Us About Your Worktop</h2>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto">
              Share your kitchen layout specs below and our team will follow up with a price based on your specification.
            </p>
          </div>

          <div className={`p-8 sm:p-10 rounded-3xl border space-y-8 ${
            themeMode === "dark" ? "bg-[#16161a] border-[#D4AF37]/30 shadow-2xl" : "bg-white border-neutral-200 shadow-xl"
          }`}>
            
            {/* Step 1: Layout Shape */}
            <div className="space-y-3">
              <label className="text-xs font-mono font-bold uppercase text-[#D4AF37] block">
                1. Select Kitchen Layout Shape:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(["Island + Straight", "L-Shape", "U-Shape", "Galley", "Single Run"] as const).map((shape) => (
                  <button
                    key={shape}
                    onClick={() => setEstShape(shape)}
                    className={`p-3 rounded-xl border text-xs font-mono font-bold transition-all text-center cursor-pointer ${
                      estShape === shape
                        ? "bg-[#D4AF37] text-neutral-950 border-[#D4AF37] shadow-lg"
                        : "bg-black/30 border-neutral-800 hover:border-neutral-600 text-neutral-300"
                    }`}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Size Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono font-bold uppercase text-[#D4AF37]">
                  2. Approximate Worktop Length:
                </label>
                <span className="text-sm font-mono font-bold text-white bg-black/60 px-3 py-1 rounded-lg border border-neutral-700">
                  {estSizeFeet} Linear Feet ({Math.round(estSizeFeet * 0.3048 * 10) / 10}m)
                </span>
              </div>
              <input
                type="range"
                min={8}
                max={60}
                step={2}
                value={estSizeFeet}
                onChange={(e) => setEstSizeFeet(parseInt(e.target.value))}
                className="w-full accent-[#D4AF37] cursor-pointer"
              />
            </div>

            {/* Step 3: Material & Edge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold uppercase text-[#D4AF37] block">
                  3. Material Family:
                </label>
                <select
                  value={estMaterialType}
                  onChange={(e) => setEstMaterialType(e.target.value)}
                  className="w-full bg-black/40 border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="Quartz">Engineered Quartz (High Durability)</option>
                  <option value="Marble">Natural Italian Marble (Calacatta / Statuario)</option>
                  <option value="Granite">Natural Granite (Heat-Proof)</option>
                  <option value="Porcelain">Sintered Porcelain (Large Format)</option>
                  <option value="Dekton">Ultra-Compact Dekton</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono font-bold uppercase text-[#D4AF37] block">
                  4. Edge Profile Detail:
                </label>
                <select
                  value={estEdge}
                  onChange={(e) => setEstEdge(e.target.value)}
                  className="w-full bg-black/40 border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="Waterfall Mitre">Waterfall Mitre Edge (Luxury Drop)</option>
                  <option value="Ogee Luxury">Ogee Classic Moulding</option>
                  <option value="Pencil Edge">20mm Pencil Edge (Standard)</option>
                  <option value="Bevel Edge">Beveled Edge Profile</option>
                  <option value="Bullnose">Full Bullnose Curved</option>
                </select>
              </div>

            </div>

            {/* Request Quote Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-black via-neutral-900 to-black border border-[#D4AF37]/50 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block">Pricing</span>
                <div className="text-2xl sm:text-3xl font-serif font-bold text-[#D4AF37]">
                  Price on Application
                </div>
                <p className="text-[11px] font-mono text-neutral-400 mt-1">
                  Confirmed by our team after a home survey, based on your exact layout and material.
                </p>
              </div>

              <button
                onClick={() => setShowConsultationModal(true)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-neutral-950 font-mono text-xs font-bold uppercase tracking-wider hover:brightness-110 shadow-lg cursor-pointer"
              >
                Book a Free Survey &rarr;
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 11. BOOK A CONSULTATION */}
      {/* ========================================================= */}
      <section className={`py-20 px-6 border-b ${
        themeMode === "dark" ? "bg-[#121215] border-neutral-800" : "bg-white border-neutral-200"
      }`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
              Expert Consultation
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight">
              Book a Consultation With <br />
              <span className="text-[#D4AF37]">a Master Stonemason</span>
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans">
              Whether you need an on-site survey at your property, a private showroom walkthrough in London or Surrey, or a video call consultation, our stone specialists are at your service.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-neutral-800 bg-black/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-[#D4AF37]" />
                  <div>
                    <h5 className="text-xs font-bold text-white font-serif">1. Free Home Site Visit</h5>
                    <p className="text-[11px] text-neutral-400">Laser survey &amp; sample box delivered to your doorstep.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setConsultationType("Site Visit");
                    setShowConsultationModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#D4AF37] text-black font-mono text-[10px] font-bold uppercase cursor-pointer"
                >
                  Book Site Visit
                </button>
              </div>

              <div className="p-4 rounded-xl border border-neutral-800 bg-black/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-[#D4AF37]" />
                  <div>
                    <h5 className="text-xs font-bold text-white font-serif">2. Showroom Appointment</h5>
                    <p className="text-[11px] text-neutral-400">View full-size 3.2m Italian marble &amp; quartzite slabs in person.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setConsultationType("Showroom");
                    setShowConsultationModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#D4AF37] text-black font-mono text-[10px] font-bold uppercase cursor-pointer"
                >
                  Book Showroom
                </button>
              </div>

              <div className="p-4 rounded-xl border border-neutral-800 bg-black/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Laptop className="w-5 h-5 text-[#D4AF37]" />
                  <div>
                    <h5 className="text-xs font-bold text-white font-serif">3. Video Call Consultation</h5>
                    <p className="text-[11px] text-neutral-400">Discuss CAD blueprints and vein alignment live online.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setConsultationType("Video Call");
                    setShowConsultationModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#D4AF37] text-black font-mono text-[10px] font-bold uppercase cursor-pointer"
                >
                  Book Video Call
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-8 rounded-3xl border border-neutral-800 bg-[#18181c] space-y-6">
            <h3 className="text-2xl font-serif font-bold text-white">Check Your Area</h3>
            <p className="text-xs text-neutral-400 font-sans">Enter your UK postcode and our team will confirm survey availability in your area.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const code = coveragePostcode.toUpperCase().trim();
                if (code.length >= 2) {
                  setCoverageResult({ checked: true, covered: true, area: code });
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="e.g. SW3, W1, GU1, SL4, KT1"
                value={coveragePostcode}
                onChange={(e) => setCoveragePostcode(e.target.value)}
                className="flex-1 bg-black/50 border border-neutral-700 rounded-xl p-3 text-xs font-mono text-white focus:border-[#D4AF37] focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-xl bg-[#D4AF37] text-black font-mono text-xs font-bold uppercase cursor-pointer"
              >
                Submit
              </button>
            </form>

            {coverageResult && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div>
                  <strong>Thanks!</strong> We'll confirm survey availability for {coverageResult.area} when we get in touch.
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 12. CONTACT SECTION & FOOTER */}
      {/* ========================================================= */}
      <section id="contact" className={`py-20 px-6 border-b ${
        themeMode === "dark" ? "bg-[#0a0a0c] border-neutral-800" : "bg-neutral-100 border-neutral-200"
      }`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-5 space-y-6">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
              Get In Touch
            </span>
            <h2 className="text-3xl font-serif font-bold tracking-tight">SMC Pro Stone</h2>

            <div className="space-y-4 text-xs font-sans text-neutral-300">
              <p>
                Use the form to send us your enquiry, or use the postcode checker above to confirm survey availability in
                your area. Contact SMC directly for our current phone, email and showroom details.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 p-8 rounded-3xl border border-neutral-800 bg-[#16161a] space-y-4">
            <h3 className="text-xl font-serif font-bold text-white">Send Direct Message</h3>
            <form onSubmit={(e) => { e.preventDefault(); alert("Thank you! Your message has been sent to our master stonemason team."); }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Full Name *"
                  required
                  className="bg-black/40 border border-neutral-800 rounded-xl p-3 text-xs font-sans text-white focus:border-[#D4AF37] focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Email Address *"
                  required
                  className="bg-black/40 border border-neutral-800 rounded-xl p-3 text-xs font-sans text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
              <textarea
                placeholder="Details about your kitchen, bathroom, or renovation project..."
                rows={3}
                required
                className="w-full bg-black/40 border border-neutral-800 rounded-xl p-3 text-xs font-sans text-white focus:border-[#D4AF37] focus:outline-none resize-none"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-[#D4AF37] text-black font-mono text-xs font-bold uppercase cursor-pointer hover:brightness-110"
              >
                Send Message &rarr;
              </button>
            </form>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 13. FOOTER */}
      {/* ========================================================= */}
      <footer className="py-12 px-6 bg-black text-neutral-400 text-xs border-t border-neutral-800">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-neutral-800">
          
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <img 
                alt="SMC PRO Logo" 
                className="h-7 w-auto object-contain brightness-0 invert" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBXNV_RiofajRHjAoUdeRL9DEe2QkYbM7Tc0A4TQGbDMcjFQw7Q5zg9KIK2ijao316cxP_79D-6J5NzIHqGSsKu4We4TrVBU9wXJ-Oki7eDSGHaKKrZC6H9bitIoGlyNOMKRzOMOxJ7P98OaPN4DFpS7I8k6ifbcEAbyIrTMtqR8d6Yfx7XBkh3itiTP9iEqSYh_FMLknw4CwMtdIRxcCZr-5-A3zhzsZvV5yGDXPOTs9J_FTIffTZ0lCxFXwpnnkh4xJeo_osw6k"
              />
              <span className="font-serif font-bold text-white text-lg">SMC PRO</span>
              <span className="text-[10px] font-mono text-[#D4AF37] uppercase">v3.4.0 Elite</span>
            </div>
            <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
              UK stone fabrication and full-service residential construction management.
            </p>
          </div>

          <div className="space-y-2 font-mono">
            <h5 className="text-xs font-bold text-white uppercase text-[#D4AF37]">Services</h5>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#services" className="hover:text-white">Quartz Worktops</a></li>
              <li><a href="#services" className="hover:text-white">Marble Wall Cladding</a></li>
              <li><a href="#services" className="hover:text-white">Granite Hearths</a></li>
              <li><a href="#services" className="hover:text-white">Kitchen Renovations</a></li>
            </ul>
          </div>

          <div className="space-y-2 font-mono">
            <h5 className="text-xs font-bold text-white uppercase text-[#D4AF37]">Company</h5>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#about" className="hover:text-white">About Us</a></li>
              <li><button onClick={() => setShowFaqModal(true)} className="hover:text-white cursor-pointer">FAQs</button></li>
              <li><button onClick={() => setShowPrivacyModal(true)} className="hover:text-white cursor-pointer">Privacy Policy</button></li>
              <li><button onClick={() => setShowTermsModal(true)} className="hover:text-white cursor-pointer">Terms &amp; Conditions</button></li>
            </ul>
          </div>

          <div className="space-y-2 font-mono">
            <h5 className="text-xs font-bold text-white uppercase text-[#D4AF37]">Connect</h5>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#contact" className="hover:text-white">Contact Stonemason</a></li>
              <li><a href="#estimator" className="hover:text-white">Request a Quote</a></li>
              <li><button onClick={() => setShowAiBotDrawer(true)} className="hover:text-white text-[#D4AF37] cursor-pointer">Ask AI Stonemason</button></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono gap-4">
          <span>© {new Date().getFullYear()} SMC Pro Stone &amp; Construction. All rights reserved.</span>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* AI CHATBOT FLOATING WIDGET BUTTON */}
      {/* ========================================================= */}
      <button
        onClick={() => setShowAiBotDrawer(true)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-neutral-950 font-bold shadow-2xl hover:scale-105 transition-transform flex items-center gap-2 cursor-pointer border border-white/20"
        title="Ask AI Master Stonemason"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="hidden sm:inline font-mono text-xs uppercase tracking-wider">Ask AI Stonemason</span>
      </button>

      {/* ========================================================= */}
      {/* AI CHATBOT DRAWER */}
      {/* ========================================================= */}
      {showAiBotDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#16161a] border-l border-neutral-800 h-full flex flex-col justify-between p-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-lg font-serif font-bold text-white">SMC Stone AI Assistant</h3>
              </div>
              <button onClick={() => setShowAiBotDrawer(false)} className="text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 font-sans text-xs">
              {aiChatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl max-w-[85%] ${
                    msg.sender === "user" ? "bg-[#D4AF37] text-black ml-auto font-medium" : "bg-neutral-800 text-neutral-200"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendAiMessage} className="pt-4 border-t border-neutral-800 flex gap-2">
              <input
                type="text"
                placeholder="Ask about Quartz vs Marble, cost per sqm..."
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                className="flex-1 bg-black/50 border border-neutral-700 rounded-xl p-3 text-xs text-white focus:outline-none"
              />
              <button type="submit" className="px-4 bg-[#D4AF37] text-black font-bold rounded-xl cursor-pointer">
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CONSULTATION BOOKING MODAL */}
      {/* ========================================================= */}
      {showConsultationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#18181c] border border-[#D4AF37]/40 rounded-3xl p-8 space-y-6 relative text-white">
            <button
              onClick={() => setShowConsultationModal(false)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Free Appointment</span>
              <h3 className="text-2xl font-serif font-bold">Book a Consultation ({consultationType})</h3>
            </div>

            {consultSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-3 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto" />
                <h4 className="text-lg font-serif font-bold text-white">Consultation Requested!</h4>
                <p className="text-xs text-neutral-300">
                  Our team will be in touch to confirm your appointment.
                </p>
                <button
                  onClick={() => {
                    setConsultSuccess(false);
                    setShowConsultationModal(false);
                  }}
                  className="px-6 py-2 bg-[#D4AF37] text-black font-mono text-xs font-bold rounded-xl cursor-pointer uppercase"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setConsultSuccess(true);
                }}
                className="space-y-4 text-xs font-sans"
              >
                <div>
                  <label className="block text-neutral-400 font-mono text-[10px] uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={consultName}
                    onChange={(e) => setConsultName(e.target.value)}
                    placeholder="Full name"
                    className="w-full bg-black/50 border border-neutral-700 rounded-xl p-3 text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-400 font-mono text-[10px] uppercase mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={consultPhone}
                      onChange={(e) => setConsultPhone(e.target.value)}
                      placeholder="+44 7700 900882"
                      className="w-full bg-black/50 border border-neutral-700 rounded-xl p-3 text-white focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 font-mono text-[10px] uppercase mb-1">Postcode *</label>
                    <input
                      type="text"
                      required
                      value={consultPostcode}
                      onChange={(e) => setConsultPostcode(e.target.value)}
                      placeholder="e.g. SW3 1NY"
                      className="w-full bg-black/50 border border-neutral-700 rounded-xl p-3 text-white focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-neutral-400 font-mono text-[10px] uppercase mb-1">Preferred Date</label>
                  <input
                    type="date"
                    value={consultDate}
                    onChange={(e) => setConsultDate(e.target.value)}
                    className="w-full bg-black/50 border border-neutral-700 rounded-xl p-3 text-white focus:border-[#D4AF37] focus:outline-none font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#D4AF37] text-neutral-950 font-mono text-xs font-bold uppercase tracking-wider hover:brightness-110 cursor-pointer"
                >
                  Confirm Consultation Booking &rarr;
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MATERIAL SPECIFICATION MODAL */}
      {/* ========================================================= */}
      {selectedMaterialDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#18181c] border border-[#D4AF37]/50 rounded-3xl p-8 space-y-6 relative text-white">
            <button
              onClick={() => setSelectedMaterialDetailModal(null)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 border-b border-neutral-800 pb-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-black shrink-0">
                <img
                  src={selectedMaterialDetailModal.img || selectedMaterialDetailModal.image || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80"}
                  alt={selectedMaterialDetailModal.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">{selectedMaterialDetailModal.class}</span>
                <h3 className="text-2xl font-serif font-bold">{selectedMaterialDetailModal.name}</h3>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  Price on Application
                </span>
              </div>
            </div>

            <div className="space-y-4 text-xs font-sans text-neutral-300">
              <p><strong>Technical Overview:</strong> {selectedMaterialDetailModal.technicalDetails}</p>
              <p><strong>Fabrication Guidance:</strong> {selectedMaterialDetailModal.fabricationNotes}</p>
              
              <div className="grid grid-cols-2 gap-4 p-4 bg-black/40 rounded-xl border border-neutral-800 font-mono">
                <div>
                  <span className="text-neutral-500 uppercase block">Mohs Hardness</span>
                  <span className="text-white font-bold">{selectedMaterialDetailModal.mohs}</span>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase block">Water Absorption</span>
                  <span className="text-white font-bold">{selectedMaterialDetailModal.waterAbsorption}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-neutral-800">
              <button
                onClick={() => {
                  setSelectedMaterialDetailModal(null);
                  onExploreAsGuest();
                }}
                className="flex-1 py-3 bg-[#D4AF37] text-black font-mono text-xs font-bold rounded-xl uppercase cursor-pointer text-center"
              >
                Inspect in Studio Workspace
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
