import React, { useState } from "react";
import {
  Search,
  Filter,
  Download,
  Eye,
  Menu,
  Maximize2,
  FileText,
  Sliders,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Layers,
  LayoutGrid,
  FileCheck,
  CheckCircle2,
  Printer,
  Share2,
  Bookmark,
  Info
} from "lucide-react";

interface TechnicalLibraryViewProps {
  onOpenSideMenu?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export interface TechDocument {
  id: string;
  title: string;
  category: "Edge Profiles" | "Surface Finishes" | "Substrates" | "Joint Details" | "Engineering Bulletins";
  refCode: string;
  revision: string;
  updatedAt: string;
  isCritical?: boolean;
  description: string;
  format: "PDF" | "DWG / CAD" | "High-Res Case Study" | "Installation Guide";
  fileSize: string;
  contentDetails?: string[];
  specs?: { label: string; value: string }[];
}

const TECH_DOCUMENTS: TechDocument[] = [
  {
    id: "doc-waterfall-cad",
    title: "Book-matched Waterfall Edge detail",
    category: "Edge Profiles",
    refCode: "SMC-ENG-2024-08",
    revision: "REV 2.4",
    updatedAt: "2h ago",
    description: "Refined DWG schema for continuous vein matching across vertical planes with dual 45° miter locking pins.",
    format: "DWG / CAD",
    fileSize: "4.8 MB",
    contentDetails: [
      "Dual 45° precision miter geometry for 20mm & 30mm natural marble.",
      "Internal epoxy groove dimensions for structural carbon-fiber splines.",
      "Support sub-frame clearance tolerances for handless kitchen island cabinetry."
    ],
    specs: [
      { label: "Compliance", value: "ISO 9001 Architectural" },
      { label: "CAD Format", value: "AutoCAD 2024 DWG / DXF" },
      { label: "Min Thickness", value: "20mm Solid Slab" }
    ]
  },
  {
    id: "doc-adhesive-bulletin",
    title: "New Adhesive Standards for Sintered Stone",
    category: "Engineering Bulletins",
    refCode: "TB-2024-012",
    revision: "CRITICAL REV 1.0",
    updatedAt: "1d ago",
    isCritical: true,
    description: "Critical update on thermal expansion bonding for large format porcelain & sintered stone in high-sunlight wet areas.",
    format: "PDF",
    fileSize: "1.2 MB",
    contentDetails: [
      "Mandatory use of elastomeric hybrid polymer adhesives (SMC-PolyGrip 800) for outdoor kitchen islands.",
      "Expansion joint spacing required every 3.0 meters to absorb thermal displacement up to 60°C.",
      "Surface priming protocol for non-porous ultra-compact sintered slabs."
    ],
    specs: [
      { label: "Severity", value: "Mandatory Quality Bulletin" },
      { label: "Applicable Materials", value: "Lapitec, Dekton, Neolith" },
      { label: "Effective Date", value: "Immediate" }
    ]
  },
  {
    id: "doc-substrate-load",
    title: "Structural Substrate Reinforcement Matrix",
    category: "Substrates",
    refCode: "SMC-SUB-2024-03",
    revision: "REV 3.1",
    updatedAt: "3d ago",
    description: "Definitive load-bearing engineering tables for cantilevered kitchen islands with overhangs exceeding 250mm.",
    format: "Installation Guide",
    fileSize: "2.6 MB",
    contentDetails: [
      "Hidden steel bracket spacing chart by slab weight & overhang depth.",
      "Maximum deflection limits (1/720) under 150kg point loads.",
      "Subfloor joist sistering requirements for 30mm natural quartzite."
    ],
    specs: [
      { label: "Standard", value: "ASTM C119 Compliant" },
      { label: "Max Overhang", value: "450mm with Steel Ribs" },
      { label: "Safety Factor", value: "3.5x Dynamic Load" }
    ]
  },
  {
    id: "doc-joint-seam",
    title: "Invisible Seam Technology & Thermal Expansion",
    category: "Joint Details",
    refCode: "SMC-JNT-2024-01",
    revision: "REV 1.8",
    updatedAt: "4d ago",
    description: "Vacuum-assisted tight seam alignment procedures utilizing color-matched UV stable epoxy resins.",
    format: "PDF",
    fileSize: "3.4 MB",
    contentDetails: [
      "Color-formula mixing chart for Calacatta, Statuario, and Nero Marquina.",
      "Seam thickness tolerance limits (max 0.8mm) verified by digital micrometer.",
      "Edge chamfer polishing steps to mask seam light reflection."
    ],
    specs: [
      { label: "Seam Width", value: "0.5mm – 0.8mm" },
      { label: "Cure Time", value: "20 min @ 20°C" },
      { label: "Finish Level", value: "Mirror Polish 95 GU" }
    ]
  },
  {
    id: "doc-honed-hono",
    title: "Honed vs Satin Leathered Finish Performance Report",
    category: "Surface Finishes",
    refCode: "SMC-FIN-2024-05",
    revision: "REV 2.0",
    updatedAt: "1w ago",
    description: "Micro-texture slip resistance and stain absorption test results across 50 natural & engineered stone samples.",
    format: "High-Res Case Study",
    fileSize: "8.1 MB",
    contentDetails: [
      "Dynamic Coefficient of Friction (DCOF) wet test data > 0.42.",
      "Oleophobic sealer longevity evaluation against lemon juice, wine, and olive oil.",
      "Aesthetic gloss rating comparisons under LED architectural spotlights."
    ],
    specs: [
      { label: "Testing Lab", value: "SMC Materials Science Center" },
      { label: "Slip Rating", value: "R10 Wet Traction" },
      { label: "Sealer Recommendation", value: "Nano-Hydrophobic Seal" }
    ]
  }
];

export interface StoneSpecItem {
  id: string;
  name: string;
  category: "QUARTZ" | "GRANITE" | "DEKTON" | "PORCELAIN";
  subtitle: string;
  density: string;
  mohs: string;
  thickness: string;
  finish: string;
  stockStatus: "IN STOCK" | "SPECIAL ORDER" | "LOW STOCK";
  imageUrl: string;
  compressiveStrength: string;
  waterAbsorption: string;
  flexuralStrength: string;
  acidResistance: string;
  description: string;
}

const STONE_SPECS_CATALOG: StoneSpecItem[] = [
  {
    id: "spec-calacatta-gold",
    name: "Calacatta Gold",
    category: "QUARTZ",
    subtitle: "ENGINEERED QUARTZ",
    density: "2400 kg/m³",
    mohs: "7.0",
    thickness: "20mm / 30mm",
    finish: "Polished",
    stockStatus: "IN STOCK",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuC1de2SUEpBDHEjM7v2igGQyFQ_qiVsKK5wzF9IXMvNo92ufS66kOIQRrOCnUoHMIBeCin3IIVhkK9O8cwghEgujrBwvGGdKRNTkZKexIm6KpijMhDKV6-_iBA_GAnGsGg6jGZ-qDqoK4NHOVjhxIXFJX0mRZMmx6p1HcHznIek0pVjC1sgL5C-u0htp0Z2sQszKO8G7DnY7AWqaJOprlvPo3Xc11AbsoXXuPbtBREtUEo-c_j5Nitm",
    compressiveStrength: "220 MPa",
    waterAbsorption: "< 0.02%",
    flexuralStrength: "48 MPa",
    acidResistance: "Class A (ISO 10545-13)",
    description: "High-density engineered quartz composed of 93% natural quartz crystals and 7% advanced polymer resins. Zero porosity, superior stain and scratch resistance."
  },
  {
    id: "spec-nero-absolute",
    name: "Nero Absolute",
    category: "GRANITE",
    subtitle: "NATURAL GRANITE",
    density: "2950 kg/m³",
    mohs: "6.5",
    thickness: "30mm",
    finish: "Honed",
    stockStatus: "IN STOCK",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCdwbzrt4TpYsZ1co9rgolBCBLaK4u0vwf5MMB9j2IhoFAx9IfKwxy7v3WbO3JUnXekzXUvlc808IuYcXZgGh4hAffeYFtRQDnKy4uWtYwUMwtvlxSmZJEo3LxKz6Vi4Z6sOL8p-c_RcH6GMuEux9t9scibjJUBNbwEKt6TzAyLvF_WUAiauZ0T6CCGIHkvf3j0Vb1a7YjUJJ-PTEYtNwaPB4fl5rsJsutNQ2or9gzNBt3bDAkW-f_v",
    compressiveStrength: "285 MPa",
    waterAbsorption: "< 0.08%",
    flexuralStrength: "22 MPa",
    acidResistance: "High Natural Resistance",
    description: "Extremely dense, deep black igneous natural stone. Possesses near zero absorption and exceptional structural rigidity for high-traffic architectural surfaces."
  },
  {
    id: "spec-trilium-industrial",
    name: "Trilium Industrial",
    category: "DEKTON",
    subtitle: "ULTRA-COMPACT DEKTON",
    density: "2500 kg/m³",
    mohs: "8.0+",
    thickness: "12mm / 20mm",
    finish: "Matte",
    stockStatus: "SPECIAL ORDER",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuA8qpnU-qZ4x9W8CorLXSlm_6Ke8GK-VX2_lHQuhE9N-ZmqV1E22sl6v3aqYUWcqITV8f6bveEJVoP8n4paB6EH1nwpRzUT3Z8YtuTZy7yVKavAYR57HpEGSHiZXoa15DeehqHPY8iRpBpjlDQkIFvPcTxmW3zD-Ba8VaKoco0257F43k43-RuoGFqHe8EXLO6gCpvDnZUhbfSYjwS8-zrLhrD558MddhEqVvAXkj2RksrC0cQkgGAa",
    compressiveStrength: "350 MPa",
    waterAbsorption: "< 0.01%",
    flexuralStrength: "65 MPa",
    acidResistance: "Totally Non-Reactive",
    description: "Ultra-compact sintered stone manufactured under 25,000 tons of pressure. Thermal shock resistant up to 800°C and completely scratchproof."
  },
  {
    id: "spec-statuario-extra",
    name: "Statuario Extra",
    category: "PORCELAIN",
    subtitle: "SINTERED PORCELAIN",
    density: "2450 kg/m³",
    mohs: "7.5",
    thickness: "12mm / 20mm",
    finish: "Silk Polished",
    stockStatus: "IN STOCK",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuC1de2SUEpBDHEjM7v2igGQyFQ_qiVsKK5wzF9IXMvNo92ufS66kOIQRrOCnUoHMIBeCin3IIVhkK9O8cwghEgujrBwvGGdKRNTkZKexIm6KpijMhDKV6-_iBA_GAnGsGg6jGZ-qDqoK4NHOVjhxIXFJX0mRZMmx6p1HcHznIek0pVjC1sgL5C-u0htp0Z2sQszKO8G7DnY7AWqaJOprlvPo3Xc11AbsoXXuPbtBREtUEo-c_j5Nitm",
    compressiveStrength: "310 MPa",
    waterAbsorption: "< 0.05%",
    flexuralStrength: "52 MPa",
    acidResistance: "Class A (Acid Proof)",
    description: "Premium sintered porcelain fired at 1200°C. Replicates natural Italian Statuario marble with zero maintenance liability and complete UV stability."
  },
  {
    id: "spec-taj-mahal",
    name: "Taj Mahal Quartzite",
    category: "GRANITE",
    subtitle: "NATURAL QUARTZITE",
    density: "2710 kg/m³",
    mohs: "8.0",
    thickness: "20mm / 30mm",
    finish: "Leathered",
    stockStatus: "LOW STOCK",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAVLJWGDSEMMRYYS04xRCdZMC7WmBQVjhAfYCH3iC4mMrOWMF1IrmaSXIDZZQCpIjTdrqnL9nMuuMY7Y5AciCwtbbRqYkIEsIrRdHJDhsbO4XAO9LtnDnDaG8UzBT4cIjqwZheyfHUBQBXq8AfUS9ou5Uic9eihQn-_ltTIRXgTHnfc39joldwPvlqZ87saakSQy0sr9s25NfmIxWN7kv86w2cZTFCjxRfc8gVKKplhrg5xdPNYyHaLzW2wxi_6-lBijIPgPjKI_9U",
    compressiveStrength: "330 MPa",
    waterAbsorption: "< 0.12%",
    flexuralStrength: "38 MPa",
    acidResistance: "High Natural Resistance",
    description: "Exquisite natural metamorphic quartzite quarried in Brazil. Forged under extreme geological heat and pressure, offering hardness superior to standard granite."
  }
];

export default function TechnicalLibraryView({
  onOpenSideMenu,
  onNavigateTab
}: TechnicalLibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedMaterialCategory, setSelectedMaterialCategory] = useState<string>("ALL");
  const [selectedStoneSpec, setSelectedStoneSpec] = useState<StoneSpecItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string>("All");

