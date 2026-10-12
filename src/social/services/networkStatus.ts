import { useSyncExternalStore } from "react";

/**
 * V1-7: the app's single source of truth for connectivity.
 *
 * One pair of `online`/`offline` listeners is attached to `window` the first
 * time anything subscribes, and shared by every subscriber — pages never add
 * their own listeners. `navigator.onLine === false` reliably means "no
 * connection"; `true` only means "probably connected", so request failures
 * are still classified separately (see networkErrors.ts).
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
