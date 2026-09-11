import React, { useState, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  Layers,
  Building2,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  PackageCheck,
  Send,
  Heart,
  Maximize2,
  X,
  FileText,
  MessageSquare,
  Compass,
  Box,
  Share2,
  BookOpen
} from "lucide-react";
import { Project } from "../App";

export interface CuratorStone {
  id: string;
  name: string;
  category: "Marble" | "Quartzite" | "Granite" | "Porcelain" | "Onyx" | "Quartz";
  thickness: string;
  finishes: string[];
  mohs: number;
  waterAbsorption: string;
  badge?: "EXCLUSIVE" | "RARE FIND" | "NEW ARRIVAL" | "MUSEUM GRADE" | "LIMITED";
  image: string;
  description: string;
  dimensions: string;
  applications: string[];
  veiningType: string;
}

export const CURATED_STONES: CuratorStone[] = [
  {
    id: "statuario-supremo",
    name: "Statuario Supremo",
    category: "Marble",
    thickness: "20mm / 30mm",
    finishes: ["Polished", "Honed"],
    mohs: 3.5,
    waterAbsorption: "0.12%",
    badge: "EXCLUSIVE",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD5g6eueBnteCes_xB7ivdyqi4mTYnY8S6nkYwABgVqxb3_UcPEG1j2FlTSSXsB8aD-l27V50OLm0icekcj60i66Nvef1yfq-oHP5B6K8JEZO-17gNE2WpZtJ-q7rF0auYczhoi3eZxgyIupZ9VHaL0DdXXF4UcnMROev4nYLzgKYtAfVTPjySOFDxLx13XKbTX9cjXQYy8C_N8ENL0iKrk5AgP8D2es1uanGAnwdMeEUEwvNrvMTG_",
    description: "Extracted from the prestigious Mount Altissimo in Carrara. Features a luminous white background fractured by bold, dramatic graphite veining.",
    dimensions: "3250 × 1880 mm",
    applications: ["Kitchen Worktops", "Master Bathrooms", "Feature Walls", "Book-matched Fireplaces"],
    veiningType: "Dramatic Feathered Graphite"
  },
  {
    id: "nero-marquina",
    name: "Nero Marquina",
    category: "Marble",
    thickness: "30mm",
    finishes: ["Polished", "Leathered"],
    mohs: 4.0,
    waterAbsorption: "0.18%",
    badge: "MUSEUM GRADE",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHP-kkLXRS8ZmE9e21VXBSRPgAiL-LNVD7Uscs52PrQTChdOdgrtyowvPUFzCrPbZxHLkP2AaIakYTOEb-b0-jZzr1m5WBqNG_Qk49QT5g0mGUeOCcq89VFWfeBedUxoQrDVJ791AVf-m_fsmfVLaMT-LJy3P8rnW98GMMNm8tMIzVe1gCDSjQYEow1SsN0MtUK4QOfDkiy168oTei4r12yXS-nRmrfpNH0zE62J_VVucL-djzF24L",
    description: "Profound, obsidian-black marble fractured by lightning-sharp pure white veins. Photographed in high-definition studio lighting for museum clarity.",
    dimensions: "3100 × 1750 mm",
    applications: ["Bar Countertops", "Powder Rooms", "Architectural Columns", "Luxury Flooring"],
    veiningType: "Crystalline Fractured White"
  },
  {
    id: "azul-bahia",
    name: "Azul Bahia Exotic",
    category: "Granite",
    thickness: "20mm",
    finishes: ["Polished"],
    mohs: 6.5,
    waterAbsorption: "0.08%",
    badge: "RARE FIND",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDMpUnSfUt-xLtCJN3cp4zxQMHa8ebO6qlRdFTR9JKBQrG3ZouFfsBRgPqwIZY3b_PrsWSNYpgzhja7DuOkdkdaQNVRzeFKe01a3Tgq14mlFBE1ZbVVWAKou2oy68xETQfTgp9SP00M_0j_fYvrw3xm_xtLUBTGZcRQWRSMeLnfN2oShvySx25a9enLYXk1SGCFpw1ftdY1F58VhCvkHAQDBvtt2wVdvgwSlMM75U96onM_14a4-iew",
    description: "Mesmerizing natural sodalite granite with deep cobalt and indigo swirls infused with specks of golden pyrite and quartz.",
    dimensions: "2980 × 1650 mm",
    applications: ["Feature Islands", "Bespoke Bars", "Yacht Interiors"],
    veiningType: "Cobalt Sodalite Swirls"
  },
  {
    id: "calacatta-gold-supreme",
    name: "Calacatta Gold Reserve",
    category: "Marble",
    thickness: "20mm / 30mm",
    finishes: ["Polished", "Honed", "Silk Touch"],
    mohs: 3.5,
    waterAbsorption: "0.10%",
    badge: "EXCLUSIVE",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBYqV2IpkNkRG2EXIxFcWcZ2a-Z_lbf6Ax4yIdhsIvcZ3fal5g929ifsWjxejSY5dBFrHGsT0ZdysvQy9KE3_8iPw2iVsg8byM0rMey6a4mnznXz1yQaNLYirFzNeW6BKfaDHqY35pfL2DJRGFG_ZjE9xF4XCowIRhmfnQHRttmsXwd7O-_PRdk9TCSAeBQ0YTEQUtUEDC2qvHlMIqG594U8zEm8yai_7_3iXcU2DHBs9jZZE3EwmAd",
    description: "The crown jewel of Italian quarrying. Warm taupe and champagne gold veins dance across a creamy translucent white marble field.",
    dimensions: "3300 × 1950 mm",
    applications: ["Chef Countertops", "Waterfall Islands", "Vanity Tops"],
    veiningType: "Warm Gold & Taupe Ribbon"
  },
  {
    id: "taj-mahal-quartzite",
    name: "Taj Mahal Translucent",
    category: "Quartzite",
    thickness: "20mm / 30mm",
    finishes: ["Leathered", "Polished"],
    mohs: 7.0,
    waterAbsorption: "0.04%",
    badge: "NEW ARRIVAL",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    description: "Extreme hardness meeting ethereal ivory translucency. Highly resistant to acids, scratches, and heat. Ideal for heavy culinary use.",
    dimensions: "3200 × 1850 mm",
    applications: ["High-Traffic Kitchens", "Outdoor Kitchens", "Bar Counters"],
    veiningType: "Subtle Warm Caramel Striations"
  },
  {
    id: "patagonia-crystal",
    name: "Patagonia Crystal Quartzite",
    category: "Quartzite",
    thickness: "30mm",
    finishes: ["Polished", "Backlit Honed"],
    mohs: 7.0,
    waterAbsorption: "0.03%",
    badge: "LIMITED",
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    description: "A geological wonder comprising translucent quartz crystals fused with dark basalt inclusions. Spectacular when backlit with warm LED panels.",
    dimensions: "3150 × 1780 mm",
    applications: ["Backlit Bar Fronts", "Feature Walls", "Reception Desks"],
    veiningType: "Crystalline Translucent Feldspar"
  }
];

