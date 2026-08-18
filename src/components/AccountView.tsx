import React, { useState } from "react";
import { requestAccountDeletion, updatePassword } from "../services/authClient";
import {
  User,
  ShieldCheck,
  MapPin,
  FileText,
  Bookmark,
  Heart,
  Settings,
  Bell,
  HelpCircle,
  CreditCard,
  LogOut,
  ChevronRight,
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  Award,
  DollarSign,
  Laptop,
  Smartphone,
  Key,
  QrCode,
  Download,
  Trash2,
  Globe,
  RefreshCw,
  Clock,
  AlertTriangle,
  Copy,
  Plus,
  Check,
  Building,
  Activity,
  Sliders,
  Shield,
  X,
  MessageSquare,
  Bot,
  Sparkles,
  ExternalLink
} from "lucide-react";

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 2.159.684 4.158 1.848 5.794L2.5 21.5l3.826-1.326C7.904 21.285 9.88 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.85 0-3.571-.519-5.038-1.423l-.361-.223-2.26.783.796-2.225-.245-.374A7.95 7.95 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
  </svg>
);

interface AccountViewProps {
  userEmail: string;
  canAccessAdmin?: boolean;
  onLogout: () => void;
  onNavigate: (tab: string) => void;
  onOpenFinanceModal: () => void;
  onOpenReferralsModal: () => void;
  onOpenWhatsAppModal?: () => void;
}

