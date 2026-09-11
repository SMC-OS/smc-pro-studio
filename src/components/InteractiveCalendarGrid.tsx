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

/**
 * Phase 5 Gate 0 purge (correction pass).
 *
 * This seed previously listed four fabricated scheduled site activities
 * tied to fabricated projects ("Kensington Residence", "Spencer Hall
 * Estate", "Chelsea Design Studio", "Mayfair Penthouse") at invented
 * addresses, with fabricated named crew ("James Sterling + Mark
 * Reynolds", "David Vance (3D LiDAR)") reused from other seeds this
 * purge already removed. None of it was a real scheduled activity. The
 * calendar grid, filter, and card layout are genuinely reusable, so they
 * are kept; the seed is emptied so the schedule starts honestly empty
 * until real activities are booked.
 */
const INITIAL_SCHEDULE: ScheduledTask[] = [];

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
        {filteredTasks.length === 0 && (
          <div className="md:col-span-2 p-8 text-center bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-400 space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-neutral-600" />
            <p className="text-xs font-mono">No site activity scheduled yet.</p>
          </div>
        )}
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
