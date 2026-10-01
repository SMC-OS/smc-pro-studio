import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import {
  Sparkles,
  Info,
  HelpCircle,
  Lightbulb,
  Target,
  Maximize2,
  Calculator,
  FolderGit2,
  Send,
  MessageSquare,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  ArrowRight,
  Search,
  Check,
  ChevronRight,
  Cpu,
  RefreshCw,
  HardDrive,
  Activity,
  FileText,
  User,
  Boxes,
  LogOut,
  Sliders,
  DollarSign,
  AlertTriangle,
  Flame,
  Droplet,
  ExternalLink,
  Hammer,
  QrCode,
  Camera,
  X,
  Filter,
  FileDown,
  Copy,
  History,
  RotateCcw,
  RotateCw,
  Briefcase,
  TrendingUp,
  LayoutDashboard,
  ArrowUpDown,
  ChevronDown,
  Calendar,
  Milestone,
  Wrench,
  Truck,
  CheckCircle2,
  AlertCircle,
  Edit3,
  StickyNote,
  Pin,
  Tag,
  Columns,
  GitCompare,
  Menu,
  Heart,
  ShieldCheck,
  Layers,
  PenTool,
  Star,
  Award,
  FileSpreadsheet,
  ZoomIn,
  ZoomOut,
  SwitchCamera,
  Wifi,
  WifiOff,
  Globe,
  UserPlus
} from "lucide-react";

import ErrorBoundary from "./components/ErrorBoundary";
import CrmPipelineView from "./components/CrmPipelineView";
import AnalyticsDashboardView from "./components/AnalyticsDashboardView";
import StaffCrewManagementView from "./components/StaffCrewManagementView";
import InteractiveCalendarGrid from "./components/InteractiveCalendarGrid";
import UnifiedCustomerInbox from "./components/UnifiedCustomerInbox";
import QuoteSummary from "./components/QuoteSummary";
import { OfflineManagerModal } from "./components/OfflineManagerModal";
import { registerServiceWorker, cacheMaterialSpecs, cacheProjectData } from "./services/offlineStorage";
import { apiFetch } from "./services/apiClient";
import { completeAuthRedirect, getAuthSession, onAuthSessionChange, signOut } from "./services/authClient";
import { INITIAL_OFFLINE_MATERIAL_SPECS, INITIAL_OFFLINE_PROJECTS } from "./data/offlineSeedData";
import { BulkDimensionImportModal } from "./components/BulkDimensionImportModal";
import ProjectPdfModal from "./components/ProjectPdfModal";
import MaterialCompareModal from "./components/MaterialCompareModal";
import SideMenuDrawer from "./components/SideMenuDrawer";
import GlobalSearchModal from "./components/GlobalSearchModal";
import FinanceCalculatorModal from "./components/FinanceCalculatorModal";
import BookAppointmentModal from "./components/BookAppointmentModal";
import ReferralsModal from "./components/ReferralsModal";
import AccountView from "./components/AccountView";
import EdgeProfilesView from "./components/EdgeProfilesView";
import MeasureTool from "./components/MeasureTool";
import SiteReadinessView from "./components/SiteReadinessView";
import DailyTreasureVault from "./components/DailyTreasureVault";
import RenovationQuiz from "./components/RenovationQuiz";
import ReferralsCommandView from "./components/ReferralsCommandView";
import SlabYieldSummaryChart from "./components/SlabYieldSummaryChart";
import SlabYieldGranularReport from "./components/SlabYieldGranularReport";
import ArtisanShopView from "./components/ArtisanShopView";
import ProjectVelocityChart from "./components/ProjectVelocityChart";
import BulkSlabReserveView from "./components/BulkSlabReserveView";
import TechnicalLibraryView from "./components/TechnicalLibraryView";
import JointDetailsView from "./components/JointDetailsView";
import SubstrateSpecsView from "./components/SubstrateSpecsView";
import ProjectCommandView from "./components/ProjectCommandView";
import GrainContinuityAdvisor from "./components/GrainContinuityAdvisor";
import SecureAuthPortal from "./components/SecureAuthPortal";
import DigitalSignoffModal from "./components/DigitalSignoffModal";
import HomeDashboard from "./components/HomeDashboard";
import GuestWelcomeScreen from "./components/GuestWelcomeScreen";
import { BetaDeploymentPortal } from "./components/BetaDeploymentPortal";
import { PublishingCommandCenterView } from "./components/PublishingCommandCenterView";
import ProjectTimelineVisualizer from "./components/ProjectTimelineVisualizer";
import FinancialCommandView from "./components/FinancialCommandView";
import ExhibitionWalkthroughView from "./components/ExhibitionWalkthroughView";
import GeologicalProvenanceView from "./components/GeologicalProvenanceView";
import DigitalCuratorView from "./components/DigitalCuratorView";
import { WhatsAppAgentModal } from "./components/WhatsAppAgentModal";
import { WhatsAppFloatingButton } from "./components/WhatsAppFloatingButton";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import { TermsAndPrivacyModal } from "./components/TermsAndPrivacyModal";
import { LegalDocumentsModal } from "./components/LegalDocumentsModal";
import OnlineQuoteHub from "./components/OnlineQuoteHub";
import PrivacyPolicyView from "./components/PrivacyPolicyView";
import TermsOfServiceView from "./components/TermsOfServiceView";
import DataComplianceHub from "./components/DataComplianceHub";
import StripePaymentGateway from "./components/StripePaymentGateway";
import { ManagerSecurityGate } from "./components/ManagerSecurityGate";
import { DataSafetyDisclosureModal } from "./components/DataSafetyDisclosureModal";
import { AiContentBadge } from "./components/AiContentBadge";

// The legacy App's icon font (Phase M2). This module is only ever loaded by
// main.tsx's development-only, import.meta.env.PROD-guarded opt-in branch, so
// production bundles never contain this request; the shipped social shell
// self-hosts its fonts (src/fonts.css) and makes no Google Fonts request.
if (typeof document !== "undefined" && !document.getElementById("legacy-material-symbols")) {
  const icons = document.createElement("link");
  icons.id = "legacy-material-symbols";
  icons.rel = "stylesheet";
  icons.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block";
  document.head.appendChild(icons);
}

// Global Static Slabs Dataset for AI vision AR and Logistics tracking
/**
 * Phase 5 Gate 0 purge: `origin` (specific claimed countries of quarry
 * origin) and `weight` (specific per-slab kg figures) have been removed —
 * neither was ever sourced from a real slab or supplier record. `lot`
 * remains only as the internal tag id the AR/QR demo scanner matches
 * against; it is not presented as a verified provenance or certification
 * number. `mohs`/`absorption` are kept as generic material-class
 * properties, with the invented per-slab marketing descriptors removed.
 */
const VISION_SLABS = [
  {
    id: "calacatta-borghini",
    name: "Calacatta Borghini",
    class: "Sintered Porcelain",
    lot: "B8492-V2",
    dims: "320 x 190 x 2 cm",
    mohs: "8.0",
    absorption: "0.00%",
    desc: "Featuring rare 'Phoenix Gold' dramatic golden-amber veins paired with subtle charcoal-grey accents over an ultra-white base.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD2Jn-ukLJM65n2PE7Vm35Qvx3kDEyQHAEOdMgDmgj0x58vftic2lXxfwziw3w5fNGxpZHVIk2o-6suPpwcvQloIXQVkEPs8AfCQvRIvHjW97VYc98I50Xnxx8CWmwcSzdGMSPs56xDvhtsauwBK8h5R4jT6juMN1lbgBnZZCx-VY-dsa_a6r82h9zXVMyoFBtoWCztuUu7jzRCQ9mm_h9FZ7Z69dY8f7rE3jIT8x4VfYKCD-iujarM_c7iHByKQOn3Ohual6E430U"
  },
  {
    id: "emerald-quartzite",
    name: "Emerald Quartzite",
    class: "Natural Quartzite",
    lot: "Q7729-M5",
    dims: "315 x 185 x 2 cm",
    mohs: "7.0",
    absorption: "0.15%",
    desc: "Stunning deep emerald-green layers infused with gold dust and crystallised quartz veins, offering high architectural resistance.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDjow7LpgCNrWW-amp7a9qGTOtVV3OcF2JM0wQ1QFTHjfU0SK-YDIFZxTvzBiQKbHQOV7x9ZKHipzKgFSEpYsFP3rVXyzfNDsqkte8s6qTBgSN-U6OUBjOMVUZVYxpecuRzynB1LrDiYR0jbWKoVYK17vbApPjSt2rZvhyH8xK5XiVx3XIxiH3L_Tv04Yx0GsgCyPo_2BYGhiSDIrr6DB2npPQ3CJdTjxbIAx8Rp6hFLEV8MqyJJtf0BA-Z6vYv-M8zewIwgDdWuV4"
  },
  {
    id: "nero-marquina",
    name: "Nero Marquina",
    class: "Natural Fine Marble",
    lot: "N3910-S1",
    dims: "330 x 195 x 2 cm",
    mohs: "4.0",
    absorption: "0.18%",
    desc: "A compact obsidian black background accented by stark white calcitic veins and micro-fossils polished to a mirror-like high gloss.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC03k3n5v5u2Nu-eC7WQGEld_BgUvAzDUbPaN5WTXCb8d3HfqH0Ni19LncFZC3RZAzHVqgf6DcKROaFb00cqcEYjIiGixkMMJbXh82JRKh5OjN29rwQZQQDUbF691Jdp2ii5DRpvt_k6HTd6afyDsPlqBrSwjyU8dyC7571OomGlR6bUn5jAOp79W9Cj9RgQeixTX1hQe3uN2x1nnosVowsJONOr23VnsElp5EKXqcPU9FWmRYrQDcbRt59V15Yoj-VYPFtyY_hX34"
  },
  {
    id: "taj-mahal",
    name: "Taj Mahal",
    class: "Natural Quartzite",
    lot: "T1048-A9",
    dims: "325 x 190 x 2 cm",
    mohs: "7.0",
    absorption: "0.12%",
    desc: "An ultra-creamy translucent ivory backdrop with flowing layers of golden honey, warm caramel, and mineral grey veins.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAu0R7npq7s-ZS9cjo8D6Ei0uf1JHlXLqHVXfPLkneJk5FNBIKy_XbncmasxXSP5HcVTrspwJgJGtKA2s6mLlrn-cuWBXZQPKKlgf2rxV2MyWF1nF7rixjpnjpgYALHiF_SKgYddkpsE1LhmaY6WvazkHw2q3jGgFSW4DslhBg7Fndx4bYVdKvRz1ducnKMkQF4EvDXRyyzYRghvK4NJvlcJ2fo2ZSkHYC7N6C1jY9wq2kX1KDaqicypfFW0BdLZBYTU8HEMT6E_tY"
  }
];

// Types
export interface Material {
  id: string;
  name: string;
  class: "Quartz" | "Porcelain" | "Natural Stone";
  mohs: number;
  waterAbsorption: string;
  thicknesses: string[];
  finishes: string[];
  application: string[];
  // Phase 5 Gate 0: `price`, `stockSqFt` and `awaitingTransitSqFt` were removed —
  // none of MATERIALS_CATALOG's per-item £ prices or stock/in-transit figures
  // below were ever sourced from a real price list or warehouse system. Pricing
  // is "Request Quote" / "Price on Application" throughout the app; there is no
  // live stock feed to report a quantity from. See tasks/todo.md's Gate 0 entry.
  technicalDetails: string;
  fabricationNotes: string;
  hasSpecialImage?: boolean;
  bgStyle: string; // fallback CSS background for simulation
  image?: string;
  img?: string;
  type?: string;
  category?: string;
}

export interface EstimatePart {
  id: string;
  name: string; // e.g., "Main Countertop", "Kitchen Island"
  length: number; // inches
  width: number; // inches
  materialId: string;
  thickness: string;
  edgeProfile: string;
  edgeLength: number; // linear feet of finished edge
  sinkCutouts: number;
  cooktopCutouts: number;
  faucetHoles: number;
  backsplashLength: number; // inches
  backsplashHeight: number; // inches
}

export interface StageMilestone {
  expectedDate: string;
  actualDate: string;
  progressPct: number;
  status: "completed" | "in-progress" | "pending" | "delayed";
}

export interface ProjectMilestones {
  fabrication: StageMilestone;
  readyForInstall: StageMilestone;
}

export interface EdgeFinishingLog {
  id: string;
  timestamp: string;
  technician: string;
  step: string;
  profile: string;
  gritSequence: string;
  status: "Approved" | "In Progress" | "Pending Inspection";
}

export interface FabricationDetails {
  materialYieldPct: number; // British standard yield calculation e.g. 88.5%
  bsStandardCode: string; // e.g. "BS EN 1469 / BS 8298-1"
  cuttingOrientation: string; // e.g. "Bookmatch Continuous Longitudinal (Vein aligned 45° CCW)"
  grainContinuityVerified: boolean;
  subframeToleranceMm: number; // e.g. 1.0 (±1.0mm under BS 8298)
  wetCncMachineId: string; // e.g. "CNC-WATERJET-01"
  cuttingSequenceNotes: string; // e.g. "Continuous wet CNC pass; 2.5mm diamond blade; stress-relief radii on internal corner miters."
  edgeFinishingLogs: EdgeFinishingLog[];
}

export interface DigitalSignoff {
  signatoryName: string;
  signatoryRole: string;
  signatureDataUrl: string;
  timestamp: string;
  rating: number;
  notes?: string;
  verifiedBadge: boolean;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  status: "Proposal" | "Slab Selected" | "Fabrication" | "Ready for Install" | "Completed";
  notes: string;
  estimates: EstimatePart[];
  createdAt: string;
  updatedAt?: string;
  milestones?: ProjectMilestones;
  fabricationDetails?: FabricationDetails;
  digitalSignoff?: DigitalSignoff;
}

export interface QuickNote {
  id: string;
  text: string;
  category: "Bottleneck" | "Urgent" | "Notice" | "Shift Handover";
  createdAt: string;
  author: string;
  color: "amber" | "rose" | "sky" | "emerald";
}

const DEFAULT_QUICK_NOTES: QuickNote[] = [
  {
    id: "qn-1",
    text: "CNC Waterjet #2 recalibration scheduled at 14:00. Hold large 30mm porcelain slab cuts until beam zeroed.",
    category: "Bottleneck",
    createdAt: "Today 09:15 AM",
    author: "Shop Manager",
    color: "amber"
  },
  {
    id: "qn-2",
    text: "Taj Mahal Quartzite delivery for Kensington job delayed to Thursday AM. Shift polishing shop slot to Calacatta Gold.",
    category: "Urgent",
    createdAt: "Today 10:30 AM",
    author: "Logistics Lead",
    color: "rose"
  },
  {
    id: "qn-3",
    text: "New diamond-coated edge router bits unpacked in Bay B. Use for all sintered porcelain edge mitering.",
    category: "Notice",
    createdAt: "Yesterday 04:45 PM",
    author: "Master Fabricator",
    color: "sky"
  }
];

export const calculateMilestoneVariance = (expected: string, actual: string) => {
  if (!expected || !actual) return { diffDays: 0, text: "Dates Pending", status: "neutral" };
  const dExp = new Date(expected);
  const dAct = new Date(actual);
  if (isNaN(dExp.getTime()) || isNaN(dAct.getTime())) {
    return { diffDays: 0, text: "Invalid Date", status: "neutral" };
  }
  const diffTime = dAct.getTime() - dExp.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
  if (diffDays === 0) {
    return { diffDays: 0, text: "On Schedule (0d variance)", status: "on-track" };
  } else if (diffDays > 0) {
    return { diffDays, text: `+${diffDays}d Variance (Delayed)`, status: "delayed" };
  } else {
    return { diffDays, text: `${Math.abs(diffDays)}d Ahead of Schedule`, status: "ahead" };
  }
};

export const getDefaultMilestonesForProject = (proj: Project): ProjectMilestones => {
  const created = new Date(proj.createdAt || "2026-07-10");
  
  const fabExp = new Date(created.getTime() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const fabAct = (proj.status === "Completed" || proj.status === "Ready for Install")
    ? fabExp
    : proj.status === "Fabrication"
    ? new Date(created.getTime() + 8 * 24 * 3600 * 1000).toISOString().split('T')[0]
    : fabExp;

  const insExp = new Date(created.getTime() + 12 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const insAct = proj.status === "Completed"
    ? insExp
    : proj.status === "Ready for Install"
    ? new Date(created.getTime() + 11 * 24 * 3600 * 1000).toISOString().split('T')[0]
    : insExp;

  let fabStatus: StageMilestone["status"] = "pending";
  let fabPct = 0;
  let insStatus: StageMilestone["status"] = "pending";
  let insPct = 0;

  if (proj.status === "Completed") {
    fabStatus = "completed";
    fabPct = 100;
    insStatus = "completed";
    insPct = 100;
  } else if (proj.status === "Ready for Install") {
    fabStatus = "completed";
    fabPct = 100;
    insStatus = "in-progress";
    insPct = 65;
  } else if (proj.status === "Fabrication") {
    fabStatus = "in-progress";
    fabPct = 75;
    insStatus = "pending";
    insPct = 0;
  } else if (proj.status === "Slab Selected") {
    fabStatus = "pending";
    fabPct = 15;
    insStatus = "pending";
    insPct = 0;
  }

  const defaultFab: StageMilestone = {
    expectedDate: fabExp,
    actualDate: fabAct,
    progressPct: fabPct,
    status: fabStatus,
  };

  const defaultIns: StageMilestone = {
    expectedDate: insExp,
    actualDate: insAct,
    progressPct: insPct,
    status: insStatus,
  };

  if (proj.milestones) {
    return {
      fabrication: { ...defaultFab, ...(proj.milestones.fabrication || {}) },
      readyForInstall: { ...defaultIns, ...(proj.milestones.readyForInstall || {}) },
    };
  }

  return {
    fabrication: defaultFab,
    readyForInstall: defaultIns,
  };
};

/**
 * Phase 5 Gate 0 purge.
 *
 * This previously returned fabricated fabrication-audit records for two
 * specific project ids (and a generic fallback for every other project):
 * invented named staff members ("M. Davies (Master Mason)", "A. Hughes
 * (Edge Finishing Specialist)", "S. Patel (Quality Assurance Inspector)",
 * "C. Thorne (Sintered Stone Tech)", "R. Sterling (CNC Operator)") with
 * invented approval timestamps, invented material yield percentages,
 * invented BS certification codes, and invented CNC machine ids — all
 * presented as real quality-control history. None of it was ever recorded
 * by a real technician. Per the approved Gate 0 decision, this now returns
 * a single honest "not yet recorded" default with no fabricated identities
 * or certifications, rather than per-project fabricated content — see
 * tasks/todo.md's Gate 0 entry.
 */
export const getFabricationDetailsForProject = (proj: Project): FabricationDetails => {
  if (proj.fabricationDetails) {
    return proj.fabricationDetails;
  }

  return {
    materialYieldPct: 0,
    bsStandardCode: "Not yet recorded",
    cuttingOrientation: "Not yet recorded",
    grainContinuityVerified: false,
    subframeToleranceMm: 0,
    wetCncMachineId: "Not yet recorded",
    cuttingSequenceNotes: "Fabrication has not started for this project yet.",
    edgeFinishingLogs: []
  };
};

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// Predefined materials catalog matching server.ts specs
export const MATERIALS_CATALOG: Material[] = [
  {
    id: "calacatta-gold",
    name: "Calacatta Gold Quartz",
    class: "Quartz",
    mohs: 7,
    waterAbsorption: "<0.05%",
    thicknesses: ["20mm", "30mm"],
    finishes: ["Polished", "Honed"],
    application: ["Interior Countertops", "Wall Cladding", "Vanities"],
    technicalDetails: "High-density engineered quartz composed of 93% natural quartz crystals and 7% advanced polymer resins. Offers absolute stain resistance and zero porosity.",
    fabricationNotes: "Contains crystalline silica. STRICTLY require wet-cutting systems and certified dust-extraction masks. Ensure relief cuts on inner corners (minimum 3/8\" radius to prevent stress cracking). Do not use for exterior applications.",
    hasSpecialImage: true,
    bgStyle: "linear-gradient(135deg, #fbfbfa 0%, #eaeaea 60%, #e0d0b0 80%, #ffffff 100%)"
  },
  {
    id: "charcoal-soapstone",
    name: "Charcoal Soapstone Quartz",
    class: "Quartz",
    mohs: 7,
    waterAbsorption: "<0.05%",
    thicknesses: ["20mm", "30mm"],
    finishes: ["Suede/Matte", "Silken"],
    application: ["Interior Countertops", "Bath Surrounds", "Fireplace Accents"],
    technicalDetails: "Engineered quartz with a deep charcoal background and soft, chalky white veining. Mimics natural soapstone without the soft scratching liability.",
    fabricationNotes: "Avoid polishing matte/suede surfaces locally as it ruins the proprietary factory silken finish. Clean with non-abrasive pH-neutral surface cleaners only.",
    bgStyle: "linear-gradient(135deg, #2b2c2d 0%, #1e1f20 50%, #444547 75%, #1e1f20 100%)"
  },
  {
    id: "concrete-matte",
    name: "Concrete Matte Quartz",
    class: "Quartz",
    mohs: 7,
    waterAbsorption: "<0.05%",
    thicknesses: ["20mm"],
    finishes: ["Matte", "Raw Textured"],
    application: ["Interior Countertops", "Commercial Bars", "Flooring"],
    technicalDetails: "Engineered stone offering a raw industrial micro-cement texture with extreme structural stability. Resistant to cracks and structural shifting.",
    fabricationNotes: "Industrial micro-texture is more susceptible to metal marks from cutlery; use soft non-scratch nylon pads to lift blemishes. Easy to fabricate on standard CNC machines.",
    bgStyle: "linear-gradient(135deg, #8a8d8f 0%, #a2a5a8 40%, #76797a 80%, #919496 100%)"
  },
  {
    id: "statuario-extra",
    name: "Statuario Extra Porcelain",
    class: "Porcelain",
    mohs: 8,
    waterAbsorption: "0.00% (Zero)",
    thicknesses: ["12mm", "20mm"],
    finishes: ["Polished", "Satin Velvet"],
    application: ["Indoor Countertops", "Outdoor Kitchens", "Ventilated Facades", "Fireplaces"],
    technicalDetails: "Premium sintered stone fired at 1200°C. Composed of natural clays and mineral oxides. Absolutely UV-stable and resistant to temperatures up to 800°C.",
    fabricationNotes: "Highly tensioned material. ALWAYS perform perimeter relief cuts (shaving 1cm from slab borders) before making interior cutouts. Use continuous turbo diamond blades specifically rated for porcelain. Slow down travel speed on entry/exit of cuts.",
    bgStyle: "linear-gradient(135deg, #ffffff 0%, #f4f4f4 50%, #d4d4d4 60%, #ffffff 80%, #cccccc 100%)"
  },
  {
    id: "iron-oxidized",
    name: "Iron Oxidized Porcelain",
    class: "Porcelain",
    mohs: 8,
    waterAbsorption: "0.00% (Zero)",
    thicknesses: ["12mm"],
    finishes: ["Satin Metallic", "Structured"],
    application: ["Indoor Countertops", "Outdoor BBQ Stations", "Accent Walls", "Flooring"],
    technicalDetails: "Sintered porcelain with integrated metallic iron oxides, mimicking aged corten steel with zero rusting, scaling, or toxic leeching. Heatproof and scratchproof.",
    fabricationNotes: "Extremely hard. Blade feed rate must be reduced by 30% compared to standard quartz. Ensure massive water lubrication stream is directed exactly at the cutting point.",
    bgStyle: "linear-gradient(135deg, #5c3a21 0%, #3d2b1f 40%, #73553d 70%, #2b1f1a 100%)"
  },
  {
    id: "nero-marquina-porcelain",
    name: "Nero Marquina Porcelain",
    class: "Porcelain",
    mohs: 8,
    waterAbsorption: "0.00% (Zero)",
    thicknesses: ["12mm", "20mm"],
    finishes: ["Polished", "Matte"],
    application: ["Indoor Countertops", "Shower Walls", "Furniture Tops", "BBQ Cladding"],
    technicalDetails: "High-definition deep black sintered porcelain with sharp, crystalline white veins. Totally non-reactive to bleach, acids, and cooking oils.",
    fabricationNotes: "Deep dark pigments will show seam lines more prominently. Use manufacturer's color-matched epoxy adhesives only (e.g., Integra/Akemi charcoal black). Miters must be cut with pristine precision to avoid micro-chipping on edges.",
    bgStyle: "linear-gradient(135deg, #111111 0%, #1c1c1c 40%, #444444 45%, #111111 50%, #1a1a1a 100%)"
  },
  {
    id: "taj-mahal",
    name: "Taj Mahal Quartzite",
    class: "Natural Stone",
    mohs: 7,
    waterAbsorption: "0.15%",
    thicknesses: ["20mm", "30mm"],
    finishes: ["Polished", "Leathered"],
    application: ["Indoor/Outdoor Countertops", "Wet Bars", "Floor Planking"],
    technicalDetails: "Exquisite natural stone quarried in Brazil. A dense metamorphic rock starting as sandstone and forged under intense geological heat and pressure. Harder than granite.",
    fabricationNotes: "Highly abrasive. Extreme stone density rapidly dulls standard diamond tooling. Dress your bridge saw blade frequently using dress stone. Maintain slow saw travel speeds (approx 4-6 feet per minute) and massive water volume. Premium stone sealer required on handoff.",
    bgStyle: "linear-gradient(135deg, #e3dac9 0%, #dcd3be 40%, #f0ebd8 70%, #d0c8b0 100%)"
  },
  {
    id: "bianco-carrara",
    name: "Bianco Carrara Marble",
    class: "Natural Stone",
    mohs: 3.5,
    waterAbsorption: "0.20%",
    thicknesses: ["20mm", "30mm"],
    finishes: ["Polished", "Honed"],
    application: ["Residential Kitchens (Care needed)", "Bath Vanities", "Fireplace Hearths"],
    technicalDetails: "Classic Italian natural marble with a white-to-light-grey ground and elegant feathery grey veins. Highly prized for its rich, historic architectural aesthetic.",
    fabricationNotes: "Soft and highly porous. Acid-sensitive (subject to etching from lemon juice, vinegar). Require premium solvent-based impregnating sealer (apply 2 coats before client handover). Handle with high care during transit as tensile strength is low; transport upright with backer frames.",
    bgStyle: "linear-gradient(135deg, #eaeae8 0%, #f7f7f5 50%, #dedede 65%, #f2f2f0 80%, #cccccc 100%)"
  },
  {
    id: "absolute-black-granite",
    name: "Absolute Black Granite",
    class: "Natural Stone",
    mohs: 6.5,
    waterAbsorption: "0.02%",
    thicknesses: ["20mm", "30mm"],
    finishes: ["Polished", "Suede/Leathered"],
    application: ["Indoor/Outdoor Countertops", "High-Traffic Thresholds", "Cladding"],
    technicalDetails: "Extremely dense, deep black igneous natural stone. Possesses nearly zero absorption and excellent structural rigidity. One of the most durable natural materials available.",
    fabricationNotes: "Heavy and rigid. Easy to machine, but highly prone to showing dust during cutting; maintain full wet wash. Use dark stone sealers to maintain absolute deep black rich contrast.",
    bgStyle: "linear-gradient(135deg, #181818 0%, #0c0c0c 60%, #202020 80%, #0a0a0a 100%)"
  }
];

// Helper to look up material specs from catalog
export const getMaterialById = (id: string): Material => {
  return MATERIALS_CATALOG.find(m => m.id === id) || MATERIALS_CATALOG[0];
};

// Default Projects for beautiful Initial Experience with UK Detail Specifications
const INITIAL_PROJECTS: Project[] = [
  {
    id: "proj-1",
    name: "Belgravia Estate Townhouse Kitchen",
    address: "14 Eaton Square, Belgravia, London SW1W 9DD",
    status: "Fabrication",
    notes: "UK Detail Spec: BS EN 1469 & BS 8298-1 Compliant. RIBA Stage 4 Technical Design approved. Calacatta Gold 30mm slabs inspected at London Stone Depot. Miters must be grain-matched across the 50mm apron. Wet CNC cut path verified to maintain continuous bookmatch veining across waterfall ends.",
    createdAt: "2026-07-10",
    updatedAt: "2026-07-20",
    estimates: [
      {
        id: "est-p1-1",
        name: "Main Perimeter Worktop (2794mm × 660mm)",
        length: 110,
        width: 26,
        materialId: "calacatta-gold",
        thickness: "30mm",
        edgeProfile: "Mitered Apron (2 in)",
        edgeLength: 12,
        sinkCutouts: 1,
        cooktopCutouts: 1,
        faucetHoles: 2,
        backsplashLength: 110,
        backsplashHeight: 18
      },
      {
        id: "est-p1-2",
        name: "Waterfall Kitchen Island (2438mm × 1067mm)",
        length: 96,
        width: 42,
        materialId: "calacatta-gold",
        thickness: "30mm",
        edgeProfile: "Mitered Apron (3 in)",
        edgeLength: 24,
        sinkCutouts: 0,
        cooktopCutouts: 0,
        faucetHoles: 0,
        backsplashLength: 0,
        backsplashHeight: 0
      }
    ]
  },
  {
    id: "proj-2",
    name: "One Hyde Park Penthouse Master Bath",
    address: "100 Knightsbridge, London SW1X 7LJ",
    status: "Slab Selected",
    notes: "UK Detail Spec: BS EN 12057 Modular Tile & Wall Cladding Standard. Statuario Extra 12mm for full-height shower panels & 20mm for vanity tops. Double undermount basin cutouts. UK Building Regs Part M accessibility & Part B fire safety certified.",
    createdAt: "2026-07-15",
    updatedAt: "2026-07-19",
    estimates: [
      {
        id: "est-p2-1",
        name: "Master Vanity Top (2134mm × 610mm)",
        length: 84,
        width: 24,
        materialId: "statuario-extra",
        thickness: "20mm",
        edgeProfile: "Demi-Bullnose",
        edgeLength: 7,
        sinkCutouts: 2,
        cooktopCutouts: 0,
        faucetHoles: 4,
        backsplashLength: 84,
        backsplashHeight: 4
      }
    ]
  },
  {
    id: "proj-3",
    name: "Mayfair Townhouse Kitchen & Bar",
    address: "14 Curzon Street, Mayfair, London W1J 5HN",
    status: "Proposal",
    notes: "UK Detail Spec: RIBA Stage 3 Spatial Coordination. Taj Mahal Quartzite island run (3040mm x 1220mm / 30mm thickness). Client reviewing leathered vs honed surface finish. Certified stone masonry tolerances under British Standards.",
    createdAt: "2026-07-18",
    updatedAt: "2026-07-21",
    estimates: [
      {
        id: "est-p3-1",
        name: "Quartzite Island Run (3048mm × 1219mm)",
        length: 120,
        width: 48,
        materialId: "taj-mahal",
        thickness: "30mm",
        edgeProfile: "Ogee",
        edgeLength: 28,
        sinkCutouts: 1,
        cooktopCutouts: 0,
        faucetHoles: 2,
        backsplashLength: 0,
        backsplashHeight: 0
      }
    ]
  },
  {
    id: "proj-4",
    name: "Chelsea Manor Outdoor Kitchen & Terrace",
    address: "88 King's Road, Chelsea, London SW3 4NX",
    status: "Ready for Install",
    notes: "UK Detail Spec: BS EN 14411 Frost & UV Resistance Index. Iron Oxidized Porcelain 12mm sintered slabs precut with 50mm mitered aprons. Crane lift permit secured for Chelsea SW3 site access. Sub-frame substrate leveled to ±1mm tolerance.",
    createdAt: "2026-07-12",
    updatedAt: "2026-07-17",
    estimates: [
      {
        id: "est-p4-1",
        name: "Outdoor BBQ Worktop (2438mm × 762mm)",
        length: 96,
        width: 30,
        materialId: "iron-oxidized",
        thickness: "12mm",
        edgeProfile: "Mitered Apron (2 in)",
        edgeLength: 16,
        sinkCutouts: 1,
        cooktopCutouts: 1,
        faucetHoles: 1,
        backsplashLength: 96,
        backsplashHeight: 6
      }
    ]
  },
  {
    id: "proj-5",
    name: "Kensington Park Residence Master Suite",
    address: "22 Kensington Park Gardens, London W11 3BU",
    status: "Completed",
    notes: "UK Detail Spec: BS 8298 Structural Anchorage Signoff. Absolute Black Granite 30mm fireplace hearth & Nero Marquina vanity installation handed over. Certified by Master Mason Guild (UK). Maintenance protocol delivered.",
    createdAt: "2026-07-02",
    updatedAt: "2026-07-11",
    estimates: [
      {
        id: "est-p5-1",
        name: "Granite Hearth & Surround (1828mm × 508mm)",
        length: 72,
        width: 20,
        materialId: "absolute-black-granite",
        thickness: "30mm",
        edgeProfile: "Demi-Bullnose",
        edgeLength: 6,
        sinkCutouts: 0,
        cooktopCutouts: 0,
        faucetHoles: 0,
        backsplashLength: 72,
        backsplashHeight: 12
      }
    ]
  },
  {
    id: "proj-6",
    name: "Holland Park Mews Open-Plan Kitchen",
    address: "18 Holland Park Mews, London W11 3SU",
    status: "Completed",
    notes: "UK Detail Spec: BS EN 1469 Natural Stone Slabs. Bianco Carrara 30mm marble worktop with full-height splashback. Mitered 40mm pencil edge profile. Handover completed with stone sealer application certificate and RIBA Stage 6 signoff.",
    createdAt: "2026-06-28",
    updatedAt: "2026-07-08",
    estimates: [
      {
        id: "est-p6-1",
        name: "Main Worktop Run (2794mm × 686mm)",
        length: 110,
        width: 27,
        materialId: "bianco-carrara",
        thickness: "30mm",
        edgeProfile: "Ogee",
        edgeLength: 10,
        sinkCutouts: 1,
        cooktopCutouts: 1,
        faucetHoles: 2,
        backsplashLength: 110,
        backsplashHeight: 24
      }
    ]
  },
  {
    id: "proj-7",
    name: "St John's Wood Manor Spa & Pool Surround",
    address: "45 Avenue Road, St John's Wood, London NW8 6BS",
    status: "Fabrication",
    notes: "UK Detail Spec: BS 8298-2 Anchorage & Fixings for Heavy Stone Cladding. Nero Marquina Porcelain 12mm sintered stone panels for wet-room features. CNC waterjet cut drain grates and precision mitered step risers.",
    createdAt: "2026-07-08",
    updatedAt: "2026-07-20",
    estimates: [
      {
        id: "est-p7-1",
        name: "Pool Edge Coping (3606mm × 457mm)",
        length: 142,
        width: 18,
        materialId: "nero-marquina-porcelain",
        thickness: "20mm",
        edgeProfile: "Full Bullnose",
        edgeLength: 24,
        sinkCutouts: 0,
        cooktopCutouts: 0,
        faucetHoles: 0,
        backsplashLength: 0,
        backsplashHeight: 0
      },
      {
        id: "est-p7-2",
        name: "Spa Feature Wall Cladding (2413mm × 1193mm)",
        length: 95,
        width: 47,
        materialId: "nero-marquina-porcelain",
        thickness: "12mm",
        edgeProfile: "Mitered Edge",
        edgeLength: 16,
        sinkCutouts: 0,
        cooktopCutouts: 0,
        faucetHoles: 0,
        backsplashLength: 0,
        backsplashHeight: 0
      }
    ]
  },
  {
    id: "proj-8",
    name: "Surrey Hills Country Estate Chef Kitchen",
    address: "The Manor, Station Road, Bramley, Surrey GU5 0DF",
    status: "Ready for Install",
    notes: "UK Detail Spec: BS EN 12057 & BS 8298-1. Charcoal Soapstone 30mm honed worktop with integrated drainer grooves. Site access verified for 3.2m slab delivery via low-loader. Sub-frame structural deflection < L/360 confirmed.",
    createdAt: "2026-07-05",
    updatedAt: "2026-07-18",
    estimates: [
      {
        id: "est-p8-1",
        name: "Kitchen Island Worktop (3200mm × 1092mm)",
        length: 126,
        width: 43,
        materialId: "charcoal-soapstone",
        thickness: "30mm",
        edgeProfile: "Mitered Apron (2 in)",
        edgeLength: 22,
        sinkCutouts: 1,
        cooktopCutouts: 0,
        faucetHoles: 2,
        backsplashLength: 0,
        backsplashHeight: 0
      }
    ]
  },
  {
    id: "proj-9",
    name: "Marylebone High Street Boutique Retail Bar",
    address: "72 Marylebone High Street, London W1U 5JS",
    status: "Completed",
    notes: "UK Detail Spec: BS EN 1469 Commercial High-Traffic Stone. Concrete Matte 20mm engineered quartz bar top with LED under-lighting recess channel. Certified UK Building Regulations Part B fire reaction class A1.",
    createdAt: "2026-06-15",
    updatedAt: "2026-07-01",
    estimates: [
      {
        id: "est-p9-1",
        name: "Main Reception Bar Countertop (2997mm × 787mm)",
        length: 118,
        width: 31,
        materialId: "concrete-matte",
        thickness: "20mm",
        edgeProfile: "Beveled",
        edgeLength: 18,
        sinkCutouts: 1,
        cooktopCutouts: 0,
        faucetHoles: 1,
        backsplashLength: 118,
        backsplashHeight: 6
      }
    ]
  },
  {
    id: "proj-10",
    name: "Knightsbridge Penthouse Secondary En-Suite",
    address: "12 Hans Place, Knightsbridge, London SW1X 0EP",
    status: "Ready for Install",
    notes: "UK Detail Spec: RIBA Stage 5 Technical Construction. Statuario Extra 20mm vanity unit with double bookmatched vein alignment. Laser template validated against structural wall tolerances.",
    createdAt: "2026-07-14",
    updatedAt: "2026-07-20",
    estimates: [
      {
        id: "est-p10-1",
        name: "Double Vanity Top (1905mm × 610mm)",
        length: 75,
        width: 24,
        materialId: "statuario-extra",
        thickness: "20mm",
        edgeProfile: "Ogee",
        edgeLength: 8,
        sinkCutouts: 2,
        cooktopCutouts: 0,
        faucetHoles: 4,
        backsplashLength: 75,
        backsplashHeight: 4
      }
    ]
  }
];

// Standardized currency formatting function
const formatCurrency = (value: number): string => {
  return `£${value.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const STORIES = [
  {
    id: "new_arrivals",
    title: "New Arrivals",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCKDPc3cCe2HwYNC4Gbeb84Ap64cK9mb1tz2qpORpYZORBBcuRH8873boNlOVvdmhMbJFP78ptHdxMilmBfdgGo93SVyzhVo6V9MGd-6PHYRWnoh2tUZX-05QWeeehFWI2nw8pt03E5iyE93GP1pcCN3v0IVqbZPhhWqN4x3hMtqjTcf70aM17CZJ-kLtttTHZ0tBYQYY1M-r68mxrQM-eTZd2iAdAGETp0hs4bhFpjpWKLGy5bVZEz8y1_uuwTRcgG5gCvsUn1eRs",
    narrative: "Presenting our newest imports of premium Italian Quartzite and sintered slab blocks. Hand-selected in Verona for ultimate vein continuity and striking aesthetics.",
    badge: "24H",
    tagline: "Verona imports"
  },
  {
    id: "craftsmanship",
    title: "Craftsmanship",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuApU3tjf29vFrS-vrCU3e6EmqvNHvfYtB29DUS4An0ED1pZCT_4oX0Us4h_lqrtc_kcmsdeuMOmgD206Qsm-vTlcxQQdA5caWssSwTmPD0ATM8fjbXkopoOppYCICwr1FynGwY3G__T9rlc8mcNIaV9XuLILa4giE2ttWh8sGIY4LY2SyZaQcujWbOTE1N30qq0qx4AnVfpDP0v8aHROINUGi3zbw-N3_2Qbg8nH-QZDhwSmsBfTcsLVz7rbc5O11nAfVwrbi9IMlY",
    narrative: "Our master stonemasons utilize state-of-the-art dual-phase diamond abrasives and precise hand-detailing to achieve flush joints and flawless mirror finishes.",
    badge: null,
    tagline: "Stonemason details"
  },
  {
    id: "daily_cuts",
    title: "Daily Cuts",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCTX4x9-XuIaxOW3waoqk2OS2343HtzOEKxJJOx_rVGeZzTWGiZUTxrKNr1PpMQQMTZKBkS2nIdry7fONchzzaP_Tva5cfmhIiXG5OuAMnXOU7B6Am_lEFgIRvJOV_Q2DxdoIxlfWQgpvjWimTZ4cuH2xEKG3lW0HfJjwF1CMWtTbyqrsO1wIspy-qEcYXpWR5dc_q6bx67lHSM5hu0xZj5J5jeVQXKTdLPvXlWGNvd6hvL2NozPkMX3jVBJKs_IYrm5YrzRm1Bx6Y",
    narrative: "High-pressure water-jet cuts executed at ±0.1mm tolerances. Real-time calibration ensures absolute fit on book-matched waterfall edges.",
    badge: "LIVE",
    tagline: "Water-jet cuts"
  },
  {
    id: "installations",
    title: "Installations",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDCWMH1d8oXTsdFwDK7Pstk5cHGxrHaYqMyeNfHrOgLz_u-uBIlnPpr8DoHu4iasmicWMeofIisP7ElkUIBNuan5zkQMk46L8q8FI3GbG7Ia_QDxlEU9l2hfdb9aCAdv7ZZJ7o3QXE07TBrb1OUbuPtBYQISj1rsnbfH-rU1Jxh9LoHYUHUr6cnt4xSJvnTE5qHyqr_kreFbHmJXhNBJWtWu4oZeS1uP0LBes3P-Weq0STQ-esiTW0Bdl84TB6_q0K4MbeySBSdSjc",
    narrative: "Direct from Chelsea SW3. Installation of massive book-matched marble cladding completed on a double-height fireplace hearth.",
    badge: null,
    tagline: "SW3 Fireplace"
  }
];

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isGuest, setIsGuest] = useState<boolean>(true);
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [canAccessManager, setCanAccessManager] = useState(false);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);

  const refreshSession = async () => {
    try {
      const session = await getAuthSession();
      setIsAuthenticated(Boolean(session));
      setIsGuest(!session);
      setAuthEmail(session?.email || "");
      setCanAccessManager(Boolean(session?.roles.some((role) => ["smc_staff", "project_manager", "admin", "owner"].includes(role))));
      setCanAccessAdmin(Boolean(session?.roles.some((role) => role === "admin" || role === "owner")));
      if (!session) setUserRole("client");
      return session;
    } catch {
      setIsAuthenticated(false);
      setIsGuest(true);
      setCanAccessManager(false);
      setCanAccessAdmin(false);
      setUserRole("client");
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    void completeAuthRedirect()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) void refreshSession();
      });
    const unsubscribe = onAuthSessionChange(() => {
      window.setTimeout(() => {
        if (!cancelled) void refreshSession();
      }, 0);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const handleLoginSuccess = () => {
    void refreshSession().then((session) => {
      if (session) setShowPortalModal(false);
    });
  };

  // Portal Landing & Registration State
  const [portalView, setPortalView] = useState<"landing" | "login" | "register" | "reset">(
    window.location.pathname.includes("/auth/reset-password") ? "reset" : "landing",
  );
  const [portalAccountType, setPortalAccountType] = useState<"homeowner" | "trade">("homeowner");
  const [fullLegalName, setFullLegalName] = useState<string>("");
  const [showPortalModal, setShowPortalModal] = useState<boolean>(window.location.pathname.includes("/auth/reset-password"));
  const [portalCompanyName, setPortalCompanyName] = useState<string>("");
  const [portalCompanyReg, setPortalCompanyReg] = useState<string>("");
  const [portalConfirmPassword, setPortalConfirmPassword] = useState<string>("");

  // Manager Mode vs Client View Role Boundary State
  const [userRole, setUserRole] = useState<"manager" | "client">("client");

  const handleRoleToggle = (newRole: "manager" | "client") => {
    if (newRole === "manager" && !canAccessManager) {
      setShowPortalModal(true);
      return;
    }
    setUserRole(newRole);
  };

  const [showDataSafetyModal, setShowDataSafetyModal] = useState<boolean>(false);

  // Core App States (Primary & Extended Views)
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [statusChangedMap, setStatusChangedMap] = useState<Record<string, { status: string; timestamp: number }>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMaterialFilters, setSelectedMaterialFilters] = useState<string[]>([]);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);

  const toggleMaterialFilter = (filterName: string) => {
    if (filterName === "All") {
      setSelectedMaterialFilters([]);
      return;
    }
    setSelectedMaterialFilters((prev) =>
      prev.includes(filterName) ? prev.filter((f) => f !== filterName) : [...prev, filterName]
    );
  };

  const clearAllMaterialFilters = () => {
    setSelectedMaterialFilters([]);
  };
  const [catalogSort, setCatalogSort] = useState<"featured" | "mohs-desc" | "mohs-asc">("featured");
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(MATERIALS_CATALOG[0]);
  const [showGrainAdvisor, setShowGrainAdvisor] = useState<boolean>(true);
  
  // Favorite Materials State (persisted in localStorage)
  const [favoriteMaterialIds, setFavoriteMaterialIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("smc_favorite_materials");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed parsing favorite materials:", e);
      }
    }
    return ["calacatta-gold", "statuario-extra", "calacatta-borghini"];
  });

  const toggleFavoriteMaterial = (matId: string) => {
    setFavoriteMaterialIds((prev) => {
      const exists = prev.includes(matId);
      const updated = exists ? prev.filter((id) => id !== matId) : [...prev, matId];
      try {
        localStorage.setItem("smc_favorite_materials", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed saving favorite materials to localStorage:", e);
      }
      return updated;
    });
  };
  
  // Side Menu Drawer & Modals States
  const [isSideMenuOpen, setIsSideMenuOpen] = useState<boolean>(false);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    return localStorage.getItem("smc_pro_lang") || "en";
  });
  const [showFinanceModal, setShowFinanceModal] = useState<boolean>(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState<boolean>(false);
  const [showReferralsModal, setShowReferralsModal] = useState<boolean>(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [showLegalDocsModal, setShowLegalDocsModal] = useState<boolean>(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState<boolean>(false);
  const [bulkImportTargetProjectId, setBulkImportTargetProjectId] = useState<string>("");

  // Material Comparison Modal State
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [compareMaterialAId, setCompareMaterialAId] = useState<string>("calacatta-gold");
  const [compareMaterialBId, setCompareMaterialBId] = useState<string>("statuario-extra");

  const handleOpenCompareWithMaterial = (materialId: string) => {
    if (compareMaterialAId === materialId || compareMaterialBId === materialId) {
      setShowCompareModal(true);
    } else {
      setCompareMaterialBId(materialId);
      setShowCompareModal(true);
    }
  };

  const handleSwapCompareMaterials = () => {
    const temp = compareMaterialAId;
    setCompareMaterialAId(compareMaterialBId);
    setCompareMaterialBId(temp);
  };
  
  // Materials Stock State (persisted in localStorage or initialized from catalog)
  const [materialsStock, setMaterialsStock] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("smc_materials_stock");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed parsing stock from localStorage:", e);
      }
    }
    const initial: Record<string, number> = {};
    MATERIALS_CATALOG.forEach(m => {
      initial[m.id] = 0;
    });
    return initial;
  });

  const handleUpdateMaterialStock = (matId: string, newStock: number) => {
    setMaterialsStock(prev => {
      const updated = { ...prev, [matId]: Math.max(0, newStock) };
      try {
        localStorage.setItem("smc_materials_stock", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed saving stock to localStorage:", e);
      }
      return updated;
    });
  };

  // Quote Summary States
  const [quoteNumber, setQuoteNumber] = useState<string>("8821");
  const [quoteNotes, setQuoteNotes] = useState<string>("");

  // SMC Vision AR Viewport States
  const [activeVisionSlabId, setActiveVisionSlabId] = useState<string>("calacatta-borghini");
  const [showVisionFavoritesOnly, setShowVisionFavoritesOnly] = useState<boolean>(false);
  const [visionMode, setVisionMode] = useState<"simulator" | "blueprint">("simulator");
  const [visionLightingMode, setVisionLightingMode] = useState<"morning" | "studio" | "evening">("studio");
  const [visionPatternRotation, setVisionPatternRotation] = useState<number>(0); // 0, 90, 180, 270 degrees

  // Keyboard Shortcuts for AR Simulator Pattern Rotation (Arrow Keys: 90°, Shift+Arrows: 1°, R: Reset)
  useEffect(() => {
    if (activeTab !== "vision" || visionMode !== "simulator") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      const isFineStep = e.shiftKey || e.altKey || e.ctrlKey || e.metaKey;
      const step = isFineStep ? 1 : 90;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setVisionPatternRotation((prev) => (prev + step) % 360);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setVisionPatternRotation((prev) => (prev - step + 360) % 360);
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setVisionPatternRotation(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, visionMode]);
  const [visionSurfaceLocked, setVisionSurfaceLocked] = useState<boolean>(true);
  const [visionScale, setVisionScale] = useState<"1-1" | "scale-down">("1-1");
  const [reticleOffset, setReticleOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showReserveSlabModal, setShowReserveSlabModal] = useState<boolean>(false);
  const [reserveSlabSelectedProjectId, setReserveSlabSelectedProjectId] = useState<string>("");
  const [reserveSlabSuccessMessage, setReserveSlabSuccessMessage] = useState<string | null>(null);

  // SMC Vision AR QR Scanner States
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Register service worker & seed localforage
    registerServiceWorker();
    cacheMaterialSpecs(INITIAL_OFFLINE_MATERIAL_SPECS).catch(() => {});
    cacheProjectData(INITIAL_OFFLINE_PROJECTS).catch(() => {});

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const [showQrScanner, setShowQrScanner] = useState<boolean>(false);
  const [cameraPermissionAccepted, setCameraPermissionAccepted] = useState<boolean>(() => {
    try {
      return localStorage.getItem("smc_camera_permission_granted") === "true";
    } catch {
      return false;
    }
  });
  const [showCameraExplainerModal, setShowCameraExplainerModal] = useState<boolean>(false);
  const [showQuickScanTooltip, setShowQuickScanTooltip] = useState<boolean>(false);
  const [showScannerTips, setShowScannerTips] = useState<boolean>(false);
  const [activeScannerTipAccordion, setActiveScannerTipAccordion] = useState<string | null>("alignment");
  const [copiedSessionLogs, setCopiedSessionLogs] = useState<boolean>(false);
  const [scanSortOrder, setScanSortOrder] = useState<"newest" | "oldest">(() => {
    try {
      const saved = localStorage.getItem("smc_scan_sort_order");
      if (saved === "oldest" || saved === "newest") {
        return saved;
      }
    } catch (e) {
      console.error("Error loading scan sort order from localStorage:", e);
    }
    return "newest";
  });

  const handleSetScanSortOrder = (newOrder: "newest" | "oldest") => {
    setScanSortOrder(newOrder);
    try {
      localStorage.setItem("smc_scan_sort_order", newOrder);
    } catch (e) {
      console.error("Failed to persist scan sort order to localStorage:", e);
    }
  };

  const toggleScanSortOrder = () => {
    handleSetScanSortOrder(scanSortOrder === "newest" ? "oldest" : "newest");
  };
  const [qrScanStatus, setQrScanStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [qrScanResult, setQrScanResult] = useState<string | null>(null);
  const [qrScanError, setQrScanError] = useState<string | null>(null);
  const [qrZoomLevel, setQrZoomLevel] = useState<number>(1.0);
  const [scannerLightLux, setScannerLightLux] = useState<number>(22); // Default low-light condition (22 LUX)
  const [scannerTorchActive, setScannerTorchActive] = useState<boolean>(false);
  const [highContrastFocusMode, setHighContrastFocusMode] = useState<boolean>(true);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">(() => {
    try {
      const saved = localStorage.getItem("smc_camera_facing_mode");
      if (saved === "user" || saved === "environment") {
        return saved;
      }
    } catch {
      // ignore localStorage errors
    }
    return "environment";
  });

  useEffect(() => {
    try {
      localStorage.setItem("smc_camera_facing_mode", cameraFacingMode);
    } catch {
      // ignore localStorage errors
    }
  }, [cameraFacingMode]);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [isVerifyingQrApi, setIsVerifyingQrApi] = useState<boolean>(false);
  const [qrApiVerificationPayload, setQrApiVerificationPayload] = useState<any | null>(null);

  // Bulk Scan Mode & Persistent Batch History States
  const [qrScanMode, setQrScanMode] = useState<"single" | "bulk" | "history">("single");
  const [bulkBatchQueue, setBulkBatchQueue] = useState<Array<{
    id: string;
    lot: string;
    slabName: string;
    scannedAt: string;
  }>>([]);
  const [bulkScanNotice, setBulkScanNotice] = useState<string | null>(null);
  const [batchVerificationPayload, setBatchVerificationPayload] = useState<any | null>(null);
  const [isVerifyingBatchApi, setIsVerifyingBatchApi] = useState<boolean>(false);

  /**
   * Phase 5 Gate 0 purge: this previously seeded persistent batch-scan
   * history (written to localStorage, so it would persist across a real
   * user's sessions) with three fabricated "verified" batches — invented
   * ledger-hash-shaped hex strings, invented verification codes, and a
   * claim each was "verified against SMC Thames Warehouse Ledger" — none
   * of it backed by a real warehouse or verification ledger. History now
   * starts empty; the structure that renders and persists real scans (via
   * addBatchToHistory below) is unchanged.
   */
  const [verifiedBatchHistory, setVerifiedBatchHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("smc_verified_batch_history");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error reading verified batch history:", e);
    }
    return [];
  });

  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");
  const [selectedHistoryBatch, setSelectedHistoryBatch] = useState<any | null>(null);

  const addBatchToHistory = (payload: any) => {
    if (!payload || !payload.batchId) return;
    setVerifiedBatchHistory((prev: any[]) => {
      const exists = prev.some(b => b.batchId === payload.batchId);
      if (exists) return prev;
      const updated = [payload, ...prev];
      try {
        localStorage.setItem("smc_verified_batch_history", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to persist batch history:", e);
      }
      return updated;
    });
  };

  const filteredHistoryBatches = useMemo(() => {
    if (!historySearchQuery.trim()) return verifiedBatchHistory;
    const q = historySearchQuery.toLowerCase().trim();
    return verifiedBatchHistory.filter((b: any) => {
      const matchId = (b.batchId || "").toLowerCase().includes(q);
      const matchCode = (b.batchVerificationCode || "").toLowerCase().includes(q);
      const matchTime = (b.timestamp || "").toLowerCase().includes(q);
      const matchItems = b.items?.some((it: any) =>
        (it.slabName || "").toLowerCase().includes(q) ||
        (it.lotNumber || it.qrCode || "").toLowerCase().includes(q)
      );
      return matchId || matchCode || matchTime || matchItems;
    });
  }, [verifiedBatchHistory, historySearchQuery]);

  const qrVideoRef = useRef<HTMLVideoElement | null>(null);
  const qrStreamRef = useRef<MediaStream | null>(null);

  // Helper to add item to bulk batch queue
  const handleBulkScanItem = (rawCode: string) => {
    if (!rawCode) return;
    const normalized = rawCode.trim().toUpperCase();
    playScanBeep();

    const matched = VISION_SLABS.find(
      s => s.lot.toUpperCase() === normalized || s.id.toUpperCase() === normalized.toLowerCase()
    );

    const lot = matched ? matched.lot : normalized;
    const slabName = matched ? matched.name : `${normalized} Slab`;
    const itemId = matched ? matched.id : `slab-${Date.now()}`;

    setBulkBatchQueue(prev => {
      const exists = prev.some(item => item.lot.toUpperCase() === lot.toUpperCase());
      if (exists) {
        setBulkScanNotice(`Item '${lot}' is already in the batch queue.`);
        setTimeout(() => setBulkScanNotice(null), 3000);
        return prev;
      }
      setBulkScanNotice(`✓ Added '${slabName}' (LOT: ${lot}) to Bulk Queue.`);
      setTimeout(() => setBulkScanNotice(null), 3000);
      return [
        ...prev,
        {
          id: itemId,
          lot,
          slabName,
          scannedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        }
      ];
    });

    addScanToHistory(lot);
  };

  // Submit batch verification request
  const submitBatchVerificationRequest = async () => {
    if (bulkBatchQueue.length === 0) return;
    setIsVerifyingBatchApi(true);
    let payload: any = null;
    try {
      const res = await apiFetch("/api/qr/batch-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCodes: bulkBatchQueue.map(b => b.lot),
          batchId: `SMC-BATCH-${Date.now().toString(36).toUpperCase()}`
        })
      });
      payload = await res.json();
      if (!res.ok || payload?.batchVerified !== true) {
        throw new Error(payload?.error?.message || "Batch verification is unavailable.");
      }
    } catch (err) {
      console.warn("Batch QR Verification API network notice:", err);
      payload = null;
      setBulkScanNotice(err instanceof Error ? err.message : "Batch verification was not completed.");
    } finally {
      setIsVerifyingBatchApi(false);
    }

    if (payload) {
      setBatchVerificationPayload(payload);
      addBatchToHistory(payload);
    }
  };

  // Export Batch Verification Results as formatted CSV
  const handleExportBatchCsv = (targetPayload?: any) => {
    const payloadToExport = targetPayload || batchVerificationPayload;
    if (!payloadToExport) return;
    const { batchId, batchVerificationCode, timestamp, ledgerHash, items = [] } = payloadToExport;

    const headers = [
      "Batch ID",
      "Verification Code",
      "Timestamp",
      "Ledger Hash",
      "Item Number",
      "Slab Name",
      "Lot / QR Code",
      "Bay Location",
      "Thickness",
      "Verification Status"
    ];

    const rows = items.map((item: any, idx: number) => [
      `"${batchId || ''}"`,
      `"${batchVerificationCode || ''}"`,
      `"${timestamp || ''}"`,
      `"${ledgerHash || ''}"`,
      idx + 1,
      `"${(item.slabName || '').replace(/"/g, '""')}"`,
      `"${(item.lotNumber || item.qrCode || '').replace(/"/g, '""')}"`,
      `"${(item.bay || 'Bay A-04').replace(/"/g, '""')}"`,
      `"${(item.thickness || '20mm').replace(/"/g, '""')}"`,
      `"${item.verified ? 'VERIFIED' : 'PENDING'}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SMC_Batch_Verification_Report_${batchId || 'Report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Automatically triggers verification API call as soon as scanner detects a valid QR pattern
  const autoVerifyQrCode = async (rawCode: string) => {
    if (!rawCode) return;
    if (qrScanMode === "bulk") {
      handleBulkScanItem(rawCode);
      return;
    }
    const normalized = rawCode.trim().toUpperCase();
    setIsVerifyingQrApi(true);
    setScanProgress(100);

    playScanBeep();

    const matched = VISION_SLABS.find(
      s => s.lot.toUpperCase() === normalized || s.id.toUpperCase() === normalized.toLowerCase()
    );

    const resultSlabId = matched ? matched.id : normalized;
    setQrScanResult(resultSlabId);
    setQrScanStatus("scanning");
    if (matched) {
      setActiveVisionSlabId(matched.id);
    }
    addScanToHistory(matched ? matched.lot : normalized);

    try {
      const res = await apiFetch("/api/qr/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: normalized, lotId: matched ? matched.lot : normalized })
      });
      const data = await res.json();
      if (!res.ok || data?.verified !== true) {
        throw new Error(data?.error?.message || "QR verification is unavailable.");
      }
      setQrApiVerificationPayload(data);
      setQrScanStatus("success");
    } catch (err) {
      console.warn("QR Verification API network notice:", err);
      setQrApiVerificationPayload(null);
      setQrScanStatus("idle");
    } finally {
      setIsVerifyingQrApi(false);
    }
  };

  // Automated Optical Scanner Detection Loop - automatically triggers API verification when valid QR pattern aligns
  useEffect(() => {
    if (!showQrScanner || qrScanStatus !== "scanning") {
      setScanProgress(0);
      return;
    }

    setScanProgress(0);
    const DURATION_MS = 2200;
    const startTime = Date.now();
    let animFrameId: number;
    let scanTimer: any = null;
    let barcodeDetectorInstance: any = null;

    // Smoothly progress ring calculation over 2.2s (2200ms)
    const updateProgressRing = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / DURATION_MS) * 100);
      setScanProgress(pct);
      if (elapsed < DURATION_MS) {
        animFrameId = requestAnimationFrame(updateProgressRing);
      }
    };
    animFrameId = requestAnimationFrame(updateProgressRing);

    if (typeof window !== "undefined" && "BarcodeDetector" in window && typeof (window as any).BarcodeDetector === "function") {
      try {
        if (typeof (window as any).BarcodeDetector.getSupportedFormats === "function") {
          (window as any).BarcodeDetector.getSupportedFormats().then((formats: string[]) => {
            if (formats && Array.isArray(formats) && formats.length > 0) {
              try {
                const available = ["qr_code", "code_128", "data_matrix"].filter((f) => formats.includes(f));
                if (available.length > 0) {
                  barcodeDetectorInstance = new (window as any).BarcodeDetector({ formats: available });
                }
              } catch (e) {
                barcodeDetectorInstance = null;
              }
            }
          }).catch(() => {
            barcodeDetectorInstance = null;
          });
        }
      } catch (e) {
        barcodeDetectorInstance = null;
      }
    }

    const frameInterval = setInterval(async () => {
      if (qrVideoRef.current && barcodeDetectorInstance && qrVideoRef.current.readyState >= 2) {
        try {
          const barcodes = await barcodeDetectorInstance.detect(qrVideoRef.current);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            const detectedValue = barcodes[0].rawValue;
            cancelAnimationFrame(animFrameId);
            clearInterval(frameInterval);
            clearTimeout(scanTimer);
            autoVerifyQrCode(detectedValue);
          }
        } catch (err) {
          // Continue scanning loop
        }
      }
    }, 400);

    // Auto-detection timer: when camera is framed on a slab tag for 2.2s, automatically detect and trigger verification API
    scanTimer = setTimeout(() => {
      if (showQrScanner && qrScanStatus === "scanning") {
        cancelAnimationFrame(animFrameId);
        clearInterval(frameInterval);
        const currentTarget = VISION_SLABS.find(s => s.id === activeVisionSlabId) || VISION_SLABS[0];
        autoVerifyQrCode(currentTarget.lot);
      }
    }, DURATION_MS);

    return () => {
      cancelAnimationFrame(animFrameId);
      clearInterval(frameInterval);
      clearTimeout(scanTimer);
    };
  }, [showQrScanner, qrScanStatus, activeVisionSlabId]);

  // Handle hardware/software zoom adjustment for QR scanner viewport
  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.min(Math.max(newZoom, 1.0), 4.0);
    setQrZoomLevel(clamped);
    if (qrStreamRef.current) {
      const track = qrStreamRef.current.getVideoTracks()[0];
      if (track && "getCapabilities" in track) {
        try {
          const capabilities = (track.getCapabilities as () => any)();
          if (capabilities && capabilities.zoom) {
            const minZ = capabilities.zoom.min || 1.0;
            const maxZ = capabilities.zoom.max || 4.0;
            const hwZoom = Math.min(Math.max(clamped, minZ), maxZ);
            track.applyConstraints({ advanced: [{ zoom: hwZoom } as any] }).catch(() => {});
          }
        } catch (err) {
          // Fallback handled via CSS transform
        }
      }
    }
  };

  // SMC Vision Scan History State (persisted in localStorage)
  const [scanHistory, setScanHistory] = useState<Array<{
    id: string;
    lot: string;
    slabId: string;
    slabName: string;
    class?: string;
    scannedAt: string;
    note?: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem("smc_scan_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 5);
        }
      }
    } catch (e) {
      console.error("Error loading scan history from localStorage:", e);
    }
    return [
      {
        id: "scan-seed-1",
        lot: "B8492-V2",
        slabId: "calacatta-borghini",
        slabName: "Calacatta Borghini",
        class: "Sintered Porcelain",
        scannedAt: "09:42 AM"
      },
      {
        id: "scan-seed-2",
        lot: "Q7729-M5",
        slabId: "emerald-quartzite",
        slabName: "Emerald Quartzite",
        class: "Natural Quartzite",
        scannedAt: "10:15 AM"
      }
    ];
  });

  const addScanToHistory = (lotInput: string) => {
    if (!lotInput) return;
    const normalized = lotInput.trim().toUpperCase();
    const matchedSlab = VISION_SLABS.find(
      s => s.lot.toUpperCase() === normalized || s.id.toUpperCase() === normalized.toLowerCase()
    );

    const lot = matchedSlab ? matchedSlab.lot : normalized;
    const slabId = matchedSlab ? matchedSlab.id : "custom";
    const slabName = matchedSlab ? matchedSlab.name : `Lot ${normalized}`;
    const slabClass = matchedSlab ? matchedSlab.class : "Custom Batch";

    const newItem = {
      id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      lot,
      slabId,
      slabName,
      class: slabClass,
      scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setScanHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 10);
      try {
        localStorage.setItem("smc_scan_history", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to persist scan history to localStorage:", e);
      }
      return updated;
    });
  };

  const clearScanHistory = () => {
    setScanHistory([]);
    try {
      localStorage.removeItem("smc_scan_history");
    } catch (e) {
      console.error("Failed to clear scan history from localStorage:", e);
    }
  };

  const handleUpdateScanNote = (scanId: string, note: string) => {
    setScanHistory(prev => {
      const updated = prev.map(item => item.id === scanId ? { ...item, note } : item);
      try {
        localStorage.setItem("smc_scan_history", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to persist scan note to localStorage:", e);
      }
      return updated;
    });
  };

  const handleScanLotId = (lotInput: string) => {
    if (!lotInput) return;
    autoVerifyQrCode(lotInput);
  };

  const handleRecallScan = (item: { lot: string; slabId: string; slabName: string }) => {
    playScanBeep();
    if (item.slabId && item.slabId !== "custom") {
      setActiveVisionSlabId(item.slabId);
    } else {
      const matched = VISION_SLABS.find(s => s.lot.toUpperCase() === item.lot.toUpperCase());
      if (matched) {
        setActiveVisionSlabId(matched.id);
      }
    }
    addScanToHistory(item.lot);
  };

  // Stop QR Camera Stream
  const stopQrCamera = () => {
    if (qrStreamRef.current) {
      qrStreamRef.current.getTracks().forEach((track) => track.stop());
      qrStreamRef.current = null;
    }
    setQrScanStatus("idle");
  };

  // Start QR Camera Stream with front/rear camera switching
  const startQrCamera = async (targetFacingMode?: "environment" | "user") => {
    const facing = targetFacingMode || cameraFacingMode;
    setQrScanStatus("scanning");
    setQrScanError(null);
    setQrScanResult(null);
    setQrZoomLevel(1.0);
    if (qrStreamRef.current) {
      qrStreamRef.current.getTracks().forEach((track) => track.stop());
      qrStreamRef.current = null;
    }
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: facing } }
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing }
          });
        }
        qrStreamRef.current = stream;
        if (qrVideoRef.current) {
          qrVideoRef.current.srcObject = stream;
        }
      } else {
        throw new Error("Web Camera interfaces are not supported on this device/domain browser context.");
      }
    } catch (err: any) {
      console.warn("Real Camera access failed, using high-fidelity fallback HUD:", err);
      setQrScanError("Real Camera feed restricted or offline. Initializing safe interactive physical emulator.");
      setQrScanStatus("error");
    }
  };

  const toggleCameraFacingMode = () => {
    const nextMode = cameraFacingMode === "environment" ? "user" : "environment";
    setCameraFacingMode(nextMode);
    startQrCamera(nextMode);
  };

  useEffect(() => {
    if (showQrScanner) {
      startQrCamera();
    } else {
      stopQrCamera();
    }
    return () => {
      if (qrStreamRef.current) {
        qrStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showQrScanner]);

  // Audio beep generator using Web Audio API
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (typeof AudioCtx === "function") {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      console.log("AudioContext blocked or not supported by user interaction safety rules.");
    }
  };

  // Dynamic Survey Booking States
  const [showSurveyBookingModal, setShowSurveyBookingModal] = useState<boolean>(false);
  const [bookingName, setBookingName] = useState<string>("");
  const [bookingPhone, setBookingPhone] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<string>("");
  const [bookingTime, setBookingTime] = useState<string>("10:00");
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);

  // Modal State for Curated Gallery Case Studies
  const [activeCaseStudyModal, setActiveCaseStudyModal] = useState<"kensington" | "mayfair" | "chelsea" | "knightsbridge" | null>(null);

  // Before/After Interactive Slider States
  const [sliderPosition, setSliderPosition] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  const handleSliderMove = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let percentage = (x / rect.width) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    setSliderPosition(percentage);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      handleSliderMove(e.clientX);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isResizing) return;
      if (e.touches[0]) {
        handleSliderMove(e.touches[0].clientX);
      }
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: true });
      window.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isResizing]);
  
  // Lookbook Story States
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState<number>(0);

  useEffect(() => {
    if (activeStoryIndex === null) {
      setStoryProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 100) {
          if (activeStoryIndex < STORIES.length - 1) {
            setActiveStoryIndex(activeStoryIndex + 1);
            return 0;
          } else {
            setActiveStoryIndex(null);
            return 0;
          }
        }
        return prev + 2; // ~5 seconds total duration (2% * 50 = 100%)
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStoryIndex]);

  // Projects State & Search / Status Filtering
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem("smc_pro_projects");
    if (!saved) return INITIAL_PROJECTS;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length >= 10) {
        // Upgrade any legacy non-UK addresses or missing UK detail specs to INITIAL_PROJECTS
        const hasLegacyNonUk = parsed.some(p => 
          !p.address || 
          p.address.includes("Auckland") || 
          p.address.includes("St Heliers") || 
          p.address.includes("Skyrise")
        );
        if (!hasLegacyNonUk) {
          return parsed;
        }
      }
      return INITIAL_PROJECTS;
    } catch {
      return INITIAL_PROJECTS;
    }
  });
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState<"All" | "Proposal" | "Slab Selected" | "Fabrication" | "Ready for Install" | "Completed">("All");
  const [projectSort, setProjectSort] = useState<"updated-desc" | "updated-asc" | "value-desc" | "value-asc" | "variance-desc" | "variance-asc">("updated-desc");

  // Persist projects state updates
  useEffect(() => {
    try {
      localStorage.setItem("smc_pro_projects", JSON.stringify(projects));
    } catch (e) {
      console.error("Failed to persist projects to localStorage:", e);
    }
  }, [projects]);

  // Technician Edge Finishing Log Modal & Fabrication State
  const [activeLogModalProjectId, setActiveLogModalProjectId] = useState<string | null>(null);
  const [newLogStep, setNewLogStep] = useState<string>("");
  const [newLogTechnician, setNewLogTechnician] = useState<string>("");
  const [newLogProfile, setNewLogProfile] = useState<string>("");
  const [newLogGritSequence, setNewLogGritSequence] = useState<string>("");
  const [newLogStatus, setNewLogStatus] = useState<EdgeFinishingLog["status"]>("Approved");

  const handleUpdateFabricationField = <K extends keyof FabricationDetails>(
    projectId: string,
    field: K,
    value: FabricationDetails[K]
  ) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const currentFab = getFabricationDetailsForProject(p);
        const updatedFab: FabricationDetails = {
          ...currentFab,
          [field]: value
        };
        return {
          ...p,
          fabricationDetails: updatedFab,
          updatedAt: new Date().toISOString().split('T')[0]
        };
      }
      return p;
    }));
  };

  const handleAddEdgeFinishingLog = (projectId: string) => {
    if (!newLogStep.trim()) return;
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const logEntry: EdgeFinishingLog = {
      id: `log-${Date.now()}`,
      timestamp: timeStr,
      technician: newLogTechnician.trim() || "Installation Tech",
      step: newLogStep.trim(),
      profile: newLogProfile.trim() || "Standard Edge",
      gritSequence: newLogGritSequence.trim() || "200 -> 800 -> 1500 Diamond",
      status: newLogStatus
    };

    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const currentFab = getFabricationDetailsForProject(p);
        const updatedFab: FabricationDetails = {
          ...currentFab,
          edgeFinishingLogs: [logEntry, ...currentFab.edgeFinishingLogs]
        };
        return {
          ...p,
          fabricationDetails: updatedFab,
          updatedAt: new Date().toISOString().split('T')[0]
        };
      }
      return p;
    }));

    // Reset log modal state
    setActiveLogModalProjectId(null);
    setNewLogStep("");
    setNewLogTechnician("");
    setNewLogProfile("");
    setNewLogGritSequence("");
    setNewLogStatus("Approved");
  };

  // Quick Notes State (Dashboard sticky notes for production bottlenecks)
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>(() => {
    const saved = localStorage.getItem("smc_pro_quick_notes");
    return saved ? JSON.parse(saved) : DEFAULT_QUICK_NOTES;
  });
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState<QuickNote["category"]>("Bottleneck");
  const [newNoteAuthor, setNewNoteAuthor] = useState("");
  const [quickNoteFilter, setQuickNoteFilter] = useState<"All" | QuickNote["category"]>("All");

  useEffect(() => {
    try {
      localStorage.setItem("smc_pro_quick_notes", JSON.stringify(quickNotes));
    } catch (e) {
      console.error("Failed to save quick notes to localStorage:", e);
    }
  }, [quickNotes]);

  const handleAddQuickNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNoteText.trim()) return;

    let color: QuickNote["color"] = "amber";
    if (newNoteCategory === "Urgent") color = "rose";
    if (newNoteCategory === "Notice") color = "sky";
    if (newNoteCategory === "Shift Handover") color = "emerald";

    const now = new Date();
    const timeStr = `Today ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const newNote: QuickNote = {
      id: `qn-${Date.now()}`,
      text: newNoteText.trim(),
      category: newNoteCategory,
      createdAt: timeStr,
      author: newNoteAuthor.trim() || "Shop Team",
      color
    };

    setQuickNotes([newNote, ...quickNotes]);
    setNewNoteText("");
  };

  const handleDeleteQuickNote = (id: string) => {
    setQuickNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAllQuickNotes = () => {
    if (window.confirm("Clear all sticky notes from the daily bottleneck board?")) {
      setQuickNotes([]);
    }
  };

  // Phase 5 Gate 0: this previously computed a "project financial valuation"
  // from a fabricated pricing formula (per-material £/sqft with no
  // authoritative source, invented edge-profile rates, invented cutout fees,
  // and invented difficulty surcharges). None of those figures were ever
  // approved by SMC, so there is no formula left to compute a real value
  // from — this always returns 0 rather than fabricating one. Callers that
  // display this as a project's worth should show "Pending Quote" instead of
  // a £ figure; see tasks/todo.md's Gate 0 entry.
  const calculateProjectValue = (_proj: Project): number => {
    return 0;
  };

  // Filtered & Sorted Projects computation
  const filteredProjects = useMemo(() => {
    const list = projects.filter(proj => {
      // 1. Status Filter
      if (projectStatusFilter !== "All" && proj.status !== projectStatusFilter) {
        return false;
      }

      // 2. Search Query Filter
      if (!projectSearchQuery.trim()) return true;

      const q = projectSearchQuery.toLowerCase().trim();
      const nameMatch = proj.name.toLowerCase().includes(q);
      const addressMatch = proj.address.toLowerCase().includes(q);
      const notesMatch = proj.notes.toLowerCase().includes(q);
      const statusMatch = proj.status.toLowerCase().includes(q);

      const estimateMatch = proj.estimates.some(est => {
        const mat = getMaterialById(est.materialId);
        return (
          est.name.toLowerCase().includes(q) ||
          mat.name.toLowerCase().includes(q) ||
          mat.class.toLowerCase().includes(q) ||
          est.thickness.toLowerCase().includes(q) ||
          est.edgeProfile.toLowerCase().includes(q)
        );
      });

      return nameMatch || addressMatch || notesMatch || statusMatch || estimateMatch;
    });

    return [...list].sort((a, b) => {
      if (projectSort === "updated-desc") {
        const dateA = new Date(a.updatedAt || a.createdAt || "2026-07-01").getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || "2026-07-01").getTime();
        return dateB - dateA;
      }
      if (projectSort === "updated-asc") {
        const dateA = new Date(a.updatedAt || a.createdAt || "2026-07-01").getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || "2026-07-01").getTime();
        return dateA - dateB;
      }
      if (projectSort === "value-desc") {
        return calculateProjectValue(b) - calculateProjectValue(a);
      }
      if (projectSort === "value-asc") {
        return calculateProjectValue(a) - calculateProjectValue(b);
      }
      if (projectSort === "variance-desc") {
        const msA = a.milestones || getDefaultMilestonesForProject(a);
        const msB = b.milestones || getDefaultMilestonesForProject(b);
        const varA = calculateMilestoneVariance(msA.fabrication.expectedDate, msA.fabrication.actualDate).diffDays +
                     calculateMilestoneVariance(msA.readyForInstall.expectedDate, msA.readyForInstall.actualDate).diffDays;
        const varB = calculateMilestoneVariance(msB.fabrication.expectedDate, msB.fabrication.actualDate).diffDays +
                     calculateMilestoneVariance(msB.readyForInstall.expectedDate, msB.readyForInstall.actualDate).diffDays;
        return varB - varA; // Highest delay (+ variance) first
      }
      if (projectSort === "variance-asc") {
        const msA = a.milestones || getDefaultMilestonesForProject(a);
        const msB = b.milestones || getDefaultMilestonesForProject(b);
        const varA = calculateMilestoneVariance(msA.fabrication.expectedDate, msA.fabrication.actualDate).diffDays +
                     calculateMilestoneVariance(msA.readyForInstall.expectedDate, msA.readyForInstall.actualDate).diffDays;
        const varB = calculateMilestoneVariance(msB.fabrication.expectedDate, msB.fabrication.actualDate).diffDays +
                     calculateMilestoneVariance(msB.readyForInstall.expectedDate, msB.readyForInstall.actualDate).diffDays;
        return varA - varB; // Most ahead (- variance) first
      }
      return 0;
    });
  }, [projects, projectSearchQuery, projectStatusFilter, projectSort]);

  // Project Status Counts for Filter Badges
  const projectStatusCounts = useMemo(() => {
    return {
      All: projects.length,
      Proposal: projects.filter(p => p.status === "Proposal").length,
      "Slab Selected": projects.filter(p => p.status === "Slab Selected").length,
      Fabrication: projects.filter(p => p.status === "Fabrication").length,
      "Ready for Install": projects.filter(p => p.status === "Ready for Install").length,
      Completed: projects.filter(p => p.status === "Completed").length,
    };
  }, [projects]);

  // Portfolio Valuation Metrics & Breakdown
  const portfolioMetrics = useMemo(() => {
    let total = 0;
    let active = 0;
    let completed = 0;
    const stageValues: Record<string, number> = {
      Proposal: 0,
      "Slab Selected": 0,
      Fabrication: 0,
      "Ready for Install": 0,
      Completed: 0
    };

    projects.forEach(p => {
      const val = calculateProjectValue(p);
      total += val;
      if (stageValues[p.status] !== undefined) {
        stageValues[p.status] += val;
      }
      if (p.status === "Completed") {
        completed += val;
      } else {
        active += val;
      }
    });

    const count = projects.length;
    const avg = count > 0 ? total / count : 0;
    const activePct = total > 0 ? (active / total) * 100 : 0;

    return { total, active, completed, avg, count, activePct, stageValues };
  }, [projects]);

  const totalPortfolioValuation = portfolioMetrics.total;

  // Custom Tooltip for Recharts Pie Chart in Workload Dashboard
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-neutral-900 text-white p-3.5 rounded-xl border border-gold/40 shadow-xl space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="font-bold font-serif text-sm text-gold">{data.name}</span>
          </div>
          <div className="flex justify-between gap-6 pt-1 text-neutral-300 font-mono">
            <span>Projects:</span>
            <strong className="text-white font-bold">{data.count} ({data.percentage}%)</strong>
          </div>
          <div className="flex justify-between gap-6 text-neutral-300 font-mono">
            <span>Pipeline Value:</span>
            <strong className="text-gold font-bold">{formatCurrency(data.value)}</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  // Dashboard Analytics Data
  const dashboardData = useMemo(() => {
    const statuses: Array<Project["status"]> = [
      "Proposal",
      "Slab Selected",
      "Fabrication",
      "Ready for Install",
      "Completed"
    ];

    const statusColors: Record<Project["status"], string> = {
      "Proposal": "#3B82F6",       // Vibrant Blue
      "Slab Selected": "#8B5CF6",  // Regal Purple
      "Fabrication": "#D4AF37",    // Signature SMC Gold
      "Ready for Install": "#F59E0B", // Warm Amber
      "Completed": "#10B981"        // Emerald Green
    };

    const statusIcons: Record<Project["status"], string> = {
      "Proposal": "description",
      "Slab Selected": "inventory_2",
      "Fabrication": "precision_manufacturing",
      "Ready for Install": "local_shipping",
      "Completed": "task_alt"
    };

    const totalCount = projects.length;

    const distribution = statuses.map((st) => {
      const matchingProjects = projects.filter((p) => p.status === st);
      const count = matchingProjects.length;
      const value = matchingProjects.reduce((acc, p) => acc + calculateProjectValue(p), 0);
      const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

      return {
        name: st,
        count,
        value,
        percentage,
        color: statusColors[st],
        icon: statusIcons[st],
        projectsList: matchingProjects
      };
    });

    const activeWorkloadCount = projects.filter(p => p.status !== "Completed").length;
    const totalPipelineVal = projects.reduce((acc, p) => acc + calculateProjectValue(p), 0);
    const completionRate = totalCount > 0 ? Math.round((projects.filter(p => p.status === "Completed").length / totalCount) * 100) : 0;

    return {
      totalCount,
      activeWorkloadCount,
      totalPipelineVal,
      completionRate,
      distribution
    };
  }, [projects]);

  const materialDistributionData = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};

    projects.forEach(p => {
      p.estimates.forEach(est => {
        const mat = getMaterialById(est.materialId);
        const cat = mat.class || "Other";
        if (!map[cat]) {
          map[cat] = { count: 0, value: 0 };
        }
        map[cat].count += 1;
      });
    });

    return Object.keys(map).map(cat => ({
      category: cat,
      estimatesCount: map[cat].count,
      totalValue: Math.round(map[cat].value)
    }));
  }, [projects]);

  // Active Project Form State
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [pdfProject, setPdfProject] = useState<Project | null>(null);
  const [signoffModalProject, setSignoffModalProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectAddress, setNewProjectAddress] = useState("");
  const [newProjectNotes, setNewProjectNotes] = useState("");

  const handleSaveDigitalSignoff = (projectId: string, signoffData: DigitalSignoff) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const updatedProject: Project = {
          ...p,
          status: "Completed",
          digitalSignoff: {
            ...signoffData,
            signatureDataUrl: signoffData.signatureDataUrl,
            timestamp: signoffData.timestamp || new Date().toLocaleString("en-GB", {
              dateStyle: "full",
              timeStyle: "medium"
            })
          },
          updatedAt: new Date().toISOString().split('T')[0]
        };
        return updatedProject;
      }
      return p;
    }));

    if (signoffModalProject && signoffModalProject.id === projectId) {
      setSignoffModalProject(prev => prev ? {
        ...prev,
        status: "Completed",
        digitalSignoff: signoffData,
        updatedAt: new Date().toISOString().split('T')[0]
      } : null);
    }
  };

  /**
   * Phase 5 Gate 0 purge.
   *
   * This previously drove an "SMC Prism-Core™ AI Drawing Scanner" feature:
   * uploading any file (or clicking a "demo" button) triggered a fake
   * multi-second progress animation, then always injected the exact same
   * hardcoded four-block kitchen layout (specific lengths, widths, edge
   * profiles, cutout counts) into the user's real estimate, regardless of
   * what file was actually uploaded or its real contents, along with a
   * fabricated "Prism-Core Auto-Quote complete!" note. No OCR/vision
   * backend exists. Because this silently wrote fabricated dimensions into
   * a real quote, the whole simulated scan-and-import flow has been
   * removed rather than left dormant.
   */

  // Estimator State
  const [estimateParts, setEstimateParts] = useState<EstimatePart[]>([
    {
      id: "part-1",
      name: "Kitchen Countertop",
      length: 120,
      width: 25,
      materialId: "calacatta-gold",
      thickness: "30mm",
      edgeProfile: "Square/Eased",
      edgeLength: 10,
      sinkCutouts: 1,
      cooktopCutouts: 1,
      faucetHoles: 1,
      backsplashLength: 120,
      backsplashHeight: 4
    }
  ]);
  const [selectedProjectForSaving, setSelectedProjectForSaving] = useState<string>("");
  const [activeEditingPartId, setActiveEditingPartId] = useState<string>("part-1");

  // AI Technical Advisory Support State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("smc_pro_chat");
    return saved ? JSON.parse(saved) : [
      {
        id: "chat-welcome",
        role: "assistant",
        content: "Welcome to the SMC PRO Technical Advisory Panel. I have access to full engineering guidelines, abrasive metrics, water-absorption rates, and structural thresholds for Quartz, Porcelain, and Natural Stone. How can I assist you with your fabrication layout or material specifications today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [inputMessage, setInputMessage] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Sync projects and chat to localStorage
  useEffect(() => {
    localStorage.setItem("smc_pro_projects", JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem("smc_pro_chat", JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isAiLoading]);

  // Auth Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setPortalView("login");
    setShowPortalModal(true);
  };

  const handleLogout = () => {
    void signOut().finally(() => {
      setIsAuthenticated(false);
      setIsGuest(true);
      setAuthEmail("");
      setCanAccessManager(false);
      setCanAccessAdmin(false);
      setUserRole("client");
      setActiveTab("vault");
    });
  };

  // Phase 5 Gate 0: pricing removed. This previously computed a per-part
  // quote total from a fabricated pricing formula (an unverified £/sqft
  // material rate, invented edge-profile rates, invented cutout fees, and
  // invented fabrication-difficulty surcharges) — none of it was ever
  // approved by SMC. The geometric measurements below (areas, sqft) are
  // real arithmetic on the user's own entered dimensions and are kept; the
  // cost fields are zeroed rather than fabricated. Consumers should show
  // "Price on Application" wording instead of these figures.
  const calculatedEstimatePartsSummary = useMemo(() => {
    return estimateParts.map(part => {
      const mat = getMaterialById(part.materialId);

      const mainAreaSqFt = (part.length * part.width) / 144;
      const backsplashAreaSqFt = (part.backsplashLength * part.backsplashHeight) / 144;
      const totalSqFt = mainAreaSqFt + backsplashAreaSqFt;

      return {
        ...part,
        material: mat,
        mainAreaSqFt,
        backsplashAreaSqFt,
        totalSqFt,
        baseCost: 0,
        totalEdgeCost: 0,
        totalCutoutsCost: 0,
        surchargeCost: 0,
        surchargePct: 0,
        totalCost: 0
      };
    });
  }, [estimateParts]);

  // Grand Total of currently active estimate parts
  const activeEstimateGrandTotal = useMemo(() => {
    return calculatedEstimatePartsSummary.reduce((acc, p) => acc + p.totalCost, 0);
  }, [calculatedEstimatePartsSummary]);

  // Create Project
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    const newProj: Project = {
      id: "proj-" + Date.now(),
      name: newProjectName,
      address: newProjectAddress,
      status: "Proposal",
      notes: newProjectNotes,
      estimates: JSON.parse(JSON.stringify(estimateParts)), // copy current estimate
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    setProjects([newProj, ...projects]);
    setNewProjectName("");
    setNewProjectAddress("");
    setNewProjectNotes("");
    setShowNewProjectModal(false);
    setActiveTab("projects");
  };

  // Add current active estimate to an existing project
  const handleSaveEstimateToProject = () => {
    if (!selectedProjectForSaving) return;
    const today = new Date().toISOString().split('T')[0];
    setProjects(projects.map(p => {
      if (p.id === selectedProjectForSaving) {
        return {
          ...p,
          updatedAt: today,
          estimates: [...p.estimates, ...JSON.parse(JSON.stringify(estimateParts))]
        };
      }
      return p;
    }));
    alert("Estimate saved successfully to project!");
    setActiveTab("projects");
  };

  // Delete Project
  const handleDeleteProject = (id: string) => {
    if (confirm("Are you sure you want to archive/delete this project?")) {
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  // Update Project Status
  const handleUpdateProjectStatus = (projId: string, status: Project["status"]) => {
    const today = new Date().toISOString().split('T')[0];
    setStatusChangedMap(prev => ({
      ...prev,
      [projId]: { status, timestamp: Date.now() }
    }));
    setProjects(projects.map(p => {
      if (p.id === projId) {
        return { ...p, status, updatedAt: today };
      }
      return p;
    }));
  };

  // Edit Project Notes
  const handleUpdateProjectNotes = (projId: string, notes: string) => {
    const today = new Date().toISOString().split('T')[0];
    setProjects(projects.map(p => {
      if (p.id === projId) {
        return { ...p, notes, updatedAt: today };
      }
      return p;
    }));
  };

  // Update Project Milestone Fields (Fabrication / Ready for Install)
  const handleUpdateProjectMilestoneField = (
    projId: string,
    stage: "fabrication" | "readyForInstall",
    field: "expectedDate" | "actualDate" | "progressPct" | "status",
    value: any
  ) => {
    const today = new Date().toISOString().split('T')[0];
    setProjects(prevProjects => {
      const updated = prevProjects.map(proj => {
        if (proj.id !== projId) return proj;
        const currentMs = proj.milestones || getDefaultMilestonesForProject(proj);
        const currentStage = { ...currentMs[stage] };
        
        (currentStage as any)[field] = value;

        if (field === "progressPct") {
          if (Number(value) >= 100) {
            currentStage.status = "completed";
          } else if (Number(value) > 0 && currentStage.status === "pending") {
            currentStage.status = "in-progress";
          }
        }

        const updatedMilestones: ProjectMilestones = {
          ...currentMs,
          [stage]: currentStage
        };

        return {
          ...proj,
          updatedAt: today,
          milestones: updatedMilestones
        };
      });

      try {
        localStorage.setItem("smc_pro_projects", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to persist milestone update to localStorage:", e);
      }

      return updated;
    });
  };

  // General Unified Timeline Milestone Update Handler (Drag and Drop / Date Picker)
  const handleUpdateProjectTimelineMilestone = (
    projId: string,
    stageKey: string,
    fieldUpdates: Partial<StageMilestone>
  ) => {
    const today = new Date().toISOString().split('T')[0];
    setProjects(prevProjects => {
      const updated = prevProjects.map(proj => {
        if (proj.id !== projId) return proj;
        const currentMs = proj.milestones || getDefaultMilestonesForProject(proj);
        const existingStage = (currentMs as any)[stageKey] || {
          expectedDate: today,
          actualDate: today,
          progressPct: 0,
          status: "pending"
        };

        const updatedStage = {
          ...existingStage,
          ...fieldUpdates
        };

        if (fieldUpdates.progressPct !== undefined) {
          if (fieldUpdates.progressPct >= 100) {
            updatedStage.status = "completed";
          } else if (fieldUpdates.progressPct > 0 && updatedStage.status === "pending") {
            updatedStage.status = "in-progress";
          }
        }

        const updatedMilestones: ProjectMilestones = {
          ...currentMs,
          [stageKey]: updatedStage
        };

        return {
          ...proj,
          updatedAt: today,
          milestones: updatedMilestones
        };
      });

      try {
        localStorage.setItem("smc_pro_projects", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to persist timeline milestone update to localStorage:", e);
      }

      return updated;
    });
  };

  // Quick Estimate actions
  const handleAddEstimatePart = () => {
    const newId = "part-" + Date.now();
    setEstimateParts([
      ...estimateParts,
      {
        id: newId,
        name: `Cabinet Run ${estimateParts.length + 1}`,
        length: 80,
        width: 25,
        materialId: "statuario-extra",
        thickness: "20mm",
        edgeProfile: "Square/Eased",
        edgeLength: 6,
        sinkCutouts: 0,
        cooktopCutouts: 0,
        faucetHoles: 0,
        backsplashLength: 0,
        backsplashHeight: 0
      }
    ]);
    setActiveEditingPartId(newId);
  };

  const handleDeleteEstimatePart = (id: string) => {
    if (estimateParts.length <= 1) return;
    const remaining = estimateParts.filter(p => p.id !== id);
    setEstimateParts(remaining);
    setActiveEditingPartId(remaining[0].id);
  };

  const handleUpdatePartField = (partId: string, field: keyof EstimatePart, value: any) => {
    setEstimateParts(estimateParts.map(p => {
      if (p.id === partId) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  // Load an estimate from an existing project back into the estimator to tweak it
  const handleLoadProjectEstimate = (proj: Project) => {
    if (proj.estimates && proj.estimates.length > 0) {
      setEstimateParts(JSON.parse(JSON.stringify(proj.estimates)));
      setActiveEditingPartId(proj.estimates[0].id);
      setActiveTab("estimator");
    } else {
      alert("This project has no estimate parts.");
    }
  };

  // Bulk import clipboard CSV / Excel dimension parts into active workspace or target project pipeline
  const handleImportBulkParts = (newParts: EstimatePart[], appendMode: boolean, targetProjectId?: string) => {
    if (newParts.length === 0) return;

    if (targetProjectId) {
      setProjects((prevProjects) =>
        prevProjects.map((proj) => {
          if (proj.id === targetProjectId) {
            const updatedEstimates = appendMode
              ? [...(proj.estimates || []), ...newParts]
              : [...newParts];
            return {
              ...proj,
              estimates: updatedEstimates,
              updatedAt: new Date().toISOString(),
              notes: (proj.notes || "") + `\n[${new Date().toLocaleDateString('en-GB')}] Bulk imported ${newParts.length} CSV/Excel clipboard parts.`,
            };
          }
          return proj;
        })
      );
    }

    // Update active estimator state
    if (appendMode) {
      setEstimateParts((prev) => [...prev, ...newParts]);
    } else {
      setEstimateParts(newParts);
    }

    if (targetProjectId) {
      setActiveTab("projects");
    } else {
      setActiveTab("estimator");
    }
  };

  // Gemini Chat Advisory Advisory API request
  const handleSendChatMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isAiLoading) return;

    const userMsg: ChatMessage = {
      id: "chat-" + Date.now(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!customText) setInputMessage("");
    setIsAiLoading(true);

    try {
      // Build correct conversation history
      const history = [...chatMessages, userMsg].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await apiFetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history })
      });

      if (!response.ok) {
        throw new Error("Advisory connection interrupted. Please try again.");
      }

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: "chat-" + Date.now() + "-reply",
        role: "assistant",
        content: data.reply || "No recommendations generated.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: "chat-error-" + Date.now(),
        role: "assistant",
        content: `⚠️ Technical Advisory Connection Timeout: ${err.message || "Failed to reach cloud service."} Please check that your API key is correctly setup in the Secrets tab.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Calculated Project Demand per Material (in sq ft) across all projects
  const materialDemandMap = useMemo(() => {
    const map: Record<string, {
      demandSqFt: number;
      projectCount: number;
      projectsList: Array<{ id: string; name: string; status: string; reqSqFt: number }>;
    }> = {};

    projects.forEach(p => {
      p.estimates.forEach(est => {
        const mainSqFt = (est.length * est.width) / 144;
        const splashSqFt = (est.backsplashLength * est.backsplashHeight) / 144;
        const totalPartSqFt = mainSqFt + splashSqFt;

        if (!map[est.materialId]) {
          map[est.materialId] = { demandSqFt: 0, projectCount: 0, projectsList: [] };
        }

        map[est.materialId].demandSqFt += totalPartSqFt;

        const existingProj = map[est.materialId].projectsList.find(pr => pr.id === p.id);
        if (existingProj) {
          existingProj.reqSqFt += totalPartSqFt;
        } else {
          map[est.materialId].projectsList.push({
            id: p.id,
            name: p.name,
            status: p.status,
            reqSqFt: totalPartSqFt
          });
          map[est.materialId].projectCount += 1;
        }
      });
    });

    return map;
  }, [projects]);

  // Count of materials where project demand exceeds current warehouse stock
  const exceededMaterialsCount = useMemo(() => {
    return MATERIALS_CATALOG.filter(m => {
      const stock = materialsStock[m.id] ?? 0;
      const demand = materialDemandMap[m.id]?.demandSqFt || 0;
      return demand > stock;
    }).length;
  }, [materialsStock, materialDemandMap]);

  // Category item counts for real-time drawer feedback
  const materialFilterCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "All": MATERIALS_CATALOG.length,
      "Available Inventory": 0,
      "Awaiting Transit": 0,
      "High Demand": 0,
      "Low Inventory": 0,
      "Demand Exceeded": 0,
      "Quartz": 0,
      "Porcelain": 0,
      "Natural Stone": 0,
      "Favorites": favoriteMaterialIds.length,
    };

    MATERIALS_CATALOG.forEach((m) => {
      const currentStock = materialsStock[m.id] ?? 0;
      const demandSqFt = materialDemandMap[m.id]?.demandSqFt || 0;
      const isExceeded = demandSqFt > currentStock;

      if (currentStock > 0) counts["Available Inventory"]++;
      if (false) counts["Awaiting Transit"]++;
      if (demandSqFt > 0 || isExceeded) counts["High Demand"]++;
      if (currentStock <= 30 || isExceeded) counts["Low Inventory"]++;
      if (isExceeded) counts["Demand Exceeded"]++;
      if (counts[m.class] !== undefined) counts[m.class]++;
    });

    return counts;
  }, [materialsStock, materialDemandMap, favoriteMaterialIds]);

  // Filtered & Sorted Materials Catalog
  const filteredMaterials = useMemo(() => {
    const list = MATERIALS_CATALOG.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.technicalDetails.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.class.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedMaterialFilters.length === 0) return true;

      const currentStock = materialsStock[m.id] ?? 0;
      const demandSqFt = materialDemandMap[m.id]?.demandSqFt || 0;
      const isExceeded = demandSqFt > currentStock;

      // Group 1: Material Classes
      const selectedClasses = selectedMaterialFilters.filter((f) =>
        ["Quartz", "Porcelain", "Natural Stone"].includes(f)
      );
      if (selectedClasses.length > 0) {
        if (!selectedClasses.includes(m.class)) return false;
      }

      // Group 2: Stock & Supply Chain Status
      const selectedStatuses = selectedMaterialFilters.filter((f) =>
        ["Available Inventory", "Awaiting Transit", "High Demand", "Low Inventory", "Demand Exceeded"].includes(f)
      );
      if (selectedStatuses.length > 0) {
        const matchesAnyStatus = selectedStatuses.some((status) => {
          if (status === "Available Inventory") return currentStock > 0;
          if (status === "Awaiting Transit") return false;
          if (status === "High Demand") return demandSqFt > 0 || isExceeded;
          if (status === "Low Inventory") return currentStock <= 30 || isExceeded;
          if (status === "Demand Exceeded") return isExceeded;
          return false;
        });
        if (!matchesAnyStatus) return false;
      }

      // Group 3: Saved Favorites
      if (selectedMaterialFilters.includes("Favorites")) {
        if (!favoriteMaterialIds.includes(m.id)) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (catalogSort === "mohs-desc") return b.mohs - a.mohs;
      if (catalogSort === "mohs-asc") return a.mohs - b.mohs;
      return 0; // "featured" maintains catalog default order
    });
  }, [searchQuery, selectedMaterialFilters, catalogSort, materialsStock, materialDemandMap, favoriteMaterialIds]);

  // Statistics
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const activeQuotes = projects.filter(p => p.status === "Proposal" || p.status === "Slab Selected").length;
    const completedVal = projects.filter(p => p.status === "Completed").length;
    
    // Average hardness
    const avgHardness = (MATERIALS_CATALOG.reduce((acc, m) => acc + m.mohs, 0) / MATERIALS_CATALOG.length).toFixed(1);

    return { totalProjects, activeQuotes, completedVal, avgHardness };
  }, [projects]);


  // RENDER: SECURE WORKSPACE (DIRECT ACCESS TO HOME DASHBOARD)
  return (
    <div id="main-workspace" className="min-h-screen bg-white text-[#1A1A1A] font-sans flex flex-col pb-20 md:pb-0">
      
      {/* HEADER SECTION (SMC Portfolio Lookbook Style) */}
      <header className="w-full flex justify-between items-center px-4 md:px-12 h-20 border-b border-neutral-100 bg-white sticky top-0 z-50 relative">
        {/* Left Section: Menu Button, Search Icon & Desktop Nav */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-6">
          <button 
            className="p-2 text-[#1A1A1A] hover:text-gold transition-colors flex items-center justify-center cursor-pointer rounded-lg hover:bg-neutral-100"
            onClick={() => setIsSideMenuOpen(true)}
            title="Open SMC Side Navigation Drawer"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* 🔍 SEARCH ICON ON THE LEFT */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center justify-center p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 cursor-pointer transition-all shadow-xs"
            title="Search Materials, Quotes & Projects"
          >
            <Search className="w-4 h-4 text-gold" />
          </button>

          {/* DESKTOP NAVIGATION - 6 CORE TABS */}
          <nav className="hidden lg:flex items-center gap-6">
            <button 
              onClick={() => setActiveTab("dashboard")}
              className={`text-sm font-medium transition-all duration-200 py-1.5 px-0.5 cursor-pointer ${
                activeTab === "dashboard"
                  ? "text-gold font-semibold border-b-2 border-gold"
                  : "text-[#1A1A1A] hover:text-gold"
              }`}
            >
              Home
            </button>
            <button 
              onClick={() => setActiveTab("design-studio")}
              className={`text-sm font-medium transition-all duration-200 py-1.5 px-0.5 cursor-pointer ${
                activeTab === "design-studio" || activeTab === "vision"
                  ? "text-gold font-semibold border-b-2 border-gold"
                  : "text-[#1A1A1A] hover:text-gold"
              }`}
            >
              Design
            </button>
            <button 
              onClick={() => setActiveTab("estimator")}
              className={`text-sm font-medium transition-all duration-200 py-1.5 px-0.5 cursor-pointer ${
                activeTab === "estimator" || activeTab === "quote-summary"
                  ? "text-gold font-semibold border-b-2 border-gold"
                  : "text-[#1A1A1A] hover:text-gold"
              }`}
            >
              Quote
            </button>
            <button 
              onClick={() => setActiveTab("projects")}
              className={`text-sm font-medium transition-all duration-200 py-1.5 px-0.5 cursor-pointer ${
                activeTab === "projects"
                  ? "text-gold font-semibold border-b-2 border-gold"
                  : "text-[#1A1A1A] hover:text-gold"
              }`}
            >
              Projects
            </button>
            <button 
              onClick={() => setActiveTab("artisan-shop")}
              className={`text-sm font-medium transition-all duration-200 py-1.5 px-0.5 cursor-pointer ${
                activeTab === "artisan-shop"
                  ? "text-gold font-semibold border-b-2 border-gold"
                  : "text-[#1A1A1A] hover:text-gold"
              }`}
            >
              Shop
            </button>
            <button 
              onClick={() => setActiveTab("account")}
              className={`text-sm font-medium transition-all duration-200 py-1.5 px-0.5 cursor-pointer ${
                activeTab === "account"
                  ? "text-gold font-semibold border-b-2 border-gold"
                  : "text-[#1A1A1A] hover:text-gold"
              }`}
            >
              Account
            </button>
          </nav>
        </div>

        {/* 🏆 CENTRAL LOGO PLACEMENT */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 h-12 w-auto cursor-pointer flex items-center justify-center transition-transform hover:scale-105 z-20" 
          onClick={() => setActiveTab("dashboard")}
          title="SMC PRO - Go to Home Dashboard"
        >
          <img 
            alt="SMC PRO Logo" 
            className="h-full w-auto object-contain mix-blend-multiply" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBXNV_RiofajRHjAoUdeRL9DEe2QkYbM7Tc0A4TQGbDMcjFQw7Q5zg9KIK2ijao316cxP_79D-6J5NzIHqGSsKu4We4TrVBU9wXJ-Oki7eDSGHaKKrZC6H9bitIoGlyNOMKRzOMOxJ7P98OaPN4DFpS7I8k6ifbcEAbyIrTMtqR8d6Yfx7XBkh3itiTP9iEqSYh_FMLknw4CwMtdIRxcCZr-5-A3zhzsZvV5yGDXPOTs9J_FTIffTZ0lCxFXwpnnkh4xJeo_osw6k"
          />
        </div>

        {/* Right Section: Multi-Language Bar & Auth */}
        <div className="flex items-center gap-2 md:gap-3 z-10">
          {/* 🌐 MULTI-LANGUAGE SELECTION BAR */}
          <div className="relative group">
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold border border-neutral-300 cursor-pointer transition-all"
              title="Select Language"
            >
              <Globe className="w-3.5 h-3.5 text-gold" />
              <span className="font-mono text-[11px] uppercase font-bold">{selectedLanguage}</span>
            </button>
            
            {/* Language Selector Dropdown */}
            <div className="absolute right-0 top-full mt-1.5 w-40 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl hidden group-hover:block p-1.5 z-50 text-white space-y-1">
              {[
                { code: "en", name: "English", flag: "🇬🇧" },
                { code: "ar", name: "العربية", flag: "🇦🇪" },
                { code: "it", name: "Italiano", flag: "🇮🇹" },
                { code: "fr", name: "Français", flag: "🇫🇷" },
                { code: "de", name: "Deutsch", flag: "🇩🇪" },
                { code: "es", name: "Español", flag: "🇪🇸" }
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLanguage(lang.code);
                    localStorage.setItem("smc_pro_lang", lang.code);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    selectedLanguage === lang.code ? "bg-gold/20 text-gold font-bold" : "hover:bg-neutral-800 text-neutral-300"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{lang.flag}</span>
                    <span className="text-[11px]">{lang.name}</span>
                  </span>
                  {selectedLanguage === lang.code && <Check className="w-3 h-3 text-gold" />}
                </button>
              ))}
            </div>
          </div>

          {/* User Sign In or Avatar */}
          {isGuest || !authEmail ? (
            <button
              onClick={() => {
                setPortalView("login");
                setShowPortalModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gold hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold border border-amber-400 shadow-sm cursor-pointer transition-all uppercase tracking-wider shrink-0"
              title="Sign In or Create Account"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In / Register</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex flex-col text-right cursor-pointer" onClick={() => setActiveTab("account")}>
                <span className="text-xs font-semibold text-neutral-800">{authEmail}</span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-gold font-bold">Approved Partner</span>
              </div>
              <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 cursor-pointer group" onClick={() => setActiveTab("account")} title="Go to Account">
                <img 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnbUqlRLJYMzrklRn9sMlZQRZzz14M7gk0LkBuw3TbBgE-IYQ-ckNx_dh42oX4UlAsDcrjiyPyFdG-hOSRfWtWprxaY0yDnpu3LZP7F7i4TQCLEjWlpk2dF27-XYt-Roq3WheNTn7naidHXqzBddQsfjXNVYwtt_0xXcP7wBC9R48he5GcU3iQfP-0vQMT1voiOsa8nXv7TgCZfyHBt6F21Jl8igOZj6XhUKktbHOPk4SP0pZM6CghPWE-V5dCcFMtWIARuAofHC0"
                  alt="User Avatar"
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center h-20 pb-safe bg-white border-t border-gray-100 z-50 shadow-lg px-1">
        <button 
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center justify-center transition-colors ${
            activeTab === "dashboard" ? "text-gold" : "text-gray-400 hover:text-[#1A1A1A]"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeTab === "dashboard" ? "'FILL' 1" : "'FILL' 0" }}>home</span>
          <span className="text-[9px] font-medium mt-0.5">Home</span>
        </button>

        <div className="relative flex flex-col items-center justify-center">
          <button 
            onClick={() => {
              setShowQrScanner(true);
              setQrScanStatus("scanning");
              setQrScanResult(null);
              setQrScanError(null);
            }}
            className="flex flex-col items-center justify-center transition-all group cursor-pointer"
            title="Quick Scan Slab QR Code"
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              showQrScanner 
                ? `bg-gold text-neutral-950 shadow-lg ring-4 ring-gold/50 scale-105 ${qrScanStatus === "scanning" ? "animate-scanner-pulse" : "animate-pulse"}` 
                : "bg-neutral-900 text-gold group-hover:bg-gold group-hover:text-neutral-950 shadow-xs"
            }`}>
              <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
            </div>
            <span className={`text-[9px] font-bold mt-0.5 tracking-tight ${
              showQrScanner ? "text-gold font-bold" : "text-neutral-700"
            }`}>
              Quick Scan
            </span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowQuickScanTooltip(prev => !prev);
            }}
            className="absolute -top-1 -right-2 w-4.5 h-4.5 rounded-full bg-neutral-950 text-gold border border-gold/80 flex items-center justify-center text-[10px] font-extrabold shadow-sm hover:scale-110 active:scale-95 transition-all cursor-pointer z-20"
            title="Quick Scan Helper & Feature Guide"
          >
            ?
          </button>
        </div>

        <button 
          onClick={() => setActiveTab("design-studio")}
          className={`flex flex-col items-center justify-center transition-colors ${
            activeTab === "design-studio" ? "text-gold" : "text-gray-400 hover:text-[#1A1A1A]"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeTab === "design-studio" ? "'FILL' 1" : "'FILL' 0" }}>design_services</span>
          <span className="text-[9px] font-medium mt-0.5">Design</span>
        </button>

        <button 
          onClick={() => setActiveTab("estimator")}
          className={`flex flex-col items-center justify-center transition-colors ${
            activeTab === "estimator" || activeTab === "quote-summary" ? "text-gold" : "text-gray-400 hover:text-[#1A1A1A]"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeTab === "estimator" || activeTab === "quote-summary" ? "'FILL' 1" : "'FILL' 0" }}>calculate</span>
          <span className="text-[9px] font-medium mt-0.5">Quote</span>
        </button>

        <button 
          onClick={() => setActiveTab("projects")}
          className={`flex flex-col items-center justify-center transition-colors ${
            activeTab === "projects" ? "text-gold" : "text-gray-400 hover:text-[#1A1A1A]"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeTab === "projects" ? "'FILL' 1" : "'FILL' 0" }}>folder_open</span>
          <span className="text-[9px] font-medium mt-0.5">Projects</span>
        </button>

        <button 
          onClick={() => setActiveTab("account")}
          className={`flex flex-col items-center justify-center transition-colors ${
            activeTab === "account" ? "text-gold" : "text-gray-400 hover:text-[#1A1A1A]"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeTab === "account" ? "'FILL' 1" : "'FILL' 0" }}>person</span>
          <span className="text-[9px] font-medium mt-0.5">Account</span>
        </button>
      </nav>

      {/* CORE WORKSPACE VIEWPORT */}
      <main id="main-content" className="flex-1 px-4 md:px-16 py-8 max-w-7xl w-full mx-auto">
        
        {/* ========================================================= */}
        {/* VIEW 0: PREMIUM CLIENT HOME DASHBOARD */}
        {/* ========================================================= */}
        {activeTab === "dashboard" && (
          <ErrorBoundary fallbackTitle="Home Dashboard Temporary Error">
            <HomeDashboard
              projects={projects}
              activeUserEmail={authEmail || "alexander.wright@kensington.co.uk"}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
              onOpenAppointmentModal={() => setShowAppointmentModal(true)}
              onOpenFinanceModal={() => setShowFinanceModal(true)}
              onOpenReferralsModal={() => setShowReferralsModal(true)}
              onOpenPdfModal={(proj) => setPdfProject(proj)}
              onOpenSignoffModal={(proj) => setSignoffModalProject(proj)}
              onOpenAiSupport={() => {
                setActiveTab("ai-support");
              }}
              onOpenWhatsAppModal={() => setShowWhatsAppModal(true)}
              materialsCatalog={MATERIALS_CATALOG}
              materialsStock={materialsStock}
              onUpdateMaterialStock={handleUpdateMaterialStock}
              userRole={userRole}
              onToggleRole={handleRoleToggle}
              isGuest={isGuest}
              userEmail={authEmail}
              onOpenSignUpModal={() => {
                setPortalView("register");
                setShowPortalModal(true);
              }}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW: CENTRAL CRM PIPELINE */}
        {/* ========================================================= */}
        {(activeTab === "crm" || activeTab === "crm-pipeline") && (
          <ErrorBoundary fallbackTitle="CRM Pipeline Temporary Error">
            <CrmPipelineView />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW: COMMERCIAL ANALYTICS & REPORTING */}
        {/* ========================================================= */}
        {(activeTab === "analytics" || activeTab === "reporting") && (
          <ErrorBoundary fallbackTitle="Analytics Dashboard Temporary Error">
            <AnalyticsDashboardView />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW: STAFF & CREW MANAGEMENT */}
        {/* ========================================================= */}
        {(activeTab === "staff" || activeTab === "crew") && (
          <ErrorBoundary fallbackTitle="Staff Management Temporary Error">
            <StaffCrewManagementView />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW: INTERACTIVE SITE CALENDAR & DISPATCH GRID */}
        {/* ========================================================= */}
        {(activeTab === "calendar" || activeTab === "schedule") && (
          <ErrorBoundary fallbackTitle="Site Calendar Temporary Error">
            <InteractiveCalendarGrid />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW: UNIFIED CLIENT INBOX */}
        {/* ========================================================= */}
        {(activeTab === "inbox" || activeTab === "messages") && (
          <ErrorBoundary fallbackTitle="Unified Customer Inbox Temporary Error">
            <UnifiedCustomerInbox />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW: PUBLISHING COMMAND CENTER */}
        {/* ========================================================= */}
        {activeTab === "publishing-command" && (
          <PublishingCommandCenterView
            onClose={() => setActiveTab("dashboard")}
            onNavigateHome={() => setActiveTab("dashboard")}
            userEmail={authEmail}
          />
        )}

        {/* ========================================================= */}
        {/* VIEW: BETA DEPLOYMENT & CNC TELEMETRY HUB */}
        {/* ========================================================= */}
        {activeTab === "beta-deployment" && (
          <BetaDeploymentPortal onClose={() => setActiveTab("dashboard")} />
        )}

        {/* ========================================================= */}
        {/* VIEW 1: SMC PORTFOLIO LOOKBOOK & PARTNER OPERATIONS (VAULT) */}
        {/* ========================================================= */}
        {activeTab === "vault" && (
          <div className="space-y-12 animate-fade-in">
            
            {/* LOOKBOOK STORY AVATARS SECTION */}
            <div className="w-full bg-white border border-neutral-150 rounded-xl py-6 px-6 overflow-x-auto shadow-sm">
              <div className="flex gap-6 justify-start md:justify-center items-center">
                <div className="flex flex-col items-center gap-1 pr-6 border-r border-neutral-150 flex-shrink-0">
                  <span className="font-serif text-sm font-semibold text-neutral-800">SMC Live</span>
                  <span className="text-[9px] font-mono tracking-widest text-gold uppercase font-bold">Stories</span>
                </div>
                {STORIES.map((story, idx) => (
                  <div 
                    key={story.id} 
                    onClick={() => {
                      setActiveStoryIndex(idx);
                      setStoryProgress(0);
                    }}
                    className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
                  >
                    <div className="w-16 h-16 rounded-full p-[2px] border-2 border-gold/30 group-hover:border-gold transition-all duration-300 relative">
                      {story.badge && (
                        <div className={`absolute -top-1 -right-1 z-20 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full font-mono tracking-wider ${story.badge === "LIVE" ? "bg-red-500 animate-pulse" : "bg-gold text-neutral-900"}`}>
                          {story.badge}
                        </div>
                      )}
                      <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-neutral-50">
                        <img 
                          alt={story.title} 
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                          src={story.image}
                        />
                      </div>
                    </div>
                    <span className="font-sans text-[10px] font-semibold tracking-wider text-neutral-500 group-hover:text-neutral-900 transition-colors uppercase">
                      {story.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* HERO INTRODUCTION */}
            <div className="text-center space-y-4 max-w-3xl mx-auto py-4">
              <span className="font-sans text-[10px] font-bold text-gold uppercase tracking-[0.25em] block">
                Featured Space
              </span>
              <h1 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light tracking-wide leading-tight">
                SMC Portfolio Lookbook
              </h1>
              <div className="w-12 h-[1px] bg-gold mx-auto"></div>
              <p className="font-sans text-sm text-neutral-500 leading-relaxed max-w-xl mx-auto">
                Discover the pinnacle of architectural stonework. A curated collection of prestigious global installations detailing the transformation of premium Quartz, Porcelain, and Natural Stone.
              </p>
            </div>

            {/* BEFORE & AFTER SLIDER CONTAINER */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-neutral-100 pb-4">
                <div className="space-y-1">
                  <h3 className="font-serif text-2xl text-[#1A1A1A] font-light">Precision &amp; Transformation</h3>
                  <p className="text-xs text-neutral-400">Belgravia Estate Master Suite renovation (ID: SMC-BE-242). Drag the slider handle to reveal the transition from raw site survey to finished Statuario sanctuary.</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-neutral-400">BEFORE: EXCAVATION SPEC</span>
                  <span className="w-1.5 h-[1px] bg-neutral-300"></span>
                  <span className="text-gold font-bold">AFTER: RE-INFORCED SLAB</span>
                </div>
              </div>

              {/* REACT BEFORE/AFTER DRAGGABLE SLIDER */}
              <div 
                ref={sliderRef}
                className="relative h-[300px] md:h-[480px] w-full rounded-lg overflow-hidden shadow-md select-none cursor-ew-resize bg-neutral-100 border border-neutral-100"
                onMouseDown={() => setIsResizing(true)}
                onTouchStart={() => setIsResizing(true)}
              >
                {/* Before Image (Bottom Layer) */}
                <img 
                  alt="Belgravia Estate Master Suite - Before Renovation"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none grayscale brightness-75"
                  src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80"
                />
                
                {/* Before Watermark */}
                <div className="absolute bottom-4 left-4 bg-[#1A1A1A]/80 backdrop-blur-xs px-3 py-1.5 rounded text-[10px] text-white font-mono uppercase tracking-widest border border-white/10 z-10">
                  BEFORE: RAW SURVEY
                </div>

                {/* After Image (Top Clipping Layer) */}
                <div 
                  className="absolute inset-0 h-full overflow-hidden transition-all duration-75 pointer-events-none border-r-2 border-gold/40"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img 
                    alt="Belgravia Estate Master Suite - Completed Luxury Marble Bath"
                    className="absolute inset-0 w-full h-full object-cover max-w-none"
                    style={{ width: sliderRef.current ? sliderRef.current.getBoundingClientRect().width : "100%" }}
                    src="https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80"
                  />
                  {/* After Watermark */}
                  <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded text-[10px] text-gold font-mono font-bold uppercase tracking-widest border border-gold/20 z-10 whitespace-nowrap">
                    AFTER: STATUARIO EXTRA (12mm)
                  </div>
                </div>

                {/* Draggable Slider Split Handle Button */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-gold z-20 cursor-ew-resize flex items-center justify-center pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div 
                    className="w-10 h-10 bg-white rounded-full border border-gold flex items-center justify-center cursor-ew-resize shadow-lg select-none hover:scale-105 active:scale-95 transition-all pointer-events-auto"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsResizing(true); }}
                    onTouchStart={(e) => { e.stopPropagation(); setIsResizing(true); }}
                  >
                    <span className="material-symbols-outlined text-gold text-lg font-bold">unfold_more</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CURATED GALLERY GRID (THE COVETED SELECTION) */}
            <div className="space-y-6 pt-4">
              <div className="border-b border-neutral-100 pb-4">
                <h3 className="font-serif text-2xl text-[#1A1A1A] font-light">The Curated Gallery</h3>
                <p className="text-xs text-neutral-400">Finest stone selections across the capital&apos;s most prestigious postcodes.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* CARD 1: Kensington Penthouse */}
                <div className="bg-[#FBFBFA] border border-neutral-100 rounded-lg overflow-hidden group flex flex-col justify-between shadow-xs">
                  <div className="space-y-4">
                    <div className="h-48 overflow-hidden relative">
                      <img 
                        alt="Kensington Penthouse - Emerald Quartzite installation" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80"
                      />
                      <div className="absolute top-3 left-3 bg-[#1A1A1A]/80 text-[9px] text-white font-mono px-2.5 py-1 rounded tracking-widest">
                        W8 LONDON
                      </div>
                    </div>
                    <div className="px-5 space-y-2">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-gold font-bold">
                        Emerald Quartzite (7.5 Mohs)
                      </span>
                      <h4 className="font-serif text-lg font-medium text-neutral-800">
                        Kensington Penthouse
                      </h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        A full kitchen slab wrapper featuring a continuous waterfall miter profile and under-lit quartzite splash panels.
                      </p>
                    </div>
                  </div>
                  <div className="p-5 pt-4">
                    <button 
                      onClick={() => setActiveCaseStudyModal("kensington")}
                      className="w-full text-center border border-neutral-200 hover:border-gold hover:text-gold text-xs font-semibold uppercase tracking-wider py-2.5 rounded transition-all duration-300"
                    >
                      VIEW CASE STUDY
                    </button>
                  </div>
                </div>

                {/* CARD 2: Mayfair Suite */}
                <div className="bg-[#FBFBFA] border border-neutral-100 rounded-lg overflow-hidden group flex flex-col justify-between shadow-xs">
                  <div className="space-y-4">
                    <div className="h-48 overflow-hidden relative">
                      <img 
                        alt="Mayfair Suite - Statuario Bookmatched Porcelain" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        src="https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80"
                      />
                      <div className="absolute top-3 left-3 bg-[#1A1A1A]/80 text-[9px] text-white font-mono px-2.5 py-1 rounded tracking-widest">
                        W1 LONDON
                      </div>
                    </div>
                    <div className="px-5 space-y-2">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-gold font-bold">
                        Statuario Extra (Porcelain)
                      </span>
                      <h4 className="font-serif text-lg font-medium text-neutral-800">
                        The Mayfair Suite
                      </h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        State-of-the-art book-matched sintered porcelain shower bay wraps with custom integrated linear drain mitering.
                      </p>
                    </div>
                  </div>
                  <div className="p-5 pt-4">
                    <button 
                      onClick={() => {
                        // Prepopulate quote calculator with Statuario Extra
                        const statuarioId = "statuario-extra";
                        handleUpdatePartField(activeEditingPartId, "materialId", statuarioId);
                        setActiveTab("estimator");
                        alert("Statuario Extra loaded into Quote Engine.");
                      }}
                      className="w-full text-center bg-[#1A1A1A] hover:bg-gold text-white text-xs font-semibold uppercase tracking-wider py-2.5 rounded transition-colors duration-300"
                    >
                      INQUIRE ABOUT DESIGN
                    </button>
                  </div>
                </div>

                {/* CARD 3: Chelsea Riverside */}
                <div className="bg-[#FBFBFA] border border-neutral-100 rounded-lg overflow-hidden group flex flex-col justify-between shadow-xs">
                  <div className="space-y-4">
                    <div className="h-48 overflow-hidden relative">
                      <img 
                        alt="Chelsea Riverside - Taj Mahal Quartzite kitchen island" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        src="https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=800&q=80"
                      />
                      <div className="absolute top-3 left-3 bg-[#1A1A1A]/80 text-[9px] text-white font-mono px-2.5 py-1 rounded tracking-widest">
                        SW3 LONDON
                      </div>
                    </div>
                    <div className="px-5 space-y-2">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-gold font-bold">
                        Taj Mahal (Quartzite)
                      </span>
                      <h4 className="font-serif text-lg font-medium text-neutral-800">
                        Chelsea Riverside
                      </h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Expansive bespoke island countertop featuring massive 80mm built-up mitered aprons and flush under-mount sink.
                      </p>
                    </div>
                  </div>
                  <div className="p-5 pt-4">
                    <button 
                      onClick={() => setActiveCaseStudyModal("chelsea")}
                      className="w-full text-center border border-neutral-200 hover:border-gold hover:text-gold text-xs font-semibold uppercase tracking-wider py-2.5 rounded transition-all duration-300"
                    >
                      FULL PROJECT GALLERY
                    </button>
                  </div>
                </div>

                {/* CARD 4: Knightsbridge Manor */}
                <div className="bg-[#FBFBFA] border border-neutral-100 rounded-lg overflow-hidden group flex flex-col justify-between shadow-xs">
                  <div className="space-y-4">
                    <div className="h-48 overflow-hidden relative">
                      <img 
                        alt="Knightsbridge Manor - Absolute Black and Bianco Carrara" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        src="https://images.unsplash.com/photo-1545464693-f1798a373343?auto=format&fit=crop&w=800&q=80"
                      />
                      <div className="absolute top-3 left-3 bg-[#1A1A1A]/80 text-[9px] text-white font-mono px-2.5 py-1 rounded tracking-widest">
                        SW1X LONDON
                      </div>
                    </div>
                    <div className="px-5 space-y-2">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-gold font-bold">
                        Absolute Black &amp; Carrara
                      </span>
                      <h4 className="font-serif text-lg font-medium text-neutral-800">
                        Knightsbridge Manor
                      </h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        High-contrast geometric entry vestibule floor utilizing water-jet miter cuts to combine calciferous marbles perfectly.
                      </p>
                    </div>
                  </div>
                  <div className="p-5 pt-4">
                    <button 
                      onClick={() => setActiveCaseStudyModal("knightsbridge")}
                      className="w-full text-center border border-neutral-200 hover:border-gold hover:text-gold text-xs font-semibold uppercase tracking-wider py-2.5 rounded transition-all duration-300"
                    >
                      DISCOVER MORE
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* OPERATIONAL INSIGHTS INTEGRATION (THE SYSTEM METRICS FOR TRADE PARTNERS) */}
            <div className="space-y-6 pt-6 border-t border-neutral-100">
              <div className="border-b border-neutral-100 pb-4">
                <h3 className="font-serif text-2xl text-[#1A1A1A] font-light">Partner Operations Board</h3>
                <p className="text-xs text-neutral-400">Real-time telemetry, recent fabrication pipelines, and structural thresholds.</p>
              </div>

              {/* QUICK STATS ROW */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div id="stat-card-projects" className="bg-[#FBFBFA] border border-neutral-100 p-5 rounded-lg">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest block mb-1">Active Pipeline</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-serif font-light text-[#1A1A1A]">{stats.totalProjects}</span>
                    <span className="text-xs text-neutral-500">Dossiers</span>
                  </div>
                  <div className="mt-3 flex items-center text-[10px] font-semibold text-neutral-400">
                    <FolderGit2 className="w-3.5 h-3.5 text-neutral-400 mr-1" /> Multi-project enabled
                  </div>
                </div>

                <div id="stat-card-quotes" className="bg-[#FBFBFA] border border-neutral-100 p-5 rounded-lg">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest block mb-1">Active Estimates</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-serif font-light text-gold">{stats.activeQuotes}</span>
                    <span className="text-xs text-neutral-500">Calculations</span>
                  </div>
                  <div className="mt-3 flex items-center text-[10px] font-semibold text-neutral-400">
                    <Clock className="w-3.5 h-3.5 text-gold mr-1" /> Dynamic yield models
                  </div>
                </div>

                <div id="stat-card-hardness" className="bg-[#FBFBFA] border border-neutral-100 p-5 rounded-lg">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest block mb-1">Hardness Mean</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-serif font-light text-[#1A1A1A]">{stats.avgHardness}</span>
                    <span className="text-xs text-neutral-500">Avg Mohs</span>
                  </div>
                  <div className="mt-3 flex items-center text-[10px] font-semibold text-neutral-400">
                    <Activity className="w-3.5 h-3.5 text-neutral-400 mr-1" /> High durability structures
                  </div>
                </div>

                <div id="stat-card-ai" className="bg-[#FBFBFA] border border-neutral-100 p-5 rounded-lg">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest block mb-1">AI Advisor Logs</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-serif font-light text-[#1A1A1A]">{chatMessages.length - 1}</span>
                    <span className="text-xs text-neutral-500">Consults</span>
                  </div>
                  <div className="mt-3 flex items-center text-[10px] font-semibold text-gold mr-1">
                    <Sparkles className="w-3.5 h-3.5 text-gold mr-1 animate-pulse" /> Gemini advisory linked
                  </div>
                </div>
              </div>

              {/* RECENT PIPELINE UPDATES & FABRICATION LAWS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Recent Projects */}
                <div className="lg:col-span-7 bg-[#FBFBFA] border border-neutral-100 rounded-lg p-6 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                    <h4 className="font-serif text-lg font-medium text-[#1A1A1A]">Recent Project Pipelines</h4>
                    <button
                      onClick={() => setActiveTab("projects")}
                      className="text-xs font-semibold text-gold hover:text-[#1A1A1A] flex items-center gap-1 transition-colors"
                    >
                      View All Pipelines <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {projects.slice(0, 3).map((proj) => (
                      <div
                        key={proj.id}
                        className="p-4 border border-neutral-100 hover:border-neutral-200 rounded bg-white hover:shadow-xs transition-all flex justify-between items-start"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">
                            Created {proj.createdAt}
                          </span>
                          <h5 className="font-serif font-medium text-sm text-neutral-800">{proj.name}</h5>
                          <p className="text-xs text-neutral-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-neutral-400">location_on</span>
                            {proj.address}
                          </p>
                        </div>

                        <div className="text-right space-y-2">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${
                            proj.status === "Completed"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : proj.status === "Fabrication"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                            {proj.status}
                          </span>
                          <div className="text-xs text-neutral-400">
                            {proj.estimates.length} Slab part(s)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Fabrication laws & Callouts */}
                <div className="lg:col-span-5 bg-[#FBFBFA] border border-neutral-100 rounded-lg p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="font-serif text-lg font-medium text-[#1A1A1A] pb-2 border-b border-neutral-100 flex items-center gap-2">
                      <Info className="w-4 h-4 text-gold" /> Critical Fabrication Guides
                    </h4>
                    <ul className="space-y-3.5">
                      <li className="text-xs text-neutral-600 flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 shrink-0"></span>
                        <div>
                          <strong className="text-neutral-800">Silica Wet-Cutting Rule:</strong> All high-quartz materials (7 Mohs) require localized water jets to completely suppress hazardous dust levels.
                        </div>
                      </li>
                      <li className="text-xs text-neutral-600 flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 shrink-0"></span>
                        <div>
                          <strong className="text-neutral-800">Porcelain Stress Relief:</strong> Sintered porcelain slabs are subject to massive internal tension. Must trim 1cm off all borders prior to custom cutout profiles.
                        </div>
                      </li>
                      <li className="text-xs text-neutral-600 flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 shrink-0"></span>
                        <div>
                          <strong className="text-neutral-800">Natural Acid Etching:</strong> Bianco Carrara is highly calciferous and soft (3.5 Mohs). Double solvent sealer required to guard against citric acid etching.
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white border border-neutral-100 p-4 rounded mt-4 text-xs shadow-xs">
                    <div className="flex gap-2 text-gold font-semibold mb-1">
                      <Sparkles className="w-3.5 h-3.5" /> Need instant custom specs?
                    </div>
                    <p className="text-neutral-500 mb-2">Ask our AI Engineer about cutting speeds, water volumes, or adhesive color matches.</p>
                    <button 
                      onClick={() => setActiveTab("ai-support")}
                      className="text-xs font-bold text-[#1A1A1A] hover:text-gold flex items-center gap-1 transition-colors"
                    >
                      Open AI Advisory <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* ========================================================= */}
            {/* INTERACTIVE CASE STUDY OVERLAY MODALS */}
            {/* ========================================================= */}
            {activeCaseStudyModal && (
              <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in">
                <div className="bg-white border border-neutral-200 rounded-lg max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl relative overflow-y-auto max-h-[90vh]">
                  
                  {/* Close icon button */}
                  <button 
                    onClick={() => setActiveCaseStudyModal(null)}
                    className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-2 rounded-full transition-colors animate-pulse"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>

                  {/* Kensington Penthouse Detail */}
                  {activeCaseStudyModal === "kensington" && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-gold uppercase tracking-[0.2em] font-bold">W8 LONDON • PROJECT DOSSIER</span>
                        <h3 className="font-serif text-3xl font-light text-neutral-800">Kensington Penthouse</h3>
                      </div>
                      
                      <img 
                        src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80" 
                        alt="Kensington kitchen detail" 
                        className="w-full h-56 object-cover rounded" 
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-neutral-600 leading-relaxed">
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">Technical Brief</h4>
                          <p>
                            An ultra-premium mitered design using rare **Emerald Quartzite**. Because this natural mineral has a hardness rating of **7.5 Mohs**, typical bridge saws undergo high tool fatigue. We executed this layout at a dialed feed rate of **0.8m/min** under **continuous flood lubrication**.
                          </p>
                          <p>
                            All join lines are color-matched using bespoke tinted epoxy resin to ensure a seamless monolithic transition across the horizontal to vertical waterfall returns.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">Engineering Specs</h4>
                          <div className="space-y-2 font-mono text-[11px] bg-[#FBFBFA] p-3 rounded border border-neutral-100">
                            <div className="flex justify-between"><span>MATERIAL:</span><strong className="text-neutral-800">Quartzite</strong></div>
                            <div className="flex justify-between"><span>THICKNESS:</span><strong className="text-neutral-800">20mm (Mitered to 40mm)</strong></div>
                            <div className="flex justify-between"><span>MOHS RATING:</span><strong className="text-neutral-800">7.5 / 10</strong></div>
                            <div className="flex justify-between"><span>SILICA LEVEL:</span><strong className="text-neutral-800">Extremely High</strong></div>
                            <div className="flex justify-between"><span>EDGE METHOD:</span><strong className="text-neutral-800">Mitered Apron</strong></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chelsea Riverside Detail */}
                  {activeCaseStudyModal === "chelsea" && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-gold uppercase tracking-[0.2em] font-bold">SW3 LONDON • PROJECT DOSSIER</span>
                        <h3 className="font-serif text-3xl font-light text-neutral-800">Chelsea Riverside Suite</h3>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 h-36">
                        <img src="https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=400&q=80" alt="Chelsea 1" className="w-full h-full object-cover rounded" />
                        <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80" alt="Chelsea 2" className="w-full h-full object-cover rounded" />
                        <img src="https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=400&q=80" alt="Chelsea 3" className="w-full h-full object-cover rounded" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-neutral-600 leading-relaxed">
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">Bespoke Island Crafting</h4>
                          <p>
                            Featuring an exquisite **Taj Mahal Quartzite** central layout. Built with massive **80mm mitered borders** to project an architectural weight of over 450 kilograms. To prevent catastrophic failure on raw overhang structures, steel support channels were countersunk directly into the support substrate.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">Mechanical Thresholds</h4>
                          <div className="space-y-2 font-mono text-[11px] bg-[#FBFBFA] p-3 rounded border border-neutral-100">
                            <div className="flex justify-between"><span>SUBSTRATE:</span><strong className="text-neutral-800">Sub-Steel Core</strong></div>
                            <div className="flex justify-between"><span>JOINERY SEAL:</span><strong className="text-neutral-800">UV-Stable Polyurethane</strong></div>
                            <div className="flex justify-between"><span>OVERHANG:</span><strong className="text-neutral-800">320mm (Supported)</strong></div>
                            <div className="flex justify-between"><span>WEIGHT ESTIMATE:</span><strong className="text-neutral-800">125 kg/sqm</strong></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Knightsbridge Manor Detail */}
                  {activeCaseStudyModal === "knightsbridge" && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-gold uppercase tracking-[0.2em] font-bold">SW1X LONDON • PROJECT DOSSIER</span>
                        <h3 className="font-serif text-3xl font-light text-neutral-800">Knightsbridge Manor Floor</h3>
                      </div>
                      
                      <img 
                        src="https://images.unsplash.com/photo-1545464693-f1798a373343?auto=format&fit=crop&w=1200&q=80" 
                        alt="Knightsbridge marble flooring" 
                        className="w-full h-56 object-cover rounded" 
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-neutral-600 leading-relaxed">
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">Aesthetic Contrast</h4>
                          <p>
                            A complex geometric pattern composed of high-density **Absolute Black Granite** combined with classical **Bianco Carrara Marble**. Since granite is a hard mineral (6.5 Mohs) and marble is relatively soft (3.5 Mohs), grinding the surface level required precision dual-phase diamond abrasives.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">Water-Jet Tolerances</h4>
                          <div className="space-y-2 font-mono text-[11px] bg-[#FBFBFA] p-3 rounded border border-neutral-100">
                            <div className="flex justify-between"><span>CUTTING METHOD:</span><strong className="text-neutral-800">Water-Jet (±0.1mm)</strong></div>
                            <div className="flex justify-between"><span>SURFACE PLANES:</span><strong className="text-neutral-800">Calibrated Dual-Density</strong></div>
                            <div className="flex justify-between"><span>ABRASIVE GRADE:</span><strong className="text-neutral-800">Diamond Gritt 1500+</strong></div>
                            <div className="flex justify-between"><span>SEALER INDEX:</span><strong className="text-neutral-800">Maximum Wet-Guard</strong></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Modal Footer Close Button */}
                  <div className="pt-4 flex justify-end">
                    <button 
                      onClick={() => setActiveCaseStudyModal(null)}
                      className="bg-[#1A1A1A] hover:bg-gold text-white text-xs font-semibold uppercase tracking-wider px-5 py-2.5 rounded transition-colors"
                    >
                      Close Dossier
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: MATERIAL & SPEC CATALOG */}
        {/* ========================================================= */}
        {activeTab === "catalog" && (
          <ErrorBoundary fallbackTitle="Catalog View Temporary Error">
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-serif text-3xl text-[#1A1A1A] font-medium">Stone &amp; Surface Catalog</h3>
                <p className="text-sm text-neutral-500">Explore technical specifications, mechanical properties, and warehouse inventory thresholds vs project demand.</p>
              </div>

              {/* SEARCH & SORT CONTROLS */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="catalog-search-input"
                    type="text"
                    placeholder="Search specifications or material..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded pl-9 pr-4 py-2 text-xs transition-all"
                  />
                </div>

                {/* SORT DROPDOWN */}
                <div className="relative flex items-center shrink-0">
                  <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400 absolute left-3 pointer-events-none" />
                  <select
                    id="catalog-sort-select"
                    value={catalogSort}
                    onChange={(e) => setCatalogSort(e.target.value as any)}
                    className="bg-white border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded pl-8 pr-8 py-2 text-xs font-medium text-neutral-700 transition-all appearance-none cursor-pointer shadow-2xs hover:border-neutral-300"
                  >
                    <option value="featured">Sort by: Featured</option>
                    <option value="mohs-desc">Hardness: High to Low (Mohs)</option>
                    <option value="mohs-asc">Hardness: Low to High (Mohs)</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 pointer-events-none" />
                </div>

                {/* SHOW ONLY FAVORITES TOGGLE SWITCH */}
                <button
                  id="catalog-favorites-toggle"
                  type="button"
                  onClick={() => toggleMaterialFilter("Favorites")}
                  className={`text-xs font-semibold px-3.5 py-2 rounded transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                    selectedMaterialFilters.includes("Favorites")
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs font-bold"
                      : "bg-white text-rose-700 border-rose-200/90 hover:bg-rose-50 hover:border-rose-300 shadow-2xs"
                  }`}
                  title={selectedMaterialFilters.includes("Favorites") ? "Clear Favorites Filter" : "Filter Favorites"}
                >
                  <Heart className={`w-3.5 h-3.5 ${selectedMaterialFilters.includes("Favorites") ? "fill-white text-white" : "fill-rose-500 text-rose-500"}`} />
                  <span>Favorites</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    selectedMaterialFilters.includes("Favorites") ? "bg-white text-rose-600" : "bg-rose-100 text-rose-700"
                  }`}>
                    {favoriteMaterialIds.length}
                  </span>
                </button>

                {/* COMPARE MATERIALS TRIGGER BUTTON */}
                <button
                  id="catalog-compare-modal-trigger"
                  onClick={() => setShowCompareModal(true)}
                  className="bg-[#1A1A1A] hover:bg-gold text-white text-xs font-semibold px-3.5 py-2 rounded transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer font-sans"
                >
                  <Columns className="w-3.5 h-3.5 text-gold" />
                  Compare Specs
                </button>
              </div>
            </div>

            {/* INVENTORY & DEMAND THRESHOLD WARNING BANNER */}
            {exceededMaterialsCount > 0 && (
              <div className="bg-red-50/90 border border-red-200 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                      Low Inventory Threshold Warning
                      <span className="bg-red-600 text-white text-[10px] font-mono px-2 py-0.5 rounded-full">{exceededMaterialsCount} Material(s)</span>
                    </h4>
                    <p className="text-xs text-red-700 leading-relaxed mt-0.5">
                      Calculated project demand exceeds available warehouse stock for <strong className="font-semibold">{exceededMaterialsCount} material(s)</strong>. Immediate restocking or slab reservations are recommended.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!selectedMaterialFilters.includes("Demand Exceeded")) {
                      toggleMaterialFilter("Demand Exceeded");
                    }
                    setIsFilterDrawerOpen(true);
                  }}
                  className="shrink-0 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3.5 py-2 rounded transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5" /> View Shortage Materials ({exceededMaterialsCount})
                </button>
              </div>
            )}

            {/* FILTER TRIGGER BAR & MULTI-SELECT ACTIVE CHIPS */}
            <div className="bg-[#1A1A1A] border border-white/10 rounded-lg p-3 md:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
              <div className="flex flex-wrap items-center gap-2">
                {/* PRIMARY SLIDE-OUT FILTER DRAWER TRIGGER BUTTON */}
                <button
                  id="open-filter-drawer-btn"
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className={`px-4 py-2.5 rounded-md font-semibold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer border ${
                    selectedMaterialFilters.length > 0
                      ? "bg-gold text-black border-gold shadow-[0_0_15px_rgba(212,175,55,0.3)] font-bold"
                      : "bg-[#252525] hover:bg-[#303030] text-white border-white/20 hover:border-gold/50"
                  }`}
                >
                  <Sliders className="w-4 h-4 text-gold" />
                  <span>Filter Inventory</span>
                  {selectedMaterialFilters.length > 0 ? (
                    <span className="bg-black text-gold text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-gold/30">
                      {selectedMaterialFilters.length} Active
                    </span>
                  ) : (
                    <span className="bg-white/10 text-neutral-300 text-[10px] font-mono px-1.5 py-0.5 rounded">
                      Drawer
                    </span>
                  )}
                </button>

                {/* ACTIVE FILTER CHIPS DISPLAY */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedMaterialFilters.length === 0 ? (
                    <span className="text-xs text-neutral-400 pl-2 font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      All Categories ({filteredMaterials.length} Slabs Available)
                    </span>
                  ) : (
                    <>
                      {selectedMaterialFilters.map((filter) => {
                        const isFavorites = filter === "Favorites";
                        const isExceeded = filter === "Demand Exceeded";
                        const isAvailable = filter === "Available Inventory";
                        const isTransit = filter === "Awaiting Transit";
                        const isDemand = filter === "High Demand";

                        let badgeStyle = "bg-[#2A2A2A] text-neutral-200 border-neutral-700 hover:border-neutral-500";
                        if (isFavorites) badgeStyle = "bg-rose-950/80 text-rose-200 border-rose-800/80 hover:bg-rose-900";
                        else if (isExceeded) badgeStyle = "bg-red-950/80 text-red-200 border-red-800/80 hover:bg-red-900";
                        else if (isAvailable) badgeStyle = "bg-emerald-950/80 text-emerald-200 border-emerald-800/80 hover:bg-emerald-900";
                        else if (isTransit) badgeStyle = "bg-sky-950/80 text-sky-200 border-sky-800/80 hover:bg-sky-900";
                        else if (isDemand) badgeStyle = "bg-amber-950/80 text-amber-200 border-amber-800/80 hover:bg-amber-900";

                        return (
                          <span
                            key={filter}
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded border transition-all ${badgeStyle}`}
                          >
                            {isFavorites && <Heart className="w-3 h-3 fill-rose-400 text-rose-400" />}
                            {isExceeded && <AlertTriangle className="w-3 h-3 text-red-400" />}
                            {isAvailable && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                            {isTransit && <Clock className="w-3 h-3 text-sky-400" />}
                            {isDemand && <Activity className="w-3 h-3 text-amber-400" />}
                            <span>{filter}</span>
                            <span className="text-[10px] opacity-75 font-mono">({materialFilterCounts[filter] ?? 0})</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMaterialFilter(filter);
                              }}
                              className="hover:bg-white/20 p-0.5 rounded-full transition-colors cursor-pointer ml-0.5"
                              title={`Remove ${filter} filter`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}

                      <button
                        onClick={clearAllMaterialFilters}
                        className="text-xs text-neutral-400 hover:text-gold transition-colors underline decoration-dotted underline-offset-4 cursor-pointer px-2 py-1 font-mono"
                      >
                        Clear All
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* RESULTS COUNT INDICATOR */}
              <div className="text-xs text-neutral-400 font-mono flex items-center justify-between md:justify-end gap-2 border-t md:border-t-0 border-white/10 pt-2 md:pt-0">
                <span>Showing <strong className="text-gold font-bold">{filteredMaterials.length}</strong> of {MATERIALS_CATALOG.length} Slabs</span>
              </div>
            </div>

            {/* MOBILE-OPTIMIZED SLIDE-OUT FILTER DRAWER */}
            {isFilterDrawerOpen && (
              <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fade-in">
                {/* BACKDROP OVERLAY */}
                <div
                  className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
                  onClick={() => setIsFilterDrawerOpen(false)}
                />

                {/* DRAWER CONTAINER */}
                <div className="relative w-full sm:max-w-md bg-[#131313] text-white h-full shadow-2xl border-l border-gold/30 flex flex-col z-50 overflow-hidden animate-slide-in-right">
                  {/* DRAWER HEADER */}
                  <div className="p-5 border-b border-white/10 bg-[#1A1A1A] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/40 flex items-center justify-center shrink-0">
                        <Sliders className="w-5 h-5 text-gold" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                            Vault Inventory Filters
                          </h3>
                          {selectedMaterialFilters.length > 0 && (
                            <span className="bg-gold text-black text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                              {selectedMaterialFilters.length} Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Select multiple categories to filter live slabs
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsFilterDrawerOpen(false)}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* DRAWER SCROLLABLE CONTENT */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* QUICK SELECTION STATUS BAR */}
                    <div className="flex items-center justify-between bg-[#1e1e1e] border border-white/10 p-3 rounded-lg text-xs">
                      <span className="text-neutral-300 font-mono">
                        {selectedMaterialFilters.length === 0
                          ? "All categories active"
                          : `${selectedMaterialFilters.length} category filter(s) applied`}
                      </span>
                      {selectedMaterialFilters.length > 0 && (
                        <button
                          onClick={clearAllMaterialFilters}
                          className="text-gold hover:underline text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" /> Reset All
                        </button>
                      )}
                    </div>

                    {/* CATEGORY GROUP 1: AVAILABILITY & SUPPLY CHAIN */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5 font-mono">
                          <Truck className="w-4 h-4 text-gold" /> Supply Chain & Inventory Status
                        </h4>
                        <span className="text-[10px] text-neutral-400 font-mono">Select Multiple</span>
                      </div>

                      <div className="space-y-2">
                        {[
                          {
                            id: "Available Inventory",
                            title: "Available Inventory",
                            desc: "In warehouse & ready for cut",
                            icon: CheckCircle,
                            color: "text-emerald-400",
                            activeBg: "bg-emerald-950/60 border-emerald-500 text-emerald-200",
                            count: materialFilterCounts["Available Inventory"],
                          },
                          {
                            id: "Awaiting Transit",
                            title: "Awaiting Transit",
                            desc: "En route shipments from quarry/factory",
                            icon: Clock,
                            color: "text-sky-400",
                            activeBg: "bg-sky-950/60 border-sky-500 text-sky-200",
                            count: materialFilterCounts["Awaiting Transit"],
                          },
                          {
                            id: "High Demand",
                            title: "High Demand",
                            desc: "Active project reservations & quote demand",
                            icon: Activity,
                            color: "text-amber-400",
                            activeBg: "bg-amber-950/60 border-amber-500 text-amber-200",
                            count: materialFilterCounts["High Demand"],
                          },
                          {
                            id: "Low Inventory",
                            title: "Low Inventory Alert",
                            desc: "Warehouse stock at or below 30 sq ft",
                            icon: AlertTriangle,
                            color: "text-amber-500",
                            activeBg: "bg-amber-950/60 border-amber-600 text-amber-200",
                            count: materialFilterCounts["Low Inventory"],
                          },
                          {
                            id: "Demand Exceeded",
                            title: "Demand Exceeded Shortage",
                            desc: "Calculated project demand exceeds stock",
                            icon: AlertTriangle,
                            color: "text-red-400",
                            activeBg: "bg-red-950/60 border-red-500 text-red-200",
                            count: materialFilterCounts["Demand Exceeded"],
                          },
                        ].map((item) => {
                          const isSelected = selectedMaterialFilters.includes(item.id);
                          const IconComp = item.icon;
                          return (
                            <div
                              key={item.id}
                              onClick={() => toggleMaterialFilter(item.id)}
                              className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? `${item.activeBg} shadow-md ring-1 ring-gold/40`
                                  : "bg-[#1A1A1A] border-white/10 hover:border-white/30 text-neutral-300"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                    isSelected ? "bg-white/10" : "bg-black/40"
                                  }`}
                                >
                                  <IconComp className={`w-4 h-4 ${item.color}`} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white">{item.title}</span>
                                  </div>
                                  <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                                    {item.desc}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                                    isSelected
                                      ? "bg-gold text-black"
                                      : "bg-white/10 text-neutral-300"
                                  }`}
                                >
                                  {item.count}
                                </span>
                                <div
                                  className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                                    isSelected
                                      ? "bg-gold border-gold text-black"
                                      : "border-white/30 bg-black/20"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* CATEGORY GROUP 2: MATERIAL CLASS */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5 font-mono">
                          <Layers className="w-4 h-4 text-gold" /> Material Composition & Class
                        </h4>
                        <span className="text-[10px] text-neutral-400 font-mono">Select Multiple</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {[
                          {
                            id: "Quartz",
                            title: "Engineered Quartz",
                            desc: "93% natural quartz crystal composition",
                            count: materialFilterCounts["Quartz"],
                          },
                          {
                            id: "Porcelain",
                            title: "Sintered Porcelain",
                            desc: "1200°C fired ultra-compact porcelain",
                            count: materialFilterCounts["Porcelain"],
                          },
                          {
                            id: "Natural Stone",
                            title: "Natural Stone Slabs",
                            desc: "Calacatta marble, quartzite & granite",
                            count: materialFilterCounts["Natural Stone"],
                          },
                        ].map((item) => {
                          const isSelected = selectedMaterialFilters.includes(item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => toggleMaterialFilter(item.id)}
                              className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? "bg-gold/10 border-gold text-white shadow-md ring-1 ring-gold/40"
                                  : "bg-[#1A1A1A] border-white/10 hover:border-white/30 text-neutral-300"
                              }`}
                            >
                              <div>
                                <span className="text-xs font-bold text-white block">{item.title}</span>
                                <span className="text-[11px] text-neutral-400 block mt-0.5">
                                  {item.desc}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                                    isSelected ? "bg-gold text-black" : "bg-white/10 text-neutral-300"
                                  }`}
                                >
                                  {item.count}
                                </span>
                                <div
                                  className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                                    isSelected
                                      ? "bg-gold border-gold text-black"
                                      : "border-white/30 bg-black/20"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* CATEGORY GROUP 3: FAVORITES & SAVED */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 font-mono">
                          <Heart className="w-4 h-4 fill-rose-400 text-rose-400" /> Saved Vault Selections
                        </h4>
                      </div>

                      <div
                        onClick={() => toggleMaterialFilter("Favorites")}
                        className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                          selectedMaterialFilters.includes("Favorites")
                            ? "bg-rose-950/60 border-rose-500 text-rose-200 shadow-md ring-1 ring-rose-500/40"
                            : "bg-[#1A1A1A] border-white/10 hover:border-white/30 text-neutral-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                            <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">Bookmarked Favorites</span>
                            <span className="text-[11px] text-neutral-400 block mt-0.5">
                              Slabs added to your personal favorite list
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                              selectedMaterialFilters.includes("Favorites")
                                ? "bg-rose-600 text-white"
                                : "bg-white/10 text-neutral-300"
                            }`}
                          >
                            {favoriteMaterialIds.length}
                          </span>
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                              selectedMaterialFilters.includes("Favorites")
                                ? "bg-rose-600 border-rose-600 text-white"
                                : "border-white/30 bg-black/20"
                            }`}
                          >
                            {selectedMaterialFilters.includes("Favorites") && (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DRAWER FOOTER */}
                  <div className="p-5 border-t border-white/10 bg-[#1A1A1A] space-y-3 shrink-0">
                    <div className="flex items-center justify-between text-xs text-neutral-300 font-mono">
                      <span>Matching Slabs:</span>
                      <span className="font-bold text-white text-sm">
                        {filteredMaterials.length} of {MATERIALS_CATALOG.length} Materials
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={clearAllMaterialFilters}
                        className="w-full bg-[#2A2A2A] hover:bg-[#353535] text-neutral-300 text-xs font-semibold py-3 px-4 rounded-md transition-colors cursor-pointer border border-white/10 text-center"
                      >
                        Reset Filters
                      </button>
                      <button
                        onClick={() => setIsFilterDrawerOpen(false)}
                        className="w-full bg-gold hover:bg-amber-400 text-black text-xs font-bold py-3 px-4 rounded-md transition-all shadow-md cursor-pointer text-center"
                      >
                        Apply ({filteredMaterials.length})
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GRID OF SAMPLES AND TECHNICAL SPECIFICATIONS PANEL */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: List of Materials with Inventory Threshold Status */}
              <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMaterials.map((mat) => {
                  const isSelected = selectedMaterial?.id === mat.id;
                  const currentStock = materialsStock[mat.id] ?? 0;
                  const demandInfo = materialDemandMap[mat.id] || { demandSqFt: 0, projectCount: 0, projectsList: [] };
                  const demandSqFt = demandInfo.demandSqFt;
                  const isExceeded = demandSqFt > currentStock;
                  const shortageSqFt = isExceeded ? (demandSqFt - currentStock) : 0;
                  const usagePct = currentStock > 0 ? Math.min(100, Math.round((demandSqFt / currentStock) * 100)) : (demandSqFt > 0 ? 100 : 0);

                  return (
                    <div
                      key={mat.id}
                      onClick={() => setSelectedMaterial(mat)}
                      className={`cursor-pointer border p-5 rounded-lg transition-all flex flex-col justify-between h-64 bg-white relative overflow-hidden group ${
                        isSelected
                          ? isExceeded
                            ? "ring-2 ring-red-500 border-transparent shadow-md"
                            : "ring-2 ring-gold border-transparent shadow-sm"
                          : isExceeded
                          ? "border-red-300 bg-red-50/20 hover:border-red-400 shadow-xs"
                          : "border-neutral-200 hover:border-neutral-400 shadow-xs"
                      }`}
                    >
                      {/* TOP RIGHT CORNER HEART FAVORITE BUTTON */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteMaterial(mat.id);
                        }}
                        className={`absolute top-3 right-3 z-20 p-1.5 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
                          favoriteMaterialIds.includes(mat.id)
                            ? "bg-white text-rose-600 border-rose-300 shadow-sm"
                            : "bg-white/90 backdrop-blur-xs text-neutral-400 border-neutral-200 hover:border-rose-300 hover:text-rose-500 hover:bg-white shadow-2xs"
                        }`}
                        title={favoriteMaterialIds.includes(mat.id) ? "Remove from Favorites" : "Save to Favorites"}
                      >
                        <Heart className={`w-4 h-4 ${favoriteMaterialIds.includes(mat.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                      </button>

                      {/* Visual Texture Simulative Overlay */}
                      {mat.hasSpecialImage ? (
                        <div className="absolute top-0 right-0 w-32 h-full opacity-60 group-hover:opacity-75 transition-opacity">
                          <img
                            src="/src/assets/images/luxury_countertop_1784523702433.jpg"
                            alt="Veining preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div 
                          className="absolute top-0 right-0 w-24 h-full opacity-20 pointer-events-none"
                          style={{ backgroundImage: mat.bgStyle }}
                        />
                      )}

                      <div className="space-y-2.5 z-10">
                        <div className="flex justify-between items-start gap-2 pr-8">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider ${
                            mat.class === "Quartz"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : mat.class === "Porcelain"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {mat.class}
                          </span>
                          
                          <div className="flex items-center gap-1.5">
                            {/* FAVORITE BUTTON */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavoriteMaterial(mat.id);
                              }}
                              className={`p-1 rounded border transition-colors flex items-center justify-center cursor-pointer ${
                                favoriteMaterialIds.includes(mat.id)
                                  ? "bg-rose-50 text-rose-600 border-rose-300 shadow-2xs font-bold"
                                  : "bg-white text-neutral-400 border-neutral-200 hover:border-rose-300 hover:text-rose-500"
                              }`}
                              title={favoriteMaterialIds.includes(mat.id) ? "Remove from Favorites" : "Save to Favorites"}
                            >
                              <Heart className={`w-3.5 h-3.5 ${favoriteMaterialIds.includes(mat.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                            </button>

                            {/* COMPARE BUTTON */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCompareWithMaterial(mat.id);
                              }}
                              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                                compareMaterialAId === mat.id || compareMaterialBId === mat.id
                                  ? "bg-gold text-white border-gold shadow-2xs"
                                  : "bg-white text-neutral-600 border-neutral-200 hover:border-gold hover:text-gold"
                              }`}
                              title="Compare side-by-side"
                            >
                              <Columns className="w-3 h-3" />
                              {compareMaterialAId === mat.id ? "A" : compareMaterialBId === mat.id ? "B" : "Compare"}
                            </button>

                            {/* INVENTORY THRESHOLD INDICATOR BADGE */}
                            {isExceeded ? (
                              <span className="bg-red-600 text-white font-mono text-[9px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1 shadow-xs animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-white" />
                                SHORTAGE (-{shortageSqFt.toFixed(1)} sq ft)
                              </span>
                            ) : currentStock <= 20 ? (
                              <span className="bg-amber-500 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                <Info className="w-3 h-3 text-white" />
                                LOW STOCK
                              </span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[9px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                IN STOCK
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-baseline">
                          <h4 className="font-serif text-lg font-medium text-[#1A1A1A] leading-tight max-w-[70%]">
                            {mat.name}
                          </h4>
                          <span className="text-xs font-bold text-neutral-800">Price on Application</span>
                        </div>
                      </div>

                      {/* INVENTORY VS PROJECT DEMAND THRESHOLD INDICATOR METER */}
                      <div className="z-10 mt-3 pt-3 border-t border-neutral-100 space-y-2">
                        <div className="flex justify-between items-center text-[11px] font-mono">
                          <span className="text-neutral-500">
                            Demand: <strong className={isExceeded ? "text-red-600 font-bold" : "text-neutral-800"}>{demandSqFt.toFixed(1)} sq ft</strong>
                          </span>
                          <span className="text-neutral-500">
                            Stock: <strong className="text-neutral-800">{currentStock} sq ft</strong>
                          </span>
                        </div>

                        {/* Progress Meter Bar */}
                        <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden relative">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isExceeded
                                ? "bg-red-600 animate-pulse"
                                : usagePct > 70
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${isExceeded ? 100 : usagePct}%` }}
                          />
                        </div>

                        {/* Bottom Status text */}
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-neutral-400 font-sans">
                            {demandInfo.projectCount > 0 ? `${demandInfo.projectCount} project(s) assigned` : "No active project demand"}
                          </span>
                          {isExceeded ? (
                            <span className="text-red-600 font-bold font-mono">
                              Exceeds stock by {shortageSqFt.toFixed(1)} sq ft
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium font-mono">
                              {(currentStock - demandSqFt).toFixed(1)} sq ft buffer
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredMaterials.length === 0 && (
                  <div className="col-span-full py-12 px-6 text-center text-neutral-500 bg-white border border-neutral-200 rounded-lg space-y-3">
                    <Heart className="w-8 h-8 text-rose-300 mx-auto" />
                    <p className="text-xs font-medium">
                      {selectedMaterialFilters.includes("Favorites")
                        ? "No materials have been saved to your Favorites yet."
                        : "No materials matched your search or threshold filter parameters."}
                    </p>
                    {selectedMaterialFilters.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllMaterialFilters}
                        className="px-3.5 py-1.5 bg-[#1A1A1A] hover:bg-gold text-white text-xs font-semibold rounded transition-colors shadow-2xs cursor-pointer"
                      >
                        Reset All Filters ({MATERIALS_CATALOG.length} Slabs)
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Selected Material Detailed Engineering Specs & Inventory Threshold Manager */}
              {selectedMaterial && (() => {
                const selStock = materialsStock[selectedMaterial.id] ?? 0;
                const selDemandInfo = materialDemandMap[selectedMaterial.id] || { demandSqFt: 0, projectCount: 0, projectsList: [] };
                const selDemandSqFt = selDemandInfo.demandSqFt;
                const selIsExceeded = selDemandSqFt > selStock;
                const selShortageSqFt = selIsExceeded ? (selDemandSqFt - selStock) : 0;
                const selBufferSqFt = Math.max(0, selStock - selDemandSqFt);

                return (
                  <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-lg p-6 md:p-8 space-y-6 sticky top-28 self-start shadow-xs">
                    
                    {/* Detailed Visualizer header */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono uppercase tracking-widest text-gold font-bold">
                              Engineering Specsheet
                            </span>
                            {favoriteMaterialIds.includes(selectedMaterial.id) && (
                              <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Heart className="w-3 h-3 fill-rose-500 text-rose-500" /> Saved Favorite
                              </span>
                            )}
                          </div>
                          <h3 className="font-serif text-2xl font-medium text-[#1A1A1A]">
                            {selectedMaterial.name}
                          </h3>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="font-mono text-xl font-bold text-neutral-800">
                            Price on Application
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleFavoriteMaterial(selectedMaterial.id)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                              favoriteMaterialIds.includes(selectedMaterial.id)
                                ? "bg-rose-50 text-rose-600 border-rose-300 hover:bg-rose-100 font-bold"
                                : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-rose-300 hover:text-rose-600"
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${favoriteMaterialIds.includes(selectedMaterial.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                            {favoriteMaterialIds.includes(selectedMaterial.id) ? "Saved" : "Favorite"}
                          </button>
                        </div>
                      </div>

                      {/* Slab Visualizer */}
                      <div className="h-44 w-full rounded border border-neutral-200 relative overflow-hidden flex items-center justify-center">
                        {selectedMaterial.hasSpecialImage ? (
                          <img
                            src="/src/assets/images/luxury_countertop_1784523702433.jpg"
                            alt="Calacatta Gold"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80";
                            }}
                          />
                        ) : (
                          <div 
                            className="absolute inset-0 opacity-80" 
                            style={{ backgroundImage: selectedMaterial.bgStyle }}
                          />
                        )}
                        
                        {/* Simulative Texture Tags */}
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2 py-1 rounded text-[10px] font-mono border border-neutral-200">
                          Slab Texture Preview
                        </div>
                      </div>
                    </div>

                    {/* DETAILED INVENTORY THRESHOLD MANAGER CARD */}
                    <div className={`p-4 rounded-lg border space-y-4 transition-all ${
                      selIsExceeded
                        ? "bg-red-50/90 border-red-200"
                        : selStock <= 20
                        ? "bg-amber-50/90 border-amber-200"
                        : "bg-emerald-50/70 border-emerald-200"
                    }`}>
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          {selIsExceeded ? (
                            <>
                              <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
                              <span className="text-red-900">CRITICAL STOCK SHORTAGE ALERT</span>
                            </>
                          ) : selStock <= 20 ? (
                            <>
                              <Info className="w-4 h-4 text-amber-600" />
                              <span className="text-amber-900">LOW WAREHOUSE STOCK</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              <span className="text-emerald-900">INVENTORY COVERAGE CONFIRMED</span>
                            </>
                          )}
                        </h4>
                      </div>

                      <p className={`text-xs leading-relaxed ${
                        selIsExceeded ? "text-red-800" : selStock <= 20 ? "text-amber-800" : "text-emerald-800"
                      }`}>
                        {selIsExceeded
                          ? `Calculated project demand (${selDemandSqFt.toFixed(1)} sq ft) exceeds warehouse stock (${selStock} sq ft) by ${selShortageSqFt.toFixed(1)} sq ft. Immediate stock allocation or slab order required.`
                          : `Warehouse stock (${selStock} sq ft) covers all active project commitments (${selDemandSqFt.toFixed(1)} sq ft). Available buffer: ${selBufferSqFt.toFixed(1)} sq ft.`}
                      </p>

                      {/* STATS METRIC ROW */}
                      <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-black/5">
                        <div className="bg-white/80 p-2 rounded border border-black/5">
                          <span className="text-[9px] font-mono text-neutral-400 uppercase block">In Stock</span>
                          <strong className="text-xs font-bold text-neutral-800 font-mono">{selStock} sq ft</strong>
                        </div>
                        <div className="bg-white/80 p-2 rounded border border-black/5">
                          <span className="text-[9px] font-mono text-neutral-400 uppercase block">Demand</span>
                          <strong className={`text-xs font-bold font-mono ${selIsExceeded ? "text-red-600" : "text-neutral-800"}`}>
                            {selDemandSqFt.toFixed(1)} sq ft
                          </strong>
                        </div>
                        <div className="bg-white/80 p-2 rounded border border-black/5">
                          <span className="text-[9px] font-mono text-neutral-400 uppercase block">{selIsExceeded ? "Shortage" : "Buffer"}</span>
                          <strong className={`text-xs font-bold font-mono ${selIsExceeded ? "text-red-600" : "text-emerald-700"}`}>
                            {selIsExceeded ? `-${selShortageSqFt.toFixed(1)}` : `+${selBufferSqFt.toFixed(1)}`}
                          </strong>
                        </div>
                      </div>

                      {/* PROJECTS REQUIRING THIS MATERIAL LIST */}
                      {selDemandInfo.projectsList.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block font-mono">
                            Allocated Projects ({selDemandInfo.projectsList.length}):
                          </span>
                          <div className="space-y-1 max-h-28 overflow-y-auto">
                            {selDemandInfo.projectsList.map((pr) => (
                              <div key={pr.id} className="flex justify-between items-center text-[10px] bg-white/90 px-2.5 py-1.5 rounded border border-neutral-150">
                                <span className="font-medium text-neutral-800 truncate max-w-[170px]">{pr.name}</span>
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-neutral-500">{pr.reqSqFt.toFixed(1)} sq ft</span>
                                  <span className="text-[8px] bg-neutral-100 text-neutral-600 px-1 py-0.2 rounded">{pr.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* INTERACTIVE WAREHOUSE STOCK ADJUSTMENT CONTROLS */}
                      <div className="pt-2 border-t border-black/5 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block font-mono">
                          Warehouse Stock Level Adjustment:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateMaterialStock(selectedMaterial.id, selStock - 10)}
                            className="bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-bold px-2.5 py-1.5 rounded transition-colors"
                            title="Decrease stock by 10 sq ft"
                          >
                            -10
                          </button>
                          <div className="flex-1 relative">
                            <input
                              type="number"
                              min="0"
                              value={selStock}
                              onChange={(e) => handleUpdateMaterialStock(selectedMaterial.id, Number(e.target.value))}
                              className="w-full bg-white border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-center font-mono font-bold text-neutral-800 focus:border-gold focus:ring-1 focus:ring-gold/30"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-neutral-400 font-mono">sq ft</span>
                          </div>
                          <button
                            onClick={() => handleUpdateMaterialStock(selectedMaterial.id, selStock + 10)}
                            className="bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-bold px-2.5 py-1.5 rounded transition-colors"
                            title="Increase stock by 10 sq ft"
                          >
                            +10
                          </button>
                          <button
                            onClick={() => handleUpdateMaterialStock(selectedMaterial.id, selStock + Math.max(50, Math.ceil(selShortageSqFt)))}
                            className="bg-[#1A1A1A] hover:bg-gold text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors font-mono"
                          >
                            Restock
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Mechanical Specs Table */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Mechanical Data</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded">
                          <span className="text-[10px] font-mono text-neutral-400 block uppercase">Mohs Hardness</span>
                          <strong className="text-sm font-semibold text-neutral-800">{selectedMaterial.mohs} / 10</strong>
                        </div>
                        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded">
                          <span className="text-[10px] font-mono text-neutral-400 block uppercase">Water Absorption</span>
                          <strong className="text-sm font-semibold text-neutral-800">{selectedMaterial.waterAbsorption}</strong>
                        </div>
                        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded">
                          <span className="text-[10px] font-mono text-neutral-400 block uppercase">Standard Gauge</span>
                          <strong className="text-xs font-semibold text-neutral-800">{selectedMaterial.thicknesses.join(", ")}</strong>
                        </div>
                        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded">
                          <span className="text-[10px] font-mono text-neutral-400 block uppercase">Available Finishes</span>
                          <strong className="text-xs font-semibold text-neutral-800">{selectedMaterial.finishes.join(", ")}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Suitable Applications */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Approved Application Layout</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMaterial.application.map((app, idx) => (
                          <span key={idx} className="bg-neutral-100 text-neutral-700 border border-neutral-200 rounded px-2.5 py-1 text-xs font-medium">
                            {app}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Core Description */}
                    <div className="space-y-1.5 text-xs text-neutral-600">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Material Composition</h4>
                      <p className="leading-relaxed bg-neutral-50/50 p-3 rounded border border-neutral-100">{selectedMaterial.technicalDetails}</p>
                    </div>

                    {/* Fabrication Alert Rules */}
                    <div className="p-4 bg-amber-50/60 border border-amber-200 rounded text-xs space-y-2">
                      <div className="flex items-center gap-1.5 text-amber-800 font-bold uppercase tracking-wide text-[10px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Fabrication Layout Advisory
                      </div>
                      <p className="text-amber-800 leading-relaxed font-sans">{selectedMaterial.fabricationNotes}</p>
                    </div>

                    {/* Quick-Estimate Connector */}
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          // Pre-populate estimator with this material
                          handleUpdatePartField(activeEditingPartId, "materialId", selectedMaterial.id);
                          setActiveTab("estimator");
                        }}
                        className="w-full bg-[#1A1A1A] hover:bg-gold text-white text-xs font-semibold tracking-wider uppercase py-3 rounded transition-colors flex items-center justify-center gap-2"
                      >
                        <Calculator className="w-4 h-4" /> Load Into Quote Calculator
                      </button>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* MATERIAL COMPARISON SIDE-BY-SIDE MODAL */}
            <MaterialCompareModal
              isOpen={showCompareModal}
              onClose={() => setShowCompareModal(false)}
              materials={MATERIALS_CATALOG}
              materialAId={compareMaterialAId}
              materialBId={compareMaterialBId}
              onSelectMaterialA={(id) => setCompareMaterialAId(id)}
              onSelectMaterialB={(id) => setCompareMaterialBId(id)}
              onSwapMaterials={handleSwapCompareMaterials}
              onSelectForQuote={(id) => {
                handleUpdatePartField(activeEditingPartId, "materialId", id);
                setActiveTab("estimator");
              }}
              materialsStock={materialsStock}
              favoriteMaterialIds={favoriteMaterialIds}
              onToggleFavorite={toggleFavoriteMaterial}
            />
          </div>
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: DYNAMIC ESTIMATOR & QUOTE GENERATOR */}
        {/* ========================================================= */}
        {activeTab === "estimator" && (
          <div className="space-y-12 animate-fade-in">
            {/* ONLINE QUOTE TECHNICAL WORKFLOW HUB */}
            <OnlineQuoteHub
              onInitializeNewQuote={() => {
                handleAddEstimatePart();
                const el = document.getElementById("estimator-working-grid");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              onTriggerAiScan={() => alert("Automatic drawing analysis is not currently available. Please add parts manually using the estimator below.")}
              onFocusManualEntry={() => {
                const el = document.getElementById("estimator-working-grid");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              onSelectRecentEstimate={(est) => {
                const el = document.getElementById("estimator-working-grid");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              formatCurrency={formatCurrency}
            />

            <div id="estimator-working-grid" className="pt-6 border-t border-neutral-200/80">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className="font-serif text-3xl text-[#1A1A1A] font-medium">Dynamic Quote Engine</h3>
                  <p className="text-sm text-neutral-500">Calculate high-fidelity slab yields, edge fabrication, cutouts, and specialized surcharges.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowBulkImportModal(true)}
                    className="bg-neutral-900 border border-[#D4AF37]/60 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    title="Paste dimensions from Excel or CSV clipboard"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Bulk Import (CSV/Excel)
                  </button>
                  <button
                    onClick={handleAddEstimatePart}
                    className="bg-[#1A1A1A] hover:bg-gold text-white hover:text-black text-xs font-semibold tracking-wider uppercase px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> Add Countertop Part
                  </button>
                </div>
              </div>
            </div>

            {/* ESTIMATOR WORKING GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Form & Part Selectors */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Part Switcher Pills & Grain Advisor Toggle Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-200">
                  <div className="flex flex-wrap gap-2">
                    {estimateParts.map((part, index) => (
                      <div
                        key={part.id}
                        className={`inline-flex items-center gap-1.5 p-1 rounded-lg border transition-all ${
                          activeEditingPartId === part.id
                            ? "bg-white border-gold shadow-xs"
                            : "bg-neutral-50 border-neutral-200"
                        }`}
                      >
                        <button
                          onClick={() => setActiveEditingPartId(part.id)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded uppercase tracking-wider ${
                            activeEditingPartId === part.id
                              ? "text-gold font-bold"
                              : "text-neutral-500 hover:text-neutral-800"
                          }`}
                        >
                          {part.name}
                        </button>
                        {estimateParts.length > 1 && (
                          <button
                            onClick={() => handleDeleteEstimatePart(part.id)}
                            className="p-1 text-neutral-300 hover:text-red-500 rounded"
                            title="Remove part"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowGrainAdvisor(!showGrainAdvisor)}
                    className={`px-3.5 py-2 text-xs font-mono font-bold rounded-lg border transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                      showGrainAdvisor
                        ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                        : "bg-[#1A1A1A] text-[#D4AF37] border-neutral-800 hover:border-[#D4AF37]"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    <span>Grain Continuity Advisor</span>
                  </button>
                </div>

                {/* GRAIN CONTINUITY ADVISOR MODULE */}
                {showGrainAdvisor && (
                  <GrainContinuityAdvisor
                    selectedMaterialId={
                      estimateParts.find((p) => p.id === activeEditingPartId)?.materialId || "calacatta-gold"
                    }
                    onApplyOrientation={(orientation, yieldImpactPct) => {
                      const activePart = estimateParts.find((p) => p.id === activeEditingPartId);
                      if (activePart) {
                        const updatedName = `${activePart.name} (${orientation === "bookmatched" ? "Bookmatched Miter" : "Directional"})`;
                        handleUpdatePartField(activePart.id, "name", updatedName);
                      }
                    }}
                  />
                )}

                {/* Form fields for Active Editing Part */}
                {estimateParts.map((part) => {
                  if (part.id !== activeEditingPartId) return null;
                  return (
                    <div key={part.id} className="bg-white border border-neutral-200 rounded-lg p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Part/Section Name</label>
                          <input
                            type="text"
                            value={part.name}
                            onChange={(e) => handleUpdatePartField(part.id, "name", e.target.value)}
                            className="w-full bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs transition-all font-semibold"
                          />
                        </div>

                        <div className="space-y-1.5 col-span-1 md:col-span-2 border-b border-neutral-100 pb-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Material Product</label>
                            <span className="text-[10px] font-mono font-bold text-rose-600 flex items-center gap-1">
                              <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                              {favoriteMaterialIds.length} Saved Favorite(s)
                            </span>
                          </div>

                          {/* Quick Select Favorite Materials Bar */}
                          {favoriteMaterialIds.length > 0 && (
                            <div className="p-2.5 bg-rose-50/60 border border-rose-200/80 rounded-lg space-y-1.5">
                              <span className="text-[9px] font-mono uppercase text-rose-800 font-bold tracking-wider block">
                                Quick Select Favorite Surfaces (Click to Apply):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {favoriteMaterialIds.map((favId) => {
                                  const favMat = MATERIALS_CATALOG.find((m) => m.id === favId);
                                  if (!favMat) return null;
                                  const isSelected = part.materialId === favMat.id;
                                  return (
                                    <button
                                      key={favMat.id}
                                      type="button"
                                      onClick={() => handleUpdatePartField(part.id, "materialId", favMat.id)}
                                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                                        isSelected
                                          ? "bg-rose-600 text-white border-rose-600 shadow-2xs font-bold"
                                          : "bg-white text-neutral-800 border-rose-200 hover:border-rose-400 hover:text-rose-600"
                                      }`}
                                    >
                                      <Heart className={`w-3 h-3 ${isSelected ? "fill-white text-white" : "fill-rose-500 text-rose-500"}`} />
                                      <span>{favMat.name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <select
                            value={part.materialId}
                            onChange={(e) => handleUpdatePartField(part.id, "materialId", e.target.value)}
                            className="w-full bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs transition-all font-semibold"
                          >
                            {favoriteMaterialIds.length > 0 && (
                              <optgroup label="❤️ FAVORITE MATERIALS">
                                {MATERIALS_CATALOG.filter((m) => favoriteMaterialIds.includes(m.id)).map((m) => (
                                  <option key={`fav-${m.id}`} value={m.id}>
                                    ♥ {m.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="ALL SURFACE CATALOG">
                              {MATERIALS_CATALOG.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Length (Inches)</label>
                          <input
                            type="number"
                            value={part.length}
                            onChange={(e) => handleUpdatePartField(part.id, "length", Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-full bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs transition-all font-mono"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Width (Inches)</label>
                          <input
                            type="number"
                            value={part.width}
                            onChange={(e) => handleUpdatePartField(part.id, "width", Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-full bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs transition-all font-mono"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Gauge Thickness</label>
                          <select
                            value={part.thickness}
                            onChange={(e) => handleUpdatePartField(part.id, "thickness", e.target.value)}
                            className="w-full bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs transition-all font-semibold"
                          >
                            {getMaterialById(part.materialId).thicknesses.map(t => (
                              <option key={t} value={t}>{t} {t === "12mm" ? "(Thin/0.9x)" : t === "30mm" ? "(Luxury/1.25x)" : "(Standard/1.0x)"}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Edge Profile Design</label>
                          <select
                            value={part.edgeProfile}
                            onChange={(e) => handleUpdatePartField(part.id, "edgeProfile", e.target.value)}
                            className="w-full bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs transition-all font-semibold"
                          >
                            <option value="Square/Eased">Square / Eased Edge (Standard)</option>
                            <option value="Mitered Apron (2 in)">Mitered Apron 2 in (+ {formatCurrency(25)}/LF)</option>
                            <option value="Mitered Apron (3 in)">Mitered Apron 3 in (+ {formatCurrency(35)}/LF)</option>
                            <option value="Demi-Bullnose">Demi-Bullnose (+ {formatCurrency(15)}/LF)</option>
                            <option value="Ogee">Ogee Premium Profile (+ {formatCurrency(20)}/LF)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Finished Edge Length (Linear Feet)</label>
                          <input
                            type="number"
                            value={part.edgeLength}
                            onChange={(e) => handleUpdatePartField(part.id, "edgeLength", Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs transition-all font-mono"
                          />
                          <p className="text-[10px] text-neutral-400">Total linear footage of edges requiring polishing/mitering.</p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Faucet Holes Required</label>
                          <input
                            type="number"
                            value={part.faucetHoles}
                            onChange={(e) => handleUpdatePartField(part.id, "faucetHoles", Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs transition-all font-mono"
                          />
                        </div>
                      </div>

                      {/* CUTOUT CONFIGURATOR */}
                      <div className="border-t border-neutral-100 pt-4 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Precision Machined Cutouts</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded flex justify-between items-center">
                            <div>
                              <span className="text-[11px] font-bold text-neutral-700">Undermount Sink Cutout</span>
                              <span className="text-[10px] text-neutral-400 block font-mono">+{formatCurrency(250)} per cutout</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdatePartField(part.id, "sinkCutouts", Math.max(0, part.sinkCutouts - 1))}
                                className="w-7 h-7 bg-white border border-neutral-200 rounded flex items-center justify-center text-xs hover:border-neutral-400 font-bold"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-mono font-bold">{part.sinkCutouts}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdatePartField(part.id, "sinkCutouts", part.sinkCutouts + 1)}
                                className="w-7 h-7 bg-white border border-neutral-200 rounded flex items-center justify-center text-xs hover:border-neutral-400 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded flex justify-between items-center">
                            <div>
                              <span className="text-[11px] font-bold text-neutral-700">Cooktop / Hob Cutout</span>
                              <span className="text-[10px] text-neutral-400 block font-mono">+{formatCurrency(200)} per cutout</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdatePartField(part.id, "cooktopCutouts", Math.max(0, part.cooktopCutouts - 1))}
                                className="w-7 h-7 bg-white border border-neutral-200 rounded flex items-center justify-center text-xs hover:border-neutral-400 font-bold"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-mono font-bold">{part.cooktopCutouts}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdatePartField(part.id, "cooktopCutouts", part.cooktopCutouts + 1)}
                                className="w-7 h-7 bg-white border border-neutral-200 rounded flex items-center justify-center text-xs hover:border-neutral-400 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* MATCHING BACKSPLASH ACCENTS */}
                      <div className="border-t border-neutral-100 pt-4 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Integrated Backsplash Accent</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-neutral-500 block uppercase">Backsplash Length (Inches)</label>
                            <input
                              type="number"
                              value={part.backsplashLength}
                              onChange={(e) => handleUpdatePartField(part.id, "backsplashLength", Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs transition-all font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-neutral-500 block uppercase">Backsplash Height (Inches)</label>
                            <input
                              type="number"
                              value={part.backsplashHeight}
                              onChange={(e) => handleUpdatePartField(part.id, "backsplashHeight", Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs transition-all font-mono"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}

                {/* SAVE QUOTE TO PIPELINE MODULE */}
                <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
                  <div className="flex gap-2">
                    <FolderGit2 className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-800">Assign Current Estimations to Project Pipeline</h4>
                      <p className="text-xs text-neutral-500">Save this calculation under an existing project pipeline, or initialize a clean project file.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <select
                      value={selectedProjectForSaving}
                      onChange={(e) => setSelectedProjectForSaving(e.target.value)}
                      className="flex-1 bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs transition-all"
                    >
                      <option value="">-- Choose Project --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>

                    <button
                      onClick={handleSaveEstimateToProject}
                      disabled={!selectedProjectForSaving}
                      className="bg-[#1A1A1A] hover:bg-gold disabled:bg-neutral-200 text-white disabled:text-neutral-400 px-4 py-2 rounded text-xs font-semibold tracking-wider uppercase transition-colors"
                    >
                      Save to Project
                    </button>
                    
                    <button
                      onClick={() => {
                        setNewProjectName("Residential Project - " + new Date().toLocaleDateString());
                        setNewProjectNotes("Estimate parts automatically linked upon creation.");
                        setShowNewProjectModal(true);
                      }}
                      className="border border-neutral-300 hover:border-neutral-400 text-neutral-700 px-4 py-2 rounded text-xs font-semibold tracking-wider uppercase transition-colors"
                    >
                      New Pipeline File
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column: Dynamic Price Summary breakdown */}
              <div className="lg:col-span-5 bg-white border border-[#D4AF37]/30 rounded-lg p-6 md:p-8 space-y-6 sticky top-28 self-start shadow-sm shadow-[#D4AF37]/5">
                <span className="text-xs font-mono uppercase tracking-widest text-gold font-bold">Specification Summary</span>
                <h3 className="font-serif text-2xl font-medium text-[#1A1A1A] pb-2 border-b border-neutral-100">
                  Active Quote Estimate
                </h3>

                {/* Subsections listing */}
                <div className="space-y-4">
                  {calculatedEstimatePartsSummary.map((part) => (
                    <div key={part.id} className="p-4 bg-[#FBFBFA] border border-neutral-200/80 rounded space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-serif font-bold text-sm text-neutral-800">{part.name}</h5>
                          <span className="text-[10px] font-mono text-neutral-400 uppercase">
                            {part.material.name} ({part.thickness})
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-neutral-800">
                          Price on Application
                        </span>
                      </div>

                      {/* Detail breakdown bullets */}
                      <div className="space-y-1.5 border-t border-dashed border-neutral-200 pt-2 text-[11px] text-neutral-500">
                        <div className="flex justify-between">
                          <span>Material Area Yield:</span>
                          <span className="font-mono font-medium text-neutral-700">
                            {part.totalSqFt.toFixed(2)} sqft
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Edge Layout Charge:</span>
                          <span className="font-mono font-medium text-neutral-700">
                            {part.edgeLength} LF ({part.edgeProfile})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Machining / Cutouts:</span>
                          <span className="font-mono font-medium text-neutral-700">
                            Sink x{part.sinkCutouts}, Hob x{part.cooktopCutouts}, Hole x{part.faucetHoles}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total cost banner */}
                <div className="p-5 bg-neutral-900 text-white rounded-lg space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-full opacity-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gold font-bold block">
                    Estimated Total
                  </span>
                  <div className="flex justify-between items-baseline">
                    <span className="font-serif text-2xl font-semibold">
                      Price on Application
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Confirmed by our team based on your specification.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab("quote-summary")}
                  className="w-full bg-[#D4AF37] hover:bg-[#B89324] text-white text-xs font-bold uppercase tracking-widest py-3.5 rounded-lg transition-all duration-300 text-center flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">receipt_long</span>
                  Compile Quote Summary #EST-{quoteNumber}
                </button>

                {/* Info disclosure */}
                <p className="text-[10px] text-neutral-400 leading-relaxed font-mono">
                  *This estimation is indicative based on specified dimensions and fabrication profile. Local depot scrap fees, transport freight, and custom template matching surcharges are finalized during physical slab template matching.
                </p>

              </div>

            </div>
          </div>
        )}

        {/* Phase 5 Gate 0: the fake "AI Drawing Scanner" analysis/import panel that used to render here has been removed - it always injected the same hardcoded fabricated layout into the quote regardless of the uploaded file. See the removal note above handleAddEstimatePart-adjacent state. */}
        {/* ========================================================= */}
        {/* VIEW 4: PROJECT PIPELINE */}
        {/* ========================================================= */}
        {activeTab === "projects" && (
          <ErrorBoundary fallbackTitle="Projects Pipeline Temporary Error">
            <div className="space-y-8 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-gold/15 text-gold border border-gold/40 px-2 py-0.5 rounded">
                    UK Detail Specification
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    BS EN 1469 • BS 8298 • RIBA Framework
                  </span>
                </div>
                <h3 className="font-serif text-3xl text-[#1A1A1A] font-medium">Project Pipeline</h3>
                <p className="text-sm text-neutral-500">Coordinate UK-specified project timelines, RIBA stage deliverables, slab reservation tickets, and British stone masonry quotes.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setBulkImportTargetProjectId("");
                    setShowBulkImportModal(true);
                  }}
                  className="bg-neutral-900 border border-[#D4AF37]/60 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  title="Paste raw dimension rows from Excel or CSV clipboard to populate project estimates"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Bulk Clipboard Import</span>
                </button>

                <button
                  onClick={() => setActiveTab("project-command")}
                  className="bg-gold hover:bg-white text-black text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <ShieldCheck className="w-4 h-4 text-black" />
                  <span>SMC PRO Command Center</span>
                </button>

                <button
                  onClick={() => {
                    setNewProjectName("");
                    setNewProjectAddress("");
                    setNewProjectNotes("");
                    setShowNewProjectModal(true);
                  }}
                  className="bg-[#1A1A1A] hover:bg-gold text-white hover:text-black text-xs font-semibold tracking-wider uppercase px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Create New Project
                </button>
              </div>
            </div>

            {/* UK SPECIFICATION COMPLIANCE BAR */}
            <div className="bg-neutral-900 border border-gold/30 rounded-xl p-4 text-xs text-neutral-300 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gold/20 text-gold border border-gold/40 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-white text-sm">British Stone Masonry Standards & Spec Compliance</h4>
                  <p className="text-[11px] text-neutral-400">All pipeline estimates are calculated under BS EN 1469 (Slabs), BS 8298 (Fixings & Cladding), and RIBA Plan of Work Stages.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="bg-neutral-800 text-gold border border-gold/30 px-2.5 py-1 rounded font-bold">BS EN 1469</span>
                <span className="bg-neutral-800 text-amber-300 border border-amber-400/30 px-2.5 py-1 rounded font-bold">BS 8298-1</span>
                <span className="bg-neutral-800 text-sky-300 border border-sky-400/30 px-2.5 py-1 rounded font-bold">RIBA Stage 1-6</span>
                <span className="bg-neutral-800 text-emerald-300 border border-emerald-400/30 px-2.5 py-1 rounded font-bold">Part B & M Certified</span>
              </div>
            </div>

            {/* EXECUTIVE PIPELINE VALUATION SUMMARY BANNER */}
            <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 text-white border border-gold/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden space-y-5">
              {/* Radial backdrop glow */}
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Main Hero Valuation Metric */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gold/20 border border-gold/40 rounded-lg text-gold">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-gold/90">
                      Total Pipeline Valuation
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-3">
                    <h2 className="font-serif text-3xl sm:text-4xl font-bold text-amber-400 tracking-tight">
                      {formatCurrency(portfolioMetrics.total)}
                    </h2>
                    <span className="text-xs font-mono text-neutral-400">
                      across {portfolioMetrics.count} project portfolios
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
                    High-level commercial valuation reflecting total contracted material, fabrication labor, edge profiles, and cutout pricing across all pipeline stages.
                  </p>
                </div>

                {/* Financial KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
                  {/* Active Pipeline Card */}
                  <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl space-y-1 backdrop-blur-xs">
                    <span className="text-[9px] font-mono uppercase text-neutral-400 block font-semibold">In Progress Pipeline</span>
                    <div className="font-serif text-lg font-bold text-amber-300">
                      {formatCurrency(portfolioMetrics.active)}
                    </div>
                    <span className="text-[10px] text-amber-400/80 font-mono block">
                      {portfolioMetrics.activePct.toFixed(0)}% of Portfolio
                    </span>
                  </div>

                  {/* Realized Revenue Card */}
                  <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl space-y-1 backdrop-blur-xs">
                    <span className="text-[9px] font-mono uppercase text-neutral-400 block font-semibold">Realized Revenue</span>
                    <div className="font-serif text-lg font-bold text-emerald-400">
                      {formatCurrency(portfolioMetrics.completed)}
                    </div>
                    <span className="text-[10px] text-emerald-400/80 font-mono block">
                      Completed Slabs
                    </span>
                  </div>

                  {/* Avg Deal Size Card */}
                  <div className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 p-3.5 rounded-xl space-y-1 backdrop-blur-xs">
                    <span className="text-[9px] font-mono uppercase text-neutral-400 block font-semibold">Avg Project Value</span>
                    <div className="font-serif text-lg font-bold text-sky-300">
                      {formatCurrency(portfolioMetrics.avg)}
                    </div>
                    <span className="text-[10px] text-sky-400/80 font-mono block">
                      Per Registered Job
                    </span>
                  </div>
                </div>
              </div>

              {/* Stacked Stage Valuation Progress Bar */}
              <div className="relative z-10 pt-4 border-t border-white/10 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400">
                  <span className="uppercase tracking-wider font-semibold text-neutral-300">Valuation Distribution by Stage</span>
                  <span className="text-gold font-bold">{formatCurrency(portfolioMetrics.total)} Total</span>
                </div>

                <div className="h-2.5 w-full bg-neutral-800 rounded-full overflow-hidden flex shadow-inner">
                  {portfolioMetrics.total > 0 && (
                    <>
                      <div
                        className="bg-neutral-500 h-full transition-all"
                        style={{ width: `${(portfolioMetrics.stageValues.Proposal / portfolioMetrics.total) * 100}%` }}
                        title={`Proposal: ${formatCurrency(portfolioMetrics.stageValues.Proposal)}`}
                      />
                      <div
                        className="bg-sky-500 h-full transition-all"
                        style={{ width: `${(portfolioMetrics.stageValues["Slab Selected"] / portfolioMetrics.total) * 100}%` }}
                        title={`Slab Selected: ${formatCurrency(portfolioMetrics.stageValues["Slab Selected"])}`}
                      />
                      <div
                        className="bg-amber-500 h-full transition-all"
                        style={{ width: `${(portfolioMetrics.stageValues.Fabrication / portfolioMetrics.total) * 100}%` }}
                        title={`Fabrication: ${formatCurrency(portfolioMetrics.stageValues.Fabrication)}`}
                      />
                      <div
                        className="bg-indigo-500 h-full transition-all"
                        style={{ width: `${(portfolioMetrics.stageValues["Ready for Install"] / portfolioMetrics.total) * 100}%` }}
                        title={`Ready for Install: ${formatCurrency(portfolioMetrics.stageValues["Ready for Install"])}`}
                      />
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${(portfolioMetrics.stageValues.Completed / portfolioMetrics.total) * 100}%` }}
                        title={`Completed: ${formatCurrency(portfolioMetrics.stageValues.Completed)}`}
                      />
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-neutral-400 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-neutral-500" />
                    <span>Proposal: <strong className="text-white">{formatCurrency(portfolioMetrics.stageValues.Proposal)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <span>Slab Selected: <strong className="text-white">{formatCurrency(portfolioMetrics.stageValues["Slab Selected"])}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Fabrication: <strong className="text-white">{formatCurrency(portfolioMetrics.stageValues.Fabrication)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>Ready for Install: <strong className="text-white">{formatCurrency(portfolioMetrics.stageValues["Ready for Install"])}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Completed: <strong className="text-white">{formatCurrency(portfolioMetrics.stageValues.Completed)}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* PORTFOLIO KPI SUMMARY STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-neutral-200 p-4 rounded-xl space-y-1 shadow-2xs">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">Total Registered Jobs</span>
                <div className="font-serif text-2xl font-bold text-neutral-900">{projects.length}</div>
                <span className="text-[10px] text-neutral-500 font-medium">{formatCurrency(portfolioMetrics.avg)} Avg Value</span>
              </div>

              <div className="bg-white border border-neutral-200 p-4 rounded-xl space-y-1 shadow-2xs">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">In Fabrication</span>
                <div className="font-serif text-2xl font-bold text-amber-600">{projectStatusCounts["Fabrication"]}</div>
                <span className="text-[10px] text-neutral-500 font-medium">Active Shop Operations</span>
              </div>

              <div className="bg-white border border-neutral-200 p-4 rounded-xl space-y-1 shadow-2xs">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">Slabs Selected / Proposal</span>
                <div className="font-serif text-2xl font-bold text-sky-600">{projectStatusCounts["Slab Selected"] + projectStatusCounts["Proposal"]}</div>
                <span className="text-[10px] text-neutral-500 font-medium">Pending Fabrication Signoff</span>
              </div>

              <div className="bg-white border border-neutral-200 p-4 rounded-xl space-y-1 shadow-2xs">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">Ready / Installed</span>
                <div className="font-serif text-2xl font-bold text-emerald-600">{projectStatusCounts["Ready for Install"] + projectStatusCounts["Completed"]}</div>
                <span className="text-[10px] text-neutral-500 font-medium">Site Delivered & Handed Over</span>
              </div>
            </div>

            {/* DEDICATED GRANULAR SLAB YIELD EFFICIENCY REPORT */}
            <SlabYieldGranularReport
              projects={projects}
              getFabricationDetailsForProject={getFabricationDetailsForProject}
              getMaterialById={getMaterialById}
              onSelectProject={(projName) => {
                setProjectSearchQuery(projName);
              }}
            />

            {/* UNIFIED PROJECT TIMELINE VISUALIZER (CALENDAR & GANTT & DRAG-AND-DROP) */}
            <ProjectTimelineVisualizer
              projects={projects}
              onUpdateMilestone={handleUpdateProjectTimelineMilestone}
              onSelectProject={(projId) => {
                const targetProj = projects.find(p => p.id === projId);
                if (targetProj) {
                  setProjectSearchQuery(targetProj.name);
                }
              }}
            />

            {/* SEARCH AND STATUS FILTER CONTROLS BAR */}
            <div className="bg-white border border-neutral-200 p-4 md:p-5 rounded-2xl space-y-4 shadow-xs">
              <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
                
                {/* Search Input Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                    placeholder="Search projects by client name, address, notes, material, or edge..."
                    className="w-full bg-neutral-50 border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded-xl pl-10 pr-9 py-2.5 text-xs text-neutral-800 placeholder:text-neutral-400 transition-all font-sans"
                  />
                  {projectSearchQuery && (
                    <button
                      onClick={() => setProjectSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* SORT DROPDOWN SELECTOR */}
                <div className="relative flex items-center shrink-0">
                  <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400 absolute left-3 pointer-events-none" />
                  <select
                    id="project-pipeline-sort"
                    value={projectSort}
                    onChange={(e) => setProjectSort(e.target.value as any)}
                    className="bg-neutral-50 border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded-xl pl-9 pr-8 py-2.5 text-xs font-semibold text-neutral-800 transition-all appearance-none cursor-pointer shadow-2xs hover:border-neutral-300"
                  >
                    <option value="updated-desc">Sort: Last Modified (Newest First)</option>
                    <option value="updated-asc">Sort: Last Modified (Oldest First)</option>
                    <option value="value-desc">Sort: Total Value (High to Low)</option>
                    <option value="value-asc">Sort: Total Value (Low to High)</option>
                    <option value="variance-desc">Sort: Milestone Variance (Highest Delay)</option>
                    <option value="variance-asc">Sort: Milestone Variance (Most Ahead)</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 pointer-events-none" />
                </div>

                {/* Reset Filters Quick Link */}
                {(projectSearchQuery || projectStatusFilter !== "All" || projectSort !== "updated-desc") && (
                  <button
                    onClick={() => {
                      setProjectSearchQuery("");
                      setProjectStatusFilter("All");
                      setProjectSort("updated-desc");
                    }}
                    className="text-xs text-neutral-500 hover:text-gold font-medium flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-neutral-300 rounded-xl hover:border-gold transition-colors cursor-pointer self-start md:self-auto"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              {/* Status Filter Tabs / Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 font-sans no-scrollbar">
                <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider mr-1 flex-shrink-0 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-neutral-400" /> Filter:
                </span>

                {(["All", "Proposal", "Slab Selected", "Fabrication", "Ready for Install", "Completed"] as const).map((statusKey) => {
                  const isSelected = projectStatusFilter === statusKey;
                  const count = projectStatusCounts[statusKey];

                  return (
                    <button
                      key={statusKey}
                      onClick={() => setProjectStatusFilter(statusKey)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs"
                          : "bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border-neutral-200"
                      }`}
                    >
                      <span>{statusKey}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? "bg-gold text-white"
                          : "bg-neutral-200 text-neutral-700"
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Filter & Sort Indicator Line */}
              <div className="flex flex-wrap justify-between items-center gap-2 text-[11px] text-neutral-400 font-mono pt-1 border-t border-neutral-100">
                <span>
                  Showing <strong className="text-neutral-800">{filteredProjects.length}</strong> of {projects.length} project portfolios
                </span>
                <div className="flex items-center gap-3">
                  {projectStatusFilter !== "All" && (
                    <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                      Filter: {projectStatusFilter}
                    </span>
                  )}
                  <span className="text-neutral-700 font-medium flex items-center gap-1 bg-neutral-100 px-2 py-0.5 rounded text-[10px]">
                    <ArrowUpDown className="w-3 h-3 text-gold" />
                    Ordered by: {
                      projectSort === "updated-desc" ? "Last Modified (Newest)" :
                      projectSort === "updated-asc" ? "Last Modified (Oldest)" :
                      projectSort === "value-desc" ? "Total Value (High → Low)" :
                      projectSort === "value-asc" ? "Total Value (Low → High)" :
                      projectSort === "variance-desc" ? "Milestone Delay (Highest)" :
                      "Milestone Schedule (Most Ahead)"
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* PROJECTS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProjects.map((proj) => {
                const totalProjValue = calculateProjectValue(proj);

                return (
                  <div key={proj.id} className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-6 flex flex-col justify-between shadow-xs hover:border-neutral-300 transition-all">
                    
                    <div className="space-y-4">
                      {/* Top status bar */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                            <span>Created {proj.createdAt}</span>
                            <span>•</span>
                            <span className="text-neutral-600 font-bold bg-neutral-100 px-1.5 py-0.2 rounded">
                              Updated {proj.updatedAt || proj.createdAt}
                            </span>
                          </div>
                          <h4 className="font-serif text-xl font-medium text-neutral-800 leading-snug">{proj.name}</h4>
                          <span className="text-xs text-neutral-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-neutral-400">location_on</span>
                            {proj.address}
                          </span>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="text-[9px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded">
                              UK Spec: BS EN 1469 / BS 8298
                            </span>
                            <span className="text-[9px] font-mono font-bold bg-neutral-100 text-neutral-700 border border-neutral-200 px-2 py-0.5 rounded">
                              RIBA Stage {proj.status === "Proposal" ? "3 (Spatial)" : proj.status === "Completed" ? "6 (Handover)" : "4 (Technical)"}
                            </span>
                          </div>
                        </div>

                        {/* Status Select dropdown with subtle slide-in animation */}
                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                          <motion.div
                            key={`select-wrap-${proj.id}-${proj.status}`}
                            initial={{ x: 12, opacity: 0.8 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <select
                              value={proj.status}
                              onChange={(e) => handleUpdateProjectStatus(proj.id, e.target.value as any)}
                              className="text-xs font-semibold bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-700 focus:ring-1 focus:ring-gold focus:border-gold cursor-pointer hover:bg-neutral-100 transition-colors shadow-2xs"
                            >
                              <option value="Proposal">Proposal</option>
                              <option value="Slab Selected">Slab Selected</option>
                              <option value="Fabrication">Fabrication</option>
                              <option value="Ready for Install">Ready for Install</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </motion.div>

                          <AnimatePresence mode="wait">
                            {statusChangedMap[proj.id] && (Date.now() - statusChangedMap[proj.id].timestamp < 4500) && (
                              <motion.div
                                key={`status-toast-${proj.id}-${statusChangedMap[proj.id].timestamp}`}
                                initial={{ x: 20, opacity: 0, scale: 0.95 }}
                                animate={{ x: 0, opacity: 1, scale: 1 }}
                                exit={{ x: 10, opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold shadow-2xs"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                <span>Status updated: {statusChangedMap[proj.id].status}</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Estimate summaries inside project card */}
                      <div className="border-t border-neutral-100 pt-4 space-y-3">
                        <div className="flex justify-between items-center text-xs text-neutral-400">
                          <span className="font-semibold text-neutral-700 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-gold" /> Layout & Parts ({proj.estimates?.length || 0})
                          </span>
                          <button
                            onClick={() => {
                              setBulkImportTargetProjectId(proj.id);
                              setShowBulkImportModal(true);
                            }}
                            className="text-[11px] font-mono font-bold text-[#D4AF37] hover:text-black bg-[#D4AF37]/10 hover:bg-[#D4AF37] border border-[#D4AF37]/40 px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                            title="Bulk paste raw dimension data from clipboard directly into this project"
                          >
                            <Copy className="w-3 h-3" /> Bulk Paste
                          </button>
                        </div>

                        {proj.estimates.length === 0 ? (
                          <p className="text-xs italic text-neutral-400 bg-[#FBFBFA] p-3 rounded-lg text-center">No calculated estimates attached.</p>
                        ) : (
                          <div className="space-y-2">
                            {proj.estimates.map((est, idx) => {
                              const mat = getMaterialById(est.materialId);
                              return (
                                <div key={est.id || idx} className="text-xs flex justify-between bg-[#FBFBFA] px-3 py-2 border border-neutral-100 rounded-lg">
                                  <div className="space-y-0.5">
                                    <strong className="text-neutral-700">{est.name}</strong>
                                    <div className="text-[10px] text-neutral-500 font-mono">
                                      {Math.round(est.length * 25.4)}mm × {Math.round(est.width * 25.4)}mm ({est.length}"×{est.width}") | {mat.name} ({est.thickness})
                                    </div>
                                  </div>
                                  <span className="font-mono text-neutral-600 font-bold self-center text-[10px] bg-neutral-100 px-2 py-0.5 rounded">
                                    {mat.class}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* BRITISH STANDARD FABRICATION DETAILS & TECHNICIAN LOGS */}
                      {(() => {
                        const fab = getFabricationDetailsForProject(proj);

                        return (
                          <div className="border-t border-neutral-200/80 pt-4 space-y-3 bg-[#FBFBFA] p-3.5 rounded-xl border border-neutral-200">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-gold" />
                                <div>
                                  <h5 className="font-serif text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                                    <span>🇬🇧 UK Fabrication & Edge Finishing Logs</span>
                                    <span className="text-[9px] font-mono font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                                      BS EN 1469 / BS 8298
                                    </span>
                                  </h5>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setActiveLogModalProjectId(proj.id);
                                  setNewLogStep("");
                                  setNewLogTechnician("");
                                  setNewLogProfile("");
                                  setNewLogGritSequence("");
                                  setNewLogStatus("Approved");
                                }}
                                className="text-[10px] font-mono font-bold bg-neutral-900 text-white hover:bg-gold hover:text-neutral-950 px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <Plus className="w-3 h-3" /> Log Tech Step
                              </button>
                            </div>

                            {/* Yield meter and grain continuity row */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                              {/* Material Yield Badge & Meter */}
                              <div className="bg-white p-2.5 rounded-lg border border-neutral-200 space-y-1">
                                <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                                  <span>Material Yield (BS EN 1469)</span>
                                  <strong className="text-emerald-700">{fab.materialYieldPct}%</strong>
                                </div>
                                <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, fab.materialYieldPct)}%` }}
                                  />
                                </div>
                                <p className="text-[9px] text-neutral-400 italic">Offcut waste minimized under BS Standards</p>
                              </div>

                              {/* Grain Continuity & Cutting Orientation */}
                              <div className="bg-white p-2.5 rounded-lg border border-neutral-200 space-y-1 sm:col-span-2">
                                <div className="flex justify-between items-center text-[10px] font-mono">
                                  <span className="text-neutral-500 font-bold uppercase">Cutting Orientation & Vein Match</span>
                                  <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5" /> Grain Verified
                                  </span>
                                </div>
                                <p className="text-[10px] text-neutral-700 font-medium line-clamp-1">{fab.cuttingOrientation}</p>
                                <div className="flex justify-between text-[9px] text-neutral-400 font-mono">
                                  <span>Machine: {fab.wetCncMachineId}</span>
                                  <span>Subframe: ±{fab.subframeToleranceMm}mm (BS 8298)</span>
                                </div>
                              </div>
                            </div>

                            {/* Cutting Sequence Guidance */}
                            <div className="bg-amber-50/50 p-2 rounded-lg border border-amber-200/60 text-[10px] text-amber-950 font-mono flex items-start gap-1.5">
                              <Sliders className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
                              <div>
                                <strong className="font-sans font-semibold text-amber-900 block text-[9px] uppercase tracking-wider">CNC Cutting & Waterjet Guidance:</strong>
                                <span>{fab.cuttingSequenceNotes}</span>
                              </div>
                            </div>

                            {/* Technician Edge Finishing Logs Table */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                                <span>Technician Edge Finishing & Inspection Log</span>
                                <span>{fab.edgeFinishingLogs.length} Records</span>
                              </div>

                              {fab.edgeFinishingLogs.length === 0 ? (
                                <p className="text-[10px] italic text-neutral-400 bg-white p-2.5 rounded-lg text-center border border-neutral-200">
                                  No technician logs recorded yet. Click "Log Tech Step" above.
                                </p>
                              ) : (
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                  {fab.edgeFinishingLogs.map((log) => (
                                    <div key={log.id} className="bg-white p-2.5 rounded-lg border border-neutral-200 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                          <strong className="text-neutral-800 text-[11px]">{log.step}</strong>
                                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold border ${
                                            log.status === "Approved" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                                            log.status === "In Progress" ? "bg-amber-50 text-amber-800 border-amber-200" :
                                            "bg-rose-50 text-rose-800 border-rose-200"
                                          }`}>
                                            {log.status}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-neutral-500 flex flex-wrap gap-2 font-mono">
                                          <span>Tech: <strong className="text-neutral-700 font-sans">{log.technician}</strong></span>
                                          <span>•</span>
                                          <span>Profile: <strong className="text-neutral-700">{log.profile}</strong></span>
                                          <span>•</span>
                                          <span>Grit: <span className="text-neutral-600">{log.gritSequence}</span></span>
                                        </div>
                                      </div>
                                      <span className="text-[9px] font-mono text-neutral-400 self-end sm:self-center whitespace-nowrap bg-neutral-50 px-2 py-0.5 rounded border border-neutral-100">
                                        {log.timestamp}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Notes edit section */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Slab Inspection & Shop Notes</label>
                        <textarea
                          rows={2}
                          value={proj.notes}
                          onChange={(e) => handleUpdateProjectNotes(proj.id, e.target.value)}
                          placeholder="Log slab delivery dates, templating notes, pattern matching requests, etc..."
                          className="w-full text-xs bg-neutral-50/50 border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded-lg p-2.5 transition-all leading-relaxed font-sans"
                        />
                      </div>

                      {/* VISUAL MILESTONE PROGRESS TIMELINE COMPONENT */}
                      {(() => {
                        const ms = proj.milestones || getDefaultMilestonesForProject(proj);
                        const fabVar = calculateMilestoneVariance(ms.fabrication.expectedDate, ms.fabrication.actualDate);
                        const insVar = calculateMilestoneVariance(ms.readyForInstall.expectedDate, ms.readyForInstall.actualDate);

                        const stagesList = ["Proposal", "Slab Selected", "Fabrication", "Ready for Install", "Completed"] as const;
                        const currentStageIndex = stagesList.indexOf(proj.status as any);

                        return (
                          <div className="border-t border-neutral-100 pt-4 space-y-3.5">
                            {/* Timeline Header & Stage Variance Highlights */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <div className="flex items-center gap-1.5">
                                <Milestone className="w-4 h-4 text-gold" />
                                <h5 className="font-serif text-xs font-semibold text-neutral-800">Milestone Progress Timeline</h5>
                              </div>
                              <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                                <span className={`px-2 py-0.5 rounded font-bold border ${
                                  fabVar.status === "delayed" ? "bg-red-50 text-red-700 border-red-200" :
                                  fabVar.status === "ahead" ? "bg-sky-50 text-sky-700 border-sky-200" :
                                  fabVar.status === "on-track" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  "bg-neutral-100 text-neutral-600 border-neutral-200"
                                }`}>
                                  Fab: {fabVar.text}
                                </span>
                                <span className={`px-2 py-0.5 rounded font-bold border ${
                                  insVar.status === "delayed" ? "bg-red-50 text-red-700 border-red-200" :
                                  insVar.status === "ahead" ? "bg-sky-50 text-sky-700 border-sky-200" :
                                  insVar.status === "on-track" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  "bg-neutral-100 text-neutral-600 border-neutral-200"
                                }`}>
                                  Install: {insVar.text}
                                </span>
                              </div>
                            </div>

                            {/* Visual Pipeline Bar */}
                            <div className="relative py-2 px-1">
                              <div className="absolute top-1/2 left-3 right-3 h-1 bg-neutral-200 -translate-y-1/2 z-0 rounded-full" />
                              <div
                                className="absolute top-1/2 left-3 h-1 bg-gold -translate-y-1/2 z-0 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(0, currentStageIndex / (stagesList.length - 1)) * 90}%` }}
                              />
                              <div className="relative z-10 flex justify-between items-center text-[10px] font-mono">
                                {stagesList.map((stg, idx) => {
                                  const isDone = idx < currentStageIndex;
                                  const isCurrent = idx === currentStageIndex;
                                  const isTargetedStage = stg === "Fabrication" || stg === "Ready for Install";

                                  return (
                                    <div key={stg} className="flex flex-col items-center group cursor-pointer" onClick={() => handleUpdateProjectStatus(proj.id, stg)}>
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] border transition-all ${
                                        isCurrent ? "bg-gold text-neutral-950 border-gold ring-4 ring-gold/20 scale-110" :
                                        isDone ? "bg-neutral-900 text-white border-neutral-900" :
                                        isTargetedStage ? "bg-white text-gold border-gold" :
                                        "bg-white text-neutral-400 border-neutral-300"
                                      }`}>
                                        {isDone ? <Check className="w-3 h-3" /> : idx + 1}
                                      </div>
                                      <span className={`mt-1 text-[9px] font-medium whitespace-nowrap ${
                                        isCurrent ? "text-neutral-900 font-bold" :
                                        isTargetedStage ? "text-amber-800 font-semibold" :
                                        "text-neutral-400"
                                      }`}>
                                        {stg === "Ready for Install" ? "Install" : stg}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Detailed Target Stage Comparison Cards: Fabrication & Ready for Install */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              
                              {/* FABRICATION MILESTONE CARD */}
                              <div className={`p-3 rounded-xl border space-y-2.5 transition-all ${
                                ms.fabrication.status === "completed" ? "bg-emerald-50/60 border-emerald-200" :
                                ms.fabrication.status === "in-progress" ? "bg-amber-50/60 border-amber-200" :
                                ms.fabrication.status === "delayed" ? "bg-red-50/60 border-red-200" :
                                "bg-neutral-50 border-neutral-200"
                              }`}>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold font-serif text-neutral-800 flex items-center gap-1.5">
                                    <Wrench className="w-3.5 h-3.5 text-amber-600" />
                                    Fabrication Stage
                                  </span>
                                  <select
                                    value={ms.fabrication.status}
                                    onChange={(e) => handleUpdateProjectMilestoneField(proj.id, "fabrication", "status", e.target.value)}
                                    className="text-[10px] font-bold font-mono uppercase bg-white border border-neutral-300 rounded px-1.5 py-0.5 cursor-pointer text-neutral-700"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="delayed">Delayed</option>
                                  </select>
                                </div>

                                {/* Date Comparison Row */}
                                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-white p-2 rounded-lg border border-neutral-200/80 shadow-2xs">
                                  <div>
                                    <span className="text-neutral-400 block uppercase font-sans text-[8px] font-bold">Expected Date</span>
                                    <input
                                      type="date"
                                      value={ms.fabrication.expectedDate}
                                      onChange={(e) => handleUpdateProjectMilestoneField(proj.id, "fabrication", "expectedDate", e.target.value)}
                                      className="w-full font-bold text-neutral-800 bg-transparent border-b border-dashed border-neutral-300 focus:border-gold py-0.5 text-[10px] cursor-pointer"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-neutral-400 block uppercase font-sans text-[8px] font-bold">Actual / Forecast</span>
                                    <input
                                      type="date"
                                      value={ms.fabrication.actualDate}
                                      onChange={(e) => handleUpdateProjectMilestoneField(proj.id, "fabrication", "actualDate", e.target.value)}
                                      className="w-full font-bold text-neutral-800 bg-transparent border-b border-dashed border-neutral-300 focus:border-gold py-0.5 text-[10px] cursor-pointer"
                                    />
                                  </div>
                                </div>

                                {/* Progress Slider */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[10px] font-mono">
                                    <span className="text-neutral-500 font-sans text-[9px] uppercase font-bold">CNC / Edge Progress</span>
                                    <span className="font-bold text-neutral-800">{ms.fabrication.progressPct}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={ms.fabrication.progressPct}
                                    onChange={(e) => handleUpdateProjectMilestoneField(proj.id, "fabrication", "progressPct", Number(e.target.value))}
                                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-neutral-200 rounded-lg"
                                  />
                                </div>
                              </div>

                              {/* READY FOR INSTALL MILESTONE CARD */}
                              <div className={`p-3 rounded-xl border space-y-2.5 transition-all ${
                                ms.readyForInstall.status === "completed" ? "bg-emerald-50/60 border-emerald-200" :
                                ms.readyForInstall.status === "in-progress" ? "bg-sky-50/60 border-sky-200" :
                                ms.readyForInstall.status === "delayed" ? "bg-red-50/60 border-red-200" :
                                "bg-neutral-50 border-neutral-200"
                              }`}>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold font-serif text-neutral-800 flex items-center gap-1.5">
                                    <Truck className="w-3.5 h-3.5 text-sky-600" />
                                    Ready for Install Stage
                                  </span>
                                  <select
                                    value={ms.readyForInstall.status}
                                    onChange={(e) => handleUpdateProjectMilestoneField(proj.id, "readyForInstall", "status", e.target.value)}
                                    className="text-[10px] font-bold font-mono uppercase bg-white border border-neutral-300 rounded px-1.5 py-0.5 cursor-pointer text-neutral-700"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="delayed">Delayed</option>
                                  </select>
                                </div>

                                {/* Date Comparison Row */}
                                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-white p-2 rounded-lg border border-neutral-200/80 shadow-2xs">
                                  <div>
                                    <span className="text-neutral-400 block uppercase font-sans text-[8px] font-bold">Expected Date</span>
                                    <input
                                      type="date"
                                      value={ms.readyForInstall.expectedDate}
                                      onChange={(e) => handleUpdateProjectMilestoneField(proj.id, "readyForInstall", "expectedDate", e.target.value)}
                                      className="w-full font-bold text-neutral-800 bg-transparent border-b border-dashed border-neutral-300 focus:border-gold py-0.5 text-[10px] cursor-pointer"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-neutral-400 block uppercase font-sans text-[8px] font-bold">Actual / Forecast</span>
                                    <input
                                      type="date"
                                      value={ms.readyForInstall.actualDate}
                                      onChange={(e) => handleUpdateProjectMilestoneField(proj.id, "readyForInstall", "actualDate", e.target.value)}
                                      className="w-full font-bold text-neutral-800 bg-transparent border-b border-dashed border-neutral-300 focus:border-gold py-0.5 text-[10px] cursor-pointer"
                                    />
                                  </div>
                                </div>

                                {/* Progress Slider */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[10px] font-mono">
                                    <span className="text-neutral-500 font-sans text-[9px] uppercase font-bold">Site / Crane Assembly</span>
                                    <span className="font-bold text-neutral-800">{ms.readyForInstall.progressPct}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={ms.readyForInstall.progressPct}
                                    onChange={(e) => handleUpdateProjectMilestoneField(proj.id, "readyForInstall", "progressPct", Number(e.target.value))}
                                    className="w-full accent-sky-600 cursor-pointer h-1.5 bg-neutral-200 rounded-lg"
                                  />
                                </div>
                              </div>

                            </div>

                            {/* DIGITAL SIGNOFF CERTIFICATE DISPLAY */}
                            {proj.digitalSignoff ? (
                              <div className="bg-gradient-to-r from-emerald-950 via-neutral-900 to-emerald-950 text-white p-3.5 rounded-xl border border-emerald-500/40 shadow-sm space-y-2">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-emerald-500/20 pb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                                      <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-mono font-bold tracking-widest text-emerald-400 uppercase block">Digital Certificate Verified</span>
                                      <h5 className="text-xs font-bold font-serif text-white">Client Installation Sign-Off</h5>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-900/60 border border-emerald-700/50 px-2 py-0.5 rounded">
                                      {proj.digitalSignoff.timestamp}
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-xs">
                                  <div>
                                    <span className="text-[9px] text-neutral-400 font-mono block uppercase">Signatory</span>
                                    <strong className="text-emerald-200 text-xs block">{proj.digitalSignoff.signatoryName}</strong>
                                    <span className="text-[10px] text-neutral-400 block">{proj.digitalSignoff.signatoryRole}</span>
                                  </div>

                                  <div>
                                    <span className="text-[9px] text-neutral-400 font-mono block uppercase">Craftsmanship Rating</span>
                                    <div className="flex items-center gap-1 text-amber-400">
                                      {Array.from({ length: proj.digitalSignoff.rating || 5 }).map((_, i) => (
                                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                                      ))}
                                      <span className="text-[10px] font-mono text-neutral-300 ml-1">({proj.digitalSignoff.rating}/5)</span>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-start sm:items-end">
                                    <span className="text-[9px] text-neutral-400 font-mono block uppercase mb-0.5">Signature Seal</span>
                                    {proj.digitalSignoff.signatureDataUrl ? (
                                      <div className="bg-white/95 p-1 rounded border border-emerald-300/40 shadow-xs">
                                        <img src={proj.digitalSignoff.signatureDataUrl} alt="Digital Signature" className="h-7 max-w-[140px] object-contain" />
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-emerald-300 font-mono font-bold">Signed & Certified</span>
                                    )}
                                  </div>
                                </div>

                                {proj.digitalSignoff.notes && (
                                  <div className="flex justify-between items-center pt-1 border-t border-emerald-500/20 text-[10px]">
                                    <span className="text-emerald-200/80 italic line-clamp-1 font-sans">"{proj.digitalSignoff.notes}"</span>
                                    <button
                                      onClick={() => setSignoffModalProject(proj)}
                                      className="text-emerald-300 hover:text-white font-mono font-bold underline cursor-pointer whitespace-nowrap ml-2"
                                    >
                                      View Certificate
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : proj.status === "Completed" ? (
                              <div className="bg-amber-50/80 border border-amber-300/70 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                                    <PenTool className="w-4 h-4 text-amber-700" />
                                  </div>
                                  <div>
                                    <h5 className="text-xs font-bold text-amber-950 font-serif">Awaiting Client Digital Sign-Off</h5>
                                    <p className="text-[10px] text-amber-800">Project installation is completed. Client can now digitally sign off on installation.</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setSignoffModalProject(proj)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md w-full sm:w-auto justify-center transition-all whitespace-nowrap animate-pulse ring-2 ring-emerald-400/80 ring-offset-1"
                                >
                                  <PenTool className="w-3.5 h-3.5" /> Digital Sign-off
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Bottom Action buttons */}
                    <div className="border-t border-neutral-100 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                      <div className="flex items-baseline gap-1.5 self-start">
                        <span className="text-[10px] font-mono text-neutral-400 uppercase">Valued at:</span>
                        <strong className="text-lg font-mono font-bold text-neutral-800">
                          {formatCurrency(totalProjValue)}
                        </strong>
                      </div>

                      <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                        {proj.status === "Completed" && (
                          <button
                            onClick={() => setSignoffModalProject(proj)}
                            className={`flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                              !proj.digitalSignoff ? 'animate-pulse ring-2 ring-emerald-400/80 ring-offset-1' : ''
                            }`}
                            title="Open Digital Installation Sign-Off Overlay"
                          >
                            <PenTool className="w-3.5 h-3.5 text-white" />
                            {proj.digitalSignoff ? "Signed Certificate" : "Digital Sign-off"}
                          </button>
                        )}

                        <button
                          onClick={() => setPdfProject(proj)}
                          className="flex-1 sm:flex-none bg-neutral-900 hover:bg-gold hover:text-neutral-950 text-white px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Generate & Export Client PDF Proposal"
                        >
                          <FileDown className="w-3.5 h-3.5 text-gold" /> Export PDF
                        </button>

                        <button
                          onClick={() => handleLoadProjectEstimate(proj)}
                          className="flex-1 sm:flex-none border border-neutral-300 hover:border-gold text-neutral-700 hover:text-gold px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5" /> Adjust Layout
                        </button>

                        <button
                          onClick={() => {
                            setBulkImportTargetProjectId(proj.id);
                            setShowBulkImportModal(true);
                          }}
                          className="flex-1 sm:flex-none border border-neutral-300 hover:border-[#D4AF37] text-neutral-700 hover:text-black hover:bg-[#D4AF37]/10 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Paste raw dimensions from Excel or CSV clipboard into this project estimate"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#D4AF37]" /> Bulk Paste
                        </button>

                        <button
                          onClick={() => setActiveTab("site-readiness")}
                          className="flex-1 sm:flex-none border border-gold/40 bg-gold/5 hover:bg-gold hover:text-neutral-950 text-neutral-800 px-3 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Site Readiness Protocol Check"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-gold" /> Site Audit
                        </button>
                        <button
                          onClick={() => handleDeleteProject(proj.id)}
                          className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete/Archive Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}

              {/* EMPTY STATE WHEN NO PROJECTS MATCH FILTERS */}
              {filteredProjects.length === 0 && (
                <div className="col-span-full py-16 px-6 text-center text-neutral-500 bg-white border border-neutral-200 rounded-2xl space-y-4 shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center">
                    <Search className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h4 className="font-serif text-lg font-medium text-neutral-800">No Projects Found</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      We couldn't find any projects matching "{projectSearchQuery || projectStatusFilter}". Try clearing your search parameters or filter options.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setProjectSearchQuery("");
                      setProjectStatusFilter("All");
                    }}
                    className="bg-neutral-900 hover:bg-gold text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    Reset Search & Filters
                  </button>
                </div>
              )}
            </div>
          </div>
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW 5: LIVE AI TECHNICAL SUPPORT */}
        {/* ========================================================= */}
        {activeTab === "ai-support" && (
          <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            
            <div className="text-center space-y-2">
              <div className="flex flex-col items-center gap-1.5">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gold/10 text-gold border border-gold/30">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 animate-pulse" /> ✨ AI-Generated Output • Powered by Google Gemini
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  Data sent to AI is processed securely via Google Gemini cloud models under SMC Pro privacy guidelines.
                </span>
              </div>
              <h3 className="font-serif text-3xl text-[#1A1A1A] font-medium">AI Technical Advisor</h3>
              <p className="text-sm text-neutral-500 max-w-lg mx-auto">
                Consult on complex slab fabrication guidelines, cutting feed rates, relief profiles, outdoor suitability and chemical resistance indexes.
              </p>
            </div>

            {/* CHAT INTERFACE PANEL */}
            <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col h-[520px]">
              
              {/* Advisor Header status */}
              <div className="px-5 py-4 bg-neutral-50 border-b border-neutral-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gold-light border border-gold/40 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-800">SMC PRO Engineer</span>
                    <span className="text-[10px] text-neutral-400 block font-mono">Expert System Powered by Gemini 3.5</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (confirm("Reset current conversation memory?")) {
                      setChatMessages([
                        {
                          id: "chat-welcome",
                          role: "assistant",
                          content: "Welcome to the SMC PRO Technical Advisory Panel. I have access to full engineering guidelines, abrasive metrics, water-absorption rates, and structural thresholds for Quartz, Porcelain, and Natural Stone. How can I assist you with your fabrication layout or material specifications today?",
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                      ]);
                    }
                  }}
                  className="p-1.5 text-neutral-400 hover:text-[#1A1A1A] hover:bg-neutral-100 rounded transition-colors"
                  title="Clear Chat"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Message Scroll */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#FBFBFA]/50">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] rounded-lg p-4 space-y-2 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-white border border-neutral-200 text-neutral-700"
                    }`}>
                      <div className="flex items-center justify-between gap-4 font-semibold text-[9px] uppercase tracking-wider opacity-60">
                        <span>{msg.role === "user" ? "Partner Contractor" : "SMC Advisory Engineer"}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div className="whitespace-pre-line font-sans">{msg.content}</div>
                    </div>
                  </div>
                ))}

                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-2 max-w-[85%]">
                      <div className="flex items-center gap-1.5 text-gold text-[10px] font-bold uppercase tracking-wider animate-pulse">
                        <Sliders className="w-3.5 h-3.5 animate-spin" /> Analyzing mineral properties...
                      </div>
                      <div className="flex gap-1.5 py-1">
                        <div className="w-2.5 h-2.5 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2.5 h-2.5 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2.5 h-2.5 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Quick Chips for easy asking */}
              <div className="px-5 py-3 bg-neutral-50/80 border-t border-neutral-100 flex overflow-x-auto gap-2 no-scrollbar">
                <button
                  onClick={() => handleSendChatMessage(undefined, "What is the recommended diamond blade for cutting Statuario Porcelain slabs?")}
                  className="shrink-0 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-full px-3 py-1.5 text-[10px] font-semibold text-neutral-700 transition-colors"
                >
                  ⚡ Porcelain blades
                </button>
                <button
                  onClick={() => handleSendChatMessage(undefined, "How do I avoid stress cracks when fabricating a kitchen sink cutout in Taj Mahal Quartzite?")}
                  className="shrink-0 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-full px-3 py-1.5 text-[10px] font-semibold text-neutral-700 transition-colors"
                >
                  ⚡ Quartzite sink cutouts
                </button>
                <button
                  onClick={() => handleSendChatMessage(undefined, "Is Calacatta Gold Quartz suitable for an outdoor barbecue kitchen countertop?")}
                  className="shrink-0 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-full px-3 py-1.5 text-[10px] font-semibold text-neutral-700 transition-colors"
                >
                  ⚡ Outdoor UV limits
                </button>
              </div>

              {/* Message Input Bar */}
              <form onSubmit={handleSendChatMessage} className="p-4 bg-white border-t border-neutral-200 flex gap-2">
                <input
                  id="chat-message-input"
                  type="text"
                  placeholder="Ask a technical stone advisory question..."
                  value={inputMessage}
                  disabled={isAiLoading}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-3 text-xs transition-all disabled:opacity-60 font-medium"
                />
                <button
                  id="chat-submit-btn"
                  type="submit"
                  disabled={isAiLoading || !inputMessage.trim()}
                  className="bg-[#1A1A1A] hover:bg-gold disabled:bg-neutral-200 text-white disabled:text-neutral-400 p-3 rounded transition-colors flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 6: SMC VISION AR VIEWPORT (INTERACTIVE SIMULATOR) */}
        {/* ========================================================= */}
        {activeTab === "vision" && (
          <div className="space-y-6 animate-fade-in">
            {/* SEGMENT TOGGLE */}
            <div className="flex bg-neutral-100 p-1 rounded-lg self-start max-w-md">
              <button 
                onClick={() => setVisionMode("simulator")} 
                className={`px-4 py-2 rounded text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-2 ${visionMode === "simulator" ? "bg-white text-gold shadow-sm font-bold" : "text-[#1A1A1A] hover:text-neutral-800"}`}
              >
                <span className="material-symbols-outlined text-sm">view_in_ar</span>
                📱 Live AR Simulator
              </button>
              <button 
                onClick={() => setVisionMode("blueprint")} 
                className={`px-4 py-2 rounded text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-2 ${visionMode === "blueprint" ? "bg-white text-gold shadow-sm font-bold" : "text-[#1A1A1A] hover:text-neutral-800"}`}
              >
                <span className="material-symbols-outlined text-sm">architecture</span>
                📋 Technical Blueprints & Lot Details
              </button>
            </div>

            {/* SCAN HISTORY SECTION */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-150 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-neutral-900 text-gold rounded-lg shadow-xs">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif text-lg font-medium text-neutral-900">Scan History</h4>
                      <span className="text-[9px] font-mono bg-gold/15 text-gold border border-gold/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Last {scanHistory.length} / 5
                      </span>
                      <span className="text-[9px] font-mono bg-neutral-100 text-neutral-700 border border-neutral-250 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        {scanSortOrder === "newest" ? "Newest First" : "Oldest First"}
                      </span>
                      {(() => {
                        const lotCounts = scanHistory.reduce((acc, curr) => {
                          const l = curr.lot.toUpperCase();
                          acc[l] = (acc[l] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>);
                        const hasDuplicates = Object.values(lotCounts).some(c => Number(c) > 1);
                        return hasDuplicates ? (
                          <span className="text-[9px] font-mono bg-red-100 text-red-700 border border-red-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse" title="Redundant Lot IDs detected in current session history">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            <span>Duplicate Scans Warning</span>
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <p className="text-xs text-neutral-500">Tracks recent Slab Lot ID scans for quick recall in SMC Vision. Saved to localStorage.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Quick Manual Scan Input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const val = (formData.get("quickScanLot") as string || "").trim();
                      if (val) {
                        handleScanLotId(val);
                        e.currentTarget.reset();
                      }
                    }}
                    className="flex items-center gap-1.5 flex-1 sm:flex-initial"
                  >
                    <div className="relative flex-1 sm:w-48">
                      <input
                        name="quickScanLot"
                        type="text"
                        placeholder="Scan Lot ID (e.g. B8492-V2)"
                        className="w-full bg-neutral-50 border border-neutral-300 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded-lg pl-3 pr-2 py-1.5 text-xs font-mono font-semibold uppercase text-neutral-800 placeholder:text-neutral-400 font-sans"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-neutral-900 hover:bg-gold text-white hover:text-neutral-950 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-gold" />
                      Scan
                    </button>
                  </form>

                  {scanHistory.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={toggleScanSortOrder}
                        className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all border border-neutral-300 cursor-pointer shrink-0"
                        title={`Current sort: ${scanSortOrder === "newest" ? "Newest First" : "Oldest First"}. Click to toggle.`}
                      >
                        <ArrowUpDown className="w-3.5 h-3.5 text-gold" />
                        <span>Sort: {scanSortOrder === "newest" ? "Newest" : "Oldest"}</span>
                      </button>
                      <button
                        onClick={clearScanHistory}
                        className="text-neutral-400 hover:text-red-500 p-1.5 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
                        title="Clear Scan History"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Scan History Items Cards */}
              {scanHistory.length === 0 ? (
                <div className="text-center py-6 bg-neutral-50 rounded-lg border border-dashed border-neutral-200 space-y-2">
                  <QrCode className="w-6 h-6 text-neutral-300 mx-auto animate-pulse" />
                  <p className="text-xs text-neutral-500 font-medium">No recent slab lot scans logged.</p>
                  <p className="text-[10px] text-neutral-400">Scan a slab barcode or enter a Lot ID above to build your quick recall history.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {(() => {
                    const lotCounts = scanHistory.reduce((acc, curr) => {
                      const l = curr.lot.toUpperCase();
                      acc[l] = (acc[l] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);

                    return (scanSortOrder === "newest" ? scanHistory : [...scanHistory].reverse()).map((item, idx) => {
                      const activeSlab = VISION_SLABS.find(s => s.id === activeVisionSlabId);
                      const isCurrentlyActive = activeSlab?.lot.toUpperCase() === item.lot.toUpperCase();
                      const scanCount = lotCounts[item.lot.toUpperCase()] || 1;
                      const isDuplicate = scanCount > 1;

                      return (
                        <div
                          key={item.id || idx}
                          onClick={() => handleRecallScan(item)}
                          className={`group relative p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2 ${
                            isDuplicate
                              ? isCurrentlyActive
                                ? "bg-red-950 text-white border-red-500 ring-2 ring-red-500/80 shadow-md"
                                : "bg-red-50/90 text-neutral-900 border-red-400 hover:border-red-600 ring-1 ring-red-300/80 shadow-xs"
                              : isCurrentlyActive
                                ? "bg-neutral-950 text-white border-gold shadow-md ring-1 ring-gold/50"
                                : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200 hover:border-gold/60 shadow-2xs"
                          }`}
                        >
                          {/* Top Header Row */}
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded ${
                              isDuplicate
                                ? "bg-red-600 text-white font-black flex items-center gap-1 shadow-2xs"
                                : isCurrentlyActive
                                  ? "bg-gold text-neutral-950"
                                  : "bg-gold/15 text-gold border border-gold/30"
                            }`}>
                              {item.lot}
                            </span>
                            {isDuplicate ? (
                              <span
                                className="text-[9px] font-mono font-bold text-red-600 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse shrink-0"
                                title={`Warning: Lot ID ${item.lot} has been scanned ${scanCount} times in this session.`}
                              >
                                <AlertTriangle className="w-3 h-3 text-red-600" />
                                <span>DUPLICATE ({scanCount}x)</span>
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-neutral-400">
                                {item.scannedAt}
                              </span>
                            )}
                          </div>

                          {/* Item Name & Class */}
                          <div>
                            <h5 className={`font-serif text-sm font-semibold truncate ${
                              isDuplicate
                                ? isCurrentlyActive ? "text-white" : "text-red-950 font-bold"
                                : isCurrentlyActive ? "text-white" : "text-neutral-900"
                            }`}>
                              {item.slabName}
                            </h5>
                            {item.class && (
                              <span className={`text-[9px] font-mono block uppercase truncate ${
                                isDuplicate
                                  ? isCurrentlyActive ? "text-red-200" : "text-red-700 font-semibold"
                                  : isCurrentlyActive ? "text-neutral-400" : "text-neutral-500"
                              }`}>
                                {item.class}
                              </span>
                            )}
                          </div>

                          {/* Footer Action */}
                          <div className={`pt-1 flex items-center justify-between text-[10px] ${
                            isDuplicate ? "border-t border-red-200" : "border-t border-neutral-200/40"
                          }`}>
                            <span className={`font-mono flex items-center gap-1 font-bold ${
                              isDuplicate
                                ? "text-red-600"
                                : isCurrentlyActive ? "text-gold" : "text-neutral-500 group-hover:text-gold"
                            }`}>
                              {isDuplicate ? (
                                <>
                                  <AlertTriangle className="w-3 h-3 text-red-600" />
                                  <span>REDUNDANT SCAN</span>
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="w-3 h-3" />
                                  {isCurrentlyActive ? "ACTIVE SLAB" : "QUICK RECALL"}
                                </>
                              )}
                            </span>
                            <span className="material-symbols-outlined text-xs group-hover:translate-x-0.5 transition-transform">
                              arrow_forward
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* DYNAMIC CORE CONTENT */}
            <div id="vision-viewport-core" className="text-neutral-800 space-y-8">
              {(() => {
                const activeSlab = VISION_SLABS.find(s => s.id === activeVisionSlabId) || VISION_SLABS[0];

                if (visionMode === "simulator") {
                  return (
                    <div className="space-y-8">
                      {/* HEADER INFO */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-200 pb-4 gap-4">
                        <div>
                          <span className="text-[10px] font-bold text-gold uppercase tracking-[0.25em] block">SMC LIVE VISION AI v5.2</span>
                          <h3 className="font-serif text-3xl font-light text-[#1A1A1A]">AI AR Surface Visualizer</h3>
                          <p className="text-xs text-neutral-500 mt-1">Simulate premium porcelain and exotic natural slabs directly on client countertop templates with adaptive environmental filters.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setActiveTab("measure-tool")}
                            className="bg-[#1A1A1A] hover:bg-gold text-gold hover:text-neutral-950 border border-gold px-3.5 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5 text-gold animate-pulse" />
                            Launch AR Measure Tool
                          </button>
                          <button
                            onClick={() => setShowQrScanner(true)}
                            className="bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 hover:border-gold hover:text-gold px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5 text-gold animate-pulse" />
                            Scan QR Code
                          </button>
                          <button
                            onClick={() => setShowScannerTips(true)}
                            className="bg-neutral-950 hover:bg-neutral-800 text-gold border border-gold/40 px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-gold" />
                            Show Scanner Tips
                          </button>
                          <button
                            onClick={() => setVisionSurfaceLocked(!visionSurfaceLocked)}
                            className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border transition-all ${
                              visionSurfaceLocked
                                ? "bg-neutral-900 border-neutral-900 text-gold"
                                : "bg-white border-neutral-200 text-neutral-500 hover:border-gold hover:text-gold"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${visionSurfaceLocked ? "bg-gold animate-pulse" : "bg-neutral-300"}`}></span>
                            SURFACE: {visionSurfaceLocked ? "LOCKED (1:1)" : "LOCKING..."}
                          </button>
                        </div>
                      </div>

                      {/* SPLIT ENVIRONMENT GRID */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* COLS 1 & 2: INTERACTIVE CAMERA STAGE */}
                        <div className="lg:col-span-2 space-y-4">
                          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-neutral-200 shadow-md bg-neutral-950 select-none group">
                            {/* Live Kitchen Camera Background */}
                            <div 
                              className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 scale-105"
                              style={{ 
                                backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDoDH2dqilhLhprOz9ZX3_LtCC7bsUqBFq_t5HxE15fDwjz94mMF-hA-jo4VLjliySRzCeh1kuFqGv3ZOuqogb8SS0dIhw2hHU4e4UaZWQuFMdfOgus01E4bLTSm2mbhV3Rb_O4xybEU1HfTVlDUIqPmk4M1lTgfcqbtphk7pb5FByyZU3t6CMp9H-Cg1L6qwMczElPrzGVa4ELZbI3uyogy3OReXsKwZiBYFnYqEdrefk3sceQdyFXPMI-5uYWGyDT-jMcu575jP8')",
                                filter: 
                                  visionLightingMode === "morning" ? "sepia(0.2) saturate(1.1) brightness(0.95) contrast(1.02)" :
                                  visionLightingMode === "evening" ? "brightness(0.7) contrast(1.15) saturate(0.8) hue-rotate(330deg)" :
                                  "brightness(1.0) contrast(1.05) saturate(1.0)"
                              }}
                            />

                            {/* PERSPECTIVE COUNTERTOP OVERLAY WITH GRADIENT veining */}
                            <div className="absolute inset-0 z-10 pointer-events-none">
                              {/* Perspective Matched Countertop Body */}
                              <div 
                                className="absolute top-1/2 left-1/4 w-[60%] h-[30%] border-[2px] border-gold rounded-lg glass-panel opacity-90 flex items-center justify-center transform -rotate-12 translate-y-10 overflow-hidden shadow-2xl transition-all duration-500 relative"
                                style={{
                                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
                                }}
                              >
                                {/* ROTATING MATERIAL PATTERN LAYER */}
                                <div
                                  className="absolute inset-[-60%] bg-cover bg-center transition-transform duration-300"
                                  style={{
                                    backgroundImage: `url(${activeSlab.img})`,
                                    transform: `rotate(${visionPatternRotation}deg)`,
                                    transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                                  }}
                                />

                                {/* AR Custom Scan line inside */}
                                <div className="ar-scan-line-custom z-10 pointer-events-none" />
                                <div className="absolute inset-0 shimmer-custom pointer-events-none z-10" />

                                {/* ROTATION HANDLE OVERLAY DIRECTLY ON COUNTERTOP (TOP-RIGHT CORNER) */}
                                <div className="absolute top-2 right-2 z-40 pointer-events-auto">
                                  <div className="bg-[#0A0A0A]/95 backdrop-blur-md p-2 rounded-xl border-2 border-gold/80 shadow-[0_0_25px_rgba(212,175,55,0.5)] flex items-center gap-2.5 group transition-all hover:scale-105 select-none">
                                    {/* ROTATING COMPASS DIAL HANDLE WITH ANGLE DEGREE EMBEDDED & DIRECTLY BELOW */}
                                    <div className="flex flex-col items-center gap-1">
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setVisionPatternRotation((prev) => (prev + 90) % 360);
                                        }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          const target = e.currentTarget as HTMLElement;
                                          const rect = target.getBoundingClientRect();
                                          const centerX = rect.left + rect.width / 2;
                                          const centerY = rect.top + rect.height / 2;

                                          const onMouseMove = (moveEvent: MouseEvent) => {
                                            const dx = moveEvent.clientX - centerX;
                                            const dy = moveEvent.clientY - centerY;
                                            const angleRad = Math.atan2(dy, dx);
                                            let deg = (angleRad * (180 / Math.PI) + 90 + 360) % 360;
                                            const isFineTune = moveEvent.shiftKey || moveEvent.altKey || moveEvent.ctrlKey || moveEvent.metaKey;
                                            const finalAngle = isFineTune ? Math.round(deg) % 360 : (Math.round(deg / 90) * 90) % 360;
                                            setVisionPatternRotation(finalAngle);
                                          };

                                          const onMouseUp = () => {
                                            window.removeEventListener("mousemove", onMouseMove);
                                            window.removeEventListener("mouseup", onMouseUp);
                                          };
                                          window.addEventListener("mousemove", onMouseMove);
                                          window.addEventListener("mouseup", onMouseUp);
                                        }}
                                        onTouchStart={(e) => {
                                          e.stopPropagation();
                                          const target = e.currentTarget as HTMLElement;
                                          const rect = target.getBoundingClientRect();
                                          const centerX = rect.left + rect.width / 2;
                                          const centerY = rect.top + rect.height / 2;

                                          const onTouchMove = (moveEvent: TouchEvent) => {
                                            const touch = moveEvent.touches[0];
                                            const dx = touch.clientX - centerX;
                                            const dy = touch.clientY - centerY;
                                            const angleRad = Math.atan2(dy, dx);
                                            let deg = (angleRad * (180 / Math.PI) + 90 + 360) % 360;
                                            const isFineTune = moveEvent.shiftKey || moveEvent.altKey || moveEvent.ctrlKey || moveEvent.metaKey;
                                            const finalAngle = isFineTune ? Math.round(deg) % 360 : (Math.round(deg / 90) * 90) % 360;
                                            setVisionPatternRotation(finalAngle);
                                          };

                                          const onTouchEnd = () => {
                                            window.removeEventListener("touchmove", onTouchMove);
                                            window.removeEventListener("touchend", onTouchEnd);
                                          };
                                          window.addEventListener("touchmove", onTouchMove, { passive: true });
                                          window.addEventListener("touchend", onTouchEnd);
                                        }}
                                        className="relative w-11 h-11 rounded-full bg-neutral-950 border-2 border-gold flex items-center justify-center cursor-grab active:cursor-grabbing hover:border-amber-300 hover:bg-black transition-transform duration-300 shadow-xl group/dial ring-2 ring-gold/40 hover:ring-gold select-none"
                                        style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                                        title="Drag handle overlay to rotate (Snap 90° standard, or hold Shift/Alt for 1° fine precision)"
                                      >
                                        {/* Rotating Pointer Needle with Smooth Snap Spring Animation */}
                                        <div
                                          className="absolute inset-0.5 flex items-start justify-center transition-transform duration-500 pointer-events-none"
                                          style={{
                                            transform: `rotate(${visionPatternRotation}deg)`,
                                            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)"
                                          }}
                                        >
                                          <div className="w-1.5 h-3 bg-gold rounded-full shadow-[0_0_10px_rgba(212,175,55,1)] animate-pulse" />
                                        </div>

                                        {/* Prominent Gold Angle Readout inside Control */}
                                        <div className="relative z-10 flex items-center justify-center bg-neutral-900/90 px-1.5 py-0.5 rounded-full border border-gold/40 shadow-inner">
                                          <span className="font-mono font-black text-xs text-gold drop-shadow-[0_0_6px_rgba(212,175,55,0.7)] tracking-tight">
                                            {visionPatternRotation}°
                                          </span>
                                        </div>
                                      </div>

                                      {/* Active Angle Degree Badge directly beneath handle icon */}
                                      <div className="bg-gold text-neutral-950 font-mono font-black text-[10px] px-2 py-0.5 rounded shadow-md border border-amber-300 tracking-tight leading-none text-center font-extrabold">
                                        {visionPatternRotation}°
                                      </div>
                                    </div>

                                    {/* PROMINENT DEGREE READOUT BADGE WITH MAGNETIC SNAP ANIMATION */}
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const step = (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) ? 1 : 90;
                                        setVisionPatternRotation((prev) => (prev + step) % 360);
                                      }}
                                      className="cursor-pointer flex flex-col items-start pr-1 select-none"
                                      title="Click to advance angle (90° standard, or hold Shift for 1° fine step)"
                                    >
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="text-[8px] font-mono tracking-widest text-neutral-400 uppercase font-extrabold leading-none">
                                          VEIN DIRECTION
                                        </span>
                                        <span className="text-[8px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1 py-0.2 rounded font-black uppercase tracking-tighter animate-pulse">
                                          {![0, 90, 180, 270].includes(visionPatternRotation) ? "FINE 1° PRECISION" : "SNAP 90° (SHIFT: 1°)"}
                                        </span>
                                        <span className="text-[8px] font-mono bg-neutral-900 text-gold/90 border border-gold/30 px-1.5 py-0.2 rounded font-extrabold tracking-tighter" title="Keyboard Shortcuts Active: ←/→ Arrow Keys rotate 90°, Shift+←/→ rotates 1°, R resets to 0°">
                                          ⌨️ ← / →
                                        </span>
                                      </div>

                                      {/* PROMINENT GOLD BADGE FOR ANGLE DEGREE */}
                                      <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded-md bg-gold text-neutral-950 font-mono font-black text-sm tracking-tight shadow-md transition-all duration-300 scale-100 hover:scale-105 border border-amber-300">
                                          {visionPatternRotation}°
                                        </span>
                                        <span className="text-[10px] font-mono font-bold text-gold uppercase tracking-wider">
                                          {visionPatternRotation === 0 && "Standard Flow"}
                                          {visionPatternRotation === 90 && "Transverse Cut"}
                                          {visionPatternRotation === 180 && "Inverted Grain"}
                                          {visionPatternRotation === 270 && "Reverse Cut"}
                                          {![0, 90, 180, 270].includes(visionPatternRotation) && "Custom Grain Alignment"}
                                        </span>
                                      </div>
                                    </div>

                                    {/* QUICK STEP & RESET BUTTONS */}
                                    <div className="flex items-center gap-1.5 border-l border-neutral-800 pl-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const step = (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) ? 1 : 90;
                                          setVisionPatternRotation((prev) => (prev - step + 360) % 360);
                                        }}
                                        className="p-1.5 rounded-md bg-neutral-900 hover:bg-gold hover:text-neutral-950 text-gold border border-gold/30 transition-all cursor-pointer shadow-xs"
                                        title="Rotate Counter-Clockwise (90°, or Hold Shift for 1° fine step)"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const step = (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) ? 1 : 90;
                                          setVisionPatternRotation((prev) => (prev + step) % 360);
                                        }}
                                        className="p-1.5 rounded-md bg-neutral-900 hover:bg-gold hover:text-neutral-950 text-gold border border-gold/30 transition-all cursor-pointer shadow-xs"
                                        title="Rotate Clockwise (90°, or Hold Shift for 1° fine step)"
                                      >
                                        <RotateCw className="w-3.5 h-3.5" />
                                      </button>

                                      {/* SMOOTH 0° RESET PATTERN BUTTON */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setVisionPatternRotation(0);
                                        }}
                                        disabled={visionPatternRotation === 0}
                                        className={`px-2.5 py-1.5 rounded-md text-[9px] font-mono font-bold tracking-wider transition-all flex items-center gap-1 border shadow-xs ${
                                          visionPatternRotation === 0
                                            ? "bg-neutral-900/60 text-neutral-600 border-neutral-800/80 cursor-not-allowed opacity-40"
                                            : "bg-gold text-neutral-950 hover:bg-amber-300 border-amber-300 shadow-[0_0_12px_rgba(212,175,55,0.4)] cursor-pointer hover:scale-105 active:scale-95 font-extrabold"
                                        }`}
                                        title="Reset material pattern rotation back to 0° with a single click"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>RESET PATTERN</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* High-Tech Floating Dimension Tags */}
                                <div className="absolute top-2 left-4 bg-black/80 px-2 py-0.5 rounded text-[8px] font-mono tracking-widest text-gold border border-gold/30 z-20">
                                  L: 3200mm
                                </div>
                                <div className="absolute bottom-2 right-4 bg-black/80 px-2 py-0.5 rounded text-[8px] font-mono tracking-widest text-gold border border-gold/30 z-20">
                                  W: 1200mm
                                </div>
                              </div>
                            </div>

                            {/* CENTER FIXED ALIGNMENT RETICLE */}
                            <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                              <div className="w-24 h-24 border border-gold/40 rounded-full flex items-center justify-center">
                                <div className="w-1 h-1 bg-gold rounded-full shadow-[0_0_8px_rgba(212,175,55,1)]"></div>
                                <div className="absolute -top-7 bg-black/80 px-2.5 py-0.5 rounded text-[8px] font-mono tracking-widest text-gold border border-gold/30 uppercase whitespace-nowrap">
                                  ALIGNMENT: {visionSurfaceLocked ? "LOCKED" : "ALIGNED"}
                                </div>
                                <div className="absolute w-6 h-[1px] bg-gold/40 left-0 -translate-x-full"></div>
                                <div className="absolute w-6 h-[1px] bg-gold/40 right-0 translate-x-full"></div>
                                <div className="absolute h-6 w-[1px] bg-gold/40 top-0 -translate-y-full"></div>
                                <div className="absolute h-6 w-[1px] bg-gold/40 bottom-0 translate-y-full"></div>
                              </div>
                            </div>

                            {/* INSTANT FLOATING ESTIMATE ON TOP CENTER */}
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/90 backdrop-blur-md px-4 py-2.5 rounded-lg border border-gold/40 text-center shadow-xl min-w-[200px]">
                              <span className="text-[8px] font-mono font-bold text-neutral-400 block tracking-widest uppercase">Pricing</span>
                              <span className="text-sm font-mono text-gold font-bold block mt-0.5">
                                Price on Application
                              </span>
                              <span className="text-[8px] font-mono text-neutral-400 block mt-1 uppercase">Slab: {activeSlab.name}</span>
                            </div>

                            {/* BOTTOM LEFT OVERLAY: PATTERN ROTATION SLIDER & CONTROLS */}
                            <div className="absolute bottom-4 left-4 z-20 bg-black/85 backdrop-blur-md px-3 py-2 rounded-lg border border-gold/40 text-white flex flex-wrap items-center gap-3 shadow-2xl">
                              <div className="flex items-center gap-1.5">
                                <RotateCw className="w-3.5 h-3.5 text-gold" />
                                <span className="font-mono text-[9px] text-gold tracking-widest uppercase font-bold">ROTATION:</span>
                                <span className="font-mono text-xs font-bold text-white bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700 min-w-[36px] text-center">
                                  {visionPatternRotation}°
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={0}
                                  max={270}
                                  step={90}
                                  value={visionPatternRotation}
                                  onChange={(e) => setVisionPatternRotation(Number(e.target.value))}
                                  className="w-20 sm:w-28 accent-gold bg-neutral-800 h-1.5 rounded-lg cursor-pointer"
                                  title="Rotate material pattern in 90° increments"
                                />

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setVisionPatternRotation((prev) => (prev - 90 + 360) % 360)}
                                    className="p-1 rounded bg-neutral-900 hover:bg-gold hover:text-neutral-950 text-gold border border-gold/30 transition-all cursor-pointer"
                                    title="Rotate 90° Counter-Clockwise"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setVisionPatternRotation((prev) => (prev + 90) % 360)}
                                    className="p-1 rounded bg-neutral-900 hover:bg-gold hover:text-neutral-950 text-gold border border-gold/30 transition-all cursor-pointer"
                                    title="Rotate 90° Clockwise"
                                  >
                                    <RotateCw className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* LIGHTING SELECTORS BOTTOM RIGHT */}
                            <div className="absolute bottom-4 right-4 z-20 flex gap-1.5 bg-black/80 backdrop-blur-md p-1.5 rounded-lg border border-white/10">
                              {["morning", "studio", "evening"].map((mode) => (
                                <button
                                  key={mode}
                                  onClick={() => setVisionLightingMode(mode as any)}
                                  className={`px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all ${
                                    visionLightingMode === mode ? "bg-gold text-neutral-900 font-bold" : "text-white hover:bg-white/15"
                                  }`}
                                >
                                  {mode}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* PATTERN ROTATION & MATERIAL SELECTIONS PANEL BELOW VIEWPORT */}
                          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-sm">
                            {/* DEDICATED SLAB PATTERN ROTATION SLIDER BAR */}
                            <div className="bg-neutral-950 text-white p-4 rounded-lg border border-gold/30 space-y-3">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <RotateCw className="w-4 h-4 text-gold" />
                                  <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                                    VEIN PATTERN ROTATION CONTROL
                                  </span>
                                  <span className="text-[10px] bg-gold/20 text-gold border border-gold/40 px-2 py-0.5 rounded font-mono font-bold">
                                    {visionPatternRotation}°
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-neutral-400">
                                  {visionPatternRotation === 0 && "0° - Standard Parallel Vein Flow"}
                                  {visionPatternRotation === 90 && "90° - Transverse Vertical Grain (90°)"}
                                  {visionPatternRotation === 180 && "180° - Inverted Parallel Flow (180°)"}
                                  {visionPatternRotation === 270 && "270° - Transverse Reverse Grain (270°)"}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                {/* Rotation Slider with 90° Ticks */}
                                <div className="md:col-span-7 space-y-1">
                                  <div className="flex justify-between text-[9px] font-mono text-neutral-400 font-bold px-1">
                                    <span>0°</span>
                                    <span>90°</span>
                                    <span>180°</span>
                                    <span>270°</span>
                                  </div>
                                  <input
                                    type="range"
                                    min={0}
                                    max={270}
                                    step={90}
                                    value={visionPatternRotation}
                                    onChange={(e) => setVisionPatternRotation(Number(e.target.value))}
                                    className="w-full accent-gold bg-neutral-800 h-2 rounded-lg cursor-pointer"
                                  />
                                </div>

                                {/* Quick 90° Increment Preset Buttons */}
                                <div className="md:col-span-5 flex flex-wrap gap-1.5 justify-end">
                                  {[0, 90, 180, 270].map((angle) => (
                                    <button
                                      key={angle}
                                      onClick={() => setVisionPatternRotation(angle)}
                                      className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                        visionPatternRotation === angle
                                          ? "bg-gold text-neutral-950 shadow-xs"
                                          : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-700"
                                      }`}
                                    >
                                      {angle}°
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => setVisionPatternRotation((prev) => (prev + 90) % 360)}
                                    className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-gold border border-gold/30 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                                    title="Rotate 90° Clockwise"
                                  >
                                    <RotateCw className="w-3 h-3" />
                                    <span>+90°</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-neutral-600 tracking-wider uppercase">STONE SELECTIONS</span>
                                <button
                                  onClick={() => setShowVisionFavoritesOnly(!showVisionFavoritesOnly)}
                                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                                    showVisionFavoritesOnly
                                      ? "bg-rose-600 text-white shadow-2xs font-bold"
                                      : "bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100"
                                  }`}
                                >
                                  <Heart className={`w-3 h-3 ${showVisionFavoritesOnly ? "fill-white text-white" : "fill-rose-500 text-rose-500"}`} />
                                  Favorites ({favoriteMaterialIds.length})
                                </button>
                              </div>
                              <span className="text-[9px] font-mono text-gold font-bold">CLICK TO INTERACTIVELY SWAP TEXTURES</span>
                            </div>

                            {/* Quick favorite selection buttons bar if favorites exist */}
                            {favoriteMaterialIds.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1 pb-1 border-b border-neutral-100">
                                <span className="text-[9px] font-mono text-neutral-400 uppercase font-semibold self-center mr-1">Quick Swap Favorites:</span>
                                {favoriteMaterialIds.map((favId) => {
                                  const visSlab = VISION_SLABS.find((s) => s.id === favId);
                                  const mat = MATERIALS_CATALOG.find((m) => m.id === favId);
                                  const name = visSlab?.name || mat?.name;
                                  if (!name) return null;
                                  const targetSlabId = visSlab ? visSlab.id : (VISION_SLABS.find(s => s.id.includes(mat?.class.toLowerCase() || "") || mat?.id.includes(s.id))?.id || VISION_SLABS[0].id);
                                  const isCurrent = activeVisionSlabId === targetSlabId;
                                  return (
                                    <button
                                      key={favId}
                                      onClick={() => {
                                        setActiveVisionSlabId(targetSlabId);
                                        const foundSlab = VISION_SLABS.find(s => s.id === targetSlabId);
                                        if (foundSlab) addScanToHistory(foundSlab.lot);
                                      }}
                                      className={`px-2 py-1 rounded text-[10px] font-mono border transition-all flex items-center gap-1 cursor-pointer ${
                                        isCurrent
                                          ? "bg-gold text-neutral-950 font-bold border-gold shadow-2xs"
                                          : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-gold hover:text-gold"
                                      }`}
                                    >
                                      <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                                      <span>{name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {VISION_SLABS.filter(slab => !showVisionFavoritesOnly || favoriteMaterialIds.includes(slab.id)).map((slab) => {
                                const isFav = favoriteMaterialIds.includes(slab.id);
                                return (
                                  <div
                                    key={slab.id}
                                    onClick={() => {
                                      setActiveVisionSlabId(slab.id);
                                      addScanToHistory(slab.lot);
                                    }}
                                    className={`relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02] group ${
                                      activeVisionSlabId === slab.id ? "ring-2 ring-gold border-transparent shadow-md" : "border border-neutral-200 opacity-80 hover:opacity-100"
                                    }`}
                                  >
                                    <img src={slab.img} alt={slab.name} className="w-full h-full object-cover" />
                                    
                                    {/* Favorite Toggle Button on AR Slab Card */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavoriteMaterial(slab.id);
                                      }}
                                      className={`absolute top-1.5 right-1.5 p-1 rounded-full transition-all z-20 cursor-pointer ${
                                        isFav
                                          ? "bg-white text-rose-600 border border-rose-200 shadow-xs"
                                          : "bg-black/50 text-white/80 hover:text-rose-400 hover:bg-black/80"
                                      }`}
                                      title={isFav ? "Remove from Favorites" : "Save to Favorites"}
                                    >
                                      <Heart className={`w-3 h-3 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
                                    </button>

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 flex flex-col justify-end">
                                      <h6 className="text-[10px] font-serif font-semibold text-white leading-tight truncate">{slab.name}</h6>
                                      <div className="flex justify-between items-center">
                                        <span className="text-[7px] font-mono text-gold uppercase">{slab.class}</span>
                                        {isFav && <span className="text-[8px] text-rose-400 font-mono font-bold">♥ SAVED</span>}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* COL 3: SPECIFICATIONS & ACTION CARD */}
                        <div className="space-y-6">
                          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-5">
                            <div className="border-b border-neutral-150 pb-3">
                              <span className="text-[9px] font-mono text-gold font-bold tracking-widest uppercase">ACTIVE SELECTION SPEC</span>
                              <h4 className="font-serif text-2xl text-neutral-950 font-normal mt-1">{activeSlab.name}</h4>
                              <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">{activeSlab.desc}</p>
                            </div>

                            {/* Core properties list */}
                            <div className="space-y-3">
                              <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                                <span className="text-[10px] font-mono text-neutral-400 uppercase">CLASSIFICATION</span>
                                <span className="text-xs font-semibold text-neutral-800">{activeSlab.class}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                                <span className="text-[10px] font-mono text-neutral-400 uppercase">BATCH LOT ID</span>
                                <span className="text-xs font-mono font-bold text-gold">{activeSlab.lot}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                                <span className="text-[10px] font-mono text-neutral-400 uppercase">PHYSICAL HARDNESS</span>
                                <span className="text-xs font-semibold text-neutral-800">{activeSlab.mohs}</span>
                              </div>
                            </div>

                            {/* Booking Action Buttons */}
                            <div className="pt-4 space-y-2.5">
                              <button
                                onClick={() => {
                                  setShowSurveyBookingModal(true);
                                  setBookingSuccess(false);
                                }}
                                className="w-full bg-[#1A1A1A] hover:bg-gold text-white hover:text-neutral-950 font-sans font-bold text-xs py-3.5 rounded-lg tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-sm"
                              >
                                <span className="material-symbols-outlined text-lg">calendar_month</span>
                                Book Technical Survey
                              </button>

                              <button
                                onClick={() => {
                                  if (projects.length === 0) {
                                    alert("No active projects found. Please create a project under the PROJECTS tab first.");
                                    return;
                                  }
                                  setReserveSlabSelectedProjectId(projects[0].id);
                                  setShowReserveSlabModal(true);
                                  setReserveSlabSuccessMessage(null);
                                }}
                                className="w-full bg-white border border-neutral-200 hover:border-gold text-neutral-700 hover:text-gold font-sans font-bold text-xs py-3 rounded-lg tracking-widest uppercase transition-all flex items-center justify-center gap-2"
                              >
                                <span className="material-symbols-outlined text-lg">bookmark</span>
                                Bind to Active Project
                              </button>
                            </div>
                          </div>

                          {/* TRADE ASSURANCE METRIC */}
                          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 space-y-2">
                            <div className="flex items-center gap-2 text-gold">
                              <span className="material-symbols-outlined text-lg">verified_user</span>
                              <h5 className="text-xs font-mono font-bold uppercase tracking-wider">SMC Trade Assurance</h5>
                            </div>
                            <p className="text-[11px] text-neutral-500 leading-relaxed">
                              Each batch is checked using physical ultrasonic calibration standards matching EN-14617 indices. Direct import ensures origin validation.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                {/* BLUEPRINT / LOT DETAILS MODE */}
                return (
                  <div className="space-y-8">
                    <div className="border-b border-neutral-200 pb-4">
                      <span className="text-[10px] font-bold text-gold uppercase tracking-[0.25em] block">FABRICATION PORTFOLIO</span>
                      <h3 className="font-serif text-3xl font-light text-[#1A1A1A]">Technical Specification Dossier</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* LEFT COLUMN: LARGE SPEC DISPLAY */}
                      <div className="space-y-4">
                        <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-neutral-200 shadow-sm bg-neutral-900">
                          <img src={activeSlab.img} alt={activeSlab.name} className="w-full h-full object-cover" />
                          <div className="absolute top-4 left-4 bg-black/85 px-3 py-1.5 rounded text-[10px] font-mono text-gold font-bold border border-gold/40 uppercase">
                            Lot: {activeSlab.lot}
                          </div>
                        </div>

                        <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
                          <h4 className="font-serif text-lg font-medium text-neutral-900">Architectural Suitability</h4>
                          <p className="text-xs text-neutral-600 leading-relaxed">
                            Excellent for monolithic waterfall kitchen islands, heavy-use commercial bar surfaces, elegant fireplace surrounds, and bookmatched feature cladding walls. Designed to withstand organic culinary staining and physical abrasions.
                          </p>
                          <div className="flex gap-2.5 pt-2">
                            <span className="px-2.5 py-1 text-[9px] font-mono uppercase bg-neutral-100 text-neutral-600 border border-neutral-200 rounded">EN-14617 Certified</span>
                            <span className="px-2.5 py-1 text-[9px] font-mono uppercase bg-neutral-100 text-neutral-600 border border-neutral-200 rounded">Uv Tolerant</span>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT COLUMN: DETAILED TABLE */}
                      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-6">
                        <div className="flex justify-between items-start border-b border-neutral-150 pb-3">
                          <div>
                            <span className="text-[9px] font-mono text-gold font-bold uppercase tracking-widest">BATCH ID REPORT</span>
                            <h4 className="font-serif text-2xl text-neutral-950 font-normal">{activeSlab.name} Specs</h4>
                          </div>
                          <span className="text-xs font-mono text-gold font-bold">Price on Application</span>
                        </div>

                        <div className="space-y-4 text-xs">
                          <div className="flex justify-between py-2 border-b border-neutral-100">
                            <span className="text-neutral-400 font-mono uppercase text-[10px]">Slab Block Sizes</span>
                            <strong className="text-neutral-800 font-mono">{activeSlab.dims}</strong>
                          </div>
                          <div className="flex justify-between py-2 border-b border-neutral-100">
                            <span className="text-neutral-400 font-mono uppercase text-[10px]">Mineral Hardness</span>
                            <strong className="text-neutral-800">{activeSlab.mohs}</strong>
                          </div>
                          <div className="flex justify-between py-2 border-b border-neutral-100">
                            <span className="text-neutral-400 font-mono uppercase text-[10px]">Water Absorption</span>
                            <strong className="text-neutral-800 font-mono">{activeSlab.absorption}</strong>
                          </div>
                        </div>

                        <div className="pt-4 flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => setShowQrScanner(true)}
                            className="flex-1 bg-white border border-neutral-200 hover:border-gold text-neutral-700 hover:text-gold text-xs font-sans font-bold uppercase tracking-widest py-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <QrCode className="w-4 h-4 text-gold" />
                            Scan QR Code
                          </button>
                          <button
                            onClick={() => setVisionMode("simulator")}
                            className="flex-1 bg-white border border-neutral-200 hover:border-gold text-neutral-700 hover:text-gold text-xs font-sans font-bold uppercase tracking-widest py-3 rounded-lg transition-all text-center"
                          >
                            Interactive AR Test
                          </button>
                          <button
                            onClick={() => {
                              if (projects.length === 0) {
                                alert("No active projects found. Please create a project under the PROJECTS tab first.");
                                return;
                              }
                              setReserveSlabSelectedProjectId(projects[0].id);
                              setShowReserveSlabModal(true);
                              setReserveSlabSuccessMessage(null);
                            }}
                            className="flex-1 bg-[#1A1A1A] hover:bg-gold text-white hover:text-neutral-950 text-xs font-sans font-bold uppercase tracking-widest py-3 rounded-lg transition-all text-center"
                          >
                            Reserve Slab Block
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* DYNAMIC SURVEY BOOKING CALENDAR MODAL */}
            {showSurveyBookingModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[110] animate-fade-in">
                <div className="bg-white border border-neutral-200 rounded-xl p-6 max-w-md w-full space-y-6 shadow-2xl relative">
                  <button 
                    onClick={() => setShowSurveyBookingModal(false)}
                    className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>

                  <div className="space-y-1.5 border-b border-neutral-100 pb-3">
                    <span className="text-[9px] font-mono text-gold font-bold tracking-widest uppercase block">SMC PROFESSIONAL FABRICATION</span>
                    <h3 className="font-serif text-2xl font-light text-neutral-900">Schedule Technical Survey</h3>
                    <p className="text-xs text-neutral-500">Book an on-site high-precision template survey to model edge alignments and seam vectors.</p>
                  </div>

                  {bookingSuccess ? (
                    <div className="text-center py-6 space-y-4">
                      <div className="w-14 h-14 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto border border-green-100 shadow-sm">
                        <span className="material-symbols-outlined text-3xl">check_circle</span>
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-base font-semibold text-neutral-900">Survey Slot Reserved!</h4>
                        <p className="text-xs text-neutral-500 px-2 leading-relaxed">
                          Your template and laser fabrication survey has been secured for <strong className="text-neutral-800">{bookingDate}</strong> at <strong className="text-neutral-800">{bookingTime}</strong>. An SMC expert will phone you within 24 hours.
                        </p>
                      </div>
                      <div className="pt-2 bg-neutral-50 p-3 rounded-lg border border-neutral-150 text-left space-y-1">
                        <p className="text-[10px] font-mono text-neutral-400 uppercase">SURVEY DETAILS</p>
                        <p className="text-xs text-neutral-700 font-semibold">Client Name: {bookingName || "Approved Trade Partner"}</p>
                        <p className="text-xs text-neutral-700">Phone: {bookingPhone || "Registered Contact"}</p>
                      </div>
                      <button
                        onClick={() => setShowSurveyBookingModal(false)}
                        className="bg-neutral-900 hover:bg-gold text-white font-mono uppercase tracking-widest text-[10px] px-6 py-2.5 rounded font-bold transition-all"
                      >
                        Dismiss Ticket
                      </button>
                    </div>
                  ) : (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!bookingName || !bookingPhone) {
                          alert("Please complete the Name and Telephone fields to register the slot.");
                          return;
                        }
                        setBookingSuccess(true);
                      }}
                      className="space-y-4"
                    >
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">Lead Architect / Client Name</label>
                        <input
                          type="text"
                          required
                          value={bookingName}
                          onChange={(e) => setBookingName(e.target.value)}
                          placeholder="e.g., Jonathan Mercer"
                          className="w-full bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2.5 text-xs transition-all font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">On-Site Phone Contact</label>
                        <input
                          type="tel"
                          required
                          value={bookingPhone}
                          onChange={(e) => setBookingPhone(e.target.value)}
                          placeholder="e.g., +44 7700 900077"
                          className="w-full bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2.5 text-xs transition-all font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">Preferred Date</label>
                          <input
                            type="date"
                            required
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            className="w-full bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2.5 text-xs transition-all font-semibold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">Preferred Time</label>
                          <select
                            value={bookingTime}
                            onChange={(e) => setBookingTime(e.target.value)}
                            className="w-full bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2.5 text-xs transition-all font-semibold"
                          >
                            <option value="09:00">09:00 AM (Morning)</option>
                            <option value="11:00">11:00 AM (Late Morning)</option>
                            <option value="13:30">13:30 PM (Midday)</option>
                            <option value="15:30">15:30 PM (Late Afternoon)</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setShowSurveyBookingModal(false)}
                          className="border border-neutral-200 text-neutral-500 hover:text-neutral-700 text-xs px-4 py-2 rounded-lg font-semibold uppercase tracking-wider transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-neutral-900 hover:bg-gold text-white hover:text-neutral-950 text-xs px-5 py-2.5 rounded-lg font-semibold uppercase tracking-wider transition-all"
                        >
                          Confirm & Book Survey
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* RESERVATION MODAL COMPONENT */}
            {/*
              Phase 5 Gate 0 purge: this previously showed a fabricated
              per-slab price ("£4,250" etc.) and an unsupported "A Grade
              Stock" claim, then wrote a fake "[SLAB RESERVED TICKET] ...
              successfully reserved for fabrication" confirmation directly
              into the target project's real notes and flipped its status
              to "Slab Selected" — a genuine fabricated-reservation risk,
              not just a display issue. Per the approved Gate 0 decision,
              the reservation action is disabled rather than replaced with
              pricing wording — there is no real reservation system to gate.
            */}
            {showReserveSlabModal && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in">
                <div className="bg-white border border-neutral-200 rounded-lg p-6 max-w-md w-full space-y-5 shadow-xl">

                  <div className="flex justify-between items-start border-b border-neutral-100 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-mono text-gold font-bold tracking-widest uppercase block">SLAB RESERVATIONS</span>
                      <h4 className="font-serif text-xl font-medium text-neutral-800">Reserve Slab Spec</h4>
                    </div>
                    <button
                      onClick={() => setShowReserveSlabModal(false)}
                      className="text-neutral-400 hover:text-neutral-600 font-bold"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  <p className="text-sm text-neutral-600 leading-relaxed" role="status">
                    Slab reservations are not currently available. Contact SMC to arrange a reservation for your
                    project.
                  </p>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setShowReserveSlabModal(false)}
                      className="bg-neutral-900 hover:bg-gold text-white px-5 py-2 rounded text-xs font-semibold tracking-wider uppercase transition-colors"
                    >
                      Close
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* QUICK SCAN FEATURE TOOLTIP / HELPER MODAL OVERLAY */}
            {showQuickScanTooltip && (
              <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 z-[210] animate-fade-in text-white">
                <div className="bg-[#131313] border border-[#D4AF37]/50 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl relative overflow-hidden">
                  
                  {/* Glowing header accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex justify-between items-start border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
                        <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-[#D4AF37] tracking-widest uppercase font-bold block">LOGISTICS HELPER</span>
                        <h3 className="font-serif text-lg font-bold text-white leading-none">Quick Scan Feature</h3>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowQuickScanTooltip(false)}
                      className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 hover:border-white text-neutral-400 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="font-sans text-xs text-neutral-300 leading-relaxed font-light">
                    The <strong className="text-white font-semibold">Quick Scan</strong> button activates your device's camera to immediately read physical QR labels on stone slabs across SMC yards, quarries, and warehouses.
                  </p>

                  <div className="space-y-3 bg-[#1A1A1A] p-4 rounded-xl border border-neutral-800 font-mono text-xs">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-gold text-base shrink-0 mt-0.5">verified</span>
                      <div>
                        <span className="text-white font-bold block text-[11px]">Instant Lot Specs</span>
                        <span className="text-neutral-400 text-[10px] font-sans">Identifies slab origin, Mohs hardness, density &amp; exact warehouse stock count.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 border-t border-neutral-800/80 pt-2.5">
                      <span className="material-symbols-outlined text-gold text-base shrink-0 mt-0.5">view_in_ar</span>
                      <div>
                        <span className="text-white font-bold block text-[11px]">Live AR Vein Matching</span>
                        <span className="text-neutral-400 text-[10px] font-sans">Simulate continuous grain rotation &amp; miter joints on real kitchen island layouts.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 border-t border-neutral-800/80 pt-2.5">
                      <span className="material-symbols-outlined text-gold text-base shrink-0 mt-0.5">folder_open</span>
                      <div>
                        <span className="text-white font-bold block text-[11px]">Project Pipeline Binding</span>
                        <span className="text-neutral-400 text-[10px] font-sans">Bind scanned slab numbers into active client proposals with single-click quotation sync.</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => {
                        setShowQuickScanTooltip(false);
                        setShowQrScanner(true);
                        setQrScanStatus("scanning");
                        setQrScanResult(null);
                        setQrScanError(null);
                      }}
                      className="flex-1 bg-[#D4AF37] hover:bg-[#b59226] text-black font-mono text-xs font-bold uppercase tracking-wider py-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <span className="material-symbols-outlined text-base">qr_code_scanner</span>
                      Launch Scanner Now
                    </button>
                    <button
                      onClick={() => setShowQuickScanTooltip(false)}
                      className="px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs font-bold uppercase py-3 rounded-lg transition-all cursor-pointer"
                    >
                      Got It
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* DYNAMIC QR CODE SLAB SCANNER MODAL */}
            {showQrScanner && (
              <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[200] animate-fade-in text-neutral-800">
                <div className="bg-white border border-neutral-200 rounded-xl p-5 md:p-6 max-w-2xl w-full space-y-5 shadow-2xl relative overflow-hidden max-h-[92vh] overflow-y-auto">
                  
                  {/* High tech background accent */}
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
                  
                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-neutral-100 pb-3.5 relative pr-8">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-mono text-gold font-bold tracking-widest uppercase block">SMC ADVANCED LOGISTICS</span>
                        <button
                          onClick={() => setShowScannerTips(true)}
                          className="px-2 py-0.5 bg-neutral-950 hover:bg-gold text-gold hover:text-neutral-950 border border-gold/40 rounded text-[9px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <HelpCircle className="w-3 h-3 text-gold" />
                          <span>Show Scanner Tips</span>
                        </button>
                      </div>
                      <h3 className="font-serif text-2xl font-light text-neutral-900 flex items-center gap-2">
                        <QrCode className="w-6 h-6 text-gold animate-pulse" />
                        Slab QR / Barcode Laser Scanner
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">Point your camera at a physical slab's QR label or select a simulated QR tag below to instantly pull up its engineering dossier.</p>
                    </div>
                    <button 
                      onClick={() => {
                        stopQrCamera();
                        setShowQrScanner(false);
                      }}
                      className="absolute top-0 right-0 p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                  </div>

                  {/* Mode Switcher Tabs */}
                  <div className="flex items-center justify-between gap-2 bg-neutral-900 p-1.5 rounded-xl border border-neutral-800">
                    <div className="flex items-center gap-1.5 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          setQrScanMode("single");
                          setBatchVerificationPayload(null);
                          setQrScanStatus("scanning");
                        }}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          qrScanMode === "single"
                            ? "bg-gold text-neutral-950 shadow-sm"
                            : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Single Scan Mode</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setQrScanMode("bulk");
                          setQrScanStatus("scanning");
                        }}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          qrScanMode === "bulk"
                            ? "bg-amber-500 text-neutral-950 shadow-sm font-black"
                            : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>⚡ Bulk Scan Mode</span>
                        {bulkBatchQueue.length > 0 && (
                          <span className="bg-neutral-950 text-gold px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold border border-gold/30">
                            {bulkBatchQueue.length}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setQrScanMode("history");
                        }}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          qrScanMode === "history"
                            ? "bg-gold text-neutral-950 shadow-sm font-black"
                            : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                        }`}
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Batch History</span>
                        {verifiedBatchHistory.length > 0 && (
                          <span className="bg-neutral-950 text-gold px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold border border-gold/30">
                            {verifiedBatchHistory.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Main Layout Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Left Side: Live Camera Port / HUD */}
                    <div className="space-y-3">
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-inner group">
                        
                        {/* Front / Rear Camera Switcher & High-Contrast Focus Mode Buttons Overlay */}
                        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setHighContrastFocusMode(!highContrastFocusMode)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shadow-xl text-[10px] font-mono font-bold transition-all cursor-pointer backdrop-blur-md active:scale-95 ${
                              highContrastFocusMode
                                ? "bg-emerald-500/90 hover:bg-emerald-400 text-neutral-950 border-emerald-300 shadow-emerald-500/30"
                                : "bg-black/85 hover:bg-gold text-gold hover:text-neutral-950 border-gold/40"
                            }`}
                            title="Toggle High-Contrast Focus Target Overlay"
                          >
                            <Target className="w-3.5 h-3.5" />
                            <span>{highContrastFocusMode ? "FOCUS: ON" : "FOCUS: OFF"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={toggleCameraFacingMode}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/85 hover:bg-gold text-gold hover:text-neutral-950 border border-gold/40 shadow-xl text-[10px] font-mono font-bold transition-all cursor-pointer backdrop-blur-md active:scale-95"
                            title={`Switch Camera Device (Currently: ${cameraFacingMode === "environment" ? "Rear Lens" : "Front Lens"})`}
                          >
                            <SwitchCamera className="w-3.5 h-3.5" />
                            <span>{cameraFacingMode === "environment" ? "Rear Lens" : "Front Lens"}</span>
                          </button>
                        </div>

                        {/* Persistent Low-Light Warning & Illumination HUD Indicator Overlay */}
                        <div className="absolute top-3 left-3 z-30 max-w-[210px] sm:max-w-[230px]">
                          <div className={`p-2 rounded-xl border backdrop-blur-md shadow-2xl transition-all ${
                            scannerLightLux < 50
                              ? "bg-amber-950/95 border-amber-500/80 text-amber-300"
                              : "bg-black/85 border-emerald-500/60 text-emerald-300"
                          }`}>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="flex items-center gap-1 text-[9px] font-mono font-bold tracking-wider uppercase">
                                <AlertTriangle className={`w-3 h-3 ${scannerLightLux < 50 ? "text-amber-400 animate-pulse" : "text-emerald-400"}`} />
                                <span>{scannerLightLux < 50 ? "LOW-LIGHT DETECTED" : "LIGHT OPTIMAL"}</span>
                              </span>
                              <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-black/60 border border-white/20">
                                {scannerLightLux} LUX
                              </span>
                            </div>
                            <p className="text-[8px] text-neutral-300 font-sans leading-tight">
                              {scannerLightLux < 50
                                ? "Sub-optimal illumination on slab texture. Enable torch for precise laser focus."
                                : "Sufficient ambient light for high-contrast QR recognition."}
                            </p>
                            <div className="flex items-center justify-between gap-1.5 pt-1.5 mt-1 border-t border-white/10">
                              <button
                                type="button"
                                onClick={() => setScannerTorchActive(!scannerTorchActive)}
                                className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                                  scannerTorchActive
                                    ? "bg-gold text-neutral-950 border-amber-300 shadow-md"
                                    : "bg-neutral-900 text-amber-300 border-amber-500/40 hover:border-gold"
                                }`}
                              >
                                <Lightbulb className="w-2.5 h-2.5" />
                                <span>{scannerTorchActive ? "TORCH ON" : "ENABLE TORCH"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setScannerLightLux(scannerLightLux < 50 ? 320 : 22)}
                                className="text-[8px] font-mono text-neutral-400 hover:text-white underline cursor-pointer"
                                title="Toggle Ambient Lighting Simulation"
                              >
                                {scannerLightLux < 50 ? "Simulate Bright" : "Simulate Low"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Visual Indicator for Optimal Focal Distance */}
                        <div className="absolute top-36 sm:top-32 left-3 right-3 sm:right-auto z-30 pointer-events-none">
                          {(() => {
                            const currentFocalCm = Math.round(28 / (qrZoomLevel * 0.95));
                            const isOptimal = currentFocalCm >= 15 && currentFocalCm <= 30;
                            return (
                              <div className={`p-2 rounded-xl border backdrop-blur-md shadow-2xl text-[9px] font-mono flex items-center gap-2 ${
                                isOptimal
                                  ? "bg-emerald-950/95 border-emerald-500/80 text-emerald-300"
                                  : currentFocalCm < 15
                                  ? "bg-amber-950/95 border-amber-500/80 text-amber-300"
                                  : "bg-sky-950/95 border-sky-500/80 text-sky-300"
                              }`}>
                                <Target className={`w-4 h-4 shrink-0 ${isOptimal ? "text-emerald-400 animate-pulse" : "text-amber-400"}`} />
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5 font-bold tracking-wider uppercase">
                                    <span>FOCAL DISTANCE: {currentFocalCm} CM</span>
                                    <span className={`text-[8px] px-1.5 py-0.2 rounded font-mono font-bold uppercase border ${
                                      isOptimal ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40" : "bg-black/60 text-amber-300 border-white/20"
                                    }`}>
                                      {isOptimal
                                        ? "✓ OPTIMAL FOCUS"
                                        : currentFocalCm < 15
                                        ? "TOO CLOSE"
                                        : "TOO FAR"}
                                    </span>
                                  </div>
                                  <span className="text-[8px] text-neutral-300 font-sans">
                                    {isOptimal
                                      ? "Camera positioned in optimal focal plane (15cm–30cm) for crisp scan accuracy."
                                      : currentFocalCm < 15
                                      ? "Move camera back slightly (15cm–30cm required) to prevent lens distortion."
                                      : "Move closer to QR label or increase optic zoom."}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Torch Glow Overlay Effect */}
                        {scannerTorchActive && (
                          <div className="absolute inset-0 bg-amber-100/15 pointer-events-none z-10 mix-blend-screen animate-pulse" />
                        )}

                        {/* Real Camera Video Output */}
                        {qrScanStatus === "scanning" && !qrScanError && (
                          <video 
                            ref={(el) => {
                              qrVideoRef.current = el;
                              if (el && qrStreamRef.current && el.srcObject !== qrStreamRef.current) {
                                el.srcObject = qrStreamRef.current;
                              }
                            }} 
                            autoPlay 
                            playsInline 
                            muted 
                            style={{
                              transform: `scale(${qrZoomLevel})`,
                              transformOrigin: "center center",
                              transition: "transform 0.15s ease-out"
                            }}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}

                        {/* Camera Offline / High-fidelity Simulation Fallback Screen */}
                        {(!qrStreamRef.current || qrScanError || qrScanStatus === "error") && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center bg-neutral-950/95 text-neutral-400 space-y-3 z-20">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${qrScanError ? "bg-amber-500/10 border border-amber-500/40 text-amber-400" : "bg-neutral-900 border border-neutral-800 text-gold animate-pulse"}`}>
                              {qrScanError ? <AlertTriangle className="w-7 h-7" /> : <Camera className="w-7 h-7" />}
                            </div>
                            <div className="space-y-1 max-w-xs">
                              <p className={`text-xs font-mono font-bold uppercase ${qrScanError ? "text-amber-400" : "text-neutral-300"}`}>
                                {qrScanError ? "SCANNING STREAM ERROR" : "INTEGRATED CAMERA PORT ACTIVE"}
                              </p>
                              <p className="text-[10px] text-neutral-400 leading-relaxed">
                                {qrScanError 
                                  ? qrScanError 
                                  : "Webcam restricted by browser container. Safe warehouse-emulation mode is operational."}
                              </p>
                            </div>

                            {/* Prominent Action Buttons */}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={toggleCameraFacingMode}
                                className="bg-neutral-900 hover:bg-neutral-800 text-gold font-mono font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-gold/40 hover:border-gold"
                                title="Switch Camera Facing Mode"
                              >
                                <SwitchCamera className="w-3.5 h-3.5" />
                                <span>Switch Cam ({cameraFacingMode === "environment" ? "Rear" : "Front"})</span>
                              </button>

                              <button
                                onClick={() => startQrCamera()}
                                className="bg-gold hover:bg-amber-400 text-neutral-950 font-mono font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 border border-gold/50"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Retry Scan</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Interactive Scan Reticle Overlay (High Tech HUD) */}
                        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
                          {/* Corner bracket styling */}
                          <div className="flex justify-between">
                            <div className="w-6 h-6 border-t-2 border-l-2 border-gold rounded-tl" />
                            <div className="w-6 h-6 border-t-2 border-r-2 border-gold rounded-tr" />
                          </div>

                          {/* Dynamic sweep scan line */}
                          <div className={`scan-line w-full transition-all duration-300 ${
                            highContrastFocusMode
                              ? "h-[3.5px] bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,1)]"
                              : "h-[2px] bg-gold/80 shadow-[0_0_12px_rgba(212,175,55,1)]"
                          } animate-pulse`} />

                          <div className="flex justify-between">
                            <div className="w-6 h-6 border-b-2 border-l-2 border-gold rounded-bl" />
                            <div className="w-6 h-6 border-b-2 border-r-2 border-gold rounded-br" />
                          </div>

                          {/* High-Contrast Focus Target Bounding Box Overlay */}
                          {highContrastFocusMode && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                              <div className="w-48 h-48 sm:w-52 sm:h-52 border-2 border-dashed border-emerald-400 bg-emerald-500/10 rounded-2xl shadow-[0_0_30px_rgba(52,211,153,0.4)] flex flex-col justify-between p-2 animate-pulse relative">
                                {/* High visibility corner brackets */}
                                <div className="absolute -top-2 -left-2 w-5 h-5 border-t-4 border-l-4 border-emerald-300 rounded-tl-md shadow-md" />
                                <div className="absolute -top-2 -right-2 w-5 h-5 border-t-4 border-r-4 border-emerald-300 rounded-tr-md shadow-md" />
                                <div className="absolute -bottom-2 -left-2 w-5 h-5 border-b-4 border-l-4 border-emerald-300 rounded-bl-md shadow-md" />
                                <div className="absolute -bottom-2 -right-2 w-5 h-5 border-b-4 border-r-4 border-emerald-300 rounded-br-md shadow-md" />

                                <div className="flex justify-between items-center text-[8px] font-mono font-bold text-emerald-300 bg-neutral-950/90 px-2 py-0.5 rounded border border-emerald-500/60 shadow-lg">
                                  <span className="flex items-center gap-1">
                                    <Target className="w-3 h-3 text-emerald-400 animate-spin" />
                                    TARGET LOCKED
                                  </span>
                                  <span className="text-emerald-400 font-bold">HIGH-CONTRAST</span>
                                </div>

                                <div className="text-center bg-neutral-950/90 px-2 py-0.5 rounded border border-emerald-500/60 shadow-lg text-[8px] font-mono font-bold text-emerald-300">
                                  ✓ OPTICAL TARGET DETECTED
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Tech metrics overlay & Visual Progress Ring for 2.2s Auto-Scan */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <div className="relative w-36 h-36 flex items-center justify-center">
                              {/* SVG Circular Progress Ring */}
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                {/* Background Track Circle */}
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="44"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  className="text-neutral-800/80"
                                  fill="transparent"
                                />
                                {/* Dynamic Gold Progress Arc */}
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="44"
                                  stroke="#D4AF37"
                                  strokeWidth="3.5"
                                  strokeDasharray={276.46}
                                  strokeDashoffset={276.46 - (276.46 * Math.min(100, scanProgress)) / 100}
                                  strokeLinecap="round"
                                  className="transition-all duration-75 ease-linear drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]"
                                  fill="transparent"
                                />
                              </svg>

                              {/* Center Timer & Auto-Scan Status Info */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                                <span className="text-[9px] font-mono font-bold text-gold tracking-wider uppercase mb-0.5">
                                  {scanProgress >= 100 ? "VERIFIED" : "AUTO-SCAN"}
                                </span>
                                <span className="text-lg font-mono font-black text-white tracking-tight drop-shadow-md">
                                  {Math.max(0, (2.2 - (scanProgress / 100) * 2.2)).toFixed(1)}s
                                </span>
                                <div className="mt-0.5 px-1.5 py-0.5 rounded-full bg-gold/20 border border-gold/40 text-gold text-[8px] font-mono font-bold tracking-widest">
                                  {Math.round(scanProgress)}%
                                </div>
                              </div>
                            </div>
                            <span className="text-[9px] font-mono text-neutral-300 mt-2 bg-black/80 px-2.5 py-0.5 rounded-full border border-gold/30 backdrop-blur-sm shadow-sm">
                              Auto-triggers in {Math.max(0, (2.2 - (scanProgress / 100) * 2.2)).toFixed(1)}s
                            </span>
                          </div>
                        </div>

                        {/* HUD bottom indicators */}
                        <div className="absolute bottom-3 left-3 right-3 z-30 flex justify-between items-center bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-mono text-white border border-white/10">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${qrScanError ? "bg-amber-400" : "bg-gold animate-ping"}`}></span>
                            {qrScanError ? "SCANNER PAUSED" : `SCANNING (${cameraFacingMode === "environment" ? "REAR" : "FRONT"})`}
                          </span>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setHighContrastFocusMode(!highContrastFocusMode)}
                              className={`flex items-center gap-1 text-[9px] font-mono font-bold transition-all cursor-pointer px-2 py-0.5 rounded border ${
                                highContrastFocusMode
                                  ? "bg-emerald-500 text-neutral-950 border-emerald-300"
                                  : "bg-neutral-900 text-gold hover:text-white border-gold/30 hover:border-gold"
                              }`}
                              title="Toggle High-Contrast Focus Mode"
                            >
                              <Target className="w-3 h-3" />
                              <span>Focus: {highContrastFocusMode ? "ON" : "OFF"}</span>
                            </button>

                            <button
                              onClick={toggleCameraFacingMode}
                              className="flex items-center gap-1 text-[9px] font-mono font-bold text-gold hover:text-white transition-colors cursor-pointer px-2 py-0.5 rounded bg-neutral-900 border border-gold/30 hover:border-gold"
                              title="Switch Camera (Front/Rear)"
                            >
                              <SwitchCamera className="w-3 h-3 text-gold" />
                              <span>Flip Lens</span>
                            </button>

                            <button
                              onClick={() => startQrCamera()}
                              className="flex items-center gap-1 text-[9px] font-mono font-bold text-gold hover:text-white transition-colors cursor-pointer px-2 py-0.5 rounded bg-neutral-900 border border-gold/30 hover:border-gold"
                              title="Restart Camera Stream"
                            >
                              <RefreshCw className="w-3 h-3 text-gold" />
                              <span>Retry</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Zoom Range Slider Control for Distance Label Focusing */}
                      <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2 shadow-md">
                        <div className="flex items-center justify-between">
                          <label htmlFor="qr-zoom-slider" className="text-[9px] font-mono font-bold text-neutral-400 uppercase flex items-center gap-1.5">
                            <ZoomIn className="w-3.5 h-3.5 text-gold" />
                            <span>Optic Focus & Distance Zoom</span>
                          </label>
                          <span className="px-2 py-0.5 rounded bg-gold/20 text-gold border border-gold/40 text-[10px] font-mono font-bold">
                            {qrZoomLevel.toFixed(1)}x ZOOM
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleZoomChange(qrZoomLevel - 0.5)}
                            disabled={qrZoomLevel <= 1.0}
                            className="p-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-gold hover:border-gold/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                            title="Zoom Out (-0.5x)"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>

                          <input
                            id="qr-zoom-slider"
                            type="range"
                            min="1.0"
                            max="4.0"
                            step="0.1"
                            value={qrZoomLevel}
                            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                            className="flex-1 accent-[#D4AF37] h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                            aria-label="QR Scanner Zoom Range"
                          />

                          <button
                            type="button"
                            onClick={() => handleZoomChange(qrZoomLevel + 0.5)}
                            disabled={qrZoomLevel >= 4.0}
                            className="p-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-gold hover:border-gold/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                            title="Zoom In (+0.5x)"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quick Focal Presets */}
                        <div className="flex items-center justify-between gap-1 pt-1">
                          {[1.0, 1.5, 2.0, 3.0, 4.0].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleZoomChange(preset)}
                              className={`flex-1 py-1 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                Math.abs(qrZoomLevel - preset) < 0.05
                                  ? "bg-gold text-neutral-950 shadow-sm"
                                  : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800"
                              }`}
                            >
                              {preset.toFixed(1)}x
                            </button>
                          ))}
                        </div>

                        {/* Interactive Visual Focal Plane Gauge Bar */}
                        {(() => {
                          const currentFocalCm = Math.round(28 / (qrZoomLevel * 0.95));
                          const isOptimal = currentFocalCm >= 15 && currentFocalCm <= 30;
                          return (
                            <div className="p-2.5 bg-neutral-900/90 rounded-lg border border-neutral-800 space-y-1.5 mt-2">
                              <div className="flex justify-between items-center text-[9px] font-mono">
                                <span className="text-neutral-400 flex items-center gap-1 font-bold">
                                  <Target className="w-3 h-3 text-gold" />
                                  <span>Visual Focal Plane Gauge</span>
                                </span>
                                <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold border ${
                                  isOptimal
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                                    : "bg-amber-500/20 text-amber-300 border-amber-400/40"
                                }`}>
                                  {currentFocalCm}cm • {isOptimal ? "OPTIMAL ZONE" : currentFocalCm < 15 ? "TOO CLOSE" : "TOO FAR"}
                                </span>
                              </div>

                              {/* Gauge Scale Graphic */}
                              <div className="space-y-1">
                                <div className="relative w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                                  {/* Optimal Distance Zone (15cm to 30cm) */}
                                  <div className="absolute top-0 bottom-0 left-[22%] right-[28%] bg-emerald-500/30 border-x border-emerald-400/60" />
                                  
                                  {/* Dynamic Focal Pointer Pin */}
                                  <div
                                    className={`absolute top-0 bottom-0 w-3 rounded-full transition-all duration-200 shadow-md transform -translate-x-1/2 ${
                                      isOptimal ? "bg-emerald-400 shadow-emerald-400/80" : "bg-amber-400 shadow-amber-400/80 animate-pulse"
                                    }`}
                                    style={{
                                      left: `${Math.max(8, Math.min(92, 100 - ((currentFocalCm - 8) / 35) * 100))}%`
                                    }}
                                  />
                                </div>

                                <div className="flex justify-between text-[8px] font-mono text-neutral-500 px-0.5">
                                  <span>10cm (Close)</span>
                                  <span className="text-emerald-400 font-bold">15–30cm (Optimal Zone)</span>
                                  <span>45cm+ (Far)</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Manual Key-in option */}
                      <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                        <label className="text-[9px] font-mono font-bold text-neutral-400 uppercase block mb-1">Or Manually Key-In Batch Lot ID</label>
                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const val = (formData.get("manualLot") as string || "").trim().toUpperCase();
                            if (val) {
                              autoVerifyQrCode(val);
                            }
                          }}
                          className="flex gap-2"
                        >
                          <input 
                            name="manualLot"
                            type="text" 
                            placeholder="e.g. B8492-V2" 
                            className="flex-1 bg-white border border-neutral-300 rounded px-2.5 py-1.5 text-xs font-mono uppercase font-semibold text-neutral-800 focus:outline-none focus:border-gold"
                          />
                          <button 
                            type="submit"
                            disabled={isVerifyingQrApi}
                            className="bg-neutral-900 hover:bg-gold text-white hover:text-neutral-950 px-3 py-1 text-xs font-sans font-bold uppercase rounded tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isVerifyingQrApi ? "Verifying..." : "Verify"}
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Right Side: Single Scan Results, Bulk Scan Batch Queue, or Batch History */}
                    {qrScanMode === "history" ? (
                      <div className="flex flex-col justify-between h-full space-y-3">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3 flex-1 flex flex-col justify-between shadow-xl">
                          <div>
                            <div className="flex justify-between items-center border-b border-neutral-800 pb-2.5">
                              <div className="flex items-center gap-2">
                                <History className="w-4 h-4 text-gold" />
                                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                                  VERIFIED BATCH HISTORY
                                </span>
                              </div>
                              <span className="text-xs font-mono font-bold bg-gold/20 text-gold px-2 py-0.5 rounded-full border border-gold/30">
                                {verifiedBatchHistory.length} {verifiedBatchHistory.length === 1 ? "Record" : "Records"}
                              </span>
                            </div>

                            <p className="text-[10px] text-neutral-400 mt-2">
                              Audit ledger of recently verified slab batches. Inspect item dossiers or re-export official CSV reports.
                            </p>

                            {/* Filter / Search Bar */}
                            <div className="mt-2.5 relative">
                              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                              <input
                                type="text"
                                value={historySearchQuery}
                                onChange={(e) => setHistorySearchQuery(e.target.value)}
                                placeholder="Search by Batch ID, Lot Code, or Slab Name..."
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-7 py-1.5 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-gold"
                              />
                              {historySearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setHistorySearchQuery("")}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {/* Historic Batches List */}
                            <div className="mt-3 max-h-[320px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                              {filteredHistoryBatches.length === 0 ? (
                                <div className="bg-neutral-950 border border-dashed border-neutral-800 rounded-lg p-6 text-center text-neutral-500 space-y-1.5">
                                  <History className="w-6 h-6 mx-auto text-neutral-600" />
                                  <p className="text-xs font-semibold text-neutral-400">No batch records found</p>
                                  <p className="text-[10px] text-neutral-500">
                                    {historySearchQuery ? "No batches matched your filter criteria." : "Complete a bulk scan verification to add records here."}
                                  </p>
                                </div>
                              ) : (
                                filteredHistoryBatches.map((batch: any) => {
                                  const isSelected = selectedHistoryBatch?.batchId === batch.batchId;
                                  return (
                                    <div
                                      key={batch.batchId}
                                      className={`bg-neutral-950 border rounded-xl p-3 space-y-2 transition-all ${
                                        isSelected ? "border-gold shadow-md bg-neutral-950/90" : "border-neutral-800 hover:border-neutral-700"
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-mono font-bold text-gold text-xs">{batch.batchId}</span>
                                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                                              ✓ {batch.totalVerified || batch.items?.length || 0} Slabs
                                            </span>
                                          </div>
                                          <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                                            📅 {batch.timestamp}
                                          </p>
                                        </div>

                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleExportBatchCsv(batch)}
                                            className="px-2 py-1 bg-neutral-900 hover:bg-gold text-neutral-200 hover:text-neutral-950 border border-neutral-700 hover:border-gold rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs group"
                                            title="Re-export Batch Report CSV"
                                          >
                                            <FileDown className="w-3 h-3 text-gold" />
                                            <span>Export CSV</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setSelectedHistoryBatch(isSelected ? null : batch)}
                                            className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                              isSelected ? "bg-gold text-neutral-950" : "bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800"
                                            }`}
                                          >
                                            {isSelected ? "Hide" : "Details"}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setVerifiedBatchHistory((prev: any[]) => {
                                                const updated = prev.filter(b => b.batchId !== batch.batchId);
                                                try {
                                                  localStorage.setItem("smc_verified_batch_history", JSON.stringify(updated));
                                                } catch (e) {}
                                                return updated;
                                              });
                                              if (selectedHistoryBatch?.batchId === batch.batchId) {
                                                setSelectedHistoryBatch(null);
                                              }
                                            }}
                                            className="p-1 text-neutral-500 hover:text-rose-400 hover:bg-neutral-900 rounded transition-colors cursor-pointer"
                                            title="Remove batch record"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Slabs list summary tags */}
                                      <div className="flex flex-wrap gap-1 text-[9px] font-mono">
                                        {batch.items?.slice(0, 3).map((it: any, i: number) => (
                                          <span key={i} className="bg-neutral-900 text-neutral-300 border border-neutral-800 px-1.5 py-0.5 rounded truncate max-w-[130px]">
                                            {it.slabName || it.qrCode}
                                          </span>
                                        ))}
                                        {(batch.items?.length || 0) > 3 && (
                                          <span className="bg-neutral-900 text-gold border border-gold/30 px-1.5 py-0.5 rounded font-bold">
                                            +{(batch.items?.length || 0) - 3} more
                                          </span>
                                        )}
                                      </div>

                                      {/* Expanded Batch Item Dossier */}
                                      {isSelected && (
                                        <div className="mt-2 pt-2 border-t border-neutral-800 space-y-2 animate-fade-in text-xs">
                                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                                            <div className="bg-neutral-900 p-1.5 rounded border border-neutral-800">
                                              <span className="text-neutral-500 block text-[8px] uppercase font-bold">Verification Code</span>
                                              <span className="text-gold font-bold">{batch.batchVerificationCode}</span>
                                            </div>
                                            <div className="bg-neutral-900 p-1.5 rounded border border-neutral-800">
                                              <span className="text-neutral-500 block text-[8px] uppercase font-bold">Ledger Hash</span>
                                              <span className="text-neutral-300 font-bold truncate block">{batch.ledgerHash}</span>
                                            </div>
                                          </div>

                                          <div className="space-y-1">
                                            <span className="text-[9px] font-mono text-neutral-400 font-bold uppercase block">Verified Item List ({batch.items?.length || 0})</span>
                                            <div className="max-h-28 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                              {batch.items?.map((it: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-neutral-900 border border-neutral-800 text-[10px]">
                                                  <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-neutral-200 truncate">{it.slabName}</p>
                                                    <p className="text-[8px] font-mono text-gold">LOT: {it.lotNumber || it.qrCode} • {it.bay || "Bay A-04"}</p>
                                                  </div>
                                                  <span className="text-[8px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/30">
                                                    VERIFIED
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => handleExportBatchCsv(batch)}
                                            className="w-full bg-gold hover:bg-amber-400 text-neutral-950 font-mono font-bold text-xs py-2 rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                          >
                                            <FileDown className="w-3.5 h-3.5" />
                                            <span>Re-Export Report (.CSV)</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[10px] font-mono text-neutral-400">
                            <span>Persistent History Enabled</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to clear all batch verification history?")) {
                                  setVerifiedBatchHistory([]);
                                  localStorage.removeItem("smc_verified_batch_history");
                                  setSelectedHistoryBatch(null);
                                }
                              }}
                              className="text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              Clear All Records
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : qrScanMode === "bulk" ? (
                      <div className="flex flex-col justify-between h-full space-y-4">
                        
                        {/* Bulk Scan Notice Toast if item was just added */}
                        {bulkScanNotice && (
                          <div className="bg-amber-500/15 border border-amber-500/40 text-amber-900 rounded-xl p-3 text-xs font-mono font-bold flex items-center justify-between shadow-sm animate-fade-in">
                            <span className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-amber-600" />
                              <span>{bulkScanNotice}</span>
                            </span>
                            <button type="button" onClick={() => setBulkScanNotice(null)} className="text-amber-800 hover:text-amber-950 font-bold text-xs cursor-pointer">✕</button>
                          </div>
                        )}

                        {batchVerificationPayload ? (
                          /* Batch Verification Success Report Card */
                          <div className="bg-neutral-900 text-white border border-gold/40 rounded-xl p-4 space-y-3.5 animate-fade-in flex-1 flex flex-col justify-between shadow-xl">
                            <div>
                              <div className="flex justify-between items-center border-b border-neutral-800 pb-2.5">
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span>Batch Verified</span>
                                </span>
                                <span className="text-[10px] font-mono text-gold font-bold">{batchVerificationPayload.batchId}</span>
                              </div>

                              <div className="mt-3 space-y-1">
                                <h4 className="font-serif text-xl font-light text-white">Batch Verification Report</h4>
                                <p className="text-[10px] font-mono text-emerald-400">{batchVerificationPayload.message}</p>
                              </div>

                              {/* Verified Items Table */}
                              <div className="mt-3 space-y-1.5">
                                <span className="text-[9px] font-mono text-neutral-400 uppercase font-bold block">Verified Slabs ({batchVerificationPayload.totalVerified})</span>
                                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                                  {batchVerificationPayload.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-neutral-950 border border-neutral-800/80 text-xs">
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-neutral-200 text-[11px] truncate">{item.slabName}</p>
                                        <p className="text-[9px] font-mono text-gold">LOT: {item.lotNumber} • {item.bay}</p>
                                      </div>
                                      <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                        VERIFIED
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-neutral-800">
                              <button
                                type="button"
                                onClick={handleExportBatchCsv}
                                className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-mono font-bold text-xs py-2.5 rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:border-gold/60 group"
                              >
                                <FileDown className="w-3.5 h-3.5 text-gold group-hover:scale-110 transition-transform" />
                                <span>Export Batch Report (.CSV)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setBatchVerificationPayload(null);
                                  setBulkBatchQueue([]);
                                  setQrScanStatus("scanning");
                                }}
                                className="w-full bg-gold hover:bg-amber-400 text-neutral-950 font-mono font-bold text-xs py-2.5 rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Start New Bulk Scan Batch</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Active Bulk Scan Batch Queue */
                          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3 flex-1 flex flex-col justify-between shadow-lg">
                            <div>
                              <div className="flex justify-between items-center border-b border-neutral-800 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-amber-400" />
                                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                                    BULK BATCH QUEUE
                                  </span>
                                </div>
                                <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                                  {bulkBatchQueue.length} {bulkBatchQueue.length === 1 ? "Slab" : "Slabs"}
                                </span>
                              </div>

                              <p className="text-[10px] text-neutral-400 mt-2">
                                Continuous scan mode active. Present slab QR codes to camera or click demo tags below to build your batch.
                              </p>

                              {/* Queued Items List */}
                              <div className="mt-3 space-y-1.5">
                                {bulkBatchQueue.length === 0 ? (
                                  <div className="bg-neutral-950 border border-dashed border-neutral-800 rounded-lg p-6 text-center text-neutral-500 space-y-1 my-2">
                                    <QrCode className="w-6 h-6 mx-auto text-neutral-600 animate-pulse" />
                                    <p className="text-xs font-semibold text-neutral-400">Queue is empty</p>
                                    <p className="text-[10px] text-neutral-500">Scan slab QR tags continuously using the camera or click demo tags below.</p>
                                  </div>
                                ) : (
                                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 my-2">
                                    {bulkBatchQueue.map((item, idx) => (
                                      <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-neutral-950 border border-neutral-800/90 text-xs hover:border-gold/40 transition-colors">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          <span className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[9px] font-mono font-bold text-gold">
                                            #{idx + 1}
                                          </span>
                                          <div className="min-w-0 flex-1">
                                            <p className="font-bold text-neutral-200 text-[11px] truncate">{item.slabName}</p>
                                            <p className="text-[9px] font-mono text-gold">LOT: {item.lot} • {item.scannedAt}</p>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setBulkBatchQueue(prev => prev.filter(b => b.id !== item.id));
                                          }}
                                          className="p-1 text-neutral-500 hover:text-red-400 hover:bg-neutral-900 rounded transition-colors cursor-pointer ml-2"
                                          title="Remove from batch"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Batch Action Buttons */}
                            <div className="space-y-2 pt-2 border-t border-neutral-800">
                              <div className="flex gap-2">
                                {bulkBatchQueue.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setBulkBatchQueue([])}
                                    className="px-3 py-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                                  >
                                    Clear Queue
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={submitBatchVerificationRequest}
                                  disabled={bulkBatchQueue.length === 0 || isVerifyingBatchApi}
                                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 font-mono font-black text-xs py-2.5 rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                                >
                                  {isVerifyingBatchApi ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Verifying Batch API...</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Submit Batch Request ({bulkBatchQueue.length})</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Selector Container of Demo QR Codes for Bulk Scanning */}
                        <div className="space-y-2 bg-neutral-900 text-white rounded-xl p-3 border border-neutral-800">
                          <div className="flex justify-between items-center pb-0.5">
                            <span className="text-[9px] font-mono font-bold tracking-wider text-amber-400 uppercase flex items-center gap-1">
                              <span>⚡ DEMO QR TAGS (CLICK TO BULK QUEUE)</span>
                            </span>
                            <span className="text-[8px] font-mono text-neutral-400">CONTINUOUS ADD</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1.5">
                            {VISION_SLABS.map((slab) => {
                              const isQueued = bulkBatchQueue.some(b => b.lot.toUpperCase() === slab.lot.toUpperCase());
                              return (
                                <button
                                  key={slab.id}
                                  type="button"
                                  onClick={() => {
                                    autoVerifyQrCode(slab.lot);
                                  }}
                                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                    isQueued 
                                      ? "bg-amber-500/20 border-amber-500/60 text-amber-300" 
                                      : "bg-neutral-950 border-neutral-800 text-white hover:border-amber-400/60"
                                  }`}
                                >
                                  <div className={`p-1 rounded ${isQueued ? "bg-amber-500 text-neutral-950" : "bg-neutral-900 text-white"}`}>
                                    {isQueued ? <Check className="w-3.5 h-3.5 font-bold" /> : <Plus className="w-3.5 h-3.5" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h6 className="text-[10px] font-bold font-sans truncate leading-none mb-0.5">{slab.name}</h6>
                                    <span className={`text-[8px] font-mono block ${isQueued ? "text-amber-400 font-bold" : "text-neutral-400"}`}>
                                      LOT: {slab.lot}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="flex flex-col justify-between h-full space-y-4">
                        
                        {/* Scan Success Card */}
                        {qrScanStatus === "success" && qrScanResult ? (() => {
                          const slab = VISION_SLABS.find(s => s.id === qrScanResult) || VISION_SLABS[0];
                          return (
                            <div className="bg-neutral-50 border border-gold/40 rounded-xl p-5 space-y-4 animate-fade-in flex-1 flex flex-col justify-between">
                              
                              {/* Material ID Header */}
                              <div className="border-b border-neutral-200 pb-3">
                                <div className="flex justify-between items-start">
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider flex items-center gap-1 ${
                                    isVerifyingQrApi 
                                      ? "bg-amber-100 text-amber-800" 
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isVerifyingQrApi ? "bg-amber-500 animate-ping" : "bg-emerald-500 animate-pulse"}`} />
                                    {isVerifyingQrApi ? "AUTOVERIFYING VIA API..." : "AUTO-VERIFIED VIA API"}
                                  </span>
                                  <span className="text-[10px] font-mono text-gold font-bold">MATCH 100%</span>
                                </div>
                                <h4 className="font-serif text-2xl text-neutral-900 mt-1">{slab.name}</h4>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  <p className="text-[11px] text-neutral-500 font-mono">Physical Lot Code: <span className="text-gold font-bold">{slab.lot}</span></p>
                                  {qrApiVerificationPayload?.verificationCode && (
                                    <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                                      {qrApiVerificationPayload.verificationCode}
                                    </span>
                                  )}
                                </div>
                                {qrApiVerificationPayload?.message && (
                                  <p className="text-[9px] font-mono text-emerald-600 mt-1 flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>{qrApiVerificationPayload.message}</span>
                                  </p>
                                )}
                              </div>

                              {/* Core Tech Data Grid */}
                              <div className="grid grid-cols-2 gap-2 text-xs py-1">
                                <div className="bg-white p-2 rounded border border-neutral-100">
                                  <span className="text-[9px] font-mono text-neutral-400 uppercase block">Class</span>
                                  <span className="font-semibold text-neutral-800">{slab.class}</span>
                                </div>
                                <div className="bg-white p-2 rounded border border-neutral-100">
                                  <span className="text-[9px] font-mono text-neutral-400 uppercase block">Hardness</span>
                                  <span className="font-semibold text-neutral-800">{slab.mohs}</span>
                                </div>
                                <div className="bg-white p-2 rounded border border-neutral-100">
                                  <span className="text-[9px] font-mono text-neutral-400 uppercase block">Dimensions</span>
                                  <span className="font-semibold text-neutral-800 font-mono">{slab.dims}</span>
                                </div>
                                <div className="bg-white p-2 rounded border border-neutral-100">
                                  <span className="text-[9px] font-mono text-neutral-400 uppercase block">Pricing</span>
                                  <span className="font-semibold text-neutral-800">On Application</span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="space-y-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveVisionSlabId(slab.id);
                                    setVisionMode("blueprint");
                                    stopQrCamera();
                                    setShowQrScanner(false);
                                  }}
                                  className="w-full bg-[#1A1A1A] hover:bg-gold text-white hover:text-neutral-950 font-sans font-bold text-xs py-3 rounded-lg tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-lg">file_open</span>
                                  Review Technical Dossier
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveVisionSlabId(slab.id);
                                    setVisionMode("simulator");
                                    stopQrCamera();
                                    setShowQrScanner(false);
                                  }}
                                  className="w-full bg-white border border-neutral-200 hover:border-gold text-neutral-700 hover:text-gold font-sans font-bold text-xs py-2.5 rounded-lg tracking-widest uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-lg">view_in_ar</span>
                                  Render in AR Live Simulator
                                </button>
                              </div>
                            </div>
                          );
                        })() : (
                          <div className="bg-neutral-50 border border-dashed border-neutral-300 rounded-xl p-5 flex flex-col justify-center items-center text-center space-y-3 flex-1">
                            <span className="material-symbols-outlined text-4xl text-neutral-300 animate-pulse">qr_code_scanner</span>
                            <div className="space-y-1">
                              <h5 className="text-xs font-semibold text-neutral-700">Awaiting Physical Code Match</h5>
                              <p className="text-[11px] text-neutral-400 max-w-[240px] leading-relaxed mx-auto">
                                Align your camera with any physical slab's QR tag or click on one of our pre-calibrated slab plates below to simulate instant QR recognition and auto-verification.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Selector Container of Demo QR Codes */}
                        <div className="space-y-2 bg-neutral-900 text-white rounded-xl p-4 border border-neutral-800">
                          <div className="flex justify-between items-center pb-1">
                            <span className="text-[9px] font-mono font-bold tracking-wider text-gold uppercase">DEMO WAREHOUSE QR TAGS</span>
                            <span className="text-[8px] font-mono text-neutral-400">PRESENT CODE TO LENS</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {VISION_SLABS.map((slab) => (
                              <button
                                key={slab.id}
                                type="button"
                                onClick={() => {
                                  autoVerifyQrCode(slab.lot);
                                }}
                                className={`flex items-center gap-2.5 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                  qrScanResult === slab.id 
                                    ? "bg-gold border-gold text-neutral-950" 
                                    : "bg-neutral-950 border-neutral-800 text-white hover:border-gold/60"
                                }`}
                              >
                                {/* Mini QR Icon */}
                                <div className={`p-1.5 rounded ${qrScanResult === slab.id ? "bg-neutral-950 text-gold" : "bg-neutral-900 text-white"}`}>
                                  <QrCode className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h6 className="text-[10px] font-bold font-sans truncate leading-none mb-0.5">{slab.name}</h6>
                                  <span className={`text-[8px] font-mono block ${qrScanResult === slab.id ? "text-neutral-800 font-bold" : "text-neutral-400"}`}>
                                    LOT: {slab.lot}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}

                  </div>

                  {/* ACTIVE SESSION RECENT SCANS SUMMARY SECTION (LAST 3 ITEMS) */}
                  {(() => {
                    const sortedScans = scanSortOrder === "newest" ? scanHistory : [...scanHistory].reverse();
                    const lastThreeScans = sortedScans.slice(0, 3);
                    const lotCounts = scanHistory.reduce((acc, curr) => {
                      const l = curr.lot.toUpperCase();
                      acc[l] = (acc[l] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    const hasDuplicates = Object.values(lotCounts).some((count: any) => Number(count) > 1);

                    return (
                      <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden shadow-2xs mt-4">
                        {/* Header */}
                        <div className="bg-neutral-900 text-white px-4 py-3 flex items-center justify-between border-b border-neutral-800">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-gold/20 border border-gold/40 rounded text-gold">
                              <History className="w-4 h-4 text-gold" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold font-sans tracking-wide uppercase text-white flex items-center gap-2">
                                Active Session Recent Scans
                                <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 uppercase tracking-widest">
                                  Last {lastThreeScans.length} {lastThreeScans.length === 1 ? 'Item' : 'Items'} ({scanSortOrder === "newest" ? "Newest First" : "Oldest First"})
                                </span>
                              </h4>
                              <p className="text-[10px] text-neutral-400">Recent slab QR tags identified during the current session</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasDuplicates && (
                              <span className="text-[9px] font-mono font-bold text-red-300 bg-red-950/80 border border-red-700/80 px-2 py-0.5 rounded flex items-center gap-1 animate-pulse" title="Duplicate Lot ID detected in current session">
                                <AlertTriangle className="w-3 h-3 text-red-400" />
                                Duplicate Scan Detected
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setShowQrScanner(true);
                                setQrScanStatus("scanning");
                                setQrScanResult(null);
                                setQrScanError(null);
                                startQrCamera();
                              }}
                              className="text-[9px] font-mono font-bold px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                              title="Scan another QR code tag immediately"
                            >
                              <QrCode className="w-3 h-3 text-white" />
                              Scan Again
                            </button>
                            {scanHistory.length > 0 && (
                              <>
                                <button
                                  onClick={toggleScanSortOrder}
                                  className="text-[9px] font-mono font-bold px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  title={`Toggle sort order. Currently showing: ${scanSortOrder === "newest" ? "Newest First" : "Oldest First"}`}
                                >
                                  <ArrowUpDown className="w-3 h-3 text-gold" />
                                  Sort: {scanSortOrder === "newest" ? "Newest" : "Oldest"}
                                </button>
                                <button
                                  onClick={() => {
                                    const lotText = scanHistory.map((item, i) => `${i + 1}. Lot ID: ${item.lot} (${item.slabName})${item.note ? ` - Note: "${item.note}"` : ""}`).join("\n");
                                    if (navigator.clipboard) {
                                      navigator.clipboard.writeText(lotText);
                                    }
                                    setCopiedSessionLogs(true);
                                    setTimeout(() => setCopiedSessionLogs(false), 2000);
                                  }}
                                  className="text-[9px] font-mono font-bold px-2.5 py-1 rounded bg-gold text-neutral-950 hover:bg-gold-light border border-gold/60 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  title="Copy scanned lot numbers to clipboard"
                                >
                                  {copiedSessionLogs ? (
                                    <>
                                      <Check className="w-3 h-3 text-neutral-950" />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-neutral-950" />
                                      Copy Session
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    clearScanHistory();
                                    if (qrScanStatus === "success") {
                                      setQrScanStatus("idle");
                                      setQrScanResult(null);
                                    }
                                  }}
                                  className="text-[9px] font-mono font-bold px-2.5 py-1 rounded bg-neutral-800 hover:bg-red-950/80 text-neutral-300 hover:text-red-300 border border-neutral-700 hover:border-red-800/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                  title="Clear all scanned items from current session history"
                                >
                                  <Trash2 className="w-3 h-3 text-red-400" />
                                  Clear List
                                </button>
                              </>
                            )}
                            {lastThreeScans.length > 0 && (
                              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded hidden sm:flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Session Active
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Scanned Items Cards Grid */}
                        {lastThreeScans.length > 0 ? (
                          <div className="p-3 bg-neutral-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                              {lastThreeScans.map((item, index) => {
                                const matchedSlab = VISION_SLABS.find(s => s.lot.toUpperCase() === item.lot.toUpperCase() || s.id === item.slabId);
                                const isSelected = qrScanResult === (matchedSlab?.id || item.slabId) && qrScanStatus === "success";
                                const isDuplicate = (lotCounts[item.lot.toUpperCase()] || 0) > 1;
                                
                                return (
                                  <div
                                    key={item.id || index}
                                    onClick={() => {
                                      autoVerifyQrCode(item.lot);
                                    }}
                                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 group ${
                                      isDuplicate
                                        ? isSelected
                                          ? "bg-red-50 border-red-500 shadow-sm ring-2 ring-red-400/80"
                                          : "bg-red-50/80 border-red-300 hover:border-red-400 hover:shadow-2xs ring-1 ring-red-200"
                                        : isSelected
                                          ? "bg-gold/10 border-gold shadow-sm ring-1 ring-gold/30"
                                          : "bg-white border-neutral-200 hover:border-gold/60 hover:shadow-2xs"
                                    }`}
                                  >
                                    {/* Top Row: Tag badge + timestamp */}
                                    <div className="flex justify-between items-center">
                                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                        isDuplicate
                                          ? "bg-red-900 text-red-100 border border-red-700 flex items-center gap-1"
                                          : "bg-neutral-900 text-gold"
                                      }`}>
                                        {isDuplicate && <AlertTriangle className="w-2.5 h-2.5 text-red-300 shrink-0" />}
                                        #{index + 1} • {item.lot}
                                      </span>
                                      <span className="text-[9px] font-mono text-neutral-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-neutral-400" />
                                        {item.scannedAt}
                                      </span>
                                    </div>

                                    {/* Middle Row: Name and Class */}
                                    <div>
                                      <h5 className={`text-xs font-bold font-sans truncate transition-colors ${
                                        isDuplicate ? "text-red-950 group-hover:text-red-700" : "text-neutral-900 group-hover:text-gold"
                                      }`}>{item.slabName}</h5>
                                      <p className="text-[10px] text-neutral-500 font-mono truncate">{item.class || matchedSlab?.class || "Sintered Stone"}</p>
                                    </div>

                                    {/* Note Input Field */}
                                    <div className="pt-1 border-t border-neutral-100" onClick={(e) => e.stopPropagation()}>
                                      <div className="relative flex items-center">
                                        <FileText className="w-3 h-3 text-neutral-400 absolute left-2 pointer-events-none" />
                                        <input
                                          type="text"
                                          placeholder="Add note (e.g. Kitchen Countertop)..."
                                          value={item.note || ""}
                                          onChange={(e) => handleUpdateScanNote(item.id, e.target.value)}
                                          className="w-full text-[10px] pl-6 pr-2 py-1 rounded bg-neutral-100/80 hover:bg-white focus:bg-white border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 text-neutral-800 placeholder:text-neutral-400 font-sans outline-none transition-all"
                                        />
                                      </div>
                                    </div>

                                    {/* Bottom Row: Status & Action indicator */}
                                    <div className="pt-1.5 border-t border-neutral-100 flex items-center justify-between">
                                      {isDuplicate ? (
                                        <span className="text-[9px] font-mono text-red-700 font-bold flex items-center gap-1 bg-red-100 px-1.5 py-0.5 rounded border border-red-300">
                                          <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                                          Duplicate ({lotCounts[item.lot.toUpperCase()]}x)
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-mono text-emerald-700 font-semibold flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          Match 100%
                                        </span>
                                      )}
                                      <span className={`text-[9px] font-mono font-bold transition-colors ${
                                        isDuplicate ? "text-red-800" : isSelected ? "text-gold" : "text-neutral-400 group-hover:text-neutral-900"
                                      }`}>
                                        {isSelected ? "Active View" : "Load Tag →"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 text-center text-neutral-400 text-xs bg-white space-y-3 flex flex-col items-center">
                            <p>No items scanned yet in this active session. Point your lens at a QR code or pick a demo tag above.</p>
                            <button
                              onClick={() => {
                                setShowQrScanner(true);
                                setQrScanStatus("scanning");
                                setQrScanResult(null);
                                setQrScanError(null);
                                startQrCamera();
                              }}
                              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5 text-white" />
                              Scan Again / Start Camera
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* SCANNER TIPS ACCORDION SECTION */}
                  <div className="border border-neutral-200 rounded-xl bg-neutral-50/80 overflow-hidden shadow-2xs mt-4">
                    {/* Accordion Main Header */}
                    <div className="bg-neutral-900 text-white px-4 py-3 flex items-center justify-between border-b border-neutral-800">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-gold/20 border border-gold/40 rounded text-gold">
                          <Lightbulb className="w-4 h-4 text-gold" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold font-sans tracking-wide uppercase text-white flex items-center gap-2">
                            Scanner Best Practices & Tips
                            <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 uppercase tracking-widest hidden sm:inline-block">
                              High Accuracy Guide
                            </span>
                          </h4>
                          <p className="text-[10px] text-neutral-400">Essential rules for reticle alignment, focal distance, and glare control</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveScannerTipAccordion(prev => prev === "all" ? null : "all")}
                          className="text-[9px] font-mono text-gold hover:text-white px-2 py-1 rounded bg-neutral-800 border border-neutral-700 hover:border-gold transition-all cursor-pointer"
                        >
                          {activeScannerTipAccordion === "all" ? "Collapse All" : "Expand All"}
                        </button>
                      </div>
                    </div>

                    {/* Accordion Panels Container */}
                    <div className="divide-y divide-neutral-200/80 text-xs bg-white">
                      
                      {/* Item 1: Alignment & Angle */}
                      <div>
                        <button
                          onClick={() => setActiveScannerTipAccordion(prev => (prev === "alignment" || prev === "all") ? null : "alignment")}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors text-left cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg border transition-all ${
                              (activeScannerTipAccordion === "alignment" || activeScannerTipAccordion === "all")
                                ? "bg-neutral-950 border-gold/50 text-gold"
                                : "bg-neutral-100 border-neutral-200 text-neutral-600 group-hover:border-gold/30"
                            }`}>
                              <Target className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="font-bold text-neutral-900 text-xs flex items-center gap-2">
                                Reticle Alignment & Angle Control
                                <span className="text-[9px] font-mono font-normal text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  Parallel ±15°
                                </span>
                              </h5>
                              <p className="text-[11px] text-neutral-500">Square reticle framing and anti-glare tilt angle</p>
                            </div>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                            (activeScannerTipAccordion === "alignment" || activeScannerTipAccordion === "all") ? "rotate-180 text-gold" : ""
                          }`} />
                        </button>

                        {(activeScannerTipAccordion === "alignment" || activeScannerTipAccordion === "all") && (
                          <div className="px-4 pb-3.5 pt-1 text-neutral-600 space-y-2 border-t border-neutral-100 bg-neutral-50/50 animate-fade-in">
                            <p className="text-[11px] leading-relaxed">
                              Hold camera level and parallel to the physical slab label. Frame the 2D QR matrix squarely inside the illuminated gold reticle corners.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                              <div className="bg-white p-2 rounded border border-neutral-200 flex items-start gap-2 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-neutral-900 block font-sans">Square Centering</strong>
                                  Align crosshairs squarely over the batch Lot ID code tag.
                                </div>
                              </div>
                              <div className="bg-white p-2 rounded border border-neutral-200 flex items-start gap-2 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-neutral-900 block font-sans">10° Anti-Glare Tilt</strong>
                                  On high-gloss polished marble or quartzite, tilt 10° to eliminate specular light glare.
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Item 2: Optimal Distance & Focus */}
                      <div>
                        <button
                          onClick={() => setActiveScannerTipAccordion(prev => (prev === "distance" || prev === "all") ? null : "distance")}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors text-left cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg border transition-all ${
                              (activeScannerTipAccordion === "distance" || activeScannerTipAccordion === "all")
                                ? "bg-neutral-950 border-gold/50 text-gold"
                                : "bg-neutral-100 border-neutral-200 text-neutral-600 group-hover:border-gold/30"
                            }`}>
                              <Maximize2 className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="font-bold text-neutral-900 text-xs flex items-center gap-2">
                                Optimal Scan Distance & Frame Fill
                                <span className="text-[9px] font-mono font-normal text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                  15–30 cm
                                </span>
                              </h5>
                              <p className="text-[11px] text-neutral-500">Camera focal distance and target viewport ratio</p>
                            </div>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                            (activeScannerTipAccordion === "distance" || activeScannerTipAccordion === "all") ? "rotate-180 text-gold" : ""
                          }`} />
                        </button>

                        {(activeScannerTipAccordion === "distance" || activeScannerTipAccordion === "all") && (
                          <div className="px-4 pb-3.5 pt-1 text-neutral-600 space-y-2 border-t border-neutral-100 bg-neutral-50/50 animate-fade-in">
                            <p className="text-[11px] leading-relaxed">
                              Maintain a distance of <strong className="text-neutral-900 font-semibold">15 to 30 cm (6–12 inches)</strong>. Ensure the QR matrix occupies 40%–70% of the active scanner window for optimal optical focal resolution.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                              <div className="bg-white p-2 rounded border border-neutral-200 flex items-start gap-2 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-neutral-900 block font-sans">Ideal Distance Range</strong>
                                  15–30 cm avoids focal blur and allows fast auto-lock.
                                </div>
                              </div>
                              <div className="bg-white p-2 rounded border border-neutral-200 flex items-start gap-2 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-neutral-900 block font-sans">Frame Fill Ratio</strong>
                                  Target ~50% viewport coverage to maximize matrix contrast.
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Item 3: Lighting & Ambient Conditions */}
                      <div>
                        <button
                          onClick={() => setActiveScannerTipAccordion(prev => (prev === "lighting" || prev === "all") ? null : "lighting")}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors text-left cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg border transition-all ${
                              (activeScannerTipAccordion === "lighting" || activeScannerTipAccordion === "all")
                                ? "bg-neutral-950 border-gold/50 text-gold"
                                : "bg-neutral-100 border-neutral-200 text-neutral-600 group-hover:border-gold/30"
                            }`}>
                              <Lightbulb className="w-4 h-4 text-amber-500" />
                            </div>
                            <div>
                              <h5 className="font-bold text-neutral-900 text-xs flex items-center gap-2">
                                Lighting Conditions & Contrast
                                <span className="text-[9px] font-mono font-normal text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                  300+ Lux Ambient
                                </span>
                              </h5>
                              <p className="text-[11px] text-neutral-500">Warehouse illumination management and shadow prevention</p>
                            </div>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                            (activeScannerTipAccordion === "lighting" || activeScannerTipAccordion === "all") ? "rotate-180 text-gold" : ""
                          }`} />
                        </button>

                        {(activeScannerTipAccordion === "lighting" || activeScannerTipAccordion === "all") && (
                          <div className="px-4 pb-3.5 pt-1 text-neutral-600 space-y-2 border-t border-neutral-100 bg-neutral-50/50 animate-fade-in">
                            <p className="text-[11px] leading-relaxed">
                              Operate under bright, indirect warehouse lighting (300+ Lux). Avoid dark casting shadows or scanning directly under severe directional spotlights.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                              <div className="bg-white p-2 rounded border border-neutral-200 flex items-start gap-2 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-neutral-900 block font-sans">Balanced Illumination</strong>
                                  Ensure diffuse, even light across the entire label surface.
                                </div>
                              </div>
                              <div className="bg-white p-2 rounded border border-neutral-200 flex items-start gap-2 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-neutral-900 block font-sans">Shadow Avoidance</strong>
                                  Keep hand or phone shadows from blocking the label.
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* SCANNER TIPS OVERLAY MODAL */}
            {showScannerTips && (
              <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[250] animate-fade-in text-neutral-800">
                <div className="bg-white border border-gold/40 rounded-2xl p-6 max-w-lg w-full space-y-6 shadow-2xl relative overflow-hidden">
                  
                  {/* High tech background accent */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-gold/15 rounded-full blur-2xl pointer-events-none" />

                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-neutral-150 pb-4 relative">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-mono text-gold font-bold tracking-widest uppercase px-2 py-0.5 bg-neutral-950 rounded border border-gold/30">
                        <HelpCircle className="w-3 h-3 text-gold" />
                        SMC LOGISTICS SCANNER GUIDE
                      </span>
                      <h3 className="font-serif text-2xl font-bold text-neutral-900">
                        3-Step QR Alignment Guide
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Follow these simple calibration steps to align the scanner with standard SMC QR labels for maximum optical detection accuracy.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowScannerTips(false)}
                      className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800 transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* 3-Step Guide Cards */}
                  <div className="space-y-3.5">
                    
                    {/* Step 1 */}
                    <div className="flex gap-3.5 p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-xl hover:border-gold/50 transition-all">
                      <div className="w-9 h-9 rounded-xl bg-neutral-950 border border-gold/40 text-gold flex items-center justify-center font-mono font-bold text-sm shrink-0">
                        1
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-gold" />
                          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-mono">
                            Optimal Framing & Distance (15–30 cm)
                          </h4>
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          Position your camera <strong className="text-neutral-900">15–30 cm (6–12 inches)</strong> away from the physical SMC slab label. Frame the QR code squarely inside the illuminated gold reticle corners.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-3.5 p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-xl hover:border-gold/50 transition-all">
                      <div className="w-9 h-9 rounded-xl bg-neutral-950 border border-gold/40 text-gold flex items-center justify-center font-mono font-bold text-sm shrink-0">
                        2
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-mono">
                            Perpendicular Angle & Anti-Glare
                          </h4>
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          Align camera perpendicular to the slab label. On high-gloss polished marble or quartzite, <strong className="text-neutral-900">tilt slightly (10°)</strong> to eliminate specular reflections from overhead warehouse lights.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-3.5 p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-xl hover:border-gold/50 transition-all">
                      <div className="w-9 h-9 rounded-xl bg-neutral-950 border border-gold/40 text-gold flex items-center justify-center font-mono font-bold text-sm shrink-0">
                        3
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-mono">
                            Hold Still for Auto-Lock
                          </h4>
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          Hold your device steady for <strong className="text-neutral-900">1 second</strong>. The laser scanner will auto-focus on the batch Lot ID (<code className="bg-neutral-200 text-neutral-800 px-1 rounded text-[10px]">e.g. B8492-V2</code>) and chime upon 100% verification match.
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Standard SMC Label Format Banner */}
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-neutral-900 border border-gold/40 rounded text-gold">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-gold font-bold uppercase tracking-wider block">Standard SMC Label Spec</span>
                        <span className="text-xs font-mono font-bold text-white">SMC-LOT-[LOT_ID] / 2D Matrix</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                      ISO/IEC 18004
                    </span>
                  </div>

                  {/* Action Footer */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setShowScannerTips(false)}
                      className="flex-1 bg-neutral-950 hover:bg-gold text-white hover:text-neutral-950 font-mono font-bold text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>Got It, Resume Scanner</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowScannerTips(false);
                        setShowQrScanner(true);
                        playScanBeep();
                        const sample = VISION_SLABS[0];
                        setQrScanResult(sample.id);
                        setQrScanStatus("success");
                        addScanToHistory(sample.lot);
                      }}
                      className="border border-neutral-300 hover:border-gold text-neutral-700 hover:text-gold font-mono font-bold text-xs py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5 text-gold" />
                      <span>Test Demo Scan</span>
                    </button>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 6: ACCOUNT & PROFILE (VIP TRADE PARTNER) */}
        {/* ========================================================= */}
        {activeTab === "account" && (
          <ErrorBoundary fallbackTitle="Account Settings Temporary Error">
            <AccountView
              userEmail={authEmail}
              canAccessAdmin={canAccessAdmin}
              onLogout={handleLogout}
              onNavigate={(tab) => setActiveTab(tab as any)}
              onOpenFinanceModal={() => setShowFinanceModal(true)}
              onOpenReferralsModal={() => setShowReferralsModal(true)}
              onOpenWhatsAppModal={() => setShowWhatsAppModal(true)}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW 7: AI ROOM DESIGNER & VISUALIZER */}
        {/* ========================================================= */}
        {activeTab === "design-studio" && (
          <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-[#1A1A1A] text-white rounded-2xl p-6 md:p-8 border border-neutral-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
              <div className="space-y-2 z-10">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-gold/20 text-gold border border-gold/40 uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5" /> AI Room Designer & Material Visualizer
                </span>
                <h2 className="font-serif text-2xl md:text-4xl text-white font-medium">Interactive Room Studio</h2>
                <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
                  Upload a photo of your space or select an architectural preset to preview luxury marble, quartzite, and porcelain surfaces in real-time.
                </p>
              </div>

              <div className="flex gap-3 z-10">
                <button
                  onClick={() => setShowAppointmentModal(true)}
                  className="bg-gold hover:bg-amber-400 text-[#1A1A1A] px-5 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Calendar className="w-4 h-4" /> Book Survey
                </button>
              </div>
            </div>

            {/* Main Interactive Studio Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Visualizer Canvas */}
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs relative group">
                  
                  {/* Canvas Image Container */}
                  <div className="h-96 md:h-[480px] w-full relative bg-neutral-900 flex items-center justify-center overflow-hidden">
                    <img
                      src={selectedMaterial?.image || selectedMaterial?.img || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"}
                      alt="Room visualizer"
                      className="w-full h-full object-cover opacity-90 transition-all duration-700"
                    />
                    
                    {/* Overlay Material Badge */}
                    <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md text-white p-3 rounded-xl border border-white/10 flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-gold/20 border border-gold flex items-center justify-center p-1 overflow-hidden">
                        <img 
                          alt="SMC PRO Logo" 
                          className="w-full h-full object-contain filter brightness-0 invert" 
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBXNV_RiofajRHjAoUdeRL9DEe2QkYbM7Tc0A4TQGbDMcjFQw7Q5zg9KIK2ijao316cxP_79D-6J5NzIHqGSsKu4We4TrVBU9wXJ-Oki7eDSGHaKKrZC6H9bitIoGlyNOMKRzOMOxJ7P98OaPN4DFpS7I8k6ifbcEAbyIrTMtqR8d6Yfx7XBkh3itiTP9iEqSYh_FMLknw4CwMtdIRxcCZr-5-A3zhzsZvV5yGDXPOTs9J_FTIffTZ0lCxFXwpnnkh4xJeo_osw6k"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-gold uppercase tracking-widest block font-bold">ACTIVE SURFACE</span>
                        <span className="text-xs font-serif font-bold text-white block">{selectedMaterial?.name || "Calacatta Gold Quartz"}</span>
                      </div>
                    </div>

                    {/* Camera Upload Badge overlay button */}
                    <label className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-neutral-900 px-4 py-2.5 rounded-xl font-mono text-xs font-bold border border-neutral-200 shadow-lg cursor-pointer flex items-center gap-2 transition-all">
                      <Camera className="w-4 h-4 text-gold" />
                      <span>Upload Room Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            alert("Room photo uploaded! Processing spatial surfaces...");
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Room Presets Switcher Bar */}
                  <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between overflow-x-auto gap-3">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider font-bold shrink-0">Sample Presets:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedMaterial(MATERIALS_CATALOG[0])}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-white border border-neutral-300 text-neutral-800 hover:border-gold transition-all"
                      >
                        Kitchen Worktop & Island
                      </button>
                      <button
                        onClick={() => setSelectedMaterial(MATERIALS_CATALOG[1])}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-white border border-neutral-300 text-neutral-800 hover:border-gold transition-all"
                      >
                        Master Bathroom Vanity
                      </button>
                      <button
                        onClick={() => setSelectedMaterial(MATERIALS_CATALOG[2])}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-white border border-neutral-300 text-neutral-800 hover:border-gold transition-all"
                      >
                        Feature Wall & Hearth
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Surface Material Swatch Selector & Actions */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-xs">
                  <h3 className="font-serif text-lg font-medium text-neutral-900 border-b border-neutral-100 pb-3">
                    Select Surface Material
                  </h3>

                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                    {MATERIALS_CATALOG.slice(0, 6).map((mat) => (
                      <button
                        key={mat.id}
                        onClick={() => setSelectedMaterial(mat)}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          selectedMaterial?.id === mat.id
                            ? "bg-gold/10 border-gold shadow-xs"
                            : "bg-neutral-50 border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={mat.image || mat.img || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80"}
                            alt={mat.name}
                            className="w-10 h-10 rounded-lg object-cover border border-neutral-200 shrink-0"
                          />
                          <div>
                            <span className="text-xs font-bold font-serif text-neutral-900 block">{mat.name}</span>
                            <span className="text-[10px] font-mono text-neutral-500 block">{mat.type || mat.class || mat.category || "Quartz"} • {mat.mohs} Mohs</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => setActiveTab("estimator")}
                      className="w-full py-3 bg-[#1A1A1A] hover:bg-gold text-white hover:text-[#1A1A1A] font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <Calculator className="w-4 h-4" />
                      <span>Calculate Quote for this Material</span>
                    </button>
                    
                    <button
                      onClick={() => handleOpenCompareWithMaterial(selectedMaterial?.id || "calacatta-gold")}
                      className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Columns className="w-3.5 h-3.5 text-gold" />
                      <span>Compare Specs Side-by-Side</span>
                    </button>
                  </div>

                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW: TECHNICAL LIBRARY & SPECIFICATIONS */}
        {/* ========================================================= */}
        {(activeTab === "technical-library" || activeTab === "library") && (
          <ErrorBoundary fallbackTitle="Technical Library Temporary Error">
            <TechnicalLibraryView
              onOpenSideMenu={() => setIsSideMenuOpen(true)}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW: JOINT DETAILS SPECIFICATIONS */}
        {/* ========================================================= */}
        {activeTab === "joint-details" && (
          <ErrorBoundary fallbackTitle="Joint Details Temporary Error">
            <JointDetailsView
              onBack={() => setActiveTab("technical-library")}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW: PROJECT COMMAND CENTER (SMC PRO) */}
        {/* ========================================================= */}
        {activeTab === "project-command" && (
          <ErrorBoundary fallbackTitle="Project Command Center Temporary Error">
            <ProjectCommandView
              onOpenSideMenu={() => setIsSideMenuOpen(true)}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW: EXECUTIVE FINANCIAL COMMAND */}
        {/* ========================================================= */}
        {activeTab === "financial-command" && (
          <ErrorBoundary fallbackTitle="Financial Command Temporary Error">
            {userRole === "client" ? (
              <ManagerSecurityGate
                title="Executive Financial Command Restricted"
                description="Financial margins, wholesale ledger metrics, and revenue velocity models are restricted to SMC Pro Fabrication Managers."
                onSwitchToManager={() => handleRoleToggle("manager")}
                onNavigateHome={() => setActiveTab("dashboard")}
              />
            ) : (
              <FinancialCommandView />
            )}
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW: OBSIDIAN COMMAND & DEPLOYMENT TELEMETRY */}
        {/* ========================================================= */}
        {(activeTab === "publishing-command" || activeTab === "telemetry" || activeTab === "obsidian-command") && (
          <ErrorBoundary fallbackTitle="Publishing Command Temporary Error">
            {userRole === "client" ? (
              <ManagerSecurityGate
                title="Publishing & Telemetry Operations Restricted"
                description="Live system telemetry, API diagnostic logs, and build portal deployment switches are restricted to SMC Pro Managers."
                onSwitchToManager={() => handleRoleToggle("manager")}
                onNavigateHome={() => setActiveTab("dashboard")}
              />
            ) : (
              <PublishingCommandCenterView
                onNavigateHome={() => setActiveTab("dashboard")}
                userEmail={authEmail}
              />
            )}
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW: DIGITAL CURATOR MUSEUM-GRADE VAULT */}
        {/* ========================================================= */}
        {(activeTab === "digital-curator" || activeTab === "curator") && (
          <ErrorBoundary fallbackTitle="Digital Curator Temporary Error">
            <DigitalCuratorView
              onNavigateTab={(tab) => setActiveTab(tab as any)}
              onNavigateToEstimator={(matId) => {
                if (matId) {
                  const found = MATERIALS_CATALOG.find(m => m.id === matId);
                  if (found) setSelectedMaterial(found);
                }
                setActiveTab("estimator");
              }}
              projects={projects}
              onBindMaterialToProject={(projectId, materialName) => {
                const today = new Date().toLocaleDateString('en-GB');
                setProjects(prev => prev.map(p => {
                  if (p.id === projectId) {
                    return {
                      ...p,
                      notes: (p.notes || "") + `\n[${today}] Specified Curator Material: ${materialName}`,
                      updatedAt: new Date().toISOString().split('T')[0]
                    };
                  }
                  return p;
                }));
                setActiveTab("projects");
              }}
              userEmail={authEmail}
              onOpenAppointmentModal={() => setShowAppointmentModal(true)}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW: ARCHITECTURAL FINALIZATION WALKTHROUGH */}
        {/* ========================================================= */}
        {(activeTab === "walkthrough" || activeTab === "exhibition" || activeTab === "walkthrough-exhibition") && (
          <ErrorBoundary fallbackTitle="Exhibition Walkthrough Temporary Error">
            <ExhibitionWalkthroughView
              onNavigateHome={() => setActiveTab("dashboard")}
              userEmail={authEmail}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW: BLOCKCHAIN PROVENANCE & GEOLOGICAL LEDGER */}
        {/* ========================================================= */}
        {(activeTab === "provenance-blockchain" || activeTab === "blockchain" || activeTab === "provenance-ledger") && (
          <ErrorBoundary fallbackTitle="Geological Provenance Temporary Error">
            <GeologicalProvenanceView
              onNavigateHome={() => setActiveTab("dashboard")}
              userEmail={authEmail}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW: SUBSTRATE SPECIFICATIONS */}
        {/* ========================================================= */}
        {(activeTab === "substrate-specs" || activeTab === "substrates") && (
          <ErrorBoundary fallbackTitle="Substrate Specs Temporary Error">
            <SubstrateSpecsView
              onBack={() => setActiveTab("technical-library")}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW: EDGE PROFILE SPECIFICATIONS */}
        {/* ========================================================= */}
        {activeTab === "edge-profiles" && (
          <ErrorBoundary fallbackTitle="Edge Profiles Temporary Error">
            <EdgeProfilesView
              onNavigateToEstimator={(profileName) => {
                setEstimateParts(prev => {
                  if (prev.length > 0) {
                    const copy = [...prev];
                    copy[0] = { ...copy[0], edgeProfile: profileName };
                    return copy;
                  }
                  return prev;
                });
                setActiveTab("estimator");
              }}
              onNavigateToProjects={() => setActiveTab("projects")}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW: SMC AR MEASURE TOOL */}
        {/* ========================================================= */}
        {activeTab === "measure-tool" && (
          <ErrorBoundary fallbackTitle="Measure Tool Temporary Error">
            <MeasureTool
              onClose={() => setActiveTab("dashboard")}
              projects={projects.map(p => ({ id: p.id, name: p.name, address: p.address }))}
              onNavigateToEstimator={({ lengthMm, widthMm }) => {
                setEstimateParts(prev => {
                  if (prev.length > 0) {
                    const copy = [...prev];
                    const lengthInches = Math.round(lengthMm / 25.4);
                    const widthInches = Math.round(widthMm / 25.4);
                    copy[0] = {
                      ...copy[0],
                      length: lengthInches || 110,
                      width: widthInches || 48
                    };
                    return copy;
                  }
                  return prev;
                });
                setActiveTab("estimator");
              }}
              onSaveToProject={(data) => {
                if (projects.length > 0) {
                  const targetId = projects[0].id;
                  const noteText = `[AR MEASURE SPEC]: ${data.lengthMm}mm x ${data.widthMm}mm (${data.areaSqFt} sq ft). Total perimeter: ${data.perimeterM}m. Captured ${data.points.length} points on ${new Date().toLocaleDateString()}.`;
                  setProjects(prev => prev.map(p => {
                    if (p.id === targetId) {
                      return {
                        ...p,
                        notes: `${noteText}\n` + p.notes
                      };
                    }
                    return p;
                  }));
                }
              }}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW 14: TECHNICAL SITE READINESS PROTOCOL */}
        {/* ========================================================= */}
        {activeTab === "site-readiness" && (
          <ErrorBoundary fallbackTitle="Site Readiness Temporary Error">
            <SiteReadinessView
              onNavigate={(tab) => setActiveTab(tab as any)}
              onOpenAppointmentModal={() => setShowAppointmentModal(true)}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW 15: DAILY TREASURE VAULT */}
        {/* ========================================================= */}
        {activeTab === "vault" && (
          <ErrorBoundary fallbackTitle="Daily Treasure Vault Temporary Error">
            <DailyTreasureVault
              onNavigate={(tab) => setActiveTab(tab as any)}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW 16: RENOVATION TECHNICAL QUIZ */}
        {/* ========================================================= */}
        {activeTab === "quiz" && (
          <ErrorBoundary fallbackTitle="Renovation Quiz Temporary Error">
            <RenovationQuiz
              onNavigate={(tab) => setActiveTab(tab as any)}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW 17: REFERRAL COMMAND CENTER */}
        {/* ========================================================= */}
        {activeTab === "referral-command" && (
          <ErrorBoundary fallbackTitle="Referral Command Temporary Error">
            <ReferralsCommandView
              onNavigate={(tab) => setActiveTab(tab as any)}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW 18: ARTISAN ATELIER SHOP & HARDWARE */}
        {/* ========================================================= */}
        {activeTab === "artisan-shop" && (
          <ErrorBoundary fallbackTitle="Artisan Shop Temporary Error">
            <ArtisanShopView
              onBackToDashboard={() => setActiveTab("dashboard")}
              userEmail={authEmail}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW 19: ARCHSTONE ELITE VAULT - BULK SLAB RESERVE */}
        {/* ========================================================= */}
        {activeTab === "slab-reserve" && (
          <ErrorBoundary fallbackTitle="Bulk Slab Reserve Temporary Error">
            <BulkSlabReserveView
              projects={projects}
              onNavigateToProject={(projId) => {
                setActiveTab("projects");
              }}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW 20: PRIVACY POLICY DIRECTIVE */}
        {/* ========================================================= */}
        {(activeTab === "privacy-policy" || activeTab === "privacy") && (
          <ErrorBoundary fallbackTitle="Privacy Policy Temporary Error">
            <PrivacyPolicyView
              onBackToApp={() => setActiveTab("dashboard")}
              onOpenComplianceHub={() => setActiveTab("data-compliance")}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW 21: TERMS OF USE & FABRICATION CONTRACT */}
        {/* ========================================================= */}
        {(activeTab === "terms-of-service" || activeTab === "terms") && (
          <ErrorBoundary fallbackTitle="Terms of Service Temporary Error">
            <TermsOfServiceView
              onBackToApp={() => setActiveTab("dashboard")}
              onOpenStripePayment={() => setActiveTab("stripe-payment")}
            />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW 22: DATA COMPLIANCE & DSAR HUB */}
        {/* ========================================================= */}
        {(activeTab === "data-compliance" || activeTab === "compliance") && (
          <ErrorBoundary fallbackTitle="Data Compliance Temporary Error">
            <DataComplianceHub />
          </ErrorBoundary>
        )}

        {/* ========================================================= */}
        {/* VIEW 23: STRIPE PAYMENT GATEWAY */}
        {/* ========================================================= */}
        {(activeTab === "stripe-payment" || activeTab === "stripe") && (
          <ErrorBoundary fallbackTitle="Stripe Payment Temporary Error">
            <StripePaymentGateway
              onClose={() => setActiveTab("dashboard")}
            />
          </ErrorBoundary>
        )}

      </main>

      {/* 🌟 PROMINENT & STRATEGIC SIGN-UP CTA BANNER AT THE VERY BOTTOM OF THE PAGE */}
      <div className="w-full bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-t border-b border-amber-500/50 py-6 px-6 md:px-16 shadow-2xl relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5 relative z-10">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                Join SMC Pro Free • No Credit Card Required
              </span>
            </div>
            <h3 className="font-serif text-lg md:text-xl font-bold text-white tracking-tight">
              Ready to Design Your Dream Kitchen &amp; Track Slab Templating Live?
            </h3>
            <p className="text-xs text-neutral-300 max-w-xl">
              Create your account in under 30 seconds to save 3D renders, request instant trade estimates, and receive live SMS updates on your project.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setPortalView("register");
                setShowPortalModal(true);
              }}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-mono text-xs font-bold uppercase tracking-wider shadow-xl transition-all cursor-pointer flex items-center gap-2 transform hover:scale-105"
            >
              <UserPlus className="w-4 h-4 text-neutral-950" />
              <span>Sign Up Free / Create Account</span>
            </button>
            <button
              onClick={() => {
                setPortalView("login");
                setShowPortalModal(true);
              }}
              className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold border border-neutral-700 transition-all cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-[#121212] text-white border-t border-neutral-800 py-10 px-6 md:px-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <img 
              alt="SMC PRO Logo" 
              className="h-8 w-auto object-contain brightness-0 invert" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBXNV_RiofajRHjAoUdeRL9DEe2QkYbM7Tc0A4TQGbDMcjFQw7Q5zg9KIK2ijao316cxP_79D-6J5NzIHqGSsKu4We4TrVBU9wXJ-Oki7eDSGHaKKrZC6H9bitIoGlyNOMKRzOMOxJ7P98OaPN4DFpS7I8k6ifbcEAbyIrTMtqR8d6Yfx7XBkh3itiTP9iEqSYh_FMLknw4CwMtdIRxcCZr-5-A3zhzsZvV5yGDXPOTs9J_FTIffTZ0lCxFXwpnnkh4xJeo_osw6k"
            />
            <div className="space-y-0.5">
              <h5 className="font-serif font-bold text-sm text-white tracking-wide">SMC PRO GLOBAL SYSTEMS</h5>
              <p className="text-xs text-neutral-400">High-Precision Architectural Surface Fabrication & Construction Standards.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-300">
            <button 
              onClick={() => {
                setPortalView("register");
                setShowPortalModal(true);
              }} 
              className="text-amber-400 font-bold hover:text-gold transition-colors cursor-pointer flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up Free</span>
            </button>
            <button onClick={() => setShowTermsModal(true)} className="hover:text-[#D4AF37] transition-colors cursor-pointer font-medium">
              Privacy Policy
            </button>
            <button onClick={() => setShowTermsModal(true)} className="hover:text-[#D4AF37] transition-colors cursor-pointer font-medium">
              Terms & Conditions
            </button>
            <button onClick={() => setActiveTab("estimator")} className="hover:text-[#D4AF37] transition-colors cursor-pointer font-medium">
              Request Quote
            </button>
            <button onClick={() => setShowWhatsAppModal(true)} className="hover:text-[#D4AF37] transition-colors cursor-pointer font-medium">
              WhatsApp Support
            </button>
          </div>

          <div className="text-neutral-400 text-xs font-mono uppercase tracking-wider space-y-1 text-center md:text-right">
            <p>© {new Date().getFullYear()} SMC PRO STONE & CONSTRUCTION LTD. ALL RIGHTS RESERVED.</p>
            <p className="text-[10px] text-[#D4AF37] font-bold">UK GDPR Compliant • ISO 9001 Certified</p>
          </div>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* NEW PROJECT CREATION MODAL (UK DETAIL SPEC) */}
      {/* ========================================================= */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-neutral-200 rounded-lg p-6 max-w-md w-full space-y-6 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded w-fit">
                UK Specification Protocol
              </div>
              <h3 className="font-serif text-2xl font-medium text-neutral-800">New Project Pipeline</h3>
              <p className="text-xs text-neutral-500">Establish a UK-compliant project dossier to coordinate RIBA template estimations, BS 8298 fabrication logs, and British stone masonry standards.</p>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Project / Site Name (UK Format)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Knightsbridge Townhouse (SW1X)"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Installation Address (UK Postcode Required)</label>
                <input
                  type="text"
                  placeholder="e.g. 14 Eaton Square, Belgravia, London SW1W 9DD"
                  value={newProjectAddress}
                  onChange={(e) => setNewProjectAddress(e.target.value)}
                  className="w-full bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded px-3 py-2 text-xs transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">UK Specification Notes & Standards</label>
                <textarea
                  rows={3}
                  placeholder="Note RIBA Stage 4 layout preferences, BS 8298 structural fixings, BS EN 1469 slab specs, or vein matching requirements..."
                  value={newProjectNotes}
                  onChange={(e) => setNewProjectNotes(e.target.value)}
                  className="w-full text-xs bg-[#FBFBFA] border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/30 rounded p-2.5 transition-all font-sans leading-relaxed"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="border border-neutral-300 hover:border-neutral-400 text-neutral-600 px-4 py-2 rounded text-xs font-semibold tracking-wider uppercase transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="create-project-btn"
                  type="submit"
                  className="bg-[#1A1A1A] hover:bg-gold text-white px-5 py-2 rounded text-xs font-semibold tracking-wider uppercase transition-colors"
                >
                  Initialize Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STORY VIEWER MODAL */}
      {/* ========================================================= */}
      {activeStoryIndex !== null && (
        <div className="fixed inset-0 bg-neutral-950/95 backdrop-blur-md z-[90] flex items-center justify-center p-0 md:p-4 animate-fade-in">
          <div className="relative w-full max-w-md h-full md:h-[80vh] md:aspect-[9/16] bg-[#0E0E0E] md:rounded-2xl overflow-hidden shadow-2xl border border-neutral-900 flex flex-col justify-between">
            
            {/* Top Indicator / Progress Bars */}
            <div className="absolute top-4 inset-x-4 z-30 flex gap-1.5">
              {STORIES.map((story, idx) => {
                let widthPercent = 0;
                if (idx < activeStoryIndex) widthPercent = 100;
                else if (idx === activeStoryIndex) widthPercent = storyProgress;
                
                return (
                  <div key={story.id} className="h-1 flex-1 bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gold transition-all duration-100 ease-linear" 
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Top Info Header */}
            <div className="absolute top-8 inset-x-4 z-30 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full border border-gold/40 overflow-hidden bg-neutral-800">
                  <img 
                    alt="SMC Lookbook Logo" 
                    className="w-full h-full object-cover" 
                    src={STORIES[activeStoryIndex].image}
                  />
                </div>
                <div>
                  <span className="text-xs font-bold tracking-wider uppercase block">{STORIES[activeStoryIndex].title}</span>
                  <span className="text-[9px] text-neutral-400 font-mono tracking-widest block uppercase">{STORIES[activeStoryIndex].tagline}</span>
                </div>
              </div>
              <button 
                onClick={() => setActiveStoryIndex(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-neutral-300 hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Immersive Image Canvas */}
            <div className="absolute inset-0 z-10">
              <img 
                alt={STORIES[activeStoryIndex].title}
                className="w-full h-full object-cover brightness-90"
                src={STORIES[activeStoryIndex].image}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/50" />
            </div>

            {/* Left and Right click targets to navigate */}
            <div className="absolute inset-y-12 inset-x-0 z-20 flex">
              <div 
                className="w-1/3 h-full cursor-w-resize" 
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeStoryIndex > 0) {
                    setActiveStoryIndex(activeStoryIndex - 1);
                    setStoryProgress(0);
                  }
                }}
              />
              <div className="w-1/3 h-full" />
              <div 
                className="w-1/3 h-full cursor-e-resize" 
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeStoryIndex < STORIES.length - 1) {
                    setActiveStoryIndex(activeStoryIndex + 1);
                    setStoryProgress(0);
                  } else {
                    setActiveStoryIndex(null);
                  }
                }}
              />
            </div>

            {/* Bottom Content Narrative */}
            <div className="absolute bottom-6 inset-x-6 z-30 space-y-4">
              <div className="space-y-2 bg-black/40 backdrop-blur-xs p-4 rounded-xl border border-white/5">
                {STORIES[activeStoryIndex].badge && (
                  <span className="inline-block bg-gold text-[#1A1A1A] font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-mono">
                    {STORIES[activeStoryIndex].badge}
                  </span>
                )}
                <p className="text-xs md:text-sm font-sans text-neutral-200 font-medium leading-relaxed">
                  {STORIES[activeStoryIndex].narrative}
                </p>
              </div>

              {/* Navigation help or quick details action */}
              <div className="flex justify-between items-center pt-3 border-t border-white/10 text-white/50 text-[10px]">
                <span className="font-mono">TAP EDGES TO NAVIGATE</span>
                <span className="font-sans font-bold hover:text-white cursor-pointer flex items-center gap-1" onClick={() => setActiveStoryIndex(null)}>
                  EXIT LOOKBOOK <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Project PDF Proposal Modal */}
      {pdfProject && (
        <ProjectPdfModal
          project={pdfProject}
          onClose={() => setPdfProject(null)}
          getMaterialById={getMaterialById}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Digital Installation Sign-Off Canvas Overlay Modal */}
      {signoffModalProject && (
        <DigitalSignoffModal
          isOpen={!!signoffModalProject}
          project={signoffModalProject}
          onClose={() => setSignoffModalProject(null)}
          onSaveSignoff={handleSaveDigitalSignoff}
        />
      )}

      {/* Technician Edge Finishing Log Modal */}
      {activeLogModalProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fadeIn space-y-4 p-6">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-gold" />
                <h3 className="font-serif text-lg font-bold text-neutral-900">
                  Log Edge Finishing & Fabrication Step
                </h3>
              </div>
              <button
                onClick={() => setActiveLogModalProjectId(null)}
                className="text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                  Fabrication Step / Action Name *
                </label>
                <input
                  type="text"
                  value={newLogStep}
                  onChange={(e) => setNewLogStep(e.target.value)}
                  placeholder="e.g. Mitered Apron Edge Polishing, Bevel Radius Grind..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-800 focus:ring-1 focus:ring-gold focus:border-gold font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                    Technician Name & Title
                  </label>
                  <input
                    type="text"
                    value={newLogTechnician}
                    onChange={(e) => setNewLogTechnician(e.target.value)}
                    placeholder="e.g. M. Davies (Senior Mason)"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-800 focus:ring-1 focus:ring-gold focus:border-gold font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                    Edge Profile
                  </label>
                  <input
                    type="text"
                    value={newLogProfile}
                    onChange={(e) => setNewLogProfile(e.target.value)}
                    placeholder="e.g. 50mm Mitered Apron, Ogee..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-800 focus:ring-1 focus:ring-gold focus:border-gold font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                    Diamond Grit Sequence
                  </label>
                  <input
                    type="text"
                    value={newLogGritSequence}
                    onChange={(e) => setNewLogGritSequence(e.target.value)}
                    placeholder="e.g. 200 -> 800 -> 1500 -> 3000 -> Diamond Felt"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-800 focus:ring-1 focus:ring-gold focus:border-gold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                    Signoff Status
                  </label>
                  <select
                    value={newLogStatus}
                    onChange={(e) => setNewLogStatus(e.target.value as any)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-800 focus:ring-1 focus:ring-gold focus:border-gold font-sans cursor-pointer"
                  >
                    <option value="Approved">Approved (Certified)</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending Inspection">Pending Inspection</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                onClick={() => setActiveLogModalProjectId(null)}
                className="px-4 py-2 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddEdgeFinishingLog(activeLogModalProjectId)}
                disabled={!newLogStep.trim()}
                className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-gold hover:text-neutral-950 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
              >
                Save Log Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side Menu Drawer */}
      <SideMenuDrawer
        isOpen={isSideMenuOpen}
        onClose={() => setIsSideMenuOpen(false)}
        activeTab={activeTab}
        onNavigate={(tab) => setActiveTab(tab)}
        onOpenCompareModal={() => setShowCompareModal(true)}
        onOpenFinanceModal={() => setShowFinanceModal(true)}
        onOpenAppointmentModal={() => setShowAppointmentModal(true)}
        onOpenReferralsModal={() => setShowReferralsModal(true)}
        onOpenWhatsAppModal={() => setShowWhatsAppModal(true)}
        onOpenLegalDocsModal={() => setShowLegalDocsModal(true)}
        onOpenSignUpModal={() => {
          setPortalView("register");
          setShowPortalModal(true);
        }}
        userRole={userRole}
        onToggleRole={handleRoleToggle}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={(lang) => {
          setSelectedLanguage(lang);
          localStorage.setItem("smc_pro_lang", lang);
        }}
        userEmail={authEmail}
        onLogout={handleLogout}
      />

      {/* Global Command & Material Search Modal */}
      <GlobalSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onNavigate={(tab) => setActiveTab(tab)}
        materialsCatalog={MATERIALS_CATALOG}
        projects={projects}
      />

      {/* Finance Payment Calculator Modal */}
      <FinanceCalculatorModal
        isOpen={showFinanceModal}
        onClose={() => setShowFinanceModal(false)}
      />

      {/* Book Survey / Appointment Modal */}
      <BookAppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
      />

      {/* Trade Referral & Rewards Modal */}
      <ReferralsModal
        isOpen={showReferralsModal}
        onClose={() => setShowReferralsModal(false)}
      />

      {/* WhatsApp Modal & Floating Action Button */}
      <WhatsAppAgentModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onOpenAppointmentModal={() => {
          setShowWhatsAppModal(false);
          setShowAppointmentModal(true);
        }}
        onOpenQuoteModal={() => {
          setShowWhatsAppModal(false);
          setActiveTab("estimator");
        }}
      />
      
      <WhatsAppFloatingButton
        onClick={() => setShowWhatsAppModal(true)}
        unreadCount={1}
      />

      {/* Pre-Camera Permission Explainer Modal */}
      {showCameraExplainerModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-gold/40 text-white rounded-2xl p-6 md:p-8 max-w-md w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 text-gold flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-gold" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-gold font-bold uppercase tracking-wider block">
                  Camera Access Explainer
                </span>
                <h3 className="font-serif text-lg font-bold text-white">
                  Camera Privacy & Usage Notice
                </h3>
              </div>
            </div>

            <div className="space-y-3 text-xs text-neutral-300 leading-relaxed font-sans">
              <p>
                We use your camera to preview stone finishes in your room and scan slab QR codes. Your camera stream is processed locally and never stored without consent.
              </p>
              <div className="p-3 bg-black/60 border border-neutral-800 rounded-xl space-y-1.5 font-mono text-[11px] text-neutral-400">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>On-Device Edge Processing</span>
                </div>
                <p className="text-[10px] leading-tight">
                  No video recordings or photos leave your device without explicit approval.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setCameraPermissionAccepted(true);
                  setShowCameraExplainerModal(false);
                  try {
                    localStorage.setItem("smc_camera_permission_granted", "true");
                  } catch (e) {}
                  setShowQrScanner(true);
                  startQrCamera();
                }}
                className="flex-1 py-2.5 px-4 bg-gold hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Grant Access & Start</span>
              </button>
              <button
                onClick={() => setShowCameraExplainerModal(false)}
                className="py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Sign-off Modal */}
      <DigitalSignoffModal
        isOpen={!!signoffModalProject}
        onClose={() => setSignoffModalProject(null)}
        project={signoffModalProject}
        onSaveSignoff={(projectId, signoffData) => {
          handleSaveDigitalSignoff(projectId, signoffData);
        }}
      />

      {/* Project Specification PDF Modal */}
      <ProjectPdfModal
        project={pdfProject}
        onClose={() => setPdfProject(null)}
        getMaterialById={getMaterialById}
        formatCurrency={formatCurrency}
      />

      {/* Bulk CSV / Excel Dimension Import Modal */}
      <BulkDimensionImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onImportParts={handleImportBulkParts}
        existingProjects={projects}
        availableMaterials={MATERIALS_CATALOG}
        initialProjectId={bulkImportTargetProjectId}
      />

      {/* Global Terms & Privacy Policy Modal */}
      <TermsAndPrivacyModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      {/* App Store & Google Play Data Safety Disclosure Modal */}
      <DataSafetyDisclosureModal
        isOpen={showDataSafetyModal}
        onClose={() => setShowDataSafetyModal(false)}
      />

      {/* Standalone Legal Documents Modal with Accept Checkbox & Stripe Payment Trigger */}
      <LegalDocumentsModal
        isOpen={showLegalDocsModal}
        onClose={() => setShowLegalDocsModal(false)}
        onProceedToPayment={() => {
          setShowLegalDocsModal(false);
          setActiveTab("stripe-payment");
        }}
      />

      {/* GDPR Cookie Consent Banner */}
      <CookieConsentBanner
        onOpenPrivacyModal={() => setShowTermsModal(true)}
      />

      {/* OFFLINE MANAGER & CACHE SYNC MODAL */}
      <OfflineManagerModal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
      />

      {/* SECURE AUTH / SIGN UP / LOGIN MODAL OVERLAY */}
      {showPortalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-2xl my-auto">
            <SecureAuthPortal
              initialMode={portalView === "register" ? "register" : portalView === "reset" ? "reset" : "login"}
              onClose={() => setShowPortalModal(false)}
              onLoginSuccess={() => {
                handleLoginSuccess();
              }}
              onNavigateLanding={() => {
                setShowPortalModal(false);
                setActiveTab("dashboard");
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
