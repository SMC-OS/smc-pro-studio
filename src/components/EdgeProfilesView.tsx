import React, { useState } from "react";
import {
  Download,
  Eye,
  Layers,
  FileText,
  CheckCircle,
  Star,
  Sparkles,
  ChevronRight,
  Search,
  Filter,
  Shield,
  Info,
  ArrowLeft,
  X,
  PhoneCall,
  Package,
  Box,
  Compass,
  Cpu,
  Maximize2,
  Check,
  Share2,
  ExternalLink,
  Sliders,
  CheckCircle2,
  Wrench,
  HelpCircle,
  FileCheck
} from "lucide-react";

export interface EdgeProfileItem {
  id: string;
  name: string;
  category: "Minimalist" | "Classic" | "Modern" | "Architectural";
  radius: string;
  description: string;
  bestFor: string;
  complexity: number; // 1-5
  minThickness: string;
  maxOverhang: string;
  cncPrecision: string;
  costMultiplier: string;
  svgPath: string;
  detailNotes: string;
  isPopular?: boolean;
}

const EDGE_PROFILES_CATALOG: EdgeProfileItem[] = [
  {
    id: "mitered-waterfall",
    name: "Mitered Waterfall",
    category: "Architectural",
    radius: "45° Miter",
    description: "Our signature waterfall edge featuring a seamless 45° miter joint for continuous vein flow on island drop-downs.",
    bestFor: "Kitchen Islands & Aprons",
    complexity: 5,
    minThickness: "20mm",
    maxOverhang: "300mm",
    cncPrecision: "±0.5mm",
    costMultiplier: "+35%",
    isPopular: true,
    svgPath: "M10 10 H40 L70 40 V75",
    detailNotes: "Requires dual-stage precision CNC calibration and internal spline reinforcement for maximum structural stability."
  },
  {
    id: "square-eased",
    name: "Square Eased",
    category: "Minimalist",
    radius: "R: 3mm",
    description: "Slightly softened square top and bottom edges to prevent micro-chipping while keeping sharp architectural lines.",
    bestFor: "Modern Minimalist Worktops",
    complexity: 1,
    minThickness: "12mm",
    maxOverhang: "200mm",
    cncPrecision: "±0.2mm",
    costMultiplier: "Standard",
    svgPath: "M20 20 H75 A5 5 0 0 1 80 25 V80",
    detailNotes: "Ideal for contemporary high-rise kitchens and sintered porcelain slabs."
  },
  {
    id: "sharknose",
    name: "Sharknose",
    category: "Modern",
    radius: "45° Undercut",
    description: "Reverse bevel undercut that creates a floating appearance and comfortable handleless grip.",
    bestFor: "Floating Islands & Handleless Cabinetry",
    complexity: 4,
    minThickness: "20mm",
    maxOverhang: "250mm",
    cncPrecision: "±0.3mm",
    costMultiplier: "+25%",
    isPopular: true,
    svgPath: "M20 30 H80 L60 80 H20",
    detailNotes: "Requires specialized diamond router bits. Gives a thin 6mm optical edge profile."
  },
  {
    id: "full-bullnose",
    name: "Full Bullnose",
    category: "Classic",
    radius: "Full Radius",
    description: "A completely rounded smooth curve along both top and bottom edges for maximum impact protection.",
    bestFor: "Family Bathrooms & High-Traffic Areas",
    complexity: 2,
    minThickness: "20mm",
    maxOverhang: "150mm",
    cncPrecision: "±0.4mm",
    costMultiplier: "+10%",
    svgPath: "M20 30 H50 A30 30 0 0 1 50 90",
    detailNotes: "Maximizes safety around young children and reduces risk of edge chipping on soft marble."
  },
  {
    id: "ogee",
    name: "Ogee",
    category: "Classic",
    radius: "S-Curve",
    description: "An elegant double-curved S-shape edge profile reminiscent of traditional European masonry.",
    bestFor: "Traditional Luxury Vanities & Bar Tops",
    complexity: 4,
    minThickness: "30mm",
    maxOverhang: "150mm",
    cncPrecision: "±0.4mm",
    costMultiplier: "+30%",
    isPopular: true,
    svgPath: "M20 20 H50 A15 15 0 0 1 65 35 A15 15 0 0 0 80 50 V80",
    detailNotes: "Highlights vein depth in natural marble and exotic quartzite slabs."
  },
  {
    id: "demi-bullnose",
    name: "Demi Bullnose",
    category: "Classic",
    radius: "Half Radius",
    description: "Rounded upper edge smoothly curving into a flat perpendicular vertical drop for easy drainage.",
    bestFor: "Kitchen Worktops & Wet Bars",
    complexity: 2,
    minThickness: "20mm",
    maxOverhang: "200mm",
    cncPrecision: "±0.3mm",
    costMultiplier: "+12%",
    svgPath: "M20 20 H50 A25 25 0 0 1 75 45 V80",
    detailNotes: "Very practical for wiping spills straight off the counter into the sink."
  },
  {
    id: "beveled",
    name: "Beveled (45° Chamfer)",
    category: "Minimalist",
    radius: "45° Angle",
    description: "A crisp 45-degree angled cut along the top edge catching ambient light beautifully.",
    bestFor: "Modern Office Reception Desks & Islands",
    complexity: 2,
    minThickness: "20mm",
    maxOverhang: "220mm",
    cncPrecision: "±0.3mm",
    costMultiplier: "+15%",
    svgPath: "M20 20 H60 L80 40 V80",
    detailNotes: "Provides clean geometric geometry without sharp upper corners."
  },
  {
    id: "cove-dupont",
    name: "Cove Dupont",
    category: "Architectural",
    radius: "Cove + Radius",
    description: "A crescent-shaped concave cove descending into a smooth rounded bullnose lower curve.",
    bestFor: "Statement Fireplace Hearths & Executive Bars",
    complexity: 5,
    minThickness: "30mm",
    maxOverhang: "120mm",
    cncPrecision: "±0.5mm",
    costMultiplier: "+40%",
    svgPath: "M20 20 H50 A10 10 0 0 1 60 30 V50 A20 20 0 0 1 80 70 V80",
    detailNotes: "Requires multi-axis diamond CNC tools with diamond paste polishing finish."
  },
  {
    id: "mitered-apron",
    name: "Mitered Apron (Double Thickness)",
    category: "Architectural",
    radius: "Square Miter",
    description: "Creates the optical appearance of a massive 50mm to 100mm thick solid stone block.",
    bestFor: "Luxury Vanity Units & Perimeter Worktops",
    complexity: 4,
    minThickness: "20mm",
    maxOverhang: "250mm",
    cncPrecision: "±0.4mm",
    costMultiplier: "+30%",
    isPopular: true,
    svgPath: "M10 20 H70 V60 H10 Z",
    detailNotes: "Epoxy-seamed with custom color-matched adhesives and internal fiberglass backing."
  },
  {
    id: "pencil-edge",
    name: "Pencil Edge",
    category: "Minimalist",
    radius: "R: 6mm",
    description: "A subtle round curve approximately the radius of a standard pencil along top edge.",
    bestFor: "Compact Kitchens & Modern Apartments",
    complexity: 1,
    minThickness: "12mm",
    maxOverhang: "200mm",
    cncPrecision: "±0.2mm",
    costMultiplier: "+8%",
    svgPath: "M20 20 H65 A10 10 0 0 1 75 30 V80",
    detailNotes: "Clean and low-maintenance, suitable for all quartz and natural stone."
  },
  {
    id: "waterfall-triple",
    name: "Triple Cascade Waterfall",
    category: "Architectural",
    radius: "Triple Step",
    description: "Three stepped cascading ridges creating dramatic shadow lines and tactile depth.",
    bestFor: "Bespoke Hospitality Counters & Showrooms",
    complexity: 5,
    minThickness: "30mm",
    maxOverhang: "100mm",
    cncPrecision: "±0.5mm",
    costMultiplier: "+45%",
    svgPath: "M10 10 H40 V25 H55 V40 H70 V75",
    detailNotes: "Custom fabricated to order using multi-blade waterjet arrays."
  },
  {
    id: "chiseled-rock",
    name: "Chiseled / Rock Pitch",
    category: "Modern",
    radius: "Hand-Textured",
    description: "Raw hand-chiseled natural deckle edge highlighting raw crystalline stone texture.",
    bestFor: "Rustic Outdoor Kitchens & Heavy Granite Hearths",
    complexity: 4,
    minThickness: "30mm",
    maxOverhang: "180mm",
    cncPrecision: "Manual Hand Craft",
    costMultiplier: "+35%",
    svgPath: "M10 20 Q 25 15, 40 25 T 70 18 L 65 75",
    detailNotes: "Crafted by senior stonemasons using pneumatic chisels and diamond hammers."
  }
];

