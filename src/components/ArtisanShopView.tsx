import React, { useState, useMemo, useEffect } from "react";
import {
  ShoppingBag,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ShieldCheck,
  Truck,
  CreditCard,
  CheckCircle2,
  Sparkles,
  Filter,
  Search,
  Star,
  ArrowRight,
  ArrowLeft,
  Lock,
  Coffee,
  Utensils,
  ChevronRight,
  X,
  Award,
  Download,
  Clock,
  MapPin,
  Check,
  Package,
  PackageCheck,
  Info,
  SlidersHorizontal,
  Flame,
  CheckSquare,
  Globe,
  Building,
  QrCode,
  Smartphone,
  AlertCircle,
  Printer,
  RefreshCw,
  Zap,
  FileText,
  HelpCircle,
  ChevronLeft,
  Mail,
  Send,
  ExternalLink,
  Copy,
  Calendar,
  CheckCircle,
  Bell,
  Maximize2,
  ZoomIn,
  Ruler,
  Scale,
  Box,
  RotateCcw,
  Receipt,
  Eye,
  ChevronDown,
  ChevronUp,
  Activity,
  Tag,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Video,
  Layers,
  Sun,
  Moon,
  ThumbsUp,
  Maximize
} from "lucide-react";

export interface DeliveryZone {
  id: string;
  name: string;
  regionLabel: string;
  description: string;
  postcodePrefixes: string[];
  baseRates: {
    pickup: number;
    standard: number;
    "white-glove": number;
    express: number;
  };
  estDays: {
    standard: string;
    "white-glove": string;
    express: string;
  };
}

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: "london-central",
    name: "Greater London & Home Counties",
    regionLabel: "Zone 1 • M25 Inner & Outer London",
    description: "Same-day/Next-day white glove dedicated vehicle delivery within M25 corridor.",
    postcodePrefixes: ["W", "SW", "NW", "EC", "WC", "SE", "E", "N", "TW", "UB", "HA", "EN", "IG", "RM", "DA", "BR", "CR", "SM", "KT"],
    baseRates: { pickup: 0, standard: 15, "white-glove": 45, express: 75 },
    estDays: { standard: "1-2 Business Days", "white-glove": "Scheduled Same-Day / Next-Day", express: "Guaranteed 24h Express" }
  },
  {
    id: "uk-mainland",
    name: "UK Mainland Regional",
    regionLabel: "Zone 2 • England, Wales & S. Scotland",
    description: "Insured crate courier with tracking & white glove room of choice placement.",
    postcodePrefixes: ["B", "M", "LS", "G", "EH", "BS", "CB", "OX", "CF", "NE", "PL", "EX", "SO", "PO", "BN", "CT", "IP", "NR", "LN", "DE", "NG"],
    baseRates: { pickup: 0, standard: 25, "white-glove": 65, express: 110 },
    estDays: { standard: "2-3 Business Days", "white-glove": "3-5 Business Days", express: "24-48 Hours" }
  },
  {
    id: "uk-highlands",
    name: "Scottish Highlands & Remote Islands",
    regionLabel: "Zone 3 • Offshore & High Altitude UK",
    description: "Reinforced timber cased transport for remote, island, or high-elevation estates.",
    postcodePrefixes: ["IV", "KW", "HS", "ZE", "PH", "PA", "AB", "FK", "KY", "DD", "BT"],
    baseRates: { pickup: 0, standard: 45, "white-glove": 115, express: 165 },
    estDays: { standard: "4-6 Business Days", "white-glove": "5-7 Business Days", express: "2-3 Business Days" }
  },
  {
    id: "eu-zone",
    name: "European Union (White Glove & Duty Paid)",
    regionLabel: "Zone 4 • EU Member States (DDP)",
    description: "Delivered Duty Paid (DDP) via specialised European stone logistics network.",
    postcodePrefixes: ["FR", "DE", "NL", "BE", "ES", "IT", "CH", "AT", "DK", "SE", "IE"],
    baseRates: { pickup: 0, standard: 85, "white-glove": 185, express: 260 },
    estDays: { standard: "5-8 Business Days", "white-glove": "7-10 Business Days", express: "3-5 Business Days" }
  },
  {
    id: "global-zone",
    name: "North America & International Express",
    regionLabel: "Zone 5 • Americas, Gulf & Asia Air Freight",
    description: "Express air freight in ISPM-15 certified heat-treated timber crates.",
    postcodePrefixes: ["US", "CA", "NY", "FL", "TX", "AU", "AE", "SG", "HK", "JP"],
    baseRates: { pickup: 0, standard: 175, "white-glove": 320, express: 450 },
    estDays: { standard: "6-10 Business Days", "white-glove": "8-12 Business Days", express: "4-6 Business Days" }
  }
];

export interface MaterialAvailabilityInfo {
  materialName: string;
  status: string;
  prepDays: number;
  badge: string;
  detail: string;
}

export function getMaterialAvailability(material: string): MaterialAvailabilityInfo {
  const mat = (material || "").toLowerCase();
  if (mat.includes("carrara")) {
    return {
      materialName: material,
      status: "In Atelier Stock (Battersea Reserve)",
      prepDays: 1,
      badge: "In Stock (1-Day Prep)",
      detail: "Pre-cut marble block reserved in Battersea. Immediate cleaning & dispatch prep."
    };
  } else if (mat.includes("calacatta")) {
    return {
      materialName: material,
      status: "Custom Hand-Sealing & Polishing",
      prepDays: 2,
      badge: "2-Day Prep Lead",
      detail: "Requires 24-hour natural wax seal curing & diamond edge hand-buffing."
    };
  } else if (mat.includes("nero") || mat.includes("marquina")) {
    return {
      materialName: material,
      status: "Quarry Vein Selection & Inspection",
      prepDays: 2,
      badge: "2-Day Prep Lead",
      detail: "Vein alignment verification & hydrophobic sealing before timber crating."
    };
  } else if (mat.includes("arabescato")) {
    return {
      materialName: material,
      status: "Rare Block Selection & Honing",
      prepDays: 4,
      badge: "4-Day Lead Time",
      detail: "High-contrast vein block extraction & custom matte honed finish curing."
    };
  } else if (mat.includes("pietra") || mat.includes("grey")) {
    return {
      materialName: material,
      status: "Precision Bevel & Seal Curing",
      prepDays: 3,
      badge: "3-Day Prep Lead",
      detail: "Precision edge profiling & stone density seal test."
    };
  } else if (mat.includes("travertine")) {
    return {
      materialName: material,
      status: "Pore Filling & Matte Curing",
      prepDays: 3,
      badge: "3-Day Prep Lead",
      detail: "Natural stone pore cavity fill & resin stabilization."
    };
  } else if (mat.includes("verde") || mat.includes("alpi")) {
    return {
      materialName: material,
      status: "Deep Color Intensification",
      prepDays: 2,
      badge: "2-Day Prep Lead",
      detail: "Specialist emerald vein color boost & protective oil coating."
    };
  }
  return {
    materialName: material,
    status: "Standard Atelier Stock",
    prepDays: 1,
    badge: "1-Day Prep Lead",
    detail: "Verified in Battersea inventory."
  };
}

export function computeDeliveryWindow(items: any[], deliveryOption: string, zoneName?: string) {
  const availabilities = items.map((item) => {
    const avail = getMaterialAvailability(item.selectedMaterial);
    return {
      productName: item.product.name,
      material: item.selectedMaterial,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      ...avail
    };
  });

  const maxPrepDays = Math.max(...availabilities.map((a) => a.prepDays), 1);

  let transitMinDays = 2;
  let transitMaxDays = 4;

  if (deliveryOption === "pickup") {
    transitMinDays = 0;
    transitMaxDays = 1;
  } else if (deliveryOption === "express") {
    transitMinDays = 1;
    transitMaxDays = 2;
  } else if (deliveryOption === "white-glove") {
    transitMinDays = 2;
    transitMaxDays = 3;
  } else {
    transitMinDays = 3;
    transitMaxDays = 5;
  }

  const totalMinDays = maxPrepDays + transitMinDays;
  const totalMaxDays = maxPrepDays + transitMaxDays;

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() + totalMinDays);

  const endDate = new Date(now);
  endDate.setDate(now.getDate() + totalMaxDays);

  const startFormatted = startDate.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
  const endFormatted = endDate.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  return {
    maxPrepDays,
    transitMinDays,
    transitMaxDays,
    totalMinDays,
    totalMaxDays,
    dateRangeStr: deliveryOption === "pickup" ? "Ready within 24-48 Hours" : `${startFormatted} – ${endFormatted}`,
    availabilities
  };
}

export interface ShopProduct {
  id: string;
  name: string;
  category: "chopping-boards" | "coffee-trays" | "coasters" | "sinks-taps" | "custom-decor";
  categoryLabel: string;
  basePrice: number;
  rating: number;
  reviewCount: number;
  shortDesc: string;
  description: string;
  imageUrl: string;
  badge?: string;
  materialOptions: string[];
  sizeOptions: { name: string; priceDelta: number }[];
  handleOptions?: string[]; // For trays
  tapFinishOptions?: string[]; // For sinks & taps
  dimensions: string;
  leadTime: string;
  inStock: boolean;

  // Extended Details & Artisan Specs
  origin?: string;
  weight?: string;
  hardnessRating?: string;
  density?: string;
  artisanMaster?: string;
  artisanWorkshop?: string;
  craftingTechnique?: string;
  careInstructions?: string;
  keyFeatures?: string[];

  // Kitchen Island Live Demo & Video Presentation
  hasKitchenIslandDemo?: boolean;
  videoUrl?: string;
  kitchenIslandImages?: {
    surfaceType: string;
    surfaceLabel: string;
    imageUrl: string;
  }[];
  islandStylingNotes?: string[];
}