  // Modals & Viewer States
  const [activeViewerDoc, setActiveViewerDoc] = useState<TechDocument | null>(null);
  const [showMasterGuideViewer, setShowMasterGuideViewer] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const categories = ["All", "Edge Profiles", "Surface Finishes", "Substrates", "Joint Details", "Engineering Bulletins"];
  const formats = ["All", "PDF", "DWG / CAD", "High-Res Case Study", "Installation Guide"];

  const filteredDocs = TECH_DOCUMENTS.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.refCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
    const matchesFormat = selectedFormat === "All" || doc.format === selectedFormat;
    return matchesSearch && matchesCategory && matchesFormat;
  });

  const filteredStoneSpecs = STONE_SPECS_CATALOG.filter((item) => {
    const matchesCategory = selectedMaterialCategory === "ALL" || item.category === selectedMaterialCategory;
    const matchesSearch = searchQuery === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.finish.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#131313] text-[#e2e2e2] font-sans pb-28 selection:bg-[#D4AF37] selection:text-[#000000]">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-[300] bg-neutral-900 border border-[#D4AF37]/60 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in backdrop-blur-md">
          <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
            <Download className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <p className="text-xs font-mono font-bold text-[#D4AF37]">ACTION CONFIRMED</p>
            <p className="text-xs text-neutral-300 font-medium">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* TopAppBar / Header */}
      <header className="bg-[#000000] border-b border-[#4c4546] fixed top-0 left-0 w-full z-50 shadow-lg">
        <div className="flex justify-between items-center w-full px-4 md:px-12 h-20 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onOpenSideMenu && onOpenSideMenu()}
              className="p-2 rounded-lg text-[#D4AF37] hover:bg-neutral-900 transition-all cursor-pointer active:scale-95"
              title="Open Navigation Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigateTab && onNavigateTab("dashboard")}>
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBXNV_RiofajRHjAoUdeRL9DEe2QkYbM7Tc0A4TQGbDMcjFQw7Q5zg9KIK2ijao316cxP_79D-6J5NzIHqGSsKu4We4TrVBU9wXJ-Oki7eDSGHaKKrZC6H9bitIoGlyNOMKRzOMOxJ7P98OaPN4DFpS7I8k6ifbcEAbyIrTMtqR8d6Yfx7XBkh3itiTP9iEqSYh_FMLknw4CwMtdIRxcCZr-5-A3zhzsZvV5yGDXPOTs9J_FTIffTZ0lCxFXwpnnkh4xJeo_osw6k"
                alt="SMC PRO Elite Logo"
                className="h-10 w-auto object-contain brightness-0 invert"
              />
              <div>
                <span className="font-serif text-lg font-bold tracking-tight text-white block">SMC PRO</span>
                <span className="text-[9px] font-mono text-[#D4AF37] uppercase tracking-widest block -mt-1">Technical Library</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <button
              onClick={() => {
                const el = document.getElementById("tech-library-search");
                if (el) el.focus();
              }}
              className="text-[#D4AF37] p-2 hover:bg-neutral-900 rounded-lg transition-all cursor-pointer"
              title="Search Library"
            >
              <Search className="w-5 h-5" />
            </button>
            <div className="hidden md:block w-px h-6 bg-[#4c4546]" />
            <div className="hidden md:flex flex-col text-right">
              <span className="text-[11px] font-mono font-bold text-[#D4AF37] uppercase tracking-wider">PRO Access</span>
              <span className="text-[10px] font-mono text-[#cfc4c5]">ID: SMC-992-LX</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="pt-28 px-4 md:px-12 max-w-7xl mx-auto space-y-12">
        
        {/* Header Section */}
        <section className="mb-4">
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-white mb-3">Technical Library</h1>
          <p className="text-base text-[#cfc4c5] max-w-2xl font-light leading-relaxed">
            High-performance technical specifications and density matrices for architectural stone selections.
          </p>
        </section>

        {/* Filter Chips */}
        <section className="flex flex-wrap items-center gap-3">
          {["ALL MATERIALS", "QUARTZ", "GRANITE", "DEKTON", "PORCELAIN"].map((cat) => {
            const rawCat = cat === "ALL MATERIALS" ? "ALL" : cat;
            const isActive = selectedMaterialCategory === rawCat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedMaterialCategory(rawCat)}
                className={`font-mono text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#1A1A1A] border border-[#D4AF37] text-white shadow-md shadow-[#D4AF37]/10"
                    : "bg-[#000000] border border-[#4c4546] text-[#cfc4c5] hover:border-[#D4AF37] hover:text-white"
                }`}
              >
                {cat}
              </button>
            );
          })}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="ml-auto flex items-center gap-2 border border-[#4c4546] hover:border-[#D4AF37] rounded px-4 py-2.5 bg-[#1A1A1A] text-xs font-mono font-bold text-[#cfc4c5] hover:text-white transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-[#D4AF37]" />
            <span>ADVANCED FILTERS</span>
          </button>
        </section>

        {/* Technical Data Grid (Bento Style) */}
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStoneSpecs.map((item) => (
              <article key={item.id} className="bg-[#1A1A1A] border border-[#4c4546] hover:border-[#D4AF37]/80 rounded-xl overflow-hidden flex flex-col group relative transition-all duration-300 shadow-xl">
                <div className="h-64 w-full relative overflow-hidden bg-black">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 scale-100 group-hover:scale-105"
                  />
                  <div className={`absolute top-4 right-4 px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-widest flex items-center gap-1.5 shadow-md ${
                    item.stockStatus === "IN STOCK"
                      ? "bg-[#D4AF37] text-black"
                      : "bg-[#1A1A1A] border border-[#D4AF37] text-white backdrop-blur-md"
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {item.stockStatus}
                  </div>
                </div>

                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="font-serif text-2xl font-bold text-white mb-1 group-hover:text-[#D4AF37] transition-colors">
                          {item.name}
                        </h2>
                        <span className="text-[10px] font-mono text-[#cfc4c5] uppercase tracking-wider block font-semibold">
                          {item.subtitle}
                        </span>
                      </div>
                      <Bookmark className="w-5 h-5 text-[#cfc4c5] hover:text-[#D4AF37] cursor-pointer transition-colors" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-[#4c4546]">
                      <div>
                        <span className="text-[10px] font-mono text-[#cfc4c5] block mb-1 uppercase tracking-wider">DENSITY</span>
                        <span className="text-sm font-mono font-bold text-white block">{item.density}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-[#cfc4c5] block mb-1 uppercase tracking-wider">MOHS HARDNESS</span>
                        <span className="text-sm font-mono font-bold text-white block">{item.mohs}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-[#cfc4c5] block mb-1 uppercase tracking-wider">THICKNESS</span>
                        <span className="text-sm font-mono font-bold text-white block">{item.thickness}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-[#cfc4c5] block mb-1 uppercase tracking-wider">FINISH</span>
                        <span className="text-sm font-mono font-bold text-white block">{item.finish}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedStoneSpec(item)}
                    className="mt-6 w-full py-3 border border-[#4c4546] group-hover:border-[#D4AF37] text-white hover:text-black hover:bg-[#D4AF37] text-xs font-mono font-bold tracking-wider transition-all rounded flex items-center justify-center gap-2 cursor-pointer uppercase shadow-md"
                  >
                    <span>VIEW FULL SPECS</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Search Section */}
        <section className="relative">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-[#D4AF37]/60 group-focus-within:text-[#D4AF37] transition-colors" />
            </div>
            <input
              id="tech-library-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by specification, CAD code, or material..."
              className="w-full bg-[#1A1A1A] border-b border-[#4c4546] py-5 pl-12 pr-28 text-base text-white focus:outline-none focus:border-[#D4AF37] transition-all placeholder:text-[#cfc4c5]/40 font-sans"
            />
            <div className="absolute right-4 inset-y-0 flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                  showFilters || selectedCategory !== "All" || selectedFormat !== "All"
                    ? "bg-[#D4AF37] text-[#000000]"
                    : "text-[#cfc4c5] hover:text-[#D4AF37] bg-neutral-900 border border-neutral-800"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Filters</span>
                {(selectedCategory !== "All" || selectedFormat !== "All") && (
                  <span className="w-2 h-2 rounded-full bg-[#000000]" />
                )}
              </button>
            </div>
          </div>

          {/* Expandable Filter Drawer */}
          {showFilters && (
            <div className="mt-4 p-5 bg-[#1f1f1f] border border-[#D4AF37]/30 rounded-xl space-y-4 animate-fade-in shadow-xl">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                <span className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5" />
                  Filter Knowledge Spheres & Formats
                </span>
                <button
                  onClick={() => {
                    setSelectedCategory("All");
                    setSelectedFormat("All");
                    setSearchQuery("");
                  }}
                  className="text-[10px] font-mono text-neutral-400 hover:text-white underline cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>

              {/* Categories Filter */}
              <div className="space-y-2">
                <span className="text-[11px] text-[#cfc4c5] font-mono block">Category / Sphere:</span>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? "bg-[#D4AF37] text-black shadow-md font-bold"
                          : "bg-[#2a2a2a] text-[#e2e2e2] hover:bg-neutral-800 border border-neutral-700"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format Filter */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <span className="text-[11px] text-[#cfc4c5] font-mono block">Document Format:</span>
                <div className="flex flex-wrap gap-2">
                  {formats.map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedFormat(fmt)}
                      className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                        selectedFormat === fmt
                          ? "bg-white text-black font-bold"
                          : "bg-[#2a2a2a] text-[#e2e2e2] hover:bg-neutral-800 border border-neutral-700"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Featured Resource Banner */}
        <section>
          <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 group shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-[#000000]/85 to-transparent z-10" />
            
            {/* Background Image */}
            <div
              className="relative h-[420px] w-full bg-cover bg-center transform group-hover:scale-105 transition-transform duration-700"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAVLJWGDSEMMRYYS04xRCdZMC7WmBQVjhAfYCH3iC4mMrOWMF1IrmaSXIDZZQCpIjTdrqnL9nMuuMY7Y5AciCwtbbRqYkIEsIrRdHJDhsbO4XAO9LtnDnDaG8UzBT4cIjqwZheyfHUBQBXq8AfUS9ou5Uic9eihQn-_ltTIRXgTHnfc39joldwPvlqZ87saakSQy0sr9s25NfmIxWN7kv86w2cZTFCjxRfc8gVKKplhrg5xdPNYyHaLzW2wxi_6-lBijIPgPjKI_9U')`
              }}
            />

            {/* Overlay Content */}
            <div className="absolute inset-0 z-20 p-6 md:p-12 flex flex-col justify-center max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 bg-[#D4AF37]/15 border border-[#D4AF37]/40 px-3 py-1 rounded-full w-fit backdrop-blur-md">
                <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-ping" />
                <span className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-widest font-bold">
                  Featured Publication
                </span>
              </div>

              <h2 className="font-serif text-3xl md:text-5xl font-bold text-white leading-tight">
                The Master Specification Guide <span className="text-[#D4AF37] font-sans font-light text-2xl block md:inline">(2024 Edition)</span>
              </h2>

              <p className="text-sm md:text-base text-[#cfc4c5] line-clamp-3 leading-relaxed">
                The definitive technical compendium for stone fabrication, installation standards, and structural substrate requirements for high-end residential architecture.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={() => {
                    triggerToast("Downloading Master Specification Guide (2024 Edition) PDF [28.4 MB]");
                  }}
                  className="bg-[#D4AF37] hover:bg-white text-black px-7 py-3 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 shadow-lg cursor-pointer active:scale-95"
                >
                  <span>Download PDF</span>
                  <Download className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowMasterGuideViewer(true)}
                  className="border border-white/30 hover:border-[#D4AF37] text-white hover:bg-white/10 px-7 py-3 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer backdrop-blur-sm active:scale-95"
                >
                  <Eye className="w-4 h-4 text-[#D4AF37]" />
                  <span>Online Viewer</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Bento Grid ("Knowledge Spheres") */}
        <section className="space-y-6">
          <div className="flex justify-between items-end border-b border-[#D4AF37]/20 pb-4">
            <div>
              <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
                <LayoutGrid className="w-6 h-6 text-[#D4AF37]" />
                Knowledge Spheres
              </h3>
              <p className="text-xs font-mono text-[#cfc4c5] mt-1 italic">
                Technical standards for precision execution.
              </p>
            </div>

            <button
              onClick={() => {
                setSelectedCategory("All");
                setSelectedFormat("All");
              }}
              className="text-xs font-mono text-[#D4AF37] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer font-bold group"
            >
              <span>All Categories</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Edge Profiles */}
            <div
              onClick={() => {
                if (onNavigateTab) {
                  onNavigateTab("edge-profiles");
                } else {
                  setSelectedCategory("Edge Profiles");
                }
              }}
              className="group relative bg-[#1f1f1f] border border-[#4c4546] hover:border-[#D4AF37] p-6 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-64 shadow-lg hover:shadow-[#D4AF37]/10"
            >
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-15 transition-opacity pointer-events-none text-[#D4AF37]">
                <Layers className="w-36 h-36" />
              </div>
              <div>
                <div className="w-12 h-12 rounded-xl bg-black border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mb-4 group-hover:scale-110 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
                <h4 className="font-serif text-xl font-bold text-white mb-1 group-hover:text-[#D4AF37] transition-colors">
                  Edge Profiles
                </h4>
                <p className="text-xs text-[#cfc4c5] leading-relaxed line-clamp-2">
                  Mitered, bullnose, and custom architectural edge specifications.
                </p>
              </div>

              <div className="space-y-1 pt-3 border-t border-neutral-800">
                <span className="text-[11px] font-mono text-[#D4AF37] font-bold block uppercase tracking-wider">
                  42 Documents • PDF & CAD
                </span>
                <span className="text-[10px] font-mono text-neutral-500 block">
                  Last Revision: Oct 2023
                </span>
              </div>
            </div>

            {/* Surface Finishes */}
            <div
              onClick={() => setSelectedCategory("Surface Finishes")}
              className="group relative bg-[#1f1f1f] border border-[#4c4546] hover:border-[#D4AF37] p-6 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-64 shadow-lg hover:shadow-[#D4AF37]/10"
            >
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-15 transition-opacity pointer-events-none text-[#D4AF37]">
                <Sparkles className="w-36 h-36" />
              </div>
              <div>
                <div className="w-12 h-12 rounded-xl bg-black border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mb-4 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="font-serif text-xl font-bold text-white mb-1 group-hover:text-[#D4AF37] transition-colors">
                  Surface Finishes
                </h4>
                <p className="text-xs text-[#cfc4c5] leading-relaxed line-clamp-2">
                  Honed, polished, leathered, and flamed processing standards.
                </p>
              </div>

              <div className="space-y-1 pt-3 border-t border-neutral-800">
                <span className="text-[11px] font-mono text-[#D4AF37] font-bold block uppercase tracking-wider">
                  18 Case Studies • High-Res
                </span>
                <span className="text-[10px] font-mono text-neutral-500 block">
                  Updated 4 days ago
                </span>
              </div>
            </div>

            {/* Substrates */}
            <div
              onClick={() => onNavigateTab ? onNavigateTab("substrate-specs") : setSelectedCategory("Substrates")}
              className="group relative bg-[#1f1f1f] border border-[#4c4546] hover:border-[#D4AF37] p-6 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-64 shadow-lg hover:shadow-[#D4AF37]/10"
            >
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-15 transition-opacity pointer-events-none text-[#D4AF37]">
                <FileCheck className="w-36 h-36" />
              </div>
              <div>
                <div className="w-12 h-12 rounded-xl bg-black border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mb-4 group-hover:scale-110 transition-transform">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-xl font-bold text-white mb-1 group-hover:text-[#D4AF37] transition-colors">
                    Substrates
                  </h4>
                  <span className="text-[10px] font-mono text-[#D4AF37] bg-[#D4AF37]/20 border border-[#D4AF37]/40 px-2 py-0.5 rounded font-bold">
                    A-104 CAD &gt;
                  </span>
                </div>
                <p className="text-xs text-[#cfc4c5] leading-relaxed line-clamp-2 mt-1">
                  Structural load-bearing, deflection matrices, & assembly A-104 specs.
                </p>
              </div>

              <div className="space-y-1 pt-3 border-t border-neutral-800">
                <span className="text-[11px] font-mono text-[#D4AF37] font-bold block uppercase tracking-wider">
                  Assembly Detail A-104 • CAD Cross-Section
                </span>
                <span className="text-[10px] font-mono text-neutral-500 block">
                  ASTM C119 Compliant • BS 5385 Certified
                </span>
              </div>
            </div>

            {/* Joint Details */}
            <div
              onClick={() => onNavigateTab ? onNavigateTab("joint-details") : setSelectedCategory("Joint Details")}
              className="group relative bg-[#1f1f1f] border border-[#4c4546] hover:border-[#D4AF37] p-6 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-64 shadow-lg hover:shadow-[#D4AF37]/10"
            >
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-15 transition-opacity pointer-events-none text-[#D4AF37]">
                <CheckCircle2 className="w-36 h-36" />
              </div>
              <div>
                <div className="w-12 h-12 rounded-xl bg-black border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mb-4 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-xl font-bold text-white mb-1 group-hover:text-[#D4AF37] transition-colors">
                    Joint Details
                  </h4>
                  <span className="text-[10px] font-mono text-[#D4AF37] bg-[#D4AF37]/20 border border-[#D4AF37]/40 px-2 py-0.5 rounded font-bold">
                    CAD SPEC &gt;
                  </span>
                </div>
                <p className="text-xs text-[#cfc4c5] leading-relaxed line-clamp-2 mt-1">
                  Invisible seam technology, expansion joint tolerances, & material transitions.
                </p>
              </div>

              <div className="space-y-1 pt-3 border-t border-neutral-800">
                <span className="text-[11px] font-mono text-[#D4AF37] font-bold block uppercase tracking-wider">
                  24 Technical Drawings • Interactive CAD
                </span>
                <span className="text-[10px] font-mono text-neutral-500 block">
                  ISO 9001 Certified • SMC PRO Spec
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* Technical Feed Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-end border-b border-[#D4AF37]/20 pb-4">
            <div>
              <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-[#D4AF37]" />
                Technical Feed
              </h3>
              <p className="text-xs font-mono text-[#cfc4c5] mt-1">
                Live updates & engineering schematics from the SMC Engineering Dept.
              </p>
            </div>
            {selectedCategory !== "All" && (
              <span className="text-xs font-mono bg-[#D4AF37]/20 text-[#D4AF37] px-3 py-1 rounded-full border border-[#D4AF37]/30">
                Filtered: {selectedCategory} ({filteredDocs.length})
              </span>
            )}
          </div>

          {/* List of Documents */}
          <div className="space-y-4">
            {filteredDocs.length === 0 ? (
              <div className="p-12 text-center bg-[#1f1f1f] rounded-2xl border border-neutral-800 space-y-3">
                <Info className="w-8 h-8 text-[#D4AF37] mx-auto" />
                <p className="text-sm font-mono text-neutral-300">No specifications found matching your filter criteria.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                    setSelectedFormat("All");
                  }}
                  className="text-xs font-mono text-[#D4AF37] underline cursor-pointer hover:text-white"
                >
                  Clear search filters
                </button>
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-[#1f1f1f] border border-[#4c4546] hover:border-[#D4AF37] p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 group shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#1b1b1b] border border-[#D4AF37]/30 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#D4AF37]/10 transition-colors">
                      {doc.isCritical ? (
                        <ShieldAlert className="w-6 h-6 text-red-400 animate-pulse" />
                      ) : (
                        <Layers className="w-6 h-6 text-[#D4AF37]" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase tracking-widest px-2 py-0.5 bg-black rounded border border-[#D4AF37]/30">
                          {doc.category}
                        </span>
                        <span className="px-2 py-0.5 bg-black text-white text-[9px] font-mono rounded font-bold border border-neutral-700">
                          {doc.revision}
                        </span>
                        <span className="px-2 py-0.5 bg-neutral-900 text-[#cfc4c5] text-[9px] font-mono rounded">
                          {doc.format} • {doc.fileSize}
                        </span>
                      </div>

                      <h5 className="font-serif text-lg font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                        {doc.title}
                      </h5>

                      <p className="text-xs font-mono text-[#cfc4c5] max-w-3xl leading-relaxed">
                        {doc.description} <span className="text-[#D4AF37]">[{doc.refCode}]</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <span className="text-[10px] font-mono text-neutral-500">
                      Updated {doc.updatedAt}
                    </span>

                    <button
                      onClick={() => setActiveViewerDoc(doc)}
                      className="p-2.5 border border-[#4c4546] hover:border-[#D4AF37] text-white hover:text-[#D4AF37] rounded-lg transition-all cursor-pointer bg-neutral-900 active:scale-95"
                      title="Inspect Specifications & Drawings"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => triggerToast(`Downloading ${doc.refCode} (${doc.format})`)}
                      className="bg-neutral-900 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black border border-[#D4AF37]/40 px-3 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </main>

      {/* MODAL 1: MASTER SPECIFICATION GUIDE ONLINE VIEWER */}
      {showMasterGuideViewer && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-[250] animate-fade-in text-neutral-200">
          <div className="bg-[#1f1f1f] border border-[#D4AF37]/50 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-2xl relative">
            
            {/* Top Toolbar */}
            <div className="bg-black border-b border-[#4c4546] p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#D4AF37]/10 border border-[#D4AF37]/40 rounded-lg text-[#D4AF37]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-mono text-[#D4AF37] uppercase font-bold tracking-widest block">SMC PRO READER</span>
                  <h3 className="font-serif text-lg font-bold text-white">Master Specification Guide (2024 Edition)</h3>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800 text-xs font-mono">
                  <button
                    onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                    disabled={activePage === 1}
                    className="disabled:opacity-30 hover:text-[#D4AF37] cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="text-[#D4AF37] font-bold">Page {activePage} / 48</span>
                  <button
                    onClick={() => setActivePage((p) => Math.min(48, p + 1))}
                    disabled={activePage === 48}
                    className="disabled:opacity-30 hover:text-[#D4AF37] cursor-pointer"
                  >
                    Next
                  </button>
                </div>

                <button
                  onClick={() => triggerToast("Printing Master Specification Document...")}
                  className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-white transition-all cursor-pointer"
                  title="Print Document"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <button
                  onClick={() => triggerToast("Master Spec PDF Download Started")}
                  className="bg-[#D4AF37] text-black px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 hover:bg-white transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => setShowMasterGuideViewer(false)}
                  className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Viewer Canvas Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-[#131313] font-sans">
              
              {/* Document Mock Page Card */}
              <div className="bg-neutral-900 border border-[#D4AF37]/30 rounded-2xl p-8 max-w-3xl mx-auto space-y-6 shadow-2xl relative">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                  <span className="text-[10px] font-mono text-[#D4AF37] font-bold tracking-widest uppercase">
                    CHAPTER 4: FABRICATION & CNC TOLERANCES
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">REF: SMC-SPEC-2024-P{activePage}</span>
                </div>

                <div className="space-y-4">
                  <h4 className="font-serif text-2xl font-bold text-white">
                    Section 4.{activePage}: Natural Stone Miter Joint Reinforcement
                  </h4>
                  <p className="text-xs text-[#cfc4c5] leading-relaxed">
                    All 45-degree miter joints subject to dynamic overhang loads must incorporate continuous internal fiberglass mesh splines or high-tensile carbon rods set in structural epoxy.
                  </p>
                </div>

                {/* Diagram Box */}
                <div className="p-6 bg-black border border-dashed border-[#D4AF37]/40 rounded-xl space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                    <Layers className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-white uppercase block">
                      CAD SCHEMATIC FIG 4.{activePage}.A — DUAL SPLINE ASSEMBLY
                    </span>
                    <p className="text-[10px] font-mono text-neutral-400">
                      Standard clearance 1.2mm epoxy glue gap | Shear Strength: &gt;28 MPa
                    </p>
                  </div>
                </div>

                {/* Specs Table */}
                <div className="border border-neutral-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-black text-[#D4AF37] border-b border-neutral-800">
                      <tr>
                        <th className="p-3">Parameter</th>
                        <th className="p-3">Standard Spec</th>
                        <th className="p-3">SMC Elite Tolerance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 text-neutral-300">
                      <tr>
                        <td className="p-3">Miter Angle Precision</td>
                        <td className="p-3">±0.5°</td>
                        <td className="p-3 text-emerald-400 font-bold">±0.1° CNC Laser</td>
                      </tr>
                      <tr>
                        <td className="p-3">Epoxy Shear Modulus</td>
                        <td className="p-3">15 GPa</td>
                        <td className="p-3 text-emerald-400 font-bold">22 GPa Reinforced</td>
                      </tr>
                      <tr>
                        <td className="p-3">Arris Softening Radius</td>
                        <td className="p-3">1.0mm</td>
                        <td className="p-3 text-emerald-400 font-bold">1.5mm Micro-Chamfer</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: SPECIFIC DOCUMENT DETAIL & CAD SCHEMATIC MODAL */}
      {activeViewerDoc && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[250] animate-fade-in text-neutral-200">
          <div className="bg-[#1f1f1f] border border-[#D4AF37]/50 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase tracking-widest px-2.5 py-0.5 bg-black rounded border border-[#D4AF37]/30 inline-block mb-1">
                  {activeViewerDoc.category}
                </span>
                <h3 className="font-serif text-2xl font-bold text-white">{activeViewerDoc.title}</h3>
                <span className="text-xs font-mono text-neutral-400">Ref Code: {activeViewerDoc.refCode} • {activeViewerDoc.revision}</span>
              </div>
              <button
                onClick={() => setActiveViewerDoc(null)}
                className="p-1.5 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-4">
              <p className="text-xs text-[#cfc4c5] leading-relaxed">
                {activeViewerDoc.description}
              </p>

              {/* Engineering Highlights */}
              {activeViewerDoc.contentDetails && (
                <div className="p-4 bg-black/60 rounded-xl border border-neutral-800 space-y-2">
                  <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase tracking-wider block">
                    Engineering Checklist & Key Directives
                  </span>
                  <ul className="space-y-1.5">
                    {activeViewerDoc.contentDetails.map((item, idx) => (
                      <li key={idx} className="text-xs text-neutral-300 flex items-start gap-2 font-mono">
                        <Check className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Specs Table */}
              {activeViewerDoc.specs && (
                <div className="grid grid-cols-3 gap-3">
                  {activeViewerDoc.specs.map((spec, idx) => (
                    <div key={idx} className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase block">{spec.label}</span>
                      <span className="text-xs font-mono font-bold text-white block mt-0.5">{spec.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => {
                  triggerToast(`Downloading ${activeViewerDoc.refCode} (${activeViewerDoc.format})`);
                  setActiveViewerDoc(null);
                }}
                className="flex-1 bg-[#D4AF37] hover:bg-white text-black font-mono font-bold text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Download {activeViewerDoc.format} ({activeViewerDoc.fileSize})</span>
              </button>

              <button
                onClick={() => {
                  setActiveViewerDoc(null);
                  setShowMasterGuideViewer(true);
                }}
                className="border border-neutral-700 hover:border-[#D4AF37] text-white font-mono font-bold text-xs px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Eye className="w-4 h-4 text-[#D4AF37]" />
                <span>Full Reader</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: STONE SPECIFICATION & PHYSICAL PROPERTIES MODAL */}
      {selectedStoneSpec && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[250] animate-fade-in text-neutral-200">
          <div className="bg-[#191919] border border-[#D4AF37]/50 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative overflow-hidden">
            
            {/* High-tech accent background glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#D4AF37]/40 shrink-0">
                  <img src={selectedStoneSpec.imageUrl} alt={selectedStoneSpec.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase tracking-widest px-2 py-0.5 bg-black rounded border border-[#D4AF37]/30">
                      {selectedStoneSpec.category}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 bg-emerald-950/40 rounded border border-emerald-800/40">
                      {selectedStoneSpec.stockStatus}
                    </span>
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-white mt-1">{selectedStoneSpec.name}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedStoneSpec(null)}
                className="p-1.5 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Material Description & Specification Grid */}
            <div className="space-y-4">
              <p className="text-xs text-[#cfc4c5] font-light leading-relaxed">
                {selectedStoneSpec.description}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-[#0f0f0f] border border-neutral-800 rounded-lg">
                  <span className="text-[9px] font-mono text-[#cfc4c5] uppercase block mb-1">DENSITY</span>
                  <span className="text-xs font-mono font-bold text-[#D4AF37] block">{selectedStoneSpec.density}</span>
                </div>
                <div className="p-3 bg-[#0f0f0f] border border-neutral-800 rounded-lg">
                  <span className="text-[9px] font-mono text-[#cfc4c5] uppercase block mb-1">MOHS HARDNESS</span>
                  <span className="text-xs font-mono font-bold text-[#D4AF37] block">{selectedStoneSpec.mohs}</span>
                </div>
                <div className="p-3 bg-[#0f0f0f] border border-neutral-800 rounded-lg">
                  <span className="text-[9px] font-mono text-[#cfc4c5] uppercase block mb-1">THICKNESS</span>
                  <span className="text-xs font-mono font-bold text-[#D4AF37] block">{selectedStoneSpec.thickness}</span>
                </div>
                <div className="p-3 bg-[#0f0f0f] border border-neutral-800 rounded-lg">
                  <span className="text-[9px] font-mono text-[#cfc4c5] uppercase block mb-1">FINISH</span>
                  <span className="text-xs font-mono font-bold text-[#D4AF37] block">{selectedStoneSpec.finish}</span>
                </div>
              </div>

              {/* Mechanical Properties Matrix */}
              <div className="p-4 bg-black/60 rounded-xl border border-neutral-800 space-y-3 font-mono">
                <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider block">
                  PHYSICAL & MECHANICAL TESTING MATRIX (ASTM / ISO 10545)
                </span>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                    <span className="text-neutral-400">Compressive Strength:</span>
                    <span className="text-white font-bold">{selectedStoneSpec.compressiveStrength}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                    <span className="text-neutral-400">Water Absorption:</span>
                    <span className="text-white font-bold">{selectedStoneSpec.waterAbsorption}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                    <span className="text-neutral-400">Flexural Strength:</span>
                    <span className="text-white font-bold">{selectedStoneSpec.flexuralStrength}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                    <span className="text-neutral-400">Acid Resistance:</span>
                    <span className="text-white font-bold">{selectedStoneSpec.acidResistance}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setSelectedStoneSpec(null);
                  if (onNavigateTab) onNavigateTab("estimator");
                }}
                className="flex-1 bg-[#D4AF37] hover:bg-white text-black font-mono font-bold text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider shadow-md"
              >
                <Sliders className="w-4 h-4" />
                <span>Calculate Instant Quote</span>
              </button>

              <button
                onClick={() => {
                  setSelectedStoneSpec(null);
                  if (onNavigateTab) onNavigateTab("vision");
                }}
                className="border border-neutral-700 hover:border-[#D4AF37] text-white font-mono font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Eye className="w-4 h-4 text-[#D4AF37]" />
                <span>Open AR Studio</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
