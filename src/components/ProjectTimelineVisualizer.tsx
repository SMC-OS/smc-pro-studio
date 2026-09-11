import React, { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent
} from "@dnd-kit/core";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Layers,
  Move,
  Plus,
  RotateCcw,
  Sparkles,
  Info,
  X,
  Edit3,
  Check,
  Building2,
  MapPin,
  ShieldCheck,
  BarChart2,
  List,
  Grid,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { Project, ProjectMilestones, StageMilestone, calculateMilestoneVariance, getDefaultMilestonesForProject } from "../App";

export interface TimelineMilestone {
  id: string;
  projectId: string;
  projectName: string;
  projectAddress: string;
  projectStatus: Project["status"];
  stageKey: string; // "proposal" | "slabSelection" | "templating" | "fabrication" | "readyForInstall" | "completed"
  stageTitle: string;
  expectedDate: string; // YYYY-MM-DD
  actualDate: string; // YYYY-MM-DD
  progressPct: number;
  status: "completed" | "in-progress" | "pending" | "delayed";
  color: string;
  bgBadge: string;
  borderBadge: string;
  iconName: string;
  techLead?: string;
  notes?: string;
}

export interface ProjectTimelineVisualizerProps {
  projects: Project[];
  onUpdateMilestone: (
    projectId: string,
    stageKey: string,
    fieldUpdates: Partial<StageMilestone> & { expectedDate?: string; actualDate?: string; progressPct?: number; status?: StageMilestone["status"] }
  ) => void;
  onSelectProject?: (projectId: string) => void;
}

// Stage configuration dictionary
const STAGE_CONFIGS: Record<string, { title: string; color: string; bgBadge: string; borderBadge: string }> = {
  proposal: {
    title: "RIBA Stage 3 Proposal & Auto-Quote",
    color: "#a3a3a3",
    bgBadge: "bg-neutral-800 text-neutral-300",
    borderBadge: "border-neutral-700"
  },
  slabSelection: {
    title: "Geological Slab Vault Reservation",
    color: "#38bdf8",
    bgBadge: "bg-sky-950/80 text-sky-300",
    borderBadge: "border-sky-500/40"
  },
  templating: {
    title: "Site LiDAR 3D Templating",
    color: "#c084fc",
    bgBadge: "bg-purple-950/80 text-purple-300",
    borderBadge: "border-purple-500/40"
  },
  fabrication: {
    title: "CNC Waterjet & Miter Edge Fabrication",
    color: "#f59e0b",
    bgBadge: "bg-amber-950/80 text-amber-300",
    borderBadge: "border-amber-500/40"
  },
  readyForInstall: {
    title: "Site Readiness & Delivery Dispatch",
    color: "#6366f1",
    bgBadge: "bg-indigo-950/80 text-indigo-300",
    borderBadge: "border-indigo-500/40"
  },
  completed: {
    title: "BS 8298 Handover & Laser Signoff",
    color: "#10b981",
    bgBadge: "bg-emerald-950/80 text-emerald-300",
    borderBadge: "border-emerald-500/40"
  }
};