export interface CartItem {
  cartId: string;
  product: ShopProduct;
  selectedMaterial: string;
  selectedSize: { name: string; priceDelta: number };
  selectedHandle?: string;
  selectedTapFinish?: string;
  customEngraving?: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderTrackingEvent {
  title: string;
  location: string;
  timestamp: string;
  completed: boolean;
  details: string;
}

export interface ShopOrder {
  orderRef: string;
  date: string;
  time: string;
  status: "Processing" | "In Artisan Production" | "Shipped" | "Out for Delivery" | "Delivered";
  courierName: string;
  trackingNumber: string;
  estimatedDelivery: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  netSubtotal: number;
  baseFreightCost: number;
  heavyHandlingFee: number;
  transitInsuranceCost: number;
  deliveryCost: number;
  vatTax: number;
  total: number;
  totalWeightKg: number;
  custName: string;
  custEmail: string;
  custPhone: string;
  custAddress: string;
  custPostcode: string;
  deliveryNotes?: string;
  deliveryZoneName: string;
  deliveryOption: string;
  paymentMethod: string;
  trackingEvents: OrderTrackingEvent[];
}

const CATALOG_PRODUCTS: ShopProduct[] = [
  // 1. CHOPPING BOARDS (MULTI-MATERIAL & KITCHEN ISLAND DEMO)
  {
    id: "prod-cb-01",
    name: "Calacatta & Arabescato Dual-Stone Chopping Board",
    category: "chopping-boards",
    categoryLabel: "Artisan Chopping Boards",
    basePrice: 185,
    rating: 4.9,
    reviewCount: 42,
    shortDesc: "Inlaid multi-material marble cutting board with brass perimeter accent & non-slip feet.",
    description: "Hand-finished in our London stonemason workshop. Combines high-density Calacatta Gold with Arabescato marble, separated by a 2mm solid brass expansion strip. Sealed with food-safe organic nano-wax.",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCceLmw5sOh0z2EWRZuuIt07t99JzV12V40LcoVylTvTo6qmVA_Eqm-L2PNJF9tfv0rlzd_-r2cnhzY8V2FFlAORqH0IvqeYSQIbjIM1up-2DWu6Y9X331y8UECNxCmr-z3xzhe6XQ67nKCIi2yNZVxokXX668E-MuK04RWhs55IOCz7IQDe-eAhjp9yk9VarnTSK5kbFrpO8YOJwmU8nUScy0xLQUHUUmJ6TTZwwOhCOahiu1o0lqf7QXgmfGGA9xDep-YmJGBP0w",
    badge: "Bestseller",
    materialOptions: ["Calacatta & Arabescato", "Nero Marquina & Carrara White", "Emerald Quartzite & Brass", "Travertine Silver & Walnut Wood"],
    sizeOptions: [
      { name: "Compact (30 x 20 cm)", priceDelta: 0 },
      { name: "Executive Chef (42 x 28 cm)", priceDelta: 45 },
      { name: "Grand Feast Banquet (52 x 36 cm)", priceDelta: 95 }
    ],
    dimensions: "420 x 280 x 20 mm",
    leadTime: "2-4 Business Days",
    inStock: true,
    origin: "Carrara Quarry, Tuscany, Italy & Macael, Spain",
    weight: "4.8 kg",
    hardnessRating: "Mohs 3.8 (Calacatta) / Mohs 4.0 (Arabescato)",
    density: "2,720 kg/m³ High Compressive Strength",
    artisanMaster: "Marco Rossi - Head Stonemason",
    artisanWorkshop: "SMC Battersea Stone Atelier, London SW8",
    craftingTechnique: "High-precision 3D CNC waterjet inlay with 2mm brass expansion strip and 5-stage diamond pad manual polishing.",
    careInstructions: "Clean with warm water and mild pH-neutral dish soap. Avoid acidic cleaners (vinegar, bleach). Re-apply organic beeswax once every 6 months to preserve the hydrophobic seal.",
    keyFeatures: [
      "Solid 2mm brushed brass expansion joinery",
      "BS EN 1186 certified organic food-safe nano-wax coating",
      "Recessed non-slip rubber silicone pads on base",
      "Hand-beveled 45° chamfer edge finish"
    ],
    hasKitchenIslandDemo: true,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-ingredients-on-a-wooden-cutting-board-42981-large.mp4",
    kitchenIslandImages: [
      {
        surfaceType: "calacatta",
        surfaceLabel: "Calacatta Gold Marble Island",
        imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCceLmw5sOh0z2EWRZuuIt07t99JzV12V40LcoVylTvTo6qmVA_Eqm-L2PNJF9tfv0rlzd_-r2cnhzY8V2FFlAORqH0IvqeYSQIbjIM1up-2DWu6Y9X331y8UECNxCmr-z3xzhe6XQ67nKCIi2yNZVxokXX668E-MuK04RWhs55IOCz7IQDe-eAhjp9yk9VarnTSK5kbFrpO8YOJwmU8nUScy0xLQUHUUmJ6TTZwwOhCOahiu1o0lqf7QXgmfGGA9xDep-YmJGBP0w"
      },
      {
        surfaceType: "walnut",
        surfaceLabel: "American Smoked Walnut Island",
        imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBcHK03iYTJ1DFAk8dgBr4kisxAFbKpktYyspjsk5tmeR5k-j_8_vTSqApGCRSPkdLPuIUkMC72hwCMzXiITpxLQMVrJQXhsFerQfojoAjSZcOiyWxZw4NWcTozphYXckddNAfyV5gU26B-EY_lZ2TYrFNw6nTX8srBpSAu6YUlfl9sfGP5GcHhjRrZ7ZAwGR7g_GzWSkH9wPYG5i-R0nKxZWvqT_gK047VE8ar0HK88QnD4YCj35aZ3R6RGk1SVya1sA7B2h8GotA"
      },
      {
        surfaceType: "steel",
        surfaceLabel: "Stainless Steel Professional Chef Island",
        imageUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80"
      },
      {
        surfaceType: "charcoal",
        surfaceLabel: "Matt Charcoal Quartz Island",
        imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
      }
    ],
    islandStylingNotes: [
      "Protects £10k+ island worktops from acidic lemon/wine etching and knife scoring.",
      "Creates an instant architectural focal point for open-plan living areas.",
      "Heavy 4.8kg stone mass absorbs chopping kinetic shock with satisfying acoustic dampening.",
      "Transitions seamlessly from prep board to charcuterie center stage during dinner hosting."
    ]
  },
  {
    id: "prod-cb-02",
    name: "Nero Marquina & Walnut Hybrid Board",
    category: "chopping-boards",
    categoryLabel: "Artisan Chopping Boards",
    basePrice: 165,
    rating: 4.8,
    reviewCount: 29,
    shortDesc: "Deep black Spanish marble seamlessly bonded to American Black Walnut.",
    description: "Dual-temperature serving board. The cold marble section is ideal for charcuterie and cheese, while the end-grain walnut section protects knife edges for prep.",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBcHK03iYTJ1DFAk8dgBr4kisxAFbKpktYyspjsk5tmeR5k-j_8_vTSqApGCRSPkdLPuIUkMC72hwCMzXiITpxLQMVrJQXhsFerQfojoAjSZcOiyWxZw4NWcTozphYXckddNAfyV5gU26B-EY_lZ2TYrFNw6nTX8srBpSAu6YUlfl9sfGP5GcHhjRrZ7ZAwGR7g_GzWSkH9wPYG5i-R0nKxZWvqT_gK047VE8ar0HK88QnD4YCj35aZ3R6RGk1SVya1sA7B2h8GotA",
    materialOptions: ["Nero Marquina & Walnut", "Pietra Grey & Smoked Oak", "White Carrara & Ash Wood"],
    sizeOptions: [
      { name: "Standard (38 x 25 cm)", priceDelta: 0 },
      { name: "XL Serving Board (48 x 30 cm)", priceDelta: 50 }
    ],
    dimensions: "380 x 250 x 22 mm",
    leadTime: "2-3 Business Days",
    inStock: true,
    origin: "Markina Quarries, Basque Country, Spain & Appalachian Walnut, USA",
    weight: "3.6 kg",
    hardnessRating: "Mohs 3.5 (Nero Marquina Marble) & Janka 1010 (Walnut)",
    density: "2,690 kg/m³",
    artisanMaster: "David Thorne - Senior Joiner & Mason",
    artisanWorkshop: "SMC Southwark Wood & Stone Guild, London",
    craftingTechnique: "Dovetail stone-to-wood joinery with food-safe epoxy bonding and mineral oil hand rubbing.",
    careInstructions: "Hand wash only with mild soap. Do not soak wood section. Re-oil walnut with food-grade mineral oil every month.",
    keyFeatures: [
      "Dual-zone design: cold marble for cheese, walnut for prep",
      "Precision dovetail concealed joint",
      "Knife-friendly end-grain walnut section",
      "Natural deep black Spanish marble with striking white veining"
    ],
    hasKitchenIslandDemo: true,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-cutting-vegetables-on-a-wooden-board-in-the-kitchen-42982-large.mp4",
    kitchenIslandImages: [
      {
        surfaceType: "walnut",
        surfaceLabel: "American Smoked Walnut Island",
        imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBcHK03iYTJ1DFAk8dgBr4kisxAFbKpktYyspjsk5tmeR5k-j_8_vTSqApGCRSPkdLPuIUkMC72hwCMzXiITpxLQMVrJQXhsFerQfojoAjSZcOiyWxZw4NWcTozphYXckddNAfyV5gU26B-EY_lZ2TYrFNw6nTX8srBpSAu6YUlfl9sfGP5GcHhjRrZ7ZAwGR7g_GzWSkH9wPYG5i-R0nKxZWvqT_gK047VE8ar0HK88QnD4YCj35aZ3R6RGk1SVya1sA7B2h8GotA"
      },
      {
        surfaceType: "calacatta",
        surfaceLabel: "Calacatta Gold Marble Island",
        imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCceLmw5sOh0z2EWRZuuIt07t99JzV12V40LcoVylTvTo6qmVA_Eqm-L2PNJF9tfv0rlzd_-r2cnhzY8V2FFlAORqH0IvqeYSQIbjIM1up-2DWu6Y9X331y8UECNxCmr-z3xzhe6XQ67nKCIi2yNZVxokXX668E-MuK04RWhs55IOCz7IQDe-eAhjp9yk9VarnTSK5kbFrpO8YOJwmU8nUScy0xLQUHUUmJ6TTZwwOhCOahiu1o0lqf7QXgmfGGA9xDep-YmJGBP0w"
      }
    ],
    islandStylingNotes: [
      "Harmonizes natural timber warmth with cold Spanish black marble.",
      "Dovetail joinery prevents warp and ensures lifetime structural integrity.",
      "Perfect centerpiece for contemporary dark-kitchen interior designs."
    ]
  },
  {
    id: "prod-cb-03",
    name: "Travertine Navona Heavy Island Prep & Serving Board",
    category: "chopping-boards",
    categoryLabel: "Artisan Chopping Boards",
    basePrice: 195,
    rating: 5.0,
    reviewCount: 34,
    shortDesc: "Honed Roman Travertine with deep juice groove & solid brass side handles.",
    description: "Carved from unfilled Navona Italian Travertine with a silky honed texture. Features a 10mm deep perimeter juice canal to keep kitchen island worktops clean during carving.",
    imageUrl: "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=800&q=80",
    badge: "New Arrival",
    materialOptions: ["Travertine Navona Beige", "Travertine Silver Grey", "Walnut Travertine"],
    sizeOptions: [
      { name: "Standard Prep (40 x 28 cm)", priceDelta: 0 },
      { name: "Grand Island Master (50 x 32 cm)", priceDelta: 65 }
    ],
    dimensions: "450 x 300 x 25 mm",
    leadTime: "2-3 Business Days",
    inStock: true,
    origin: "Tivoli Quarries, Lazio, Italy",
    weight: "5.2 kg",
    hardnessRating: "Mohs 3.6",
    density: "2,650 kg/m³",
    artisanMaster: "Marco Rossi",
    artisanWorkshop: "SMC Battersea Stone Atelier, London SW8",
    craftingTechnique: "Resin-filled micro-pore surface treatment with deep CNC juice canal routing and satin oil finish.",
    careInstructions: "Wipe clean with warm water and soft sponge. Do not place in dishwasher.",
    keyFeatures: [
      "10mm deep perimeter juice canal prevents liquid spills on island worktop",
      "Recessed ergonomic side grips carved directly into stone underside",
      "Silky honed natural Roman Travertine finish",
      "Stain-phobic organic seal withstands olive oil & balsamic vinegar"
    ],
    hasKitchenIslandDemo: true,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-kitchen-countertop-with-fresh-vegetables-and-utensils-42983-large.mp4",
    kitchenIslandImages: [
      {
        surfaceType: "charcoal",
        surfaceLabel: "Matt Charcoal Quartz Island",
        imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
      },
      {
        surfaceType: "calacatta",
        surfaceLabel: "Calacatta Gold Marble Island",
        imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCceLmw5sOh0z2EWRZuuIt07t99JzV12V40LcoVylTvTo6qmVA_Eqm-L2PNJF9tfv0rlzd_-r2cnhzY8V2FFlAORqH0IvqeYSQIbjIM1up-2DWu6Y9X331y8UECNxCmr-z3xzhe6XQ67nKCIi2yNZVxokXX668E-MuK04RWhs55IOCz7IQDe-eAhjp9yk9VarnTSK5kbFrpO8YOJwmU8nUScy0xLQUHUUmJ6TTZwwOhCOahiu1o0lqf7QXgmfGGA9xDep-YmJGBP0w"
      }
    ],
    islandStylingNotes: [
      "Organic travertine texture brings Mediterranean warmth to minimalist modern kitchens.",
      "Juice canal collects roast juices cleanly before they reach luxury quartz island counters."
    ]
  },
  {
    id: "prod-cb-04",
    name: "Pietra Grey & Solid Brass Inlaid Charcuterie Platter",
    category: "chopping-boards",
    categoryLabel: "Artisan Chopping Boards",
    basePrice: 175,
    rating: 4.9,
    reviewCount: 21,
    shortDesc: "Dark graphite Iranian marble with double brass chevron inlay & bevelled rim.",
    description: "Deep charcoal-grey marble with delicate white calcite veining, detailed with twin 3mm solid brushed brass chevron inlays.",
    imageUrl: "https://images.unsplash.com/photo-1615937657715-3761191b7e40?auto=format&fit=crop&w=800&q=80",
    badge: "Designer Choice",
    materialOptions: ["Pietra Grey & Brass", "Nero Marquina & Copper", "Verde Alpi & Gold"],
    sizeOptions: [
      { name: "Medium (38 x 26 cm)", priceDelta: 0 },
      { name: "Large Feast (46 x 30 cm)", priceDelta: 55 }
    ],
    dimensions: "380 x 260 x 20 mm",
    leadTime: "2-4 Business Days",
    inStock: true,
    origin: "Isfahan Marble Region & SMC London Workshop",
    weight: "4.1 kg",
    hardnessRating: "Mohs 4.0",
    density: "2,710 kg/m³",
    artisanMaster: "Antoine Laurent",
    artisanWorkshop: "SMC Battersea Studio, London",
    craftingTechnique: "Precision CNC groove routing with hand-hammered brass chevron strip fit and 6-stage diamond honing.",
    careInstructions: "Hand wash only with pH neutral soap. Brass strips can be buffed with soft microfiber.",
    keyFeatures: [
      "Twin solid brass chevron inlays hand-fitted by London metal artisans",
      "Graphite grey tone resists visible knife marks",
      "Non-slip recessed foot pads stabilize board during heavy carving",
      "Comes in luxury custom wooden gift presentation box"
    ],
    hasKitchenIslandDemo: true,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-ingredients-on-a-wooden-cutting-board-42981-large.mp4",
    kitchenIslandImages: [
      {
        surfaceType: "steel",
        surfaceLabel: "Stainless Steel Professional Chef Island",
        imageUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80"
      }
    ],
    islandStylingNotes: [
      "Brushed brass chevrons reflect pendant lighting gracefully across central island prep areas.",
      "High density stone resists odor absorption from garlic, cured meats, and sharp cheeses."
    ]
  },
  {
    id: "prod-cb-05",
    name: "Verde Alpi Emerald Marble Heavy Butcher Block",
    category: "chopping-boards",
    categoryLabel: "Artisan Chopping Boards",
    basePrice: 220,
    rating: 5.0,
    reviewCount: 18,
    shortDesc: "30mm thick emerald green Italian marble slab with hand-polished 45° chamfer.",
    description: "An incredible heavyweight 30mm thick slab of rich Verde Alpi serpentinite marble. Features dramatic dark emerald green tones with lighter jade and white veins.",
    imageUrl: "https://images.unsplash.com/photo-1567306301408-9b74779a11af?auto=format&fit=crop&w=800&q=80",
    badge: "Exclusive",
    materialOptions: ["Verde Alpi Emerald", "Guatemala Green", "Calacatta Viola"],
    sizeOptions: [
      { name: "Executive Butcher (42 x 30 cm)", priceDelta: 0 },
      { name: "Grand Master Butcher (50 x 35 cm)", priceDelta: 85 }
    ],
    dimensions: "420 x 300 x 30 mm",
    leadTime: "3-5 Business Days",
    inStock: true,
    origin: "Aosta Valley, Italian Alps",
    weight: "7.1 kg",
    hardnessRating: "Mohs 4.2 (High Density Serpentinite)",
    density: "2,780 kg/m³",
    artisanMaster: "Marco Rossi",
    artisanWorkshop: "SMC Battersea Stone Atelier, London SW8",
    craftingTechnique: "Thick slab wire-saw cut with 45° hand chamfering and diamond pad satin polishing.",
    careInstructions: "Wash with mild soapy water. Apply food-safe mineral wax annually.",
    keyFeatures: [
      "Extra thick 30mm monolithic stone block",
      "Stunning deep green emerald veining unique to Italian Alpine quarries",
      "Heavy 7.1kg mass remains completely stationary during dough rolling and carving",
      "Includes non-scratch silicone foot pads"
    ],
    hasKitchenIslandDemo: true,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-cutting-vegetables-on-a-wooden-board-in-the-kitchen-42982-large.mp4",
    kitchenIslandImages: [
      {
        surfaceType: "calacatta",
        surfaceLabel: "Calacatta Gold Marble Island",
        imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCceLmw5sOh0z2EWRZuuIt07t99JzV12V40LcoVylTvTo6qmVA_Eqm-L2PNJF9tfv0rlzd_-r2cnhzY8V2FFlAORqH0IvqeYSQIbjIM1up-2DWu6Y9X331y8UECNxCmr-z3xzhe6XQ67nKCIi2yNZVxokXX668E-MuK04RWhs55IOCz7IQDe-eAhjp9yk9VarnTSK5kbFrpO8YOJwmU8nUScy0xLQUHUUmJ6TTZwwOhCOahiu1o0lqf7QXgmfGGA9xDep-YmJGBP0w"
      }
    ],
    islandStylingNotes: [
      "Deep emerald green tones create a high-contrast luxury statement against white or wood islands.",
      "Serpentinite stone offers superior compressive strength and scratch resistance."
    ]
  },

  // 2. COFFEE TRAYS WITH HANDLES
  {
    id: "prod-ct-01",
    name: "Monolith Marble Coffee Tray with Metal Handles",
    category: "coffee-trays",
    categoryLabel: "Luxury Coffee Trays",
    basePrice: 240,
    rating: 5.0,
    reviewCount: 56,
    shortDesc: "Solid carved marble tray with custom brushed metallic handles & felt padded base.",
    description: "Carved from a single block of natural stone with mitered border lip. Fitted with hand-polished ergonomic metal handles. Perfect for coffee table displays, cocktail service, or bed-in-breakfast.",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAbvIF9L90gd_T_tBcV0MEpEEOYHtaWJgpCKc5hFe8zZ1m0NGsL0MN1I4J-sC2DOKK0NdAnNNw-4HOOz8gFsb3Yy5HutsAQPmfxnqt-V2QoV9IWHqWPXXD8jplRIRfUHsAaRhwoVFh3VOW7pTfAM7hSUQo5hpq0pS8rMi1NXc05RtrOnKK62pNMSE-CM0-CUPwXt6Ch9pvtl-UwhWLc7df3IYPaKuaK1uqL0C2NWqPmF5n7F2Jw_bgT_Zwze7msLZwUV3nP6j2cbvY",
    badge: "Most Popular",
    materialOptions: ["Calacatta Gold", "Nero Marquina Black", "Pietra Grey", "Emerald Quartzite", "Viola Marble"],
    handleOptions: ["Brushed Gold Brass", "Matte Black Steel", "Polished Rose Gold", "Antique Bronze Knurled"],
    sizeOptions: [
      { name: "Small Butler (35 x 24 cm)", priceDelta: 0 },
      { name: "Grand Executive (48 x 32 cm)", priceDelta: 75 }
    ],
    dimensions: "480 x 320 x 45 mm (inc. handles)",
    leadTime: "3-5 Business Days",
    inStock: true,
    origin: "Carrara, Tuscany, Italy & Macael, Andalusia",
    weight: "6.2 kg",
    hardnessRating: "Mohs 4.0",
    density: "2,710 kg/m³",
    artisanMaster: "Antoine Laurent - Metal & Stone Atelier",
    artisanWorkshop: "SMC Battersea Studio, London",
    craftingTechnique: "Single-block CNC hollow carving with mitered 30mm rim lip and threaded brass handle anchors.",
    careInstructions: "Wipe with damp microfibre cloth. Metal handles are lacquered to prevent tarnishing; clean with dry lint-free cloth.",
    keyFeatures: [
      "Mitered perimeter lip carved from a solid monolithic stone slab",
      "Ergonomic knurled/brushed metallic handles with heavy anchor bolts",
      "Full felt anti-scratch protective base lining",
      "Hydrophobic stain-resistant seal against coffee & wine spills"
    ]
  },
  {
    id: "prod-ct-02",
    name: "Fluted Rim Marble Tray with Integrated Handles",
    category: "coffee-trays",
    categoryLabel: "Luxury Coffee Trays",
    basePrice: 210,
    rating: 4.9,
    reviewCount: 38,
    shortDesc: "Precision CNC fluted border with recessed under-lip hand grips.",
    description: "Architectural tray featuring 3D CNC fluted perimeter wall and ergonomic undercut grips carved directly into the underside of the stone.",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDoafXBGRGQ3V9FLjGzaRqq5D8hAu7f7bkK7Um707rn9wQ3MnApsHzxLQ7xs-3Fu_i4JRz-_nTLThHphi_HZv8IPghkuaGAvGfOyBUA4UPIJbigq7B6MZ2z4SeREIWFhBFD5vd-1icM0UsTR5Eml59honv_Ay-Mr9K9-y7Os5YD37uKK9_2D-T8Jis1Tq-GCzDXMHyk0A9XSDtPZjNhe80F_TZVbRx_OGGNWLlfeEHmC9ImbgtnsPtebd37HXrODzdQPK3tdjKZPQI",
    materialOptions: ["White Carrara", "Arabescato Vagli", "Travertine Navona"],
    handleOptions: ["Carved Undercut Grips"],
    sizeOptions: [
      { name: "Medium Square (32 x 32 cm)", priceDelta: 0 },
      { name: "Large Rectangle (45 x 30 cm)", priceDelta: 60 }
    ],
    dimensions: "450 x 300 x 30 mm",
    leadTime: "3-5 Business Days",
    inStock: true,
    origin: "Carrara, Tuscany, Italy",
    weight: "5.1 kg",
    hardnessRating: "Mohs 3.8",
    density: "2,700 kg/m³",
    artisanMaster: "Marco Rossi & CNC Precision Team",
    artisanWorkshop: "SMC Battersea Studio, London",
    craftingTechnique: "3D CNC fluted perimeter sculpting with undercut hand grips carved directly into the stone base.",
    careInstructions: "Clean fluted grooves with soft bristle brush and soapy water. Wipe dry immediately.",
    keyFeatures: [
      "Architectural 3D fluted outer wall profile",
      "Seamless undercut hand grips for effortless lifting",
      "Sealed with satin matte silane coating",
      "Ideal for vanity, coffee table, or executive desk displays"
    ]
  },
  {
    id: "prod-ct-03",
    name: "Rosso Levanto Round Cocktail Tray with Knurled Brass Handles",
    category: "coffee-trays",
    categoryLabel: "Luxury Coffee Trays",
    basePrice: 255,
    rating: 5.0,
    reviewCount: 16,
    shortDesc: "Deep cherry-burgundy Italian marble circular tray with knurled brass hardware.",
    description: "Hand-carved 35cm round tray carved from rich Rosso Levanto marble from Liguria, Italy. Features intense deep wine-red tone interwoven with white and jade vein networks.",
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
    badge: "Limited Edition",
    materialOptions: ["Rosso Levanto Wine Red", "Calacatta Viola", "Nero Marquina"],
    handleOptions: ["Knurled Brass Handles", "Polished Chrome Handles"],
    sizeOptions: [
      { name: "Circular Standard (35 cm Dia)", priceDelta: 0 },
      { name: "Circular Grand (42 cm Dia)", priceDelta: 70 }
    ],
    dimensions: "350 Dia x 40 mm",
    leadTime: "3-5 Business Days",
    inStock: true,
    origin: "Levanto, Liguria, Italy",
    weight: "4.9 kg",
    hardnessRating: "Mohs 4.0",
    density: "2,730 kg/m³",
    artisanMaster: "Antoine Laurent",
    artisanWorkshop: "SMC Battersea Studio, London",
    craftingTechnique: "Circular lathe carving with mitered rim lip and knurled brass handle bolts.",
    careInstructions: "Wipe with soft cloth. Avoid abrasive detergents.",
    keyFeatures: [
      "Circular lathe carved geometry with raised lip",
      "Heavy-gauge knurled brass industrial handles",
      "Distinct burgundy-red marble from Italian Ligurian coastal quarries",
      "Felt padded base lining protects glass coffee tables"
    ]
  },

  // 3. CUP HOLDERS & COASTERS
  {
    id: "prod-cc-01",
    name: "Hexagonal Marble Coaster Set (Set of 6) + Marble Stand",
    category: "coasters",
    categoryLabel: "Cup Holders & Coasters",
    basePrice: 85,
    rating: 4.9,
    reviewCount: 88,
    shortDesc: "Set of 6 faceted marble coasters with non-slip cork backing & matching storage caddy.",
    description: "Precision diamond-cut hexagonal coasters. Each piece features natural vein patterns sealed against condensation and stain marks. Includes a matching solid marble storage holder.",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAufzkhd8V1dfUimdTLTQoH7PfLjH59r2w1BHDgT-JOX7qW1iTNXbcX_rHxClJqJjlYKc07OeTT0LrhCCLLZKIiRgh0CkH6j2fmZ5LHDOacO5kOy8CUfbOHGw1BWLNWJgREz_Bxaes7NRtPOu70fD2dRf8dve4DfmH2Gpfdai27Yq-aeUGqC5txHHB5pT9ed1qt71FIL9k6iMSOWlMu6Us1b6oDBdMfjx4q5PxWXiUQCCUz8VMcBnVncdmXc2Wq2d9YNYZTTJ6lSjQ",
    badge: "Gift Choice",
    materialOptions: ["Calacatta Gold", "Nero Marquina", "Mixed Duo (3 White / 3 Black)", "Terrazzo Gold"],
    sizeOptions: [
      { name: "Set of 4 + Holder", priceDelta: -20 },
      { name: "Set of 6 + Holder", priceDelta: 0 },
      { name: "Set of 8 + Dual Holder", priceDelta: 35 }
    ],
    dimensions: "100 x 100 x 10 mm (per coaster)",
    leadTime: "1-2 Business Days",
    inStock: true,
    origin: "Apuan Alps, Tuscany, Italy",
    weight: "1.8 kg (Set + Stand)",
    hardnessRating: "Mohs 3.5",
    density: "2,700 kg/m³",
    artisanMaster: "SMC Crafts Team",
    artisanWorkshop: "SMC Battersea Studio, London",
    craftingTechnique: "Diamond-faceted 6-sided waterjet cutting with bevelled top edge and cork backing application.",
    careInstructions: "Wipe spills promptly. Do not submerge cork backing in water.",
    keyFeatures: [
      "Set of 6 faceted hexagonal coasters with matching storage holder",
      "Eco-friendly natural cork anti-scratch backing",
      "Non-porous nano-wax seal resists hot cup condensation & wine rings",
      "Elegant gold foil embossed presentation box included"
    ]
  },
  {
    id: "prod-cc-02",
    name: "Scalloped Calacatta Beverage Coasters (Set of 6)",
    category: "coasters",
    categoryLabel: "Cup Holders & Coasters",
    basePrice: 95,
    rating: 4.8,
    reviewCount: 31,
    shortDesc: "Set of 6 scalloped rim Calacatta Gold coasters with brass edge detailing.",
    description: "Scalloped flower-edged coasters waterjet carved from Italian Calacatta Gold marble. Ideal for wine glasses, whiskey tumblers, or espresso cups.",
    imageUrl: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80",
    badge: "Trending",
    materialOptions: ["Calacatta Gold", "Rosso Levanto", "Nero Marquina"],
    sizeOptions: [
      { name: "Set of 6 Coasters", priceDelta: 0 },
      { name: "Set of 8 Coasters + Brass Stand", priceDelta: 30 }
    ],
    dimensions: "105 Dia x 12 mm",
    leadTime: "1-2 Business Days",
    inStock: true,
    origin: "Carrara, Italy",
    weight: "1.5 kg",
    hardnessRating: "Mohs 3.8",
    density: "2,710 kg/m³",
    artisanMaster: "SMC Crafts Team",
    artisanWorkshop: "SMC Battersea Studio, London",
    craftingTechnique: "5-axis waterjet scalloped perimeter profiling with hand-honed satin polish.",
    careInstructions: "Wipe clean with soft damp cloth.",
    keyFeatures: [
      "Playful scalloped petal outline profile",
      "Soft felt anti-scratch underside pads",
      "Sealed against hot liquid condensation and wine rings",
      "Comes in rigid ribbon-tied presentation gift box"
    ]
  },

  // 4. SINKS & TAPS
  {
    id: "prod-st-01",
    name: "Integrated Monolithic Stone Ramp Sink & Designer Tap Set",
    category: "sinks-taps",
    categoryLabel: "Sinks & Designer Taps",
    basePrice: 1250,
    rating: 5.0,
    reviewCount: 19,
    shortDesc: "Custom mitered ramp basin with concealed drainage slot & matching wall tap.",
    description: "Bespoke engineered stone ramp sink with sloped drainage plane and removable waste access plate. Comes bundled with a solid brass gooseneck wall-mounted tap mixer.",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAFGqgsH0QN6WXsqp7IaIvYE5aHC9UNVWFywXW-kWNmXiGRJJi8pSnGRudv0EQuZfbPYgAbdYQNAu6KmLzDG2ngm3IJxXGcvRqfyyJeNtkyk9pxw6sKFfPvFIKTbirwxeaRMWGTj1GBTGFm0Mx8vs0IJdO4WRXaaHxF96WPejabrqu7BGN08esNJYayJDSaXgf-lESTNNIEf3GWMpmFqU2ECCam_D8qWi5-e-anMgbXsL0LY9B8aDBusg16VR5jwCC-u2Aq2agL3mQ",
    badge: "Architectural",
    materialOptions: ["Calacatta Gold Porcelain", "Pietra Grey Marble", "Nero Marquina", "Travertine Beige"],
    tapFinishOptions: ["Brushed Gold Brass", "Matte Black Minimalist", "Polished Chrome", "Aged Copper"],
    sizeOptions: [
      { name: "Single Basin (600 x 450 mm)", priceDelta: 0 },
      { name: "Double Vanity Basin (1200 x 480 mm)", priceDelta: 650 }
    ],
    dimensions: "600 x 450 x 140 mm",
    leadTime: "7-10 Business Days",
    inStock: true,
    origin: "Castellón Porcelain Works, Spain & Tuscany Marble",
    weight: "28.5 kg",
    hardnessRating: "Mohs 7.0 (Sintered Porcelain) / Mohs 4.0 (Marble)",
    density: "2,850 kg/m³",
    artisanMaster: "Giacomo Valli - Master Sanitary Mason",
    artisanWorkshop: "SMC Architectural Stoneworks, London",
    craftingTechnique: "Mitered 45° slab fabrication with concealed channel slot drain and removable waste access plate.",
    careInstructions: "Clean with standard non-abrasive bathroom cleaner. Includes 10-year structural warranty.",
    keyFeatures: [
      "Concealed linear slot drainage plane with removable access plate",
      "Included wall-mounted solid brass mixer tap set",
      "Zero-absorption surface engineered for heavy daily bathroom use",
      "Standard 1.25\" waste connection included"
    ]
  },
  {
    id: "prod-st-02",
    name: "Fluted Oval Vessel Basin & High-Rise Mixer Tap",
    category: "sinks-taps",
    categoryLabel: "Sinks & Designer Taps",
    basePrice: 780,
    rating: 4.9,
    reviewCount: 31,
    shortDesc: "Countertop fluted marble bowl basin with high-spout monobloc mixer tap.",
    description: "Hand-carved oval vessel sink with vertical fluted texture on the exterior. Complemented by a high-rise brass mixer tap with ceramic cartridge.",
    imageUrl: "https://lh3.googleusercontent.com/aida/AP1WRLscLIpauTAWhZZX3QhpQiR8SWZEObzaUuX4nLLD-Q7YGSurY0urLR6bckoNG3EDfDCwzqxSuXePwbSBszNVt3g_mCKxQZeYXqtMcQIaknPs4tTmYPY2bHX17lg8rj-o63L6C80zEgX6kCH9I5L3k9jaOZ8PPA7mRqte4EKppGuM_MnAf9Sa17x2u2GMh59Gwbtp6Gz3rCARIYL5gp_t2681d3JLh3UXfJwTvwALr_EHij9Oppw4vHeiZSo",
    materialOptions: ["White Carrara", "Viola Calacatta", "Crema Marfil"],
    tapFinishOptions: ["Brushed Gold", "Matte Black", "Brushed Gunmetal"],
    sizeOptions: [
      { name: "Standard Vessel (480 x 380 mm)", priceDelta: 0 },
      { name: "Grand Deep Vessel (550 x 420 mm)", priceDelta: 180 }
    ],
    dimensions: "480 x 380 x 150 mm",
    leadTime: "5-7 Business Days",
    inStock: true,
    origin: "Carrara, Italy",
    weight: "16.2 kg",
    hardnessRating: "Mohs 3.8",
    density: "2,710 kg/m³",
    artisanMaster: "Giacomo Valli - Sanitary Mason",
    artisanWorkshop: "SMC Architectural Stoneworks, London",
    craftingTechnique: "Hand-turned and CNC fluted exterior contouring with honed satin interior bowl.",
    careInstructions: "Rinse after use. Clean with mild bathroom detergent. Re-seal marble twice annually with included SMC Sealer kit.",
    keyFeatures: [
      "Hand-crafted oval vessel with fluted exterior texture",
      "High-rise monobloc brass mixer tap with ceramic cartridge",
      "Smooth honed interior basin for effortless water flow",
      "Includes matching pop-up waste plug"
    ]
  },
  {
    id: "prod-st-03",
    name: "Verde Alpi Undermount Kitchen Sink & Gooseneck Tap",
    category: "sinks-taps",
    categoryLabel: "Sinks & Designer Taps",
    basePrice: 1450,
    rating: 5.0,
    reviewCount: 12,
    shortDesc: "Carved emerald green undermount stone sink with pull-down spray tap.",
    description: "Deep single-bowl kitchen sink carved out of a solid block of Verde Alpi stone. Bundled with a commercial-grade brass gooseneck tap with dual-spray pull-down hose.",
    imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
    badge: "Bespoke",
    materialOptions: ["Verde Alpi Emerald", "Nero Marquina", "Calacatta Gold"],
    tapFinishOptions: ["Brushed Brass", "Matt Black", "Aged Copper"],
    sizeOptions: [
      { name: "Single Large Bowl (550 x 400 x 220 mm)", priceDelta: 0 },
      { name: "Double Bowl (800 x 450 x 220 mm)", priceDelta: 520 }
    ],
    dimensions: "550 x 400 x 220 mm",
    leadTime: "7-12 Business Days",
    inStock: true,
    origin: "Italian Alps & London Workshop",
    weight: "34.0 kg",
    hardnessRating: "Mohs 4.2",
    density: "2,780 kg/m³",
    artisanMaster: "Giacomo Valli",
    artisanWorkshop: "SMC Architectural Stoneworks, London",
    craftingTechnique: "Block CNC excavation with radius hand-rubbed internal corners for easy cleaning.",
    careInstructions: "Clean with mild soap. Avoid harsh wire wool.",
    keyFeatures: [
      "Single-block carved stone basin with seamless zero-joint internal walls",
      "Comes with brass pull-down dual-spray mixer tap",
      "Acoustic stone mass absorbs disposal unit & water impact vibration",
      "Includes 3.5\" basket strainer waste kit"
    ]
  },

  // 5. CUSTOM MARBLE DECOR & PIECES
  {
    id: "prod-cd-01",
    name: "Geometric Sculptural Marble Bookends (Pair)",
    category: "custom-decor",
    categoryLabel: "Custom Marble Accents",
    basePrice: 140,
    rating: 4.8,
    reviewCount: 24,
    shortDesc: "Solid marble geometric blocks for luxury bookshelf & library styling.",
    description: "Heavyweight solid stone bookends diamond-carved into sharp architectural facets. Weighted to hold heavy art monographs.",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDl3Juegqj648HlNvPbOYmIQuaQIKFnKbnqr9grhSKSQ0243IlWTHbu2weFAqiwqfHOZSgI2WVoDsKGF-XInrBDGO9ihCIw2uSb0PEExjNRC9kDjYXidpbAd5zZ_tcxqigUKWeUZkAHSJ2daOPPXc0D9Gt5fSK3S8jgJj89cahrjn--zOWGQeBL8fFajyRmfbGCm8w8WWUX4jNGFU15xxXKXpg2ZqxFe-jmc0H3KIl5Ab51Mu_nLnlOTBXh5eWWPMtyNp2MBrRYDiQ",
    materialOptions: ["Nero Marquina", "Calacatta Gold", "Verde Alpi Green"],
    sizeOptions: [
      { name: "Standard Pair (18cm height)", priceDelta: 0 },
      { name: "Tall Sculptural Pair (24cm height)", priceDelta: 40 }
    ],
    dimensions: "120 x 80 x 180 mm (each)",
    leadTime: "2-3 Business Days",
    inStock: true,
    origin: "Marquina, Spain & Carrara, Italy",
    weight: "4.4 kg (Pair)",
    hardnessRating: "Mohs 4.0",
    density: "2,690 kg/m³",
    artisanMaster: "David Thorne",
    artisanWorkshop: "SMC Battersea Studio, London",
    craftingTechnique: "Diamond block sawing with razor-sharp geometric faceting and velvet padded anti-slip base.",
    careInstructions: "Dust with soft dry cloth. Polished finish requires minimal maintenance.",
    keyFeatures: [
      "Weighted solid marble blocks hold heavy art monographs",
      "Protective velvet felt underside prevents shelf scratching",
      "Architectural geometric multi-facet design",
      "Distinct natural vein orientation on each piece"
    ]
  },
  {
    id: "prod-cd-02",
    name: "Solid Marble Rolling Pin & Brass Display Cradle",
    category: "custom-decor",
    categoryLabel: "Custom Marble Accents",
    basePrice: 115,
    rating: 4.9,
    reviewCount: 37,
    shortDesc: "Chilled marble roller barrel with solid brass handles & display stand.",
    description: "Naturally cool marble cylinder retains low temperatures, preventing pastry dough from sticking. Comes with an engraved brass resting stand.",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuD0LYumSn3sho4_sukH-QWbBRZbWs3UGyrig7QYSz0H_T29LsVc1b6ONKY6IfnakzNriwcsCBXpYg9rUTNDJ3bEBswyuV935uwu3vjEDp9TUVx_thDJtqq-dGcdEJzGROshwMNdPA4jyWb4nnB70ARGLYXCqgmJtsqJLWJtbZkwYnTy5Ad0hG8IDp_dXuNOLfULlbgRg7qtXqM_mNQ4JarnhL2qoFMd00LL75hlNXJxlH_djad5ZwTLwmyIPh9pf6_3Ov0XFp8zjv0",
    materialOptions: ["Carrara White", "Pietra Grey"],
    sizeOptions: [
      { name: "Master Chef Roller (45 cm)", priceDelta: 0 }
    ],
    dimensions: "450 x 60 mm",
    leadTime: "2-3 Business Days",
    inStock: true,
    origin: "White Carrara, Italy",
    weight: "2.9 kg",
    hardnessRating: "Mohs 3.8",
    density: "2,700 kg/m³",
    artisanMaster: "SMC Kitchenware Artisans",
    artisanWorkshop: "SMC Battersea Studio, London",
    craftingTechnique: "Precision lathe turned stone cylinder fitted with solid brass rod handles & steel bearings.",
    careInstructions: "Hand wash cylinder in cold soapy water. Chill in refrigerator 15 minutes before rolling pastry.",
    keyFeatures: [
      "Naturally cold marble barrel keeps dough & butter cool",
      "Smooth steel ball-bearing rotational mechanism",
      "Includes solid brass resting cradle for display",
      "BS EN 1186 Certified food-safe finish"
    ]
  },
  {
    id: "prod-cd-03",
    name: "Heavy Emerald Quartzite Mortar & Pestle Atelier Set",
    category: "custom-decor",
    categoryLabel: "Custom Marble Accents",
    basePrice: 135,
    rating: 5.0,
    reviewCount: 45,
    shortDesc: "Extra-heavy unpolished interior stone mortar for spice grinding & pesto.",
    description: "Hand-lathed from high-density Emerald Quartzite. Unpolished interior bowl provides friction for crushing whole spices, garlic, herbs, and chimichurri.",
    imageUrl: "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=800&q=80",
    badge: "Chef Favorite",
    materialOptions: ["Emerald Quartzite", "Nero Marquina", "Carrara White"],
    sizeOptions: [
      { name: "Standard Atelier (16 cm Dia)", priceDelta: 0 },
      { name: "Grand Feast (20 cm Dia)", priceDelta: 35 }
    ],
    dimensions: "160 Dia x 110 H mm",
    leadTime: "1-3 Business Days",
    inStock: true,
    origin: "Minas Gerais Quarries, Brazil",
    weight: "3.8 kg",
    hardnessRating: "Mohs 7.0 (Extreme Quartzite Density)",
    density: "2,820 kg/m³",
    artisanMaster: "David Thorne",
    artisanWorkshop: "SMC Battersea Studio, London",
    craftingTechnique: "Solid lathe turned with diamond texturing on interior bowl and weighted pestle handle.",
    careInstructions: "Rinse with warm water. Season with rice grain crush prior to first use.",
    keyFeatures: [
      "High Mohs 7.0 hardness quartzite resists chipping during heavy spice crushing",
      "Micro-textured interior bowl creates ideal friction for pesto & guacamole",
      "Heavy 3.8kg base remains stable on kitchen counter without slipping",
      "Ergonomic pestle handle contoured for maximum crushing leverage"
    ]
  },
  {
    id: "prod-cd-04",
    name: "Calacatta Viola Fluted Tissue Box & Vanity Organizer",
    category: "custom-decor",
    categoryLabel: "Custom Marble Accents",
    basePrice: 160,
    rating: 4.9,
    reviewCount: 28,
    shortDesc: "Solid carved Viola marble tissue cover with magnetic bottom loading plate.",
    description: "Carved from dramatic Calacatta Viola marble with rich cabernet veining. Features vertical fluted perimeter walls and a brass magnetic base plate for effortless box refills.",
    imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
    badge: "Luxury Vanity",
    materialOptions: ["Calacatta Viola", "White Carrara", "Travertine Beige"],
    sizeOptions: [
      { name: "Standard Cube (14 x 14 x 15 cm)", priceDelta: 0 },
      { name: "Rectangular Tissue Box (25 x 14 x 10 cm)", priceDelta: 45 }
    ],
    dimensions: "140 x 140 x 150 mm",
    leadTime: "2-4 Business Days",
    inStock: true,
    origin: "Carrara Viola Quarry, Tuscany",
    weight: "2.7 kg",
    hardnessRating: "Mohs 3.8",
    density: "2,710 kg/m³",
    artisanMaster: "SMC Craftsmen",
    artisanWorkshop: "SMC Battersea Studio, London",
    craftingTechnique: "Precision 5-axis fluted wall excavation with concealed brass magnetic bottom plate.",
    careInstructions: "Dust with dry lint-free cloth.",
    keyFeatures: [
      "Concealed magnetic brass base plate for quick tissue box insertion",
      "Architectural vertical fluted profile adds luxury hotel ambiance to vanity or bedside",
      "Weighted 2.7kg structure allows 1-handed tissue extraction without box sliding",
      "Non-scratch velvet bottom corners"
    ]
  },
  {
    id: "prod-cd-05",
    name: "Aura Monolithic Marble Wall Clock with Brass Hands",
    category: "custom-decor",
    categoryLabel: "Custom Marble Accents",
    basePrice: 190,
    rating: 5.0,
    reviewCount: 19,
    shortDesc: "30cm circular marble disc with silent German quartz mechanism & brushed brass hands.",
    description: "Minimalist wall clock carved from a 15mm slab of natural stone. Features brass hour indices inlaid flush with the surface and a whisper-silent sweep movement.",
    imageUrl: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=800&q=80",
    badge: "Statement Piece",
    materialOptions: ["Nero Marquina", "Calacatta Gold", "Travertine Navona"],
    sizeOptions: [
      { name: "Standard Wall Disc (30 cm Dia)", priceDelta: 0 },
      { name: "Grand Gallery Disc (40 cm Dia)", priceDelta: 65 }
    ],
    dimensions: "300 Dia x 20 mm",
    leadTime: "2-4 Business Days",
    inStock: true,
    origin: "Tuscany & SMC London Atelier",
    weight: "3.2 kg",
    hardnessRating: "Mohs 4.0",
    density: "2,700 kg/m³",
    artisanMaster: "Antoine Laurent",
    artisanWorkshop: "SMC Battersea Studio, London",
    craftingTechnique: "Lathe turned stone disc with flush brass hour indices and heavy-duty wall anchor mount.",
    careInstructions: "Dust with dry cloth. Requires 1x AA battery.",
    keyFeatures: [
      "German silent sweep quartz movement (zero ticking noise)",
      "Flush brass inlaid hour markers at 12, 3, 6, and 9 o'clock",
      "Heavy-duty brass wall mounting system included",
      "Custom gift boxed"
    ]
  },
  {
    id: "prod-cd-06",
    name: "Solid Marble Wine & Champagne Ice Chiller Cylinder",
    category: "custom-decor",
    categoryLabel: "Custom Marble Accents",
    basePrice: 125,
    rating: 4.9,
    reviewCount: 39,
    shortDesc: "Thermal stone cylinder keeps champagne & wine chilled for hours without ice.",
    description: "Carved from a solid block of high-density marble. Pre-chilled in the freezer for 20 minutes, stone natural thermal inertia maintains wine serving temperature throughout dinner.",
    imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80",
    badge: "Entertaining",
    materialOptions: ["White Carrara", "Nero Marquina", "Pietra Grey"],
    sizeOptions: [
      { name: "Standard Bottle Chiller (12 cm Dia)", priceDelta: 0 },
      { name: "Champagne Magnum Chiller (15 cm Dia)", priceDelta: 30 }
    ],
    dimensions: "120 Dia x 220 H mm",
    leadTime: "1-2 Business Days",
    inStock: true,
    origin: "Carrara, Italy",
    weight: "2.4 kg",
    hardnessRating: "Mohs 3.8",
    density: "2,710 kg/m³",
    artisanMaster: "SMC Kitchenware Artisans",
    artisanWorkshop: "SMC Battersea Studio, London",
    craftingTechnique: "Lathe core excavation with honed exterior and felt bottom pad.",
    careInstructions: "Chill in freezer before use. Wipe dry after meal.",
    keyFeatures: [
      "Natural thermal stone insulation retains cold temperatures without melting ice drippings",
      "Fits standard 750ml wine, champagne, and prosecco bottles",
      "Soft felt base prevents table moisture rings and scratches",
      "Can also double as a luxury kitchen utensil vase or floral urn"
    ]
  }
];

export const DEFAULT_SAMPLE_ORDERS: ShopOrder[] = [
  {
    orderRef: "SMC-SHOP-984120",
    date: "20 Jul 2026",
    time: "14:25",
    status: "Shipped",
    courierName: "SMC Dedicated White-Glove Transit",
    trackingNumber: "SMC-WG-9841207GB",
    estimatedDelivery: "24 Jul - 25 Jul 2026",
    subtotal: 700.00,
    discount: 0,
    netSubtotal: 700.00,
    baseFreightCost: 45.00,
    heavyHandlingFee: 15.00,
    transitInsuranceCost: 15.00,
    deliveryCost: 75.00,
    vatTax: 140.00,
    total: 915.00,
    totalWeightKg: 12.5,
    custName: "Sir Alex Vance",
    custEmail: "trade@smcpro.co.uk",
    custPhone: "+44 7700 900123",
    custAddress: "42 Park Lane, Mayfair, London W1K 1PN",
    custPostcode: "W1K 1PN",
    deliveryNotes: "Contact estate manager 1 hour prior to arrival.",
    deliveryZoneName: "Greater London & Home Counties",
    deliveryOption: "white-glove",
    paymentMethod: "stripe",
    items: [
      {
        cartId: "sample-1",
        product: CATALOG_PRODUCTS[0],
        selectedMaterial: "Calacatta Viola",
        selectedSize: CATALOG_PRODUCTS[0].sizeOptions[0],
        customEngraving: "THE VANCE ESTATE 2026",
        quantity: 1,
        unitPrice: 280
      },
      {
        cartId: "sample-2",
        product: CATALOG_PRODUCTS[1],
        selectedMaterial: "Nero Marquina",
        selectedSize: CATALOG_PRODUCTS[1].sizeOptions[0],
        selectedHandle: "Brushed Solid Brass",
        quantity: 1,
        unitPrice: 420
      }
    ],
    trackingEvents: [
      {
        title: "Order Placed & Atelier Reserved",
        location: "SMC Battersea Atelier, London",
        timestamp: "20 Jul 2026, 14:25",
        completed: true,
        details: "Calacatta Viola & Nero Marquina raw marble blocks allocated to Senior Master Stonemason."
      },
      {
        title: "5-Axis CNC Milling & Miter Joinery",
        location: "Battersea Stone Studio",
        timestamp: "21 Jul 2026, 09:15",
        completed: true,
        details: "Waterjet contour milling completed down to ±0.2mm tolerance with 45° edge beveling."
      },
      {
        title: "Food-Safe Nano-Wax Sealing & Serial Stamping",
        location: "Battersea Stone Studio",
        timestamp: "21 Jul 2026, 16:40",
        completed: true,
        details: "BS EN 1186 food contact certified and laser monogram engraved."
      },
      {
        title: "Handed to SMC Dedicated Freight Courier",
        location: "London SW8 Dispatch Hub",
        timestamp: "22 Jul 2026, 08:30",
        completed: true,
        details: "Packed in custom foam-lined timber crate with certificate of provenance."
      },
      {
        title: "In Transit to Regional Distribution Hub",
        location: "Mayfair Logistics Hub",
        timestamp: "22 Jul 2026, 11:20",
        completed: true,
        details: "Assigned to Dedicated White-Glove Vehicle #4 (Mayfair/Kensington Route)."
      },
      {
        title: "Out for Final Delivery & Uncrating",
        location: "42 Park Lane, Mayfair W1K 1PN",
        timestamp: "Est. 24 Jul 2026",
        completed: false,
        details: "Scheduled room-of-choice placement and uncrating by 2-person white-glove crew."
      }
    ]
  },
  {
    orderRef: "SMC-SHOP-619284",
    date: "08 Jul 2026",
    time: "10:15",
    status: "Delivered",
    courierName: "DPD Freight Specialist",
    trackingNumber: "DPD-998412041GB",
    estimatedDelivery: "11 Jul 2026",
    subtotal: 270.00,
    discount: 8.10,
    netSubtotal: 261.90,
    baseFreightCost: 25.00,
    heavyHandlingFee: 0,
    transitInsuranceCost: 15.00,
    deliveryCost: 40.00,
    vatTax: 52.38,
    total: 354.28,
    totalWeightKg: 4.2,
    custName: "Sir Alex Vance",
    custEmail: "trade@smcpro.co.uk",
    custPhone: "+44 7700 900123",
    custAddress: "42 Park Lane, Mayfair, London W1K 1PN",
    custPostcode: "W1K 1PN",
    deliveryNotes: "Leave with front desk concierge.",
    deliveryZoneName: "Greater London & Home Counties",
    deliveryOption: "standard",
    paymentMethod: "bank-transfer",
    items: [
      {
        cartId: "sample-3",
        product: CATALOG_PRODUCTS[2],
        selectedMaterial: "Arabescato Corchia",
        selectedSize: CATALOG_PRODUCTS[2].sizeOptions[0],
        quantity: 2,
        unitPrice: 135
      }
    ],
    trackingEvents: [
      {
        title: "Order Placed & Wire Transfer Cleared",
        location: "SMC Battersea Atelier",
        timestamp: "08 Jul 2026, 10:15",
        completed: true,
        details: "3% Wire payment discount applied."
      },
      {
        title: "Hand-Polished & Felt Backing Applied",
        location: "Battersea Stone Studio",
        timestamp: "09 Jul 2026, 13:00",
        completed: true,
        details: "Set of 6 hexagonal coasters hand-honed and cork-lined."
      },
      {
        title: "Dispatched via DPD Freight",
        location: "London Distribution Hub",
        timestamp: "10 Jul 2026, 08:45",
        completed: true,
        details: "Transit ID DPD-998412041GB."
      },
      {
        title: "Delivered & Signed for by Concierge",
        location: "42 Park Lane, Mayfair",
        timestamp: "11 Jul 2026, 10:50",
        completed: true,
        details: "Signed by A. Vance."
      }
    ]
  }
];

interface ArtisanShopViewProps {
  onBackToDashboard?: () => void;
  userEmail?: string;
}

export default function ArtisanShopView({ onBackToDashboard, userEmail = "trade@smcpro.co.uk" }: ArtisanShopViewProps) {
  // Category tab state
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMaterialFilter, setSelectedMaterialFilter] = useState<string>("All");

