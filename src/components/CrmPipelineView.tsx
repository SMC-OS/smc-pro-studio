import React, { useState } from "react";
import {
  Users,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Phone,
  Mail,
  Calendar,
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  Building,
  Tag,
  Sparkles,
  ChevronRight,
  MoreVertical,
  MessageSquare,
  TrendingUp,
  Award
} from "lucide-react";

export interface CrmLead {
  id: string;
  clientName: string;
  companyName?: string;
  email: string;
  phone: string;
  projectAddress: string;
  stage: "Lead" | "Quote" | "Site Survey" | "Contract" | "Deposit" | "Fabrication" | "Installation" | "Invoiced" | "Complete";
  dealValue: number;
  materialPreference: string;
  source: "Website AI Estimator" | "Architect Referral" | "Showroom Visit" | "Instagram / Social" | "Trade Portal";
  assignedManager: string;
  lastContactDate: string;
  nextAction: string;
  notes: string[];
}

const INITIAL_LEADS: CrmLead[] = [
  {
    id: "CRM-101",
    clientName: "Alexander Wright",
    companyName: "Kensington Luxury Living",
    email: "alexander.wright@kensington.co.uk",
    phone: "+44 20 7946 0912",
    projectAddress: "14 Phillimore Gardens, Kensington, London W8 7QG",
    stage: "Fabrication",
    dealValue: 48500,
    materialPreference: "Calacatta Gold Quartzite (30mm)",
    source: "Architect Referral",
    assignedManager: "James Sterling (Senior Mason)",
    lastContactDate: "2026-08-02",
    nextAction: "Final CNC cut verification & edge polish sign-off",
    notes: ["Architect requested 45-degree miter waterfall edge.", "Client paid 50% deposit via bank transfer."]
  },
  {
    id: "CRM-102",
    clientName: "Lady Sarah Spencer",
    companyName: "Spencer Hall Estate",
    email: "s.spencer@spencerhall.co.uk",
    phone: "+44 1865 482910",
    projectAddress: "Spencer Hall, Cotswolds, Oxfordshire OX7 3HE",
    stage: "Site Survey",
    dealValue: 92000,
    materialPreference: "Statuario Extra Marble & Verde Alpi",
    source: "Showroom Visit",
    assignedManager: "David Vance (Chief Templater)",
    lastContactDate: "2026-08-01",
    nextAction: "3D LiDAR Scanner survey appointment scheduled for Thursday 10:00 AM",
    notes: ["Heritage Grade II listed building.", "Substrate laser levelling required."]
  },
  {
    id: "CRM-103",
    clientName: "Marcus Vance",
    companyName: "Mayfair Penthouse Developments",
    email: "m.vance@mayfairdevs.com",
    phone: "+44 20 7123 4567",
    projectAddress: "Penthouse B, 42 Grosvenor Square, Mayfair, London W1K 2HP",
    stage: "Quote",
    dealValue: 64000,
    materialPreference: "Nero Marquina & Arabescato Porcelain",
    source: "Website AI Estimator",
    assignedManager: "Sophie Taylor (Sales Director)",
    lastContactDate: "2026-08-03",
    nextAction: "Send revised PDF quote with integrated LED channel lighting allowance",
    notes: ["Generated quote via AI Estimator in 45 seconds.", "Requested bookmatched island slab layout."]
  },
  {
    id: "CRM-104",
    clientName: "Dr. Oliver Harris",
    email: "oliver.harris@harleyst.co.uk",
    phone: "+44 20 7987 6543",
    projectAddress: "88 Harley Street, Marylebone, London W1G 7HN",
    stage: "Contract",
    dealValue: 29500,
    materialPreference: "Concrete Matte Porcelain (12mm)",
    source: "Trade Portal",
    assignedManager: "James Sterling (Senior Mason)",
    lastContactDate: "2026-07-30",
    nextAction: "Awaiting e-signature on British Stonework Contract v4.2",
    notes: ["Medical clinic reception desk.", "Requires ultra-hygienic zero-porosity surface."]
  },
  {
    id: "CRM-105",
    clientName: "Victoria Sterling",
    companyName: "Chelsea Design Studio",
    email: "victoria@chelseadesign.co.uk",
    phone: "+44 20 8111 2233",
    projectAddress: "22 Kings Road, Chelsea, London SW3 4RP",
    stage: "Installation",
    dealValue: 38000,
    materialPreference: "Taj Mahal Quartzite (20mm)",
    source: "Instagram / Social",
    assignedManager: "Mark Reynolds (Site Lead)",
    lastContactDate: "2026-08-03",
    nextAction: "Site installation team en-route with A-frame transport truck",
    notes: ["Crane lift booked for 08:30 AM.", "Road closure permit secured from Chelsea council."]
  }
];

