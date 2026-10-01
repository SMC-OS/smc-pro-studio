import { Capacitor } from "@capacitor/core";
import { KeychainAccess, SecureStorage } from "@aparajita/capacitor-secure-storage";

/**
 * The one storage abstraction for Supabase Auth (session + PKCE code verifier).
 *
 * - Web: the browser's sessionStorage, unchanged from before Phase M1. The
 *   session ends with the tab.
 * - Native (iOS/Android): OS-backed secure storage, so a member stays signed in
 *   across background/foreground, app restarts and device restarts.
 *     iOS      Keychain, `afterFirstUnlockThisDeviceOnly`: readable for token
 *              refresh after the first unlock, never synced to iCloud and
 *              never restored onto another device.
 *     Android  AES-256-GCM, key generated and held in the Android Keystore;
 *              ciphertext lives in app-private storage (excluded from backup
 *              and device transfer: res/xml/data_extraction_rules.xml).
 *   Before Phase M1 native sessions lived in memory only and were lost on
 *   every restart; that also broke PKCE links opened after the OS reclaimed
 *   the app.
 *
 * Nothing here ever logs keys or values. Failures are deliberately quiet:
 * - read failure → `null` (as if nothing is stored), never a deletion, so a
 *   transient Keychain/Keystore error cannot sign anyone out;
 * - write/remove failure → swallowed; the session stays valid in memory for
 *   this run and is persisted again on the next token refresh.
 */
export interface AuthStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

/** Secure-storage plugin surface we rely on (narrowed for testability). */
export interface SecureStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  setKeyPrefix(prefix: string): Promise<void>;
  setSynchronize(sync: boolean): Promise<void>;
  setDefaultKeychainAccess(access: KeychainAccess): Promise<void>;
}

export const NATIVE_KEY_PREFIX = "smc_auth_";

export function createSecureAuthStorage(plugin: SecureStorageLike): AuthStorage {
  let ready: Promise<void> | null = null;
  const configure = () =>
    (ready ??= Promise.all([
      plugin.setKeyPrefix(NATIVE_KEY_PREFIX),
      plugin.setSynchronize(false),
      plugin.setDefaultKeychainAccess(KeychainAccess.afterFirstUnlockThisDeviceOnly),
    ]).then(() => undefined));

  return {
    async getItem(key) {
      try {
        await configure();
        return (await plugin.getItem(key)) ?? null;
      } catch {
        return null;
      }
    },
    async setItem(key, value) {
      try {
        await configure();
        await plugin.setItem(key, value);
      } catch {
        // Keep the in-memory session; persistence is retried on the next save.
      }
    },
    async removeItem(key) {
      try {
        await configure();
        await plugin.removeItem(key);
      } catch {
        // Nothing to do; a stale entry is replaced on the next save.
      }
    },
  };
}

export function createBrowserAuthStorage(getStore: () => Storage | undefined): AuthStorage {
  return {
    getItem: (key) => getStore()?.getItem(key) ?? null,
    setItem: (key, value) => getStore()?.setItem(key, value),
    removeItem: (key) => getStore()?.removeItem(key),
  };
}

export function selectAuthStorage(
  isNative: boolean,
  secure: SecureStorageLike = SecureStorage as unknown as SecureStorageLike,
): AuthStorage {
  return isNative
    ? createSecureAuthStorage(secure)
    : createBrowserAuthStorage(() => (typeof window === "undefined" ? undefined : window.sessionStorage));
}

export const authStorage: AuthStorage = selectAuthStorage(Capacitor.isNativePlatform());