  // Popular Material Presets for 1-click filtering
  const MATERIAL_PRESETS = [
    "All",
    "Calacatta",
    "Nero Marquina",
    "Carrara",
    "Arabescato",
    "Travertine",
    "Quartzite",
    "Pietra Grey",
    "Walnut",
    "Brass"
  ];

  // Product Selection Modal
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const [selectedSizeIndex, setSelectedSizeIndex] = useState<number>(0);
  const [selectedHandle, setSelectedHandle] = useState<string>("");
  const [selectedTapFinish, setSelectedTapFinish] = useState<string>("");
  const [customEngraving, setCustomEngraving] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [productModalTab, setProductModalTab] = useState<"configure" | "specs" | "dimensions" | "artisan" | "island-demo">("configure");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isImageZoomed, setIsImageZoomed] = useState<boolean>(false);

  // Kitchen Island Video Demo Modal State
  const [islandDemoProduct, setIslandDemoProduct] = useState<ShopProduct | null>(null);
  const [selectedIslandSurface, setSelectedIslandSurface] = useState<string>("calacatta");
  const [isPlayingIslandVideo, setIsPlayingIslandVideo] = useState<boolean>(true);
  const [isIslandVideoMuted, setIsIslandVideoMuted] = useState<boolean>(true);
  const [islandLightingMode, setIslandLightingMode] = useState<"daylight" | "evening" | "spotlight">("daylight");
  const [isBeforeAfterStaged, setIsBeforeAfterStaged] = useState<boolean>(true);

  // Persistent Cart State Storage Key
  const CART_STORAGE_KEY = "smc_artisan_cart_items_v1";

  // Cart State (Persisted in localStorage across navigation)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse saved artisan cart items:", e);
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Sync Cart State to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error("Failed to save artisan cart items to storage:", e);
    }
  }, [cartItems]);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [checkoutStep, setCheckoutStep] = useState<"details" | "shipping" | "payment" | "review">("details");
  const [selectedZoneId, setSelectedZoneId] = useState<string>("london-central");
  const [deliveryOption, setDeliveryOption] = useState<"standard" | "white-glove" | "express" | "pickup">("white-glove");
  const [includeInsurance, setIncludeInsurance] = useState<boolean>(true);
  
  // Payment Options & Simulator State
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "apple-pay" | "klarna" | "bank-transfer" | "crypto">("stripe");
  const [testCardMode, setTestCardMode] = useState<"success" | "decline">("success");
  const [cardNumber, setCardNumber] = useState<string>("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = useState<string>("12/28");
  const [cardCvc, setCardCvc] = useState<string>("888");
  const [cardName, setCardName] = useState<string>("Sir Alex Vance");
  const [cryptoToken, setCryptoToken] = useState<"USDC" | "USDT" | "ETH">("USDC");
  const [copiedWallet, setCopiedWallet] = useState<boolean>(false);
  
  // Checkout Form
  const [custName, setCustName] = useState<string>("Sir Alex Vance");
  const [custEmail, setCustEmail] = useState<string>(userEmail);
  const [custPhone, setCustPhone] = useState<string>("+44 7700 900123");
  const [custAddress, setCustAddress] = useState<string>("42 Park Lane, Mayfair, London W1K 1PN");
  const [custPostcode, setCustPostcode] = useState<string>("W1K 1PN");
  const [deliveryNotes, setDeliveryNotes] = useState<string>("Please contact estate manager 1 hour prior to arrival.");

  // Order Confirmation State
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [processingStepIndex, setProcessingStepIndex] = useState<number>(0);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);

  // Simulated Email Notification & Client Inbox State
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [showEmailToast, setShowEmailToast] = useState<boolean>(false);
  const [copyTrackingToast, setCopyTrackingToast] = useState<boolean>(false);
  const [isResendingEmail, setIsResendingEmail] = useState<boolean>(false);
  const [simulatedCourierStatus, setSimulatedCourierStatus] = useState<"prep" | "dispatched" | "out-for-delivery">("prep");

  // View mode: shop catalog or My Orders section
  const [viewMode, setViewMode] = useState<"shop" | "orders">("shop");

  // Orders State (Persisted in localStorage)
  const ORDERS_STORAGE_KEY = "smc_artisan_orders_v1";
  const [orders, setOrders] = useState<ShopOrder[]>(() => {
    try {
      const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse saved orders:", e);
    }
    return DEFAULT_SAMPLE_ORDERS;
  });

  // Sync Orders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error("Failed to save orders to localStorage:", e);
    }
  }, [orders]);

  // Order Search & Filter State inside "My Orders"
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("All");
  const [expandedTrackingRef, setExpandedTrackingRef] = useState<string | null>(null);

  // Filtered Orders for My Orders section
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const matchesStatus = orderStatusFilter === "All" || ord.status === orderStatusFilter;
      const q = orderSearchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        ord.orderRef.toLowerCase().includes(q) ||
        ord.trackingNumber.toLowerCase().includes(q) ||
        ord.courierName.toLowerCase().includes(q) ||
        ord.items.some((i) => i.product.name.toLowerCase().includes(q) || i.selectedMaterial.toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    });
  }, [orders, orderStatusFilter, orderSearchQuery]);

  // Helper: Reorder All Items from an Order
  const handleReorderOrder = (orderToReorder: ShopOrder) => {
    setCartItems((prev) => {
      const updated = [...prev];
      orderToReorder.items.forEach((item) => {
        const existingIdx = updated.findIndex(
          (i) =>
            i.product.id === item.product.id &&
            i.selectedMaterial === item.selectedMaterial &&
            i.selectedSize.name === item.selectedSize.name &&
            i.selectedHandle === item.selectedHandle &&
            i.selectedTapFinish === item.selectedTapFinish &&
            i.customEngraving === item.customEngraving
        );
        if (existingIdx > -1) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + item.quantity
          };
        } else {
          updated.push({
            ...item,
            cartId: `${item.product.id}-${item.selectedMaterial}-${Date.now()}-${Math.random()}`
          });
        }
      });
      return updated;
    });
    setIsCartOpen(true);
  };

  // Helper: Advance Order Status for live demo/testing
  const handleAdvanceOrderStatus = (orderRef: string) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.orderRef !== orderRef) return ord;
        const statusCycle: ShopOrder["status"][] = [
          "Processing",
          "In Artisan Production",
          "Shipped",
          "Out for Delivery",
          "Delivered"
        ];
        const currentIdx = statusCycle.indexOf(ord.status);
        const nextStatus = statusCycle[(currentIdx + 1) % statusCycle.length];

        const statusLevelMap: Record<ShopOrder["status"], number> = {
          Processing: 1,
          "In Artisan Production": 2,
          Shipped: 4,
          "Out for Delivery": 5,
          Delivered: 6
        };
        const targetLevel = statusLevelMap[nextStatus];

        const updatedEvents = ord.trackingEvents.map((evt, idx) => ({
          ...evt,
          completed: idx < targetLevel
        }));

        return {
          ...ord,
          status: nextStatus,
          trackingEvents: updatedEvents
        };
      })
    );
  };

  // Helper: Copy Tracking Number
  const handleCopyTracking = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopyTrackingToast(true);
    setTimeout(() => setCopyTrackingToast(false), 2500);
  };

  // Auto Postcode Zone Matcher
  const handlePostcodeChange = (val: string) => {
    setCustPostcode(val);
    const clean = val.trim().toUpperCase();
    if (clean.length >= 2) {
      const matchedZone = DELIVERY_ZONES.find((z) =>
        z.postcodePrefixes.some((pref) => clean.startsWith(pref))
      );
      if (matchedZone) {
        setSelectedZoneId(matchedZone.id);
      }
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return CATALOG_PRODUCTS.filter((p) => {
      const matchesCategory = activeCategory === "all" || p.category === activeCategory;

      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.shortDesc.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.materialOptions.some((m) => m.toLowerCase().includes(q)) ||
        (p.handleOptions && p.handleOptions.some((h) => h.toLowerCase().includes(q))) ||
        (p.tapFinishOptions && p.tapFinishOptions.some((t) => t.toLowerCase().includes(q))) ||
        (p.keyFeatures && p.keyFeatures.some((f) => f.toLowerCase().includes(q))) ||
        (p.origin && p.origin.toLowerCase().includes(q));

      const mat = selectedMaterialFilter.toLowerCase();
      const matchesMaterial =
        selectedMaterialFilter === "All" ||
        p.materialOptions.some((m) => m.toLowerCase().includes(mat)) ||
        p.name.toLowerCase().includes(mat) ||
        p.description.toLowerCase().includes(mat) ||
        (p.handleOptions && p.handleOptions.some((h) => h.toLowerCase().includes(mat))) ||
        (p.tapFinishOptions && p.tapFinishOptions.some((t) => t.toLowerCase().includes(mat)));

      return matchesCategory && matchesQuery && matchesMaterial;
    });
  }, [activeCategory, searchQuery, selectedMaterialFilter]);

  // Overall catalog match count across all categories for search
  const allCategoryMatchCount = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const mat = selectedMaterialFilter.toLowerCase();
    if (!q && selectedMaterialFilter === "All") return CATALOG_PRODUCTS.length;

    return CATALOG_PRODUCTS.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.shortDesc.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.materialOptions.some((m) => m.toLowerCase().includes(q)) ||
        (p.handleOptions && p.handleOptions.some((h) => h.toLowerCase().includes(q))) ||
        (p.tapFinishOptions && p.tapFinishOptions.some((t) => t.toLowerCase().includes(q))) ||
        (p.keyFeatures && p.keyFeatures.some((f) => f.toLowerCase().includes(q))) ||
        (p.origin && p.origin.toLowerCase().includes(q));

      const matchesMaterial =
        selectedMaterialFilter === "All" ||
        p.materialOptions.some((m) => m.toLowerCase().includes(mat)) ||
        p.name.toLowerCase().includes(mat) ||
        p.description.toLowerCase().includes(mat) ||
        (p.handleOptions && p.handleOptions.some((h) => h.toLowerCase().includes(mat))) ||
        (p.tapFinishOptions && p.tapFinishOptions.some((t) => t.toLowerCase().includes(mat)));

      return matchesQuery && matchesMaterial;
    }).length;
  }, [searchQuery, selectedMaterialFilter]);

  // Helper to construct high-res gallery angles for the modal
  const getProductGalleryImages = (product: ShopProduct) => {
    return [
      { title: "Primary Studio View", label: "Studio Product", url: product.imageUrl },
      { title: "Material Veining & Macro Texture", label: "Vein & Grain Detail", url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCceLmw5sOh0z2EWRZuuIt07t99JzV12V40LcoVylTvTo6qmVA_Eqm-L2PNJF9tfv0rlzd_-r2cnhzY8V2FFlAORqH0IvqeYSQIbjIM1up-2DWu6Y9X331y8UECNxCmr-z3xzhe6XQ67nKCIi2yNZVxokXX668E-MuK04RWhs55IOCz7IQDe-eAhjp9yk9VarnTSK5kbFrpO8YOJwmU8nUScy0xLQUHUUmJ6TTZwwOhCOahiu1o0lqf7QXgmfGGA9xDep-YmJGBP0w" },
      { title: "Handcrafting & Edge Beveling", label: "Battersea Masonry", url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBcHK03iYTJ1DFAk8dgBr4kisxAFbKpktYyspjsk5tmeR5k-j_8_vTSqApGCRSPkdLPuIUkMC72hwCMzXiITpxLQMVrJQXhsFerQfojoAjSZcOiyWxZw4NWcTozphYXckddNAfyV5gU26B-EY_lZ2TYrFNw6nTX8srBpSAu6YUlfl9sfGP5GcHhjRrZ7ZAwGR7g_GzWSkH9wPYG5i-R0nKxZWvqT_gK047VE8ar0HK88QnD4YCj35aZ3R6RGk1SVya1sA7B2h8GotA" },
      { title: "Architectural Interior Context", label: "Lifestyle Setting", url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAbvIF9L90gd_T_tBcV0MEpEEOYHtaWJgpCKc5hFe8zZ1m0NGsL0MN1I4J-sC2DOKK0NdAnNNw-4HOOz8gFsb3Yy5HutsAQPmfxnqt-V2QoV9IWHqWPXXD8jplRIRfUHsAaRhwoVFh3VOW7pTfAM7hSUQo5hpq0pS8rMi1NXc05RtrOnKK62pNMSE-CM0-CUPwXt6Ch9pvtl-UwhWLc7df3IYPaKuaK1uqL0C2NWqPmF5n7F2Jw_bgT_Zwze7msLZwUV3nP6j2cbvY" }
    ];
  };

  // Open Product Modal with initial tab
  const handleOpenProduct = (product: ShopProduct, initialTab: "configure" | "specs" | "dimensions" | "artisan" = "configure") => {
    setSelectedProduct(product);
    setSelectedMaterial(product.materialOptions[0] || "");
    setSelectedSizeIndex(0);
    setSelectedHandle(product.handleOptions ? product.handleOptions[0] : "");
    setSelectedTapFinish(product.tapFinishOptions ? product.tapFinishOptions[0] : "");
    setCustomEngraving("");
    setQuantity(1);
    setSelectedImageIndex(0);
    setIsImageZoomed(false);
    setProductModalTab(initialTab);
  };

  // Add to Cart (Merges duplicate specs or appends new)
  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const sizeObj = selectedProduct.sizeOptions[selectedSizeIndex];
    const unitPrice = selectedProduct.basePrice + sizeObj.priceDelta;
    const handleVal = selectedProduct.handleOptions ? selectedHandle : undefined;
    const tapVal = selectedProduct.tapFinishOptions ? selectedTapFinish : undefined;
    const engravingVal = customEngraving.trim() || undefined;

    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          i.product.id === selectedProduct.id &&
          i.selectedMaterial === selectedMaterial &&
          i.selectedSize.name === sizeObj.name &&
          i.selectedHandle === handleVal &&
          i.selectedTapFinish === tapVal &&
          i.customEngraving === engravingVal
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + quantity
        };
        return updated;
      }

      const cartId = `${selectedProduct.id}-${selectedMaterial}-${selectedSizeIndex}-${Date.now()}`;
      const newItem: CartItem = {
        cartId,
        product: selectedProduct,
        selectedMaterial,
        selectedSize: sizeObj,
        selectedHandle: handleVal,
        selectedTapFinish: tapVal,
        customEngraving: engravingVal,
        quantity,
        unitPrice
      };
      return [...prev, newItem];
    });

    setSelectedProduct(null);
    setIsCartOpen(true);
  };

  // Helper to add product directly to cart (e.g. from bundle or demo modal)
  const handleDirectAddToCart = (product: ShopProduct, materialName?: string, sizeOption?: { name: string; priceDelta: number }, qty: number = 1) => {
    const mat = materialName || product.materialOptions[0] || "Calacatta Viola";
    const size = sizeOption || product.sizeOptions[0];
    const unitPrice = product.basePrice + size.priceDelta;

    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          i.product.id === product.id &&
          i.selectedMaterial === mat &&
          i.selectedSize.name === size.name
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + qty
        };
        return updated;
      }

      const cartId = `direct-${product.id}-${mat}-${Date.now()}`;
      const newItem: CartItem = {
        cartId,
        product,
        selectedMaterial: mat,
        selectedSize: size,
        quantity: qty,
        unitPrice
      };
      return [...prev, newItem];
    });
  };

  // Update Cart Quantity
  const handleUpdateCartQty = (cartId: string, newQty: number) => {
    if (newQty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.cartId !== cartId));
    } else {
      setCartItems((prev) =>
        prev.map((i) => (i.cartId === cartId ? { ...i, quantity: newQty } : i))
      );
    }
  };

  // Clear Entire Cart
  const handleClearCart = () => {
    if (window.confirm("Are you sure you want to empty your artisan cart?")) {
      setCartItems([]);
    }
  };

  // Weight and Surcharge Calculations
  const totalWeightKg = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const raw = item.product.weight || "3.5 kg";
      const parsed = parseFloat(raw.replace(/[^0-9.]/g, "")) || 3.5;
      return acc + parsed * item.quantity;
    }, 0);
  }, [cartItems]);

  const heavyHandlingFee = useMemo(() => {
    if (deliveryOption === "pickup") return 0;
    if (totalWeightKg > 15) {
      const extraKg = totalWeightKg - 15;
      return Math.min(60, Math.round(15 + extraKg * 0.8));
    }
    return 0;
  }, [totalWeightKg, deliveryOption]);

  const activeZone = useMemo(() => {
    return DELIVERY_ZONES.find((z) => z.id === selectedZoneId) || DELIVERY_ZONES[0];
  }, [selectedZoneId]);

  const baseFreightCost = useMemo(() => {
    if (cartItems.length === 0) return 0;
    if (deliveryOption === "pickup") return 0;
    return activeZone.baseRates[deliveryOption] || 45;
  }, [activeZone, deliveryOption, cartItems]);

  const transitInsuranceCost = useMemo(() => {
    if (deliveryOption === "pickup") return 0;
    return includeInsurance ? 15 : 0;
  }, [includeInsurance, deliveryOption]);

  const deliveryCost = useMemo(() => {
    if (deliveryOption === "pickup") return 0;
    return baseFreightCost + heavyHandlingFee + transitInsuranceCost;
  }, [deliveryOption, baseFreightCost, heavyHandlingFee, transitInsuranceCost]);

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  }, [cartItems]);

  const paymentDiscount = useMemo(() => {
    if (paymentMethod === "bank-transfer") {
      return Math.round(cartSubtotal * 0.03 * 100) / 100; // 3% Wire Trade Discount
    }
    if (paymentMethod === "crypto") {
      return Math.round(cartSubtotal * 0.02 * 100) / 100; // 2% Web3 Gas Discount
    }
    return 0;
  }, [paymentMethod, cartSubtotal]);

  const netSubtotal = useMemo(() => {
    return Math.max(0, cartSubtotal - paymentDiscount);
  }, [cartSubtotal, paymentDiscount]);

  const vatTax = useMemo(() => {
    return Math.round(netSubtotal * 0.20 * 100) / 100; // 20% UK VAT
  }, [netSubtotal]);

  const cartTotal = useMemo(() => {
    return Math.round((netSubtotal + deliveryCost + vatTax) * 100) / 100;
  }, [netSubtotal, deliveryCost, vatTax]);

  // Execute Order / Simulated Payment Process
  const handleProcessOrder = () => {
    setPaymentErrorMessage("Checkout is unavailable until the production payment and order integrations are configured.");
    setIsProcessingPayment(false);
    return;

    // Step 1: Encrypting
    setTimeout(() => {
      setProcessingStepIndex(1); // 3DS Fraud Check
    }, 600);

    // Step 2: Contacting Bank
    setTimeout(() => {
      setProcessingStepIndex(2); // Clearing Funds
    }, 1200);

    // Step 3: Check test decline vs success
    setTimeout(() => {
      if (testCardMode === "decline" && paymentMethod === "stripe") {
        setIsProcessingPayment(false);
        setPaymentErrorMessage(
          "Payment Gateway Declined: 3D-Secure Fraud Authentication Failed or Insufficient Funds (Simulated Decline Test). Please toggle test mode to 'Approved Test Card' or select an alternative payment method."
        );
        return;
      }

      setProcessingStepIndex(3); // Invoice & Provenance Generation
      setTimeout(() => {
        setIsProcessingPayment(false);
        const orderRef = `SMC-SHOP-${Math.floor(100000 + Math.random() * 900000)}`;
        const deliveryWindowInfo = computeDeliveryWindow(cartItems, deliveryOption, activeZone.name);

        const newOrder = {
          orderRef,
          items: [...cartItems],
          subtotal: cartSubtotal,
          discount: paymentDiscount,
          netSubtotal,
          baseFreightCost,
          heavyHandlingFee,
          transitInsuranceCost,
          deliveryCost,
          vatTax,
          total: cartTotal,
          totalWeightKg,
          custName,
          custEmail,
          custPhone,
          custAddress,
          custPostcode,
          deliveryNotes,
          deliveryZoneName: activeZone.name,
          deliveryOption,
          paymentMethod,
          deliveryWindowInfo,
          date: new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
          }),
          time: new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit"
          }),
          estimatedDelivery: deliveryWindowInfo.dateRangeStr
        };

        setCompletedOrder(newOrder);

        const orderTrackingEvents: OrderTrackingEvent[] = [
          {
            title: "Order Placed & Payment Cleared",
            location: "SMC Battersea Atelier",
            timestamp: `${newOrder.date}, ${newOrder.time}`,
            completed: true,
            details: `Order reference ${newOrder.orderRef} created. Total £${newOrder.total.toFixed(2)} paid.`
          },
          {
            title: "Atelier Stone Allocation & CNC Milling",
            location: "Battersea Stone Studio",
            timestamp: "In Queue (1-2 Days)",
            completed: false,
            details: "Raw slab block selection, waterjet miter cutting, and edge chamfering."
          },
          {
            title: "Food-Safe Nano-Wax Sealing & QC Stamping",
            location: "Battersea Stone Studio",
            timestamp: "Scheduled",
            completed: false,
            details: "BS EN 1186 certified organic protective wax coating & laser monogramming."
          },
          {
            title: "Crated & Handed to Freight Courier",
            location: "London SW8 Dispatch Center",
            timestamp: "Scheduled",
            completed: false,
            details: `Dispatched via ${deliveryOption === 'white-glove' ? 'SMC Dedicated White-Glove Transit' : 'Specialist Freight Courier'}.`
          },
          {
            title: "Out for Final Delivery & Uncrating",
            location: custAddress,
            timestamp: `Est. ${deliveryWindowInfo.dateRangeStr}`,
            completed: false,
            details: "Room of choice delivery and placement."
          }
        ];

        const createdShopOrder: ShopOrder = {
          ...newOrder,
          status: "Processing",
          courierName: deliveryOption === "white-glove" ? "SMC Dedicated White-Glove Transit" : "DPD Specialist Freight",
          trackingNumber: `SMC-TRK-${Math.floor(10000000 + Math.random() * 90000000)}`,
          trackingEvents: orderTrackingEvents
        };

        setOrders((prev) => [createdShopOrder, ...prev]);

        setCartItems([]);
        setIsCheckoutOpen(false);
        setCheckoutStep("details");
        setShowEmailToast(true);
      }, 700);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-[#131313] text-white pb-32">
      
      {/* SHOP HEADER & BANNER */}
      <div className="bg-gradient-to-b from-black via-[#181818] to-[#131313] border-b border-neutral-800 pt-8 pb-10 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-gold/10 text-gold border border-gold/30 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
                Handcrafted Stone Lifestyle & Hardware
              </div>
              <h1 className="font-serif text-3xl md:text-5xl font-bold text-white tracking-tight">
                SMC Artisan Atelier & Hardware
              </h1>
              <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
                Precision-carved marble chopping boards, custom tray collections with handles, designer integrated sinks & brass taps, coasters, and sculptural marble accents.
              </p>
            </div>

            {/* TOP HEADER BUTTONS: DASHBOARD BACK, KITCHEN ISLAND DEMO, MY ORDERS & CART */}
            <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
              {onBackToDashboard && (
                <button
                  onClick={onBackToDashboard}
                  className="px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 rounded-2xl transition-all flex items-center gap-2 cursor-pointer text-xs font-mono shadow-md"
                >
                  <ArrowLeft className="w-4 h-4 text-gold" />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
              )}

              {/* KITCHEN ISLAND VIDEO DEMO TRIGGER BUTTON */}
              <button
                onClick={() => {
                  const choppingBoardProd = CATALOG_PRODUCTS.find(p => p.hasKitchenIslandDemo) || CATALOG_PRODUCTS[0];
                  setIslandDemoProduct(choppingBoardProd);
                }}
                className="relative px-4 py-3 bg-gradient-to-r from-amber-500/20 via-neutral-900 to-amber-500/10 hover:from-gold hover:to-amber-400 text-gold hover:text-black border border-gold/60 rounded-2xl transition-all flex items-center gap-2.5 cursor-pointer group shadow-xl hover:shadow-gold/20"
                title="Watch Kitchen Island Live Placement Video & Staging Studio"
              >
                <div className="w-7 h-7 rounded-full bg-gold/20 group-hover:bg-black/20 flex items-center justify-center relative shrink-0">
                  <Play className="w-3.5 h-3.5 fill-gold text-gold group-hover:fill-black group-hover:text-black ml-0.5" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold"></span>
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-xs font-serif font-bold block flex items-center gap-1">
                    <span>Island Video Demo</span>
                    <span className="px-1.5 py-0.2 rounded bg-gold/30 text-gold group-hover:bg-black group-hover:text-gold text-[9px] font-mono">4K Studio</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400 group-hover:text-black/80 font-semibold">
                    Staging & Persuasive Preview
                  </span>
                </div>
              </button>

              {/* MY ORDERS TRIGGER BUTTON */}
              <button
                onClick={() => setViewMode(viewMode === "orders" ? "shop" : "orders")}
                className={`relative px-4 py-3 rounded-2xl transition-all flex items-center gap-3 cursor-pointer group shadow-xl border ${
                  viewMode === "orders"
                    ? "bg-gold text-black border-gold font-bold"
                    : "bg-neutral-900 hover:bg-neutral-800 text-white border-gold/40"
                }`}
              >
                <Package className={`w-5 h-5 ${viewMode === "orders" ? "text-black" : "text-gold"}`} />
                <div className="text-left">
                  <span className="text-xs font-serif font-bold block">
                    {viewMode === "orders" ? "Browse Collection" : "My Orders"}
                  </span>
                  <span className={`text-[10px] font-mono ${viewMode === "orders" ? "text-black/80 font-bold" : "text-neutral-400 font-semibold"}`}>
                    {orders.length} Purchases ({orders.filter(o => o.status !== "Delivered").length} Active)
                  </span>
                </div>
              </button>

              {/* CART TRIGGER BUTTON */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative px-5 py-3 bg-neutral-900 hover:bg-gold text-white hover:text-black border border-gold/40 rounded-2xl transition-all flex items-center gap-3 cursor-pointer group shadow-xl"
              >
                <ShoppingCart className="w-5 h-5 text-gold group-hover:text-black transition-colors" />
                <div className="text-left">
                  <span className="text-xs font-serif font-bold block">Artisan Cart</span>
                  <span className="text-[10px] font-mono text-neutral-400 group-hover:text-black font-semibold">
                    {cartItems.length} items (£{cartSubtotal.toFixed(2)})
                  </span>
                </div>
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gold text-black font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-black animate-bounce">
                    {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* CATEGORY FILTER TABS & MATERIAL SEARCH BAR */}
          <div className="space-y-4 pt-4 border-t border-neutral-800">
            
            {/* Top Controls Row: Category Tabs & Enhanced Material Search Bar */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
              
              {/* Category Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 custom-scrollbar text-xs font-mono">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
                    activeCategory === "all"
                      ? "bg-gold text-black font-bold shadow-md"
                      : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  All Collection ({CATALOG_PRODUCTS.length})
                </button>

                <button
                  onClick={() => setActiveCategory("chopping-boards")}
                  className={`px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    activeCategory === "chopping-boards"
                      ? "bg-gold text-black font-bold shadow-md"
                      : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  Chopping Boards
                </button>

                <button
                  onClick={() => setActiveCategory("coffee-trays")}
                  className={`px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    activeCategory === "coffee-trays"
                      ? "bg-gold text-black font-bold shadow-md"
                      : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  Coffee Trays
                </button>

                <button
                  onClick={() => setActiveCategory("coasters")}
                  className={`px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
                    activeCategory === "coasters"
                      ? "bg-gold text-black font-bold shadow-md"
                      : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  Coasters & Holders
                </button>

                <button
                  onClick={() => setActiveCategory("sinks-taps")}
                  className={`px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
                    activeCategory === "sinks-taps"
                      ? "bg-gold text-black font-bold shadow-md"
                      : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  Sinks & Taps
                </button>

                <button
                  onClick={() => setActiveCategory("custom-decor")}
                  className={`px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
                    activeCategory === "custom-decor"
                      ? "bg-gold text-black font-bold shadow-md"
                      : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  Marble Accents
                </button>
              </div>

              {/* Material & Keyword Search Input */}
              <div className="relative w-full lg:w-96 shrink-0">
                <Search className="w-4 h-4 text-gold absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chopping boards, trays, sinks, or materials (Calacatta, Walnut, Travertine)..."
                  className="w-full bg-neutral-900 border border-neutral-700 focus:border-gold rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none transition-all shadow-inner font-mono"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white bg-neutral-800 rounded-full cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

            </div>

            {/* Quick Material Filter Chips Row */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800/60">
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                <Filter className="w-3 h-3 text-gold" />
                Filter Material Type:
              </span>

              {MATERIAL_PRESETS.map((mat) => {
                const isActive = selectedMaterialFilter === mat;
                return (
                  <button
                    key={mat}
                    onClick={() => setSelectedMaterialFilter(mat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer border ${
                      isActive
                        ? "bg-gold/20 text-gold border-gold font-bold shadow-xs"
                        : "bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700"
                    }`}
                  >
                    {mat === "All" ? "All Materials" : mat}
                  </button>
                );
              })}

              {(selectedMaterialFilter !== "All" || searchQuery !== "") && (
                <button
                  onClick={() => {
                    setSelectedMaterialFilter("All");
                    setSearchQuery("");
                  }}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono text-red-400 hover:text-red-300 bg-red-950/30 border border-red-900/50 cursor-pointer flex items-center gap-1 ml-auto"
                >
                  <X className="w-3 h-3" />
                  Clear Filters
                </button>
              )}
            </div>

            {/* Live Filter Summary */}
            <div className="flex justify-between items-center text-[11px] font-mono text-neutral-400 pt-1">
              <span>
                Showing <strong className="text-gold">{filteredProducts.length}</strong> artisan pieces
                {selectedMaterialFilter !== "All" && (
                  <span> in <strong className="text-white">{selectedMaterialFilter}</strong></span>
                )}
                {searchQuery && (
                  <span> matching "<strong className="text-white">{searchQuery}</strong>"</span>
                )}
              </span>
              <span className="text-neutral-500 hidden sm:inline">
                All materials sealed with food-safe nano-wax
              </span>
            </div>

          </div>

        </div>
      </div>

      {/* MAIN VIEW CONTENT: MY ORDERS VS SHOP CATALOG PRODUCTS GRID */}
      {viewMode === "orders" ? (
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-8">
          
          {/* Top Banner & Overview */}
          <div className="bg-gradient-to-r from-neutral-900 via-[#1a1a1a] to-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-gold/10 text-gold border border-gold/30 uppercase tracking-widest mb-2">
                  <Package className="w-3.5 h-3.5 text-gold" />
                  Client Purchase History & Logistics Tracking
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                  My Orders & Atelier Shipments
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Track real-time artisan production, white-glove freight couriers, and download certificates of authenticity.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode("shop")}
                  className="px-4 py-2.5 bg-gold hover:bg-amber-400 text-black font-serif font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Browse Shop Collection</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
              <div className="bg-neutral-950/80 p-4 rounded-xl border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase block">Total Purchases</span>
                <strong className="text-white text-lg font-serif block">{orders.length} Orders</strong>
                <p className="text-[10px] text-neutral-400">All-time order count</p>
              </div>

              <div className="bg-neutral-950/80 p-4 rounded-xl border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase block">In Production / Transit</span>
                <strong className="text-gold text-lg font-serif block">
                  {orders.filter((o) => o.status !== "Delivered").length} Active
                </strong>
                <p className="text-[10px] text-neutral-400">Courier or workshop active</p>
              </div>

              <div className="bg-neutral-950/80 p-4 rounded-xl border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase block">Completed Deliveries</span>
                <strong className="text-emerald-400 text-lg font-serif block">
                  {orders.filter((o) => o.status === "Delivered").length} Delivered
                </strong>
                <p className="text-[10px] text-neutral-400">Signed & received</p>
              </div>

              <div className="bg-neutral-950/80 p-4 rounded-xl border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase block">Total Portfolio Spend</span>
                <strong className="text-gold text-lg font-serif block">
                  £{orders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}
                </strong>
                <p className="text-[10px] text-neutral-400">Inc. Freight & VAT</p>
              </div>
            </div>

            {/* Order Search & Status Filter Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs font-mono">
                {["All", "Processing", "In Artisan Production", "Shipped", "Out for Delivery", "Delivered"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer border text-[11px] ${
                      orderStatusFilter === st
                        ? "bg-gold text-black border-gold font-bold shadow-sm"
                        : "bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800"
                    }`}
                  >
                    {st === "All" ? `All Orders (${orders.length})` : st}
                  </button>
                ))}
              </div>

              {/* Order Search Input */}
              <div className="relative w-full md:w-72 shrink-0">
                <Search className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="Search order #, product, tracking #..."
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-gold rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition-all font-mono"
                />
                {orderSearchQuery && (
                  <button
                    onClick={() => setOrderSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Orders List Cards */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-neutral-900/40 rounded-2xl border border-neutral-800 space-y-3">
              <Package className="w-10 h-10 text-neutral-600 mx-auto" />
              <h3 className="font-serif text-lg font-bold text-white">No purchases found</h3>
              <p className="text-xs text-neutral-400">
                {orderSearchQuery || orderStatusFilter !== "All"
                  ? "Try clearing your order search filter."
                  : "You haven't placed any artisan stone orders yet."}
              </p>
              <button
                onClick={() => { setOrderSearchQuery(""); setOrderStatusFilter("All"); setViewMode("shop"); }}
                className="px-4 py-2 bg-gold text-black font-bold text-xs rounded-xl cursor-pointer font-serif"
              >
                Browse Artisan Shop
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((ord) => {
                const isTrackingExpanded = expandedTrackingRef === ord.orderRef;

                // Status Badge Colors & Icons
                let statusBadgeStyle = "bg-amber-950/80 text-amber-300 border-amber-800/80";
                if (ord.status === "In Artisan Production") statusBadgeStyle = "bg-purple-950/80 text-purple-300 border-purple-800/80";
                if (ord.status === "Shipped") statusBadgeStyle = "bg-blue-950/80 text-blue-300 border-blue-800/80";
                if (ord.status === "Out for Delivery") statusBadgeStyle = "bg-sky-950/80 text-sky-300 border-sky-800/80";
                if (ord.status === "Delivered") statusBadgeStyle = "bg-emerald-950/80 text-emerald-300 border-emerald-800/80";

                // Progress Bar Percentage
                let progressPct = 20;
                if (ord.status === "In Artisan Production") progressPct = 40;
                if (ord.status === "Shipped") progressPct = 75;
                if (ord.status === "Out for Delivery") progressPct = 90;
                if (ord.status === "Delivered") progressPct = 100;

                return (
                  <div key={ord.orderRef} className="bg-[#181818] border border-neutral-800 rounded-2xl overflow-hidden shadow-xl space-y-0 transition-all hover:border-neutral-700">
                    
                    {/* Order Top Bar Header */}
                    <div className="bg-neutral-900/90 p-4 sm:p-5 border-b border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-serif font-bold text-base text-gold tracking-tight">{ord.orderRef}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1 ${statusBadgeStyle}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                            {ord.status}
                          </span>
                        </div>
                        <div className="text-neutral-400 text-[11px] flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                            {ord.date} at {ord.time}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-neutral-300">
                            <Truck className="w-3.5 h-3.5 text-gold" />
                            {ord.courierName}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="text-left md:text-right mr-2">
                          <span className="text-[10px] text-neutral-500 uppercase block">Total Paid</span>
                          <strong className="font-serif text-lg text-white font-bold">£{ord.total.toFixed(2)}</strong>
                        </div>

                        <button
                          onClick={() => setExpandedTrackingRef(isTrackingExpanded ? null : ord.orderRef)}
                          className="px-3.5 py-2 bg-gold/10 hover:bg-gold hover:text-black text-gold border border-gold/40 rounded-xl transition-all cursor-pointer font-bold text-[11px] flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>{isTrackingExpanded ? "Hide Tracking" : "Track Shipment"}</span>
                          {isTrackingExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleReorderOrder(ord)}
                          className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl transition-all cursor-pointer text-[11px] flex items-center gap-1.5"
                          title="Re-add all items to cart"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-gold" />
                          <span className="hidden sm:inline">Reorder</span>
                        </button>

                        <button
                          onClick={() => handleAdvanceOrderStatus(ord.orderRef)}
                          className="px-2.5 py-2 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-gold border border-neutral-800 rounded-xl transition-all cursor-pointer text-[10px]"
                          title="Demo control: Advance status to next stage"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* EXPANDABLE COURIER TRACKING TIMELINE DRAWER */}
                    {isTrackingExpanded && (
                      <div className="bg-neutral-950/90 p-5 border-b border-neutral-800 space-y-4 animate-fadeIn">
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800 font-mono text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-neutral-500 uppercase block">Courier Tracking ID</span>
                            <div className="flex items-center gap-2">
                              <strong className="text-gold font-bold text-sm">{ord.trackingNumber}</strong>
                              <button
                                onClick={() => handleCopyTracking(ord.trackingNumber)}
                                className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white cursor-pointer"
                                title="Copy tracking code"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-neutral-500 uppercase block">Estimated Arrival Window</span>
                            <strong className="text-emerald-400 font-bold">{ord.estimatedDelivery}</strong>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                            <span>Processing</span>
                            <span>In Production</span>
                            <span>Dispatched</span>
                            <span>Out for Delivery</span>
                            <span>Delivered</span>
                          </div>
                          <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                            <div
                              className="h-full bg-gradient-to-r from-gold via-amber-400 to-emerald-400 transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Step-by-step Tracking Events Timeline */}
                        <div className="space-y-3 pt-2">
                          <h4 className="text-[11px] font-mono uppercase text-gold font-bold tracking-wider">
                            Real-time Courier Log ({ord.trackingEvents.filter(e => e.completed).length}/{ord.trackingEvents.length} milestones)
                          </h4>

                          <div className="space-y-2.5">
                            {ord.trackingEvents.map((evt, idx) => (
                              <div key={idx} className="flex items-start gap-3 text-xs font-mono">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                  evt.completed
                                    ? "bg-emerald-950 text-emerald-400 border border-emerald-600/60"
                                    : "bg-neutral-900 text-neutral-600 border border-neutral-800"
                                }`}>
                                  {evt.completed ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                </div>

                                <div className="flex-1 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/80 space-y-0.5">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <strong className={evt.completed ? "text-white font-serif font-bold" : "text-neutral-400 font-serif"}>
                                      {evt.title}
                                    </strong>
                                    <span className="text-[10px] text-neutral-500">{evt.timestamp}</span>
                                  </div>
                                  <div className="text-[11px] text-gold/90">{evt.location}</div>
                                  <p className="text-[11px] text-neutral-400 leading-relaxed">{evt.details}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}

                    {/* Purchased Items List */}
                    <div className="p-4 sm:p-5 space-y-3">
                      <h4 className="text-[11px] font-mono uppercase text-neutral-400 font-bold tracking-wider">
                        Purchased Artisan Pieces ({ord.items.reduce((acc, i) => acc + i.quantity, 0)} items)
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ord.items.map((item, idx) => (
                          <div key={idx} className="bg-neutral-900 p-3 rounded-xl border border-neutral-800/80 flex gap-3 items-center">
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="w-16 h-16 rounded-lg object-cover bg-black shrink-0 border border-neutral-800"
                            />
                            <div className="flex-1 space-y-1 text-xs font-mono">
                              <strong className="font-serif text-white block text-xs leading-snug">
                                {item.product.name}
                              </strong>
                              <div className="text-[11px] text-gold">
                                Material: {item.selectedMaterial}
                              </div>
                              <div className="text-[10px] text-neutral-400 flex flex-wrap gap-2">
                                <span>Spec: {item.selectedSize.name}</span>
                                {item.selectedHandle && <span>• Handle: {item.selectedHandle}</span>}
                                {item.selectedTapFinish && <span>• Tap: {item.selectedTapFinish}</span>}
                              </div>
                              {item.customEngraving && (
                                <div className="text-[10px] text-emerald-400 italic">
                                  Engraved: "{item.customEngraving}"
                                </div>
                              )}
                              <div className="flex justify-between items-center pt-1 border-t border-neutral-800/60 text-neutral-300 text-[11px]">
                                <span>Qty: {item.quantity}</span>
                                <strong className="text-white font-serif">£{(item.unitPrice * item.quantity).toFixed(2)}</strong>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Recipient & Delivery Location Note */}
                      <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800 text-xs font-mono text-neutral-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gold shrink-0" />
                          <span>
                            <strong>Destination:</strong> {ord.custName}, {ord.custAddress}, {ord.custPostcode} ({ord.deliveryZoneName})
                          </span>
                        </div>
                        {ord.deliveryNotes && (
                          <span className="text-[11px] text-neutral-400 italic">
                            Notes: "{ord.deliveryNotes}"
                          </span>
                        )}
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      ) : (
        /* PRODUCTS GRID */
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-neutral-900/50 rounded-2xl border border-neutral-800 space-y-4 max-w-lg mx-auto">
              <Info className="w-10 h-10 text-gold mx-auto" />
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-white">No items found matching criteria</h3>
                <p className="text-xs text-neutral-400">
                  {searchQuery || selectedMaterialFilter !== "All"
                    ? `No matching products found in "${activeCategory === "all" ? "Entire Collection" : activeCategory}".`
                    : "Try selecting a different category or clearing your material search filter."}
                </p>
              </div>

              {allCategoryMatchCount > 0 && activeCategory !== "all" && (
                <div className="p-3 bg-neutral-800/80 rounded-xl border border-neutral-700 text-xs font-mono text-gold flex items-center justify-between gap-3">
                  <span>Found <strong>{allCategoryMatchCount}</strong> matching items in other categories</span>
                  <button
                    onClick={() => setActiveCategory("all")}
                    className="px-3 py-1.5 bg-gold text-black font-bold rounded-lg hover:bg-amber-400 cursor-pointer text-xs shrink-0"
                  >
                    View All Categories
                  </button>
                </div>
              )}

              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={() => { setActiveCategory("all"); setSearchQuery(""); setSelectedMaterialFilter("All"); }}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-mono font-bold text-xs rounded-xl cursor-pointer border border-neutral-700 transition-all"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => handleOpenProduct(prod, "configure")}
                  className="bg-[#1A1A1A] border border-neutral-800 hover:border-gold/60 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between group shadow-lg cursor-pointer hover:shadow-2xl hover:shadow-gold/5 relative"
                >
                  {/* Image Container */}
                  <div className="relative h-60 overflow-hidden bg-neutral-900">
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    
                    {prod.badge && (
                      <span className="absolute top-3 left-3 bg-gold text-black font-mono font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider shadow-md z-10">
                        {prod.badge}
                      </span>
                    )}

                    <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-neutral-700 text-[10px] font-mono text-gold flex items-center gap-1 z-10">
                      <Star className="w-3 h-3 fill-gold text-gold" />
                      <span>{prod.rating}</span>
                      <span className="text-neutral-400">({prod.reviewCount})</span>
                    </div>

                    <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-neutral-800 text-[10px] font-mono text-neutral-300 z-10">
                      Lead time: {prod.leadTime}
                    </div>

                    {/* Hover Quick Action Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <span className="px-3.5 py-2 bg-gold/90 text-black font-mono font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur-xs transform translate-y-2 group-hover:translate-y-0 transition-transform">
                        <ZoomIn className="w-4 h-4" />
                        <span>View Full Details & Specs</span>
                      </span>
                    </div>
                  </div>

                  {/* Info Container */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-gold font-bold tracking-wider">
                        {prod.categoryLabel}
                      </span>
                      <h3 className="font-serif text-lg font-bold text-white group-hover:text-gold transition-colors leading-snug">
                        {prod.name}
                      </h3>
                      <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                        {prod.shortDesc}
                      </p>
                    </div>

                    {/* Materials & Customization Pills */}
                    <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                      <div className="flex flex-wrap gap-1">
                        {prod.materialOptions.slice(0, 3).map((mat, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-800 text-[9px] font-mono">
                            {mat}
                          </span>
                        ))}
                        {prod.materialOptions.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded bg-neutral-900 text-gold text-[9px] font-mono">
                            +{prod.materialOptions.length - 3} more
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between sm:items-center pt-2 gap-3">
                        <div>
                          <span className="text-[10px] font-mono text-neutral-500 uppercase block">Starting from</span>
                          <span className="text-xl font-serif font-bold text-white">
                            £{prod.basePrice}
                            <span className="text-xs font-sans text-neutral-400 font-normal"> +VAT</span>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {prod.hasKitchenIslandDemo && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIslandDemoProduct(prod);
                              }}
                              className="px-2.5 py-2 bg-amber-500/10 hover:bg-gold text-gold hover:text-black border border-gold/50 rounded-xl font-mono text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="Watch Kitchen Island Placement Video"
                            >
                              <Video className="w-3.5 h-3.5 text-gold group-hover:text-black" />
                              <span className="hidden xl:inline">Island Video</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProduct(prod, "specs");
                            }}
                            className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-xl font-mono text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                            title="View Material & Artisan Details"
                          >
                            <Info className="w-3.5 h-3.5 text-gold" />
                            <span>Specs</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProduct(prod, "configure");
                            }}
                            className="px-3 py-2 bg-neutral-900 hover:bg-gold text-gold hover:text-black border border-gold/40 rounded-xl font-mono text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>Configure</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMPREHENSIVE PRODUCT DETAILS & CONFIGURATION MODAL */}
      {selectedProduct && (() => {
        const galleryImages = getProductGalleryImages(selectedProduct);
        const currentGalleryImg = galleryImages[selectedImageIndex] || galleryImages[0];

        return (
          <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-[#181818] border border-gold/40 rounded-2xl max-w-5xl w-full p-5 sm:p-7 space-y-6 relative shadow-2xl my-6">
              
              {/* Modal Close Button */}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer z-10"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 pr-10 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setProductModalTab("configure")}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    productModalTab === "configure"
                      ? "bg-gold text-black shadow-md"
                      : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>1. Order & Configure</span>
                </button>

                <button
                  onClick={() => setProductModalTab("specs")}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    productModalTab === "specs"
                      ? "bg-gold text-black shadow-md"
                      : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>2. Material Science & Geology</span>
                </button>

                <button
                  onClick={() => setProductModalTab("dimensions")}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    productModalTab === "dimensions"
                      ? "bg-gold text-black shadow-md"
                      : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>3. Dimensions & Weight</span>
                </button>

                <button
                  onClick={() => setProductModalTab("artisan")}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    productModalTab === "artisan"
                      ? "bg-gold text-black shadow-md"
                      : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>4. Artisan Background</span>
                </button>

                {selectedProduct.hasKitchenIslandDemo && (
                  <button
                    onClick={() => setProductModalTab("island-demo")}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
                      productModalTab === "island-demo"
                        ? "bg-gold text-black border-gold shadow-md"
                        : "bg-amber-500/10 text-gold hover:bg-gold/20 border-gold/40"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>🎥 5. Kitchen Island Video Demo</span>
                  </button>
                )}
              </div>

              {/* SHARED GALLERY COLUMN COMPONENT */}
              {/* TAB CONTENT 1: CONFIGURE & ORDER */}
              {productModalTab === "configure" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column: Interactive Image Gallery & Quick Badges */}
                  <div className="md:col-span-5 space-y-3">
                    <div className="h-64 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 relative group shadow-md">
                      <img
                        src={currentGalleryImg.url}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover transition-all duration-300"
                      />
                      <div className="absolute top-2 left-2 bg-black/80 px-2.5 py-1 rounded text-[10px] font-mono text-gold border border-neutral-800 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-gold" />
                        <span>{currentGalleryImg.label}</span>
                      </div>

                      {/* Lightbox Zoom Trigger Button */}
                      <button
                        onClick={() => setIsImageZoomed(true)}
                        className="absolute top-2 right-2 bg-black/80 hover:bg-gold hover:text-black text-white px-2.5 py-1.5 rounded-lg border border-neutral-700 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-mono shadow-md"
                        title="View High-Resolution Lightbox"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Zoom High-Res</span>
                      </button>

                      <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-neutral-800 text-[10px] font-mono text-neutral-300 flex justify-between items-center">
                        <span className="truncate">{currentGalleryImg.title}</span>
                        <span className="text-gold font-bold">{selectedImageIndex + 1} / {galleryImages.length}</span>
                      </div>
                    </div>

                    {/* Gallery Thumbnails Angle Switcher */}
                    <div className="grid grid-cols-4 gap-2">
                      {galleryImages.map((imgItem, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`h-16 rounded-lg overflow-hidden border transition-all relative cursor-pointer ${
                            selectedImageIndex === idx
                              ? "border-gold ring-2 ring-gold/40 opacity-100"
                              : "border-neutral-800 opacity-60 hover:opacity-100 hover:border-neutral-600"
                          }`}
                        >
                          <img
                            src={imgItem.url}
                            alt={imgItem.title}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>

                    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 text-xs space-y-2 font-mono text-neutral-300">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Dimensions:</span>
                        <strong className="text-white">{selectedProduct.dimensions}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Craft Lead Time:</span>
                        <strong className="text-gold">{selectedProduct.leadTime}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Food Safe Wax:</span>
                        <strong className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> BS EN Certified
                        </strong>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-neutral-800/80">
                        <span className="text-neutral-500">Master Mason:</span>
                        <strong className="text-neutral-300">{selectedProduct.artisanMaster?.split('-')[0] || "SMC Master Stonemason"}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setProductModalTab("specs")}
                        className="py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-xl font-mono text-[11px] text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-gold" />
                        <span>Material Data</span>
                      </button>
                      <button
                        onClick={() => setProductModalTab("dimensions")}
                        className="py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-xl font-mono text-[11px] text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Ruler className="w-3.5 h-3.5 text-gold" />
                        <span>Dimensions</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Customization Controls */}
                  <div className="md:col-span-7 space-y-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-gold font-bold tracking-widest block">
                        {selectedProduct.categoryLabel}
                      </span>
                      <h3 className="font-serif text-2xl font-bold text-white">
                        {selectedProduct.name}
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                        {selectedProduct.description}
                      </p>
                    </div>

                    {/* Material Choice */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-neutral-300 font-bold block">
                        1. Select Stone Material Variety:
                      </label>
                      <select
                        value={selectedMaterial}
                        onChange={(e) => setSelectedMaterial(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-gold"
                      >
                        {selectedProduct.materialOptions.map((mat, idx) => (
                          <option key={idx} value={mat}>
                            {mat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Handle Finish (If Coffee Tray) */}
                    {selectedProduct.handleOptions && selectedProduct.handleOptions.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono text-neutral-300 font-bold block">
                          2. Select Handle Metal Finish:
                        </label>
                        <select
                          value={selectedHandle}
                          onChange={(e) => setSelectedHandle(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-gold"
                        >
                          {selectedProduct.handleOptions.map((handle, idx) => (
                            <option key={idx} value={handle}>
                              {handle}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Tap Finish (If Sinks & Taps) */}
                    {selectedProduct.tapFinishOptions && selectedProduct.tapFinishOptions.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono text-neutral-300 font-bold block">
                          2. Select Designer Tap Finish:
                        </label>
                        <select
                          value={selectedTapFinish}
                          onChange={(e) => setSelectedTapFinish(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-gold"
                        >
                          {selectedProduct.tapFinishOptions.map((tap, idx) => (
                            <option key={idx} value={tap}>
                              {tap}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Size / Specs Choice */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-neutral-300 font-bold block">
                        3. Select Specification & Size:
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedProduct.sizeOptions.map((sObj, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => setSelectedSizeIndex(sIdx)}
                            className={`p-2.5 rounded-xl border text-left text-xs font-mono transition-all flex justify-between items-center cursor-pointer ${
                              selectedSizeIndex === sIdx
                                ? "bg-gold/15 border-gold text-white font-bold"
                                : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                            }`}
                          >
                            <span>{sObj.name}</span>
                            <span className="text-gold font-bold">
                              {sObj.priceDelta === 0 ? "Included" : `+£${sObj.priceDelta}`}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Laser Monogram / Engraving */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-neutral-300 font-bold flex justify-between">
                        <span>4. Custom Laser Monogram (Optional):</span>
                        <span className="text-[10px] text-emerald-400 font-normal">Free Laser Inscription</span>
                      </label>
                      <input
                        type="text"
                        value={customEngraving}
                        onChange={(e) => setCustomEngraving(e.target.value)}
                        placeholder="e.g. 'The Vance Estate' or 'A & M 2026'"
                        maxLength={35}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-gold placeholder-neutral-600"
                      />
                    </div>

                    {/* Quantity & Add to Cart Action */}
                    <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-sm font-bold w-8 text-center">{quantity}</span>
                        <button
                          onClick={() => setQuantity((q) => q + 1)}
                          className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono text-neutral-500 uppercase block">Total Configured Price</span>
                        <span className="text-xl font-serif font-bold text-gold">
                          £{(selectedProduct.basePrice + selectedProduct.sizeOptions[selectedSizeIndex].priceDelta) * quantity}
                          <span className="text-xs text-neutral-400 font-sans font-normal"> +VAT</span>
                        </span>
                      </div>

                      <button
                        onClick={handleAddToCart}
                        className="px-6 py-3 bg-gold hover:bg-amber-400 text-black font-serif font-bold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 2: GEOLOGICAL MATERIAL SCIENCE */}
              {productModalTab === "specs" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column: Gallery Showcase */}
                  <div className="md:col-span-5 space-y-3">
                    <div className="h-64 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 relative group shadow-md">
                      <img
                        src={currentGalleryImg.url}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover transition-all duration-300"
                      />
                      <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded text-[10px] font-mono text-gold border border-neutral-800">
                        Geological Master Piece
                      </div>
                      <button
                        onClick={() => setIsImageZoomed(true)}
                        className="absolute top-2 right-2 bg-black/80 hover:bg-gold hover:text-black text-white px-2.5 py-1.5 rounded-lg border border-neutral-700 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-mono shadow-md"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Zoom</span>
                      </button>
                    </div>

                    {/* Gallery Thumbnails */}
                    <div className="grid grid-cols-4 gap-2">
                      {galleryImages.map((imgItem, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`h-16 rounded-lg overflow-hidden border transition-all relative cursor-pointer ${
                            selectedImageIndex === idx
                              ? "border-gold ring-2 ring-gold/40 opacity-100"
                              : "border-neutral-800 opacity-60 hover:opacity-100 hover:border-neutral-600"
                          }`}
                        >
                          <img
                            src={imgItem.url}
                            alt={imgItem.title}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>

                    {/* Physical Properties Box */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2.5">
                      <h4 className="text-xs font-mono uppercase text-gold font-bold flex items-center gap-1.5 border-b border-neutral-800 pb-2">
                        <Sparkles className="w-3.5 h-3.5" /> Geological Stone Metrics
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-neutral-950 p-2 rounded border border-neutral-800/80">
                          <span className="text-[10px] text-neutral-500 block">Quarry Origin</span>
                          <strong className="text-white text-[11px]">{selectedProduct.origin || "Carrara, Italy"}</strong>
                        </div>
                        <div className="bg-neutral-950 p-2 rounded border border-neutral-800/80">
                          <span className="text-[10px] text-neutral-500 block">Mohs Hardness</span>
                          <strong className="text-gold text-[11px]">{selectedProduct.hardnessRating || "Mohs 3.8 - 4.0"}</strong>
                        </div>
                        <div className="bg-neutral-950 p-2 rounded border border-neutral-800/80">
                          <span className="text-[10px] text-neutral-500 block">Compressive Density</span>
                          <strong className="text-white text-[11px]">{selectedProduct.density || "2,710 kg/m³"}</strong>
                        </div>
                        <div className="bg-neutral-950 p-2 rounded border border-neutral-800/80">
                          <span className="text-[10px] text-neutral-500 block">Piece Weight</span>
                          <strong className="text-white text-[11px]">{selectedProduct.weight || "3.8 kg"}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Detailed Technical Specification */}
                  <div className="md:col-span-7 space-y-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-gold font-bold tracking-widest block">
                        Material Specification & Science
                      </span>
                      <h3 className="font-serif text-xl font-bold text-white">
                        {selectedProduct.name}
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1">
                        Exact geological composition, surface seal technology, and care instructions.
                      </p>
                    </div>

                    {/* Available Stone Varieties in this Piece */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-neutral-300 font-bold block">
                        Compatible Natural Stone & Finish Options:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProduct.materialOptions.map((mat, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs font-mono rounded-lg flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3 text-gold" />
                            {mat}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Key Craft Features */}
                    {selectedProduct.keyFeatures && selectedProduct.keyFeatures.length > 0 && (
                      <div className="space-y-2 bg-neutral-900/60 border border-neutral-800 p-3.5 rounded-xl">
                        <h4 className="text-xs font-mono uppercase text-gold font-bold flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> Key Architectural & Functional Features
                        </h4>
                        <ul className="space-y-1.5">
                          {selectedProduct.keyFeatures.map((feature, fIdx) => (
                            <li key={fIdx} className="text-xs text-neutral-300 font-mono flex items-start gap-2">
                              <span className="text-gold font-bold">•</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Food Safety & Barrier Protection */}
                    <div className="bg-emerald-950/20 border border-emerald-800/40 p-3.5 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-mono font-bold text-emerald-300 uppercase">
                          Surface Sealer Barrier & Food Safety Standard
                        </h4>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                        Treated with hydrophobic organic nano-wax. Fully safe for direct food contact (BS EN 1186 certified). Repels citrus oils, vinegar, red wine, and coffee.
                      </p>
                    </div>

                    {/* Care Instructions */}
                    <div className="bg-neutral-900 p-3.5 rounded-xl border border-neutral-800 space-y-1">
                      <h4 className="text-xs font-mono font-bold text-gold uppercase">
                        Care & Maintenance Recommendations
                      </h4>
                      <p className="text-xs text-neutral-300 font-mono leading-relaxed">
                        {selectedProduct.careInstructions || "Rinse with warm water and neutral detergent. Avoid acid-based cleansers."}
                      </p>
                    </div>

                    {/* Action to switch to configure tab */}
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setProductModalTab("configure")}
                        className="px-5 py-2.5 bg-gold hover:bg-amber-400 text-black font-mono text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Proceed to Order & Customize</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 3: FULL DIMENSIONS & WEIGHT */}
              {productModalTab === "dimensions" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column: Gallery */}
                  <div className="md:col-span-5 space-y-3">
                    <div className="h-64 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 relative group shadow-md">
                      <img
                        src={currentGalleryImg.url}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover transition-all duration-300"
                      />
                      <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded text-[10px] font-mono text-gold border border-neutral-800">
                        Dimensional Blueprint
                      </div>
                      <button
                        onClick={() => setIsImageZoomed(true)}
                        className="absolute top-2 right-2 bg-black/80 hover:bg-gold hover:text-black text-white px-2.5 py-1.5 rounded-lg border border-neutral-700 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-mono shadow-md"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Zoom</span>
                      </button>
                    </div>

                    {/* Gallery Thumbnails */}
                    <div className="grid grid-cols-4 gap-2">
                      {galleryImages.map((imgItem, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`h-16 rounded-lg overflow-hidden border transition-all relative cursor-pointer ${
                            selectedImageIndex === idx
                              ? "border-gold ring-2 ring-gold/40 opacity-100"
                              : "border-neutral-800 opacity-60 hover:opacity-100 hover:border-neutral-600"
                          }`}
                        >
                          <img
                            src={imgItem.url}
                            alt={imgItem.title}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Architectural Dimensions & Packaging */}
                  <div className="md:col-span-7 space-y-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-gold font-bold tracking-widest block">
                        Precision Engineering Specs
                      </span>
                      <h3 className="font-serif text-xl font-bold text-white">
                        Full Dimensions, Weight & Packaging
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                        SMC stone components are tolerance-checked to ±0.2mm to guarantee flawless integration into luxury kitchens, vanities, and display shelving.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                      <div className="bg-neutral-900 p-3.5 rounded-xl border border-neutral-800 space-y-1">
                        <span className="text-[10px] text-neutral-500 uppercase block">Product Dimensions</span>
                        <strong className="text-gold text-sm block">{selectedProduct.dimensions}</strong>
                        <p className="text-[10px] text-neutral-400">Length x Width x Height / Thickness</p>
                      </div>

                      <div className="bg-neutral-900 p-3.5 rounded-xl border border-neutral-800 space-y-1">
                        <span className="text-[10px] text-neutral-500 uppercase block">Net Piece Weight</span>
                        <strong className="text-white text-sm block">{selectedProduct.weight || "4.8 kg"}</strong>
                        <p className="text-[10px] text-neutral-400">Solid natural stone mass</p>
                      </div>

                      <div className="bg-neutral-900 p-3.5 rounded-xl border border-neutral-800 space-y-1">
                        <span className="text-[10px] text-neutral-500 uppercase block">Edge Profile & Chamfer</span>
                        <strong className="text-white text-sm block">45° Micro-Bevel</strong>
                        <p className="text-[10px] text-neutral-400">Hand-finished anti-chip bevel</p>
                      </div>

                      <div className="bg-neutral-900 p-3.5 rounded-xl border border-neutral-800 space-y-1">
                        <span className="text-[10px] text-neutral-500 uppercase block">Packaged Transit Weight</span>
                        <strong className="text-emerald-400 text-sm block">
                          {(parseFloat(selectedProduct.weight || "4.8") + 1.4).toFixed(1)} kg in Timber Crate
                        </strong>
                        <p className="text-[10px] text-neutral-400">Shock-absorbing foam padded box</p>
                      </div>
                    </div>

                    {/* Shipping & Handling */}
                    <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-xl space-y-2 text-xs font-mono">
                      <h4 className="font-bold text-gold uppercase flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-gold" /> White-Glove Transit & Lead Times
                      </h4>
                      <ul className="space-y-1 text-neutral-300 text-[11px]">
                        <li>• Shipped in reinforced foam-lined timber or heavy corrugated crates.</li>
                        <li>• Full courier transit insurance included on all stone deliveries.</li>
                        <li>• Atelier dispatch lead time: <strong className="text-gold">{selectedProduct.leadTime}</strong>.</li>
                      </ul>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setProductModalTab("configure")}
                        className="px-5 py-2.5 bg-gold hover:bg-amber-400 text-black font-mono text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Configure & Order This Piece</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 4: ARTISAN STONEMASONRY */}
              {productModalTab === "artisan" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column: Workshop Badge & Gallery */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="h-56 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 relative">
                      <img
                        src={currentGalleryImg.url}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                      <div className="absolute bottom-3 left-3 right-3 text-white space-y-0.5">
                        <span className="text-[10px] font-mono text-gold uppercase font-bold tracking-wider block">
                          Master Artisan Atelier
                        </span>
                        <p className="font-serif font-bold text-sm">
                          {selectedProduct.artisanMaster || "SMC Master Stonemason"}
                        </p>
                      </div>
                      <button
                        onClick={() => setIsImageZoomed(true)}
                        className="absolute top-2 right-2 bg-black/80 hover:bg-gold hover:text-black text-white px-2.5 py-1 rounded-lg border border-neutral-700 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Zoom</span>
                      </button>
                    </div>

                    {/* Gallery Thumbnails */}
                    <div className="grid grid-cols-4 gap-2">
                      {galleryImages.map((imgItem, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`h-14 rounded-lg overflow-hidden border transition-all relative cursor-pointer ${
                            selectedImageIndex === idx
                              ? "border-gold ring-2 ring-gold/40 opacity-100"
                              : "border-neutral-800 opacity-60 hover:opacity-100 hover:border-neutral-600"
                          }`}
                        >
                          <img
                            src={imgItem.url}
                            alt={imgItem.title}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2 font-mono text-xs text-neutral-300">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-neutral-500 block uppercase">Atelier Workshop</span>
                          <strong className="text-white">{selectedProduct.artisanWorkshop || "SMC Battersea Stone Studio, London SW8"}</strong>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 pt-2 border-t border-neutral-800">
                        <Clock className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-neutral-500 block uppercase">Crafting Time</span>
                          <strong className="text-gold">{selectedProduct.leadTime}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Handcrafting Narrative & Workflow */}
                  <div className="md:col-span-7 space-y-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-gold font-bold tracking-widest block">
                        British Master Stonemasonry
                      </span>
                      <h3 className="font-serif text-xl font-bold text-white">
                        Crafting Technique & Provenance
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                        {selectedProduct.craftingTechnique || "Hand-selected natural marble block milled with high-precision 5-axis waterjet and hand-chamfered by senior masons."}
                      </p>
                    </div>

                    {/* 4-Step Crafting Workflow */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-mono uppercase text-gold font-bold">
                        The SMC 4-Stage Handcrafting Process:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
                          <div className="flex items-center gap-1.5 text-gold font-bold">
                            <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px]">1</span>
                            <span>Grain Selection</span>
                          </div>
                          <p className="text-[11px] text-neutral-400">Hand-selected raw slabs inspected for optimal vein continuity & structural density.</p>
                        </div>

                        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
                          <div className="flex items-center gap-1.5 text-gold font-bold">
                            <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px]">2</span>
                            <span>Precision Miter CNC</span>
                          </div>
                          <p className="text-[11px] text-neutral-400">High-pressure diamond waterjet contour milling down to ±0.2mm tolerance.</p>
                        </div>

                        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
                          <div className="flex items-center gap-1.5 text-gold font-bold">
                            <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px]">3</span>
                            <span>45° Edge Chamfer</span>
                          </div>
                          <p className="text-[11px] text-neutral-400">Hand-beveled edge profiles and seamless corner joinery by master craftsmen.</p>
                        </div>

                        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
                          <div className="flex items-center gap-1.5 text-gold font-bold">
                            <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px]">4</span>
                            <span>Diamond Buff & Seal</span>
                          </div>
                          <p className="text-[11px] text-neutral-400">5-stage grit diamond polishing & organic food-safe silane wax coating.</p>
                        </div>
                      </div>
                    </div>

                    {/* Certificate of Authenticity Stamp */}
                    <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-black p-3.5 rounded-xl border border-gold/30 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Award className="w-8 h-8 text-gold shrink-0" />
                        <div>
                          <h5 className="font-serif font-bold text-xs text-white">Certificate of Authenticity & Provenance</h5>
                          <p className="text-[10px] font-mono text-neutral-400">Stamped with unique SMC batch serial number and mason signature upon delivery.</p>
                        </div>
                      </div>
                    </div>

                    {/* Action to switch to configure tab */}
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setProductModalTab("configure")}
                        className="px-5 py-2.5 bg-gold hover:bg-amber-400 text-black font-mono text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Configure & Order This Piece</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 5: KITCHEN ISLAND VIDEO & PLACEMENT DEMO */}
              {productModalTab === "island-demo" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column: 4K Studio Video Reel & Controls */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="relative rounded-2xl overflow-hidden bg-neutral-950 border border-gold/40 h-72 sm:h-80 group shadow-xl">
                      <video
                        src={selectedProduct.videoUrl || "https://assets.mixkit.co/videos/preview/mixkit-chef-cutting-fresh-vegetables-on-a-wooden-board-43187-large.mp4"}
                        autoPlay={isPlayingIslandVideo}
                        loop
                        muted={isIslandVideoMuted}
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-mono text-gold border border-gold/40 flex items-center gap-1.5 shadow-md">
                        <Video className="w-3.5 h-3.5 text-gold" />
                        <span>4K Studio Kitchen Island Placement Reel</span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 bg-black/80 backdrop-blur-md p-2.5 rounded-xl border border-neutral-800 flex items-center justify-between text-xs font-mono text-white">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsPlayingIslandVideo(!isPlayingIslandVideo)}
                            className="p-2 bg-gold text-black hover:bg-amber-400 rounded-lg cursor-pointer transition-all font-bold"
                            title={isPlayingIslandVideo ? "Pause Reel" : "Play Reel"}
                          >
                            {isPlayingIslandVideo ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black ml-0.5" />}
                          </button>
                          <button
                            onClick={() => setIsIslandVideoMuted(!isIslandVideoMuted)}
                            className="p-2 bg-neutral-800 text-white hover:text-gold rounded-lg cursor-pointer transition-all"
                            title={isIslandVideoMuted ? "Unmute Audio" : "Mute Audio"}
                          >
                            {isIslandVideoMuted ? <VolumeX className="w-3.5 h-3.5 text-neutral-400" /> : <Volume2 className="w-3.5 h-3.5 text-gold" />}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-400">Natural Light 5500K</span>
                          <span className="text-[10px] text-gold font-bold">Island Surface Studio</span>
                        </div>
                      </div>
                    </div>

                    {/* Styling Notes */}
                    {selectedProduct.islandStylingNotes && selectedProduct.islandStylingNotes.length > 0 && (
                      <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-xl space-y-2 text-xs font-mono">
                        <h4 className="font-bold text-gold uppercase flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-gold" /> Architectural Island Styling Guidelines:
                        </h4>
                        <ul className="space-y-1.5 text-neutral-300 text-[11px]">
                          {selectedProduct.islandStylingNotes.map((note, nIdx) => (
                            <li key={nIdx} className="flex items-start gap-2">
                              <span className="text-gold font-bold">•</span>
                              <span>{note}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Persuasive Client Value Points & Quick Order */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-xl space-y-3">
                      <h4 className="text-xs font-mono uppercase text-gold font-bold flex items-center gap-1.5">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Why Clients Choose This Board for Islands:</span>
                      </h4>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 space-y-0.5">
                          <strong className="text-white block flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>1. Protects £10k+ Island Quartz & Marble</span>
                          </strong>
                          <span className="text-[11px] text-neutral-400 leading-relaxed block">Shields worktops against citrus etching, knife gouges, and hot cookware.</span>
                        </div>
                        <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 space-y-0.5">
                          <strong className="text-white block flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-gold" />
                            <span>2. Visual Focal Centerpiece</span>
                          </strong>
                          <span className="text-[11px] text-neutral-400 leading-relaxed block">Creates a high-contrast natural stone focal point on plain island counters.</span>
                        </div>
                        <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 space-y-0.5">
                          <strong className="text-white block flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-amber-400" />
                            <span>3. Acoustic Shock Absorption</span>
                          </strong>
                          <span className="text-[11px] text-neutral-400 leading-relaxed block">Heavy stone mass dampens chopping knife noise into a satisfying luxury thud.</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        onClick={() => setProductModalTab("configure")}
                        className="w-full py-3 bg-gold hover:bg-amber-400 text-black font-mono text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Configure & Order This Piece (£{selectedProduct.basePrice})</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* KITCHEN ISLAND VIDEO & PERSUASIVE STAGING DEMO MODAL */}
      {islandDemoProduct && (() => {
        const surfaces = [
          {
            id: "calacatta",
            name: "Calacatta Gold Marble Island",
            desc: "High-contrast white marble island with warm gold veining. Creates a seamless tone-on-tone marble aesthetic with non-scratch padded feet.",
            image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80",
            badge: "Classical Luxury"
          },
          {
            id: "walnut",
            name: "American Smoked Walnut Island",
            desc: "Rich dark timber waterfall island counter. White marble chopping board creates an arresting contrast and shields wood from acidic fruit and knife gouges.",
            image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
            badge: "Warm Contemporary"
          },
          {
            id: "steel",
            name: "Stainless Steel Chef's Island",
            desc: "Industrial brushed stainless chef island. The solid stone mass softens metallic echo and provides a thermal prep surface.",
            image: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=1200&q=80",
            badge: "Professional Chef"
          },
          {
            id: "charcoal",
            name: "Matt Charcoal Quartz Island",
            desc: "Contemporary deep charcoal quartz or slate island. White/Gold marble boards deliver dramatic visual pop and prevent quartz knife dulling.",
            image: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=80",
            badge: "Minimalist Dark"
          },
          {
            id: "travertine",
            name: "Honed Navona Travertine Island",
            desc: "Organic beige travertine island. Harmonizes with earthy stone tones while offering a sealed, food-safe prep zone.",
            image: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80",
            badge: "Mediterranean Earth"
          }
        ];

        const activeSurfaceObj = surfaces.find(s => s.id === selectedIslandSurface) || surfaces[0];
        const sampleVideoUrl = islandDemoProduct.videoUrl || "https://assets.mixkit.co/videos/preview/mixkit-chef-cutting-fresh-vegetables-on-a-wooden-board-43187-large.mp4";

        return (
          <div className="fixed inset-0 z-[130] bg-black/90 backdrop-blur-lg flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-[#141414] border border-gold/50 rounded-2xl max-w-6xl w-full p-5 sm:p-8 space-y-6 relative shadow-2xl my-6">
              
              {/* Modal Close Button */}
              <button
                onClick={() => setIslandDemoProduct(null)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-neutral-900 hover:bg-gold hover:text-black text-neutral-400 transition-colors cursor-pointer z-20 shadow-lg border border-neutral-800"
                aria-label="Close demo studio"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Title Banner */}
              <div className="space-y-1.5 pr-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-gold/15 text-gold border border-gold/40 uppercase tracking-widest">
                  <Video className="w-3.5 h-3.5 text-gold" />
                  <span>Interactive Kitchen Island Staging & Video Demo</span>
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight flex flex-wrap items-center gap-3">
                  <span>{islandDemoProduct.name} on Kitchen Island</span>
                  <span className="text-sm font-sans font-normal text-gold bg-black/80 px-3 py-1 rounded-xl border border-gold/30">
                    Persuasive Client Buyer Preview
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-3xl leading-relaxed">
                  Demonstrates how this solid stone board protects £10,000+ island countertops while serving as a Michelin-caliber focal centerpiece during client hosting.
                </p>
              </div>

              {/* MAIN CONTENT GRID: VIDEO PLAYER & SURFACE STAGING CANVAS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT 7 COLS: VIDEO PLAYER & LIGHTING CONTROLS */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="relative rounded-2xl overflow-hidden bg-neutral-950 border border-gold/40 shadow-2xl group">
                    
                    {/* VIDEO CONTAINER / STAGING IMAGE WITH LIGHTING OVERLAY */}
                    <div className={`relative h-72 sm:h-96 w-full overflow-hidden transition-all duration-500 ${
                      islandLightingMode === "daylight" 
                        ? "brightness-105 contrast-100" 
                        : islandLightingMode === "evening" 
                        ? "brightness-90 sepia-[0.15] hue-rotate-[10deg] contrast-105" 
                        : "brightness-95 contrast-125"
                    }`}>
                      
                      {/* Video Player */}
                      <video
                        src={sampleVideoUrl}
                        autoPlay={isPlayingIslandVideo}
                        loop
                        muted={isIslandVideoMuted}
                        playsInline
                        className="w-full h-full object-cover"
                        poster={activeSurfaceObj.image}
                      />

                      {/* STAGED OVERLAY BADGES */}
                      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 z-10">
                        <span className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-lg border border-gold/40 text-[10px] font-mono font-bold text-gold flex items-center gap-1.5 shadow-md">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                          <span>4K STUDIO LIVE REEL</span>
                        </span>
                        <span className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-neutral-700 text-[10px] font-mono text-white">
                          Surface: {activeSurfaceObj.name}
                        </span>
                      </div>

                      {/* LIGHTING AMBIANCE BADGE */}
                      <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-neutral-700 text-[10px] font-mono text-amber-300 flex items-center gap-1.5 z-10">
                        {islandLightingMode === "daylight" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-amber-300" />}
                        <span className="capitalize">{islandLightingMode} Mode</span>
                      </div>

                      {/* VIDEO PLAYER CONTROLS OVERLAY */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 flex items-center justify-between gap-3 z-10">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsPlayingIslandVideo(!isPlayingIslandVideo)}
                            className="p-2.5 rounded-xl bg-gold text-black hover:bg-amber-400 font-bold transition-all cursor-pointer shadow-lg"
                            title={isPlayingIslandVideo ? "Pause Reel" : "Play Reel"}
                          >
                            {isPlayingIslandVideo ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
                          </button>

                          <button
                            onClick={() => setIsIslandVideoMuted(!isIslandVideoMuted)}
                            className="p-2.5 rounded-xl bg-neutral-900/90 text-white hover:text-gold border border-neutral-700 transition-all cursor-pointer"
                            title={isIslandVideoMuted ? "Unmute Audio" : "Mute Audio"}
                          >
                            {isIslandVideoMuted ? <VolumeX className="w-4 h-4 text-neutral-400" /> : <Volume2 className="w-4 h-4 text-gold" />}
                          </button>
                        </div>

                        {/* Scrub Bar Mock */}
                        <div className="flex-1 max-w-xs hidden sm:block space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                            <span>SMC Studio Reel</span>
                            <span className="text-gold font-bold">0:24 / 0:45</span>
                          </div>
                          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-gold h-full w-3/5 rounded-full" />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-neutral-400 hidden sm:inline">60fps UltraHD</span>
                        </div>
                      </div>
                    </div>

                    {/* LIGHTING ENVIRONMENT SWITCHER BAR */}
                    <div className="p-3 bg-neutral-900/90 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                      <span className="text-neutral-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-gold" />
                        <span>Kitchen Ambiance Lighting:</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setIslandLightingMode("daylight")}
                          className={`px-3 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                            islandLightingMode === "daylight"
                              ? "bg-amber-400 text-black font-bold shadow-md"
                              : "bg-neutral-800 text-neutral-300 hover:text-white"
                          }`}
                        >
                          <Sun className="w-3 h-3" />
                          <span>Daylight 5500K</span>
                        </button>
                        <button
                          onClick={() => setIslandLightingMode("evening")}
                          className={`px-3 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                            islandLightingMode === "evening"
                              ? "bg-amber-500 text-black font-bold shadow-md"
                              : "bg-neutral-800 text-neutral-300 hover:text-white"
                          }`}
                        >
                          <Moon className="w-3 h-3" />
                          <span>Evening Pendant</span>
                        </button>
                        <button
                          onClick={() => setIslandLightingMode("spotlight")}
                          className={`px-3 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                            islandLightingMode === "spotlight"
                              ? "bg-gold text-black font-bold shadow-md"
                              : "bg-neutral-800 text-neutral-300 hover:text-white"
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Gallery Spotlight</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* BEFORE vs AFTER STAGING COMPARISON SWITCHER */}
                  <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-mono font-bold text-gold uppercase flex items-center gap-2">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Interactive Visual Staging Impact</span>
                      </h4>
                      <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-mono">
                        <button
                          onClick={() => setIsBeforeAfterStaged(false)}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            !isBeforeAfterStaged ? "bg-neutral-800 text-white font-bold" : "text-neutral-500 hover:text-neutral-300"
                          }`}
                        >
                          Bare Island
                        </button>
                        <button
                          onClick={() => setIsBeforeAfterStaged(true)}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            isBeforeAfterStaged ? "bg-gold text-black font-bold shadow-md" : "text-neutral-500 hover:text-neutral-300"
                          }`}
                        >
                          ✨ Staged with SMC Board
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                      {isBeforeAfterStaged ? (
                        <span className="text-emerald-300 font-medium">
                          <strong>STAGED EFFECT:</strong> The natural stone veining, hand-beveled 45° brass-accented edge, and organic mass turns an empty countertop into an inviting focal point for culinary entertaining.
                        </span>
                      ) : (
                        <span className="text-amber-300 font-medium">
                          <strong>UNSTAGED EFFECT:</strong> Large kitchen island worktops without stone styling look flat, cold, and lack architectural definition during client open houses.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* RIGHT 5 COLS: COUNTERTOP SURFACE SELECTOR & PERSUASIVE BUYER MOTIVATORS */}
                <div className="lg:col-span-5 space-y-5">
                  
                  {/* 1. SELECT KITCHEN ISLAND SURFACE */}
                  <div className="space-y-3 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-mono uppercase text-gold font-bold flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-gold" /> Select Your Kitchen Island Worktop:
                      </label>
                      <span className="text-[10px] font-mono text-neutral-400">{surfaces.length} Options</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {surfaces.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedIslandSurface(s.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                            selectedIslandSurface === s.id
                              ? "bg-gold/15 border-gold ring-1 ring-gold/40 text-white"
                              : "bg-neutral-950/70 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-neutral-700">
                            <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="overflow-hidden">
                            <span className="text-xs font-serif font-bold block truncate text-white">{s.name}</span>
                            <span className="text-[9px] font-mono text-gold block">{s.badge}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 text-xs text-neutral-300 font-mono space-y-1">
                      <div className="text-gold font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Styling Compatibility Note:</span>
                      </div>
                      <p className="text-[11px] text-neutral-300 leading-relaxed">
                        {activeSurfaceObj.desc}
                      </p>
                    </div>
                  </div>

                  {/* 2. 4 STRATEGIC BUYER PERSUASION POINTS */}
                  <div className="space-y-2 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4">
                    <h3 className="text-xs font-mono uppercase text-gold font-bold flex items-center gap-1.5">
                      <ThumbsUp className="w-4 h-4 text-gold" />
                      <span>Why Luxury Clients Purchase This Piece:</span>
                    </h3>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-1">
                        <div className="text-white font-bold flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>1. Island Countertop Armor</span>
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-relaxed">
                          Shields £10,000+ custom marble/quartz surfaces from wine etching, acidic citrus oils, and knife gouges.
                        </p>
                      </div>

                      <div className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-1">
                        <div className="text-white font-bold flex items-center gap-2">
                          <Award className="w-4 h-4 text-gold shrink-0" />
                          <span>2. Acoustic Shock Deadening</span>
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-relaxed">
                          Solid 4.8kg stone density dampens chopping impact sounds into a muted, luxury acoustic thud.
                        </p>
                      </div>

                      <div className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-1">
                        <div className="text-white font-bold flex items-center gap-2">
                          <Utensils className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>3. Dual-Temp Hosting Stage</span>
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-relaxed">
                          Chilled stone keeps oysters, cheeses, & charcuterie cold during dinner parties while accepting hot pots up to 250°C.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3. DIRECT PURCHASE ACTIONS */}
                  <div className="bg-gradient-to-br from-neutral-900 via-black to-neutral-900 border border-gold/50 rounded-2xl p-4 space-y-3 shadow-xl">
                    <div className="flex justify-between items-baseline">
                      <div>
                        <span className="text-[10px] font-mono text-neutral-400 uppercase block">Single Board Price</span>
                        <span className="text-2xl font-serif font-bold text-white">£{islandDemoProduct.basePrice} <span className="text-xs text-neutral-400 font-sans">+VAT</span></span>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-lg text-[10px] font-mono font-bold">In Stock • 2-3 Day Transit</span>
                    </div>

                    <div className="space-y-2">
                      {/* ADD SINGLE BOARD TO CART */}
                      <button
                        onClick={() => {
                          handleDirectAddToCart(islandDemoProduct, islandDemoProduct.materialOptions[0] || "Calacatta Viola", islandDemoProduct.sizeOptions[0]);
                          setIslandDemoProduct(null);
                          setIsCartOpen(true);
                        }}
                        className="w-full py-3 bg-gold hover:bg-amber-400 text-black font-mono text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                      >
                        <ShoppingCart className="w-4 h-4 fill-black" />
                        <span>Add Chopping Board to Cart (£{islandDemoProduct.basePrice})</span>
                      </button>

                      {/* ADD COMPLETE KITCHEN ISLAND BUNDLE */}
                      <button
                        onClick={() => {
                          // Add board
                          handleDirectAddToCart(islandDemoProduct, islandDemoProduct.materialOptions[0] || "Calacatta Viola", islandDemoProduct.sizeOptions[0]);
                          // Add coasters if available
                          const coasters = CATALOG_PRODUCTS.find(p => p.id === "prod-cd-03");
                          if (coasters) {
                            handleDirectAddToCart(coasters, coasters.materialOptions[0] || "Arabescato Corchia", coasters.sizeOptions[0]);
                          }
                          setIslandDemoProduct(null);
                          setIsCartOpen(true);
                        }}
                        className="w-full py-3 bg-gradient-to-r from-amber-500/20 via-neutral-900 to-amber-500/10 hover:from-gold hover:to-amber-400 text-gold hover:text-black border border-gold/60 font-mono text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Add Complete Island Bundle (£255 — Save 15%)</span>
                      </button>
                    </div>

                    <p className="text-[10px] font-mono text-center text-neutral-400">
                      ⚡ Includes free white-glove padded transit packaging & organic care wax kit.
                    </p>
                  </div>

                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* LIGHTBOX HIGH-RES IMAGE ZOOM OVERLAY */}
      {isImageZoomed && selectedProduct && (() => {
        const galleryImages = getProductGalleryImages(selectedProduct);
        const currentGalleryImg = galleryImages[selectedImageIndex] || galleryImages[0];
        return (
          <div className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
              <button
                onClick={() => setIsImageZoomed(false)}
                className="absolute -top-12 right-0 p-2.5 rounded-full bg-neutral-900 hover:bg-gold hover:text-black text-white border border-neutral-700 transition-colors cursor-pointer shadow-xl z-20"
                aria-label="Close high-res view"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="relative rounded-2xl overflow-hidden border border-gold/40 shadow-2xl bg-neutral-950 max-h-[80vh] flex items-center justify-center">
                <img
                  src={currentGalleryImg.url}
                  alt={selectedProduct.name}
                  className="max-h-[78vh] w-auto object-contain"
                />
              </div>
              <div className="mt-4 text-center space-y-1">
                <h4 className="font-serif text-lg font-bold text-white">{selectedProduct.name}</h4>
                <p className="text-xs font-mono text-gold flex items-center justify-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{currentGalleryImg.title} — High Resolution Atelier Imagery</span>
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SHOPPING CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[130] flex justify-end bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#181818] border-l border-neutral-800 h-full flex flex-col justify-between shadow-2xl p-6 relative">
            
            {/* Cart Header */}
            <div className="flex justify-between items-center pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-gold" />
                <h3 className="font-serif text-xl font-bold text-white">Artisan Shopping Cart</h3>
              </div>
              <div className="flex items-center gap-2">
                {cartItems.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-[10px] font-mono text-red-400 hover:text-red-300 bg-red-950/30 border border-red-900/50 px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Empty
                  </button>
                )}
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
              {cartItems.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <ShoppingBag className="w-12 h-12 text-neutral-600 mx-auto" />
                  <p className="text-sm font-serif text-neutral-400">Your artisan shopping cart is currently empty.</p>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto">Browse our chopping boards, coffee trays, coasters, and custom sinks to add handcrafted stone pieces.</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.cartId} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 space-y-2 relative">
                    <div className="flex gap-3">
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-16 h-16 rounded-lg object-cover bg-black shrink-0"
                      />
                      <div className="flex-1 space-y-1">
                        <h4 className="font-serif text-xs font-bold text-white leading-tight">
                          {item.product.name}
                        </h4>
                        <div className="text-[10px] font-mono text-gold">
                          Material: {item.selectedMaterial}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400">
                          Spec: {item.selectedSize.name}
                        </div>
                        {item.selectedHandle && (
                          <div className="text-[10px] font-mono text-neutral-400">
                            Handle: {item.selectedHandle}
                          </div>
                        )}
                        {item.selectedTapFinish && (
                          <div className="text-[10px] font-mono text-neutral-400">
                            Tap Finish: {item.selectedTapFinish}
                          </div>
                        )}
                        {item.customEngraving && (
                          <div className="text-[10px] font-mono text-emerald-400 italic">
                            Engraving: "{item.customEngraving}"
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleUpdateCartQty(item.cartId, 0)}
                        className="text-neutral-500 hover:text-red-400 p-1 h-fit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-neutral-800 text-xs font-mono">
                      <div className="flex items-center gap-2 bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800">
                        <button
                          onClick={() => handleUpdateCartQty(item.cartId, item.quantity - 1)}
                          className="text-neutral-400 hover:text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-white text-xs px-1">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateCartQty(item.cartId, item.quantity + 1)}
                          className="text-neutral-400 hover:text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-serif font-bold text-white">
                        £{item.unitPrice * item.quantity}
                      </span>
                    </div>

                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cartItems.length > 0 && (
              <div className="pt-4 border-t border-neutral-800 space-y-3">
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subtotal:</span>
                    <strong className="text-white">£{cartSubtotal.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Est. UK VAT (20%):</span>
                    <strong className="text-white">£{vatTax.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-neutral-300 font-bold pt-1 border-t border-neutral-800 text-sm">
                    <span>Total (excl. delivery):</span>
                    <strong className="text-gold">£{(cartSubtotal + vatTax).toFixed(2)}</strong>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full py-3.5 bg-gold hover:bg-amber-400 text-black font-serif font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl"
                >
                  <Lock className="w-4 h-4" />
                  <span>Proceed to Safe Checkout</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* SAFE CHECKOUT MODAL & DYNAMIC REGIONAL DELIVERY CALCULATOR */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[140] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1A1A1A] border border-gold/50 rounded-2xl max-w-5xl w-full p-6 md:p-8 space-y-6 relative shadow-2xl my-8 text-white">
            
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header & Security Seal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-bold text-white">SMC Secure Checkout Gateway</h3>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                    256-Bit SSL Encrypted • Regional Delivery Engine • Trade Guarantee
                  </span>
                </div>
              </div>

              {/* Step Navigation Tabs */}
              <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs font-mono">
                <button
                  onClick={() => setCheckoutStep("details")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
                    checkoutStep === "details" ? "bg-gold text-black font-bold" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>1. Details</span>
                </button>
                <ChevronRight className="w-3 h-3 text-neutral-600" />
                <button
                  onClick={() => setCheckoutStep("shipping")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
                    checkoutStep === "shipping" ? "bg-gold text-black font-bold" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>2. Regional Freight</span>
                </button>
                <ChevronRight className="w-3 h-3 text-neutral-600" />
                <button
                  onClick={() => setCheckoutStep("payment")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
                    checkoutStep === "payment" ? "bg-gold text-black font-bold" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>3. Payment Gateway</span>
                </button>
              </div>
            </div>

            {/* Error Message if Payment Failure Simulated */}
            {paymentErrorMessage && (
              <div className="bg-red-950/40 border border-red-800/80 p-4 rounded-xl flex items-start gap-3 text-red-200 text-xs font-mono">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-bold text-red-300 block">Transaction Unsuccessful</strong>
                  <p>{paymentErrorMessage}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Main Step Form Area */}
              <div className="md:col-span-7 space-y-6">
                
                {/* STEP 1: CUSTOMER DETAILS & POSTCODE ZONE DETECTOR */}
                {checkoutStep === "details" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <h4 className="font-serif text-base font-bold text-gold flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> 1. Customer Contact & Delivery Location
                      </h4>
                      <span className="text-[10px] font-mono text-neutral-400">Step 1 of 3</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div>
                        <label className="text-neutral-400 block mb-1">Full Name / Estate Title:</label>
                        <input
                          type="text"
                          value={custName}
                          onChange={(e) => setCustName(e.target.value)}
                          placeholder="Sir Alex Vance"
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-white focus:border-gold outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-neutral-400 block mb-1">Email Address (Invoicing):</label>
                        <input
                          type="email"
                          value={custEmail}
                          onChange={(e) => setCustEmail(e.target.value)}
                          placeholder="alex@domain.com"
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-white focus:border-gold outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div>
                        <label className="text-neutral-400 block mb-1">Phone Number (Courier SMS):</label>
                        <input
                          type="text"
                          value={custPhone}
                          onChange={(e) => setCustPhone(e.target.value)}
                          placeholder="+44 7700 900123"
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-white focus:border-gold outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-neutral-400 block mb-1 flex items-center justify-between">
                          <span>Postcode / Zip Code:</span>
                          <span className="text-[9px] text-gold font-bold">Auto-Zone Detection</span>
                        </label>
                        <input
                          type="text"
                          value={custPostcode}
                          onChange={(e) => handlePostcodeChange(e.target.value)}
                          placeholder="W1K 1PN or IV1 1AA"
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-white focus:border-gold outline-none uppercase font-bold text-gold"
                        />
                      </div>
                    </div>

                    <div className="text-xs font-mono">
                      <label className="text-neutral-400 block mb-1">Full Delivery Address:</label>
                      <input
                        type="text"
                        value={custAddress}
                        onChange={(e) => setCustAddress(e.target.value)}
                        placeholder="42 Park Lane, Mayfair, London W1K 1PN"
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-white focus:border-gold outline-none"
                      />
                    </div>

                    {/* Auto-detected Delivery Zone Indicator */}
                    <div className="bg-neutral-900 border border-gold/30 p-3.5 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-gold font-bold flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5" /> Detected Delivery Zone
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-gold/10 text-gold rounded border border-gold/30">
                          {activeZone.regionLabel}
                        </span>
                      </div>
                      <p className="text-xs text-white font-serif font-bold">{activeZone.name}</p>
                      <p className="text-[11px] text-neutral-400 font-mono">{activeZone.description}</p>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setCheckoutStep("shipping")}
                        className="px-6 py-3 bg-gold hover:bg-amber-400 text-black font-serif font-bold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                      >
                        <span>Continue to Freight & Shipping</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: REGIONAL ZONE FREIGHT & OPTIONS */}
                {checkoutStep === "shipping" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <h4 className="font-serif text-base font-bold text-gold flex items-center gap-2">
                        <Truck className="w-4 h-4" /> 2. Regional Delivery Zone & Service Method
                      </h4>
                      <span className="text-[10px] font-mono text-neutral-400">Step 2 of 3</span>
                    </div>

                    {/* Zone Selector Override */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-neutral-300 font-bold block">
                        Select Regional Freight Zone:
                      </label>
                      <select
                        value={selectedZoneId}
                        onChange={(e) => setSelectedZoneId(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:border-gold outline-none cursor-pointer"
                      >
                        {DELIVERY_ZONES.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name} ({zone.regionLabel})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Freight Methods in Selected Zone */}
                    <div className="grid grid-cols-1 gap-2.5 text-xs font-mono">
                      
                      {/* White Glove */}
                      <button
                        type="button"
                        onClick={() => setDeliveryOption("white-glove")}
                        className={`p-3.5 rounded-xl border text-left transition-all flex justify-between items-center cursor-pointer ${
                          deliveryOption === "white-glove"
                            ? "bg-gold/15 border-gold text-white font-bold"
                            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">White Glove Courier & Unpacking</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-amber-950 text-gold rounded border border-gold/40">Popular</span>
                          </div>
                          <p className="text-[10px] text-neutral-400">
                            Scheduled delivery window, room of choice placement & timber crate removal.
                          </p>
                          <span className="text-[10px] text-gold font-mono block">
                            Est. Arrival: {activeZone.estDays["white-glove"]}
                          </span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <strong className="text-white text-sm block">£{activeZone.baseRates["white-glove"]}</strong>
                          <Check className={`w-4 h-4 text-gold ml-auto ${deliveryOption === "white-glove" ? "opacity-100" : "opacity-0"}`} />
                        </div>
                      </button>

                      {/* Express Freight */}
                      <button
                        type="button"
                        onClick={() => setDeliveryOption("express")}
                        className={`p-3.5 rounded-xl border text-left transition-all flex justify-between items-center cursor-pointer ${
                          deliveryOption === "express"
                            ? "bg-gold/15 border-gold text-white font-bold"
                            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="text-white font-bold block">Express Priority Dedicated Freight</span>
                          <p className="text-[10px] text-neutral-400">
                            Direct dedicated transport vehicle dispatched within 24 hours.
                          </p>
                          <span className="text-[10px] text-gold font-mono block">
                            Est. Arrival: {activeZone.estDays["express"]}
                          </span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <strong className="text-white text-sm block">£{activeZone.baseRates["express"]}</strong>
                          <Check className={`w-4 h-4 text-gold ml-auto ${deliveryOption === "express" ? "opacity-100" : "opacity-0"}`} />
                        </div>
                      </button>

                      {/* Standard Fragile */}
                      <button
                        type="button"
                        onClick={() => setDeliveryOption("standard")}
                        className={`p-3.5 rounded-xl border text-left transition-all flex justify-between items-center cursor-pointer ${
                          deliveryOption === "standard"
                            ? "bg-gold/15 border-gold text-white font-bold"
                            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="text-white font-bold block">Standard Tracked Fragile Freight</span>
                          <p className="text-[10px] text-neutral-400">
                            Palletised & timber cased road freight with online tracking.
                          </p>
                          <span className="text-[10px] text-gold font-mono block">
                            Est. Arrival: {activeZone.estDays["standard"]}
                          </span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <strong className="text-white text-sm block">£{activeZone.baseRates["standard"]}</strong>
                          <Check className={`w-4 h-4 text-gold ml-auto ${deliveryOption === "standard" ? "opacity-100" : "opacity-0"}`} />
                        </div>
                      </button>

                      {/* Local Pickup */}
                      <button
                        type="button"
                        onClick={() => setDeliveryOption("pickup")}
                        className={`p-3.5 rounded-xl border text-left transition-all flex justify-between items-center cursor-pointer ${
                          deliveryOption === "pickup"
                            ? "bg-gold/15 border-gold text-white font-bold"
                            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="text-white font-bold block">SMC Battersea Atelier Collection (Free)</span>
                          <p className="text-[10px] text-neutral-400">
                            Collect directly from our London Studio (Battersea Park Road, SW8).
                          </p>
                          <span className="text-[10px] text-emerald-400 font-mono block">
                            Ready in 24 Hours
                          </span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <strong className="text-emerald-400 text-sm block">FREE £0</strong>
                          <Check className={`w-4 h-4 text-gold ml-auto ${deliveryOption === "pickup" ? "opacity-100" : "opacity-0"}`} />
                        </div>
                      </button>

                    </div>

                    {/* Heavy Freight Surcharge Notice */}
                    {heavyHandlingFee > 0 && deliveryOption !== "pickup" && (
                      <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-gold" />
                          <div>
                            <strong className="text-gold block">Heavy Stone Surcharge Active ({totalWeightKg.toFixed(1)} kg)</strong>
                            <span className="text-[10px] text-neutral-400">Order exceeds 15kg limit. Multi-person lift required.</span>
                          </div>
                        </div>
                        <strong className="text-white font-bold">+£{heavyHandlingFee}</strong>
                      </div>
                    )}

                    {/* Transit Damage Insurance Checkbox */}
                    {deliveryOption !== "pickup" && (
                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between text-xs font-mono">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeInsurance}
                            onChange={(e) => setIncludeInsurance(e.target.checked)}
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                          />
                          <div>
                            <strong className="text-white block font-bold">Transit Damage Guarantee Insurance (+£15)</strong>
                            <span className="text-[10px] text-neutral-400">Guarantees instant zero-cost replacement if stone is cracked in transit.</span>
                          </div>
                        </label>
                      </div>
                    )}

                    {/* Delivery Notes */}
                    <div className="text-xs font-mono space-y-1">
                      <label className="text-neutral-400 block">Access & Estate Instructions:</label>
                      <input
                        type="text"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        placeholder="Gate code, parking restrictions or estate manager phone number..."
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:border-gold outline-none"
                      />
                    </div>

                    <div className="pt-2 flex justify-between">
                      <button
                        onClick={() => setCheckoutStep("details")}
                        className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Back to Details</span>
                      </button>
                      <button
                        onClick={() => setCheckoutStep("payment")}
                        className="px-6 py-3 bg-gold hover:bg-amber-400 text-black font-serif font-bold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                      >
                        <span>Proceed to Payment Gateway</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: MOCK PAYMENT GATEWAY SIMULATION */}
                {checkoutStep === "payment" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <h4 className="font-serif text-base font-bold text-gold flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> 3. Select Payment Gateway & Payment Simulator
                      </h4>
                      <span className="text-[10px] font-mono text-neutral-400">Step 3 of 3</span>
                    </div>

                    {/* Payment Method Tabs */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("stripe")}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          paymentMethod === "stripe"
                            ? "bg-gold/20 border-gold text-white font-bold"
                            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                        }`}
                      >
                        💳 Card Payment
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("apple-pay")}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          paymentMethod === "apple-pay"
                            ? "bg-gold/20 border-gold text-white font-bold"
                            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                        }`}
                      >
                         Apple / G-Pay
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("klarna")}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          paymentMethod === "klarna"
                            ? "bg-gold/20 border-gold text-white font-bold"
                            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                        }`}
                      >
                        🛍 Klarna 3x Split
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("bank-transfer")}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          paymentMethod === "bank-transfer"
                            ? "bg-gold/20 border-gold text-white font-bold"
                            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                        }`}
                      >
                        🏛 Wire (-3% Trade)
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("crypto")}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          paymentMethod === "crypto"
                            ? "bg-gold/20 border-gold text-white font-bold"
                            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                        }`}
                      >
                        ⚡ Web3 (-2% Gas)
                      </button>
                    </div>

                    {/* METHOD 1: CREDIT / DEBIT CARD SIMULATION */}
                    {paymentMethod === "stripe" && (
                      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3 font-mono text-xs">
                        
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                          <span className="text-white font-bold flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-gold" /> Encrypted Card Terminal
                          </span>
                          <span className="text-[10px] text-neutral-400">Visa • Mastercard • Amex</span>
                        </div>

                        {/* Test Mode Simulator Toggle */}
                        <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 flex items-center justify-between">
                          <span className="text-[10px] text-neutral-400">Gateway Test Simulation Mode:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTestCardMode("success");
                                setCardNumber("4242 4242 4242 4242");
                                setPaymentErrorMessage(null);
                              }}
                              className={`px-2.5 py-1 rounded text-[10px] cursor-pointer transition-colors ${
                                testCardMode === "success"
                                  ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                                  : "bg-neutral-900 text-neutral-500 hover:text-white"
                              }`}
                            >
                              ✓ Approved Test Card
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTestCardMode("decline");
                                setCardNumber("4000 0000 0000 0002");
                                setPaymentErrorMessage(null);
                              }}
                              className={`px-2.5 py-1 rounded text-[10px] cursor-pointer transition-colors ${
                                testCardMode === "decline"
                                  ? "bg-red-500/20 text-red-300 font-bold border border-red-500/40"
                                  : "bg-neutral-900 text-neutral-500 hover:text-white"
                              }`}
                            >
                              ✕ Decline Test Card
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-neutral-400 block mb-1">Cardholder Name:</label>
                          <input
                            type="text"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                          />
                        </div>

                        <div>
                          <label className="text-neutral-400 block mb-1">Card Number:</label>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-gold font-bold tracking-widest"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-neutral-400 block mb-1">Expiry Date:</label>
                            <input
                              type="text"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              placeholder="MM/YY"
                              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                            />
                          </div>

                          <div>
                            <label className="text-neutral-400 block mb-1">CVC Code:</label>
                            <input
                              type="text"
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value)}
                              placeholder="123"
                              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                            />
                          </div>
                        </div>

                      </div>
                    )}

                    {/* METHOD 2: APPLE / GOOGLE PAY */}
                    {paymentMethod === "apple-pay" && (
                      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 text-center font-mono">
                        <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                          
                        </div>
                        <div className="space-y-1">
                          <h5 className="text-white font-serif font-bold text-base">One-Touch Biometric Express Pay</h5>
                          <p className="text-xs text-neutral-400">
                            Authorize instant payment with Face ID, Touch ID, or Google Wallet key.
                          </p>
                        </div>
                        <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-300">
                          Total Amount: <strong className="text-gold font-serif font-bold text-sm ml-1">£{cartTotal.toFixed(2)}</strong>
                        </div>
                      </div>
                    )}

                    {/* METHOD 3: KLARNA INSTALLMENTS */}
                    {paymentMethod === "klarna" && (
                      <div className="bg-pink-950/20 border border-pink-900/40 rounded-xl p-4 space-y-3 font-mono text-xs">
                        <div className="flex items-center justify-between border-b border-pink-900/40 pb-2">
                          <span className="text-pink-300 font-bold flex items-center gap-1.5">
                            🛍 Klarna Pay in 3 Interest-Free Installments
                          </span>
                          <span className="text-[10px] bg-pink-950 text-pink-300 border border-pink-800 px-2 py-0.5 rounded">0% APR</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 space-y-0.5">
                            <span className="text-[9px] text-neutral-400 block uppercase">1st Payment Today</span>
                            <strong className="text-gold block font-serif">£{(cartTotal / 3).toFixed(2)}</strong>
                          </div>
                          <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 space-y-0.5">
                            <span className="text-[9px] text-neutral-400 block uppercase">In 30 Days</span>
                            <strong className="text-white block font-serif">£{(cartTotal / 3).toFixed(2)}</strong>
                          </div>
                          <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 space-y-0.5">
                            <span className="text-[9px] text-neutral-400 block uppercase">In 60 Days</span>
                            <strong className="text-white block font-serif">£{(cartTotal / 3).toFixed(2)}</strong>
                          </div>
                        </div>

                        <p className="text-[10px] text-neutral-400">
                          Instant soft credit check conducted at authorization. No impact on credit score.
                        </p>
                      </div>
                    )}

                    {/* METHOD 4: BACS DIRECT WIRE TRANSFER */}
                    {paymentMethod === "bank-transfer" && (
                      <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4 space-y-3 font-mono text-xs">
                        <div className="flex items-center justify-between border-b border-emerald-800/40 pb-2">
                          <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                            <Building className="w-4 h-4" /> BACS Direct Wire Transfer (-3% Discount Applied)
                          </span>
                          <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-700 px-2 py-0.5 rounded font-bold">
                            Saved £{paymentDiscount.toFixed(2)}
                          </span>
                        </div>

                        <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2 text-neutral-300">
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Bank Name:</span>
                            <strong className="text-white">Barclays Commercial Bank, London</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Account Name:</span>
                            <strong className="text-white">SMC Stonemasonry Atelier Ltd</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Sort Code:</span>
                            <strong className="text-gold">20-00-00</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Account No:</span>
                            <strong className="text-gold">88942019</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">IBAN / SWIFT:</span>
                            <strong className="text-white">GB88 BARC 2000 0088 9420 19</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* METHOD 5: WEB3 CRYPTO */}
                    {paymentMethod === "crypto" && (
                      <div className="bg-purple-950/20 border border-purple-800/40 rounded-xl p-4 space-y-3 font-mono text-xs">
                        <div className="flex items-center justify-between border-b border-purple-800/40 pb-2">
                          <span className="text-purple-300 font-bold flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-purple-400" /> Web3 Crypto Checkout (-2% Discount)
                          </span>
                          <div className="flex items-center gap-1">
                            {(["USDC", "USDT", "ETH"] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setCryptoToken(t)}
                                className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                                  cryptoToken === t ? "bg-purple-600 text-white font-bold" : "bg-neutral-900 text-neutral-400"
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex items-center gap-3">
                          <div className="w-16 h-16 bg-white p-1 rounded-lg flex items-center justify-center shrink-0">
                            <QrCode className="w-14 h-14 text-black" />
                          </div>
                          <div className="space-y-1 flex-1 overflow-hidden">
                            <span className="text-[10px] text-neutral-500 block uppercase">Send {cryptoToken} to Wallet:</span>
                            <code className="text-[10px] text-purple-300 font-mono block truncate bg-neutral-900 p-1.5 rounded border border-neutral-800">
                              0x71C7656EC7ab88b098defB751B7401B5f6d8976F
                            </code>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
                                setCopiedWallet(true);
                                setTimeout(() => setCopiedWallet(false), 2000);
                              }}
                              className="text-[10px] text-gold hover:underline cursor-pointer"
                            >
                              {copiedWallet ? "✓ Address Copied!" : "Copy Wallet Address"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex justify-between">
                      <button
                        onClick={() => setCheckoutStep("shipping")}
                        className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Back to Freight</span>
                      </button>
                    </div>

                  </div>
                )}

              </div>

              {/* Right Column: Dynamic Order Financial Breakdown & Authorize Button */}
              <div className="md:col-span-5 bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                
                <div className="space-y-3">
                  <h4 className="font-serif text-base font-bold text-white border-b border-neutral-800 pb-2 flex items-center justify-between">
                    <span>Order Summary</span>
                    <span className="text-xs font-mono text-gold font-normal">{cartItems.length} Items</span>
                  </h4>

                  {/* Cart Items Scroll list */}
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar text-xs font-mono pr-1">
                    {cartItems.map((item) => (
                      <div key={item.cartId} className="flex justify-between items-start text-neutral-300 border-b border-neutral-800/50 pb-1.5">
                        <div className="truncate max-w-[170px]">
                          <span className="text-white font-bold block truncate">{item.quantity}x {item.product.name}</span>
                          <span className="text-[10px] text-neutral-400 block">{item.selectedMaterial}</span>
                        </div>
                        <strong className="text-white text-xs shrink-0">£{item.unitPrice * item.quantity}</strong>
                      </div>
                    ))}
                  </div>

                  {/* Itemized Financials */}
                  <div className="space-y-1.5 pt-2 border-t border-neutral-800 text-xs font-mono">
                    <div className="flex justify-between text-neutral-400">
                      <span>Artisan Items Subtotal:</span>
                      <strong className="text-white">£{cartSubtotal.toFixed(2)}</strong>
                    </div>

                    {paymentDiscount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Payment Discount:</span>
                        <span>-£{paymentDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-neutral-400">
                      <span>Base Regional Freight ({activeZone.name}):</span>
                      <strong className="text-white">£{baseFreightCost.toFixed(2)}</strong>
                    </div>

                    {heavyHandlingFee > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>Heavy Stone Surcharge:</span>
                        <strong>+£{heavyHandlingFee.toFixed(2)}</strong>
                      </div>
                    )}

                    {includeInsurance && deliveryOption !== "pickup" && (
                      <div className="flex justify-between text-neutral-400">
                        <span>Transit Damage Guarantee:</span>
                        <strong className="text-white">+£15.00</strong>
                      </div>
                    )}

                    <div className="flex justify-between text-neutral-400">
                      <span>UK VAT (20%):</span>
                      <strong className="text-white">£{vatTax.toFixed(2)}</strong>
                    </div>

                    <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-neutral-700 font-serif">
                      <span>Total Amount Due:</span>
                      <strong className="text-gold">£{cartTotal.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                {/* Gateway Process Execution Button */}
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-[10px] font-mono text-neutral-400 space-y-1">
                    <div className="flex items-center gap-1.5 text-gold font-bold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>SMC Encrypted Gateway Ready</span>
                    </div>
                    <p>Protected by SMC Trade Guarantee. Certificate of Authenticity & Tax Invoice generated instantly.</p>
                  </div>

                  <button
                    onClick={handleProcessOrder}
                    disabled={isProcessingPayment}
                    className="w-full py-4 bg-gold hover:bg-amber-400 text-black font-serif font-bold text-base rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl disabled:opacity-50"
                  >
                    {isProcessingPayment ? (
                      <div className="flex items-center gap-2 text-black">
                        <Clock className="w-5 h-5 animate-spin" />
                        <span className="font-mono text-xs">Processing Step {processingStepIndex + 1}/4...</span>
                      </div>
                    ) : (
                      <>
                        <CheckSquare className="w-5 h-5" />
                        <span>Authorize Payment (£{cartTotal.toFixed(2)})</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* COMPLETED ORDER CONFIRMATION & DIGITAL RECEIPT MODAL */}
      {completedOrder && (
        <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1A1A1A] border border-emerald-500/60 rounded-2xl max-w-3xl w-full p-6 md:p-8 space-y-6 relative shadow-2xl my-8 text-white">
            
            <button
              onClick={() => setCompletedOrder(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <PackageCheck className="w-8 h-8" />
            </div>

            <div className="space-y-1 text-center">
              <span className="text-xs font-mono uppercase text-gold font-bold tracking-widest block flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Payment Authorized & Order Confirmed
              </span>
              <h3 className="font-serif text-3xl font-bold text-white">
                Thank You for Your Artisan Order!
              </h3>
              <p className="text-xs text-neutral-400 font-mono">
                Official Receipt Ref: <strong className="text-gold font-bold">{completedOrder.orderRef}</strong>
              </p>
            </div>

            {/* Email Notification Dispatch Status Banner */}
            <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-emerald-300 font-bold block flex items-center gap-1.5">
                    <span>Email Notification Dispatched</span>
                    <span className="text-[9px] bg-emerald-900/80 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-700">SMTP 200 OK</span>
                  </strong>
                  <span className="text-neutral-300 text-[11px]">
                    Confirmation & delivery window schedule sent to <strong className="text-white">{completedOrder.custEmail}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowEmailModal(true)}
                className="px-4 py-2 bg-gold hover:bg-amber-400 text-black font-bold font-serif text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md"
              >
                <Mail className="w-4 h-4" />
                <span>View Client Inbox Simulation</span>
              </button>
            </div>

            {/* Material Availability & Delivery Schedule Box */}
            {completedOrder.deliveryWindowInfo && (
              <div className="bg-neutral-900 border border-amber-500/30 rounded-xl p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-gold font-bold flex items-center gap-2 text-sm font-serif">
                    <Calendar className="w-4 h-4" /> Estimated Delivery Window Schedule
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-950 text-gold rounded border border-amber-800/80 font-bold">
                    Material Availability Factored
                  </span>
                </div>

                <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase block font-bold">Calculated Arrival Date Range:</span>
                    <strong className="text-emerald-400 font-serif font-bold text-lg block">{completedOrder.estimatedDelivery}</strong>
                  </div>
                  <div className="text-right sm:text-right">
                    <span className="text-[10px] text-neutral-400 block">Lead Time Breakdown:</span>
                    <span className="text-xs text-neutral-200">
                      <strong>{completedOrder.deliveryWindowInfo.maxPrepDays} Days</strong> Material Prep + <strong>{completedOrder.deliveryWindowInfo.transitMinDays}-{completedOrder.deliveryWindowInfo.transitMaxDays} Days</strong> Courier
                    </span>
                  </div>
                </div>

                {/* Material Stock Breakdown List */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase block">Material Stock & Preparation Status:</span>
                  <div className="grid grid-cols-1 gap-2">
                    {completedOrder.deliveryWindowInfo.availabilities.map((avail: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-between text-[11px]">
                        <div>
                          <span className="text-white font-bold block">{avail.productName} ({avail.material})</span>
                          <span className="text-[10px] text-neutral-400">{avail.detail}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-gold/10 text-gold rounded border border-gold/30 text-[10px] font-bold shrink-0 ml-2">
                          {avail.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Printable Invoice Container */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 text-left space-y-3 font-mono text-xs">
              
              <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                <div>
                  <strong className="text-white text-sm font-serif block">SMC Stonemasonry Atelier</strong>
                  <span className="text-[10px] text-neutral-400">Battersea Studio, London SW8 • VAT GB 992 108 421</span>
                </div>
                <span className="text-xs px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-700 rounded font-bold">
                  PAID IN FULL
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-neutral-300 text-[11px]">
                <div>
                  <span className="text-neutral-500 block">Customer:</span>
                  <strong className="text-white">{completedOrder.custName}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 block">Dispatch Zone:</span>
                  <strong className="text-gold">{completedOrder.deliveryZoneName}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 block">Email:</span>
                  <strong className="text-white">{completedOrder.custEmail}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 block">Delivery Method:</span>
                  <strong className="text-white capitalize">{completedOrder.deliveryOption} Courier</strong>
                </div>
              </div>

              {/* Purchased Items Table */}
              <div className="space-y-1.5 pt-2 border-t border-neutral-800">
                <span className="text-[10px] text-neutral-400 font-bold uppercase block">Purchased Stonemasonry Items:</span>
                {completedOrder.items.map((item: any) => (
                  <div key={item.cartId} className="flex justify-between text-neutral-200 text-xs">
                    <span className="truncate max-w-[280px]">
                      {item.quantity}x {item.product.name} ({item.selectedMaterial})
                    </span>
                    <strong>£{(item.unitPrice * item.quantity).toFixed(2)}</strong>
                  </div>
                ))}
              </div>

              {/* Financial Totals */}
              <div className="space-y-1 pt-2 border-t border-neutral-800 text-neutral-400">
                <div className="flex justify-between">
                  <span>Items Subtotal:</span>
                  <strong className="text-white">£{completedOrder.subtotal.toFixed(2)}</strong>
                </div>
                {completedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount:</span>
                    <strong>-£{completedOrder.discount.toFixed(2)}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Regional Freight & Handling ({completedOrder.totalWeightKg.toFixed(1)}kg):</span>
                  <strong className="text-white">£{completedOrder.deliveryCost.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>UK VAT (20%):</span>
                  <strong className="text-white">£{completedOrder.vatTax.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-sm text-white font-bold pt-1 border-t border-neutral-700">
                  <span>Total Paid:</span>
                  <strong className="text-emerald-400">£{completedOrder.total.toFixed(2)}</strong>
                </div>
              </div>

            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowEmailModal(true)}
                className="w-full sm:w-auto px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-gold border border-gold/40 font-serif font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Mail className="w-4 h-4 text-gold" />
                <span>Open Simulated Client Email Inbox</span>
              </button>

              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto px-5 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4 text-neutral-400" />
                <span>Print Official Tax Invoice</span>
              </button>

              <button
                onClick={() => setCompletedOrder(null)}
                className="w-full sm:w-auto px-8 py-3 bg-gold hover:bg-amber-400 text-black font-serif font-bold text-sm rounded-xl transition-all cursor-pointer shadow-lg"
              >
                Back to Artisan Atelier
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SIMULATED CLIENT EMAIL NOTIFICATION INBOX MODAL */}
      {showEmailModal && completedOrder && (
        <div className="fixed inset-0 z-[160] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121212] border border-neutral-700 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl relative my-8 text-white">
            
            {/* Email Client App Header */}
            <div className="bg-[#1C1C1E] border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-white text-base">Client Email Inbox Simulation</h3>
                  <span className="text-[10px] font-mono text-neutral-400 block">
                    Dispatched to {completedOrder.custEmail} • SMTP Relay Active
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowEmailModal(false)}
                className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Email Envelope & Metadata Bar */}
            <div className="bg-[#181818] p-5 border-b border-neutral-800 space-y-3 font-mono text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 w-12 shrink-0">From:</span>
                    <strong className="text-gold">SMC Stonemasonry Atelier &lt;orders@smc-stonemasonry.co.uk&gt;</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 w-12 shrink-0">To:</span>
                    <strong className="text-white">{completedOrder.custName} &lt;{completedOrder.custEmail}&gt;</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 w-12 shrink-0">Subject:</span>
                    <strong className="text-white font-bold">
                      Order Confirmed #{completedOrder.orderRef} - Material Reserve Allocated & Delivery Window
                    </strong>
                  </div>
                </div>

                <div className="text-right sm:text-right space-y-1 shrink-0">
                  <span className="text-[10px] text-neutral-400 block">{completedOrder.date} at {completedOrder.time}</span>
                  <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> DKIM Verified
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsResendingEmail(true);
                      setTimeout(() => {
                        setIsResendingEmail(false);
                        setShowEmailToast(true);
                      }, 800);
                    }}
                    disabled={isResendingEmail}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isResendingEmail ? "animate-spin text-gold" : ""}`} />
                    <span>{isResendingEmail ? "Resending..." : "Resend Notification"}</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://smc-stonemasonry.co.uk/track/${completedOrder.orderRef}`);
                      setCopyTrackingToast(true);
                      setTimeout(() => setCopyTrackingToast(false), 2000);
                    }}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-gold" />
                    <span>{copyTrackingToast ? "✓ Link Copied!" : "Copy Courier Tracking Link"}</span>
                  </button>
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Email</span>
                </button>
              </div>
            </div>

            {/* Email HTML Body Rendered Frame */}
            <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar bg-[#0D0D0D]">
              
              {/* Email Brand Header Banner */}
              <div className="text-center space-y-2 border-b border-neutral-800 pb-6">
                <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center mx-auto text-gold font-serif font-bold text-xl">
                  SMC
                </div>
                <h2 className="font-serif text-2xl font-bold text-white tracking-wide">
                  SMC Stonemasonry Atelier
                </h2>
                <p className="text-xs font-mono text-neutral-400">
                  Battersea Studio & Workshops, London SW8 • Handcrafted Stone Lifestyle
                </p>
              </div>

              {/* Personal Greeting */}
              <div className="space-y-3 font-serif">
                <h4 className="text-xl font-bold text-white">Dear {completedOrder.custName},</h4>
                <p className="text-sm text-neutral-300 leading-relaxed font-sans">
                  We are pleased to confirm that your order <strong className="text-gold">#{completedOrder.orderRef}</strong> has been successfully placed and paid in full. Our master stonemasons have allocated your requested stone slabs from our Battersea atelier reserve.
                </p>
              </div>

              {/* ESTIMATED DELIVERY WINDOW BANNER */}
              <div className="bg-[#1A1810] border-2 border-gold/50 p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-gold/30 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gold" />
                    <strong className="font-serif text-base text-gold font-bold">Estimated Delivery Window</strong>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 bg-gold text-black font-bold rounded">
                    Scheduled
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono text-neutral-400 uppercase block">Expected Arrival at {completedOrder.custPostcode}:</span>
                  <p className="font-serif text-2xl md:text-3xl font-bold text-white">
                    {completedOrder.estimatedDelivery}
                  </p>
                </div>

                {completedOrder.deliveryWindowInfo && (
                  <div className="text-xs font-mono text-neutral-300 bg-black/40 p-3 rounded-xl border border-neutral-800 space-y-1">
                    <p className="font-bold text-gold">Schedule Calculation Note:</p>
                    <p className="text-[11px] text-neutral-300">
                      • Material Availability Prep: <strong>{completedOrder.deliveryWindowInfo.maxPrepDays} Business Days</strong> for custom hand-sealing and curing.<br/>
                      • Courier Transit: <strong>{completedOrder.deliveryWindowInfo.transitMinDays}-{completedOrder.deliveryWindowInfo.transitMaxDays} Business Days</strong> via {completedOrder.deliveryOption} shipping to {completedOrder.deliveryZoneName}.
                    </p>
                  </div>
                )}
              </div>

              {/* MATERIAL AVAILABILITY BREAKDOWN TABLE */}
              <div className="space-y-3 font-mono text-xs">
                <h5 className="font-serif text-base font-bold text-gold flex items-center gap-2 border-b border-neutral-800 pb-2">
                  <Sparkles className="w-4 h-4" /> Material Availability & Atelier Production Status
                </h5>

                <div className="grid grid-cols-1 gap-3">
                  {completedOrder.deliveryWindowInfo?.availabilities.map((itemAvail: any, i: number) => (
                    <div key={i} className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <strong className="text-white text-sm font-serif">{itemAvail.productName}</strong>
                        <span className="px-2.5 py-0.5 bg-amber-950 text-gold border border-gold/40 rounded text-[10px] font-bold">
                          {itemAvail.badge}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-neutral-300 text-[11px]">
                        <span className="text-neutral-500">Material:</span>
                        <strong className="text-gold">{itemAvail.material}</strong>
                        <span className="text-neutral-500 ml-2">Qty:</span>
                        <strong className="text-white">{itemAvail.quantity}</strong>
                      </div>

                      <div className="p-2 bg-neutral-950 rounded border border-neutral-850 text-[11px] text-neutral-400">
                        <strong className="text-neutral-200 block mb-0.5">Atelier Reserve Status:</strong>
                        {itemAvail.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ITEMIZED FINANCIAL RECEIPT */}
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-3 font-mono text-xs">
                <h5 className="font-serif text-base font-bold text-white border-b border-neutral-800 pb-2">
                  Order Summary Financials
                </h5>

                <div className="space-y-2">
                  {completedOrder.items.map((item: any) => (
                    <div key={item.cartId} className="flex justify-between items-center text-neutral-300">
                      <div>
                        <strong className="text-white block">{item.quantity}x {item.product.name}</strong>
                        <span className="text-[10px] text-neutral-400">{item.selectedMaterial} • {item.selectedSize.name}</span>
                      </div>
                      <strong className="text-white font-serif text-sm">£{(item.unitPrice * item.quantity).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-neutral-800 space-y-1 text-neutral-400">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <strong className="text-white">£{completedOrder.subtotal.toFixed(2)}</strong>
                  </div>
                  {completedOrder.discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Payment Method Discount:</span>
                      <strong>-£{completedOrder.discount.toFixed(2)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Regional Courier Freight ({completedOrder.deliveryZoneName}):</span>
                    <strong className="text-white">£{completedOrder.deliveryCost.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>UK VAT (20%):</span>
                    <strong className="text-white">£{completedOrder.vatTax.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-neutral-700 font-serif">
                    <span>Total Amount Paid:</span>
                    <strong className="text-gold">£{completedOrder.total.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {/* DELIVERY ADDRESS & NOTES */}
              <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-2 font-mono text-xs text-neutral-300">
                <strong className="text-white font-serif text-sm block border-b border-neutral-800 pb-1">
                  Delivery Location & Instructions
                </strong>
                <p><strong>Recipient:</strong> {completedOrder.custName}</p>
                <p><strong>Address:</strong> {completedOrder.custAddress}</p>
                <p><strong>Postcode:</strong> {completedOrder.custPostcode} ({completedOrder.deliveryZoneName})</p>
                <p><strong>Phone:</strong> {completedOrder.custPhone}</p>
                {completedOrder.deliveryNotes && (
                  <p className="text-neutral-400 italic"><strong>Courier Notes:</strong> "{completedOrder.deliveryNotes}"</p>
                )}
              </div>

              {/* FOOTER */}
              <div className="text-center pt-4 border-t border-neutral-800 space-y-1 font-mono text-[11px] text-neutral-500">
                <p>SMC Stonemasonry Atelier Ltd • Battersea Park Road, London SW8 4BG</p>
                <p>For urgent courier changes or access queries, email concierge@smc-stonemasonry.co.uk</p>
              </div>

            </div>

            {/* Email Modal Footer */}
            <div className="bg-[#1C1C1E] border-t border-neutral-800 px-6 py-4 flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-400">
                Simulated Email Trigger Active
              </span>
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-6 py-2.5 bg-gold hover:bg-amber-400 text-black font-serif font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Email Preview
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FLOATING EMAIL DISPATCHED TOAST NOTIFICATION */}
      {showEmailToast && completedOrder && (
        <div className="fixed bottom-6 left-6 z-[170] bg-[#1A1A1A] border-2 border-gold rounded-2xl p-4 shadow-2xl max-w-md w-full animate-bounce-short text-white space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold shrink-0">
                <Mail className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <strong className="text-gold font-serif font-bold text-sm block">
                  Simulated Email Notification Dispatched!
                </strong>
                <span className="text-[11px] font-mono text-neutral-300 block">
                  Sent to <strong className="text-white">{completedOrder.custEmail}</strong>
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowEmailToast(false)}
              className="text-neutral-400 hover:text-white cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] font-mono text-neutral-400">
            Est. Arrival: <strong className="text-emerald-400">{completedOrder.estimatedDelivery}</strong> (Based on {completedOrder.deliveryWindowInfo?.maxPrepDays || 2}-day material availability).
          </p>

          <div className="pt-1 flex items-center gap-2">
            <button
              onClick={() => {
                setShowEmailToast(false);
                setShowEmailModal(true);
              }}
              className="w-full py-2 bg-gold hover:bg-amber-400 text-black font-serif font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Open Simulated Client Email Inbox</span>
            </button>
          </div>
        </div>
      )}

      {/* FLOATING QUICK CART BADGE */}
      {cartItems.length > 0 && !isCartOpen && !isCheckoutOpen && !completedOrder && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-[120] bg-gold hover:bg-amber-400 text-black px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 transition-all cursor-pointer font-bold font-serif border-2 border-black hover:scale-105"
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-black text-gold text-[10px] font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center border border-gold">
              {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
            </span>
          </div>
          <div className="text-left font-mono text-xs">
            <div className="font-serif font-bold text-sm leading-tight">Artisan Cart</div>
            <div className="text-[10px] text-neutral-900 font-semibold">£{cartTotal.toFixed(2)} ({cartItems.length} items)</div>
          </div>
        </button>
      )}

    </div>
  );
}
