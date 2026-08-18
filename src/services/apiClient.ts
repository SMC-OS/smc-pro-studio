import { Capacitor } from "@capacitor/core";
import { getAuthAccessToken } from "./supabaseClient";

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, "");

export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiConfigurationError";
  }
}

function getApiBaseUrl(): string {
  if (configuredBaseUrl) {
    const url = new URL(configuredBaseUrl);
    const isLocalDevelopment = import.meta.env.DEV && ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !isLocalDevelopment) {
      throw new ApiConfigurationError("VITE_API_BASE_URL must use HTTPS outside local development.");
    }
    return url.toString().replace(/\/$/, "");
  }

  if (Capacitor.isNativePlatform()) {
    throw new ApiConfigurationError("The native app requires VITE_API_BASE_URL to be configured.");
  }

  return "";
}

export function apiUrl(path: string): string {
  if (!path.startsWith("/api/")) {
    throw new ApiConfigurationError("API paths must begin with /api/.");
  }
  return `${getApiBaseUrl()}${path}`;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);

  try {
    const accessToken = await getAuthAccessToken();
    return await fetch(apiUrl(path), {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}
