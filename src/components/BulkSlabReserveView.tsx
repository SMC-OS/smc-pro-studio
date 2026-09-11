import React, { useState } from "react";
import {
  Search,
  Layers,
  ShieldCheck,
  X
} from "lucide-react";
import { Project } from "../App";

interface SlabBlock {
  id: string;
  blockCode: string;
  name: string;
  dimensions: string;
  image: string;
  materialType: "Marble" | "Quartzite" | "Porcelain" | "Granite";
}

/**
 * Phase 5 Gate 0 purge.
 *
 * This screen previously presented a fabricated "ARCHSTONE Elite Vault"
 * with invented stock counts ("142 Slabs Available"), invented per-block
 * origins, rarity scores, original/trade prices, and low-stock/exclusive
 * badges, a countdown "inventory held" timer implying a real-time lock,
 * and three blocks pre-reserved by default against invented project names
 * ("Mayfair Penthouse", "Knightsbridge Estate", "Belgravia Modern"). The
 * "Confirm Reserve" action produced a fabricated "Official Block
 * Allocation Certificate" with a random certificate number and an alert
 * falsely claiming a PDF had been generated and emailed — none of it was
 * ever a real reservation system.
 *
 * Per the approved Gate 0 decision, the fabricated data and the
 * certificate/reservation actions are removed. The block browser and
 * project-assignment structure are kept, using the real `projects` list
 * passed in, since choosing which of your own projects a material is for
 * is a genuinely useful, non-fabricated feature.
 */
