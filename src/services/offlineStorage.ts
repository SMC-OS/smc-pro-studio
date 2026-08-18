import localforage from "localforage";
import { apiFetch } from "./apiClient";

// Create distinct LocalForage instances for clean namespace separation
export const materialSpecsStore = localforage.createInstance({
  name: "SMC_PRO_OFFLINE",
  storeName: "material_specs",
  description: "Cached stone, quartz, marble, porcelain, and technical material specs"
});

export const projectDataStore = localforage.createInstance({
  name: "SMC_PRO_OFFLINE",
  storeName: "project_data",
  description: "Cached active projects, site dimensions, cut sheets, and client dossiers"
});

export const offlineActionQueue = localforage.createInstance({
  name: "SMC_PRO_OFFLINE",
  storeName: "offline_queue",
  description: "Queued operations performed while working on-site without network connectivity"
});

export const cacheMetadataStore = localforage.createInstance({
  name: "SMC_PRO_OFFLINE",
  storeName: "cache_metadata",
  description: "System cache synchronization timestamps and storage telemetry"
});

export interface MaterialSpecItem {
  id: string;
  name: string;
  category: string;
  lot: string;
  origin: string;
  mohs: string;
  thickness: string[];
  dims: string;
  pricePerSqM: number;
  description: string;
  finishes: string[];
  technicalProperties: {
    waterAbsorption: string;
    flexuralStrength: string;
    stainResistance: string;
    uvStability: string;
  };
  cachedAt: string;
}

export interface ProjectDataCacheItem {
  id: string;
  clientName: string;
  projectTitle: string;
  address: string;
  postcode: string;
  stage: string;
  totalValue: number;
  materials: string[];
  lastUpdated: string;
  rooms?: Array<{
    name: string;
    dimensions: string;
    notes?: string;
  }>;
  cachedAt: string;
}

export interface PendingOfflineAction {
  id: string;
  type: "CREATE_QUOTE" | "UPDATE_PROJECT_NOTES" | "QR_SCAN_VERIFY" | "ADD_SITE_NOTE";
  payload: any;
  timestamp: string;
  status: "PENDING" | "SYNCING" | "FAILED";
}

// -------------------------------------------------------------
// Service Worker Registration
// -------------------------------------------------------------
export async function registerServiceWorker(): Promise<boolean> {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      console.log("[SMC Pro] ServiceWorker registered with scope:", registration.scope);
      return true;
    } catch (err) {
      console.warn("[SMC Pro] ServiceWorker registration failed:", err);
      return false;
    }
  }
  return false;
}

// -------------------------------------------------------------
// Material Specs Caching
// -------------------------------------------------------------
export async function cacheMaterialSpecs(materials: MaterialSpecItem[]): Promise<number> {
  let count = 0;
  const now = new Date().toISOString();
  for (const mat of materials) {
    await materialSpecsStore.setItem(mat.id, {
      ...mat,
      cachedAt: now
    });
    count++;
  }
  await cacheMetadataStore.setItem("last_material_sync", now);
  return count;
}

export async function getCachedMaterialSpecs(): Promise<MaterialSpecItem[]> {
  const items: MaterialSpecItem[] = [];
  await materialSpecsStore.iterate((value: MaterialSpecItem) => {
    items.push(value);
  });
  return items;
}

export async function searchCachedMaterials(query: string): Promise<MaterialSpecItem[]> {
  const all = await getCachedMaterialSpecs();
  if (!query.trim()) return all;
  const q = query.toLowerCase();
  return all.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      m.lot.toLowerCase().includes(q) ||
      m.origin.toLowerCase().includes(q)
  );
}

// -------------------------------------------------------------
// Project Data Caching
// -------------------------------------------------------------
export async function cacheProjectData(projects: ProjectDataCacheItem[]): Promise<number> {
  let count = 0;
  const now = new Date().toISOString();
  for (const proj of projects) {
    await projectDataStore.setItem(proj.id, {
      ...proj,
      cachedAt: now
    });
    count++;
  }
  await cacheMetadataStore.setItem("last_project_sync", now);
  return count;
}