interface DigitalCuratorViewProps {
  onNavigateTab: (tab: string) => void;
  onNavigateToEstimator?: (materialId?: string) => void;
  projects?: Project[];
  onBindMaterialToProject?: (projectId: string, materialName: string) => void;
  userEmail?: string;
  onOpenAppointmentModal?: () => void;
}

export default function DigitalCuratorView({
  onNavigateTab,
  onNavigateToEstimator,
  projects = [],
  onBindMaterialToProject,
  userEmail = "architect@smcpro.co.uk",
  onOpenAppointmentModal
}: DigitalCuratorViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStone, setSelectedStone] = useState<CuratorStone | null>(null);
  const [targetProjectId, setTargetProjectId] = useState<string>("");
  const [curatorAiInput, setCuratorAiInput] = useState<string>("");
  const [curatorAiResponse, setCuratorAiResponse] = useState<string | null>(null);
  const [sampleKitDispatched, setSampleKitDispatched] = useState<boolean>(false);
  const [savedFavorites, setSavedFavorites] = useState<string[]>(["statuario-supremo"]);

  // Filtered stones
  const filteredStones = useMemo(() => {
    return CURATED_STONES.filter((stone) => {
      const matchesCat = selectedCategory === "All" || stone.category === selectedCategory;
      const matchesSearch =
        stone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stone.veiningType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const toggleFavorite = (id: string) => {
    setSavedFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDispatchSampleKit = (stoneName: string) => {
    setSampleKitDispatched(true);
    setTimeout(() => {
      setSampleKitDispatched(false);
    }, 4000);
  };

  const handleAskCuratorAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!curatorAiInput.trim()) return;
    const q = curatorAiInput.toLowerCase();
    let ans = "As Curator AI, I recommend selecting a 30mm polished slab with wet-cut waterjet joints. Statuario Supremo and Taj Mahal Quartzite suit high-traffic luxury specifications.";

    if (q.includes("stain") || q.includes("acid") || q.includes("lemon")) {
      ans = "Marble (Statuario/Calacatta) requires sealing with a hydro-repellent impregnator. For higher acid-stain resistance, consider Taj Mahal Quartzite (Mohs 7) or our porcelain range.";
    } else if (q.includes("book") || q.includes("match") || q.includes("vein")) {
      ans = "Book-matching requires sequential A/B slab quarry pairs. Statuario Supremo and Calacatta Gold slabs can be mirrored in sequence for continuous veining along large island drops — vein alignment is confirmed during your survey.";
    } else if (q.includes("price") || q.includes("cost") || q.includes("budget")) {
      ans = "Pricing is confirmed by our team based on your specification — use the Calculate Quote action on a stone to request one.";
    }
    
    setCuratorAiResponse(ans);
  };

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-[#E2E2E2] font-sans antialiased selection:bg-[#D4AF37] selection:text-black pb-24">
      
      {/* ========================================================= */}
      {/* TOP CURATOR NAVIGATION HEADER (DESKTOP & MOBILE) */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 bg-[#0E0E0E]/90 backdrop-blur-xl border-b border-[#353535] px-4 md:px-12 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#D4AF37]/10 border border-[#D4AF37] flex items-center justify-center p-1 overflow-hidden shadow-sm">
              <Compass className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <span className="font-serif text-xl font-bold tracking-tight text-[#D4AF37] block leading-none">
                SMC PRO
              </span>
              <span className="text-[9px] font-mono tracking-widest text-neutral-400 uppercase block mt-0.5">
                Digital Curator Vault
              </span>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={() => onNavigateTab("vault")}
            className="text-xs font-mono uppercase tracking-widest text-[#D4AF37] border-b border-[#D4AF37] pb-1 font-bold"
          >
            Vault
          </button>
          <button
            onClick={() => onNavigateTab("projects")}
            className="text-xs font-mono uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
          >
            Projects
          </button>
          <button
            onClick={() => onNavigateTab("technical-library")}
            className="text-xs font-mono uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
          >
            Technical
          </button>
          <button
            onClick={() => onNavigateTab("estimator")}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#b59226] text-[#0E0E0E] text-xs font-mono uppercase tracking-widest font-bold rounded transition-colors flex items-center gap-2 cursor-pointer shadow-md"
          >
            <FileText className="w-3.5 h-3.5" /> Online Quote
          </button>
        </nav>

        {/* User Badge */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs font-mono text-neutral-400">{userEmail}</span>
          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37] font-bold text-xs">
            AP
          </div>
        </div>
      </header>

      {/* Toast Notification for Sample Kit */}
      {sampleKitDispatched && (
        <div className="fixed top-24 right-6 z-50 bg-[#1A1A1A] border border-[#D4AF37] text-white p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in">
          <CheckCircle2 className="w-6 h-6 text-[#D4AF37] shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider font-mono">Sample Request Received</h4>
            <p className="text-xs text-neutral-300">Our team will confirm availability and arrange dispatch.</p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* HERO SECTION: THE DIGITAL CURATOR */}
      {/* ========================================================= */}
      <section className="w-full px-4 md:px-12 pt-8 md:pt-14 pb-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-[#D4AF37]">
                Museum-Grade Natural &amp; Engineered Stone
              </span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white font-normal leading-tight tracking-tight">
              The Digital <span className="text-[#D4AF37] italic font-serif">Curator</span>
            </h1>

            <p className="font-sans text-base text-neutral-300 leading-relaxed max-w-xl font-light">
              A museum-grade repository of the world's most exceptional stone. Curated for the discerning architect, master interior designer, and luxury property developer.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="#curated-vault"
                className="px-6 py-3.5 bg-[#D4AF37] text-black font-mono text-xs uppercase tracking-widest font-bold rounded hover:bg-[#b59226] transition-all flex items-center gap-2 cursor-pointer shadow-lg"
              >
                Explore Vault <ArrowRight className="w-4 h-4" />
              </a>
              <button
                onClick={() => handleDispatchSampleKit("Full Vault")}
                className="px-6 py-3.5 bg-transparent border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-mono text-xs uppercase tracking-widest font-bold rounded transition-all flex items-center gap-2 cursor-pointer"
              >
                <PackageCheck className="w-4 h-4" /> Request Sample Kit
              </button>
            </div>
          </div>

          {/* Hero Featured Stone Showcase */}
          <div className="lg:col-span-6 relative aspect-[4/3] rounded-xl overflow-hidden border border-[#353535] shadow-2xl group">
            <div
              className="w-full h-full bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBYqV2IpkNkRG2EXIxFcWcZ2a-Z_lbf6Ax4yIdhsIvcZ3fal5g929ifsWjxejSY5dBFrHGsT0ZdysvQy9KE3_8iPw2iVsg8byM0rMey6a4mnznXz1yQaNLYirFzNeW6BKfaDHqY35pfL2DJRGFG_ZjE9xF4XCowIRhmfnQHRttmsXwd7O-_PRdk9TCSAeBQ0YTEQUtUEDC2qvHlMIqG594U8zEm8yai_7_3iXcU2DHBs9jZZE3EwmAd')"
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 bg-[#1A1A1A]/90 backdrop-blur-md p-5 rounded-lg border border-[#353535] shadow-lg flex justify-between items-end">
              <div>
                <span className="font-mono text-[10px] text-[#D4AF37] tracking-widest uppercase font-bold block mb-1">
                  Featured Stone
                </span>
                <h3 className="font-serif text-xl font-bold text-white">Calacatta Gold Reserve</h3>
                <p className="font-mono text-xs text-neutral-400">Translucent Crystalline • 30mm</p>
              </div>
              <button
                onClick={() => setSelectedStone(CURATED_STONES[3])}
                className="px-3.5 py-1.5 bg-[#D4AF37] text-black font-mono text-[11px] font-bold uppercase tracking-wider rounded hover:bg-white transition-all cursor-pointer"
              >
                Inspect Slab
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* NEW ARRIVALS & RARE FINDS (HORIZONTAL CAROUSEL) */}
      {/* ========================================================= */}
      <section className="w-full py-12 bg-[#1A1A1A] border-y border-[#353535]">
        <div className="px-4 md:px-12 max-w-7xl mx-auto mb-6 flex justify-between items-end">
          <div>
            <span className="font-mono text-xs text-[#D4AF37] tracking-widest uppercase font-bold block">Exclusive Curations</span>
            <h2 className="font-serif text-2xl sm:text-3xl text-white font-normal">New Arrivals &amp; Rare Slabs</h2>
          </div>
          <a href="#curated-vault" className="text-xs font-mono uppercase tracking-widest text-[#D4AF37] hover:underline flex items-center gap-1">
            View All ({CURATED_STONES.length}) <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        <div className="w-full overflow-x-auto hide-scrollbar px-4 md:px-12 pb-4">
          <div className="flex gap-6 w-max max-w-none">
            {CURATED_STONES.map((stone) => (
              <div
                key={stone.id}
                onClick={() => setSelectedStone(stone)}
                className="w-72 sm:w-80 flex flex-col group cursor-pointer shrink-0"
              >
                <div className="w-full aspect-square bg-black border border-[#353535] rounded-lg overflow-hidden relative mb-3">
                  <div
                    className="w-full h-full bg-cover bg-center transform group-hover:scale-105 transition-transform duration-700"
                    style={{ backgroundImage: `url(${stone.image})` }}
                  />
                  {stone.badge && (
                    <div className="absolute top-3 left-3 z-20 px-2.5 py-1 bg-[#D4AF37] text-black font-mono text-[9px] font-bold tracking-widest uppercase rounded">
                      {stone.badge}
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(stone.id);
                    }}
                    className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:text-rose-500 transition-colors"
                  >
                    <Heart className={`w-4 h-4 ${savedFavorites.includes(stone.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                  </button>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-wider">Click to view specs &amp; bind to project</span>
                  </div>
                </div>

                <h3 className="font-serif text-lg font-bold text-white group-hover:text-[#D4AF37] transition-colors">{stone.name}</h3>
                <p className="font-mono text-xs text-neutral-400">{stone.category} • {stone.thickness}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-mono text-[#D4AF37] font-bold">Price on Application</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* CURATED VAULT SEARCH & FILTER ENGINE */}
      {/* ========================================================= */}
      <section id="curated-vault" className="w-full px-4 md:px-12 py-12 max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#353535] pb-6">
          <div>
            <h2 className="font-serif text-3xl text-white font-normal">Vault Collection</h2>
            <p className="font-mono text-xs text-neutral-400 mt-1">Filter by geological origin, surface finish, and technical hardness specs.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search stone or origin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#353535] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 rounded pl-9 pr-4 py-2 text-xs text-white transition-all font-mono"
              />
            </div>

            {/* Category Filter Buttons */}
            <div className="flex flex-wrap gap-1.5 bg-[#1A1A1A] p-1 border border-[#353535] rounded-lg">
              {["All", "Marble", "Quartzite", "Granite", "Porcelain", "Onyx"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-[#D4AF37] text-black shadow-xs"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vault Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredStones.map((stone) => (
            <div
              key={stone.id}
              className="bg-[#131313] border border-[#353535] rounded-xl overflow-hidden hover:border-[#D4AF37]/70 transition-all flex flex-col justify-between group shadow-xl"
            >
              <div>
                <div
                  onClick={() => setSelectedStone(stone)}
                  className="w-full aspect-[4/3] bg-black relative overflow-hidden cursor-pointer"
                >
                  <div
                    className="w-full h-full bg-cover bg-center transform group-hover:scale-105 transition-transform duration-700"
                    style={{ backgroundImage: `url(${stone.image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                  
                  {stone.badge && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 bg-[#D4AF37] text-black font-mono text-[9px] font-bold tracking-widest uppercase rounded">
                      {stone.badge}
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end text-white">
                    <h3 className="font-serif text-xl font-bold">{stone.name}</h3>
                    <span className="text-xs font-mono font-bold text-[#D4AF37]">Price on Application</span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                    {stone.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 py-2 border-y border-[#353535] text-[11px] font-mono">
                    <div>
                      <span className="text-neutral-500 uppercase block">Mohs Hardness</span>
                      <span className="text-white font-bold">{stone.mohs} / 10</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 uppercase block">Water Absorb</span>
                      <span className="text-white font-bold">{stone.waterAbsorption}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 uppercase block">Thickness</span>
                      <span className="text-white font-bold">{stone.thickness}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold block">Ideal Applications</span>
                    <div className="flex flex-wrap gap-1">
                      {stone.applications.map((app, i) => (
                        <span key={i} className="text-[10px] font-mono bg-[#1A1A1A] border border-[#353535] text-neutral-300 px-2 py-0.5 rounded">
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0 flex gap-2">
                <button
                  onClick={() => setSelectedStone(stone)}
                  className="flex-1 bg-[#1A1A1A] hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black border border-[#D4AF37]/50 py-2.5 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Spec Details
                </button>
                <button
                  onClick={() => {
                    if (onNavigateToEstimator) {
                      onNavigateToEstimator(stone.id);
                    } else {
                      onNavigateTab("estimator");
                    }
                  }}
                  className="bg-[#D4AF37] hover:bg-[#b59226] text-black px-4 py-2.5 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  title="Estimate cost with this material"
                >
                  Quote
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* AI CURATOR CONSULTATION & COMPATIBILITY ADVISOR */}
      {/* ========================================================= */}
      <section className="w-full px-4 md:px-12 py-12 max-w-7xl mx-auto">
        <div className="bg-[#131313] border border-[#353535] rounded-xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-white">Ask Digital Curator AI</h3>
              <p className="font-mono text-xs text-neutral-400">Get instant advice on material compatibility, acid resistance, book-matching pairs, and CNC edge profiles.</p>
            </div>
          </div>

          <form onSubmit={handleAskCuratorAi} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="e.g., Is Statuario Supremo suitable for heavy kitchen cooking?"
              value={curatorAiInput}
              onChange={(e) => setCuratorAiInput(e.target.value)}
              className="flex-1 bg-[#1A1A1A] border border-[#353535] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 rounded px-4 py-3 text-xs text-white transition-all font-mono"
            />
            <button
              type="submit"
              className="bg-[#D4AF37] hover:bg-[#b59226] text-black px-6 py-3 rounded font-mono text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" /> Ask Curator
            </button>
          </form>

          {curatorAiResponse && (
            <div className="bg-[#1A1A1A] border-l-2 border-[#D4AF37] p-4 rounded-r-lg space-y-2 animate-fade-in">
              <span className="font-mono text-[10px] text-[#D4AF37] uppercase tracking-widest font-bold block">Curator AI Technical Recommendation</span>
              <p className="font-sans text-xs text-neutral-200 leading-relaxed font-light">
                {curatorAiResponse}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* SLAB SPECIFICATION DETAILS MODAL */}
      {/* ========================================================= */}
      {selectedStone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#131313] border border-[#353535] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto text-white shadow-2xl relative">
            
            <button
              onClick={() => setSelectedStone(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 border border-neutral-700 hover:border-white flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 md:p-8">
              {/* Image Showcase */}
              <div className="md:col-span-6 space-y-4">
                <div className="aspect-[4/3] rounded-xl overflow-hidden border border-[#353535] relative bg-black">
                  <img
                    src={selectedStone.image}
                    alt={selectedStone.name}
                    className="w-full h-full object-cover"
                  />
                  {selectedStone.badge && (
                    <span className="absolute top-3 left-3 px-3 py-1 bg-[#D4AF37] text-black font-mono text-[10px] font-bold tracking-widest uppercase rounded">
                      {selectedStone.badge}
                    </span>
                  )}
                </div>

                <div className="bg-[#1A1A1A] border border-[#353535] p-4 rounded-xl space-y-2 font-mono text-xs">
                  <div className="flex justify-between border-b border-[#353535] pb-2">
                    <span className="text-neutral-400">Slab Dimensions:</span>
                    <span className="text-white font-bold">{selectedStone.dimensions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Veining Character:</span>
                    <span className="text-white font-bold">{selectedStone.veiningType}</span>
                  </div>
                </div>
              </div>

              {/* Details & Actions */}
              <div className="md:col-span-6 space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <span className="font-mono text-xs text-[#D4AF37] uppercase tracking-widest font-bold">{selectedStone.category}</span>
                    <h2 className="font-serif text-3xl font-normal text-white">{selectedStone.name}</h2>
                  </div>

                  <p className="font-sans text-xs text-neutral-300 leading-relaxed">
                    {selectedStone.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 bg-[#1A1A1A] p-3 rounded-lg border border-[#353535] font-mono text-center">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">Mohs</span>
                      <span className="text-sm font-bold text-white">{selectedStone.mohs}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">Water Abs.</span>
                      <span className="text-sm font-bold text-white">{selectedStone.waterAbsorption}</span>
                    </div>
                  </div>

                  {/* Project Binding */}
                  {projects.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#353535]">
                      <label className="block font-mono text-[10px] uppercase text-[#D4AF37] font-bold">
                        Bind this Stone to Project Pipeline
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={targetProjectId}
                          onChange={(e) => setTargetProjectId(e.target.value)}
                          className="flex-1 bg-[#1A1A1A] border border-[#353535] focus:border-[#D4AF37] rounded px-3 py-2 text-xs text-white font-mono"
                        >
                          <option value="">-- Select Project --</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button
                          disabled={!targetProjectId}
                          onClick={() => {
                            if (targetProjectId && onBindMaterialToProject) {
                              onBindMaterialToProject(targetProjectId, selectedStone.name);
                              setSelectedStone(null);
                            }
                          }}
                          className="bg-[#D4AF37] hover:bg-[#b59226] disabled:bg-neutral-800 disabled:text-neutral-500 text-black px-4 py-2 rounded font-mono text-xs font-bold uppercase transition-all"
                        >
                          Bind
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-[#353535]">
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-xs text-neutral-400">Pricing:</span>
                    <span className="text-lg font-bold text-[#D4AF37]">Price on Application</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        handleDispatchSampleKit(selectedStone.name);
                        setSelectedStone(null);
                      }}
                      className="w-full bg-[#1A1A1A] hover:bg-neutral-800 text-[#D4AF37] border border-[#D4AF37]/50 py-3 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <PackageCheck className="w-4 h-4" /> Order Sample Kit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStone(null);
                        if (onNavigateToEstimator) {
                          onNavigateToEstimator(selectedStone.id);
                        } else {
                          onNavigateTab("estimator");
                        }
                      }}
                      className="w-full bg-[#D4AF37] hover:bg-[#b59226] text-black py-3 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <FileText className="w-4 h-4" /> Calculate Quote
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