// Generate comprehensive milestones list for all projects
const extractTimelineMilestones = (projects: Project[]): TimelineMilestone[] => {
  const result: TimelineMilestone[] = [];

  projects.forEach((proj) => {
    const ms = proj.milestones || getDefaultMilestonesForProject(proj);
    const createdDate = new Date(proj.createdAt || "2026-07-10");

    // Standard baseline dates derived from creation date if custom stage dates aren't set
    const addDays = (base: Date, days: number) => {
      const d = new Date(base.getTime() + days * 24 * 3600 * 1000);
      return d.toISOString().split("T")[0];
    };

    // 1. Proposal Stage
    const propExp = (ms as any).proposal?.expectedDate || addDays(createdDate, 0);
    const propAct = (ms as any).proposal?.actualDate || propExp;
    const propStatus = (ms as any).proposal?.status || "completed";
    const propProgress = (ms as any).proposal?.progressPct ?? 100;

    result.push({
      id: `${proj.id}-proposal`,
      projectId: proj.id,
      projectName: proj.name,
      projectAddress: proj.address,
      projectStatus: proj.status,
      stageKey: "proposal",
      stageTitle: STAGE_CONFIGS.proposal.title,
      expectedDate: propExp,
      actualDate: propAct,
      progressPct: propProgress,
      status: propStatus,
      color: STAGE_CONFIGS.proposal.color,
      bgBadge: STAGE_CONFIGS.proposal.bgBadge,
      borderBadge: STAGE_CONFIGS.proposal.borderBadge,
      iconName: "FileText",
      techLead: "RIBA Architectural Team",
      notes: "Commercial valuation and BS EN 1469 initial specification proposal."
    });

    // 2. Slab Selection Stage
    const slabExp = (ms as any).slabSelection?.expectedDate || addDays(createdDate, 3);
    const slabAct = (ms as any).slabSelection?.actualDate || slabExp;
    let slabStatus: StageMilestone["status"] = (ms as any).slabSelection?.status || "pending";
    let slabProgress = (ms as any).slabSelection?.progressPct ?? 0;
    if (proj.status !== "Proposal") {
      slabStatus = "completed";
      slabProgress = 100;
    }

    result.push({
      id: `${proj.id}-slabSelection`,
      projectId: proj.id,
      projectName: proj.name,
      projectAddress: proj.address,
      projectStatus: proj.status,
      stageKey: "slabSelection",
      stageTitle: STAGE_CONFIGS.slabSelection.title,
      expectedDate: slabExp,
      actualDate: slabAct,
      progressPct: slabProgress,
      status: slabStatus,
      color: STAGE_CONFIGS.slabSelection.color,
      bgBadge: STAGE_CONFIGS.slabSelection.bgBadge,
      borderBadge: STAGE_CONFIGS.slabSelection.borderBadge,
      iconName: "Layers",
      techLead: "Quarry & Vault Curator",
      notes: "High-resolution slab lot block reservation and vein matching approval."
    });

    // 3. Templating Stage
    const tempExp = (ms as any).templating?.expectedDate || addDays(createdDate, 5);
    const tempAct = (ms as any).templating?.actualDate || tempExp;
    let tempStatus: StageMilestone["status"] = (ms as any).templating?.status || "pending";
    let tempProgress = (ms as any).templating?.progressPct ?? 0;
    if (["Fabrication", "Ready for Install", "Completed"].includes(proj.status)) {
      tempStatus = "completed";
      tempProgress = 100;
    } else if (proj.status === "Slab Selected") {
      tempStatus = "in-progress";
      tempProgress = 60;
    }

    result.push({
      id: `${proj.id}-templating`,
      projectId: proj.id,
      projectName: proj.name,
      projectAddress: proj.address,
      projectStatus: proj.status,
      stageKey: "templating",
      stageTitle: STAGE_CONFIGS.templating.title,
      expectedDate: tempExp,
      actualDate: tempAct,
      progressPct: tempProgress,
      status: tempStatus,
      color: STAGE_CONFIGS.templating.color,
      bgBadge: STAGE_CONFIGS.templating.bgBadge,
      borderBadge: STAGE_CONFIGS.templating.borderBadge,
      iconName: "Sparkles",
      techLead: "LiDAR Survey Team",
      notes: "3D point cloud survey scan & substrate deflection verification."
    });

    // 4. Fabrication Stage
    const fabExp = ms?.fabrication?.expectedDate || addDays(createdDate, 7);
    const fabAct = ms?.fabrication?.actualDate || fabExp;
    const fabStatus = ms?.fabrication?.status || "pending";
    const fabProgress = ms?.fabrication?.progressPct ?? 0;

    result.push({
      id: `${proj.id}-fabrication`,
      projectId: proj.id,
      projectName: proj.name,
      projectAddress: proj.address,
      projectStatus: proj.status,
      stageKey: "fabrication",
      stageTitle: STAGE_CONFIGS.fabrication.title,
      expectedDate: fabExp,
      actualDate: fabAct,
      progressPct: fabProgress,
      status: fabStatus,
      color: STAGE_CONFIGS.fabrication.color,
      bgBadge: STAGE_CONFIGS.fabrication.bgBadge,
      borderBadge: STAGE_CONFIGS.fabrication.borderBadge,
      iconName: "Wrench",
      techLead: "Fabrication Team",
      notes: "Waterjet 60k PSI cutting, 50mm mitered apron polishing & sink cutout."
    });

    // 5. Ready for Install Stage
    const insExp = ms?.readyForInstall?.expectedDate || addDays(createdDate, 12);
    const insAct = ms?.readyForInstall?.actualDate || insExp;
    const insStatus = ms?.readyForInstall?.status || "pending";
    const insProgress = ms?.readyForInstall?.progressPct ?? 0;

    result.push({
      id: `${proj.id}-readyForInstall`,
      projectId: proj.id,
      projectName: proj.name,
      projectAddress: proj.address,
      projectStatus: proj.status,
      stageKey: "readyForInstall",
      stageTitle: STAGE_CONFIGS.readyForInstall.title,
      expectedDate: insExp,
      actualDate: insAct,
      progressPct: insProgress,
      status: insStatus,
      color: STAGE_CONFIGS.readyForInstall.color,
      bgBadge: STAGE_CONFIGS.readyForInstall.bgBadge,
      borderBadge: STAGE_CONFIGS.readyForInstall.borderBadge,
      iconName: "Truck",
      techLead: "London Logistics Team",
      notes: "Quality inspection, A-frame crate packing & site delivery dispatch."
    });

    // 6. Final Handover & Signoff Stage
    const compExp = (ms as any).completed?.expectedDate || addDays(new Date(insExp), 2);
    const compAct = (ms as any).completed?.actualDate || compExp;
    let compStatus: StageMilestone["status"] = (ms as any).completed?.status || "pending";
    let compProgress = (ms as any).completed?.progressPct ?? 0;
    if (proj.status === "Completed") {
      compStatus = "completed";
      compProgress = 100;
    }

    result.push({
      id: `${proj.id}-completed`,
      projectId: proj.id,
      projectName: proj.name,
      projectAddress: proj.address,
      projectStatus: proj.status,
      stageKey: "completed",
      stageTitle: STAGE_CONFIGS.completed.title,
      expectedDate: compExp,
      actualDate: compAct,
      progressPct: compProgress,
      status: compStatus,
      color: STAGE_CONFIGS.completed.color,
      bgBadge: STAGE_CONFIGS.completed.bgBadge,
      borderBadge: STAGE_CONFIGS.completed.borderBadge,
      iconName: "CheckCircle2",
      techLead: "SMC Quality Director",
      notes: "Laser signature signoff and BS 8298 structural audit."
    });
  });

  return result;
};

