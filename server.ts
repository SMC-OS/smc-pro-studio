import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import Stripe from "stripe";
import {
  controlledCors,
  rateLimit,
  requireAuth,
  requireDemoMode,
  requireRole,
  safeErrorHandler,
  securityHeaders,
  validateBody,
} from "./server/security";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
app.use(securityHeaders);
app.use(controlledCors);
app.use(express.json({ limit: "64kb", strict: true }));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.get("/api/system/health", (_req, res) => {
  res.json({
    status: "ok",
    authenticationConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY),
    integrations: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      stripe: false,
      operationalData: false,
    },
    uptimeSeconds: Math.floor(process.uptime()),
    serverTime: new Date().toISOString(),
  });
});

app.use("/api", requireAuth);
app.get("/api/auth/session", (req, res) => {
  res.json({
    subject: req.principal?.subject,
    email: req.principal?.email,
    roles: req.principal?.roles || [],
  });
});

// Lazy-loaded Stripe client
let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe | null {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

// Lazy-loaded Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Technical specs endpoint (AI Support)
app.post("/api/gemini/chat", rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }), validateBody({
  messages: { type: "array", required: true, maxItems: 40 },
}), async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid or missing messages array." });
    }

    const ai = getGeminiClient();

    // Map client messages to Gemini content format
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction: `You are the SMC PRO Technical Assistant, an expert in engineered quartz, high-performance porcelain, and natural stone surfaces.
Your job is to provide accurate, professional, and practical answers to architects, designers, stonemasons, fabricators, and contractors.
Keep your answers professional, concise, and structured. Use bullet points or Markdown formatting where appropriate.
Provide insights into:
1. Technical specifications (compressive strength, Mohs hardness, thermal expansion, water absorption).
2. Fabrication guidelines (mitering, edge profiles, joint bonding, adhesive selection, bridge saw cutting speeds).
3. Installation instructions (sub-countertop preparation, expansion joints, siliconing, outdoor use limitations).
4. Maintenance & repair (removing hard water stains, repairing chips, cleaning quartz vs marble).

Never invent safety data or mechanical specs. If asked about a material not in the catalog, provide general industry standards for that material class (Quartz, Porcelain, Granite, Marble, Quartzite).

Our Catalog & Specs (technical properties only - no pricing data is available to you):
- Calacatta Gold (Quartz): Mohs 7, <0.05% water absorption, 20mm and 30mm, polished/honed, interior only. High silica content (require wet cutting!).
- Charcoal Soapstone (Quartz): Mohs 7, matte/silken finish, interior only.
- Concrete Matte (Quartz): Mohs 7, matte finish, urban modern style.
- Statuario Extra (Porcelain): Mohs 8, zero water absorption, 12mm and 20mm, high heat resistance, interior/exterior. Requires special diamond blades for porcelain.
- Iron Oxidized (Porcelain): Mohs 8, metallic look, high heat/UV resistance, interior/exterior.
- Nero Marquina Porcelain: Mohs 8, ultra-durable deep black porcelain.
- Taj Mahal Quartzite (Natural Stone): Mohs 7, crystalline quartz structure, extremely durable natural stone, interior/exterior. Very abrasive, requires slower saw travel speeds.
- Bianco Carrara Marble (Natural Stone): Mohs 3-4, classic Italian marble, acid sensitive (requires premium sealer), interior only. Soft, easy to scratch/etch.
- Absolute Black Granite (Natural Stone): Mohs 6.5, highly dense, low absorption, interior/exterior. Heavy duty.

You do not have access to current pricing. Never state, estimate, or invent a price, rate, or cost in any currency or unit. If asked about price, cost, or budget, say pricing is confirmed via a formal quote and direct the person to request one from SMC Pro Studio.

Speak directly and with authority as an experienced surface fabrication consultant.`,
      },
    });

    const reply = response.text || "No response generated.";
    res.json({ reply });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(502).json({ error: { code: "AI_UNAVAILABLE", message: "The AI assistant is temporarily unavailable." } });
  }
});

