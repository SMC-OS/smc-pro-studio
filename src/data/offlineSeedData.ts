import { MaterialSpecItem, ProjectDataCacheItem } from "../services/offlineStorage";

/**
 * Phase 5 Gate 0 purge.
 *
 * This module previously seeded the offline cache — on every app load,
 * unconditionally — with five fabricated material specs (invented lot
 * numbers, invented country-of-origin claims, invented £/m² prices,
 * invented flexural-strength/stain-resistance/UV-stability figures) and
 * three fabricated "cached projects" naming invented clients ("Alexander
 * Wright", "Lady Victoria Sterling", "Dr. Jonathan Hayes") at invented
 * addresses with invented project values (£64,500 / £92,000 / £38,200).
 * None of it was ever real data, so anyone opening the Offline Manager
 * would see fabricated client and pricing records presented as genuine
 * cached data.
 *
 * Per the approved Gate 0 decision ("never copy legacy values into a
 * database/fixture/fallback/replacement array"), both seed lists are now
 * empty. The offline cache starts empty and is populated only from real
 * data once the app is online — see tasks/todo.md's Gate 0 entry.
 */
export const INITIAL_OFFLINE_MATERIAL_SPECS: MaterialSpecItem[] = [];

export const INITIAL_OFFLINE_PROJECTS: ProjectDataCacheItem[] = [];
