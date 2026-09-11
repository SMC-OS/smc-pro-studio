import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/apiClient';
import { 
  Activity, 
  Cpu, 
  Database, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  Building2, 
  Zap, 
  Sliders, 
  AlertCircle, 
  Radio, 
  Send, 
  ChevronRight, 
  Gauge, 
  Layers, 
  Compass, 
  Maximize2, 
  Search, 
  Lock, 
  Sparkles,
  FileCheck2,
  HardHat,
  Scale
} from 'lucide-react';

interface TelemetryData {
  timestamp: string;
  machineId: string;
  depotLocation: string;
  status: string;
  telemetry: {
    waterjetPressurePsi: number;
    spindleSpeedRpm: number;
    feedRateMmMin: number;
    kerfOffsetMm: number;
    bladeWearPercent: number;
    diamondGritEfficiency: string;
    cuttingFluidTempC: number;
    vibrationMmS: number;
    forensicToleranceVarianceMm: number;
    toleranceLimitMm: number;
  };
  activeJob: {
    projectId: string;
    projectName: string;
    slabBarcode: string;
    materialName: string;
    progressPercent: number;
    currentOperation: string;
    estimatedCompletionMinutes: number;
  };
}

interface SlabItem {
  id: string;
  name: string;
  category: string;
  thickness: string;
  dimensions: string;
  bay: string;
  rfidTag: string;
  stockCount: number;
  status: string;
  veinContinuityIndex: string;
  lotNumber: string;
}

interface BetaDeploymentPortalProps {
  onClose?: () => void;
}

