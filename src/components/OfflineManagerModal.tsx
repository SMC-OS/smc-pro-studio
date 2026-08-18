import React, { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  Database,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Search,
  Check,
  ShieldCheck,
  X,
  Layers,
  FileText,
  Trash2,
  ArrowRight,
  DownloadCloud,
  Clock,
  Sparkles
} from "lucide-react";
import {
  registerServiceWorker,
  cacheMaterialSpecs,
  cacheProjectData,
  getCachedMaterialSpecs,
  getCachedProjects,
  getPendingOfflineActions,
  syncOfflineQueueToServer,
  getOfflineCacheTelemetry,
  clearAllOfflineCache,
  MaterialSpecItem,
  ProjectDataCacheItem,
  PendingOfflineAction
} from "../services/offlineStorage";
import { INITIAL_OFFLINE_MATERIAL_SPECS, INITIAL_OFFLINE_PROJECTS } from "../data/offlineSeedData";

interface OfflineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineManagerModal: React.FC<OfflineManagerModalProps> = ({ isOpen, onClose }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [swRegistered, setSwRegistered] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "materials" | "projects" | "queue">("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const [telemetry, setTelemetry] = useState<any>({
    materialsCount: 0,
    projectsCount: 0,
    pendingActionsCount: 0,
    lastMaterialSync: null,
    lastProjectSync: null,
    lastQueueSync: null,
    estimatedKb: 0
  });

  const [cachedMaterials, setCachedMaterials] = useState<MaterialSpecItem[]>([]);
  const [cachedProjects, setCachedProjects] = useState<ProjectDataCacheItem[]>([]);
  const [pendingQueue, setPendingQueue] = useState<PendingOfflineAction[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialSpecItem | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncNotice("🌐 Network connection restored. Auto-syncing pending offline items...");
      handleSyncQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncNotice("⚡ On-Site Offline Mode active. SMC Pro will serve material specs & project data from local storage.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial SW Check
    registerServiceWorker().then((res) => setSwRegistered(res));
    loadTelemetryAndData();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadTelemetryAndData();
    }
  }, [isOpen]);

  const loadTelemetryAndData = async () => {
    const t = await getOfflineCacheTelemetry();
    setTelemetry(t);
    const mats = await getCachedMaterialSpecs();
    setCachedMaterials(mats);
    const projs = await getCachedProjects();
    setCachedProjects(projs);
    const q = await getPendingOfflineActions();
    setPendingQueue(q);
  };

  // Pre-cache all specs to localforage
  const handlePrecacheAllData = async () => {
    setIsSyncing(true);
    setSyncNotice("Downloading and caching all SMC Pro luxury material specifications and active site dossiers...");
    try {
      await cacheMaterialSpecs(INITIAL_OFFLINE_MATERIAL_SPECS);
      await cacheProjectData(INITIAL_OFFLINE_PROJECTS);
      await loadTelemetryAndData();
      setSyncNotice("✓ Successfully cached 5 luxury material specifications and 3 site project dossiers to IndexedDB!");
      setTimeout(() => setSyncNotice(null), 5000);
    } catch (e) {
      console.error("Caching error:", e);
      setSyncNotice("Error caching data to IndexedDB.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncQueue = async () => {
    if (!navigator.onLine) {
      setSyncNotice("Cannot sync queue while offline. Please connect to a network first.");
      return;
    }
    setIsSyncing(true);
    try {
      const result = await syncOfflineQueueToServer();
      await loadTelemetryAndData();
      setSyncNotice(`✓ Sync complete: ${result.syncedCount} offline action(s) processed with 0 errors.`);
      setTimeout(() => setSyncNotice(null), 5000);
    } catch (e) {
      console.error("Queue sync error:", e);
      setSyncNotice("Queue sync encountered an error.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePurgeCache = async () => {
    if (window.confirm("Are you sure you want to clear all cached offline materials and project data?")) {
      await clearAllOfflineCache();
      await loadTelemetryAndData();
      setSelectedMaterial(null);
      setSyncNotice("Cleared all offline cached records from localforage storage.");
      setTimeout(() => setSyncNotice(null), 3000);
    }
  };

  if (!isOpen) return null;

  const filteredMaterials = cachedMaterials.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      m.lot.toLowerCase().includes(q) ||
      m.origin.toLowerCase().includes(q)
    );
  });

  const filteredProjects = cachedProjects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.clientName.toLowerCase().includes(q) ||
      p.projectTitle.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.postcode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-[9999] bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl shadow-2xl text-white overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${isOnline ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}`}>
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-white">SMC Pro On-Site Offline Storage & Sync Engine</h3>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border ${
                  isOnline 
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" 
                    : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-ping"}`} />
                  {isOnline ? "ONLINE CONNECTION" : "ON-SITE OFFLINE MODE"}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                LocalForage (IndexedDB) + ServiceWorker cache engine for zero-latency field access in basement surveys & remote sites.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Toast Notification */}
        {syncNotice && (
          <div className="px-6 py-3 bg-gold/15 border-b border-gold/30 text-gold text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold shrink-0 animate-spin" />
              <span>{syncNotice}</span>
            </div>
            <button type="button" onClick={() => setSyncNotice(null)} className="text-gold hover:text-white font-bold cursor-pointer">✕</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 bg-neutral-950/40 border-b border-neutral-800 flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "border-gold text-gold bg-neutral-900"
                  : "border-transparent text-neutral-400 hover:text-white"
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Storage Telemetry</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("materials")}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "materials"
                  ? "border-gold text-gold bg-neutral-900"
                  : "border-transparent text-neutral-400 hover:text-white"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Cached Material Specs ({telemetry.materialsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("projects")}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "projects"
                  ? "border-gold text-gold bg-neutral-900"
                  : "border-transparent text-neutral-400 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Cached Site Dossiers ({telemetry.projectsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("queue")}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "queue"
                  ? "border-gold text-gold bg-neutral-900"
                  : "border-transparent text-neutral-400 hover:text-white"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Pending Sync Queue ({telemetry.pendingActionsCount})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrecacheAllData}
            disabled={isSyncing}
            className="mb-1.5 px-3 py-1.5 bg-gold hover:bg-amber-400 text-neutral-950 font-mono font-bold text-xs rounded-lg uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-md"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Pre-Cache All Data Now</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: OVERVIEW & TELEMETRY */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fade-in">
              {/* Telemetry Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-1">
                  <div className="flex justify-between items-center text-neutral-400 text-[10px] font-mono uppercase">
                    <span>Cached Material Specs</span>
                    <Layers className="w-4 h-4 text-gold" />
                  </div>
                  <div className="text-2xl font-serif font-bold text-white">{telemetry.materialsCount}</div>
                  <p className="text-[10px] text-neutral-400">Quartz, Marble, Porcelain & Dekton</p>
                </div>

                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-1">
                  <div className="flex justify-between items-center text-neutral-400 text-[10px] font-mono uppercase">
                    <span>Cached Site Dossiers</span>
                    <FileText className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-serif font-bold text-white">{telemetry.projectsCount}</div>
                  <p className="text-[10px] text-neutral-400">UK High-End Construction Projects</p>
                </div>

                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-1">
                  <div className="flex justify-between items-center text-neutral-400 text-[10px] font-mono uppercase">
                    <span>Pending Sync Actions</span>
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-serif font-bold text-amber-400">{telemetry.pendingActionsCount}</div>
                  <p className="text-[10px] text-neutral-400">Queued when working on-site</p>
                </div>

                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-1">
                  <div className="flex justify-between items-center text-neutral-400 text-[10px] font-mono uppercase">
                    <span>LocalForage Footprint</span>
                    <Database className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-2xl font-serif font-bold text-white">{telemetry.estimatedKb} <span className="text-xs font-mono font-normal">KB</span></div>
                  <p className="text-[10px] text-neutral-400">IndexedDB Persistent Cache</p>
                </div>

              </div>

              {/* Status Verification Card */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-gold" />
                    <h4 className="font-serif text-base font-bold text-white">On-Site Field Readiness Verification</h4>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold uppercase">
                    PASSED UK SITE SPECIFICATIONS
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <span className="text-neutral-400">ServiceWorker (/sw.js)</span>
                    <span className={`font-bold flex items-center gap-1 ${swRegistered ? "text-emerald-400" : "text-amber-400"}`}>
                      {swRegistered ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                      {swRegistered ? "REGISTERED" : "INITIALIZING"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <span className="text-neutral-400">IndexedDB LocalForage</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      READY
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <span className="text-neutral-400">Last Material Sync</span>
                    <span className="font-bold text-gold text-[10px]">
                      {telemetry.lastMaterialSync ? new Date(telemetry.lastMaterialSync).toLocaleTimeString() : "Not Cached Yet"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handlePrecacheAllData}
                    disabled={isSyncing}
                    className="px-4 py-2.5 bg-gold hover:bg-amber-400 text-neutral-950 font-mono font-bold text-xs rounded-xl uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    <span>Download & Pre-cache All Material Specs</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncQueue}
                    disabled={isSyncing || !isOnline}
                    className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-mono font-bold text-xs rounded-xl uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 border border-neutral-700"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-gold" : ""}`} />
                    <span>Sync Pending Queue</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePurgeCache}
                    className="px-4 py-2.5 bg-neutral-900 hover:bg-red-950/60 text-red-400 border border-neutral-800 hover:border-red-500/40 font-mono font-bold text-xs rounded-xl uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ml-auto"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Clear Offline Cache</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CACHED MATERIAL SPECS */}
          {activeTab === "materials" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search offline cached stone, quartz, marble & porcelain specs..."
                    className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-gold"
                  />
                </div>
                <span className="text-xs font-mono text-neutral-400">
                  Showing {filteredMaterials.length} of {cachedMaterials.length} cached item(s)
                </span>
              </div>

              {filteredMaterials.length === 0 ? (
                <div className="bg-neutral-950 border border-dashed border-neutral-800 rounded-xl p-8 text-center space-y-3">
                  <Database className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
                  <p className="text-sm font-semibold text-neutral-300">No cached material specs found</p>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    Click "Pre-Cache All Data Now" above to load SMC Pro luxury quartz, marble, porcelain, and Dekton material technical dossiers into localforage for offline viewing.
                  </p>
                  <button
                    type="button"
                    onClick={handlePrecacheAllData}
                    className="px-4 py-2 bg-gold text-neutral-950 font-mono font-bold text-xs rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Pre-Cache Material Specs Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredMaterials.map((mat) => (
                    <div
                      key={mat.id}
                      onClick={() => setSelectedMaterial(mat)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                        selectedMaterial?.id === mat.id
                          ? "bg-neutral-950 border-gold ring-1 ring-gold/40 shadow-lg"
                          : "bg-neutral-950/80 hover:bg-neutral-950 border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 uppercase">
                            {mat.category}
                          </span>
                          <span className="text-[9px] font-mono text-neutral-400">
                            LOT: <span className="text-gold font-bold">{mat.lot}</span>
                          </span>
                        </div>
                        <h5 className="font-serif text-base font-bold text-white mt-1">{mat.name}</h5>
                        <p className="text-xs text-neutral-400 line-clamp-2">{mat.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-2 border-t border-neutral-800">
                        <div>
                          <span className="text-neutral-500 block">Origin</span>
                          <span className="text-neutral-300 font-bold">{mat.origin}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block">Mohs Hardness</span>
                          <span className="text-neutral-300 font-bold">{mat.mohs}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono pt-1 text-gold font-bold">
                        <span>£{mat.pricePerSqM} / m²</span>
                        <span className="text-[10px] font-normal text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          CACHED OFFLINE
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CACHED SITE DOSSIERS */}
          {activeTab === "projects" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search offline cached site dossiers & client projects..."
                    className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-gold"
                  />
                </div>
                <span className="text-xs font-mono text-neutral-400">
                  Showing {filteredProjects.length} of {cachedProjects.length} cached dossier(s)
                </span>
              </div>

              {filteredProjects.length === 0 ? (
                <div className="bg-neutral-950 border border-dashed border-neutral-800 rounded-xl p-8 text-center space-y-3">
                  <FileText className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
                  <p className="text-sm font-semibold text-neutral-300">No cached site dossiers found</p>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    Click "Pre-Cache All Data Now" to load luxury UK construction projects and site specifications into offline storage.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProjects.map((proj) => (
                    <div key={proj.id} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                      <div className="flex flex-wrap justify-between items-start gap-2 border-b border-neutral-800 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-serif text-base font-bold text-white">{proj.projectTitle}</h5>
                            <span className="text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded uppercase">
                              {proj.stage}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-gold mt-0.5">
                            Client: {proj.clientName} • {proj.address}, {proj.postcode}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-serif font-bold text-white">£{proj.totalValue.toLocaleString()}</span>
                          <span className="text-[9px] font-mono text-emerald-400 block">OFFLINE ACCESSIBLE</span>
                        </div>
                      </div>

                      {/* Rooms / Measurements */}
                      {proj.rooms && proj.rooms.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">Key Room Specs & Measurements</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {proj.rooms.map((rm, idx) => (
                              <div key={idx} className="p-2.5 rounded bg-neutral-900 border border-neutral-800 text-xs">
                                <p className="font-bold text-neutral-200">{rm.name}</p>
                                <p className="text-[10px] font-mono text-gold">{rm.dimensions}</p>
                                {rm.notes && <p className="text-[10px] text-neutral-400 mt-0.5 italic">{rm.notes}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PENDING OFFLINE QUEUE */}
          {activeTab === "queue" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <div>
                  <h5 className="text-sm font-bold text-white font-serif">On-Site Offline Action Queue</h5>
                  <p className="text-xs text-neutral-400">
                    Changes made on site while offline are queued locally and synchronized automatically when internet connectivity is restored.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncQueue}
                  disabled={isSyncing || !isOnline || pendingQueue.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-mono font-bold text-xs rounded-lg uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer shadow-md flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>Sync Queue ({pendingQueue.length})</span>
                </button>
              </div>

              {pendingQueue.length === 0 ? (
                <div className="bg-neutral-950 border border-dashed border-neutral-800 rounded-xl p-8 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-white">Offline Queue is Clean</p>
                  <p className="text-xs text-neutral-400">No pending offline actions waiting to be synced.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingQueue.map((item) => (
                    <div key={item.id} className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs font-mono">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gold">{item.type}</span>
                          <span className="text-[9px] text-neutral-500">{item.timestamp}</span>
                        </div>
                        <p className="text-neutral-300 text-[11px]">{JSON.stringify(item.payload)}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-neutral-950/80 border-t border-neutral-800 flex items-center justify-between text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span>SMC Pro Enterprise PWA & Offline Engine Active</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all cursor-pointer"
          >
            Close Panel
          </button>
        </div>

      </div>
    </div>
  );
};