export async function getCachedProjects(): Promise<ProjectDataCacheItem[]> {
  const items: ProjectDataCacheItem[] = [];
  await projectDataStore.iterate((value: ProjectDataCacheItem) => {
    items.push(value);
  });
  return items;
}

// -------------------------------------------------------------
// Offline Action Queue Management
// -------------------------------------------------------------
export async function queueOfflineAction(type: PendingOfflineAction["type"], payload: any): Promise<PendingOfflineAction> {
  const action: PendingOfflineAction = {
    id: `OFFLINE-ACT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    type,
    payload,
    timestamp: new Date().toISOString(),
    status: "PENDING"
  };
  await offlineActionQueue.setItem(action.id, action);
  return action;
}

export async function getPendingOfflineActions(): Promise<PendingOfflineAction[]> {
  const actions: PendingOfflineAction[] = [];
  await offlineActionQueue.iterate((value: PendingOfflineAction) => {
    actions.push(value);
  });
  return actions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export async function removeOfflineAction(id: string): Promise<void> {
  await offlineActionQueue.removeItem(id);
}

export async function clearAllOfflineActions(): Promise<void> {
  await offlineActionQueue.clear();
}

// -------------------------------------------------------------
// Offline Queue Auto-Sync Routine
// -------------------------------------------------------------
export async function syncOfflineQueueToServer(): Promise<{ syncedCount: number; errors: number }> {
  const pending = await getPendingOfflineActions();
  if (pending.length === 0) return { syncedCount: 0, errors: 0 };

  let syncedCount = 0;
  let errors = 0;

  for (const action of pending) {
    try {
      let response: Response;
      if (action.type === "QR_SCAN_VERIFY") {
        response = await apiFetch("/api/qr/batch-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action.payload)
        });
      } else if (action.type === "CREATE_QUOTE") {
        response = await apiFetch("/api/quotes/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action.payload)
        });
      } else {
        throw new Error(`No production sync integration exists for ${action.type}.`);
      }
      if (!response.ok) {
        throw new Error(`Server rejected offline action with status ${response.status}.`);
      }
      await removeOfflineAction(action.id);
      syncedCount++;
    } catch (e) {
      console.warn(`[SMC Pro Offline] Failed to sync action ${action.id}:`, e);
      await offlineActionQueue.setItem(action.id, { ...action, status: "FAILED" });
      errors++;
    }
  }

  await cacheMetadataStore.setItem("last_queue_sync", new Date().toISOString());
  return { syncedCount, errors };
}

// -------------------------------------------------------------
// Cache Telemetry & Metadata
// -------------------------------------------------------------
export async function getOfflineCacheTelemetry() {
  const materials = await getCachedMaterialSpecs();
  const projects = await getCachedProjects();
  const pendingActions = await getPendingOfflineActions();

  const lastMaterialSync = (await cacheMetadataStore.getItem<string>("last_material_sync")) || null;
  const lastProjectSync = (await cacheMetadataStore.getItem<string>("last_project_sync")) || null;
  const lastQueueSync = (await cacheMetadataStore.getItem<string>("last_queue_sync")) || null;

  // Approximate storage payload size
  const totalJsonString = JSON.stringify({ materials, projects, pendingActions });
  const estimatedBytes = new Blob([totalJsonString]).size;
  const estimatedKb = Math.round(estimatedBytes / 1024);

  return {
    materialsCount: materials.length,
    projectsCount: projects.length,
    pendingActionsCount: pendingActions.length,
    lastMaterialSync,
    lastProjectSync,
    lastQueueSync,
    estimatedKb,
    isStorageAvailable: true
  };
}

export async function clearAllOfflineCache(): Promise<void> {
  await materialSpecsStore.clear();
  await projectDataStore.clear();
  await offlineActionQueue.clear();
  await cacheMetadataStore.clear();
}