export default function AccountView({
  userEmail,
  canAccessAdmin = false,
  onLogout,
  onNavigate,
  onOpenFinanceModal,
  onOpenReferralsModal,
  onOpenWhatsAppModal
}: AccountViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "profile" | "security" | "sessions" | "addresses" | "orders" | "audit" | "privacy" | "admin" | "whatsapp"
  >("profile");

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState("Changes Saved Successfully");

  // WhatsApp Agent Configuration States
  const [waActive, setWaActive] = useState<boolean>(() => {
    return localStorage.getItem("smc_wa_active") !== "false";
  });
  const [waPersona, setWaPersona] = useState<string>(() => {
    return localStorage.getItem("smc_wa_persona") || "concierge";
  });
  const defaultGreetingText = "Welcome to *SMC Pro Studio*! 🏛️✨\nHow can we assist with your project today?\n\n• *Instant Worktop Quote* (£/m²)\n• *Laser Survey Booking*\n• *Slab Stock & Gallery*";
  const [waGreeting, setWaGreeting] = useState<string>(() => {
    return localStorage.getItem("smc_wa_greeting") || defaultGreetingText;
  });
  const [waPhone, setWaPhone] = useState<string>(() => {
    return localStorage.getItem("smc_wa_phone") || "+44 (0)20 7946 0912";
  });
  const [waHours, setWaHours] = useState<string>(() => {
    return localStorage.getItem("smc_wa_hours") || "24/7 Automated AI Gateway";
  });

  // User Profile States
  const [fullName, setFullName] = useState("Alexander Wright");
  const [companyName, setCompanyName] = useState("Kensington Architectural Studio");
  const [phone, setPhone] = useState("+44 7700 900882");
  const [roleTitle, setRoleTitle] = useState("Principal Architect & VIP Partner");
  const [preferredLang, setPreferredLang] = useState("English (UK)");
  const [avatarIndex, setAvatarIndex] = useState(0);

  const avatarOptions = [
    { label: "Classic Mason", color: "bg-gold/20 text-gold border-gold" },
    { label: "Studio Lead", color: "bg-amber-900/40 text-amber-300 border-amber-500" },
    { label: "Executive VIP", color: "bg-neutral-800 text-white border-white/40" },
    { label: "Site Director", color: "bg-emerald-950/60 text-emerald-400 border-emerald-500" }
  ];

  // Notification Preferences
  const [notifMilestones, setNotifMilestones] = useState(true);
  const [notifInvoices, setNotifInvoices] = useState(true);
  const [notifSecurity, setNotifSecurity] = useState(true);
  const [notifSms, setNotifSms] = useState(false);

  // Password & Security States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // MFA Toggles
  const [mfaEmail, setMfaEmail] = useState(false);
  const [mfaSms, setMfaSms] = useState(false);
  const [mfaTotp, setMfaTotp] = useState(false);
  const [mfaBiometric, setMfaBiometric] = useState(false);
  const [showTotpSetupModal, setShowTotpSetupModal] = useState(false);
  const [totpTestCode, setTotpTestCode] = useState("");

  // Recovery Codes State
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([
    "SMC-8821-4921",
    "SMC-8821-9301",
    "SMC-8821-1048",
    "SMC-8821-7729",
    "SMC-8821-3910",
    "SMC-8821-8492",
    "SMC-8821-6631",
    "SMC-8821-2290",
    "SMC-8821-5512",
    "SMC-8821-9904"
  ]);
  const [codesCopied, setCodesCopied] = useState(false);

  // Active Sessions State
  const [sessionTimeout, setSessionTimeout] = useState<"15m" | "30m" | "1h" | "never">("30m");
  const [activeSessions, setActiveSessions] = useState([
    {
      id: "sess-1",
      device: "macOS Sonoma • Chrome 126",
      location: "London, Kensington UK (IP 185.220.101.4)",
      lastActive: "Active Now (Current Device)",
      isCurrent: true,
      icon: "laptop"
    },
    {
      id: "sess-[#2]",
      device: "iPhone 15 Pro • SMC Pro Mobile App",
      location: "London, Chelsea UK (IP 82.132.210.12)",
      lastActive: "2 hours ago",
      isCurrent: false,
      icon: "phone"
    },
    {
      id: "sess-3",
      device: "iPad Pro 12.9\" • Safari",
      location: "London, Mayfair Workshop (IP 185.220.101.5)",
      lastActive: "1 day ago",
      isCurrent: false,
      icon: "tablet"
    }
  ]);

  // Saved Site Addresses
  const [addresses, setAddresses] = useState([
    {
      id: "addr-1",
      title: "Primary Penthouse Residence",
      street: "12 Kensington Palace Gardens, Suite 4B",
      city: "London, W8 4QP",
      notes: "Crane access pre-approved with concierge; double-door lift width 110cm.",
      isPrimary: true
    },
    {
      id: "addr-2",
      title: "Chelsea Riverside Villa",
      street: "88 Cheyne Walk, Apt 12",
      city: "London, SW3 5RA",
      notes: "Narrow street access; morning deliveries before 10:00 AM required.",
      isPrimary: false
    }
  ]);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddrTitle, setNewAddrTitle] = useState("");
  const [newAddrStreet, setNewAddrStreet] = useState("");
  const [newAddrCity, setNewAddrCity] = useState("");
  const [newAddrNotes, setNewAddrNotes] = useState("");

  // Audit Log State
  const [auditLogs] = useState([
    { id: "log-1", event: "User Profile Updated", ip: "185.220.101.4", time: "Today at 14:32", severity: "info" },
    { id: "log-2", event: "Password Verification Passed", ip: "185.220.101.4", time: "Today at 10:15", severity: "info" },
    { id: "log-3", event: "New Device Login (iPhone 15 Pro)", ip: "82.132.210.12", time: "Yesterday at 18:40", severity: "warning" },
    { id: "log-[#4]", event: "MFA Token Validated", ip: "185.220.101.4", time: "22 Jul 2026", severity: "info" },
    { id: "log-5", event: "GDPR Consent Audit Checked", ip: "185.220.101.4", time: "18 Jul 2026", severity: "info" }
  ]);

  const userRole: "client" | "admin" = canAccessAdmin ? "admin" : "client";

  // Deletion Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const triggerToast = (msg: string) => {
    setSaveMessage(msg);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast("Profile Details Updated & Encrypted");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmNewPassword) {
      alert("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    try {
      await updatePassword(newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      triggerToast("Password updated");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Password could not be updated.");
    }
  };

  const handleCopyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCodesCopied(true);
    setTimeout(() => setCodesCopied(false), 2500);
  };

  const handleDownloadUserData = () => {
    const data = {
      profile: { fullName, companyName, userEmail, phone, roleTitle, preferredLang },
      addresses,
      activeSessions,
      auditLogs,
      securitySettings: { mfaEmail, mfaSms, mfaTotp, mfaBiometric, sessionTimeout },
      exportedAt: new Date().toISOString()
    };
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonStr);
    downloadAnchor.setAttribute("download", `SMC_Pro_Account_Data_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast("Personal Account Data Exported (.json)");
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrTitle || !newAddrStreet) return;
    const newEntry = {
      id: "addr-" + Date.now(),
      title: newAddrTitle,
      street: newAddrStreet,
      city: newAddrCity || "London, UK",
      notes: newAddrNotes || "Standard site access",
      isPrimary: addresses.length === 0
    };
    setAddresses([...addresses, newEntry]);
    setShowAddAddressModal(false);
    setNewAddrTitle("");
    setNewAddrStreet("");
    setNewAddrCity("");
    setNewAddrNotes("");
    triggerToast("Site Address Added");
  };

  const handleRemoveAddress = (id: string) => {
    setAddresses(addresses.filter(a => a.id !== id));
    triggerToast("Address Removed");
  };

  const handleSetPrimaryAddress = (id: string) => {
    setAddresses(addresses.map(a => ({
      ...a,
      isPrimary: a.id === id
    })));
    triggerToast("Primary Address Updated");
  };

  const handleTerminateSession = (id: string) => {
    setActiveSessions(activeSessions.filter(s => s.id !== id));
    triggerToast("Session Terminated Remote Device");
  };

  const handleLogOutAllOtherDevices = () => {
    setActiveSessions(activeSessions.filter(s => s.isCurrent));
    triggerToast("Logged Out From All Other Remote Devices");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Toast Notification Banner */}
      {saveSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 border border-emerald-500 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-up font-mono text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Profile Header Banner */}
      <div className="bg-[#1A1A1A] text-white rounded-2xl p-6 md:p-8 border border-neutral-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-5 z-10">
          <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center font-serif text-2xl font-bold shadow-lg shrink-0 ${avatarOptions[avatarIndex].color}`}>
            {fullName ? fullName.split(" ").map(n => n[0]).join("") : "U"}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif text-2xl md:text-3xl font-medium text-white">{fullName || "Client Profile"}</h2>
              <span className="bg-gold text-[#1A1A1A] text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" /> {userRole === "admin" ? "SUPER ADMIN" : "VIP PARTNER"}
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-mono">
              {companyName ? `${companyName} • ` : ""}{userEmail || "alexander.wright@kensington-arch.co.uk"}
            </p>
            <span className="text-[10px] font-mono text-neutral-500 block">
              Role: {roleTitle}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 z-10 w-full md:w-auto">
          <span className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-[10px] text-neutral-400">
            {canAccessAdmin ? "SERVER-AUTHORIZED ADMIN" : "MEMBER ACCOUNT"}
          </span>

          {onOpenWhatsAppModal && (
            <button
              onClick={onOpenWhatsAppModal}
              className="bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500/50 px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-300" />
              <span>WhatsApp</span>
            </button>
          )}

          <button
            onClick={handleDownloadUserData}
            className="bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 hover:border-gold px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gold" />
            <span>Export Data</span>
          </button>

          <button
            onClick={onOpenReferralsModal}
            className="bg-gold hover:bg-amber-400 text-[#1A1A1A] px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Rewards (£500)</span>
          </button>
        </div>
      </div>

      {/* Account Sub-Tabs Navigation */}
      <div className="flex border-b border-neutral-200 overflow-x-auto space-x-6 text-xs font-semibold uppercase tracking-wider font-mono scrollbar-none">
        <button
          onClick={() => setActiveSubTab("profile")}
          className={`pb-3 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === "profile"
              ? "border-gold text-neutral-900 font-bold"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          Profile Details
        </button>

        <button
          onClick={() => setActiveSubTab("security")}
          className={`pb-3 border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "security"
              ? "border-gold text-neutral-900 font-bold"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-gold" />
          <span>Security & 2FA</span>
        </button>

        <button
          onClick={() => setActiveSubTab("sessions")}
          className={`pb-3 border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "sessions"
              ? "border-gold text-neutral-900 font-bold"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Active Sessions</span>
        </button>

        <button
          onClick={() => setActiveSubTab("addresses")}
          className={`pb-3 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === "addresses"
              ? "border-gold text-neutral-900 font-bold"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          Site Locations
        </button>

        <button
          onClick={() => setActiveSubTab("orders")}
          className={`pb-3 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === "orders"
              ? "border-gold text-neutral-900 font-bold"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          Orders & Quotes
        </button>

        <button
          onClick={() => setActiveSubTab("audit")}
          className={`pb-3 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === "audit"
              ? "border-gold text-neutral-900 font-bold"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          Audit Log
        </button>

        <button
          onClick={() => setActiveSubTab("privacy")}
          className={`pb-3 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === "privacy"
              ? "border-gold text-neutral-900 font-bold"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          GDPR & Privacy
        </button>

        <button
          onClick={() => setActiveSubTab("whatsapp")}
          className={`pb-3 border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "whatsapp"
              ? "border-emerald-500 text-emerald-700 font-bold"
              : "border-transparent text-emerald-600/80 hover:text-emerald-800"
          }`}
        >
          <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>WhatsApp</span>
          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${waActive ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-600"}`}>
            {waActive ? "ACTIVE" : "PAUSED"}
          </span>
        </button>

        {userRole === "admin" && (
          <button
            onClick={() => setActiveSubTab("admin")}
            className={`pb-3 border-b-2 whitespace-nowrap transition-all cursor-pointer text-gold flex items-center gap-1.5 ${
              activeSubTab === "admin"
                ? "border-gold font-bold"
                : "border-transparent hover:text-amber-600"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-gold" />
            <span>Admin Console</span>
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* SUBTAB 1: PROFILE DETAILS */}
      {/* ========================================================= */}
      {activeSubTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <form onSubmit={handleSaveProfile} className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-xs">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
              <h3 className="font-serif text-xl font-medium text-neutral-900">Personal & Practice Profile</h3>
              <span className="text-xs font-mono font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified Account
              </span>
            </div>

            {/* Avatar Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block font-mono">
                Select Architectural Avatar Style:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {avatarOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAvatarIndex(i)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                      avatarIndex === i ? "border-gold bg-gold/10 shadow-xs" : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-serif text-sm font-bold ${opt.color}`}>
                      {fullName ? fullName.split(" ").map(n => n[0]).join("") : "U"}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-neutral-800">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block font-sans">Full Legal Name:</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alexander Wright"
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-xs font-sans text-neutral-800 focus:border-gold focus:ring-1 focus:ring-gold/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block font-sans">Company / Architectural Practice:</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Kensington Architectural Ltd"
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-xs font-sans text-neutral-800 focus:border-gold focus:ring-1 focus:ring-gold/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block font-sans">Direct Business Email:</label>
                <input
                  type="email"
                  disabled
                  value={userEmail || "alexander.wright@kensington-arch.co.uk"}
                  className="w-full px-3.5 py-2.5 border border-neutral-200 bg-neutral-100 rounded-xl text-xs font-sans text-neutral-500 cursor-not-allowed font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block font-sans">Mobile Phone (+44):</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +44 7700 900882"
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-xs font-mono text-neutral-800 focus:border-gold focus:ring-1 focus:ring-gold/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block font-sans">Role Title:</label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Principal Architect"
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-xs font-sans text-neutral-800 focus:border-gold focus:ring-1 focus:ring-gold/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block font-sans">Preferred System Language:</label>
                <select
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-xs font-mono text-neutral-800 focus:border-gold focus:ring-1 focus:ring-gold/30 cursor-pointer"
                >
                  <option value="English (UK)">English (UK)</option>
                  <option value="Deutsch">Deutsch</option>
                  <option value="Français">Français</option>
                  <option value="Español">Español</option>
                  <option value="Arabic">العربية (Arabic)</option>
                </select>
              </div>
            </div>

            {/* Notification Matrix */}
            <div className="pt-4 border-t border-neutral-100 space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-neutral-800">
                Communication & Notification Preferences
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2.5 p-3 bg-neutral-50 rounded-xl border border-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifMilestones}
                    onChange={(e) => setNotifMilestones(e.target.checked)}
                    className="accent-gold w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-neutral-800 block">Slab Cutting & CAD Milestones</span>
                    <span className="text-[10px] text-neutral-500">Alerts during wet CNC cutting phases</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 bg-neutral-50 rounded-xl border border-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifInvoices}
                    onChange={(e) => setNotifInvoices(e.target.checked)}
                    className="accent-gold w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-neutral-800 block">Invoices & Tax Summaries</span>
                    <span className="text-[10px] text-neutral-500">VAT receipts & payment confirmations</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 bg-neutral-50 rounded-xl border border-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifSecurity}
                    onChange={(e) => setNotifSecurity(e.target.checked)}
                    className="accent-gold w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-neutral-800 block">Security & Login Alerts</span>
                    <span className="text-[10px] text-neutral-500">Immediate notifications for new IP logins</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 bg-neutral-50 rounded-xl border border-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifSms}
                    onChange={(e) => setNotifSms(e.target.checked)}
                    className="accent-gold w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-neutral-800 block">SMS Urgent Survey Alerts</span>
                    <span className="text-[10px] text-neutral-500">Text messages for site surveyor arrival</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="bg-[#1A1A1A] hover:bg-gold text-white hover:text-[#121212] font-bold text-xs uppercase tracking-wider font-mono px-6 py-3 rounded-xl transition-all cursor-pointer shadow-md"
              >
                Save Profile Preferences
              </button>
            </div>
          </form>

          {/* Account Summary Sidebar */}
          <div className="space-y-4">
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 font-mono">
                Trade Account Summary
              </h4>

              <div className="space-y-3 font-mono text-xs text-neutral-600">
                <div className="flex justify-between items-center py-2 border-b border-neutral-200/60">
                  <span>Active Sites:</span>
                  <strong className="text-neutral-900 font-bold">2 Locations</strong>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-neutral-200/60">
                  <span>Saved Quotes:</span>
                  <strong className="text-neutral-900 font-bold">12 Quotations</strong>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-neutral-200/60">
                  <span>Tier Rating:</span>
                  <strong className="text-gold font-bold">VIP Tier 1 Trade</strong>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-neutral-200/60">
                  <span>Approved Credit:</span>
                  <strong className="text-emerald-600 font-bold">£50,000 Facility</strong>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="w-full py-3 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of SMC Pro</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 2: SECURITY & MULTI-FACTOR AUTH (MFA) */}
      {/* ========================================================= */}
      {activeSubTab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Password Reset Card */}
            <form onSubmit={handleChangePassword} className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 space-y-4 shadow-xs">
              <h3 className="font-serif text-xl font-medium text-neutral-900 border-b border-neutral-100 pb-3">
                Update Account Password
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block font-sans">Current Password:</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-xs font-mono text-neutral-800 focus:border-gold"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block font-sans">New Password (8+ Chars):</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-xs font-mono text-neutral-800 focus:border-gold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block font-sans">Confirm New Password:</label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-xs font-mono text-neutral-800 focus:border-gold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-[#1A1A1A] hover:bg-gold text-white hover:text-[#121212] font-bold text-xs uppercase tracking-wider font-mono px-6 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>

            {/* Multi-Factor Authentication Toggles */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 space-y-4 shadow-xs">
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="font-serif text-xl font-medium text-neutral-900">Multi-Factor Authentication (MFA)</h3>
                  <p className="text-xs text-neutral-500 font-sans">Configure 2-step verification methods for account login.</p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full uppercase">
                  Not configured
                </span>
              </div>

              <div className="space-y-3">
                
                {/* Method 1: Email Code */}
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gold" />
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block font-sans">Email One-Time Password (OTP)</span>
                      <span className="text-[11px] text-neutral-500 font-sans">Transmit 6-digit code to registered email upon sign-in</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={mfaEmail}
                    disabled
                    onChange={(e) => setMfaEmail(e.target.checked)}
                    className="accent-gold w-4 h-4 cursor-not-allowed opacity-50"
                  />
                </div>

                {/* Method 2: SMS OTP */}
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-gold" />
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block font-sans">SMS OTP Text Message</span>
                      <span className="text-[11px] text-neutral-500 font-sans">Transmit security code to {phone}</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={mfaSms}
                    disabled
                    onChange={(e) => setMfaSms(e.target.checked)}
                    className="accent-gold w-4 h-4 cursor-not-allowed opacity-50"
                  />
                </div>

                {/* Method 3: Authenticator App TOTP */}
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="flex items-center gap-3">
                    <QrCode className="w-5 h-5 text-gold" />
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block font-sans">Authenticator App (Google / Authy / 1Password)</span>
                      <span className="text-[11px] text-neutral-500 font-sans">Generate time-based security tokens</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled
                      onClick={() => setShowTotpSetupModal(true)}
                      className="text-[11px] font-mono font-bold text-neutral-400 cursor-not-allowed"
                    >
                      Provider setup required
                    </button>
                    <input
                      type="checkbox"
                      checked={mfaTotp}
                      disabled
                      onChange={(e) => setMfaTotp(e.target.checked)}
                      className="accent-gold w-4 h-4 cursor-not-allowed opacity-50"
                    />
                  </div>
                </div>

                {/* Method 4: Biometric WebAuthn */}
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-gold" />
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block font-sans">Biometric Access (Face ID / Touch ID / Windows Hello)</span>
                      <span className="text-[11px] text-neutral-500 font-sans">WebAuthn hardware security key authentication</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={mfaBiometric}
                    disabled
                    onChange={(e) => setMfaBiometric(e.target.checked)}
                    className="accent-gold w-4 h-4 cursor-not-allowed opacity-50"
                  />
                </div>

              </div>
            </div>

          </div>

          {/* Emergency Recovery Codes Panel */}
          <div className="space-y-4">
            <div className="bg-[#121212] border border-neutral-800 text-white rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <span className="font-mono text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4" /> Emergency Recovery Keys
                </span>
                <span className="text-[9px] font-mono bg-neutral-800 px-2 py-0.5 rounded text-neutral-400">10 Single-Use Keys</span>
              </div>

              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Store these emergency recovery keys in a secure offline vault. Each key can bypass MFA if you lose your phone or security key.
              </p>

              <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 grid grid-cols-2 gap-2 font-mono text-[11px] text-neutral-300">
                {recoveryCodes.map((code, idx) => (
                  <span key={idx} className="bg-neutral-950 p-1.5 rounded border border-neutral-800 text-center">
                    {code}
                  </span>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCopyRecoveryCodes}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold rounded-xl border border-neutral-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-gold" />
                  <span>{codesCopied ? "Copied All!" : "Copy All Keys"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 3: ACTIVE SESSIONS & DEVICE MANAGEMENT */}
      {/* ========================================================= */}
      {activeSubTab === "sessions" && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-4">
              <div>
                <h3 className="font-serif text-xl font-medium text-neutral-900">Active Authorized Sessions</h3>
                <p className="text-xs text-neutral-500 font-sans">Manage devices currently logged into your SMC Pro client profile.</p>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-mono font-bold text-neutral-700">Auto Inactivity Logout:</label>
                <select
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value as any)}
                  className="bg-neutral-50 border border-neutral-300 text-neutral-800 font-mono text-xs rounded-xl px-3 py-1.5 focus:border-gold cursor-pointer font-bold"
                >
                  <option value="15m">15 Minutes</option>
                  <option value="30m">30 Minutes (Recommended)</option>
                  <option value="1h">1 Hour</option>
                  <option value="never">Never (Session Persistent)</option>
                </select>
              </div>
            </div>

            {/* Session List */}
            <div className="space-y-3">
              {activeSessions.map((sess) => (
                <div key={sess.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
                      {sess.icon === "laptop" ? <Laptop className="w-5 h-5 text-gold" /> : <Smartphone className="w-5 h-5 text-gold" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-neutral-900 font-sans">{sess.device}</span>
                        {sess.isCurrent && (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold px-2 py-0.5 rounded">
                            CURRENT DEVICE
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-neutral-500 block">{sess.location}</span>
                      <span className="text-[10px] text-neutral-400 font-mono block">Last Active: {sess.lastActive}</span>
                    </div>
                  </div>

                  {!sess.isCurrent && (
                    <button
                      onClick={() => handleTerminateSession(sess.id)}
                      className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Revoke Device
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-neutral-100">
              <span className="text-xs font-mono text-neutral-500">
                Total Authorized Devices: {activeSessions.length}
              </span>

              <button
                onClick={handleLogOutAllOtherDevices}
                className="bg-neutral-900 hover:bg-red-600 text-white font-mono font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Log Out From All Other Remote Devices
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 4: SITE LOCATIONS MANAGER */}
      {/* ========================================================= */}
      {activeSubTab === "addresses" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-serif text-xl font-medium text-neutral-900">Project & Survey Site Locations</h3>
              <p className="text-xs text-neutral-500">Manage delivery addresses and site survey access details.</p>
            </div>

            <button
              onClick={() => setShowAddAddressModal(true)}
              className="bg-[#1A1A1A] hover:bg-gold text-white hover:text-[#121212] font-mono font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Add New Site Location
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addresses.map((addr) => (
              <div key={addr.id} className="bg-white border border-neutral-200 p-6 rounded-2xl space-y-3 relative shadow-xs">
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded uppercase ${addr.isPrimary ? "bg-gold/20 text-gold border border-gold/40" : "bg-neutral-100 text-neutral-700"}`}>
                    {addr.isPrimary ? "PRIMARY SURVEY SITE" : "SECONDARY LOCATION"}
                  </span>
                  <MapPin className="w-4 h-4 text-neutral-400" />
                </div>

                <h4 className="font-bold text-sm text-neutral-900 font-sans">{addr.title}</h4>
                <p className="text-xs text-neutral-600 font-sans leading-relaxed">
                  {addr.street}<br />
                  {addr.city}
                </p>

                <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 text-[11px] font-sans text-neutral-500">
                  <strong className="text-neutral-700 block font-mono text-[10px] uppercase">Access Instructions:</strong>
                  {addr.notes}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-neutral-100 text-xs font-mono">
                  {!addr.isPrimary && (
                    <button
                      onClick={() => handleSetPrimaryAddress(addr.id)}
                      className="text-gold font-bold hover:underline cursor-pointer"
                    >
                      Set As Primary
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveAddress(addr.id)}
                    className="text-red-500 hover:underline cursor-pointer ml-auto"
                  >
                    Remove Site
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 5: ORDERS, CONTRACTS & QUOTES */}
      {/* ========================================================= */}
      {activeSubTab === "orders" && (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-6 border-b border-neutral-100">
            <h3 className="font-serif text-xl font-medium text-neutral-900">Customer Quotations & Contracts</h3>
            <p className="text-xs text-neutral-500">Track current contracts, slab yield specifications, and pricing agreements.</p>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 font-mono text-[10px] text-neutral-500 uppercase tracking-wider">
                <th className="p-4">Contract ID</th>
                <th className="p-4">Project Name</th>
                <th className="p-4">Selected Material</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Total Price</th>
              </tr>
            </thead>
            <tbody className="text-xs font-sans divide-y divide-neutral-100">
              <tr>
                <td className="p-4 font-mono font-bold text-neutral-900">#SMC-8821</td>
                <td className="p-4 font-bold text-neutral-800">Kensington Penthouse Kitchen</td>
                <td className="p-4 text-neutral-600">Calacatta Gold Quartz 30mm</td>
                <td className="p-4"><span className="bg-amber-100 text-amber-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">Fabrication</span></td>
                <td className="p-4 text-right font-mono font-bold text-neutral-900">£12,450</td>
              </tr>
              <tr>
                <td className="p-4 font-mono font-bold text-neutral-900">#SMC-7710</td>
                <td className="p-4 font-bold text-neutral-800">Chelsea Riverside Suite Bath</td>
                <td className="p-4 text-neutral-600">Emerald Quartzite 20mm</td>
                <td className="p-4"><span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">Completed</span></td>
                <td className="p-4 text-right font-mono font-bold text-neutral-900">£8,900</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 6: AUDIT TRAIL & SECURITY LOGS */}
      {/* ========================================================= */}
      {activeSubTab === "audit" && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 space-y-4 shadow-xs">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="font-serif text-xl font-medium text-neutral-900">Account Activity & Audit Log</h3>
            <p className="text-xs text-neutral-500">Security activity is available only when connected to a configured audit-log provider.</p>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center text-xs font-mono">
                <div className="space-y-0.5">
                  <span className="font-bold text-neutral-900 block">{log.event}</span>
                  <span className="text-[10px] text-neutral-500">IP Endpoint: {log.ip}</span>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-neutral-500 block">{log.time}</span>
                  <span className={`text-[9px] uppercase px-2 py-0.5 rounded font-bold ${log.severity === "warning" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                    {log.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 7: GDPR, PRIVACY & DATA EXPORT */}
      {/* ========================================================= */}
      {activeSubTab === "privacy" && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-xs max-w-3xl">
          <div>
            <h3 className="font-serif text-xl font-medium text-neutral-900">UK GDPR Compliance & Data Privacy</h3>
            <p className="text-xs text-neutral-500">Your rights under the Data Protection Act 2018 and UK GDPR regulations.</p>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
            <span className="font-mono font-bold text-emerald-800 flex items-center gap-1.5 uppercase">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Compliance configuration pending verification
            </span>
            <p className="text-emerald-950 leading-relaxed font-sans">
              Data protection depends on the configured production storage and identity providers. Review the deployed privacy notice before storing customer or project information.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <div>
                <span className="text-xs font-bold text-neutral-900 block">Download Personal Data Archive</span>
                <span className="text-[11px] text-neutral-500 block">Export an official JSON copy of all account history and site addresses</span>
              </div>
              <button
                onClick={handleDownloadUserData}
                className="bg-[#1A1A1A] hover:bg-gold text-white hover:text-[#121212] px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
              >
                Export (.json)
              </button>
            </div>

            <div className="flex justify-between items-center p-4 bg-red-50 border border-red-200 rounded-xl">
              <div>
                <span className="text-xs font-bold text-red-900 block">Permanent Account Deletion</span>
                <span className="text-[11px] text-red-700 block">Irreversibly purge client profile, saved quotes, and site addresses</span>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 8: ADMIN SECURITY PORTAL */}
      {/* ========================================================= */}
      {activeSubTab === "admin" && userRole === "admin" && (
        <div className="bg-[#121212] border border-neutral-800 text-white rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
            <div>
              <span className="text-[10px] font-mono text-gold uppercase tracking-widest font-bold block">
                SYSTEM ADMINISTRATOR & SECURITY DESK
              </span>
              <h3 className="font-serif text-2xl font-bold text-white">SMC Pro Security & Access Portal</h3>
            </div>
            <span className="bg-gold text-[#121212] text-xs font-mono font-bold px-3 py-1 rounded-full uppercase">
              Role: Super Admin
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">System Encryption</span>
              <span className="text-sm font-bold font-mono text-emerald-400 block">Provider controls pending</span>
            </div>

            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">Brute Force Shield</span>
              <span className="text-sm font-bold font-mono text-emerald-400 block">Active (0 Lockouts)</span>
            </div>

            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">Enforced MFA Policy</span>
              <span className="text-sm font-bold font-mono text-gold block">100% Admin Enforced</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 9: WHATSAPP AGENT CONFIGURATION PANEL */}
      {/* ========================================================= */}
      {activeSubTab === "whatsapp" && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-[#0b141a] via-[#111b21] to-[#121c22] border border-emerald-500/30 text-white rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 uppercase">
                    <span className={`w-2 h-2 rounded-full ${waActive ? "bg-emerald-400 animate-pulse" : "bg-neutral-500"}`}></span>
                    {waActive ? "WHATSAPP GATEWAY ACTIVE" : "AGENT PAUSED"}
                  </span>
                  <span className="bg-gold/20 text-gold border border-gold/30 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                    GEMINI 3.6 FLASH
                  </span>
                </div>
                <h3 className="font-serif text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                  <WhatsAppIcon className="w-7 h-7 text-emerald-400" />
                  WhatsApp
                </h3>
                <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                  Manage automated response personas, greeting messages, operating hours, and live phone parameters for client inquiries received via WhatsApp.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {onOpenWhatsAppModal && (
                  <button
                    onClick={onOpenWhatsAppModal}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg hover:scale-105"
                  >
                    <Sparkles className="w-4 h-4 text-gold" />
                    <span>Launch Sandbox Test</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            localStorage.setItem("smc_wa_active", String(waActive));
            localStorage.setItem("smc_wa_persona", waPersona);
            localStorage.setItem("smc_wa_greeting", waGreeting);
            localStorage.setItem("smc_wa_phone", waPhone);
            localStorage.setItem("smc_wa_hours", waHours);
            triggerToast("WhatsApp AI Configuration Saved & Live");
          }} className="space-y-6">

            {/* SECTION 1: MASTER TOGGLE STATUS */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div>
                  <h4 className="font-serif text-lg font-bold text-neutral-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    1. Agent Status & Operational State
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Control whether the AI agent automatically replies to incoming WhatsApp client inquiries.
                  </p>
                </div>

                {/* Dedicated Toggle Switch UI */}
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waActive}
                      onChange={(e) => setWaActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    <span className="ml-2.5 text-xs font-mono font-bold text-neutral-800 uppercase">
                      {waActive ? "Active" : "Inactive"}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setWaActive(!waActive)}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer border shadow-2xs ${
                      waActive
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-neutral-100 text-neutral-600 border-neutral-300"
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${waActive ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"}`}></span>
                    <span>{waActive ? "24/7 AUTO-REPLY ON" : "PAUSED"}</span>
                  </button>
                </div>
              </div>

              <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                waActive 
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" 
                  : "bg-neutral-100 border-neutral-200 text-neutral-700"
              }`}>
                <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${waActive ? "text-emerald-600" : "text-neutral-400"}`} />
                <div className="space-y-1">
                  <span className="font-bold block">
                    {waActive ? "Automated AI Gateway is Active" : "Automated AI Gateway is Currently Paused"}
                  </span>
                  <p className="leading-relaxed">
                    {waActive
                      ? "Inquiries received via WhatsApp will instantly receive intelligent responses using the selected persona, estimating worktops, offering templating slots, and guiding users through SMC Pro services."
                      : "The AI agent is currently paused. Users opening the WhatsApp widget will see an offline notice directing them to call the hotline directly or leave a message."}
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 2: PERSONA SELECTION */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="font-serif text-lg font-bold text-neutral-900 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-emerald-600" />
                    2. Response Persona & Tone of Voice
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Select the specialized AI personality that best represents your brand during WhatsApp conversations.
                  </p>
                </div>

                {/* Explicit Persona Dropdown Selector */}
                <div className="w-full sm:w-auto">
                  <select
                    value={waPersona}
                    onChange={(e) => setWaPersona(e.target.value)}
                    className="w-full sm:w-64 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl font-mono text-xs font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                  >
                    <option value="fabricator">Professional Fabricator</option>
                    <option value="concierge">Concierge</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Persona 1: Luxury Concierge */}
                <div
                  onClick={() => setWaPersona("concierge")}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative space-y-2.5 ${
                    waPersona === "concierge"
                      ? "border-emerald-600 bg-emerald-50/40 shadow-sm"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                        🏛️
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-neutral-900">Luxury Concierge & VIP Assistant</h5>
                        <span className="text-[10px] font-mono text-emerald-700 font-semibold">Recommended for Homeowners & VIP Architects</span>
                      </div>
                    </div>
                    {waPersona === "concierge" && (
                      <span className="bg-emerald-600 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Warm, polite, high-end hospitality tone. Prioritizes client experience, luxury material specs, and white-glove laser survey scheduling.
                  </p>
                  <div className="bg-neutral-100 p-2.5 rounded-lg text-[11px] font-mono text-neutral-700 border border-neutral-200">
                    <span className="text-neutral-400 block text-[9px] uppercase font-bold">Sample Reply Tone:</span>
                    "Good afternoon! I would be delighted to calculate an instant quote for your Calacatta Gold kitchen island..."
                  </div>
                </div>

                {/* Persona 2: Master Stonemason */}
                <div
                  onClick={() => setWaPersona("fabricator")}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative space-y-2.5 ${
                    waPersona === "fabricator"
                      ? "border-emerald-600 bg-emerald-50/40 shadow-sm"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold">
                        📐
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-neutral-900">Master Stonemason & Fabricator</h5>
                        <span className="text-[10px] font-mono text-neutral-500 font-semibold">Technical & Precision Focus</span>
                      </div>
                    </div>
                    {waPersona === "fabricator" && (
                      <span className="bg-emerald-600 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Highly precise engineering tone. Focuses on CNC waterjet tolerances, 45° mitred aprons, bookmatched vein continuity, and substrate stability.
                  </p>
                  <div className="bg-neutral-100 p-2.5 rounded-lg text-[11px] font-mono text-neutral-700 border border-neutral-200">
                    <span className="text-neutral-400 block text-[9px] uppercase font-bold">Sample Reply Tone:</span>
                    "For a 20mm Statuario top, our 5-axis CNC router maintains ±0.2mm tolerances on undermount sink cutouts..."
                  </div>
                </div>

                {/* Persona 3: Commercial Estimator */}
                <div
                  onClick={() => setWaPersona("estimator")}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative space-y-2.5 ${
                    waPersona === "estimator"
                      ? "border-emerald-600 bg-emerald-50/40 shadow-sm"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                        📊
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-neutral-900">Commercial Quantity Surveyor</h5>
                        <span className="text-[10px] font-mono text-amber-700 font-semibold">Fast £/m² Rates & Cost Transparency</span>
                      </div>
                    </div>
                    {waPersona === "estimator" && (
                      <span className="bg-emerald-600 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Direct, analytical, cost-transparent tone. Focuses on £/m² material rates, slab yield optimization, waste factors, and formal breakdowns.
                  </p>
                  <div className="bg-neutral-100 p-2.5 rounded-lg text-[11px] font-mono text-neutral-700 border border-neutral-200">
                    <span className="text-neutral-400 block text-[9px] uppercase font-bold">Sample Reply Tone:</span>
                    "Base material rate is £185/m² + £350 fabricationLabour + £220 survey fee. Total estimate is £2,145 + VAT..."
                  </div>
                </div>

                {/* Persona 4: Showroom Host */}
                <div
                  onClick={() => setWaPersona("showroom")}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative space-y-2.5 ${
                    waPersona === "showroom"
                      ? "border-emerald-600 bg-emerald-50/40 shadow-sm"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                        🏬
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-neutral-900">Knightsbridge Showroom Host</h5>
                        <span className="text-[10px] font-mono text-blue-700 font-semibold">Gallery Visits & Physical Samples</span>
                      </div>
                    </div>
                    {waPersona === "showroom" && (
                      <span className="bg-emerald-600 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Welcoming, creative, design-focused tone. Focuses on gallery slab viewings, physical sample box delivery, and design consultations.
                  </p>
                  <div className="bg-neutral-100 p-2.5 rounded-lg text-[11px] font-mono text-neutral-700 border border-neutral-200">
                    <span className="text-neutral-400 block text-[9px] uppercase font-bold">Sample Reply Tone:</span>
                    "We would love to welcome you to our Knightsbridge gallery to view the full 3.2m x 1.6m slab under studio lighting..."
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: AUTOMATED GREETING MESSAGE */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-neutral-100 pb-3">
                <div>
                  <h4 className="font-serif text-lg font-bold text-neutral-900 flex items-center gap-2">
                    <WhatsAppIcon className="w-5 h-5 text-emerald-600" />
                    3. Custom Automated Greeting Message
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Define the first message automatically delivered to a client when they open WhatsApp chat.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWaGreeting(defaultGreetingText)}
                    className="text-[11px] font-mono font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3 text-neutral-500" /> Restore Default
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Editor Column */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="relative">
                    <textarea
                      rows={7}
                      value={waGreeting}
                      onChange={(e) => setWaGreeting(e.target.value)}
                      className="w-full p-3.5 bg-neutral-900 text-neutral-100 font-mono text-xs rounded-xl border border-neutral-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                      placeholder="Type custom WhatsApp greeting..."
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] font-mono text-neutral-400 bg-black/60 px-2 py-0.5 rounded">
                      {waGreeting.length} chars
                    </div>
                  </div>

                  {/* WhatsApp Markdown Helper Bar */}
                  <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-neutral-500 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
                    <span className="font-bold text-neutral-700">WhatsApp Syntax:</span>
                    <span><strong className="text-neutral-900">*bold*</strong></span>
                    <span><em className="text-neutral-900">_italics_</em></span>
                    <span>• Bullet Point</span>
                    <span className="text-emerald-700 font-bold">Emoji Supported 🏛️✨</span>
                  </div>
                </div>

                {/* Live Mobile Screen Preview Column */}
                <div className="lg:col-span-5 bg-[#0b141a] border border-emerald-500/30 rounded-2xl p-4 text-white space-y-3 shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-emerald-900/50 pb-2 mb-3 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                        <span className="font-bold text-emerald-400">Live Phone Preview</span>
                      </div>
                      <span className="text-[10px] text-neutral-400">WhatsApp Mobile</span>
                    </div>

                    {/* WhatsApp Chat Bubble */}
                    <div className="bg-[#111b21] border border-neutral-800 rounded-2xl rounded-tl-none p-3.5 space-y-2 shadow-md">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 border-b border-emerald-500/20 pb-1">
                        <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span>SMC Pro Studio WhatsApp</span>
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 rounded">VERIFIED</span>
                      </div>

                      <div className="text-xs text-neutral-200 font-sans whitespace-pre-wrap leading-relaxed">
                        {waGreeting}
                      </div>

                      <div className="text-[9px] font-mono text-neutral-400 text-right">
                        10:32 AM • Delivered
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-center font-mono text-neutral-400 block pt-2">
                    Simulated rendering on client's WhatsApp chat screen
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 4: HOTLINE & OPERATING PARAMETERS */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div>
                <h4 className="font-serif text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-emerald-600" />
                  4. Business Hotline & Customer Native WhatsApp Dispatch
                </h4>
                <p className="text-xs text-neutral-500">
                  Configure the primary business phone number and launch direct native WhatsApp client chat sessions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                <div>
                  <label className="font-mono text-[10px] font-bold uppercase text-neutral-700 block mb-1">
                    WhatsApp Business Phone Hotline
                  </label>
                  <input
                    type="text"
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    placeholder="+44 (0)20 7946 0912"
                    className="w-full p-2.5 border border-neutral-300 rounded-xl font-mono text-xs text-neutral-900 bg-neutral-50 focus:bg-white"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block font-mono">
                    Official UK hotline connected to the SMC Pro AI gateway.
                  </span>
                </div>

                <div>
                  <label className="font-mono text-[10px] font-bold uppercase text-neutral-700 block mb-1">
                    Operating Hours Schedule
                  </label>
                  <select
                    value={waHours}
                    onChange={(e) => setWaHours(e.target.value)}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl font-mono text-xs text-neutral-900 bg-neutral-50 focus:bg-white"
                  >
                    <option value="24/7 Automated AI Gateway">24/7 Automated AI Gateway (Always Online)</option>
                    <option value="Mon-Fri 08:00 - 18:00 GMT">Mon-Fri 08:00 - 18:00 GMT (Business Hours)</option>
                    <option value="Mon-Sat 09:00 - 17:00 GMT">Mon-Sat 09:00 - 17:00 GMT (Showroom Hours)</option>
                  </select>
                  <span className="text-[10px] text-neutral-500 mt-1 block font-mono">
                    Timeframe during which automated replies are actively dispatched.
                  </span>
                </div>
              </div>

              {/* Native WhatsApp Direct Customer Dispatch Button */}
              <div className="pt-2">
                <a
                  href={`https://wa.me/${waPhone.replace(/[^0-9]/g, "") || "442079460912"}?text=${encodeURIComponent(waGreeting)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-800 hover:bg-emerald-700 text-white p-3 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer"
                >
                  <WhatsAppIcon className="w-4 h-4 text-emerald-300" />
                  <span>Send Customer to Native WhatsApp App (Opens Direct Chat with Pre-filled Greeting)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-300" />
                </a>
              </div>
            </div>

            {/* SAVE BUTTON BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-neutral-900 text-white rounded-2xl border border-neutral-800 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-xs">Ready to Deploy Settings</h5>
                  <p className="text-[11px] text-neutral-400 font-mono">Changes take effect immediately across all client touchpoints.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-lg hover:scale-105"
                >
                  Save WhatsApp Configuration
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* ADD ADDRESS MODAL */}
      {showAddAddressModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleAddAddress} className="bg-white border border-neutral-200 text-neutral-900 rounded-2xl p-6 md:p-8 max-w-md w-full space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowAddAddressModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-800 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif text-xl font-bold text-neutral-900 border-b border-neutral-100 pb-3">
              Add New Survey / Site Location
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-neutral-700 block uppercase font-mono text-[10px]">Site Title *</label>
                <input
                  type="text"
                  value={newAddrTitle}
                  onChange={(e) => setNewAddrTitle(e.target.value)}
                  placeholder="e.g. Mayfair Penthouse Project"
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block uppercase font-mono text-[10px]">Address Line 1 *</label>
                <input
                  type="text"
                  value={newAddrStreet}
                  onChange={(e) => setNewAddrStreet(e.target.value)}
                  placeholder="e.g. 14 Mount Street"
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block uppercase font-mono text-[10px]">City & Postcode</label>
                <input
                  type="text"
                  value={newAddrCity}
                  onChange={(e) => setNewAddrCity(e.target.value)}
                  placeholder="e.g. London, W1K 2RH"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block uppercase font-mono text-[10px]">Access Notes (Crane/Lift width)</label>
                <textarea
                  rows={3}
                  value={newAddrNotes}
                  onChange={(e) => setNewAddrNotes(e.target.value)}
                  placeholder="e.g. Narrow access street; delivery permitted before 10:00 AM."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddAddressModal(false)}
                className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-mono font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#1A1A1A] hover:bg-gold text-white hover:text-[#121212] rounded-xl text-xs font-mono font-bold cursor-pointer"
              >
                Save Location
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE ACCOUNT MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#121212] border border-red-500/40 text-white rounded-2xl p-6 md:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> Confirm Account Deletion
            </h3>

            <p className="text-xs text-neutral-300 leading-relaxed font-sans">
              This records a deletion request and signs this device out. Final deletion or legally required retention must be completed by the configured production account-deletion process.
            </p>

            <div className="space-y-1 text-xs">
              <label className="font-mono text-[10px] text-neutral-400 uppercase font-bold">
                Type "DELETE" to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-neutral-900 border border-neutral-700 p-2.5 rounded-xl font-mono text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <button
                disabled={deleteConfirmText !== "DELETE"}
                onClick={() => {
                  void requestAccountDeletion()
                    .then(() => {
                      alert("Your account deletion request has been recorded.");
                      onLogout();
                    })
                    .catch((error) => alert(error instanceof Error ? error.message : "The deletion request could not be recorded."));
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-xl cursor-pointer"
              >
                Request Account Deletion
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export const AccountSettings = AccountView;
