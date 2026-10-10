import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  controlledCors,
  rateLimit,
  requireAuth,
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
    authenticationConfigured: Boolean(
      process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY,
    ),
    integrations: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      payments: false,
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

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

app.post(
  "/api/gemini/chat",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }),
  validateBody({
    messages: { type: "array", required: true, maxItems: 40 },
  }),
  async (req, res) => {
    try {
      const { messages } = req.body;
      if (!Array.isArray(messages)) {
        return res.status(400).json({
          error: { code: "INVALID_MESSAGES", message: "A messages array is required." },
        });
      }

      const contents = messages.map((message: unknown) => {
        const value = message as { role?: unknown; content?: unknown };
        return {
          role: value.role === "assistant" ? "model" : "user",
          parts: [{ text: typeof value.content === "string" ? value.content : "" }],
        };
      });

      const response = await getGeminiClient().models.generateContent({
        model: "gemini-3.6-flash",
        contents,
        config: {
          systemInstruction: `You are the SMC Pro Studio technical assistant for homeowners and construction professionals.

Use British English. Give concise, practical guidance about stone, surfaces, renovation planning, fabrication concepts, installation preparation and aftercare.

Important limits:
- Never invent a price, stock level, booking slot, project status, certification, warranty term, test result or manufacturer specification.
- Never present an approximate measurement as a professional template or survey.
- For exact material performance, safety or fabrication specifications, tell the user to verify the current manufacturer technical data sheet.
- For pricing, direct the user to the formal quote workflow in SMC Pro Studio.
- For project-specific status, payments, appointments or documents, direct the user to the relevant Project workspace.
- Do not claim to have performed inspections, scans, measurements, certifications or warehouse checks that you have not actually performed.
- Keep safety advice conservative, especially for fabrication dust, lifting, electrical, gas, structural or site work.`,
        },
      });

      return res.json({
        reply:
          response.text ||
          "I could not generate an answer. Please try again or contact your project professional.",
      });
    } catch (error) {
      console.error("Gemini API Error:", error);
      return res.status(502).json({
        error: {
          code: "AI_UNAVAILABLE",
          message: "The technical assistant is temporarily unavailable.",
        },
      });
    }
  },
);

app.use((_req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "API route not found." },
  });
});

app.use(safeErrorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SMC Pro API listening on port ${PORT}`);
});
