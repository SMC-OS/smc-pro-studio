import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Layers,
  Clock,
  Check,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Info,
  Building,
  CheckCircle2,
  X,
  Lock,
  Download,
  Percent
} from "lucide-react";
import { Project } from "../App";

interface SlabBlock {
  id: string;
  blockCode: string;
  name: string;
  origin: string;
  rarityScore: number;
  dimensions: string;
  availableSlabs: number;
  originalPrice: number;
  tradePrice: number;
  image: string;
  exclusive?: boolean;
  lowStock?: boolean;
  materialType: "Marble" | "Quartzite" | "Porcelain" | "Granite";
}

const INITIAL_SLAB_BLOCKS: SlabBlock[] = [
  {
    id: "block-1",
    blockCode: "BLOCK 882-A",
    name: "Calacatta Borghini",
    origin: "Carrara, Italy",
    rarityScore: 9.8,
    dimensions: "3200 x 1900 x 20mm",
    availableSlabs: 12,
    originalPrice: 24500,
    tradePrice: 19845,
    exclusive: true,
    materialType: "Marble",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC1rySmxJtQUHwSsf1BH7_B6SWC9c0k1CGi2nQZdAJf_mVlBKYDfgkheXlQUNqEqjPn8xyI72QNzZI847Ew4ZUXvnbzWZua6ITdKjQuKoP6EzNVeaXYMAU4yF3up-D8LI_6BPD6g30_yUdsk7c-pUT8227cM38FAzhs0a7ZFWCgRWb4GsybOg4UsLSjaWzS3y4RLWbR7-hSw8E3Kmh8u4lI5meq8uwgjeS8ajk6ghN-00KbFRfWrd60gAs1qUX-kburHRRy36iVBl8"
  },
  {
    id: "block-2",
    blockCode: "BLOCK Q-441",
    name: "Taj Mahal Select",
    origin: "Espirito Santo, Brazil",
    rarityScore: 8.4,
    dimensions: "3100 x 1850 x 30mm",
    availableSlabs: 8,
    originalPrice: 16500,
    tradePrice: 14200,
    materialType: "Quartzite",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBW_bS64b4dg6CHn0UZ-q9p3kLdgNbpb9b-k9Kk-6Vhg6c-KxD7QuVD1m_APMWKWLJPYHjvxYLA8SHcjaazoBag22Mxr310QV0QxdxgEgmkvzNrY6m4cw9ybYNFroU1NM3xeFJjDP6SLMPO4mfEkUNFjGtP7J0SuEcwMmGlY0obFRExyuNMq-aDykyNLuismRhdEne1PTAq8iB0UO4scYmGknLMHlUv0FzsloBSFGaj3-mZsCwqEIE5oQcWd2Oj49C2RB_KVL6j1d0"
  },
  {
    id: "block-3",
    blockCode: "BLOCK NM-901",
    name: "Nero Marquina",
    origin: "Markina, Spain",
    rarityScore: 7.9,
    dimensions: "2900 x 1700 x 20mm",
    availableSlabs: 3,
    originalPrice: 10500,
    tradePrice: 8950,
    lowStock: true,
    materialType: "Marble",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD_4RrqSv_-VtNpXpYvfge7tLq1tCQwd1uGotV3SAqeo6cMkAmZGiIa7Fkrcgc9HE1326cP4w0LqalRWzytxoBPRv9QA1vsEvjsX1B4ug0nADmx9S__I7ESyJT-rGHyue0rLcKqo9o23vPUvYBcFGwL3gaallARj5R99anvieN3O7EMMn-ewr8vQPQp6-yiBLLhyAmZ94A7CbP_WF1gwAjVOG9eIoDV45b3lghJY209h1PoOJrCutFFwQWV16AQccHZrGBKrM2IkJE"
  },
  {
    id: "block-4",
    blockCode: "BLOCK ST-104",
    name: "Statuario Extra Sintered",
    origin: "Modena, Italy",
    rarityScore: 9.1,
    dimensions: "3200 x 1600 x 12mm",
    availableSlabs: 15,
    originalPrice: 13800,
    tradePrice: 11500,
    exclusive: true,
    materialType: "Porcelain",
    image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "block-5",
    blockCode: "BLOCK EQ-702",
    name: "Emerald Quartzite Master",
    origin: "Ceará, Brazil",
    rarityScore: 9.5,
    dimensions: "3050 x 1950 x 20mm",
    availableSlabs: 5,
    originalPrice: 28000,
    tradePrice: 22400,
    materialType: "Quartzite",
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "block-6",
    blockCode: "BLOCK PG-330",
    name: "Pietra Grey Velvet",
    origin: "Isfahan, Iran",
    rarityScore: 8.2,
    dimensions: "2850 x 1650 x 20mm",
    availableSlabs: 9,
    originalPrice: 11200,
    tradePrice: 9400,
    materialType: "Marble",
    image: "https://images.unsplash.com/photo-1545464693-f1798a373343?auto=format&fit=crop&w=800&q=80"
  }
];

