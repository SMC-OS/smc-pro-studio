import React, { useState } from "react";
import {
  Users,
  ShieldCheck,
  Award,
  Clock,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Phone,
  Mail,
  HardHat,
  Search,
  Filter,
  Briefcase
} from "lucide-react";

export interface StaffMember {
  id: string;
  name: string;
  role: "Master Mason" | "3D Templater" | "CNC Waterjet Operator" | "Senior Fitter" | "Apprentice";
  cscsCardNumber: string;
  cscsExpiry: string;
  status: "Active - On Site" | "Available - In Shop" | "Scheduled Leave" | "Training";
  assignedProject?: string;
  weeklyHoursLogged: number;
  phone: string;
  email: string;
}

const INITIAL_STAFF: StaffMember[] = [
  {
    id: "STF-01",
    name: "James Sterling",
    role: "Master Mason",
    cscsCardNumber: "CSCS-9842019",
    cscsExpiry: "2028-11-15",
    status: "Active - On Site",
    assignedProject: "Kensington Residence (Phillimore Gardens)",
    weeklyHoursLogged: 38.5,
    phone: "+44 7700 900123",
    email: "james.sterling@smcpro.co.uk"
  },
  {
    id: "STF-02",
    name: "David Vance",
    role: "3D Templater",
    cscsCardNumber: "CSCS-4820192",
    cscsExpiry: "2027-04-20",
    status: "Active - On Site",
    assignedProject: "Spencer Hall Estate (Cotswolds)",
    weeklyHoursLogged: 42.0,
    phone: "+44 7700 900456",
    email: "david.vance@smcpro.co.uk"
  },
  {
    id: "STF-03",
    name: "Viktor Kowalski",
    role: "CNC Waterjet Operator",
    cscsCardNumber: "CSCS-1928402",
    cscsExpiry: "2026-09-30", // expiring soon alert
    status: "Available - In Shop",
    assignedProject: "Fabrication Shop Bay 2",
    weeklyHoursLogged: 40.0,
    phone: "+44 7700 900789",
    email: "viktor.k@smcpro.co.uk"
  },
  {
    id: "STF-04",
    name: "Mark Reynolds",
    role: "Senior Fitter",
    cscsCardNumber: "CSCS-7712940",
    cscsExpiry: "2029-01-10",
    status: "Active - On Site",
    assignedProject: "Chelsea Design Studio (Kings Rd)",
    weeklyHoursLogged: 36.0,
    phone: "+44 7700 900321",
    email: "mark.r@smcpro.co.uk"
  }
];

export default function StaffCrewManagementView() {
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);

  const filteredStaff = staffList.filter((stf) => {
    const matchesSearch =
      stf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stf.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (stf.assignedProject && stf.assignedProject.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = selectedRole === "all" || stf.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 animate-fade-in text-neutral-100">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gold uppercase font-bold tracking-widest bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
              SMC PRO WORKFORCE OPERATIONS
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              CSCS COMPLIANCE VERIFIED
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Staff & Site Crew Management
          </h2>
          <p className="text-xs text-neutral-400 font-sans max-w-2xl">
            Track site masons, 3D laser templaters, CNC operators, site hours, UK CSCS certification status, and project assignments.
          </p>
        </div>

        <button
          onClick={() => setShowAddStaffModal(true)}
          className="px-4 py-3 bg-gold hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Staff Member</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-900/80 border border-neutral-800 p-3.5 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search staff, role, project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-gold font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-[10px] font-mono text-neutral-400 uppercase shrink-0">Role:</span>
          {["all", "Master Mason", "3D Templater", "CNC Waterjet Operator", "Senior Fitter"].map((rl) => (
            <button
              key={rl}
              onClick={() => setSelectedRole(rl)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer ${
                selectedRole === rl ? "bg-gold text-neutral-950 font-bold" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              {rl === "all" ? "All Crew" : rl}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((member) => (
          <div
            key={member.id}
            className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-4 shadow-xl relative overflow-hidden"
          >
            <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/40 text-gold flex items-center justify-center shrink-0 font-bold font-serif">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-white">{member.name}</h3>
                  <span className="text-xs font-mono text-gold block">{member.role}</span>
                </div>
              </div>

              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                {member.status}
              </span>
            </div>

            <div className="space-y-2 text-xs font-sans text-neutral-300">
              <div className="flex items-center gap-2 text-neutral-400">
                <Briefcase className="w-3.5 h-3.5 text-gold shrink-0" />
                <span className="truncate">{member.assignedProject || "Unassigned"}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-black/60 border border-neutral-800 rounded-xl text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-neutral-300">
                  <HardHat className="w-3.5 h-3.5 text-amber-400" />
                  <span>CSCS: {member.cscsCardNumber}</span>
                </div>
                <span className="text-neutral-400">Expires: {member.cscsExpiry}</span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                <span className="text-neutral-400">Weekly Logged Hours:</span>
                <span className="text-gold font-bold">{member.weeklyHoursLogged} hrs</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
              <a
                href={`tel:${member.phone}`}
                className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-gold" />
                <span>Call Crew</span>
              </a>
              <a
                href={`mailto:${member.email}`}
                className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-gold" />
                <span>Email</span>
              </a>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