// In-memory store for registered client WhatsApp conversations
let whatsappClientThreads = [
  {
    id: "thread-ai-agent",
    clientName: "AI WhatsApp Agent",
    phone: "+44 (0)20 7946 0912",
    lastMessage: "Welcome to SMC Pro Studio! How can we assist with your stone or kitchen project today?",
    timestamp: "10:32 AM",
    unreadCount: 1,
    status: "ACTIVE",
    persona: "concierge",
    type: "ai_agent"
  },
  {
    id: "thread-laser-survey",
    clientName: "UK Laser Templating & Survey Desk",
    phone: "+44 (0)20 7946 0913",
    lastMessage: "3D Prodim laser dispatch confirmed for London SW1...",
    timestamp: "Yesterday",
    unreadCount: 0,
    status: "ACTIVE",
    persona: "fabricator",
    type: "department"
  },
  {
    id: "thread-knightsbridge",
    clientName: "Knightsbridge Showroom Gallery",
    phone: "+44 (0)20 7946 0914",
    lastMessage: "Calacatta Gold slab #842 is reserved under studio lights...",
    timestamp: "Jul 28",
    unreadCount: 0,
    status: "ACTIVE",
    persona: "showroom",
    type: "department"
  }
];

// WhatsApp AI Agent Endpoint with routing and thread registration
app.post("/api/whatsapp/chat", rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }), validateBody({
  messages: { type: "array", required: true, maxItems: 40 },
  persona: { type: "string", maxLength: 30 },
  recipientPhone: { type: "string", maxLength: 32 },
}), async (req, res) => {
  try {
    const { messages, userContext, persona, recipientPhone } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid or missing messages array." });
    }

    const ai = getGeminiClient();

    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    let personaInstruction = "You act as the Luxury Concierge & VIP Assistant for SMC Pro Studio.";
    if (persona === "fabricator") {
      personaInstruction = "You act as the Master Stonemason & Technical Fabricator for SMC Pro Studio. Your tone is technical, highly precise, focusing on CNC waterjet tolerances, 45-degree mitred aprons, bookmatched vein continuity, and substrate stability.";
    } else if (persona === "estimator") {
      personaInstruction = "You act as the Senior Commercial Estimator & Quantity Surveyor for SMC Pro Studio. Your tone is direct, analytical, and transparent, focusing on slab yields, fabrication scope, and guiding the customer through requesting a formal, priced quote from our estimating team. You never state or calculate a price yourself.";
    } else if (persona === "showroom") {
      personaInstruction = "You act as the Knightsbridge Showroom Director for SMC Pro Studio. Your tone is welcoming, creative, and hospitable—focusing on slab gallery viewings, physical sample boxes, and design consultation appointments.";
    }

    const systemInstruction = `You are the official SMC PRO STUDIO WhatsApp AI Agent (Simo Marble & Construction UK).
${personaInstruction}

You interact with UK homeowners, architects, kitchen fitters, interior designers, and luxury estate owners on WhatsApp.

WhatsApp Formatting Guidelines:
- Write in a natural, polite, prompt WhatsApp messaging style.
- Use WhatsApp formatting where appropriate: *bold* for emphasis or prices, _italics_ for notes, bullet points for lists.
- Keep responses focused, helpful, and concise (150-250 words max), formatted like WhatsApp messages.
- Use 1-3 tasteful emojis max per message (e.g. 🏛️ 📐 🪨 💬 ✨).
- Always maintain British English (e.g., colour, metre, licence, favourite, £ GBP).

Capabilities & Business Context:
- Company: SMC Pro Studio (Simo Marble & Construction), Premier UK Stone Fabricator & Architectural Surface Installer.
- Showroom & Thames Bay Warehouse: London Thames Hub, Bay 04 & Knightsbridge Executive Suite.
- Phone Hotline: +44 (0)20 7946 0912
- Materials: Calacatta Gold Quartz, Statuario Extra Porcelain, Taj Mahal Quartzite, Nero Marquina Porcelain, Charcoal Soapstone Quartz, Bianco Carrara Marble.
- Services:
  1. Formal Quote Request routing to our estimating team.
  2. Laser Templating & Site Survey Booking enquiries.
  3. Vein-matching and slab selection guidance.
  4. Mitred Edge Aprons, Undermount Sink Cutouts, Drainage Grooves, & Care Guides.
- If asked to book a survey, explain that a member of the team will confirm the next available slot; never invent a specific date or time.
- You do not have access to current pricing, live stock, or project-tracking data. Never state, estimate, or invent a price, rate, cost, availability, stock level, or project status. If asked about price or cost, explain that SMC Pro Studio provides a formal Request Quote and direct them to ask for one.

Be extremely helpful, welcoming, and knowledgeable as SMC Pro Studio's AI WhatsApp Agent.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "Hello! Thank you for messaging SMC Pro Studio. How can I assist with your stone or kitchen project today? 🏛️";
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const targetPhone = recipientPhone || "+44 (0)20 7946 0912";
    const cleanPhoneNum = targetPhone.replace(/[^0-9]/g, "");
    const waLink = `https://wa.me/${cleanPhoneNum || "442079460912"}?text=${encodeURIComponent(reply.slice(0, 200))}`;

    // Register or update interaction thread in client chat list
    const existingThreadIndex = whatsappClientThreads.findIndex(t => t.phone === targetPhone || t.id === "thread-ai-agent");
    if (existingThreadIndex >= 0) {
      whatsappClientThreads[existingThreadIndex] = {
        ...whatsappClientThreads[existingThreadIndex],
        lastMessage: reply.slice(0, 120),
        timestamp,
        phone: targetPhone,
        persona: persona || "concierge"
      };
    } else {
      whatsappClientThreads.unshift({
        id: `thread-${Date.now()}`,
        clientName: `WhatsApp Client (${targetPhone})`,
        phone: targetPhone,
        lastMessage: reply.slice(0, 120),
        timestamp,
        unreadCount: 0,
        status: "ACTIVE",
        persona: persona || "concierge",
        type: "client"
      });
    }

    res.json({
      reply,
      timestamp,
      routedToNumber: targetPhone,
      waLink,
      status: "ROUTED_TO_WHATSAPP"
    });
  } catch (error: any) {
    console.error("WhatsApp AI Gemini Error:", error);
    res.status(502).json({ error: { code: "AI_UNAVAILABLE", message: "The WhatsApp assistant is temporarily unavailable." } });
  }
});

