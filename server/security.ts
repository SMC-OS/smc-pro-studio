import type { NextFunction, Request, RequestHandler, Response } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface AuthenticatedPrincipal {
  subject: string;
  email?: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      principal?: AuthenticatedPrincipal;
    }
  }
}

const isProduction = process.env.NODE_ENV === "production";

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

export function controlledCors(req: Request, res: Response, next: NextFunction) {
  const origin = req.get("Origin");
  if (!origin) return next();

  if (!allowedOrigins.has(origin)) {
    return res.status(403).json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "Request origin is not allowed." } });
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function rateLimit(options: { windowMs: number; max: number }): RequestHandler {
  const clients = new Map<string, RateLimitEntry>();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const current = clients.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 1, resetAt: now + options.windowMs }
      : { count: current.count + 1, resetAt: current.resetAt };

    clients.set(key, entry);
    res.setHeader("RateLimit-Limit", options.max.toString());
    res.setHeader("RateLimit-Remaining", Math.max(0, options.max - entry.count).toString());
    res.setHeader("RateLimit-Reset", Math.ceil(entry.resetAt / 1000).toString());

    if (entry.count > options.max) {
      return res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." } });
    }
    next();
  };
}

function bearerToken(req: Request): string | null {
  const authorization = req.get("Authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7).trim();
    if (token) return token;
  }

  const cookie = req.get("Cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("smc_access_token="));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice("smc_access_token=".length)) || null;
  } catch {
    return null;
  }
}

let supabaseAuthClient: SupabaseClient | null = null;
let supabasePrivilegedClient: SupabaseClient | null = null;

function configuredSupabaseClient(secret = false): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = (secret ? process.env.SUPABASE_SECRET_KEY : process.env.SUPABASE_PUBLISHABLE_KEY)?.trim();
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (isProduction && parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }
  const current = secret ? supabasePrivilegedClient : supabaseAuthClient;
  if (current) return current;
  const created = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  if (secret) supabasePrivilegedClient = created;
  else supabaseAuthClient = created;
  return created;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authClient = configuredSupabaseClient(false);
  if (!authClient) {
    return res.status(503).json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Authentication is not configured." } });
  }

  const token = bearerToken(req);
  if (!token) {
    return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required." } });
  }

  try {
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication failed." } });
    }
    const roles = ["user"];
    const privilegedClient = configuredSupabaseClient(true);
    if (privilegedClient) {
      const { data: assignedRoles, error: roleError } = await privilegedClient
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .is("revoked_at", null);
      if (roleError) return res.status(503).json({ error: { code: "AUTHORIZATION_UNAVAILABLE", message: "Authorization is temporarily unavailable." } });
      for (const assignment of assignedRoles ?? []) {
        if (typeof assignment.role === "string" && !roles.includes(assignment.role)) roles.push(assignment.role);
      }
    }
    req.principal = {
      subject: data.user.id,
      email: data.user.email,
      roles,
    };
    next();
  } catch {
    return res.status(503).json({ error: { code: "AUTH_UNAVAILABLE", message: "Authentication is temporarily unavailable." } });
  }
}

export function requireRole(...roles: string[]): RequestHandler {
  return (req, res, next) => {
    if (!req.principal || !roles.some((role) => req.principal?.roles.includes(role))) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "You are not authorized for this operation." } });
    }
    next();
  };
}

export function requireDemoMode(_req: Request, res: Response, next: NextFunction) {
  if (isProduction || process.env.ENABLE_DEMO_FEATURES !== "true") {
    return res.status(503).json({
      error: { code: "INTEGRATION_UNAVAILABLE", message: "This feature requires a configured production integration." },
    });
  }
  next();
}

export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
  }
}

export function objectBody(req: Request): Record<string, unknown> {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw new RequestValidationError("Request body must be a JSON object.");
  }
  return req.body as Record<string, unknown>;
}

export function optionalString(body: Record<string, unknown>, key: string, maxLength: number): string | undefined {
  const value = body[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new RequestValidationError(`${key} must be a string no longer than ${maxLength} characters.`);
  }
  return value.trim();
}

export function requiredString(body: Record<string, unknown>, key: string, maxLength: number): string {
  const value = optionalString(body, key, maxLength);
  if (!value) throw new RequestValidationError(`${key} is required.`);
  return value;
}

type FieldRule =
  | { type: "string"; required?: boolean; maxLength: number }
  | { type: "number"; required?: boolean; min?: number; max?: number }
  | { type: "array"; required?: boolean; maxItems: number };

export function validateBody(schema: Record<string, FieldRule>): RequestHandler {
  return (req, _res, next) => {
    try {
      const body = objectBody(req);
      for (const [key, rule] of Object.entries(schema)) {
        const value = body[key];
        if (value === undefined || value === null || value === "") {
          if (rule.required) throw new RequestValidationError(`${key} is required.`);
          continue;
        }
        if (rule.type === "string" && (typeof value !== "string" || value.length > rule.maxLength)) {
          throw new RequestValidationError(`${key} must be a string no longer than ${rule.maxLength} characters.`);
        }
        if (rule.type === "number" && (
          typeof value !== "number" || !Number.isFinite(value) ||
          (rule.min !== undefined && value < rule.min) ||
          (rule.max !== undefined && value > rule.max)
        )) {
          throw new RequestValidationError(`${key} must be a valid number within the allowed range.`);
        }
        if (rule.type === "array" && (!Array.isArray(value) || value.length > rule.maxItems)) {
          throw new RequestValidationError(`${key} must be an array with at most ${rule.maxItems} items.`);
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function safeErrorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof RequestValidationError) {
    return res.status(422).json({ error: { code: "VALIDATION_ERROR", message: error.message } });
  }
  if (error instanceof SyntaxError) {
    return res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body contains invalid JSON." } });
  }
  console.error("Unhandled API error", error);
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } });
}
