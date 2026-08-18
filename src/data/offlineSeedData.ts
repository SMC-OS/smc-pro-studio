import { MaterialSpecItem, ProjectDataCacheItem } from "../services/offlineStorage";

export const INITIAL_OFFLINE_MATERIAL_SPECS: MaterialSpecItem[] = [
  {
    id: "mat-calacatta-gold-quartz",
    name: "Calacatta Gold Supreme Quartz",
    category: "Bespoke Quartz",
    lot: "LOT-CG-8821",
    origin: "Tuscany, Italy / Engineered",
    mohs: "7.0 (Extreme Scratch Resistance)",
    thickness: ["20mm", "30mm"],
    dims: "3200mm x 1600mm",
    pricePerSqM: 420,
    description: "Luxurious crisp white background traversed by warm gold and soft grey veining. Engineered for zero porosity, stain immunity, and zero maintenance.",
    finishes: ["Polished", "Honed Velvet", "Suede Touch"],
    technicalProperties: {
      waterAbsorption: "0.02% (Impermeable)",
      flexuralStrength: "52.4 MPa",
      stainResistance: "Grade 5 (Acid/Wine/Oil Immune)",
      uvStability: "Indoor Master / UV Stabilized Option"
    },
    cachedAt: new Date().toISOString()
  },
  {
    id: "mat-nero-marquina-marble",
    name: "Nero Marquina Black Marble",
    category: "Natural Marble",
    lot: "LOT-NM-4109",
    origin: "Basque Country, Spain",
    mohs: "4.5 (Silken Tactile Marble)",
    thickness: ["20mm", "30mm"],
    dims: "2950mm x 1820mm",
    pricePerSqM: 580,
    description: "Deep obsidian black natural marble with dramatic linear white calcite veining. Precision honed for luxury splashbacks, feature walls, and fireplace surrounds.",
    finishes: ["Polished", "Leathered Satin"],
    technicalProperties: {
      waterAbsorption: "0.15%",
      flexuralStrength: "18.2 MPa",
      stainResistance: "Sealer Required (SMC HydroShield Protected)",
      uvStability: "100% UV Stable Natural Stone"
    },
    cachedAt: new Date().toISOString()
  },
  {
    id: "mat-taj-mahal-quartzite",
    name: "Taj Mahal Ultra Quartzite",
    category: "Exotic Quartzite",
    lot: "LOT-TM-9032",
    origin: "Ceará, Brazil",
    mohs: "8.0 (Harder than Granite)",
    thickness: ["20mm", "30mm"],
    dims: "3100mm x 1950mm",
    pricePerSqM: 780,
    description: "Soft creamy ivory hue with wisps of caramel and amber strata. Rare natural quartzite delivering breathtaking translucent depth and indestructible hardness.",
    finishes: ["Polished Mirror", "Leathered Architectural"],
    technicalProperties: {
      waterAbsorption: "0.08%",
      flexuralStrength: "64.0 MPa",
      stainResistance: "High Natural Resistance",
      uvStability: "100% Outdoor & Indoor Stable"
    },
    cachedAt: new Date().toISOString()
  },
  {
    id: "mat-dekton-laurent",
    name: "Dekton Laurent Ultra-Compact Porcelain",
    category: "Sintered Porcelain / Dekton",
    lot: "LOT-DK-2204",
    origin: "Cosentino, Spain",
    mohs: "8.5 (Indestructible Thermal Barrier)",
    thickness: ["12mm", "20mm"],
    dims: "3200mm x 1440mm",
    pricePerSqM: 490,
    description: "Dark brown backdrop with golden veins inspired by Port Laurent marble. Zero thermal shock (place hot pans directly), zero scratching, and zero UV fade.",
    finishes: ["Matte Velvet", "XGloss Mirror"],
    technicalProperties: {
      waterAbsorption: "< 0.05% (Zero Porosity)",
      flexuralStrength: "68.5 MPa",
      stainResistance: "Grade 5 (Impervious to all household chemicals)",
      uvStability: "100% Direct Sunlight & Outdoor Kitchen Safe"
    },
    cachedAt: new Date().toISOString()
  },
  {
    id: "mat-statuario-extra-porcelain",
    name: "Statuario Extra Porcelain Slabs",
    category: "Large Format Porcelain",
    lot: "LOT-SE-7712",
    origin: "Sassuolo, Italy",
    mohs: "7.5",
    thickness: ["6mm", "12mm", "20mm"],
    dims: "3200mm x 1600mm",
    pricePerSqM: 340,
    description: "Ultra-precise 12K digital representation of rare Statuario Michelangelo natural marble. Ideal for weight-restricted high-rise installations and wall cladding.",
    finishes: ["Polished Silk", "Satin Honed"],
    technicalProperties: {
      waterAbsorption: "< 0.03%",
      flexuralStrength: "58.0 MPa",
      stainResistance: "Grade 5",
      uvStability: "100% UV Resistant"
    },
    cachedAt: new Date().toISOString()
  }
];

export const INITIAL_OFFLINE_PROJECTS: ProjectDataCacheItem[] = [
  {
    id: "proj-kensington-estate",
    clientName: "Alexander Wright",
    projectTitle: "The Kensington Penthouse & Master Kitchen",
    address: "14 Kensington Palace Gardens",
    postcode: "W8 4QP, London",
    stage: "Templating Complete / CNC Fabrication",
    totalValue: 64500,
    materials: ["Calacatta Gold Supreme Quartz", "Dekton Laurent"],
    lastUpdated: "2026-08-03T09:30:00Z",
    rooms: [
      {
        name: "Grand Island Kitchen",
        dimensions: "3850mm x 1350mm x 30mm",
        notes: "Mitred 80mm drop down water-fall edges on both ends with recessed LED channel."
      },
      {
        name: "Chef Prep Kitchen & Utility",
        dimensions: "2400mm x 650mm x 20mm",
        notes: "Undermount double Belfast sink cutout with fluted drainer grooves."
      }
    ],
    cachedAt: new Date().toISOString()
  },
  {
    id: "proj-mayfair-townhouse",
    clientName: "Lady Victoria Sterling",
    projectTitle: "Mayfair Georgian Townhouse Master Suite",
    address: "22 Mount Street, Mayfair",
    postcode: "W1K 2RB, London",
    stage: "Dry Fit Inspection & Polishing",
    totalValue: 92000,
    materials: ["Nero Marquina Black Marble", "Taj Mahal Ultra Quartzite"],
    lastUpdated: "2026-08-02T16:15:00Z",
    rooms: [
      {
        name: "Master Ensuite Vanity",
        dimensions: "2200mm x 700mm x 30mm",
        notes: "Double oval undermount sinks with Bookmatched marble splashback (1200mm high)."
      }
    ],
    cachedAt: new Date().toISOString()
  },
  {
    id: "proj-chelsea-waterfront",
    clientName: "Dr. Jonathan Hayes",
    projectTitle: "Chelsea Harbour Terrace Outdoor Kitchen",
    address: "8 Chelsea Harbour Design Centre",
    postcode: "SW10 0XE, London",
    stage: "Survey Scheduled / Material Reserved",
    totalValue: 38200,
    materials: ["Dekton Laurent Ultra-Compact Porcelain"],
    lastUpdated: "2026-08-01T11:20:00Z",
    rooms: [
      {
        name: "Outdoor Kitchen & BBQ Island",
        dimensions: "3100mm x 950mm x 20mm",
        notes: "Integrated Big Green Egg cutout + flush mount SubZero grill."
      }
    ],
    cachedAt: new Date().toISOString()
  }
];