// Endpoint to retrieve client WhatsApp threads for dashboard integration
app.get("/api/whatsapp/threads", requireRole("smc_staff", "admin", "owner"), requireDemoMode, (req, res) => {
  res.json({
    success: true,
    threads: whatsappClientThreads,
    lastSyncedAt: new Date().toISOString()
  });
});

// Endpoint to dispatch a message directly to a customer's WhatsApp
app.post("/api/whatsapp/dispatch-direct", requireRole("smc_staff", "admin", "owner"), requireDemoMode, validateBody({
  phone: { type: "string", maxLength: 32 },
  clientName: { type: "string", maxLength: 120 },
  message: { type: "string", maxLength: 2000 },
}), (req, res) => {
  const { phone, clientName, message } = req.body;
  const targetPhone = phone || "+44 (0)20 7946 0912";
  const cleanPhoneNum = targetPhone.replace(/[^0-9]/g, "");
  const textMsg = message || "Hello from SMC Pro Studio! Your stone project update is ready.";
  const waLink = `https://wa.me/${cleanPhoneNum || "442079460912"}?text=${encodeURIComponent(textMsg)}`;

  // Register new client thread if provided
  if (clientName && phone) {
    const newThreadId = `thread-custom-${Date.now()}`;
    whatsappClientThreads.unshift({
      id: newThreadId,
      clientName,
      phone: targetPhone,
      lastMessage: textMsg.slice(0, 100),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      unreadCount: 0,
      status: "ACTIVE",
      persona: "concierge",
      type: "client"
    });
  }

  res.json({
    success: true,
    routedToNumber: targetPhone,
    waLink,
    status: "DISPATCHED_TO_NATIVE_WHATSAPP",
    message: "Direct customer WhatsApp dispatch link generated."
  });
});

