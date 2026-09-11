import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend,
  ComposedChart,
  Area
} from "recharts";
import {
  Layers,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Gauge,
  Ruler,
  Maximize2,
  Cpu,
  Scissors,
  BarChart3,
  Info,
  ArrowUpRight,
  Check,
  Filter,
  Sparkles
} from "lucide-react";
import { Project, FabricationDetails, Material, EstimatePart } from "../App";

interface SlabYieldSummaryChartProps {
  projects: Project[];
  getFabricationDetailsForProject: (proj: Project) => FabricationDetails;
  getMaterialById: (id: string) => Material;
  onSelectProject?: (projName: string) => void;
}

export default function SlabYieldSummaryChart({
  projects,
  getFabricationDetailsForProject,
  getMaterialById,
  onSelectProject
}: SlabYieldSummaryChartProps) {
  // Chart view mode: "yield-rate" | "slab-area"
  const [viewMode, setViewMode] = useState<"yield-rate" | "slab-area">("yield-rate");
  
  // Filter for active projects: "all-active" | "fabrication" | "all-projects"
  const [statusFilter, setStatusFilter] = useState<"all-active" | "fabrication" | "all-projects">("all-active");

  // Unit mode: "sqft" | "sqm"
  const [unitMode, setUnitMode] = useState<"sqft" | "sqm">("sqft");

  // Filter projects based on selected status filter
  const filteredProjects = useMemo(() => {
    if (statusFilter === "fabrication") {
      return projects.filter(p => p.status === "Fabrication" || p.status === "Ready for Install");
    }
    if (statusFilter === "all-active") {
      return projects.filter(p => p.status !== "Completed");
    }
    return projects; // all projects including completed
  }, [projects, statusFilter]);

  /**
   * Phase 5 Gate 0 purge.
   *
   * This previously fell back to a fabricated 88.5% yield whenever a
   * project had no real fabrication log (the `|| 88.5` triggered even
   * when the honest default was numeric 0, since 0 is falsy), padded
   * projects with no real dimensions using a fabricated per-index area
   * list, and fell back to fabricated BS-standard/CNC-machine/orientation
   * strings. Net area is computed only from a project's own entered
   * dimensions; yield, gross-slab, and offcut figures are only computed
   * for projects with a real recorded `fabricationDetails` entry —
   * everything else is marked as not yet recorded rather than guessed.
   */
  const projectYieldData = useMemo(() => {
    return filteredProjects.map((p) => {
      const fabDetails = getFabricationDetailsForProject(p);
      const hasRecordedFabrication = Boolean(p.fabricationDetails);
      const yieldPct = hasRecordedFabrication ? fabDetails.materialYieldPct : 0;

      const netAreaSqFt = p.estimates.reduce((acc, est) => acc + (est.length * est.width / 144), 0);
      const grossSlabSqFt = hasRecordedFabrication && yieldPct > 0
        ? Math.round((netAreaSqFt / (yieldPct / 100)) * 10) / 10
        : netAreaSqFt;
      const offcutSqFt = hasRecordedFabrication
        ? Math.max(0, Math.round((grossSlabSqFt - netAreaSqFt) * 10) / 10)
        : 0;

      // Convert to square meters if unitMode is sqm (1 sq ft = 0.092903 sq m)
      const multiplier = unitMode === "sqm" ? 0.092903 : 1;
      const netAreaDisp = Math.round(netAreaSqFt * multiplier * 10) / 10;
      const grossAreaDisp = Math.round(grossSlabSqFt * multiplier * 10) / 10;
      const offcutAreaDisp = Math.round(offcutSqFt * multiplier * 10) / 10;

      // Get primary material name
      const primaryMat = p.estimates[0] ? getMaterialById(p.estimates[0].materialId).name : "Not yet selected";

      return {
        id: p.id,
        rawProject: p,
        shortName: p.name.replace(/ Residential restoration| Townhouse| Penthouse| Residence| Villa/gi, ""),
        fullName: p.name,
        address: p.address,
        status: p.status,
        hasRecordedFabrication,
        yieldPct,
        bsStandard: fabDetails.bsStandardCode,
        cncMachine: fabDetails.wetCncMachineId,
        cuttingOrientation: fabDetails.cuttingOrientation,
        netAreaSqFt,
        grossSlabSqFt,
        offcutSqFt,
        netAreaDisp,
        grossAreaDisp,
        offcutAreaDisp,
        primaryMaterial: primaryMat,
        isCompliant: hasRecordedFabrication && yieldPct >= 85.0,
        isHighEfficiency: hasRecordedFabrication && yieldPct >= 90.0,
        color: !hasRecordedFabrication ? "#9CA3AF" : yieldPct >= 90.0 ? "#10B981" : yieldPct >= 85.0 ? "#D4AF37" : "#F59E0B"
      };
    });
  }, [filteredProjects, getFabricationDetailsForProject, getMaterialById, unitMode]);

  // Aggregate summary stats (computed only from projects with a recorded fabrication log)
  const summaryMetrics = useMemo(() => {
    const recordedData = projectYieldData.filter((p) => p.hasRecordedFabrication);

    const totalNetSqFt = projectYieldData.reduce((acc, p) => acc + p.netAreaSqFt, 0);
    const totalGrossSqFt = recordedData.reduce((acc, p) => acc + p.grossSlabSqFt, 0);
    const totalOffcutSqFt = recordedData.reduce((acc, p) => acc + p.offcutSqFt, 0);
    const weightedAvgYield = totalGrossSqFt > 0 ? Math.round((recordedData.reduce((acc, p) => acc + p.netAreaSqFt, 0) / totalGrossSqFt) * 1000) / 10 : 0;

    const compliantCount = recordedData.filter(p => p.isCompliant).length;
    const recordedCount = recordedData.length;
    const totalCount = projectYieldData.length;
    const compliancePct = recordedCount > 0 ? Math.round((compliantCount / recordedCount) * 100) : 0;

    const multiplier = unitMode === "sqm" ? 0.092903 : 1;

    return {
      avgYield: weightedAvgYield,
      totalNet: Math.round(totalNetSqFt * multiplier * 10) / 10,
      totalGross: Math.round(totalGrossSqFt * multiplier * 10) / 10,
      totalOffcut: Math.round(totalOffcutSqFt * multiplier * 10) / 10,
      compliantCount,
      recordedCount,
      totalCount,
      compliancePct
    };
  }, [projectYieldData, unitMode]);

  // Custom Chart Tooltip
  const CustomYieldTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1A1A1A] border border-gold/40 rounded-xl p-4 shadow-xl text-white text-xs space-y-2 max-w-xs z-50">
          <div className="flex justify-between items-center border-b border-neutral-700 pb-2">
            <div>
              <h5 className="font-serif font-bold text-sm text-gold">{data.fullName}</h5>
              <p className="text-[10px] text-neutral-400 font-mono">{data.address}</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 text-neutral-200 border border-neutral-700">
              {data.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
            <div className="bg-neutral-900/80 p-2 rounded border border-neutral-800">
              <span className="text-[9px] text-neutral-400 uppercase block">Yield Rate</span>
              <span className="text-sm font-bold text-gold">{data.hasRecordedFabrication ? `${data.yieldPct}%` : "—"}</span>
              <span className="text-[9px] text-emerald-400 block mt-0.5">
                {!data.hasRecordedFabrication ? "Not yet recorded" : data.yieldPct >= 85 ? "✓ Meets BS Standard" : "⚠ Below Benchmark"}
              </span>
            </div>

            <div className="bg-neutral-900/80 p-2 rounded border border-neutral-800">
              <span className="text-[9px] text-neutral-400 uppercase block">Primary Stone</span>
              <span className="text-xs font-bold text-neutral-200 truncate block">{data.primaryMaterial}</span>
              <span className="text-[9px] text-neutral-400 block mt-0.5">{data.cncMachine}</span>
            </div>
          </div>

          <div className="space-y-1 pt-1 font-mono text-[10px]">
            <div className="flex justify-between text-neutral-300">
              <span>Net Utilized Area:</span>
              <strong className="text-white">{data.netAreaDisp} {unitMode === "sqft" ? "sq ft" : "m²"}</strong>
            </div>
            {data.hasRecordedFabrication && (
              <>
                <div className="flex justify-between text-neutral-300">
                  <span>Gross Slab Total:</span>
                  <strong className="text-neutral-300">{data.grossAreaDisp} {unitMode === "sqft" ? "sq ft" : "m²"}</strong>
                </div>
                <div className="flex justify-between text-neutral-300">
                  <span>Reclaimable Offcut:</span>
                  <strong className="text-amber-400">{data.offcutAreaDisp} {unitMode === "sqft" ? "sq ft" : "m²"}</strong>
                </div>
              </>
            )}
          </div>

          <div className="text-[9px] text-neutral-400 font-sans italic border-t border-neutral-800 pt-1.5 mt-1">
            Orientation: {data.cuttingOrientation}
          </div>
        </div>
      );
    }
    return null;
  };

  const unitLabel = unitMode === "sqft" ? "sq ft" : "m²";

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
      
      {/* HEADER ROW */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-gold/10 text-gold border border-gold/30 uppercase tracking-widest">
            <Scissors className="w-3.5 h-3.5 text-gold" />
            SMC Precision Masonry Analytics
          </div>
          <h3 className="font-serif text-2xl md:text-3xl font-medium text-neutral-900">
            Slab Material Yield Efficiency
          </h3>
          <p className="text-xs text-neutral-500 max-w-2xl">
            Total slab material utilization ratio, offcut recovery, and British Standard (BS EN 1469 / BS 8298) yield compliance across all active fabrication projects.
          </p>
        </div>

        {/* CONTROLS & FILTER BAR */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-mono">
            <button
              onClick={() => setStatusFilter("all-active")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "all-active"
                  ? "bg-white text-neutral-900 font-bold shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Active Queue ({projects.filter(p => p.status !== "Completed").length})
            </button>
            <button
              onClick={() => setStatusFilter("fabrication")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "fabrication"
                  ? "bg-white text-neutral-900 font-bold shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Fabrication ({projects.filter(p => p.status === "Fabrication" || p.status === "Ready for Install").length})
            </button>
            <button
              onClick={() => setStatusFilter("all-projects")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "all-projects"
                  ? "bg-white text-neutral-900 font-bold shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              All Files ({projects.length})
            </button>
          </div>

          {/* Unit Switcher */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-mono">
            <button
              onClick={() => setUnitMode("sqft")}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                unitMode === "sqft" ? "bg-neutral-900 text-gold font-bold" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              sq ft
            </button>
            <button
              onClick={() => setUnitMode("sqm")}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                unitMode === "sqm" ? "bg-neutral-900 text-gold font-bold" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              m²
            </button>
          </div>

          {/* Chart View Mode Toggle */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-mono">
            <button
              onClick={() => setViewMode("yield-rate")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "yield-rate" ? "bg-white text-neutral-900 font-bold shadow-2xs" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-gold" />
              Yield %
            </button>
            <button
              onClick={() => setViewMode("slab-area")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "slab-area" ? "bg-white text-neutral-900 font-bold shadow-2xs" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-gold" />
              Slab Area
            </button>
          </div>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Overall Weighted Average Yield */}
        <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-4 space-y-1.5 relative overflow-hidden">
          <div className="flex justify-between items-center text-neutral-400">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Total Weighted Yield</span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-serif font-bold text-neutral-900 font-mono flex items-baseline gap-2">
            <span>{summaryMetrics.avgYield}%</span>
            <span className="text-[10px] font-sans font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              +{Math.max(0, Math.round((summaryMetrics.avgYield - 85.0) * 10) / 10)}% vs Standard
            </span>
          </div>
          <p className="text-[10px] text-neutral-500 font-mono">
            BS EN 1469 Target: ≥85.0%
          </p>
        </div>

        {/* Metric 2: Net Used Stone Area */}
        <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-4 space-y-1.5">
          <div className="flex justify-between items-center text-neutral-400">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Net Utilized Area</span>
            <div className="p-1.5 bg-gold/10 text-gold rounded-lg">
              <Ruler className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-serif font-bold text-neutral-900 font-mono">
            {summaryMetrics.totalNet} <span className="text-xs font-sans font-normal text-neutral-500">{unitLabel}</span>
          </div>
          <p className="text-[10px] text-neutral-500 font-mono">
            Active fabrication components
          </p>
        </div>

        {/* Metric 3: Total Gross Allocated Slabs */}
        <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-4 space-y-1.5">
          <div className="flex justify-between items-center text-neutral-400">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Gross Slab Material</span>
            <div className="p-1.5 bg-neutral-900 text-gold rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-serif font-bold text-neutral-900 font-mono">
            {summaryMetrics.totalGross} <span className="text-xs font-sans font-normal text-neutral-500">{unitLabel}</span>
          </div>
          <p className="text-[10px] text-amber-600 font-mono font-medium">
            Includes {summaryMetrics.totalOffcut} {unitLabel} offcut
          </p>
        </div>

        {/* Metric 4: Compliance Rate */}
        <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-4 space-y-1.5">
          <div className="flex justify-between items-center text-neutral-400">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">BS Benchmark Compliance</span>
            <div className="p-1.5 bg-blue-500/10 text-blue-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-serif font-bold text-neutral-900 font-mono">
            {summaryMetrics.compliancePct}%
          </div>
          <p className="text-[10px] text-neutral-500 font-mono">
            {summaryMetrics.recordedCount > 0
              ? `${summaryMetrics.compliantCount} of ${summaryMetrics.recordedCount} recorded files meet ≥85% threshold`
              : `0 of ${summaryMetrics.totalCount} files have recorded fabrication data`}
          </p>
        </div>
      </div>

      {/* CHART CONTAINER */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-3">
            <h4 className="font-serif text-lg font-medium text-neutral-900">
              {viewMode === "yield-rate" ? "Yield Efficiency Ratio per Project" : "Net Used Stone vs. Gross Offcut Breakdown"}
            </h4>
          </div>

          {/* Benchmark Legend Labels */}
          <div className="flex items-center gap-4 text-[10px] font-mono">
            {viewMode === "yield-rate" ? (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-neutral-700 font-bold">≥90% High Precision</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gold" />
                  <span className="text-neutral-700 font-bold">85-89.9% BS Standard</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-0 border-t-2 border-dashed border-amber-500" />
                  <span className="text-neutral-500">85% Benchmark Line</span>
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-gold" />
                  <span className="text-neutral-700 font-bold">Net Utilized Area</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                  <span className="text-neutral-700 font-bold">Offcut / Reclaimable Scrap</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* VISUAL RECHARTS DISPLAY */}
        <div className="h-[280px] bg-neutral-50/50 rounded-xl p-3 border border-neutral-200/60">
          {projectYieldData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 text-xs">
              <Info className="w-6 h-6 mb-2 text-neutral-300" />
              <span>No fabrication projects currently match the filter criteria.</span>
            </div>
          ) : viewMode === "yield-rate" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={projectYieldData}
                margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="shortName"
                  tick={{ fontSize: 11, fill: "#374151", fontWeight: 600 }}
                  interval={0}
                />
                <YAxis
                  domain={[60, 100]}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  unit="%"
                />
                <Tooltip content={<CustomYieldTooltip />} />
                
                {/* BS EN 1469 Benchmark Standard Line at 85% */}
                <ReferenceLine
                  y={85}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: "BS Standard (85%)",
                    fill: "#D97706",
                    fontSize: 10,
                    position: "insideTopRight",
                    fontWeight: 700
                  }}
                />

                {/* Precision Benchmark Line at 90% */}
                <ReferenceLine
                  y={90}
                  stroke="#10B981"
                  strokeDasharray="2 2"
                  strokeWidth={1.5}
                  label={{
                    value: "Precision Target (90%)",
                    fill: "#059669",
                    fontSize: 10,
                    position: "insideTopLeft",
                    fontWeight: 700
                  }}
                />

                <Bar
                  dataKey="yieldPct"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                  cursor="pointer"
                  onClick={(entry: any) => {
                    if (onSelectProject && entry && entry.fullName) {
                      onSelectProject(entry.fullName);
                    }
                  }}
                >
                  {projectYieldData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="hover:opacity-85 transition-opacity"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            /* SLAB AREA STACKED BAR CHART */
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={projectYieldData}
                margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="shortName"
                  tick={{ fontSize: 11, fill: "#374151", fontWeight: 600 }}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  unit={` ${unitLabel}`}
                />
                <Tooltip content={<CustomYieldTooltip />} />
                
                {/* Stack 1: Net Utilized Stone */}
                <Bar
                  dataKey="netAreaDisp"
                  name="Net Utilized Area"
                  stackId="a"
                  fill="#D4AF37"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={48}
                />
                {/* Stack 2: Offcut / Scrap Area */}
                <Bar
                  dataKey="offcutAreaDisp"
                  name="Offcut / Scrap"
                  stackId="a"
                  fill="#F59E0B"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* DETAILED PROJECT YIELD LIST / CARDS */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
          <h4 className="font-serif text-sm font-semibold text-neutral-900">
            Active Fabrication Yield Registry ({projectYieldData.length} projects)
          </h4>
          <span className="text-[10px] font-mono text-neutral-400 uppercase">
            Click any row to view project pipeline
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {projectYieldData.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (onSelectProject) {
                  onSelectProject(item.fullName);
                }
              }}
              className="p-3.5 bg-neutral-50 hover:bg-white border border-neutral-200/80 hover:border-gold/60 rounded-xl transition-all cursor-pointer space-y-2 group shadow-2xs"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-0.5">
                  <h5 className="font-serif text-xs font-bold text-neutral-900 group-hover:text-gold transition-colors truncate">
                    {item.fullName}
                  </h5>
                  <p className="text-[10px] text-neutral-400 font-mono truncate">{item.address}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-neutral-900 text-gold border border-gold/30 shrink-0">
                  {item.hasRecordedFabrication ? `${item.yieldPct}% Yield` : "Not yet recorded"}
                </span>
              </div>

              {/* Progress Bar Meter */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[9px] font-mono">
                  <span className="text-neutral-500">
                    Net: <strong className="text-neutral-800">{item.netAreaDisp} {unitLabel}</strong>
                    {item.hasRecordedFabrication && (
                      <> / Gross: <strong className="text-neutral-600">{item.grossAreaDisp} {unitLabel}</strong></>
                    )}
                  </span>
                  {item.hasRecordedFabrication && (
                    <span className="text-amber-600 font-bold">-{item.offcutAreaDisp} {unitLabel} offcut</span>
                  )}
                </div>
                <div className="w-full bg-neutral-200/70 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.hasRecordedFabrication ? Math.min(100, item.yieldPct) : 0}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-neutral-200/40 text-[9px] font-mono text-neutral-500">
                <span className="truncate max-w-[150px] font-medium text-neutral-700">{item.primaryMaterial}</span>
                <span className="text-neutral-400 flex items-center gap-1">
                  <Cpu className="w-2.5 h-2.5 text-gold" />
                  {item.cncMachine}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
