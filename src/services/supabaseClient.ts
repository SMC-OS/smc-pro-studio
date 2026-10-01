import { Capacitor } from "@capacitor/core";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authStorage } from "./authStorage";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/$/, "");
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim();

export class SupabaseConfigurationError extends Error {
  constructor(message = "Supabase authentication is not configured for this environment.") {
    super(message);
    this.name = "SupabaseConfigurationError";
  }
}

function validConfiguration(): boolean {
  if (!supabaseUrl || !supabasePublishableKey) return false;
  try {
    const url = new URL(supabaseUrl);
    const localDevelopment = import.meta.env.DEV && ["localhost", "127.0.0.1"].includes(url.hostname);
    return url.protocol === "https:" || localDevelopment;
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = validConfiguration();
let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured || !supabaseUrl || !supabasePublishableKey) throw new SupabaseConfigurationError();
  if (!client) {
    client = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        flowType: "pkce",
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: authStorage,
      },
    });
  }
  return client;
}

export async function getAuthAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

export function getAuthRedirectUrl(path = "/auth/callback"): string {
  const configuredWebUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.trim().replace(/\/$/, "");
  if (Capacitor.isNativePlatform()) return `smcprostudio://${path.replace(/^\//, "")}`;
  if (configuredWebUrl) {
    const url = new URL(configuredWebUrl);
    const localDevelopment = import.meta.env.DEV && ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !localDevelopment) throw new SupabaseConfigurationError("VITE_APP_URL must use HTTPS.");
    return `${url.toString().replace(/\/$/, "")}${path}`;
  }
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  throw new SupabaseConfigurationError("An authentication redirect URL is required.");
}