// ==========================================
// 1. CNC / WATERJET & TELEMETRY API
// ==========================================
app.get("/api/telemetry/cnc-status", requireRole("smc_staff", "admin", "owner"), requireDemoMode, (req, res) => {
  const currentProgress = Math.min(100, Math.floor(65 + (Date.now() / 1000) % 35));
  res.json({
    timestamp: new Date().toISOString(),
    machineId: "SMC-SAWJET-5X-PRO",
    depotLocation: "London Thames Fabrication Hub - Bay 04",
    status: "ACTIVE_FABRICATION",
    telemetry: {
      waterjetPressurePsi: Math.floor(51800 + Math.random() * 800),
      spindleSpeedRpm: Math.floor(6200 + Math.random() * 150),
      feedRateMmMin: 1850,
      kerfOffsetMm: 0.12,
      bladeWearPercent: 14.2,
      diamondGritEfficiency: "98.5%",
      cuttingFluidTempC: 19.4,
      vibrationMmS: 0.04,
      forensicToleranceVarianceMm: +(0.15 + Math.random() * 0.08).toFixed(2),
      toleranceLimitMm: 0.30,
    },
    activeJob: {
      projectId: "PROJ-2026-LON-08",
      projectName: "Kensington Penthouse Kitchen Island",
      slabBarcode: "SMC-CG20-8841",
      materialName: "Calacatta Gold Quartz (20mm)",
      progressPercent: currentProgress,
      currentOperation: "Waterjet Mitred Apron Cut & Sink Cutout",
      estimatedCompletionMinutes: Math.max(1, Math.floor((100 - currentProgress) * 0.4)),
    }
  });
});

app.get("/api/telemetry/ar-measurements", requireRole("smc_staff", "admin", "owner"), requireDemoMode, (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    engineVersion: "SMC-AR-LiDAR-v3.4",
    calibrationStatus: "CALIBRATED_STATIONARY",
    lidarPointsCaptured: 148500,
    spatialResolutionMm: 0.1,
    laserScanMesh: {
      lengthMm: 3820.5,
      widthMm: 2450.2,
      wallDeviationDegrees: 0.14,
      outOfSquareCorrectionMm: 0.4,
      cutoutsDetected: [
        { type: "SINK_UNDERMOUNT", widthMm: 820, depthMm: 450, xOffsetMm: 1200, yOffsetMm: 350 },
        { type: "HOB_FLUSH_INDUCTION", widthMm: 780, depthMm: 510, xOffsetMm: 2450, yOffsetMm: 380 }
      ],
      overallConfidenceScore: 99.8
    }
  });
});

// ==========================================
// 2. REAL-TIME SLAB VAULT & INVENTORY SYNC
// ==========================================
let slabInventoryDatabase = [
  { id: "SMC-CG20-8841", name: "Calacatta Gold Quartz", category: "Engineered Quartz", thickness: "20mm", dimensions: "3250mm x 1620mm", bay: "Bay A-04", rfidTag: "RFID-8841-A", stockCount: 14, status: "IN_FABRICATION", veinContinuityIndex: "98/100", lotNumber: "LOT-2026-04" },
  { id: "SMC-ST12-9012", name: "Statuario Extra Porcelain", category: "Porcelain", thickness: "12mm", dimensions: "3200mm x 1600mm", bay: "Bay B-01", rfidTag: "RFID-9012-B", stockCount: 22, status: "AVAILABLE", veinContinuityIndex: "99/100", lotNumber: "LOT-2026-09" },
  { id: "SMC-TM30-4102", name: "Taj Mahal Quartzite", category: "Natural Stone", thickness: "30mm", dimensions: "3100mm x 1850mm", bay: "Bay C-02", rfidTag: "RFID-4102-C", stockCount: 6, status: "RESERVED", veinContinuityIndex: "94/100", lotNumber: "LOT-2026-02" },
  { id: "SMC-CS20-1108", name: "Charcoal Soapstone Quartz", category: "Engineered Quartz", thickness: "20mm", dimensions: "3220mm x 1600mm", bay: "Bay A-12", rfidTag: "RFID-1108-A", stockCount: 18, status: "AVAILABLE", veinContinuityIndex: "96/100", lotNumber: "LOT-2026-05" },
  { id: "SMC-IO20-7731", name: "Iron Oxidized Porcelain", category: "Porcelain", thickness: "20mm", dimensions: "3200mm x 1600mm", bay: "Bay B-08", rfidTag: "RFID-7731-B", stockCount: 9, status: "AVAILABLE", veinContinuityIndex: "95/100", lotNumber: "LOT-2026-08" },
];