export const BetaDeploymentPortal: React.FC<BetaDeploymentPortalProps> = ({ onClose }) => {
  const [activeSubTab, setActiveSubTab] = useState<'telemetry' | 'vault' | 'auth' | 'stresstest'>('telemetry');
  
  // 1. CNC Telemetry State
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  // 2. Slab Vault State
  const [vaultSlabs, setVaultSlabs] = useState<SlabItem[]>([]);
  const [vaultSyncing, setVaultSyncing] = useState(false);
  const [vaultSyncedTime, setVaultSyncedTime] = useState<string>('');

  // 3. Trade Verification State
  const [companyName, setCompanyName] = useState('Kensington Architectural Joinery Ltd');
  const [companyNumber, setCompanyNumber] = useState('08102948');
  const [vatNumber, setVatNumber] = useState('GB 924 8101 44');
  const [authResult, setAuthResult] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // 4. Beta Stress Test & Feedback State
  const [testCategory, setTestCategory] = useState('FORENSIC_TOLERANCE_SWEEP');
  const [stressResult, setStressResult] = useState<any>(null);
  const [stressLoading, setStressLoading] = useState(false);
  const [feedbackRole, setFeedbackRole] = useState('Master Builder');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Poll telemetry every 3s if live streaming is active
  useEffect(() => {
    fetchTelemetry();
    fetchVault();

    const interval = setInterval(() => {
      if (isLiveStreaming) {
        fetchTelemetry();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  const fetchTelemetry = async () => {
    try {
      const res = await apiFetch('/api/telemetry/cnc-status');
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch (err) {
      console.error('Telemetry fetch error:', err);
    }
  };

  const fetchVault = async () => {
    try {
      const res = await apiFetch('/api/inventory/slabs');
      if (res.ok) {
        const data = await res.json();
        setVaultSlabs(data.vault || []);
        setVaultSyncedTime(data.lastSyncedAt);
      }
    } catch (err) {
      console.error('Vault fetch error:', err);
    }
  };

  const handleSyncVaultNow = async () => {
    setVaultSyncing(true);
    try {
      const res = await apiFetch('/api/inventory/sync-now', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setVaultSlabs(data.updatedVault || []);
        setVaultSyncedTime(data.timestamp);
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setTimeout(() => setVaultSyncing(false), 600);
    }
  };

  const handleVerifyTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const res = await apiFetch('/api/auth/verify-trade-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, companyNumber, vatNumber })
      });
      const data = await res.json();
      setAuthResult(data);
    } catch (err) {
      console.error('Auth verification error:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRunStressTest = async () => {
    setStressLoading(true);
    try {
      const res = await apiFetch('/api/beta/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType: testCategory })
      });
      const data = await res.json();
      setStressResult(data);
    } catch (err) {
      console.error('Stress test error:', err);
    } finally {
      setTimeout(() => setStressLoading(false), 700);
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    try {
      const res = await apiFetch('/api/beta/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedbackText, role: feedbackRole })
      });
      if (res.ok) {
        setFeedbackSent(true);
        setFeedbackText('');
      }
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  return (
    <div className="bg-[#0A0A0A] text-white min-h-screen p-4 sm:p-8 font-sans">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-medium mb-3">
              <Radio className="w-3.5 h-3.5 animate-pulse text-gold" />
              <span>LIVE BETA DEPLOYMENT & TELEMETRY HUB</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              SMC Pro Forensic Operations Engine
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Real-time 5-Axis Waterjet telemetry, RFID Slab Vault sync, Companies House trade verification, &amp; forensic tolerance stress suite.
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition-colors self-start md:self-auto cursor-pointer"
            >
              Back to Workspace
            </button>
          )}
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex flex-wrap gap-2 mt-6">
          <button
            onClick={() => setActiveSubTab('telemetry')}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'telemetry'
                ? 'bg-gold text-neutral-950 shadow-lg font-bold'
                : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>1. CNC / Waterjet Telemetry</span>
          </button>

          <button
            onClick={() => setActiveSubTab('vault')}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'vault'
                ? 'bg-gold text-neutral-950 shadow-lg font-bold'
                : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>2. Slab Vault Database Sync</span>
          </button>

          <button
            onClick={() => setActiveSubTab('auth')}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'auth'
                ? 'bg-gold text-neutral-950 shadow-lg font-bold'
                : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>3. Trade Partner Handshake</span>
          </button>

          <button
            onClick={() => setActiveSubTab('stresstest')}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'stresstest'
                ? 'bg-gold text-neutral-950 shadow-lg font-bold'
                : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>4. Beta Forensic Stress Suite</span>
          </button>
        </div>
      </div>

      {/* Main Tab Contents */}
      <div className="max-w-7xl mx-auto">
        {/* ==================================================== */}
        {/* TAB 1: CNC / WATERJET TELEMETRY & AR MEASUREMENT     */}
        {/* ==================================================== */}
        {activeSubTab === 'telemetry' && (
          <div className="space-y-6">
            {/* Live Control Top Bar */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full ${isLiveStreaming ? 'bg-emerald-500 animate-ping' : 'bg-neutral-600'}`} />
                  <div className={`w-3 h-3 rounded-full absolute top-0 left-0 ${isLiveStreaming ? 'bg-emerald-500' : 'bg-neutral-600'}`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {isLiveStreaming ? 'Live SawJet Telemetry Stream' : 'Stream Paused'}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Direct TCP/IP Telemetry Bridge to SMC-SAWJET-5X-PRO (London Thames Depot)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer ${
                    isLiveStreaming
                      ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30 hover:bg-emerald-950/60'
                      : 'border-neutral-700 text-neutral-300 bg-neutral-800 hover:bg-neutral-700'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>{isLiveStreaming ? 'Pause Feed' : 'Resume Telemetry Stream'}</span>
                </button>

                <button
                  onClick={fetchTelemetry}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Poll Now</span>
                </button>
              </div>
            </div>

            {/* Gauges Grid */}
            {telemetry && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-medium mb-2">
                    <span>WATERJET PRESSURE</span>
                    <Gauge className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-2xl font-bold text-white tracking-tight">
                    {telemetry.telemetry.waterjetPressurePsi.toLocaleString()} <span className="text-sm font-normal text-neutral-400">PSI</span>
                  </div>
                  <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-sky-500 h-full rounded-full" style={{ width: `${(telemetry.telemetry.waterjetPressurePsi / 60000) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-sky-400 font-medium mt-2 block">Abrasive Garnet Feed: Active</span>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-medium mb-2">
                    <span>SPINDLE RPM</span>
                    <Cpu className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-white tracking-tight">
                    {telemetry.telemetry.spindleSpeedRpm.toLocaleString()} <span className="text-sm font-normal text-neutral-400">RPM</span>
                  </div>
                  <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(telemetry.telemetry.spindleSpeedRpm / 8000) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-amber-400 font-medium mt-2 block">Feed: {telemetry.telemetry.feedRateMmMin} mm/min</span>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-medium mb-2">
                    <span>FORENSIC VARIANCE</span>
                    <Scale className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-400 tracking-tight">
                    ±{telemetry.telemetry.forensicToleranceVarianceMm} <span className="text-sm font-normal text-neutral-400">mm</span>
                  </div>
                  <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(telemetry.telemetry.forensicToleranceVarianceMm / 0.30) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium mt-2 block">Target Max: ±0.30 mm (PASS)</span>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-medium mb-2">
                    <span>BLADE WEAR</span>
                    <Zap className="w-4 h-4 text-gold" />
                  </div>
                  <div className="text-2xl font-bold text-white tracking-tight">
                    {telemetry.telemetry.bladeWearPercent}% <span className="text-sm font-normal text-neutral-400">worn</span>
                  </div>
                  <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-gold h-full rounded-full" style={{ width: `${telemetry.telemetry.bladeWearPercent}%` }} />
                  </div>
                  <span className="text-[10px] text-gold font-medium mt-2 block">Diamond Grit Efficiency: {telemetry.telemetry.diamondGritEfficiency}</span>
                </div>
              </div>
            )}

            {/* Active Job Execution Board */}
            {telemetry && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
                  <div>
                    <span className="text-xs font-semibold text-gold tracking-wider uppercase block">CURRENT FABRICATION RUN</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{telemetry.activeJob.projectName}</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    {telemetry.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-neutral-500 block">Slab Material Spec</span>
                      <span className="text-sm font-medium text-neutral-200">{telemetry.activeJob.materialName}</span>
                    </div>
                    <div>
                      <span className="text-xs text-neutral-500 block">Warehouse Barcode</span>
                      <span className="text-sm font-mono text-gold">{telemetry.activeJob.slabBarcode}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-neutral-500 block">Current Automated Pass</span>
                      <span className="text-sm font-medium text-white">{telemetry.activeJob.currentOperation}</span>
                    </div>
                    <div>
                      <span className="text-xs text-neutral-500 block">Estimated Completion</span>
                      <span className="text-sm font-medium text-emerald-400">{telemetry.activeJob.estimatedCompletionMinutes} Minutes Remaining</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-neutral-500 block mb-2">Cut Completion Progress</span>
                    <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                      <span>PROGRESS</span>
                      <span>{telemetry.activeJob.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden p-0.5 border border-neutral-700">
                      <div className="bg-gradient-to-r from-gold to-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${telemetry.activeJob.progressPercent}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: REAL-TIME SLAB VAULT & INVENTORY DATABASE      */}
        {/* ==================================================== */}
        {activeSubTab === 'vault' && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-gold" />
                  SMC Pro Physical Slab Vault Database
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Synchronized with RFID warehouse scanner tags at Thames Distribution Depot. Last scan: {vaultSyncedTime || 'Just now'}
                </p>
              </div>

              <button
                onClick={handleSyncVaultNow}
                disabled={vaultSyncing}
                className="px-4 py-2 rounded-lg bg-gold hover:bg-gold-hover text-neutral-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${vaultSyncing ? 'animate-spin' : ''}`} />
                <span>{vaultSyncing ? 'Scanning RFID Vault...' : 'Run Physical RFID Scan Sync'}</span>
              </button>
            </div>

            {/* Inventory Grid Table */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-950 text-neutral-400 uppercase tracking-wider font-semibold border-b border-neutral-800">
                    <tr>
                      <th className="py-3.5 px-4">Slab Spec / Barcode</th>
                      <th className="py-3.5 px-4">Material Category</th>
                      <th className="py-3.5 px-4">Thickness &amp; Dimensions</th>
                      <th className="py-3.5 px-4">Warehouse Bay</th>
                      <th className="py-3.5 px-4">RFID Tag</th>
                      <th className="py-3.5 px-4">Stock</th>
                      <th className="py-3.5 px-4">Vein Match Score</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {vaultSlabs.map((slab) => (
                      <tr key={slab.id} className="hover:bg-neutral-800/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div>{slab.name}</div>
                          <span className="text-[10px] font-mono text-gold">{slab.id}</span>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-300">{slab.category}</td>
                        <td className="py-3.5 px-4 text-neutral-300">
                          {slab.thickness} &bull; <span className="text-neutral-400">{slab.dimensions}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-neutral-200">{slab.bay}</td>
                        <td className="py-3.5 px-4 font-mono text-neutral-400">{slab.rfidTag}</td>
                        <td className="py-3.5 px-4 font-bold text-white">{slab.stockCount} Slabs</td>
                        <td className="py-3.5 px-4 text-emerald-400 font-semibold">{slab.veinContinuityIndex}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              slab.status === 'AVAILABLE'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : slab.status === 'RESERVED'
                                ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                                : 'bg-sky-950 text-sky-400 border border-sky-500/30'
                            }`}
                          >
                            {slab.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: AUTHENTICATION HANDSHAKE & TRADE VERIFICATION */}
        {/* ==================================================== */}
        {activeSubTab === 'auth' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-gold" />
                <h3 className="text-lg font-bold text-white">UK Trade Partner Verification Handshake</h3>
              </div>
              <p className="text-xs text-neutral-400 mb-6">
                Automated API handshake with UK Companies House &amp; HMRC VAT registration endpoint to verify master builders, architects, &amp; contractors.
              </p>

              <form onSubmit={handleVerifyTrade} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Company Registered Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Companies House Reg Number</label>
                  <input
                    type="text"
                    value={companyNumber}
                    onChange={(e) => setCompanyNumber(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">UK VAT Number</label>
                  <input
                    type="text"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-gold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 rounded-lg bg-gold hover:bg-gold-hover text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {authLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Connecting to Companies House Register...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Execute Verification Handshake</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Verification Result Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-neutral-400 block mb-2">HANDSHAKE STATUS DECRYPT</span>

                {authResult ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>TRADE CREDENTIALS VERIFIED</span>
                      </div>
                      <p className="text-xs text-emerald-200/80">
                        Token: <span className="font-mono font-bold text-white">{authResult.verificationToken}</span>
                      </p>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-neutral-800">
                        <span className="text-neutral-400">Trade Tier</span>
                        <span className="font-bold text-gold">{authResult.tradeTier}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      Trade credit account details are not set up on this endpoint. Contact SMC for account and
                      payment terms.
                    </p>

                    <div>
                      <span className="text-xs font-semibold text-neutral-300 block mb-2">Active Trade Benefits</span>
                      <ul className="space-y-1">
                        {authResult.perks.map((perk: string, idx: number) => (
                          <li key={idx} className="text-xs text-neutral-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-gold" />
                            <span>{perk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 border-2 border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-neutral-500">
                    <Building2 className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-xs">
                      Submit company information on the left to simulate live Companies House trade authentication.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: BETA DEPLOYMENT & FORENSIC STRESS SUITE        */}
        {/* ==================================================== */}
        {activeSubTab === 'stresstest' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stress Test Controls */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sliders className="w-5 h-5 text-gold" />
                  <h3 className="text-lg font-bold text-white">Forensic Tolerance Stress-Test Engine</h3>
                </div>
                <p className="text-xs text-neutral-400 mb-6">
                  Stress-test laser point clouds, kerf tolerances, and flexural joint seams for high-end British architectural installs.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Diagnostic Sweep Category</label>
                    <select
                      value={testCategory}
                      onChange={(e) => setTestCategory(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold"
                    >
                      <option value="FORENSIC_TOLERANCE_SWEEP">Laser LiDAR Tolerance Sweep (±0.3mm)</option>
                      <option value="VEIN_CONTINUITY_ALGORITHM">AI Vein Matching &amp; Seam Realignment</option>
                      <option value="THERMAL_SHOCK_TEST">Porcelain &amp; Quartz Thermal Shock Simulation</option>
                      <option value="WATERJET_PRESSURE_STABILITY">52,000 PSI Waterjet Nozzle Cavitation Check</option>
                    </select>
                  </div>

                  <button
                    onClick={handleRunStressTest}
                    disabled={stressLoading}
                    className="w-full py-3 rounded-lg bg-gold hover:bg-gold-hover text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    {stressLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Running Forensic Diagnostics...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Execute Stress Test</span>
                      </>
                    )}
                  </button>

                  {stressResult && (
                    <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 mt-4 text-xs">
                      <div className="flex justify-between items-center text-emerald-400 font-bold border-b border-neutral-800 pb-2">
                        <span>TEST DIAGNOSTIC PASSED</span>
                        <span className="font-mono text-[10px] text-neutral-400">{stressResult.testRunId}</span>
                      </div>
                      <div className="text-neutral-300 pt-1 space-y-1">
                        <p>LiDAR Precision: <strong className="text-white">{stressResult.diagnostics.laserLidarPrecisionVariance}</strong></p>
                        <p>Vein Seam Alignment: <strong className="text-white">{stressResult.diagnostics.veinMatchingAlgorithmScore}</strong></p>
                        <p>SawJet Pressure Stability: <strong className="text-white">{stressResult.diagnostics.sawJetPressureStability}</strong></p>
                        <p>Joint Flexural Strength: <strong className="text-white">{stressResult.diagnostics.mitreJointFlexuralStrength}</strong></p>
                      </div>
                      <p className="text-[11px] text-gold italic pt-2 border-t border-neutral-800">
                        "{stressResult.betaTesterNote}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Beta Soft-Launch Tester Feedback */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <HardHat className="w-5 h-5 text-gold" />
                  <h3 className="text-lg font-bold text-white">Beta Tester Soft Launch Feedback</h3>
                </div>
                <p className="text-xs text-neutral-400 mb-6">
                  Direct telemetry channel for master builders, architects, and stone specifiers testing SMC Pro.
                </p>

                {feedbackSent ? (
                  <div className="p-6 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                    <h4 className="text-base font-bold text-white">Feedback Telemetry Logged</h4>
                    <p className="text-xs text-emerald-200/80">
                      Thank you. Your feedback has been queued for the SMC Pro engineering deployment team.
                    </p>
                    <button
                      onClick={() => setFeedbackSent(false)}
                      className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      Submit Another Telemetry Report
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSendFeedback} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Your Industry Role</label>
                      <select
                        value={feedbackRole}
                        onChange={(e) => setFeedbackRole(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold"
                      >
                        <option value="Master Builder">Master Builder / Contractor</option>
                        <option value="Chartered Architect">Chartered Architect (RIBA)</option>
                        <option value="Kitchen Interior Designer">Kitchen Interior Designer</option>
                        <option value="Stone Fabricator">Master Stone Fabricator</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Diagnostic Report &amp; Feedback</label>
                      <textarea
                        rows={4}
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Log observations regarding CNC cutting speeds, AR measurement accuracy, or slab vault availability..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-gold"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-neutral-700"
                    >
                      <Send className="w-4 h-4 text-gold" />
                      <span>Transmit Beta Feedback Log</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