// Subcomponent: Draggable Milestone Card using dnd-kit
function DraggableMilestoneCard({
  milestone,
  onSelect,
  isDragged
}: {
  key?: React.Key;
  milestone: TimelineMilestone;
  onSelect: (ms: TimelineMilestone) => void;
  isDragged?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: milestone.id,
    data: { milestone }
  });

  return (
    <div
      ref={setNodeRef}
      style={{ borderLeftColor: milestone.color }}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(milestone);
      }}
      className={`p-2 rounded-lg text-xs border-l-4 border-t border-r border-b border-[#333333] cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-all duration-150 shadow-sm relative group/chip ${
        milestone.bgBadge
      } ${isDragging || isDragged ? "opacity-30 border-dashed" : "opacity-100"}`}
    >
      <div className="flex justify-between items-start gap-1">
        <span className="font-serif font-bold text-white text-[11px] leading-tight truncate">
          {milestone.projectName}
        </span>
        <span
          className="w-2 h-2 rounded-full shrink-0 mt-0.5"
          style={{ backgroundColor: milestone.color }}
        />
      </div>

      <div className="text-[10px] font-mono text-neutral-300 truncate mt-0.5">
        {milestone.stageTitle}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-black/40 h-1 rounded-full overflow-hidden mt-1.5">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${milestone.progressPct}%`,
            backgroundColor: milestone.color
          }}
        />
      </div>
    </div>
  );
}