app.get("/api/inventory/slabs", requireRole("smc_staff", "catalogue_editor", "admin", "owner"), requireDemoMode, (req, res) => {
  res.json({
    lastSyncedAt: new Date().toISOString(),
    syncStatus: "SYNCHRONIZED",
    depotId: "UK-LON-MAIN-HUB",
    totalPhysicalSlabs: 69,
    vault: slabInventoryDatabase
  });
});

app.post("/api/inventory/sync-now", requireRole("smc_staff", "catalogue_editor", "admin", "owner"), requireDemoMode, (req, res) => {
  // Simulate live warehouse RFID scan resync
  const updatedVault = slabInventoryDatabase.map(slab => ({
    ...slab,
    lastScanned: new Date().toLocaleTimeString()
  }));
  res.json({
    success: true,
    message: "RFID Physical Vault Scan Complete. All 69 slabs verified in Thames Warehouse.",
    timestamp: new Date().toISOString(),
    updatedVault
  });
});

app.post("/api/qr/verify", requireDemoMode, validateBody({
  qrCode: { type: "string", maxLength: 120 },
  lotId: { type: "string", maxLength: 120 },
}), (req, res) => {
  const { qrCode, lotId } = req.body || {};
  const target = (qrCode || lotId || "LOT-B8492-V2").toString().trim().toUpperCase();
  const found = slabInventoryDatabase.find(
    s => s.id.toUpperCase() === target || s.lotNumber.toUpperCase() === target
  ) || {
    id: `SMC-VERIFIED-${target}`,
    name: "Calacatta Gold Quartz Slab",
    category: "Engineered Quartz",
    thickness: "20mm",
    dimensions: "3250mm x 1620mm",
    bay: "Bay A-04",
    rfidTag: `RFID-${target}`,
    stockCount: 12,
    status: "VERIFIED_AVAILABLE",
    veinContinuityIndex: "98/100",
    lotNumber: target
  };

  res.json({
    success: true,
    verified: true,
    target,
    verificationCode: `SMC-VAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    dossier: found,
    verifiedAt: new Date().toISOString(),
    message: `QR Pattern [${target}] automatically verified against SMC Thames Warehouse Ledger.`
  });
});

app.post("/api/qr/batch-verify", requireDemoMode, validateBody({
  qrCodes: { type: "array", maxItems: 100 },
  lotIds: { type: "array", maxItems: 100 },
  batchId: { type: "string", maxLength: 120 },
}), (req, res) => {
  const { qrCodes, lotIds, batchId } = req.body || {};
  const rawList: string[] = Array.isArray(qrCodes) ? qrCodes : (Array.isArray(lotIds) ? lotIds : []);
  const normalizedList = rawList.map(c => c.toString().trim().toUpperCase()).filter(Boolean);

  const verifiedItems = normalizedList.map(code => {
    const found = slabInventoryDatabase.find(
      s => s.id.toUpperCase() === code || s.lotNumber.toUpperCase() === code
    );
    return {
      qrCode: code,
      verified: true,
      slabName: found ? found.name : `${code} Verified Slab`,
      lotNumber: found ? found.lotNumber : code,
      bay: found ? found.bay : "Bay A-04",
      thickness: found ? found.thickness : "20mm"
    };
  });

  const generatedBatchId = batchId || `SMC-BATCH-${Date.now().toString(36).toUpperCase()}`;
  const batchVerificationCode = `SMC-BATCH-VAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  res.json({
    success: true,
    batchVerified: true,
    batchId: generatedBatchId,
    batchVerificationCode,
    totalVerified: verifiedItems.length,
    items: verifiedItems,
    timestamp: new Date().toISOString(),
    ledgerHash: `0x${Math.random().toString(16).substring(2, 14)}${Math.random().toString(16).substring(2, 14)}`,
    message: `Batch Verification Complete: ${verifiedItems.length} slab(s) verified against SMC Thames Warehouse Ledger.`
  });
});

// ==========================================
// 3. AUTHENTICATION HANDSHAKE & TRADE VERIFICATION
// ==========================================
app.post("/api/auth/verify-trade-credentials", requireRole("smc_staff", "admin", "owner"), requireDemoMode, validateBody({
  companyName: { type: "string", maxLength: 160 },
  companyNumber: { type: "string", required: true, maxLength: 16 },
  vatNumber: { type: "string", maxLength: 24 },
  tradeType: { type: "string", maxLength: 60 },
}), (req, res) => {
  const { companyName, companyNumber, vatNumber, tradeType } = req.body;

  if (!companyNumber || companyNumber.length < 6) {
    return res.status(400).json({
      success: false,
      error: "Invalid UK Companies House registration number format."
    });
  }

  // Real-time verification response simulation
  const isVerified = true;
  res.json({
    success: true,
    verificationToken: `SMC-VERIFIED-TRADE-${Math.floor(100000 + Math.random() * 900000)}`,
    companyDetails: {
      registeredName: companyName || "Kensington Architectural Joinery Ltd",
      companyNumber: companyNumber,
      vatNumber: vatNumber || "GB 924 8101 44",
      companiesHouseStatus: "Active",
      incorporationDate: "2012-04-14",
      registeredAddress: "12 Hans Crescent, Knightsbridge, London, SW1X 0LZ",
    },
    tradeTier: "VERIFIED_MASTER_BUILDER",
    creditAccount: {
      status: "APPROVED",
      creditLimitGbp: 150000,
      paymentTerms: "NET_30_DAYS",
      dedicatedMasonAdvisor: "Marco Bellini (Senior Stonemason)",
    },
    perks: [
      "18% Wholesale Slab Discount",
      "Priority 48-Hour Laser Templating",
      "Direct Bridge Saw Telemetry Access",
      "Dedicated Technical Specifier Hotline"
    ]
  });
});

// ==========================================
// 4. BETA DEPLOYMENT & FORENSIC STRESS TEST
// ==========================================
app.post("/api/beta/stress-test", requireRole("admin", "owner"), requireDemoMode, validateBody({
  testType: { type: "string", maxLength: 80 },
}), (req, res) => {
  const { testType } = req.body;
  
  res.json({
    success: true,
    testRunId: `STRESS-RUN-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    passed: true,
    diagnostics: {
      testCategory: testType || "FORENSIC_TOLERANCE_SWEEP",
      laserLidarPrecisionVariance: "±0.12mm (Pass <= 0.30mm)",
      veinMatchingAlgorithmScore: "99.4% seam alignment",
      sawJetPressureStability: "52,100 PSI (Zero cavitation)",
      mitreJointFlexuralStrength: "48.2 MPa (Exceeds BS EN 14617)",
      thermalShockToleranceDelta: "180°C gradient sustained",
    },
    betaTesterNote: "SMC Pro System operates within top 0.1% forensic tolerance standard for British Master Stonemasons."
  });
});

app.post("/api/beta/feedback", requireDemoMode, validateBody({
  feedback: { type: "string", required: true, maxLength: 4000 },
  userEmail: { type: "string", maxLength: 254 },
  rating: { type: "number", min: 1, max: 5 },
  role: { type: "string", maxLength: 60 },
}), (req, res) => {
  const { feedback, userEmail, rating, role } = req.body;
  res.json({
    success: true,
    message: "Thank you for participating in the SMC Pro Beta Deployment. Your feedback has been logged to the engineering telemetry pipeline.",
    ticketId: `BETA-TICK-${Math.floor(1000 + Math.random() * 9000)}`
  });
});

// Stripe Payment Intent Creation Endpoint
app.post("/api/stripe/create-payment-intent", requireDemoMode, validateBody({
  amount: { type: "number", required: true, min: 0.5, max: 1000000 },
  currency: { type: "string", maxLength: 3 },
  quoteRef: { type: "string", maxLength: 100 },
  depositType: { type: "string", maxLength: 60 },
  customerEmail: { type: "string", maxLength: 254 },
}), async (req, res) => {
  try {
    const { amount, currency = "gbp", quoteRef, depositType, customerEmail } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid payment amount." });
    }

    const stripe = getStripeClient();

    if (stripe) {
      // Real Stripe PaymentIntent Creation
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // convert to pence
        currency: currency.toLowerCase(),
        metadata: {
          quoteRef: quoteRef || "SMC-DIRECT-PAY",
          depositType: depositType || "25_RESERVATION",
          customerEmail: customerEmail || "unspecified"
        },
        automatic_payment_methods: { enabled: true }
      });

      return res.json({
        clientSecret: paymentIntent.client_secret,
        paymentId: paymentIntent.id,
        isLiveStripe: true
      });
    } else {
      // Enterprise Simulation Mode if STRIPE_SECRET_KEY is absent
      return res.json({
        clientSecret: `pi_sim_${Math.random().toString(36).substr(2, 12)}_secret_${Math.random().toString(36).substr(2, 12)}`,
        paymentId: `pi_sim_${Math.random().toString(36).substr(2, 12)}`,
        isLiveStripe: false,
        note: "Stripe key not configured; operating in high-fidelity transaction simulator mode."
      });
    }
  } catch (err: any) {
    console.error("Stripe Create Payment Intent Error:", err);
    res.status(502).json({ error: { code: "PAYMENT_UNAVAILABLE", message: "Payment processing is temporarily unavailable." } });
  }
});

// Stripe Direct Process Payment Handshake
app.post("/api/stripe/process-payment", requireDemoMode, validateBody({
  amount: { type: "number", required: true, min: 0.5, max: 1000000 },
  currency: { type: "string", maxLength: 3 },
  quoteRef: { type: "string", maxLength: 100 },
  depositType: { type: "string", maxLength: 60 },
  customerName: { type: "string", maxLength: 160 },
  customerEmail: { type: "string", maxLength: 254 },
  cardLast4: { type: "string", maxLength: 4 },
}), async (req, res) => {
  try {
    const { quoteRef, amount, currency = "gbp", depositType, customerName, customerEmail, cardLast4 } = req.body;

    const stripe = getStripeClient();

    if (stripe) {
      // In live mode with card tokens
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
        payment_method_types: ["card"],
        confirm: true,
        metadata: {
          quoteRef,
          depositType,
          customerName,
          customerEmail
        }
      });

      return res.json({
        success: true,
        paymentId: paymentIntent.id,
        requires3dSecure: paymentIntent.status === "requires_action",
        status: paymentIntent.status
      });
    } else {
      // Simulation mode
      const is3ds = Math.random() > 0.8; // simulate 3DS occasionally for fidelity testing
      return res.json({
        success: true,
        paymentId: `ch_stripe_${Math.random().toString(36).substr(2, 10)}`,
        requires3dSecure: false,
        status: "succeeded",
        simulated: true
      });
    }
  } catch (err: any) {
    console.error("Stripe Process Payment Error:", err);
    res.status(502).json({ error: { code: "PAYMENT_UNAVAILABLE", message: "Payment processing is temporarily unavailable." } });
  }
});

// Data Compliance DSAR Request Endpoint (UK GDPR)
app.post("/api/compliance/dsar-request", requireDemoMode, validateBody({
  requestType: { type: "string", required: true, maxLength: 40 },
  userEmail: { type: "string", required: true, maxLength: 254 },
  fullName: { type: "string", required: true, maxLength: 160 },
  notes: { type: "string", maxLength: 4000 },
}), (req, res) => {
  const { requestType, userEmail, fullName, notes } = req.body;
  const ticketRef = `DSAR-ICO-${Date.now().toString().slice(-6)}`;
  
  res.json({
    success: true,
    ticketRef,
    timestamp: new Date().toISOString(),
    etaDays: 30,
    requestDetails: {
      requestType: requestType || "EXPORT",
      userEmail,
      fullName,
      complianceOfficer: "dpo@smcpro.co.uk",
      legalBasis: "UK GDPR Article 15-22 / Data Protection Act 2018"
    }
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "API route not found." } });
});
app.use(safeErrorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SMC Pro API listening on port ${PORT}`);
});