interface BulkSlabReserveViewProps {
  projects: Project[];
  onNavigateToProject?: (projId: string) => void;
}

export default function BulkSlabReserveView({
  projects,
  onNavigateToProject
}: BulkSlabReserveViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("ALL");
  const [selectedOrigin, setSelectedOrigin] = useState<string>("ALL");
  
  // Track reserved block IDs & assigned project
  const [reservedBlockIds, setReservedBlockIds] = useState<string[]>(["block-1", "block-2", "block-3"]);
  const [assignedProjects, setAssignedProjects] = useState<Record<string, string>>({
    "block-1": "Mayfair Penthouse",
    "block-2": "Knightsbridge Estate",
    "block-3": "Belgravia Modern"
  });

  // Countdown timer in seconds (14:59 = 899 seconds)
  const [timerSeconds, setTimerSeconds] = useState(899);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmedData, setConfirmedData] = useState<any>(null);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Toggle reserve status
  const toggleReserve = (blockId: string) => {
    setReservedBlockIds((prev) =>
      prev.includes(blockId) ? prev.filter((id) => id !== blockId) : [...prev, blockId]
    );
  };

  const handleProjectSelect = (blockId: string, projName: string) => {
    setAssignedProjects((prev) => ({ ...prev, [blockId]: projName }));
  };

  // Filter slabs
  const filteredSlabs = INITIAL_SLAB_BLOCKS.filter((block) => {
    const matchesSearch =
      block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.blockCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.origin.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMaterial =
      selectedMaterial === "ALL" || block.materialType === selectedMaterial;

    const matchesOrigin =
      selectedOrigin === "ALL" || block.origin.toLowerCase().includes(selectedOrigin.toLowerCase());

    return matchesSearch && matchesMaterial && matchesOrigin;
  });

  // Calculate total selected metrics
  const selectedBlocks = INITIAL_SLAB_BLOCKS.filter((b) => reservedBlockIds.includes(b.id));
  const totalSlabsCount = selectedBlocks.reduce((acc, b) => acc + b.availableSlabs, 0);
  const rawTotalPrice = selectedBlocks.reduce((acc, b) => acc + b.tradePrice, 0);
  // Apply 15% trade discount on bulk reserve
  const bulkDiscountedPrice = Math.round(rawTotalPrice * 0.85);

  const handleConfirmReservation = () => {
    setConfirmedData({
      blocks: selectedBlocks,
      totalSlabs: totalSlabsCount,
      totalAmount: bulkDiscountedPrice,
      rawAmount: rawTotalPrice,
      savings: rawTotalPrice - bulkDiscountedPrice,
      timestamp: new Date().toLocaleString(),
      assignedProjects
    });
    setShowConfirmationModal(true);
  };

  return (
    <div className="bg-[#131313] text-neutral-100 min-h-screen -mx-4 md:-mx-16 -my-8 p-4 md:p-12 font-sans selection:bg-[#D4AF37] selection:text-[#131313]">
      
      {/* TOP ARCHSTONE HEADER */}
      <div className="max-w-[1600px] mx-auto space-y-8 pb-32">
        
        {/* Header Title Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-neutral-800 pb-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/40 rounded text-[10px] font-mono text-[#D4AF37] uppercase tracking-widest font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              SMC PRO VIP Trade Allocation
            </div>
            <h1 className="font-serif text-3xl md:text-5xl font-bold uppercase tracking-tight text-white">
              SMC PRO | Bulk Slab Reserve
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 max-w-2xl leading-relaxed">
              Real-time ARCHSTONE Elite Vault inventory holding. Directly lock block allocations for active UK architectural developments with trade partner tier pricing.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#1F1F1F] border border-neutral-800 p-3 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37] font-bold">
              PRO
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-neutral-400 block">Tier Status</span>
              <span className="text-xs font-bold text-white font-mono">15% Bulk Discount Applied</span>
            </div>
          </div>
        </div>

        {/* EXECUTIVE INVENTORY SUMMARY */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="p-8 border border-neutral-800 bg-[#1F1F1F] rounded-xl relative overflow-hidden group">
            <div className="absolute top-4 right-4 text-[#D4AF37]/40">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase mb-2">ELITE VAULT STATUS</p>
            <div className="flex items-baseline gap-2">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-white">142</h2>
              <span className="text-xs text-[#D4AF37] font-mono font-bold">Slabs Available</span>
            </div>
            <div className="mt-4 h-1 bg-neutral-800 w-full rounded-full overflow-hidden">
              <div className="h-full bg-[#D4AF37] w-3/4 transition-all duration-1000" />
            </div>
          </div>

          <div className="p-8 border border-neutral-800 bg-[#1F1F1F] rounded-xl">
            <p className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase mb-2">RESERVATION CAPACITY</p>
            <div className="flex items-baseline gap-2">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-white">{totalSlabsCount + 1}</h2>
              <span className="text-xs text-neutral-400 font-mono">/ 40 Slabs Max</span>
            </div>
            <p className="mt-2 text-xs text-[#D4AF37] font-mono font-semibold">
              PRO Tier Hold Allocation Active
            </p>
          </div>

          <div className="p-8 border border-[#D4AF37]/60 bg-[#1F1F1F] rounded-xl flex flex-col justify-between shadow-lg">
            <div>
              <p className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase mb-2">PENDING ALLOCATION</p>
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-white tracking-tight">
                0{reservedBlockIds.length} <span className="text-sm font-sans text-neutral-400 font-normal">Blocks</span>
              </h2>
            </div>
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-neutral-800">
              <span className="text-xs font-mono text-neutral-300">
                Assigned: {Object.values(assignedProjects)[0] || "Mayfair Penthouse"}
              </span>
              <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
            </div>
          </div>

        </section>

        {/* FILTER & SEARCH BAR */}
        <section className="sticky top-20 z-40 bg-[#131313]/90 backdrop-blur-md py-4 border-y border-neutral-800">
          <div className="flex flex-col md:flex-row gap-4">
            
            <div className="flex-grow flex items-center gap-3 border border-neutral-800 bg-[#0E0E0E] px-4 rounded-xl focus-within:border-[#D4AF37] transition-colors">
              <Search className="w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Block ID, Material, or Origin..."
                className="bg-transparent border-none focus:ring-0 focus:outline-none w-full py-3 text-xs md:text-sm font-mono text-white placeholder:text-neutral-600"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-neutral-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              
              {/* Material Dropdown */}
              <div className="relative">
                <select
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  className="bg-[#1F1F1F] border border-neutral-800 text-xs font-mono text-neutral-200 px-4 py-3 rounded-xl focus:border-[#D4AF37] focus:ring-0 cursor-pointer pr-8"
                >
                  <option value="ALL">MATERIAL: ALL</option>
                  <option value="Marble">Marble</option>
                  <option value="Quartzite">Quartzite</option>
                  <option value="Porcelain">Porcelain</option>
                </select>
              </div>

              {/* Origin Dropdown */}
              <div className="relative">
                <select
                  value={selectedOrigin}
                  onChange={(e) => setSelectedOrigin(e.target.value)}
                  className="bg-[#1F1F1F] border border-neutral-800 text-xs font-mono text-neutral-200 px-4 py-3 rounded-xl focus:border-[#D4AF37] focus:ring-0 cursor-pointer pr-8"
                >
                  <option value="ALL">ORIGIN: ALL</option>
                  <option value="Italy">Italy</option>
                  <option value="Brazil">Brazil</option>
                  <option value="Spain">Spain</option>
                </select>
              </div>

            </div>
          </div>
        </section>

        {/* SLAB SELECTION GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSlabs.map((slab) => {
            const isReserved = reservedBlockIds.includes(slab.id);
            const currentAssignedProject = assignedProjects[slab.id] || "Mayfair Penthouse";

            return (
              <div
                key={slab.id}
                className={`group border rounded-2xl bg-[#1A1A1A] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl ${
                  isReserved
                    ? "border-[#D4AF37] ring-1 ring-[#D4AF37]/50"
                    : "border-neutral-800 hover:border-neutral-600"
                }`}
              >
                {/* Slab Photo Header */}
                <div className="relative h-72 overflow-hidden bg-neutral-900">
                  <img
                    src={slab.image}
                    alt={slab.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  {/* Block Code Badge */}
                  <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1 rounded border border-[#D4AF37]/40">
                    <span className="font-mono text-[10px] text-[#D4AF37] font-bold">
                      {slab.blockCode}
                    </span>
                  </div>

                  {/* Exclusive or Low Stock Badge */}
                  {slab.exclusive && (
                    <div className="absolute bottom-4 right-4 bg-[#D4AF37] text-black px-3 py-1 font-mono text-[10px] font-extrabold uppercase rounded shadow">
                      EXCLUSIVE
                    </div>
                  )}
                  {slab.lowStock && (
                    <div className="absolute top-4 right-4 bg-rose-950 text-rose-300 border border-rose-800 px-3 py-1 font-mono text-[10px] font-bold uppercase rounded">
                      LOW STOCK ({slab.availableSlabs} Left)
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-6 flex flex-col flex-grow space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-serif text-xl font-bold text-white">{slab.name}</h3>
                      <p className="font-mono text-xs text-neutral-400">{slab.origin}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-mono text-neutral-500 uppercase">RARITY SCORE</p>
                      <p className="font-serif text-2xl font-bold text-[#D4AF37]">{slab.rarityScore}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-3 border-y border-neutral-800/80 text-xs font-mono">
                    <div>
                      <p className="text-[9px] text-neutral-500 uppercase">Dimensions</p>
                      <p className="text-neutral-200 font-semibold">{slab.dimensions}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-neutral-500 uppercase">Available Slabs</p>
                      <p className="text-neutral-200 font-semibold">{slab.availableSlabs} Slabs</p>
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="mt-auto space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono uppercase text-neutral-400">TRADE PRICE (EST)</span>
                      <div className="text-right">
                        {slab.originalPrice && (
                          <span className="text-xs text-neutral-500 line-through mr-2 font-mono">
                            £{slab.originalPrice.toLocaleString()}
                          </span>
                        )}
                        <span className="font-serif text-xl font-bold text-[#D4AF37]">
                          £{slab.tradePrice.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Project Assignment Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono uppercase text-neutral-400 block">
                        Assign to Project Dossier:
                      </label>
                      <select
                        value={currentAssignedProject}
                        onChange={(e) => handleProjectSelect(slab.id, e.target.value)}
                        className="w-full bg-[#0E0E0E] border border-neutral-800 text-xs font-mono text-neutral-200 rounded-lg p-2 focus:border-[#D4AF37] focus:ring-0"
                      >
                        {projects.length > 0 ? (
                          projects.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Mayfair Penthouse">Mayfair Penthouse</option>
                            <option value="Knightsbridge Estate">Knightsbridge Estate</option>
                            <option value="Belgravia Modern">Belgravia Modern</option>
                            <option value="Chelsea Riverside">Chelsea Riverside</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Reserve Button */}
                    <button
                      onClick={() => toggleReserve(slab.id)}
                      className={`w-full py-3 rounded-xl font-mono text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                        isReserved
                          ? "bg-white text-black hover:bg-neutral-200 shadow-md"
                          : "bg-[#D4AF37] text-black hover:bg-white shadow-lg"
                      }`}
                    >
                      {isReserved ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                          <span>SELECTED FOR BULK HOLD</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>RESERVE BLOCK</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

      </div>

      {/* HIGH-STAKES ACTION BAR (FIXED FOOTER) */}
      <footer className="fixed bottom-0 left-0 w-full bg-[#1A1A1A]/95 backdrop-blur-xl border-t border-[#D4AF37]/40 z-50 py-4 px-6 md:px-12 shadow-2xl">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex flex-wrap items-center gap-6 md:gap-12">
            <div>
              <p className="text-[9px] font-mono uppercase text-neutral-400 tracking-widest">Active Selections</p>
              <div className="flex items-center gap-2">
                <span className="font-serif text-xl font-bold text-white">{selectedBlocks.length} Blocks</span>
                <span className="text-xs text-[#D4AF37] font-mono">({totalSlabsCount} Slabs Total)</span>
              </div>
            </div>

            <div className="h-8 w-px bg-neutral-800 hidden md:block" />

            <div>
              <p className="text-[9px] font-mono uppercase text-neutral-400 tracking-widest">Est. Bulk Total</p>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-2xl font-bold text-[#D4AF37]">
                  £{bulkDiscountedPrice.toLocaleString()}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded font-bold">
                  -15% Trade Discount
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            
            {/* Live Hold Timer */}
            <div className="flex items-center gap-2 bg-[#0E0E0E] px-4 py-2.5 border border-neutral-800 rounded-xl font-mono text-xs">
              <Clock className={`w-4 h-4 ${timerSeconds < 300 ? "text-rose-500 animate-pulse" : "text-[#D4AF37]"}`} />
              <span className="text-neutral-300">
                Inventory held for: <strong className="text-white font-bold">{formatTimer(timerSeconds)}</strong>
              </span>
            </div>

            {/* Confirm Reserve Action Button */}
            <button
              onClick={handleConfirmReservation}
              disabled={selectedBlocks.length === 0}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-mono text-xs font-extrabold uppercase tracking-widest transition-all cursor-pointer shadow-xl ${
                selectedBlocks.length > 0
                  ? "bg-[#D4AF37] text-black hover:bg-white hover:scale-[1.02] active:scale-95"
                  : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
              }`}
            >
              CONFIRM RESERVE ({selectedBlocks.length})
            </button>
          </div>

        </div>
      </footer>

      {/* CONFIRMATION MODAL */}
      {showConfirmationModal && confirmedData && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1A1A1A] border border-[#D4AF37] rounded-2xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl relative text-neutral-100">
            <button
              onClick={() => setShowConfirmationModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-white">SMC PRO Reservation Confirmed</h3>
              <p className="text-xs text-neutral-400 font-mono">
                Official Block Allocation Certificate Issued #{Math.floor(100000 + Math.random() * 900000)}
              </p>
            </div>

            <div className="bg-[#0E0E0E] border border-neutral-800 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-neutral-400">Timestamp:</span>
                <span className="text-neutral-200">{confirmedData.timestamp}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-neutral-400">Total Blocks Reserved:</span>
                <span className="text-white font-bold">{confirmedData.blocks.length} Blocks ({confirmedData.totalSlabs} Slabs)</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-neutral-400">Subtotal:</span>
                <span className="text-neutral-300">£{confirmedData.rawAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-emerald-400">VIP Bulk Discount (-15%):</span>
                <span className="text-emerald-400 font-bold">-£{confirmedData.savings.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className="text-neutral-200 font-bold">Guaranteed Total:</span>
                <span className="text-[#D4AF37] font-bold text-base">£{confirmedData.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-neutral-400 block">Reserved Slabs Summary:</span>
              <ul className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar font-mono text-xs">
                {confirmedData.blocks.map((b: any) => (
                  <li key={b.id} className="flex justify-between bg-[#131313] p-2 rounded border border-neutral-800">
                    <span className="text-white font-semibold">{b.name} ({b.blockCode})</span>
                    <span className="text-[#D4AF37]">£{b.tradePrice.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  alert("SMC PRO Official Allocation PDF generated & emailed to your partner account.");
                  setShowConfirmationModal(false);
                }}
                className="flex-1 bg-[#D4AF37] text-black font-mono font-bold text-xs py-3 rounded-xl hover:bg-white transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>DOWNLOAD CERTIFICATE</span>
              </button>
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="border border-neutral-700 hover:border-neutral-500 font-mono text-xs py-3 px-6 rounded-xl text-neutral-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