const SLAB_BLOCKS: SlabBlock[] = [
  {
    id: "block-1",
    blockCode: "BLOCK 882-A",
    name: "Calacatta Borghini",
    dimensions: "3200 x 1900 x 20mm",
    materialType: "Marble",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC1rySmxJtQUHwSsf1BH7_B6SWC9c0k1CGi2nQZdAJf_mVlBKYDfgkheXlQUNqEqjPn8xyI72QNzZI847Ew4ZUXvnbzWZua6ITdKjQuKoP6EzNVeaXYMAU4yF3up-D8LI_6BPD6g30_yUdsk7c-pUT8227cM38FAzhs0a7ZFWCgRWb4GsybOg4UsLSjaWzS3y4RLWbR7-hSw8E3Kmh8u4lI5meq8uwgjeS8ajk6ghN-00KbFRfWrd60gAs1qUX-kburHRRy36iVBl8"
  },
  {
    id: "block-2",
    blockCode: "BLOCK Q-441",
    name: "Taj Mahal Select",
    dimensions: "3100 x 1850 x 30mm",
    materialType: "Quartzite",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBW_bS64b4dg6CHn0UZ-q9p3kLdgNbpb9b-k9Kk-6Vhg6c-KxD7QuVD1m_APMWKWLJPYHjvxYLA8SHcjaazoBag22Mxr310QV0QxdxgEgmkvzNrY6m4cw9ybYNFroU1NM3xeFJjDP6SLMPO4mfEkUNFjGtP7J0SuEcwMmGlY0obFRExyuNMq-aDykyNLuismRhdEne1PTAq8iB0UO4scYmGknLMHlUv0FzsloBSFGaj3-mZsCwqEIE5oQcWd2Oj49C2RB_KVL6j1d0"
  },
  {
    id: "block-3",
    blockCode: "BLOCK NM-901",
    name: "Nero Marquina",
    dimensions: "2900 x 1700 x 20mm",
    materialType: "Marble",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD_4RrqSv_-VtNpXpYvfge7tLq1tCQwd1uGotV3SAqeo6cMkAmZGiIa7Fkrcgc9HE1326cP4w0LqalRWzytxoBPRv9QA1vsEvjsX1B4ug0nADmx9S__I7ESyJT-rGHyue0rLcKqo9o23vPUvYBcFGwL3gaallARj5R99anvieN3O7EMMn-ewr8vQPQp6-yiBLLhyAmZ94A7CbP_WF1gwAjVOG9eIoDV45b3lghJY209h1PoOJrCutFFwQWV16AQccHZrGBKrM2IkJE"
  },
  {
    id: "block-4",
    blockCode: "BLOCK ST-104",
    name: "Statuario Extra Sintered",
    dimensions: "3200 x 1600 x 12mm",
    materialType: "Porcelain",
    image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "block-5",
    blockCode: "BLOCK EQ-702",
    name: "Emerald Quartzite Master",
    dimensions: "3050 x 1950 x 20mm",
    materialType: "Quartzite",
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "block-6",
    blockCode: "BLOCK PG-330",
    name: "Pietra Grey Velvet",
    dimensions: "2850 x 1650 x 20mm",
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
  const [assignedProjects, setAssignedProjects] = useState<Record<string, string>>({});
  const [showUnavailableNotice, setShowUnavailableNotice] = useState(false);

  const handleProjectSelect = (blockId: string, projName: string) => {
    setAssignedProjects((prev) => ({ ...prev, [blockId]: projName }));
  };

  const filteredSlabs = SLAB_BLOCKS.filter((block) => {
    const matchesSearch =
      block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.blockCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMaterial =
      selectedMaterial === "ALL" || block.materialType === selectedMaterial;

    return matchesSearch && matchesMaterial;
  });

  return (
    <div className="bg-[#131313] text-neutral-100 min-h-screen -mx-4 md:-mx-16 -my-8 p-4 md:p-12 font-sans selection:bg-[#D4AF37] selection:text-[#131313]">

      <div className="max-w-[1600px] mx-auto space-y-8 pb-16">

        {/* Header Title Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-neutral-800 pb-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/40 rounded text-[10px] font-mono text-[#D4AF37] uppercase tracking-widest font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              SMC PRO Trade Allocation
            </div>
            <h1 className="font-serif text-3xl md:text-5xl font-bold uppercase tracking-tight text-white">
              SMC PRO | Bulk Slab Reserve
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 max-w-2xl leading-relaxed">
              Browse available block specifications and assign materials to your active projects. Reservations and
              pricing are confirmed directly by SMC.
            </p>
          </div>
        </div>

        {/* FILTER & SEARCH BAR */}
        <section className="sticky top-20 z-40 bg-[#131313]/90 backdrop-blur-md py-4 border-y border-neutral-800">
          <div className="flex flex-col md:flex-row gap-4">

            <div className="flex-grow flex items-center gap-3 border border-neutral-800 bg-[#0E0E0E] px-4 rounded-xl focus-within:border-[#D4AF37] transition-colors">
              <Search className="w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Block ID or Material..."
                className="bg-transparent border-none focus:ring-0 focus:outline-none w-full py-3 text-xs md:text-sm font-mono text-white placeholder:text-neutral-600"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-neutral-500 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
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
          </div>
        </section>

        {/* SLAB SELECTION GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSlabs.map((slab) => {
            const currentAssignedProject = assignedProjects[slab.id] || "";

            return (
              <div
                key={slab.id}
                className="group border rounded-2xl bg-[#1A1A1A] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl border-neutral-800 hover:border-neutral-600"
              >
                {/* Slab Photo Header */}
                <div className="relative h-72 overflow-hidden bg-neutral-900">
                  <img
                    src={slab.image}
                    alt={slab.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1 rounded border border-[#D4AF37]/40">
                    <span className="font-mono text-[10px] text-[#D4AF37] font-bold">
                      {slab.blockCode}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 flex flex-col flex-grow space-y-4">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-white">{slab.name}</h3>
                    <p className="font-mono text-xs text-neutral-400">{slab.materialType}</p>
                  </div>

                  <div className="py-3 border-y border-neutral-800/80 text-xs font-mono">
                    <p className="text-[9px] text-neutral-500 uppercase">Dimensions</p>
                    <p className="text-neutral-200 font-semibold">{slab.dimensions}</p>
                  </div>

                  <div className="mt-auto space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono uppercase text-neutral-400">Pricing</span>
                      <span className="font-serif text-sm font-bold text-[#D4AF37]">Price on Application</span>
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
                        <option value="">Select a project…</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Reserve Action */}
                    <button
                      onClick={() => setShowUnavailableNotice(true)}
                      className="w-full py-3 rounded-xl font-mono text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer bg-[#D4AF37] text-black hover:bg-white shadow-lg"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>REQUEST RESERVATION</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

      </div>

      {/* UNAVAILABLE NOTICE MODAL */}
      {showUnavailableNotice && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/40 rounded-2xl max-w-md w-full p-6 md:p-8 space-y-5 shadow-2xl relative text-neutral-100">
            <button
              onClick={() => setShowUnavailableNotice(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-serif text-xl font-bold text-white">Block Reservations</h3>
            <p className="text-sm text-neutral-300 leading-relaxed" role="status">
              Block reservations are not currently available. Contact SMC to arrange a reservation for your project.
            </p>
            <button
              onClick={() => setShowUnavailableNotice(false)}
              className="w-full bg-[#D4AF37] text-black font-mono font-bold text-xs py-3 rounded-xl hover:bg-white transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
