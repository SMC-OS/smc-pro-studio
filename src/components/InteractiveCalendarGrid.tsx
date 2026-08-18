import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Building,
  Users,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  MapPin,
  HardHat,
  Truck,
  Sparkles
} from "lucide-react";

export interface ScheduledTask {
  id: string;
  projectName: string;
  siteAddress: string;
  type: "Templating" | "Slab Delivery" | "Crane Lift" | "Installation" | "Snagging & Polish";
  date: string; // YYYY-MM-DD
  timeSlot: "08:00 - 12:00" | "12:00 - 16:00" | "Full Day";
  assignedCrew: string;
  status: "Scheduled" | "In Progress" | "Completed" | "Delayed";
}

const INITIAL_SCHEDULE: ScheduledTask[] = [
  {
    id: "SCH-101",
    projectName: "Kensington Residence",
    siteAddress: "14 Phillimore Gardens, Kensington W8",
    type: "Installation",
    date: "2026-08-03",
    timeSlot: "Full Day",
    assignedCrew: "James Sterling + Mark Reynolds",
    status: "In Progress"
  },
  {
    id: "SCH-102",
    projectName: "Spencer Hall Estate",
    siteAddress: "Spencer Hall, Cotswolds OX7",
    type: "Templating",
    date: "2026-08-04",
    timeSlot: "08:00 - 12:00",
    assignedCrew: "David Vance (3D LiDAR)",
    status: "Scheduled"
  },
  {
    id: "SCH-103",
    projectName: "Chelsea Design Studio",
    siteAddress: "22 Kings Road, Chelsea SW3",
    type: "Crane Lift",
    date: "2026-08-05",
    timeSlot: "08:00 - 12:00",
    assignedCrew: "Heavy Rigging Crew 1",
    status: "Scheduled"
  },
  {
    id: "SCH-104",
    projectName: "Mayfair Penthouse",
    siteAddress: "42 Grosvenor Square, Mayfair W1K",
    type: "Slab Delivery",
    date: "2026-08-06",
    timeSlot: "12:00 - 16:00",
    assignedCrew: "Transport Logistics A",
    status: "Scheduled"
  }
];

export default function InteractiveCalendarGrid() {
  const [schedule, setSchedule] = useState<ScheduledTask[]>(INITIAL_SCHEDULE);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredTasks = schedule.filter((t) => {
    return selectedCategory === "all" || t.type === selectedCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in text-neutral-100">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gold uppercase font-bold tracking-widest bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
              SMC PRO DISPATCH & LOGISTICS
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              MULTI-SITE SCHEDULER
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Interactive Site Calendar & Dispatch Grid
          </h2>
          <p className="text-xs text-neutral-400 font-sans max-w-2xl">
            Coordinate site templating, slab delivery, heavy crane lifts, site installation, and snagging inspections across active London & UK project sites.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-3 bg-gold hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Site Activity</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-neutral-900/80 border border-neutral-800 p-3 rounded-xl custom-scrollbar">
        <span className="text-[10px] font-mono text-neutral-400 uppercase shrink-0">Filter Activity:</span>
        {["all", "Templating", "Slab Delivery", "Crane Lift", "Installation", "Snagging & Polish"].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer ${
              selectedCategory === cat ? "bg-gold text-neutral-950 font-bold" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            {cat === "all" ? "All Site Schedule" : cat}
          </button>
        ))}
      </div>

      {/* Schedule List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-3 shadow-xl relative"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
                  {task.type}
                </span>
                <span className="text-xs font-mono text-neutral-400">{task.date} ({task.timeSlot})</span>
              </div>

              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                task.status === "In Progress"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                  : "bg-emerald-950/80 text-emerald-400 border-emerald-800"
              }`}>
                {task.status}
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-white">{task.projectName}</h3>
              <p className="text-xs text-neutral-400 flex items-center gap-1.5 font-sans">
                <MapPin className="w-3.5 h-3.5 text-gold shrink-0" />
                <span>{task.siteAddress}</span>
              </p>
            </div>

            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs font-mono text-neutral-300">
              <div className="flex items-center gap-1.5">
                <HardHat className="w-3.5 h-3.5 text-amber-400" />
                <span>Crew: {task.assignedCrew}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
