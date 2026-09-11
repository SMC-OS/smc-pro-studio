import { useMemo } from "react";
import {
  Layers,
  ShieldCheck,
  Filter,
  FileSpreadsheet
} from "lucide-react";
import { Project, FabricationDetails, Material } from "../App";

interface SlabYieldGranularReportProps {
  projects: Project[];
  getFabricationDetailsForProject: (proj: Project) => FabricationDetails;
  getMaterialById: (id: string) => Material;
  onSelectProject?: (projName: string) => void;
}

/**
 * Phase 5 Gate 0 purge.
 *
 * This report previously computed a fabricated "wet CNC shop floor
 * telemetry" audit: an invented per-project material yield percentage
 * (falling back to a hardcoded 88.5% when no real figure existed), four
 * fabrication phases with per-phase "theoretical vs actual" loss areas
 * computed from arbitrary invented formulas (e.g.
 * `netSqFt * (0.042 + (pIdx % 3) * 0.005)`), a fake default project area
 * list used whenever a project had no real estimate geometry, and an
 * "Export Report" action that faked a "Generating PDF... Audit Exported!"
 * success with no file ever produced. It also claimed the figures were
 * "certified by SMC Pro Digital Twin wet-cut sensors" — no such sensor
 * integration exists.
 *
 * Per the approved Gate 0 decision, the fabricated yield/phase-loss
 * formulas and the fake export are removed. What remains is the one
 * figure that is genuinely real: net surface area computed from each
 * project's own entered dimensions. Yield and fabrication-log fields are
 * shown as "Not yet recorded" when a project has no real
 * `fabricationDetails` set, rather than a fabricated percentage.
 */
export default function SlabYieldGranularReport({
  projects,
  getFabricationDetailsForProject,
  getMaterialById,
  onSelectProject
}: SlabYieldGranularReportProps) {
  const rows = useMemo(() => {
    return projects.map((p) => {
      const fab = getFabricationDetailsForProject(p);
      const netSqFt = (p.estimates || []).reduce(
        (acc, est) => acc + (((est?.length || 0) * (est?.width || 0)) / 144),
        0
      );
      const mat = (p.estimates && p.estimates[0]) ? getMaterialById(p.estimates[0].materialId) : null;

      return {
        id: p.id,
        projectName: p.name,
        address: p.address,
        status: p.status,
        materialName: mat ? mat.name : "Not yet selected",
        netSqFt: Math.round(netSqFt * 10) / 10,
        hasRecordedFabrication: Boolean(p.fabricationDetails),
        yieldPct: fab.materialYieldPct,
        wetCncMachineId: fab.wetCncMachineId,
        bsStandardCode: fab.bsStandardCode
      };
    });
  }, [projects, getFabricationDetailsForProject, getMaterialById]);

  const totalNetSqFt = Math.round(rows.reduce((acc, r) => acc + r.netSqFt, 0) * 10) / 10;
  const recordedCount = rows.filter((r) => r.hasRecordedFabrication).length;

  return (
    <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-900 text-gold border border-gold/40 uppercase tracking-widest">
            <FileSpreadsheet className="w-3.5 h-3.5 text-gold" />
            Slab Area & Fabrication Log
          </span>
          <h3 className="font-serif text-2xl md:text-3xl font-bold text-neutral-900">
            Project Material Usage
          </h3>
          <p className="text-xs text-neutral-500 max-w-3xl">
            Net surface area calculated from each project's own entered dimensions. Fabrication yield and cutting
            logs are shown once recorded by the shop floor.
          </p>
        </div>
      </div>

      {/* KPI METRIC HIGHLIGHT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-neutral-900 text-white rounded-xl p-4 space-y-1.5 border border-gold/30 shadow-xs">
          <div className="flex justify-between items-center text-neutral-400">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-gold">
              Total Net Area
            </span>
            <Layers className="w-4 h-4 text-gold/80" />
          </div>
          <div className="text-2xl md:text-3xl font-serif font-bold text-amber-300 font-mono">
            {totalNetSqFt} <span className="text-xs font-sans font-normal text-neutral-400">sq ft</span>
          </div>
          <p className="text-[10px] text-neutral-400 font-mono">
            Calculated from entered project dimensions
          </p>
        </div>

        <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-4 space-y-1.5">
          <div className="flex justify-between items-center text-neutral-400">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-neutral-700">
              Fabrication Logged
            </span>
            <ShieldCheck className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-2xl md:text-3xl font-serif font-bold text-neutral-900 font-mono">
            {recordedCount} / {rows.length}
          </div>
          <p className="text-[10px] text-neutral-500 font-mono font-medium">
            Projects with a recorded fabrication log
          </p>
        </div>
      </div>

      {/* AUDIT MATRIX TABLE */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
          <h4 className="font-serif text-base font-bold text-neutral-900 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gold" />
            Project Material Usage ({rows.length} Records)
          </h4>
        </div>

        <div className="overflow-x-auto border border-neutral-200/80 rounded-xl bg-white shadow-2xs">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-neutral-900 text-gold uppercase text-[10px] tracking-wider border-b border-neutral-800">
              <tr>
                <th className="py-3 px-4 font-bold">Project File</th>
                <th className="py-3 px-4 font-bold">Primary Stone Material</th>
                <th className="py-3 px-4 font-bold text-right">Net Area</th>
                <th className="py-3 px-4 font-bold text-right">Yield</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {rows.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelectProject?.(item.projectName)}
                  className="hover:bg-neutral-50/80 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4">
                    <div className="font-serif font-bold text-neutral-900 text-sm">{item.projectName}</div>
                    <div className="text-[10px] text-neutral-400 truncate max-w-[200px]">{item.address}</div>
                  </td>

                  <td className="py-3.5 px-4 font-medium text-neutral-700">
                    {item.materialName}
                    {item.hasRecordedFabrication && (
                      <span className="block text-[10px] text-neutral-400 font-normal">{item.wetCncMachineId}</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right font-bold text-neutral-900">
                    {item.netSqFt} sq ft
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {item.hasRecordedFabrication ? (
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-900 text-gold border border-gold/30">
                        {item.yieldPct}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-400">Not yet recorded</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded text-[9px] uppercase font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