interface EdgeProfilesViewProps {
  onNavigateToEstimator?: (profileName: string) => void;
  onNavigateToProjects?: () => void;
}

export default function EdgeProfilesView({
  onNavigateToEstimator,
  onNavigateToProjects
}: EdgeProfilesViewProps) {
  // Navigation Sub-tab
  const [subTab, setSubTab] = useState<"edge-profiles" | "joint-details" | "substrates-structural">("edge-profiles");

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeProfile, setActiveProfile] = useState<EdgeProfileItem>(EDGE_PROFILES_CATALOG[0]);
  
  // Modal States
  const [showSpecSheetModal, setShowSpecSheetModal] = useState<boolean>(false);
  const [showViewer3DModal, setShowViewer3DModal] = useState<boolean>(false);
  const [showCustomSpecModal, setShowCustomSpecModal] = useState<boolean>(false);
  const [showSampleKitModal, setShowSampleKitModal] = useState<boolean>(false);
  const [showSiteSurveyModal, setShowSiteSurveyModal] = useState<boolean>(false);
  const [surveySuccess, setSurveySuccess] = useState<boolean>(false);
  const [surveyForm, setSurveyForm] = useState({
    name: "",
    phone: "",
    address: "",
    substrateType: "Suspended Timber",
    preferredDate: ""
  });

  // Form inputs for custom spec
  const [customProjectName, setCustomProjectName] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [customSuccess, setCustomSuccess] = useState(false);

  // Filtered catalog
  const filteredProfiles = EDGE_PROFILES_CATALOG.filter(item => {
    const matchesCat = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.bestFor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleDownloadDwg = (profile: EdgeProfileItem) => {
    // Generate synthetic DWG CAD spec file download
    const dwgContent = `SECTION HEADER
SMC PRO TECHNICAL CAD PROFILE - SPECIFICATION v2026
PROFILE: ${profile.name.toUpperCase()}
CATEGORY: ${profile.category.toUpperCase()}
RADIUS_SPEC: ${profile.radius}
MIN_THICKNESS: ${profile.minThickness}
CNC_TOLERANCE: ${profile.cncPrecision}
NOTES: ${profile.detailNotes}
ENDSEC`;

    const blob = new Blob([dwgContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SMC_PRO_${profile.id}_CAD_SPEC.dwg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJointPdf = () => {
    const jointPdfContent = `=====================================================
SMC PRO TECHNICAL LIBRARY - INVISIBLE SEAM & JOINT SPECIFICATION
ISO 10545 & DIN 51130 STRUCTURAL ENGINEERING DOSSIER
=====================================================

1. ST-01 BUTT JOINT (STANDARD VERTICAL CLADDING)
   - Code: ST-01
   - Tolerance Gap: 0.5mm - 1.0mm
   - Adhesive Specification: SMC-ULTRA Epox-V2 Color-Matched Resin
   - Thermal Movement Capacity: ± 2%
   - Application: Book-matched vertical feature walls & aprons

2. ST-EX EXPANSION JOINT (LARGE FORMAT FLOORING)
   - Code: ST-EX
   - Tolerance Gap: 3.0mm - 5.0mm
   - Adhesive Specification: FlexSil-90 Elite High-Elasticity Sealant
   - Thermal Movement Capacity: ± 15%
   - Application: Large-format flooring & exterior stone paving

3. MT-09 / MT-HYBRID MATERIAL TRANSITION JOINT
   - Code: MT-09
   - Tolerance Gap: 1.5mm - 2.5mm
   - Adhesive Specification: BondMaster Poly-X Composite Adhesive
   - Thermal Movement Capacity: ± 8%
   - Application: Stone-to-timber and stone-to-metal transition buffers

4. SITE INSTALLATION & CURING MANDATES
   - Ambient Temp Range: 18°C - 24°C for 48 hrs pre and post-installation
   - Sub-Surface Planarity: Deviation < 1.0mm over 3.0m span
   - Curing Timeline: Zero foot traffic for 12 hours. Full capacity at 72 hours.

Verified by SMC PRO Engineering Technical Team
Date: July 2026`;

    const blob = new Blob([jointPdfContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SMC_PRO_Joint_Technical_Drawings_Specification.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-12 animate-fade-in text-[#1A1A1A]">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-neutral-200/80 rounded-2xl p-6 md:p-8 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[#D4AF37]">SMC PRO TECHNICAL LIBRARY</span>
            <span className="bg-neutral-100 text-neutral-600 text-[9px] font-mono font-semibold px-2 py-0.5 rounded uppercase">ISO 10545 Certified</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light">
            {subTab === "edge-profiles" ? "Edge Profile Specifications" : "Invisible Seam & Joint Details"}
          </h1>
          <p className="text-xs text-neutral-500 max-w-2xl leading-relaxed">
            {subTab === "edge-profiles"
              ? "Calibrated architectural CNC edge profiles for marble, granite, quartzite, and sintered porcelain fabrications."
              : "Achieving microscopic tolerance management and structural adhesive integration for invisible stone-to-stone seams."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowSampleKitModal(true)}
            className="bg-[#1A1A1A] hover:bg-[#D4AF37] text-white hover:text-[#1A1A1A] px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Package className="w-4 h-4" /> Order Sample Kit
          </button>
          <button
            onClick={() => setShowCustomSpecModal(true)}
            className="border border-neutral-300 hover:border-[#D4AF37] text-[#1A1A1A] hover:text-[#D4AF37] px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
          >
            <Cpu className="w-4 h-4" /> Request Custom DWG
          </button>
        </div>
      </div>

      {/* TECHNICAL LIBRARY SUB-TAB NAVIGATION */}
      <div className="flex flex-wrap border-b border-neutral-200">
        <button
          onClick={() => setSubTab("edge-profiles")}
          className={`px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            subTab === "edge-profiles"
              ? "border-[#D4AF37] text-[#1A1A1A] bg-neutral-50"
              : "border-transparent text-neutral-400 hover:text-[#1A1A1A]"
          }`}
        >
          <Layers className="w-4 h-4 text-[#D4AF37]" /> Edge Profiles Catalog
        </button>

        <button
          onClick={() => setSubTab("joint-details")}
          className={`px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            subTab === "joint-details"
              ? "border-[#D4AF37] text-[#1A1A1A] bg-neutral-50"
              : "border-transparent text-neutral-400 hover:text-[#1A1A1A]"
          }`}
        >
          <Sliders className="w-4 h-4 text-[#D4AF37]" /> Joint Details & Invisible Seam
        </button>

        <button
          onClick={() => setSubTab("substrates-structural")}
          className={`px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            subTab === "substrates-structural"
              ? "border-[#D4AF37] text-[#1A1A1A] bg-neutral-50"
              : "border-transparent text-neutral-400 hover:text-[#1A1A1A]"
          }`}
        >
          <FileText className="w-4 h-4 text-[#D4AF37]" /> Assembly A-104 & Substrates
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: EDGE PROFILES & SURFACE FINISHES */}
      {/* ========================================================================= */}
      {subTab === "edge-profiles" && (
        <div className="space-y-16 animate-fade-in">
          
          {/* HERO FEATURED EDGE SECTION */}
          <section className="relative w-full rounded-2xl overflow-hidden bg-[#131313] text-white border border-neutral-800 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              
              {/* Left Details */}
              <div className="lg:col-span-5 p-8 md:p-12 space-y-6 z-10">
                <span className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase tracking-[0.3em] block">
                  FEATURED PROFILE SPECIFICATION
                </span>
                <h2 className="font-serif text-3xl md:text-4xl text-white font-medium leading-tight">
                  Signature Mitered Waterfall
                </h2>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  A proprietary refinement process that achieves a zero-gloss continuous grain flow from horizontal island slabs down to vertical gable ends. Precision CNC mitered at 45° with an internal spline reinforcement beam.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-xs border-b border-neutral-800 pb-2">
                    <span className="font-mono text-neutral-400 uppercase text-[10px]">CNC Miter Tolerance</span>
                    <span className="font-mono text-[#D4AF37] font-bold">±0.5mm</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-neutral-800 pb-2">
                    <span className="font-mono text-neutral-400 uppercase text-[10px]">Structural Reinforcement</span>
                    <span className="font-mono text-white font-semibold">Internal Fiberglass Spline</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-neutral-800 pb-2">
                    <span className="font-mono text-neutral-400 uppercase text-[10px]">Seam Joint Width</span>
                    <span className="font-mono text-white font-semibold">&lt; 0.5mm Color-Matched</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                  <button
                    onClick={() => handleDownloadDwg(activeProfile)}
                    className="bg-[#D4AF37] hover:bg-amber-400 text-[#131313] px-6 py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> DOWNLOAD CAD (.DWG)
                  </button>
                  <button
                    onClick={() => setShowSpecSheetModal(true)}
                    className="border border-neutral-700 hover:border-[#D4AF37] text-neutral-200 hover:text-white px-6 py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-[#D4AF37]" /> VIEW SPEC SHEET
                  </button>
                </div>
              </div>

              {/* Right Diagram HUD Viewport */}
              <div className="lg:col-span-7 bg-[#1A1A1A] p-8 md:p-12 border-t lg:border-t-0 lg:border-l border-neutral-800 flex flex-col items-center justify-center relative min-h-[380px]">
                
                {/* Background Technical Grid */}
                <div className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />

                {/* 2D Overlay CAD Diagram Card */}
                <div className="relative w-full max-w-md bg-[#111111]/90 backdrop-blur-md p-6 rounded-2xl border border-[#D4AF37]/30 shadow-2xl z-10 space-y-4">
                  
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                    <span className="text-[10px] font-mono text-[#D4AF37] font-bold tracking-widest uppercase">TECHNICAL CAD DETAIL V.04</span>
                    <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-[#D4AF37]" /> 45° MITER BEAM
                    </span>
                  </div>

                  {/* SVG Vector Drawing */}
                  <div className="h-44 w-full flex items-center justify-center relative bg-black/60 rounded-xl p-4 border border-neutral-800">
                    <svg className="w-full h-full stroke-[#D4AF37] fill-none stroke-2" viewBox="0 0 100 80">
                      {/* Grain Flow Indicators */}
                      <path d="M10 15 Q 25 12, 40 15" stroke="rgba(212, 175, 55, 0.3)" strokeWidth="0.5" />
                      <path d="M10 25 Q 25 22, 40 25" stroke="rgba(212, 175, 55, 0.3)" strokeWidth="0.5" />
                      <path d="M45 45 Q 48 60, 45 75" stroke="rgba(212, 175, 55, 0.3)" strokeWidth="0.5" />
                      <path d="M55 45 Q 58 60, 55 75" stroke="rgba(212, 175, 55, 0.3)" strokeWidth="0.5" />
                      
                      {/* Main Profile Lines */}
                      <path d="M10 10 H40 L40 75 H60 V40 L60 10 H90" stroke="rgba(255,255,255,0.15)" strokeDasharray="2 2" />
                      <path className="stroke-2 stroke-[#D4AF37]" d="M10 10 H40 L70 40 V75" />
                      
                      {/* Miter Angle Callout */}
                      <path d="M40 10 A 30 30 0 0 1 55 25" stroke="#D4AF37" strokeWidth="0.5" />
                      <text className="fill-[#D4AF37] font-mono text-[5px]" x="48" y="18">45° MITER</text>
                      
                      {/* Dimension Callouts */}
                      <text className="fill-white font-mono text-[6px]" x="15" y="8">CONTINUOUS GRAIN FLOW</text>
                      <text className="fill-white font-mono text-[6px]" x="72" y="60">40mm GABLE APRON</text>
                      <text className="fill-[#D4AF37] font-mono text-[5px]" x="42" y="42">SEAM &lt;0.5mm</text>
                    </svg>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-neutral-400 uppercase pt-1">
                    <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
                      <span className="block text-white font-bold mb-0.5">Reinforcement</span>
                      Internal Fiberglass Spline
                    </div>
                    <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
                      <span className="block text-white font-bold mb-0.5">Alignment</span>
                      Book-Matched Grain
                    </div>
                  </div>

                </div>

                {/* Launch 3D Interactive Viewer Button */}
                <button
                  onClick={() => setShowViewer3DModal(true)}
                  className="mt-6 z-10 text-xs font-mono font-bold text-[#D4AF37] hover:text-amber-300 flex items-center gap-2 uppercase tracking-widest cursor-pointer group"
                >
                  <Maximize2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Launch 360° Interactive 3D Viewer</span>
                </button>

              </div>

            </div>
          </section>

          {/* EDGE PROFILE CATALOG GRID */}
          <section className="space-y-8">
            
            {/* Category & Search Filter Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-neutral-200 pb-4">
              <div>
                <h3 className="font-serif text-2xl text-[#1A1A1A] font-medium">Edge Profiles Catalog</h3>
                <p className="text-xs text-neutral-500 mt-1">Select from 12 standardized precision edge cut geometries for estimation and CAD export.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Search Input */}
                <div className="relative flex-1 md:w-56">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search edge profiles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* Category Filter Tabs */}
                <div className="flex bg-neutral-100 p-1 rounded-lg text-xs font-mono font-semibold">
                  {["All", "Minimalist", "Classic", "Modern", "Architectural"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        selectedCategory === cat ? "bg-[#1A1A1A] text-white shadow-xs" : "text-neutral-600 hover:text-[#1A1A1A]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Profiles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProfiles.map((profile) => {
                const isSelected = activeProfile.id === profile.id;
                return (
                  <div
                    key={profile.id}
                    onClick={() => setActiveProfile(profile)}
                    className={`group bg-white rounded-xl border transition-all duration-300 p-6 cursor-pointer flex flex-col justify-between space-y-4 relative ${
                      isSelected
                        ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/30 shadow-md"
                        : "border-neutral-200 hover:border-[#D4AF37]/60 hover:shadow-sm"
                    }`}
                  >
                    {/* Popular Badge */}
                    {profile.isPopular && (
                      <span className="absolute top-3 right-3 bg-[#D4AF37] text-white text-[8px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                        POPULAR
                      </span>
                    )}

                    {/* SVG Vector Box */}
                    <div className="aspect-square bg-neutral-50 rounded-lg border border-neutral-100 flex items-center justify-center p-4 relative overflow-hidden group-hover:bg-neutral-100/60 transition-colors">
                      <svg className="w-28 h-28 stroke-[#1A1A1A] group-hover:stroke-[#D4AF37] transition-colors stroke-2 fill-none" viewBox="0 0 100 100">
                        <path d={profile.svgPath} />
                      </svg>
                      <span className="absolute bottom-2 right-2 font-mono text-[9px] text-neutral-500 bg-white/80 px-1.5 py-0.5 rounded border border-neutral-200">
                        {profile.radius}
                      </span>
                    </div>

                    {/* Name and Description */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold text-[#D4AF37] uppercase block tracking-wider">
                        {profile.category}
                      </span>
                      <h4 className="font-serif text-lg font-semibold text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors">
                        {profile.name}
                      </h4>
                      <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">
                        {profile.description}
                      </p>
                    </div>

                    {/* Parameters Bar */}
                    <div className="space-y-2 pt-2 border-t border-neutral-100 text-[10px] font-mono text-neutral-600">
                      <div className="flex justify-between">
                        <span>Best Application:</span>
                        <span className="font-bold text-[#1A1A1A] truncate max-w-[120px]">{profile.bestFor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cost Impact:</span>
                        <span className="font-bold text-[#D4AF37]">{profile.costMultiplier}</span>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadDwg(profile);
                        }}
                        className="flex-1 bg-neutral-900 hover:bg-[#D4AF37] text-white hover:text-[#1A1A1A] py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors"
                      >
                        <Download className="w-3 h-3" /> CAD DWG
                      </button>
                      {onNavigateToEstimator && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToEstimator(profile.name);
                          }}
                          className="bg-neutral-100 hover:bg-neutral-200 text-[#1A1A1A] p-2 rounded-lg transition-colors"
                          title="Use this edge in Instant Estimator"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </section>

          {/* TECHNICAL DESCRIPTIONS BENTO GRID - SURFACE FINISHES */}
          <section className="bg-neutral-50 border border-neutral-200 rounded-2xl p-8 md:p-12 space-y-8">
            <div className="max-w-2xl space-y-2">
              <span className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase tracking-[0.25em] block">
                SURFACE TEXTURE FINISHES
              </span>
              <h2 className="font-serif text-3xl text-[#1A1A1A] font-medium">Stone Surface Finish Options</h2>
              <p className="text-xs text-neutral-500 leading-relaxed">
                The surface finish directly impacts light reflectivity, slip resistance, and stain absorption across edge cuts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-neutral-200 border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
              
              {/* Honed */}
              <div className="bg-white p-8 space-y-4 hover:bg-neutral-50 transition-colors">
                <h3 className="font-serif text-xl font-medium text-[#1A1A1A]">Honed Finish</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  A smooth, non-reflective matte finish created by stopping short of the final polishing stage. Offers a natural, soft aesthetic.
                </p>
                <div className="space-y-2 text-[10px] font-mono border-t border-neutral-100 pt-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase">Grit Level</span>
                    <span className="text-[#D4AF37] font-bold">400 - 600</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase">Best Application</span>
                    <span className="text-[#1A1A1A] font-bold">Floors & Islands</span>
                  </div>
                </div>
              </div>

              {/* Polished */}
              <div className="bg-white p-8 space-y-4 hover:bg-neutral-50 transition-colors">
                <h3 className="font-serif text-xl font-medium text-[#1A1A1A]">Polished Finish</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  High-gloss mirror finish that accentuates the stone’s rich natural color, mineral specks, and dramatic vein patterns.
                </p>
                <div className="space-y-2 text-[10px] font-mono border-t border-neutral-100 pt-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase">Grit Level</span>
                    <span className="text-[#D4AF37] font-bold">3000+ Mirror</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase">Best Application</span>
                    <span className="text-[#1A1A1A] font-bold">Vanities & Walls</span>
                  </div>
                </div>
              </div>

              {/* Leathered */}
              <div className="bg-white p-8 space-y-4 hover:bg-neutral-50 transition-colors">
                <h3 className="font-serif text-xl font-medium text-[#1A1A1A]">Leathered / Suede</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  A textured finish that mimics the rich feel of leather. Closes stone pores for superior stain and water resistance.
                </p>
                <div className="space-y-2 text-[10px] font-mono border-t border-neutral-100 pt-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase">Surface Profile</span>
                    <span className="text-[#D4AF37] font-bold">Relief Texture</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase">Best Application</span>
                    <span className="text-[#1A1A1A] font-bold">Kitchen Countertops</span>
                  </div>
                </div>
              </div>

              {/* Flamed */}
              <div className="bg-white p-8 space-y-4 hover:bg-neutral-50 transition-colors">
                <h3 className="font-serif text-xl font-medium text-[#1A1A1A]">Flamed Finish</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Achieved by applying high-temperature flame torches to the surface. Creates a rough, non-slip texture ideal for wet areas.
                </p>
                <div className="space-y-2 text-[10px] font-mono border-t border-neutral-100 pt-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase">Slip Rating</span>
                    <span className="text-[#D4AF37] font-bold">R11 High Traction</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase">Best Application</span>
                    <span className="text-[#1A1A1A] font-bold">Outdoor & Pool Decks</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* TECHNICAL PERFORMANCE MATRIX TABLE */}
          <section className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-10 space-y-6 shadow-xs">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-neutral-200 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase tracking-[0.25em] block">
                  ENGINEERING DATA TABLE
                </span>
                <h3 className="font-serif text-2xl text-[#1A1A1A] font-medium">Performance Matrix</h3>
                <p className="text-xs text-neutral-500 mt-1">Comparative technical data based on ISO 10545-17 and DIN 51130 specifications.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase">
                  Architectural Standard
                </span>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#1A1A1A] text-[10px] font-mono uppercase tracking-widest text-[#1A1A1A]">
                    <th className="py-4 px-4">Finish Type</th>
                    <th className="py-4 px-4">Slip Resistance (PTV)</th>
                    <th className="py-4 px-4">Maintenance Schedule</th>
                    <th className="py-4 px-4">Reflectivity (GU)</th>
                    <th className="py-4 px-4">Stain Protection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs font-sans">
                  
                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="py-4 px-4 font-serif font-bold text-sm text-[#1A1A1A]">Honed Finish</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="bg-[#D4AF37] h-full w-[65%]" />
                        </div>
                        <span className="font-mono text-xs font-bold">36+ PTV</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-neutral-600">Bi-Annual Impregnating Reseal</td>
                    <td className="py-4 px-4 font-mono text-neutral-700">10 - 20 GU</td>
                    <td className="py-4 px-4">
                      <div className="flex gap-1 text-[#D4AF37]">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 text-neutral-300" />
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="py-4 px-4 font-serif font-bold text-sm text-[#1A1A1A]">Polished Mirror</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="bg-[#D4AF37] h-full w-[25%]" />
                        </div>
                        <span className="font-mono text-xs font-bold">15 - 20 PTV</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-neutral-600">Daily Microfiber Buffing</td>
                    <td className="py-4 px-4 font-mono text-neutral-700">85 - 100 GU</td>
                    <td className="py-4 px-4">
                      <div className="flex gap-1 text-[#D4AF37]">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="py-4 px-4 font-serif font-bold text-sm text-[#1A1A1A]">Leathered Relief</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="bg-[#D4AF37] h-full w-[85%]" />
                        </div>
                        <span className="font-mono text-xs font-bold">45+ PTV</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-neutral-600">Annual Penetrating Sealer</td>
                    <td className="py-4 px-4 font-mono text-neutral-700">5 - 15 GU</td>
                    <td className="py-4 px-4">
                      <div className="flex gap-1 text-[#D4AF37]">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="py-4 px-4 font-serif font-bold text-sm text-[#1A1A1A]">Flamed Traction</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="bg-[#D4AF37] h-full w-[95%]" />
                        </div>
                        <span className="font-mono text-xs font-bold">55+ PTV (R11)</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-neutral-600">Low Maintenance / Washdown</td>
                    <td className="py-4 px-4 font-mono text-neutral-700">&lt; 5 GU</td>
                    <td className="py-4 px-4">
                      <div className="flex gap-1 text-[#D4AF37]">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 text-neutral-300" />
                      </div>
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </section>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: JOINT DETAILS & INVISIBLE SEAM TECHNOLOGY */}
      {/* ========================================================================= */}
      {subTab === "joint-details" && (
        <div className="space-y-12 animate-fade-in">
          
          {/* HERO SECTION: INVISIBLE SEAM TECHNOLOGY */}
          <section className="bg-white border border-neutral-200 rounded-2xl p-8 md:p-12 shadow-xs">
            <div className="flex flex-col lg:flex-row gap-8 items-center">
              
              <div className="lg:w-5/12 space-y-6">
                <span className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase tracking-[0.25em] block">
                  PRECISION ENGINEERING
                </span>
                <h2 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light leading-tight">
                  Invisible Seam Technology
                </h2>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Achieving seamless aesthetic continuity through microscopic tolerance management, zero-void epoxy resin injection, and structural adhesive integration.
                </p>

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg">
                  <Shield className="w-4 h-4 text-[#D4AF37]" />
                  <span className="font-mono text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                    Tolerance &lt; 0.5mm
                  </span>
                </div>
              </div>

              <div className="lg:w-7/12 w-full relative h-[360px] overflow-hidden rounded-2xl border border-neutral-200 group bg-[#111] shadow-lg">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcTSEeGtSaZbQJ3_1AxskmJYx8nhmg_PFElsSOjKcpTH2bZgFFdfFT1jqB3b0_Tqyqo8w04G75vjqkafLT9sVPUsL2Z34dJCslkXL-a1q2A3ztwadtWYHQ13gnA9M9ejKikVwxuzOZ3uHRwXjs1T_TA5S3Vb1f6lo5Lhn6nnpqtmaFMnfjHwHNmtrbtWRljxWBoa4N5vggK6W1e1Tpjag7AadsxHpvYcRzP97f-jY-LlbKBPVjIZpi4qa5VF4kfyrhvpO8L2b_eIA"
                  alt="Joint Detail Architectural Cross Section"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                
                <div className="absolute bottom-6 left-6 z-20 flex items-center gap-3 bg-black/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
                  <span className="font-mono text-xs text-white uppercase font-bold tracking-widest">
                    Active Structural Cross-Section Analysis
                  </span>
                </div>
              </div>

            </div>
          </section>

          {/* JOINT CATALOG GRID */}
          <section className="space-y-6">
            <div className="flex justify-between items-end border-b border-neutral-200 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase tracking-[0.2em] block">
                  SYSTEM CATALOG
                </span>
                <h3 className="font-serif text-2xl text-[#1A1A1A] font-medium">Standard Joint Configurations</h3>
              </div>
              <span className="font-mono text-xs font-bold text-neutral-500 uppercase">3 Standard Profiles</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Butt Joint */}
              <div className="bg-white p-8 rounded-2xl border border-neutral-200 hover:border-[#D4AF37] transition-all space-y-6 shadow-xs relative group">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-[#D4AF37]">
                    <Box className="w-6 h-6" />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-neutral-400 bg-neutral-100 px-2 py-1 rounded">
                    CODE: ST-01
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-serif text-xl font-bold text-[#1A1A1A]">Butt Joint (Standard)</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Designed for vertical cladding and book-matched feature walls where aesthetic continuity is paramount.
                  </p>
                </div>

                <div className="space-y-2 pt-4 border-t border-neutral-100 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase text-[10px]">Tolerance Gap</span>
                    <span className="font-bold text-[#1A1A1A]">0.5mm - 1.0mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase text-[10px]">Primary Application</span>
                    <span className="font-bold text-[#D4AF37]">Vertical Cladding</span>
                  </div>
                </div>
              </div>

              {/* Expansion Joint */}
              <div className="bg-white p-8 rounded-2xl border border-neutral-200 hover:border-[#D4AF37] transition-all space-y-6 shadow-xs relative group">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-[#D4AF37]">
                    <Compass className="w-6 h-6" />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-neutral-400 bg-neutral-100 px-2 py-1 rounded">
                    CODE: ST-EX
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-serif text-xl font-bold text-[#1A1A1A]">Expansion Joint</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Essential for large-format floor installations and exterior paving. Integrated with high-elasticity flexible sealants.
                  </p>
                </div>

                <div className="space-y-2 pt-4 border-t border-neutral-100 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase text-[10px]">Tolerance Gap</span>
                    <span className="font-bold text-[#1A1A1A]">3.0mm - 5.0mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase text-[10px]">Primary Application</span>
                    <span className="font-bold text-[#D4AF37]">Flooring & Paving</span>
                  </div>
                </div>
              </div>

              {/* Material Transition */}
              <div className="bg-white p-8 rounded-2xl border border-neutral-200 hover:border-[#D4AF37] transition-all space-y-6 shadow-xs relative group">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-[#D4AF37]">
                    <Layers className="w-6 h-6" />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-neutral-400 bg-neutral-100 px-2 py-1 rounded">
                    CODE: MT-09
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-serif text-xl font-bold text-[#1A1A1A]">Material Transition</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Technical interface details for stone-to-timber or stone-to-metal transitions using thermal buffers.
                  </p>
                </div>

                <div className="space-y-2 pt-4 border-t border-neutral-100 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase text-[10px]">Buffer Type</span>
                    <span className="font-bold text-[#1A1A1A]">Composite Thermal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase text-[10px]">Integration</span>
                    <span className="font-bold text-[#D4AF37]">Hybrid Bond</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* ENGINEERING MATRIX TABLE */}
          <section className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-10 space-y-6 shadow-xs">
            <div className="border-b border-neutral-200 pb-4">
              <span className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase tracking-[0.2em] block">
                TECHNICAL SPECS
              </span>
              <h3 className="font-serif text-2xl text-[#1A1A1A] font-medium">Engineering Matrix</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-200 text-[10px] font-mono uppercase text-neutral-500 tracking-wider">
                    <th className="px-6 py-4">Joint Type</th>
                    <th className="px-6 py-4">Min/Max Gap</th>
                    <th className="px-6 py-4">Adhesive Specification</th>
                    <th className="px-6 py-4">Movement Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-mono text-xs">
                  
                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#1A1A1A]">ST-01 Standard Butt</td>
                    <td className="px-6 py-4 text-neutral-600">0.5mm / 1.0mm</td>
                    <td className="px-6 py-4 text-[#D4AF37] font-bold">SMC-ULTRA Epox-V2</td>
                    <td className="px-6 py-4 text-neutral-600">± 2%</td>
                  </tr>

                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#1A1A1A]">ST-EX Expansion</td>
                    <td className="px-6 py-4 text-neutral-600">3.0mm / 5.0mm</td>
                    <td className="px-6 py-4 text-[#D4AF37] font-bold">FlexSil-90 Elite</td>
                    <td className="px-6 py-4 text-neutral-600">± 15%</td>
                  </tr>

                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#1A1A1A]">MT-Hybrid Transition</td>
                    <td className="px-6 py-4 text-neutral-600">1.5mm / 2.5mm</td>
                    <td className="px-6 py-4 text-[#D4AF37] font-bold">BondMaster Poly-X</td>
                    <td className="px-6 py-4 text-neutral-600">± 8%</td>
                  </tr>

                </tbody>
              </table>
            </div>
          </section>

          {/* SITE INSTALLATION GUIDELINES & CONSULTANT CALLBACK */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            
            <div className="bg-white p-8 rounded-2xl border border-neutral-200 space-y-6">
              <h3 className="font-serif text-2xl font-bold text-[#1A1A1A]">Site Installation Guidelines</h3>
              
              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-[#1A1A1A] mb-1">Ambient Temperature Control</h5>
                    <p className="text-neutral-600 leading-relaxed">
                      Ambient site temperature must be strictly maintained between 18°C and 24°C for 48 hours prior to and post installation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-[#1A1A1A] mb-1">Sub-Surface Leveling</h5>
                    <p className="text-neutral-600 leading-relaxed">
                      Sub-surface planarity must not exceed ±1mm deviation over a 3-meter straight-edge span.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-[#1A1A1A] mb-1">Adhesive Curing Timeline</h5>
                    <p className="text-neutral-600 leading-relaxed">
                      Zero foot traffic or load bearing for the first 12 hours. Full structural capacity reached at 72 hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#111] text-white p-8 rounded-2xl border border-neutral-800 flex flex-col justify-center items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
                <Wrench className="w-8 h-8" />
              </div>
              
              <div className="space-y-2 max-w-md">
                <h4 className="font-serif text-2xl font-medium">Bespoke Structural Support</h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Need a custom joint specification for a unique load-bearing or complex curved architectural slab? Our master stonemasons and structural engineers are available for direct site consultation.
                </p>
              </div>

              <button
                onClick={() => setShowCustomSpecModal(true)}
                className="w-full max-w-xs py-3.5 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#111] font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer"
              >
                Contact Engineering Consultant
              </button>
            </div>

          </section>

          {/* PRIMARY DOWNLOAD ACTION */}
          <section className="pt-4">
            <button
              onClick={handleDownloadJointPdf}
              className="w-full bg-[#D4AF37] hover:bg-amber-400 text-[#111] h-16 rounded-2xl flex items-center justify-center gap-3 font-mono text-xs font-bold uppercase tracking-[0.2em] shadow-lg transition-all cursor-pointer group"
            >
              <Download className="w-5 h-5" />
              <span>Download Technical Drawings Dossier (.PDF)</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </section>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: ASSEMBLY DETAIL A-104, SUBSTRATES & STRUCTURAL CERTIFICATION */}
      {/* ========================================================================= */}
      {subTab === "substrates-structural" && (
        <div className="space-y-16 animate-fade-in">
          
          {/* HERO: CAD CROSS-SECTION ASSEMBLY DETAIL A-104 */}
          <section className="relative">
            <div className="mb-8 text-center md:text-left">
              <span className="font-mono text-xs font-bold text-[#D4AF37] tracking-[0.2em] block mb-1 uppercase">
                ASSEMBLY DETAIL A-104
              </span>
              <h2 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] italic font-normal">
                Luxury Floor Substrate
              </h2>
            </div>

            <div className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-white border border-neutral-200 overflow-hidden rounded-2xl shadow-sm group">
              {/* CAD Diagram Container */}
              <div className="absolute inset-0 flex flex-col p-6 md:p-10 justify-end">
                
                {/* 20mm Marble Slab Layer */}
                <div className="h-16 w-3/4 border border-[#D4AF37]/50 bg-neutral-50/80 relative mb-[1px] transition-all hover:bg-[#D4AF37]/10 cursor-pointer group/layer">
                  <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-32 border-t border-[#D4AF37]/60 border-dashed" />
                  <span className="absolute -right-40 top-1/2 -translate-y-1/2 font-mono text-xs text-[#D4AF37] font-bold">
                    20mm Natural Marble
                  </span>
                </div>

                {/* Adhesive Bed Layer */}
                <div className="h-4 w-3/4 border-x border-neutral-300 bg-neutral-100 relative mb-[1px] transition-all hover:bg-neutral-200 cursor-pointer group/layer">
                  <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-24 border-t border-neutral-400 border-dashed" />
                  <span className="absolute -right-52 top-1/2 -translate-y-1/2 font-mono text-xs text-neutral-600 font-medium">
                    S1 Flexible Adhesive Bed
                  </span>
                </div>

                {/* Decoupling Membrane Layer */}
                <div className="h-2.5 w-3/4 bg-[#D4AF37] relative mb-[1px] transition-all hover:brightness-110 cursor-pointer group/layer shadow-xs">
                  <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-16 border-t border-[#D4AF37] border-dashed" />
                  <span className="absolute -right-60 top-1/2 -translate-y-1/2 font-mono text-xs text-[#D4AF37] font-bold">
                    Uncoupling Membrane
                  </span>
                </div>

                {/* Concrete Base Layer */}
                <div className="h-32 w-3/4 border-x border-b border-neutral-300 bg-neutral-100 relative flex items-center justify-center overflow-hidden transition-all hover:bg-neutral-200/80 cursor-pointer group/layer">
                  <div
                    className="absolute inset-0 opacity-15 bg-cover bg-center grayscale"
                    style={{
                      backgroundImage: "url('https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&w=1200&q=80')"
                    }}
                  />
                  <div className="absolute -right-4 top-1/3 -translate-y-1/2 w-8 border-t border-neutral-400 border-dashed" />
                  <span className="absolute -right-48 top-1/3 -translate-y-1/2 font-mono text-xs text-neutral-600 font-medium">
                    Structural Concrete Slab
                  </span>
                </div>

                {/* Grid Overlay */}
                <div
                  className="absolute inset-0 opacity-[0.04] pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(#000 0.8px, transparent 0.8px)",
                    backgroundSize: "24px 24px"
                  }}
                />
              </div>

              {/* Technical Callout Badge */}
              <div className="absolute top-6 right-6 text-right hidden sm:block bg-white/90 backdrop-blur-xs p-3 rounded-xl border border-neutral-200/80 shadow-xs">
                <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-tighter">
                  Coord: 51.5074° N, 0.1278° W
                </p>
                <p className="font-mono text-[10px] text-neutral-700 font-bold uppercase tracking-tighter mt-0.5">
                  Scale: 1:10 @ A3 • SMC ISO-10545
                </p>
              </div>
            </div>
          </section>

          {/* STRUCTURAL REQUIREMENTS MATRIX */}
          <section className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-10 space-y-8 shadow-xs">
            <div className="flex items-center gap-6">
              <h3 className="font-serif text-2xl text-[#1A1A1A] font-medium">Structural Requirements Matrix</h3>
              <div className="flex-grow h-[1px] bg-neutral-200" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#D4AF37]">
                    <th className="py-4 px-4 font-mono text-xs text-[#1A1A1A] font-bold uppercase tracking-wider">Substrate Type</th>
                    <th className="py-4 px-4 font-mono text-xs text-[#1A1A1A] font-bold uppercase tracking-wider">Max Deflection</th>
                    <th className="py-4 px-4 font-mono text-xs text-[#1A1A1A] font-bold uppercase tracking-wider">Recommended Prep</th>
                    <th className="py-4 px-4 font-mono text-xs text-[#1A1A1A] font-bold uppercase tracking-wider">Cure Time</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs divide-y divide-neutral-100">
                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="py-5 px-4 text-[#1A1A1A] font-bold">Suspended Timber</td>
                    <td className="py-5 px-4 text-[#D4AF37] font-bold text-sm">L/720</td>
                    <td className="py-5 px-4 text-neutral-600">Lateral reinforcement + 18mm Marine Plywood</td>
                    <td className="py-5 px-4 text-neutral-500">N/A</td>
                  </tr>
                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="py-5 px-4 text-[#1A1A1A] font-bold">Sand/Cement Screed</td>
                    <td className="py-5 px-4 text-[#D4AF37] font-bold text-sm">L/360</td>
                    <td className="py-5 px-4 text-neutral-600">Anti-fracture mat (full coverage)</td>
                    <td className="py-5 px-4 text-neutral-500">21 Days min.</td>
                  </tr>
                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="py-5 px-4 text-[#1A1A1A] font-bold">Cast Concrete</td>
                    <td className="py-5 px-4 text-[#D4AF37] font-bold text-sm">L/360</td>
                    <td className="py-5 px-4 text-neutral-600">Mechanical scabbling + Primer G</td>
                    <td className="py-5 px-4 text-neutral-500">6 Weeks min.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* WALL REINFORCEMENT GUIDE */}
          <section className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              
              <div className="space-y-6 flex flex-col justify-between">
                <div className="space-y-3">
                  <h3 className="font-serif text-3xl text-[#1A1A1A] font-medium">Wall Reinforcement Guide</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed max-w-prose">
                    Vertical stone cladding requires precise calculation of load-bearing capacity. For slabs exceeding 40kg/m², mechanical fixings are mandatory as per SMC technical protocol.
                  </p>
                </div>

                <div className="space-y-4">
                  
                  <div className="bg-white p-6 rounded-2xl border border-neutral-200 hover:border-[#D4AF37] transition-all flex items-start gap-5 shadow-xs group">
                    <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] shrink-0 mt-0.5">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1A1A1A] text-sm mb-1">Mechanical Fixing</h4>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        Stainless steel 'Z' brackets or kerf-cut anchors. Required for external facades and all stone above 3m height.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-neutral-200 hover:border-[#D4AF37] transition-all flex items-start gap-5 shadow-xs group">
                    <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] shrink-0 mt-0.5">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1A1A1A] text-sm mb-1">Adhesive Bonding</h4>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        High-polymer C2FTE adhesive. Only applicable for calibrated stone on rendered masonry or cement-board surfaces.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Technical Detail Image Card */}
              <div className="relative group min-h-[380px] rounded-2xl overflow-hidden border border-neutral-200 shadow-xs flex flex-col">
                <div
                  className="flex-grow bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700 min-h-[280px]"
                  style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80')"
                  }}
                />
                <div className="p-6 bg-white border-t border-neutral-200 flex justify-between items-center">
                  <span className="font-mono text-xs font-bold text-neutral-600">Ref: SMC-W-22</span>
                </div>
              </div>

            </div>
          </section>

          {/* SUBSTRATE VERIFICATION REQUIREMENT */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 md:p-14 relative overflow-hidden text-center text-white shadow-xl">
            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <span className="font-mono text-xs font-bold text-[#D4AF37] uppercase tracking-[0.25em] block">
                SUBSTRATE VERIFICATION
              </span>
              <h3 className="font-serif text-3xl md:text-5xl text-white italic font-normal">
                SMC Installation Standard
              </h3>
              <p className="text-xs md:text-sm text-neutral-300 leading-relaxed max-w-2xl mx-auto">
                All substrates must be verified by SMC prior to stone installation. Contact SMC for the warranty
                terms applicable to your project.
              </p>

              <div className="flex flex-wrap gap-4 justify-center py-2">
                <div className="flex items-center gap-2.5 font-mono text-xs text-white uppercase tracking-wider bg-neutral-800 border border-neutral-700 px-5 py-2.5 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]" /> Moisture Content &lt; 2%
                </div>
                <div className="flex items-center gap-2.5 font-mono text-xs text-white uppercase tracking-wider bg-neutral-800 border border-neutral-700 px-5 py-2.5 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]" /> Tensile Strength &gt; 1.5N/mm²
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setShowSiteSurveyModal(true)}
                  className="bg-[#D4AF37] text-neutral-950 px-10 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] hover:bg-amber-400 transition-all shadow-lg hover:shadow-[#D4AF37]/30 rounded-xl cursor-pointer"
                >
                  Book Technician Site-Survey
                </button>
              </div>
            </div>
          </section>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SPEC SHEET VIEW MODAL */}
      {/* ========================================================================= */}
      {showSpecSheetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative border border-neutral-200 text-[#1A1A1A]">
            
            <div className="flex justify-between items-start border-b border-neutral-100 pb-4">
              <div>
                <span className="text-[9px] font-mono text-[#D4AF37] font-bold tracking-widest uppercase block">
                  TECHNICAL SPECIFICATION DOSSIER
                </span>
                <h3 className="font-serif text-2xl font-medium">{activeProfile.name} Specification</h3>
              </div>
              <button
                onClick={() => setShowSpecSheetModal(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-[#1A1A1A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-500 uppercase">Profile Identifier:</span>
                  <span className="font-bold text-[#1A1A1A]">{activeProfile.id.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 uppercase">Category:</span>
                  <span className="font-bold text-[#D4AF37]">{activeProfile.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 uppercase">Recommended Min Slab Thickness:</span>
                  <span className="font-bold text-[#1A1A1A]">{activeProfile.minThickness}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 uppercase">Max Unsupported Overhang:</span>
                  <span className="font-bold text-[#1A1A1A]">{activeProfile.maxOverhang}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 uppercase">CNC Milling Precision:</span>
                  <span className="font-bold text-[#1A1A1A]">{activeProfile.cncPrecision}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-serif font-bold text-sm text-[#1A1A1A]">Fabrication & Engineering Notes</h4>
                <p className="text-neutral-600 leading-relaxed font-sans">{activeProfile.detailNotes}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <h4 className="font-serif font-bold text-sm text-[#1A1A1A]">Tooling & Machinery Requirements</h4>
                <ul className="list-disc list-inside space-y-1 text-neutral-600 font-sans">
                  <li>5-Axis Waterjet / CNC Bridge Saw with auto-tilt head</li>
                  <li>Diamond impregnated profiling router wheels (Grit 120 through 3000)</li>
                  <li>Epoxy color-matched joint fillers (e.g. Tenax / Akemi)</li>
                </ul>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100">
              <button
                onClick={() => setShowSpecSheetModal(false)}
                className="border border-neutral-300 text-neutral-600 px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadDwg(activeProfile)}
                className="bg-[#1A1A1A] hover:bg-[#D4AF37] text-white hover:text-[#1A1A1A] px-5 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" /> Export DWG CAD
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: 3D INTERACTIVE VIEWER MODAL */}
      {/* ========================================================================= */}
      {showViewer3DModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#111111] text-white rounded-2xl p-6 max-w-3xl w-full space-y-6 shadow-2xl border border-neutral-800">
            
            <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[9px] font-mono text-[#D4AF37] font-bold tracking-widest uppercase block">
                  3D AR CAD SURFACE RENDERER
                </span>
                <h3 className="font-serif text-xl font-medium text-white">{activeProfile.name} 3D Visualizer</h3>
              </div>
              <button
                onClick={() => setShowViewer3DModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Interactive 3D Simulation Canvas Box */}
            <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center group">
              <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

              <div className="text-center space-y-4 z-10 p-6">
                <Maximize2 className="w-12 h-12 text-[#D4AF37] mx-auto animate-pulse" />
                <h4 className="font-serif text-lg font-bold text-white">360° Interactive CAD Model</h4>
                <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                  3D solid STEP mesh rendering active. Simulating light refraction across {activeProfile.name} cut geometry with real-time shadow displacement.
                </p>
                <div className="inline-flex gap-2">
                  <span className="bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-[#D4AF37] px-3 py-1 rounded">
                    Polycount: 14,200 Triangles
                  </span>
                  <span className="bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-emerald-400 px-3 py-1 rounded">
                    Format: WebGL 2.0
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs font-mono text-neutral-400">
                Precision Mesh: <strong className="text-white">{activeProfile.cncPrecision}</strong>
              </span>
              <button
                onClick={() => setShowViewer3DModal(false)}
                className="bg-[#D4AF37] text-black px-6 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider"
              >
                Close Visualizer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REQUEST CUSTOM DWG MODAL */}
      {/* ========================================================================= */}
      {showCustomSpecModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl border border-neutral-200 text-[#1A1A1A]">
            
            <div className="flex justify-between items-start border-b border-neutral-100 pb-4">
              <div>
                <span className="text-[9px] font-mono text-[#D4AF37] font-bold tracking-widest uppercase block">
                  BESPOKE ENGINEERING PATHS
                </span>
                <h3 className="font-serif text-2xl font-medium">Request Custom DWG / CAD Spec</h3>
              </div>
              <button
                onClick={() => {
                  setShowCustomSpecModal(false);
                  setCustomSuccess(false);
                }}
                className="text-neutral-400 hover:text-[#1A1A1A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {customSuccess ? (
              <div className="py-8 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-[#D4AF37] mx-auto" />
                <h4 className="font-serif text-xl font-bold">Custom DWG Spec Dispatched</h4>
                <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
                  Our CAD engineering team has received your custom geometry parameters. A technical .DWG file bundle will be emailed to {customEmail || "your email"} within 2 business hours.
                </p>
                <button
                  onClick={() => {
                    setShowCustomSpecModal(false);
                    setCustomSuccess(false);
                  }}
                  className="bg-[#1A1A1A] text-white px-6 py-2.5 rounded-xl font-mono text-xs font-bold uppercase"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCustomSuccess(true);
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="font-mono text-[10px] font-bold text-neutral-500 uppercase block mb-1">Project Name / Reference</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SW3 Kensington Penthouse Kitchen"
                    value={customProjectName}
                    onChange={(e) => setCustomProjectName(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] font-bold text-neutral-500 uppercase block mb-1">Architect / Specifier Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. studio@architects.co.uk"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold text-neutral-500 uppercase">Custom Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Describe custom bevel angles, stepped grooves, or specific joint tolerances..."
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-xs font-sans leading-relaxed focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCustomSpecModal(false)}
                    className="border border-neutral-300 text-neutral-600 px-4 py-2 rounded-lg text-xs font-mono uppercase font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#1A1A1A] hover:bg-[#D4AF37] text-white hover:text-[#1A1A1A] px-5 py-2 rounded-lg text-xs font-mono uppercase font-bold tracking-wider cursor-pointer"
                  >
                    Submit DWG Request
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ORDER SAMPLE KIT MODAL */}
      {/* ========================================================================= */}
      {showSampleKitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl border border-neutral-200 text-[#1A1A1A]">
            
            <div className="flex justify-between items-start border-b border-neutral-100 pb-4">
              <div>
                <span className="text-[9px] font-mono text-[#D4AF37] font-bold tracking-widest uppercase block">
                  PHYSICAL SAMPLE SWATCHES
                </span>
                <h3 className="font-serif text-2xl font-medium">Request Curator Sample Kit</h3>
              </div>
              <button
                onClick={() => setShowSampleKitModal(false)}
                className="text-neutral-400 hover:text-[#1A1A1A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Our Curator's Sample Kit includes calibrated swatches of all 12 edge profiles and joint detail samples across Honed, Polished, and Leathered natural stone and porcelain slabs. Delivered via express courier within 24 hours.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Curator Sample Kit order dispatched! Tracking confirmation sent via email.");
                setShowSampleKitModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-mono text-[10px] font-bold text-neutral-500 uppercase block mb-1">Shipping Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jonathan Mercer"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 font-semibold"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold text-neutral-500 uppercase block mb-1">Delivery Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 14 Curzon Street, Mayfair, London W1J 5HN"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 font-semibold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSampleKitModal(false)}
                  className="border border-neutral-300 text-neutral-600 px-4 py-2 rounded-lg text-xs font-mono uppercase font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1A1A1A] hover:bg-[#D4AF37] text-white hover:text-[#1A1A1A] px-5 py-2 rounded-lg text-xs font-mono uppercase font-bold tracking-wider cursor-pointer"
                >
                  Dispatch Sample Kit
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: BOOK TECHNICIAN SITE SURVEY MODAL */}
      {/* ========================================================================= */}
      {showSiteSurveyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[150] flex items-center justify-center p-4 animate-fade-in text-[#1A1A1A]">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 md:p-8 space-y-6 shadow-2xl border border-neutral-200">
            <div className="flex justify-between items-start border-b border-neutral-200 pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#D4AF37] font-bold tracking-widest uppercase block mb-1">
                  SMC CERTIFICATION SURVEY
                </span>
                <h3 className="font-serif text-2xl font-medium text-[#1A1A1A]">Book Technician Site-Survey</h3>
              </div>
              <button
                onClick={() => setShowSiteSurveyModal(false)}
                className="text-neutral-400 hover:text-[#1A1A1A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {surveySuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-[#D4AF37] mx-auto animate-bounce" />
                <h4 className="font-serif text-xl font-medium text-[#1A1A1A]">Site Survey Scheduled!</h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  An SMC Master Certified Technician will arrive on your site for substrate moisture and tensile testing on {surveyForm.preferredDate || "your preferred date"}. Reference code: <span className="font-mono font-bold text-[#1A1A1A]">SMC-SURVEY-2026</span>.
                </p>
                <button
                  onClick={() => {
                    setSurveySuccess(false);
                    setShowSiteSurveyModal(false);
                  }}
                  className="mt-4 bg-[#1A1A1A] text-white px-6 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider"
                >
                  Close Confirmation
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSurveySuccess(true);
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="font-mono text-[10px] font-bold text-neutral-500 uppercase block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={surveyForm.name}
                    onChange={(e) => setSurveyForm({ ...surveyForm, name: e.target.value })}
                    placeholder="e.g. Architect Sarah Jenkins"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 font-medium"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] font-bold text-neutral-500 uppercase block mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={surveyForm.phone}
                    onChange={(e) => setSurveyForm({ ...surveyForm, phone: e.target.value })}
                    placeholder="e.g. +44 7700 900123"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 font-medium"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] font-bold text-neutral-500 uppercase block mb-1">Project Site Address</label>
                  <input
                    type="text"
                    required
                    value={surveyForm.address}
                    onChange={(e) => setSurveyForm({ ...surveyForm, address: e.target.value })}
                    placeholder="e.g. 28 Kensington Palace Gardens, London"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 font-medium"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] font-bold text-neutral-500 uppercase block mb-1">Substrate Type</label>
                  <select
                    value={surveyForm.substrateType}
                    onChange={(e) => setSurveyForm({ ...surveyForm, substrateType: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 font-medium"
                  >
                    <option value="Suspended Timber">Suspended Timber (L/720)</option>
                    <option value="Sand/Cement Screed">Sand/Cement Screed (L/360)</option>
                    <option value="Cast Concrete">Cast Concrete (L/360)</option>
                    <option value="Vertical Wall Cladding">Vertical Wall Cladding (SMC-W-22)</option>
                  </select>
                </div>

                <div>
                  <label className="font-mono text-[10px] font-bold text-neutral-500 uppercase block mb-1">Preferred Survey Date</label>
                  <input
                    type="date"
                    required
                    value={surveyForm.preferredDate}
                    onChange={(e) => setSurveyForm({ ...surveyForm, preferredDate: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 font-medium"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setShowSiteSurveyModal(false)}
                    className="border border-neutral-300 text-neutral-600 px-4 py-2.5 rounded-xl font-mono text-xs uppercase font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#D4AF37] hover:bg-amber-400 text-neutral-950 px-6 py-2.5 rounded-xl font-mono text-xs uppercase font-bold tracking-wider cursor-pointer shadow-md"
                  >
                    Confirm Booking
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
