import { Capacitor, registerPlugin } from "@capacitor/core";

interface ListenerHandle {
  remove(): Promise<void>;
}

interface AppUrlOpenEvent {
  url: string;
}

interface NativeAppPlugin {
  addListener(
    eventName: "appUrlOpen",
    listener: (event: AppUrlOpenEvent) => void | Promise<void>,
  ): Promise<ListenerHandle>;
  getLaunchUrl(): Promise<{ url?: string }>;
}

interface NativeBrowserPlugin {
  open(options: { url: string }): Promise<void>;
  close(): Promise<void>;
}

const NativeApp = registerPlugin<NativeAppPlugin>("App");
const NativeBrowser = registerPlugin<NativeBrowserPlugin>("Browser");

const HTTPS_HOSTS = new Set(["smcprostudio.app", "staging.smcprostudio.app"]);
const ROUTE_PREFIXES = [
  "/auth/callback",
  "/auth/reset-password",
  "/projects",
  "/quote-requests",
  "/quotes",
  "/studio",
  "/payments/return",
  "/profile",
  "/settings",
  "/support",
];

export function routeFromNativeUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol === "https:") {
    if (!HTTPS_HOSTS.has(url.hostname)) return null;
    if (!ROUTE_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  if (url.protocol === "smcprostudio:") {
    // Canonical fallback: smcprostudio://auth-callback
    if (url.hostname === "auth-callback") {
      return `/auth/callback${url.search}${url.hash}`;
    }
    // Compatibility with the earlier smcprostudio://auth/callback form.
    if (url.hostname === "auth" && url.pathname === "/callback") {
      return `/auth/callback${url.search}${url.hash}`;
    }
  }

  return null;
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function openExternalUrl(rawUrl: string): Promise<void> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("Only secure HTTPS links can be opened.");

  if (isNativeApp()) {
    await NativeBrowser.open({ url: url.toString() });
    return;
  }
  window.location.assign(url.toString());
}

export async function closeNativeBrowser(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await NativeBrowser.close();
  } catch {
    // Browser can already be closed when Android dispatches the App Link.
  }
}

export async function installNativeUrlListener(
  listener: (rawUrl: string) => void | Promise<void>,
): Promise<() => Promise<void>> {
  if (!isNativeApp()) return async () => undefined;

  const handle = await NativeApp.addListener("appUrlOpen", (event) => listener(event.url));

  try {
    const launch = await NativeApp.getLaunchUrl();
    if (launch.url) await listener(launch.url);
  } catch {
    // No launch URL is a normal cold-start state.
  }

  return () => handle.remove();
}
