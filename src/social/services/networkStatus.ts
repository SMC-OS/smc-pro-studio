import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";

/**
 * V1-7: the app's single source of truth for connectivity.
 *
 * Exactly one source feeds this store, attached the first time anything
 * subscribes and shared by every subscriber (pages never add their own):
 * - Web: one pair of `online`/`offline` listeners on `window`.
 *   `navigator.onLine === false` reliably means "no connection"; `true` only
 *   means "probably connected", so request failures are still classified
 *   separately (see networkErrors.ts).
 * - Native (Phase M1): the official @capacitor/network plugin, backed by the
 *   OS connectivity APIs. Android WebView does not reliably fire
 *   `online`/`offline` or keep `navigator.onLine` current, so the window
 *   events are not used there at all (one source, never two).
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let attached = false;
let online = typeof navigator === "undefined" || typeof navigator.onLine !== "boolean" ? true : navigator.onLine;

function set(next: boolean) {
  if (next === online) return;
  online = next;
  for (const listener of [...listeners]) listener();
}

function attach() {
  if (attached || typeof window === "undefined") return;
  attached = true;
  if (Capacitor.isNativePlatform()) {
    void Network.addListener("networkStatusChange", (status) => set(status.connected));
    void Network.getStatus()
      .then((status) => set(status.connected))
      .catch(() => undefined); // keep the optimistic default; request failures are still classified
    return;
  }
  window.addEventListener("online", () => set(true));
  window.addEventListener("offline", () => set(false));
}

export function subscribeToNetworkStatus(listener: Listener): () => void {
  attach();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isOnline(): boolean {
  return online;
}

/** React hook: true while the device reports a connection. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribeToNetworkStatus, isOnline, () => true);
}