// Subcomponent: Droppable Calendar Day Cell using dnd-kit
function DroppableCalendarDay({
  dateStr,
  dayNum,
  isCurrentMonth,
  isToday,
  dayMilestones,
  onSelectMilestone,
  activeId
}: {
  key?: React.Key;
  dateStr: string;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayMilestones: TimelineMilestone[];
  onSelectMilestone: (ms: TimelineMilestone) => void;
  activeId: string | null;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: dateStr
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] p-2 rounded-xl border transition-all duration-200 flex flex-col justify-between relative group ${
        isOver
          ? "bg-[#D4AF37]/25 border-[#D4AF37] ring-2 ring-[#D4AF37]/60 shadow-2xl scale-[1.01]"
          : isToday
          ? "bg-[#1c1a14] border-[#D4AF37]/60"
          : isCurrentMonth
          ? "bg-[#171717] border-[#292929] hover:border-[#404040]"
          : "bg-[#0d0d0d] border-[#1f1f1f] opacity-40"
      }`}
    >
      {/* Top Bar inside day cell */}
      <div className="flex justify-between items-center mb-1">
        <span
          className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
            isToday
              ? "bg-[#D4AF37] text-black"
              : isCurrentMonth
              ? "text-neutral-300"
              : "text-neutral-600"
          }`}
        >
          {dayNum}
        </span>

        {dayMilestones.length > 0 && (
          <span className="text-[9px] font-mono text-[#D4AF37] font-bold bg-[#D4AF37]/10 px-1.5 py-0.2 rounded border border-[#D4AF37]/30">
            {dayMilestones.length} {dayMilestones.length === 1 ? "stage" : "stages"}
          </span>
        )}
      </div>

      {/* Milestones inside this Day Cell */}
      <div className="space-y-1.5 flex-grow overflow-y-auto max-h-[120px] pr-0.5 no-scrollbar">
        {dayMilestones.map((ms) => (
          <DraggableMilestoneCard
            key={ms.id}
            milestone={ms}
            onSelect={onSelectMilestone}
            isDragged={activeId === ms.id}
          />
        ))}

        {dayMilestones.length === 0 && (
          <div className="h-full min-h-[50px] flex items-center justify-center border-2 border-dashed border-transparent hover:border-[#D4AF37]/30 rounded-lg transition-colors">
            <span className="text-[10px] font-mono text-neutral-600 group-hover:text-neutral-300">
              {isOver ? "Drop Here to Reschedule" : "Drop milestone"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectTimelineVisualizer({
  projects,
  onUpdateMilestone,
  onSelectProject
}: ProjectTimelineVisualizerProps) {
  // View mode: "calendar" | "gantt" | "agenda"
  const [viewMode, setViewMode] = useState<"calendar" | "gantt" | "agenda">("calendar");
  
  // Date navigation state (Current anchor date for calendar month)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date("2026-07-15"));

  // DND-Kit active item ID for drag overlay & active highlights
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);

  // Filters
  const [selectedProjectIdFilter, setSelectedProjectIdFilter] = useState<string>("all");
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Selected Milestone Modal popover
  const [selectedMilestone, setSelectedMilestone] = useState<TimelineMilestone | null>(null);

  // Toast feedback state
  const [toastText, setToastText] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastText(msg);
    setTimeout(() => {
      setToastText(null);
    }, 4000);
  };

  // All calculated milestones
  const allMilestones = useMemo(() => {
    return extractTimelineMilestones(projects);
  }, [projects]);

  // Filtered milestones
  const filteredMilestones = useMemo(() => {
    return allMilestones.filter((m) => {
      if (selectedProjectIdFilter !== "all" && m.projectId !== selectedProjectIdFilter) return false;
      if (selectedStageFilter !== "all" && m.stageKey !== selectedStageFilter) return false;
      if (selectedStatusFilter !== "all" && m.status !== selectedStatusFilter) return false;
      return true;
    });
  }, [allMilestones, selectedProjectIdFilter, selectedStageFilter, selectedStatusFilter]);

  // Calendar Days calculation (Month View: 35 or 42 grid cells)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Day of week for 1st of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
    // We want Monday-start grid
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes 6

    const daysInMonth = lastDayOfMonth.getDate();

    // Days from previous month to pad grid
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevDays: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      const dateStr = d.toISOString().split("T")[0];
      prevDays.push({ dateStr, dayNum, isCurrentMonth: false });
    }

    // Days in current month
    const currentDays: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split("T")[0];
      currentDays.push({ dateStr, dayNum: i, isCurrentMonth: true });
    }

    // Days from next month to round out grid to multiple of 7 (35 or 42)
    const totalSoFar = prevDays.length + currentDays.length;
    const totalGrid = totalSoFar > 35 ? 42 : 35;
    const nextDaysNeeded = totalGrid - totalSoFar;
    const nextDays: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];
    for (let i = 1; i <= nextDaysNeeded; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = d.toISOString().split("T")[0];
      nextDays.push({ dateStr, dayNum: i, isCurrentMonth: false });
    }

    return [...prevDays, ...currentDays, ...nextDays];
  }, [currentDate]);

  // Map of dateStr -> TimelineMilestone[] for quick calendar lookup
  const milestonesByDate = useMemo(() => {
    const map: Record<string, TimelineMilestone[]> = {};
    filteredMilestones.forEach((m) => {
      const key = m.expectedDate;
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [filteredMilestones]);

  // Setup dnd-kit sensors for pointer, mouse and touch support
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5
    }
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 150,
      tolerance: 5
    }
  });
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5
    }
  });

  const sensors = useSensors(pointerSensor, mouseSensor, touchSensor);

  // Active milestone object for DragOverlay preview
  const activeMilestone = useMemo(() => {
    if (!activeMilestoneId) return null;
    return allMilestones.find((m) => m.id === activeMilestoneId) || null;
  }, [allMilestones, activeMilestoneId]);

  // Date Navigation Handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date("2026-07-15"));
  };

  // DND-KIT HANDLERS
  const handleDragStart = (event: DragStartEvent) => {
    setActiveMilestoneId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveMilestoneId(null);

    if (!over) return;

    const milestoneId = String(active.id);
    const targetDateStr = String(over.id);

    const milestone = allMilestones.find((m) => m.id === milestoneId);
    if (!milestone) return;

    if (milestone.expectedDate === targetDateStr && milestone.actualDate === targetDateStr) {
      return; // No change
    }

    // Execute milestone date update in underlying project data state (updating actualDate and expectedDate)
    onUpdateMilestone(milestone.projectId, milestone.stageKey, {
      actualDate: targetDateStr,
      expectedDate: targetDateStr
    });

    const variance = calculateMilestoneVariance(milestone.expectedDate, targetDateStr);
    triggerToast(
      `Rescheduled "${milestone.projectName}" [${milestone.stageTitle}] to ${targetDateStr} (${variance.text})`
    );
  };

  const handleDragCancel = () => {
    setActiveMilestoneId(null);
  };

  // Format month title (e.g., "July 2026")
  const monthTitle = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="bg-[#141414] border border-[#333333] rounded-2xl overflow-hidden shadow-2xl text-[#e2e2e2] font-sans transition-all">
      
      {/* Toast Notification for Rescheduling */}
      {toastText && (
        <div className="fixed top-20 right-6 z-[350] bg-[#1A1A1A] border border-[#D4AF37] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce backdrop-blur-md">
          <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase tracking-wider">PROJECT TIMELINE RESCHEDULED</p>
            <p className="text-xs text-neutral-200 font-medium">{toastText}</p>
          </div>
        </div>
      )}

      {/* TIMELINE VISUALIZER HEADER */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-[#181818] via-[#141414] to-[#1a1a1a] border-b border-[#2a2a2a] space-y-6">
        
        {/* Title & View Selector */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40 px-2.5 py-0.5 rounded-md">
                UNIFIED CALENDAR & GANTT ENGINE
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                Drag-and-Drop Interactive Rescheduling
              </span>
            </div>
            <h3 className="font-serif text-2xl md:text-3xl text-white font-bold flex items-center gap-3">
              <span>Project Pipeline Timeline Visualizer</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              Integrates milestone deadlines across all active UK construction projects into a synchronized interactive timeline. Drag any stage marker to reschedule deadlines.
            </p>
          </div>

          {/* View Mode Switcher Buttons */}
          <div className="flex items-center bg-[#0a0a0a] p-1 rounded-xl border border-[#333333] shadow-inner">
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-[#D4AF37] text-black shadow-md"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Calendar Grid</span>
            </button>

            <button
              onClick={() => setViewMode("gantt")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                viewMode === "gantt"
                  ? "bg-[#D4AF37] text-black shadow-md"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Gantt Chart</span>
            </button>

            <button
              onClick={() => setViewMode("agenda")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                viewMode === "agenda"
                  ? "bg-[#D4AF37] text-black shadow-md"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <List className="w-4 h-4" />
              <span>Milestone Agenda</span>
            </button>
          </div>
        </div>

        {/* FILTERS & MONTH NAVIGATION CONTROLS BAR */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 pt-4 border-t border-[#262626]">
          
          {/* Left: Month Navigator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-[#0d0d0d] border border-[#353535] rounded-xl p-1 shadow-inner">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-[#252525] text-neutral-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-serif text-sm font-bold text-white px-4 min-w-[130px] text-center tracking-wide">
                {monthTitle}
              </span>

              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-[#252525] text-neutral-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleToday}
              className="px-3.5 py-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#D4AF37] border border-[#D4AF37]/40 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer"
            >
              Today
            </button>
          </div>

          {/* Right: Interactive Filters */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Filter by Project */}
            <div className="flex items-center gap-1.5 bg-[#0d0d0d] border border-[#333333] rounded-xl px-3 py-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-[#D4AF37]" />
              <select
                value={selectedProjectIdFilter}
                onChange={(e) => setSelectedProjectIdFilter(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer pr-2"
              >
                <option value="all" className="bg-[#1a1a1a]">All Projects ({projects.length})</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#1a1a1a]">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Stage */}
            <div className="flex items-center gap-1.5 bg-[#0d0d0d] border border-[#333333] rounded-xl px-3 py-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
              <select
                value={selectedStageFilter}
                onChange={(e) => setSelectedStageFilter(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer pr-2"
              >
                <option value="all" className="bg-[#1a1a1a]">All Stages</option>
                <option value="proposal" className="bg-[#1a1a1a]">Stage 3 Proposal</option>
                <option value="slabSelection" className="bg-[#1a1a1a]">Slab Selection</option>
                <option value="templating" className="bg-[#1a1a1a]">3D Templating</option>
                <option value="fabrication" className="bg-[#1a1a1a]">CNC Fabrication</option>
                <option value="readyForInstall" className="bg-[#1a1a1a]">Ready for Install</option>
                <option value="completed" className="bg-[#1a1a1a]">Final Signoff</option>
              </select>
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-1.5 bg-[#0d0d0d] border border-[#333333] rounded-xl px-3 py-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-[#D4AF37]" />
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer pr-2"
              >
                <option value="all" className="bg-[#1a1a1a]">All Statuses</option>
                <option value="completed" className="bg-[#1a1a1a]">Completed</option>
                <option value="in-progress" className="bg-[#1a1a1a]">In Progress</option>
                <option value="pending" className="bg-[#1a1a1a]">Pending</option>
                <option value="delayed" className="bg-[#1a1a1a]">Delayed</option>
              </select>
            </div>

            {/* Clear Filters reset */}
            {(selectedProjectIdFilter !== "all" || selectedStageFilter !== "all" || selectedStatusFilter !== "all") && (
              <button
                onClick={() => {
                  setSelectedProjectIdFilter("all");
                  setSelectedStageFilter("all");
                  setSelectedStatusFilter("all");
                }}
                className="text-xs font-mono text-neutral-400 hover:text-[#D4AF37] underline cursor-pointer px-2"
              >
                Reset Filters
              </button>
            )}

          </div>
        </div>
      </div>

      {/* DRAG INSTRUCTION BANNER */}
      <div className="bg-[#0f0f0f] border-b border-[#262626] px-6 py-2.5 flex items-center justify-between text-xs font-mono text-neutral-400">
        <div className="flex items-center gap-2 text-[#D4AF37]">
          <Move className="w-3.5 h-3.5 animate-pulse" />
          <span className="font-bold">DRAG & DROP ACTIVE (dnd-kit):</span>
          <span className="text-neutral-300 font-normal">
            Click and drag any milestone card to drop it into a target date on the calendar grid to update project dates.
          </span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Completed</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> In Progress</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400" /> Pending</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" /> Delayed</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: UNIFIED CALENDAR GRID VIEW */}
      {/* ========================================================= */}
      {viewMode === "calendar" && (
        <div className="p-4 md:p-6 overflow-x-auto">
          {/* Day Headers (Mon - Sun) */}
          <div className="grid grid-cols-7 gap-2 mb-2 min-w-[768px]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayName) => (
              <div
                key={dayName}
                className="text-center font-mono text-xs font-bold text-neutral-400 py-2 bg-[#121212] border border-[#2a2a2a] rounded-lg uppercase tracking-wider"
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar Day Grid with dnd-kit Droppable Days & Draggable Cards */}
          <div className="grid grid-cols-7 gap-2 min-w-[768px]">
            {calendarDays.map((dayObj) => {
              const dayMilestones = milestonesByDate[dayObj.dateStr] || [];
              const isToday = dayObj.dateStr === "2026-07-15";

              return (
                <DroppableCalendarDay
                  key={dayObj.dateStr}
                  dateStr={dayObj.dateStr}
                  dayNum={dayObj.dayNum}
                  isCurrentMonth={dayObj.isCurrentMonth}
                  isToday={isToday}
                  dayMilestones={dayMilestones}
                  onSelectMilestone={setSelectedMilestone}
                  activeId={activeMilestoneId}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: GANTT / STAGE TIMELINE VIEW */}
      {/* ========================================================= */}
      {viewMode === "gantt" && (
        <div className="p-6 space-y-6 overflow-x-auto">
          <div className="min-w-[900px] space-y-4">
            {/* Timeline Header Date Axis */}
            <div className="grid grid-cols-12 gap-2 text-center font-mono text-[10px] font-bold text-neutral-400 bg-[#0d0d0d] p-3 rounded-xl border border-[#2a2a2a] uppercase tracking-wider">
              <div className="col-span-3 text-left pl-2">Project Portfolio</div>
              <div className="col-span-9 grid grid-cols-6 gap-2">
                <div>RIBA Proposal</div>
                <div>Slab Vault</div>
                <div>3D Templating</div>
                <div>CNC Cut</div>
                <div>Ready / Deliver</div>
                <div>Handover</div>
              </div>
            </div>

            {/* Project Rows */}
            {projects.map((proj) => {
              const projMilestones = allMilestones.filter((m) => m.projectId === proj.id);

              return (
                <div
                  key={proj.id}
                  className="bg-[#181818] border border-[#2d2d2d] hover:border-[#D4AF37]/50 p-4 rounded-xl transition-all space-y-3"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Project Title Info */}
                    <div className="col-span-3 space-y-0.5">
                      <h4
                        onClick={() => onSelectProject && onSelectProject(proj.id)}
                        className="font-serif text-sm font-bold text-white hover:text-[#D4AF37] cursor-pointer"
                      >
                        {proj.name}
                      </h4>
                      <p className="text-[11px] font-mono text-neutral-400 truncate">{proj.address}</p>
                      <span className="inline-block text-[9px] font-mono font-bold bg-[#D4AF37]/15 text-[#D4AF37] px-2 py-0.2 rounded border border-[#D4AF37]/30">
                        {proj.status}
                      </span>
                    </div>

                    {/* Stage Timeline Nodes */}
                    <div className="col-span-9 grid grid-cols-6 gap-2">
                      {["proposal", "slabSelection", "templating", "fabrication", "readyForInstall", "completed"].map(
                        (stageKey) => {
                          const ms = projMilestones.find((m) => m.stageKey === stageKey);
                          if (!ms) return <div key={stageKey} className="bg-[#121212] rounded-lg border border-[#222]" />;

                          return (
                            <div
                              key={stageKey}
                              onClick={() => setSelectedMilestone(ms)}
                              className={`p-2.5 rounded-xl border text-xs cursor-pointer hover:scale-105 transition-all space-y-1 shadow-md ${ms.bgBadge} ${ms.borderBadge}`}
                            >
                              <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                                <span className="text-white capitalize">{ms.stageKey}</span>
                                <span style={{ color: ms.color }}>{ms.progressPct}%</span>
                              </div>

                              <div className="text-[10px] font-mono text-neutral-300 font-bold truncate">
                                {ms.expectedDate}
                              </div>

                              <div className="w-full bg-black/50 h-1 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${ms.progressPct}%`,
                                    backgroundColor: ms.color
                                  }}
                                />
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: MILESTONE AGENDA / DEADLINE STREAM VIEW */}
      {/* ========================================================= */}
      {viewMode === "agenda" && (
        <div className="p-6 space-y-4 max-w-5xl mx-auto">
          <div className="flex justify-between items-center pb-2 border-b border-[#2a2a2a] text-xs font-mono text-neutral-400">
            <span>Chronological Deadline Queue ({filteredMilestones.length} milestones)</span>
            <span>Sorted by Target Date</span>
          </div>

          <div className="space-y-3">
            {[...filteredMilestones]
              .sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime())
              .map((ms) => {
                const variance = calculateMilestoneVariance(ms.expectedDate, ms.actualDate);

                return (
                  <div
                    key={ms.id}
                    onClick={() => setSelectedMilestone(ms)}
                    className="bg-[#181818] border border-[#2d2d2d] hover:border-[#D4AF37] p-4 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      {/* Color indicator block */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 font-mono font-bold text-xs shadow-inner"
                        style={{ backgroundColor: ms.color + "33", border: `1px solid ${ms.color}` }}
                      >
                        {ms.progressPct}%
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif text-base font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                            {ms.projectName}
                          </h4>
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${ms.bgBadge}`}>
                            {ms.stageTitle}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 font-mono">{ms.projectAddress}</p>
                        <p className="text-[11px] text-neutral-300 italic">{ms.notes}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-400 block uppercase font-bold">Target Deadline</span>
                        <strong className="text-white text-sm">{ms.expectedDate}</strong>
                        <span className="text-[10px] block text-emerald-400">{variance.text}</span>
                      </div>

                      <div className="p-2 bg-black border border-neutral-800 rounded-lg group-hover:border-[#D4AF37] transition-all text-[#D4AF37]">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SELECTED MILESTONE DETAILS & QUICK RESCHEDULE EDIT */}
      {/* ========================================================= */}
      {selectedMilestone && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[320] animate-fade-in text-neutral-200">
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/60 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase tracking-widest block mb-0.5">
                  MILESTONE TELEMETRY DETAIL
                </span>
                <h3 className="font-serif text-2xl font-bold text-white">{selectedMilestone.projectName}</h3>
                <p className="text-xs font-mono text-neutral-400">{selectedMilestone.projectAddress}</p>
              </div>
              <button
                onClick={() => setSelectedMilestone(null)}
                className="p-1.5 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stage Title Card */}
            <div
              className="p-4 rounded-xl border flex justify-between items-center"
              style={{
                backgroundColor: selectedMilestone.color + "15",
                borderColor: selectedMilestone.color + "60"
              }}
            >
              <div>
                <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">Current Stage</span>
                <h4 className="font-serif text-lg font-bold text-white">{selectedMilestone.stageTitle}</h4>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs"
                style={{ backgroundColor: selectedMilestone.color, color: "#000" }}
              >
                {selectedMilestone.progressPct}%
              </div>
            </div>

            {/* Quick Reschedule Form Inputs */}
            <div className="space-y-4 font-mono text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 font-bold uppercase block">Expected Target Date</label>
                  <input
                    type="date"
                    value={selectedMilestone.expectedDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setSelectedMilestone({ ...selectedMilestone, expectedDate: newDate });
                      onUpdateMilestone(selectedMilestone.projectId, selectedMilestone.stageKey, {
                        expectedDate: newDate
                      });
                      triggerToast(`Rescheduled ${selectedMilestone.stageTitle} to ${newDate}`);
                    }}
                    className="w-full bg-black border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 font-bold uppercase block">Actual Execution Date</label>
                  <input
                    type="date"
                    value={selectedMilestone.actualDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setSelectedMilestone({ ...selectedMilestone, actualDate: newDate });
                      onUpdateMilestone(selectedMilestone.projectId, selectedMilestone.stageKey, {
                        actualDate: newDate
                      });
                    }}
                    className="w-full bg-black border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Progress Pct Slider */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400 font-bold uppercase">Stage Completion Progress</span>
                  <span className="text-[#D4AF37] font-bold">{selectedMilestone.progressPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={selectedMilestone.progressPct}
                  onChange={(e) => {
                    const newPct = Number(e.target.value);
                    const newStatus = newPct >= 100 ? "completed" : newPct > 0 ? "in-progress" : "pending";
                    setSelectedMilestone({ ...selectedMilestone, progressPct: newPct, status: newStatus });
                    onUpdateMilestone(selectedMilestone.projectId, selectedMilestone.stageKey, {
                      progressPct: newPct,
                      status: newStatus
                    });
                  }}
                  className="w-full accent-[#D4AF37] cursor-pointer"
                />
              </div>

              {/* Status Selector buttons */}
              <div className="space-y-1 pt-2">
                <label className="text-[10px] text-neutral-400 font-bold uppercase block">Stage Operational Status</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["completed", "in-progress", "pending", "delayed"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setSelectedMilestone({ ...selectedMilestone, status: st });
                        onUpdateMilestone(selectedMilestone.projectId, selectedMilestone.stageKey, {
                          status: st
                        });
                      }}
                      className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                        selectedMilestone.status === st
                          ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                          : "bg-black text-neutral-400 border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Shift buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cur = new Date(selectedMilestone.expectedDate);
                    cur.setDate(cur.getDate() + 7);
                    const newDateStr = cur.toISOString().split("T")[0];
                    setSelectedMilestone({ ...selectedMilestone, expectedDate: newDateStr });
                    onUpdateMilestone(selectedMilestone.projectId, selectedMilestone.stageKey, {
                      expectedDate: newDateStr
                    });
                    triggerToast(`Shifted ${selectedMilestone.stageTitle} by +7 days to ${newDateStr}`);
                  }}
                  className="w-full py-2.5 bg-black border border-neutral-800 hover:border-[#D4AF37] text-neutral-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  +1 Week Delay
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMilestone({ ...selectedMilestone, progressPct: 100, status: "completed" });
                    onUpdateMilestone(selectedMilestone.projectId, selectedMilestone.stageKey, {
                      progressPct: 100,
                      status: "completed"
                    });
                    triggerToast(`Marked ${selectedMilestone.stageTitle} as 100% Completed!`);
                  }}
                  className="w-full py-2.5 bg-[#D4AF37] text-black hover:bg-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Mark Completed
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>

      {/* Drag Overlay for active dragging preview */}
      <DragOverlay>
        {activeMilestone ? (
          <div
            style={{ borderLeftColor: activeMilestone.color }}
            className={`p-2 rounded-lg text-xs border-l-4 border-t border-r border-b border-[#D4AF37] shadow-2xl bg-[#1a1a1a] opacity-95 scale-105 pointer-events-none w-[180px] ${activeMilestone.bgBadge}`}
          >
            <div className="flex justify-between items-start gap-1">
              <span className="font-serif font-bold text-white text-[11px] leading-tight truncate">
                {activeMilestone.projectName}
              </span>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-md"
                style={{ backgroundColor: activeMilestone.color }}
              />
            </div>
            <div className="text-[10px] font-mono text-[#D4AF37] font-bold truncate mt-0.5">
              {activeMilestone.stageTitle}
            </div>
            <div className="text-[9px] font-mono text-neutral-300 mt-1">
              Dragging to reschedule...
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