const STAGES: CrmLead["stage"][] = [
  "Lead",
  "Quote",
  "Site Survey",
  "Contract",
  "Deposit",
  "Fabrication",
  "Installation",
  "Invoiced",
  "Complete"
];

export default function CrmPipelineView() {
  const [leads, setLeads] = useState<CrmLead[]>(INITIAL_LEADS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(INITIAL_LEADS[0]);
  const [newNoteInput, setNewNoteInput] = useState("");
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);

  // Filtered leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.companyName && lead.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      lead.projectAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.materialPreference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = selectedStage === "all" || lead.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  const totalPipelineValue = leads.reduce((sum, l) => sum + l.dealValue, 0);

  const handleStageChange = (leadId: string, newStage: CrmLead["stage"]) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, stage: newStage } : null));
    }
  };

  const handleAddNote = (leadId: string) => {
    if (!newNoteInput.trim()) return;
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, notes: [newNoteInput.trim(), ...l.notes] } : l
      )
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) =>
        prev ? { ...prev, notes: [newNoteInput.trim(), ...prev.notes] } : null
      );
    }
    setNewNoteInput("");
  };

  return (
    <div className="space-y-6 animate-fade-in text-neutral-100">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gold uppercase font-bold tracking-widest bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
              SMC PRO SALES & CLIENT RELATIONS
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              LIVE PIPELINE
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Central CRM & Project Pipeline
          </h2>
          <p className="text-xs text-neutral-400 font-sans max-w-2xl">
            Track customer inquiries, automated quote leads, site surveys, contract status, deposit payments, and installation milestones across all active projects.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-black/60 border border-neutral-800 px-4 py-3 rounded-xl text-right">
            <span className="text-[10px] font-mono text-neutral-400 block uppercase">Total Pipeline Value</span>
            <span className="font-serif text-2xl font-bold text-gold">£{totalPipelineValue.toLocaleString()}</span>
          </div>
          <button
            onClick={() => setShowAddLeadModal(true)}
            className="px-4 py-3 bg-gold hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Lead</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-900/80 border border-neutral-800 p-3.5 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search client, address, material..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-gold font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          <span className="text-[10px] font-mono text-neutral-400 uppercase shrink-0">Stage:</span>
          <button
            onClick={() => setSelectedStage("all")}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 cursor-pointer ${
              selectedStage === "all" ? "bg-gold text-neutral-950" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            All ({leads.length})
          </button>
          {STAGES.map((stg) => {
            const count = leads.filter((l) => l.stage === stg).length;
            return (
              <button
                key={stg}
                onClick={() => setSelectedStage(stg)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedStage === stg ? "bg-gold text-neutral-950 font-bold" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
                }`}
              >
                <span>{stg}</span>
                <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Pipeline Columns & Lead Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Lead Cards List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400 px-1">
            <span>Showing {filteredLeads.length} Lead Record(s)</span>
            <span>Click any lead to manage touchpoints</span>
          </div>

          <div className="space-y-3">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                  selectedLead?.id === lead.id
                    ? "bg-neutral-900 border-gold shadow-[0_0_20px_rgba(212,175,55,0.15)]"
                    : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
                      {lead.id}
                    </span>
                    <h3 className="font-serif text-base font-bold text-white">
                      {lead.clientName}
                    </h3>
                    {lead.companyName && (
                      <span className="text-xs text-neutral-400 font-sans">({lead.companyName})</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-gold text-sm">
                      £{lead.dealValue.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {lead.stage}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans text-neutral-300 pt-3">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Building className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span className="truncate">{lead.projectAddress}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Tag className="w-3.5 h-3.5 text-gold shrink-0" />
                    <span className="truncate">{lead.materialPreference}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-400 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span>Last Contact: {lead.lastContactDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{lead.nextAction}</span>
                  </div>
                </div>
              </div>
            ))}

            {filteredLeads.length === 0 && (
              <div className="p-8 text-center bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-400 space-y-2">
                <Users className="w-8 h-8 mx-auto text-neutral-600" />
                <p className="text-xs font-mono">No CRM records found matching search filters.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Lead Details Drawer */}
        <div className="lg:col-span-1">
          {selectedLead ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-5 sticky top-20 shadow-2xl">
              
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono text-gold uppercase font-bold tracking-wider">Lead Dossier</span>
                  <h3 className="font-serif text-xl font-bold text-white">{selectedLead.clientName}</h3>
                  <p className="text-xs text-neutral-400 font-mono">{selectedLead.email}</p>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-2 py-1 rounded border border-amber-800 font-bold">
                  {selectedLead.id}
                </span>
              </div>

              {/* Stage Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-neutral-400 block font-bold">Move Stage</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {STAGES.map((stg) => (
                    <button
                      key={stg}
                      onClick={() => handleStageChange(selectedLead.id, stg)}
                      className={`py-1.5 px-2 rounded text-[10px] font-mono transition-all cursor-pointer text-center truncate ${
                        selectedLead.stage === stg
                          ? "bg-gold text-neutral-950 font-black shadow-xs"
                          : "bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800"
                      }`}
                    >
                      {stg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Actions */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${selectedLead.phone}`}
                  className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-gold" />
                  <span>Call Client</span>
                </a>
                <a
                  href={`mailto:${selectedLead.email}`}
                  className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-gold" />
                  <span>Send Email</span>
                </a>
              </div>

              {/* Details List */}
              <div className="p-3 bg-black/60 border border-neutral-800/80 rounded-xl space-y-2 text-xs font-sans">
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase block">Project Address</span>
                  <span className="text-neutral-200">{selectedLead.projectAddress}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase block">Material Specification</span>
                  <span className="text-gold font-semibold">{selectedLead.materialPreference}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-neutral-800 text-[11px] font-mono">
                  <span className="text-neutral-400">Assigned Manager:</span>
                  <span className="text-white font-bold">{selectedLead.assignedManager}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-neutral-400">Acquisition Source:</span>
                  <span className="text-amber-400">{selectedLead.source}</span>
                </div>
              </div>

              {/* Touchpoint Notes Timeline */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-neutral-400 block font-bold flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-gold" /> Touchpoint Notes
                </span>

                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                  {selectedLead.notes.map((note, idx) => (
                    <div key={idx} className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 leading-snug">
                      • {note}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add meeting or phone note..."
                    value={newNoteInput}
                    onChange={(e) => setNewNoteInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddNote(selectedLead.id)}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-gold font-sans"
                  />
                  <button
                    onClick={() => handleAddNote(selectedLead.id)}
                    className="py-1.5 px-3 bg-gold hover:bg-amber-400 text-neutral-950 text-xs font-mono font-bold rounded-lg cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center text-neutral-500 text-xs font-mono">
              Select a lead from the list to view touchpoint records.
            </div>
          )}
        </div>

      </div>

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-gold/40 text-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2 border-b border-neutral-800 pb-3">
              <Users className="w-5 h-5 text-gold" /> Register New Project Lead
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newEntry: CrmLead = {
                  id: "CRM-" + (100 + leads.length + 1),
                  clientName: formData.get("clientName") as string,
                  companyName: (formData.get("companyName") as string) || undefined,
                  email: formData.get("email") as string,
                  phone: formData.get("phone") as string,
                  projectAddress: formData.get("projectAddress") as string,
                  stage: "Lead",
                  dealValue: Number(formData.get("dealValue") || 25000),
                  materialPreference: formData.get("materialPreference") as string,
                  source: "Website AI Estimator",
                  assignedManager: "James Sterling (Senior Mason)",
                  lastContactDate: new Date().toISOString().split("T")[0],
                  nextAction: "Initial consultation & sample request",
                  notes: ["Registered manually via SMC Pro CRM Portal."]
                };
                setLeads([newEntry, ...leads]);
                setSelectedLead(newEntry);
                setShowAddLeadModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-[10px] font-mono text-neutral-400 block mb-1">Client Full Name *</label>
                <input required name="clientName" placeholder="e.g. Lord Rupert Kensington" className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-neutral-400 block mb-1">Email Address *</label>
                  <input required name="email" type="email" placeholder="client@example.co.uk" className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-400 block mb-1">Phone Number *</label>
                  <input required name="phone" placeholder="+44 20 ..." className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-white" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-neutral-400 block mb-1">Project Site Address *</label>
                <input required name="projectAddress" placeholder="e.g. Eaton Square, Belgravia, London" className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-neutral-400 block mb-1">Estimated Deal Value (£) *</label>
                  <input required name="dealValue" type="number" defaultValue="35000" className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-400 block mb-1">Material Preference</label>
                  <input name="materialPreference" defaultValue="Calacatta Gold Quartzite" className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-white" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gold hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold rounded-lg cursor-pointer"
                >
                  Create CRM Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
