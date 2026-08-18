import React, { useState } from "react";
import {
  UserPlus,
  Users,
  Award,
  Sparkles,
  CheckCircle2,
  Clock,
  Gift,
  Copy,
  Check,
  Share2,
  ArrowLeft,
  ShieldCheck,
  Truck,
  Globe,
  Plus,
  Send,
  Star,
  Zap,
  ChevronRight,
  ExternalLink,
  TrendingUp,
  BarChart2,
  Calendar,
  Download,
  FileText,
  Lock
} from "lucide-react";
import { jsPDF } from "jspdf";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface ReferralsCommandViewProps {
  onNavigate?: (tab: string) => void;
  onOpenRewardsModal?: () => void;
}

interface ReferralClient {
  id: string;
  name: string;
  initials: string;
  date: string;
  stage: "prospect" | "qualified" | "reward";
  statusText: string;
  pointsEarned: number;
}

export default function ReferralsCommandView({ onNavigate, onOpenRewardsModal }: ReferralsCommandViewProps) {
  const [copied, setCopied] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientProject, setNewClientProject] = useState("");
  const [chartMetric, setChartMetric] = useState<"trend" | "accrual" | "monthly">("trend");
  const [isExporting, setIsExporting] = useState(false);

  const referralGrowthData = [
    { month: "Feb '26", period: "Feb 01 – Feb 28, 2026", referrals: 6, qualified: 4, points: 2500, monthlyPoints: 2500, credit: 250, newThisMonth: 6 },
    { month: "Mar '26", period: "Mar 01 – Mar 31, 2026", referrals: 10, qualified: 7, points: 4800, monthlyPoints: 2300, credit: 480, newThisMonth: 4 },
    { month: "Apr '26", period: "Apr 01 – Apr 30, 2026", referrals: 14, qualified: 10, points: 7200, monthlyPoints: 2400, credit: 720, newThisMonth: 4 },
    { month: "May '26", period: "May 01 – May 31, 2026", referrals: 18, qualified: 13, points: 9500, monthlyPoints: 2300, credit: 950, newThisMonth: 4 },
    { month: "Jun '26", period: "Jun 01 – Jun 30, 2026", referrals: 21, qualified: 16, points: 10900, monthlyPoints: 1400, credit: 1090, newThisMonth: 3 },
    { month: "Jul '26", period: "Jul 01 – Jul 31, 2026", referrals: 24, qualified: 19, points: 12450, monthlyPoints: 1550, credit: 1245, newThisMonth: 3 },
  ];

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const JsPDFClass = typeof jsPDF === "function" ? jsPDF : (jsPDF as any)?.jsPDF || (jsPDF as any)?.default;
      if (!JsPDFClass) {
        throw new Error("PDF generator unavailable.");
      }
      const doc = new JsPDFClass({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
      const margin = 14;

      // Dark Header Background Card
      doc.setFillColor(18, 18, 18);
      doc.rect(0, 0, pageWidth, 42, "F");

      // Gold Top Accent Line
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 0, pageWidth, 2.5, "F");

      // Header Branding
      doc.setTextColor(212, 175, 55);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("SMC PRO STUDIO — TRADE PARTNER PORTAL", margin, 13);

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Referral Performance & Point Accrual Report", margin, 22);

      doc.setTextColor(160, 160, 160);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const generatedDate = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      doc.text(`Generated: ${generatedDate} GMT  |  Account ID: REF-29X81-ELITE  |  Tier: Elite VIP`, margin, 32);

      let yPos = 50;

      // Section 1: Executive KPI Overview Box
      doc.setFillColor(246, 246, 242);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 28, 2, 2, "F");
      doc.setDrawColor(220, 220, 215);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 28, 2, 2, "D");

      const colWidth = (pageWidth - margin * 2) / 4;

      // Metric 1: Total Referrals
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL INTRODUCTIONS", margin + 6, yPos + 8);
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(13);
      doc.text("24 Clients", margin + 6, yPos + 18);

      // Metric 2: Qualified Bookings
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7.5);
      doc.text("QUALIFIED CONVERSIONS", margin + colWidth + 6, yPos + 8);
      doc.setTextColor(16, 150, 95);
      doc.setFontSize(13);
      doc.text("19 (79.2%)", margin + colWidth + 6, yPos + 18);

      // Metric 3: Total Points
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7.5);
      doc.text("TOTAL TRADE POINTS", margin + colWidth * 2 + 6, yPos + 8);
      doc.setTextColor(180, 130, 20);
      doc.setFontSize(13);
      doc.text("12,450 PTS", margin + colWidth * 2 + 6, yPos + 18);

      // Metric 4: Trade Credit Value
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7.5);
      doc.text("EARNED TRADE CREDIT", margin + colWidth * 3 + 6, yPos + 8);
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(13);
      doc.text("£1,245.00", margin + colWidth * 3 + 6, yPos + 18);

      yPos += 36;

      // Section 2: Historical Monthly Velocity & Point Accrual Trajectory Table
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Historical Monthly Velocity & Point Accrual Trajectory", margin, yPos);
      yPos += 6;

      // Table Header Row
      doc.setFillColor(26, 26, 26);
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, "F");

      doc.setTextColor(212, 175, 55);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("MONTH", margin + 4, yPos + 5.5);
      doc.text("PERIOD RANGE", margin + 28, yPos + 5.5);
      doc.text("NEW INTROS", margin + 85, yPos + 5.5);
      doc.text("QUALIFIED", margin + 115, yPos + 5.5);
      doc.text("POINTS ACCRUED", margin + 142, yPos + 5.5);
      doc.text("CREDIT (GBP)", margin + 172, yPos + 5.5);

      yPos += 8;

      // Table Rows
      referralGrowthData.forEach((row, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(246, 246, 243);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(margin, yPos, pageWidth - margin * 2, 7, "F");

        doc.setTextColor(30, 30, 30);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(row.month, margin + 4, yPos + 4.8);
        doc.text(row.period, margin + 28, yPos + 4.8);
        doc.text(`+${row.newThisMonth}`, margin + 85, yPos + 4.8);
        doc.text(`${row.qualified}`, margin + 115, yPos + 4.8);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 130, 20);
        doc.text(`+${row.monthlyPoints.toLocaleString()} PTS`, margin + 142, yPos + 4.8);

        doc.setTextColor(30, 30, 30);
        doc.text(`£${(row.monthlyPoints / 10).toFixed(2)}`, margin + 172, yPos + 4.8);

        yPos += 7;
      });

      yPos += 10;

      // Section 3: Active Client Introductions Roster
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Active Client Introductions Roster", margin, yPos);
      yPos += 6;

      // Table Header Row for Clients
      doc.setFillColor(26, 26, 26);
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, "F");

      doc.setTextColor(212, 175, 55);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("CLIENT NAME", margin + 4, yPos + 5.5);
      doc.text("DATE SUBMITTED", margin + 48, yPos + 5.5);
      doc.text("STAGE & STATUS", margin + 92, yPos + 5.5);
      doc.text("POINTS YIELD", margin + 152, yPos + 5.5);

      yPos += 8;

      referralsList.forEach((client, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(246, 246, 243);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(margin, yPos, pageWidth - margin * 2, 7.5, "F");

        doc.setTextColor(20, 20, 20);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(client.name, margin + 4, yPos + 5);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(7.5);
        doc.text(client.date, margin + 48, yPos + 5);

        if (client.stage === "qualified") {
          doc.setTextColor(16, 130, 80);
          doc.setFont("helvetica", "bold");
          doc.text(`Qualified — ${client.statusText}`, margin + 92, yPos + 5);
        } else if (client.stage === "reward") {
          doc.setTextColor(180, 130, 20);
          doc.setFont("helvetica", "bold");
          doc.text(`Reward Unlocked — ${client.statusText}`, margin + 92, yPos + 5);
        } else {
          doc.setTextColor(120, 90, 20);
          doc.setFont("helvetica", "normal");
          doc.text(`Prospect — ${client.statusText}`, margin + 92, yPos + 5);
        }

        doc.setFont("helvetica", "bold");
        if (client.pointsEarned > 0) {
          doc.setTextColor(180, 130, 20);
          doc.text(`+${client.pointsEarned.toLocaleString()} PTS`, margin + 152, yPos + 5);
        } else {
          doc.setTextColor(140, 140, 140);
          doc.text("Pending (0 PTS)", margin + 152, yPos + 5);
        }

        yPos += 7.5;
      });

      yPos += 12;

      // Footer Stamp & Legal Verification
      doc.setDrawColor(210, 210, 205);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;

      doc.setTextColor(130, 130, 130);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("SMC Pro Studio Trade Partner Program • Official Performance Ledger • Confidential", margin, yPos);
      doc.text("Verification Hash: 0x9F28A_SMC_PRO_2026_ELITE", pageWidth - margin - 60, yPos);

      // Save PDF
      doc.save("SMC_Pro_Referral_Performance_Report.pdf");
    } catch (err) {
      console.error("PDF Export error:", err);
      alert("Failed to export PDF report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const referralLink = "https://smc-pro.com/vault/ref/29x81_elite";

  const [referralsList, setReferralsList] = useState<ReferralClient[]>([
    {
      id: "ref-1",
      name: "Alexander V.",
      initials: "AV",
      date: "Oct 12, 2026",
      stage: "qualified",
      statusText: "Qualified",
      pointsEarned: 2500
    },
    {
      id: "ref-2",
      name: "Elena G.",
      initials: "EG",
      date: "Nov 02, 2026",
      stage: "prospect",
      statusText: "Pending Deposit",
      pointsEarned: 0
    },
    {
      id: "ref-3",
      name: "Marcus P.",
      initials: "MP",
      date: "Sept 28, 2026",
      stage: "reward",
      statusText: "Redeemed",
      pointsEarned: 2500
    },
    {
      id: "ref-4",
      name: "Sophia K.",
      initials: "SK",
      date: "Jul 15, 2026",
      stage: "reward",
      statusText: "Redeemed",
      pointsEarned: 2500
    }
  ]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Hello! I'm sharing my exclusive SMC PRO Partner referral code for premium marble & sintered stone fabrication. Use my link for priority slab reservation and 5% off your project: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleAddReferralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName) return;

    const initials = newClientName
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "CL";

    const newRef: ReferralClient = {
      id: `ref-${Date.now()}`,
      name: newClientName,
      initials: initials,
      date: "Just Now",
      stage: "prospect",
      statusText: "Pending Review",
      pointsEarned: 0
    };

    setReferralsList(prev => [newRef, ...prev]);
    setNewClientName("");
    setNewClientEmail("");
    setNewClientPhone("");
    setShowAddModal(false);
    alert(`Referral for ${newClientName} submitted! Our Trade Concierge will reach out shortly.`);
  };

  return (
    <div className="space-y-8 animate-fade-in text-white pb-16 max-w-7xl mx-auto">
      {/* Top Navigation & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-neutral-900 via-[#1A1A1A] to-neutral-950 border border-gold/30 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10">
          <div className="flex items-center gap-3">
            {onNavigate && (
              <button
                onClick={() => onNavigate("dashboard")}
                className="p-2 rounded-xl bg-neutral-800/80 hover:bg-gold hover:text-neutral-950 text-neutral-300 transition-all cursor-pointer flex items-center justify-center"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-gold/20 text-gold border border-gold/40 uppercase tracking-widest">
              <UserPlus className="w-3.5 h-3.5 text-gold animate-pulse" />
              SMC PRO PARTNER PROGRAM
            </div>
          </div>

          <h2 className="font-serif text-3xl md:text-5xl text-white font-medium tracking-tight">
            Referral Command Center
          </h2>
          <p className="text-xs md:text-sm text-neutral-400 max-w-xl leading-relaxed font-sans">
            Distribute your secure partner link. Each verified premium slab selection yields <span className="text-gold font-bold">2,500 PTS</span> (£250 credit) and unlocks VIP white-glove trade perks.
          </p>
        </div>

        {/* Action Button */}
        <div className="z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-5 py-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all border border-neutral-700 hover:border-gold/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            title="Export PDF Performance Report"
          >
            <FileText className="w-4 h-4 text-gold" />
            {isExporting ? "Exporting PDF..." : "Export PDF Report"}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3.5 rounded-xl bg-gold hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-gold/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Submit Client Referral
          </button>
        </div>
      </div>

      {/* Hero Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-neutral-900/90 border border-neutral-800 hover:border-gold/40 rounded-2xl p-8 flex flex-col justify-between space-y-6 shadow-xl transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">Total Referrals</span>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/30 uppercase">
              +3 This Month
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="font-serif text-4xl md:text-5xl font-bold text-white font-mono">
              24
            </span>
            <span className="text-xs font-mono text-gold uppercase font-bold">+3 this month</span>
          </div>

          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-gold h-full w-[75%]" />
          </div>
        </div>

        <div className="bg-neutral-900/90 border border-neutral-800 hover:border-gold/40 rounded-2xl p-8 flex flex-col justify-between space-y-6 shadow-xl transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">Points Earned</span>
            <span className="text-[10px] font-mono font-bold bg-gold/20 text-gold px-2.5 py-1 rounded-full border border-gold/40 uppercase">
              Active Tier: Elite
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="font-serif text-4xl md:text-5xl font-bold text-gold font-mono">
              12,450
            </span>
            <span className="text-xs font-mono text-neutral-400 uppercase">PTS</span>
          </div>

          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gold h-full w-[50%]" />
          </div>
        </div>
      </div>

      {/* SECTION: Referral Growth & Accrual Chart (Recharts) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-gold" />
              <h3 className="font-serif text-xl font-medium text-white">
                Referral Growth &amp; Point Accrual Trend
              </h3>
              <span className="text-[10px] font-mono bg-gold/10 text-gold border border-gold/30 px-2 py-0.5 rounded font-bold uppercase">
                RECHARTS ANALYTICS
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-sans">
              Historical trajectory of client introductions, qualified conversions, and trade points accumulated over time.
            </p>
          </div>

          {/* Metric Selector Tabs & Export PDF */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 self-stretch md:self-auto">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-xl bg-gold/10 hover:bg-gold/20 text-gold border border-gold/40 hover:border-gold text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              title="Download PDF Ledger"
            >
              <Download className="w-3.5 h-3.5 text-gold" />
              {isExporting ? "PDF..." : "PDF Report"}
            </button>
            <div className="flex items-center bg-black border border-neutral-800 p-1 rounded-xl gap-1 justify-between">
              <button
                onClick={() => setChartMetric("trend")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  chartMetric === "trend"
                    ? "bg-gold text-neutral-950 shadow"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Referral Trend (Line)
              </button>
              <button
                onClick={() => setChartMetric("accrual")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  chartMetric === "accrual"
                    ? "bg-gold text-neutral-950 shadow"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Point Accruals (Bar)
              </button>
              <button
                onClick={() => setChartMetric("monthly")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  chartMetric === "monthly"
                    ? "bg-gold text-neutral-950 shadow"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                New Referrals (Bar)
              </button>
            </div>
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-[280px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartMetric === "accrual" ? (
              <BarChart data={referralGrowthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="month" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} tickFormatter={(val) => `${val}`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#141414] border border-[#D4AF37]/50 p-3.5 rounded-xl shadow-2xl font-mono text-xs space-y-2 min-w-[210px] backdrop-blur-md">
                          <div className="border-b border-neutral-800 pb-1.5 flex justify-between items-center gap-2">
                            <span className="font-bold text-white text-xs">{label}</span>
                            <span className="text-[10px] font-sans text-neutral-400 bg-neutral-900 border border-neutral-700 px-1.5 py-0.5 rounded">
                              {data.period}
                            </span>
                          </div>
                          <div className="space-y-1 pt-0.5">
                            <div className="flex justify-between items-center gap-3">
                              <span className="text-neutral-400 text-[11px]">Monthly Points:</span>
                              <span className="text-[#D4AF37] font-bold">+{data.monthlyPoints.toLocaleString()} PTS</span>
                            </div>
                            <div className="flex justify-between items-center gap-3">
                              <span className="text-neutral-400 text-[11px]">Cumulative Total:</span>
                              <span className="text-white font-bold">{data.points.toLocaleString()} PTS</span>
                            </div>
                            <div className="flex justify-between items-center gap-3">
                              <span className="text-neutral-400 text-[11px]">Trade Credit:</span>
                              <span className="text-emerald-400 font-bold">£{data.credit}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="monthlyPoints" fill="#D4AF37" radius={[4, 4, 0, 0]} name="Monthly Points Accrued" />
              </BarChart>
            ) : chartMetric === "monthly" ? (
              <BarChart data={referralGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="month" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#141414] border border-[#D4AF37]/50 p-3.5 rounded-xl shadow-2xl font-mono text-xs space-y-2 min-w-[210px] backdrop-blur-md">
                          <div className="border-b border-neutral-800 pb-1.5 flex justify-between items-center gap-2">
                            <span className="font-bold text-white text-xs">{label}</span>
                            <span className="text-[10px] font-sans text-neutral-400 bg-neutral-900 border border-neutral-700 px-1.5 py-0.5 rounded">
                              {data.period}
                            </span>
                          </div>
                          <div className="space-y-1 pt-0.5">
                            <div className="flex justify-between items-center gap-3">
                              <span className="text-neutral-400 text-[11px]">New Introductions:</span>
                              <span className="text-[#D4AF37] font-bold">+{data.newThisMonth}</span>
                            </div>
                            <div className="flex justify-between items-center gap-3">
                              <span className="text-neutral-400 text-[11px]">Qualified Bookings:</span>
                              <span className="text-emerald-400 font-bold">{data.qualified}</span>
                            </div>
                            <div className="flex justify-between items-center gap-3">
                              <span className="text-neutral-400 text-[11px]">Points Unlocked:</span>
                              <span className="text-white font-bold">+{data.monthlyPoints.toLocaleString()} PTS</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="newThisMonth" fill="#D4AF37" radius={[4, 4, 0, 0]} name="New Referrals" />
                <Bar dataKey="qualified" fill="#10B981" radius={[4, 4, 0, 0]} name="Qualified" />
              </BarChart>
            ) : (
              <LineChart data={referralGrowthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="month" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} domain={[0, 'auto']} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#141414] border border-[#D4AF37]/50 p-3.5 rounded-xl shadow-2xl font-mono text-xs space-y-2 min-w-[220px] backdrop-blur-md">
                          <div className="border-b border-neutral-800 pb-1.5 flex justify-between items-center gap-2">
                            <span className="font-bold text-white text-xs">{label}</span>
                            <span className="text-[10px] font-sans text-neutral-400 bg-neutral-900 border border-neutral-700 px-1.5 py-0.5 rounded">
                              {data.period}
                            </span>
                          </div>
                          <div className="space-y-1 pt-0.5">
                            <div className="flex justify-between items-center gap-3">
                              <span className="text-neutral-400 text-[11px]">Cumulative Referrals:</span>
                              <span className="text-emerald-400 font-bold">{data.referrals}</span>
                            </div>
                            <div className="flex justify-between items-center gap-3">
                              <span className="text-neutral-400 text-[11px]">Qualified Bookings:</span>
                              <span className="text-gold font-bold">{data.qualified}</span>
                            </div>
                            <div className="flex justify-between items-center gap-3">
                              <span className="text-neutral-400 text-[11px]">Total Trade Points:</span>
                              <span className="text-white font-bold">{data.points.toLocaleString()} PTS</span>
                            </div>
                            <div className="flex justify-between items-center gap-3 pt-1 border-t border-neutral-800/60">
                              <span className="text-neutral-400 text-[11px]">Credit Equivalent:</span>
                              <span className="text-gold font-bold">£{data.credit}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="referrals"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#10B981", stroke: "#121212", strokeWidth: 2 }}
                  activeDot={{ r: 8, fill: "#FFFFFF", stroke: "#10B981", strokeWidth: 3 }}
                  name="Total Referrals"
                />
                <Line
                  type="monotone"
                  dataKey="qualified"
                  stroke="#D4AF37"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: "#D4AF37", stroke: "#121212", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#FFFFFF", stroke: "#D4AF37", strokeWidth: 2 }}
                  name="Qualified Conversions"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Footer Metrics */}
        <div className="grid grid-cols-3 gap-4 border-t border-neutral-800 pt-4 font-mono text-xs text-center">
          <div>
            <span className="text-neutral-500 text-[10px] block uppercase">6-Month Growth Rate</span>
            <span className="text-emerald-400 font-bold text-sm">+300%</span>
          </div>
          <div>
            <span className="text-neutral-500 text-[10px] block uppercase">Avg Point Yield / Ref</span>
            <span className="text-gold font-bold text-sm">518 PTS</span>
          </div>
          <div>
            <span className="text-neutral-500 text-[10px] block uppercase">Earned Credit</span>
            <span className="text-white font-bold text-sm">£1,245.00</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Active Referrals List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-800 pb-4">
          <div>
            <h3 className="font-serif text-xl font-medium text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-gold" /> Active Referrals
            </h3>
            <p className="text-xs text-neutral-400">Real-time status tracking for client introductions and rewards.</p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs font-mono font-bold text-gold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add New Referral
          </button>
        </div>

        {/* Client Rows */}
        <div className="space-y-4">
          {referralsList.map((client) => {
            const isReward = client.stage === "reward";
            const isQualified = client.stage === "qualified" || isReward;

            return (
              <div
                key={client.id}
                className="bg-neutral-950/80 border border-neutral-800 hover:border-gold/40 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all group"
              >
                {/* Client Details */}
                <div className="flex items-center gap-4 min-w-[220px]">
                  <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center font-serif text-lg font-bold text-gold group-hover:border-gold transition-colors shrink-0">
                    {client.initials}
                  </div>
                  <div>
                    <h4 className="font-serif text-base font-bold text-white group-hover:text-gold transition-colors">
                      {client.name}
                    </h4>
                    <span className="text-[11px] font-mono text-neutral-400 block">
                      Referred: {client.date}
                    </span>
                  </div>
                </div>

                {/* Progress Bar Stage */}
                <div className="w-full md:w-1/3 space-y-2">
                  <div className="flex justify-between text-[10px] font-mono font-bold uppercase text-neutral-400 tracking-wider">
                    <span className={client.stage === "prospect" ? "text-gold" : ""}>Prospect</span>
                    <span className={client.stage === "qualified" ? "text-gold" : ""}>Qualified</span>
                    <span className={client.stage === "reward" ? "text-gold" : ""}>Reward</span>
                  </div>

                  <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gold transition-all duration-500"
                      style={{
                        width:
                          client.stage === "prospect"
                            ? "33%"
                            : client.stage === "qualified"
                            ? "66%"
                            : "100%"
                      }}
                    />
                  </div>
                </div>

                {/* Status Badge & Points */}
                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-neutral-800">
                  <div className="text-left md:text-right">
                    <span className={`inline-block font-mono text-[11px] font-bold px-3 py-1 rounded-sm uppercase tracking-wider ${
                      isReward
                        ? "bg-neutral-800 text-white border border-gold/40"
                        : isQualified
                        ? "bg-gold text-neutral-950"
                        : "border border-neutral-700 text-neutral-400"
                    }`}>
                      {client.statusText}
                    </span>
                    {client.pointsEarned > 0 && (
                      <span className="text-[10px] font-mono text-gold block font-bold mt-1">
                        +{client.pointsEarned.toLocaleString()} PTS
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Milestone Tracker */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-8 shadow-xl">
        <div>
          <h3 className="font-serif text-xl font-medium text-white flex items-center gap-2 border-l-4 border-gold pl-3">
            Milestone Tracker
          </h3>
          <p className="text-xs text-neutral-400 mt-1">Tier advancement unlocks white-glove trade features and VIP curator perks.</p>
        </div>

        {/* Milestone Timeline */}
        <div className="relative pt-6 pb-8 overflow-x-auto no-scrollbar">
          <div className="min-w-[700px] flex justify-between items-center relative px-6">
            {/* Background Line */}
            <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-neutral-800 -translate-y-1/2 z-0" />
            {/* Active Progress Line */}
            <div className="absolute top-1/2 left-10 h-0.5 bg-gold -translate-y-1/2 z-0 w-[45%]" />

            {/* Node 01: Advocate */}
            <div className="relative z-10 flex flex-col items-center group text-center">
              <div className="w-10 h-10 bg-gold border-4 border-neutral-950 rounded-none mb-3 flex items-center justify-center font-mono text-xs font-bold text-neutral-950">
                01
              </div>
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider block">Advocate</span>
              <span className="text-[10px] text-neutral-400 font-mono mt-1 block">Welcome Perk</span>
            </div>

            {/* Node 02: Elite */}
            <div className="relative z-10 flex flex-col items-center group text-center">
              <div className="w-11 h-11 bg-gold border-4 border-neutral-950 rounded-none mb-3 flex items-center justify-center font-mono text-xs font-bold text-neutral-950 shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-110">
                02
              </div>
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider block">Elite</span>
              <span className="text-[10px] text-gold font-mono font-bold mt-1 block">Active Status</span>
            </div>

            {/* Node 03: Ambassador */}
            <div className="relative z-10 flex flex-col items-center group text-center opacity-60">
              <div className="w-10 h-10 bg-neutral-800 border-4 border-neutral-950 rounded-none mb-3 flex items-center justify-center font-mono text-xs font-bold text-neutral-400">
                03
              </div>
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider block">Ambassador</span>
              <span className="text-[10px] text-neutral-400 font-mono mt-1 block">Pending (0/3)</span>
            </div>

            {/* Node 04: Master */}
            <div className="relative z-10 flex flex-col items-center group text-center opacity-40">
              <div className="w-10 h-10 bg-neutral-800 border-4 border-neutral-950 rounded-none mb-3 flex items-center justify-center font-mono text-xs font-bold text-neutral-400">
                04
              </div>
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider block">Master</span>
              <span className="text-[10px] text-neutral-400 font-mono mt-1 block">Locked</span>
            </div>
          </div>
        </div>

        {/* Perks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-6 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-gold">
              <CheckCircle2 className="w-4 h-4 text-gold fill-gold text-neutral-950" />
              <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">VIP CONCIERGE</h4>
            </div>
            <p className="text-xs text-neutral-400 font-mono leading-relaxed">
              Direct line to senior curators and stone masonry architects.
            </p>
          </div>

          <div className="p-6 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-gold">
              <CheckCircle2 className="w-4 h-4 text-gold fill-gold text-neutral-950" />
              <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">PRIORITY LOGISTICS</h4>
            </div>
            <p className="text-xs text-neutral-400 font-mono leading-relaxed">
              White-glove 48-hour CAD templating &amp; priority slab reserve.
            </p>
          </div>

          <div className="p-6 bg-neutral-950/40 border border-neutral-800 rounded-xl space-y-2 opacity-60">
            <div className="flex items-center gap-2 text-neutral-400">
              <Lock className="w-4 h-4 text-neutral-400" />
              <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">CURATOR'S TRIP</h4>
            </div>
            <p className="text-xs text-neutral-400 font-mono leading-relaxed">
              Requires 3 more conversions for Carrara, Italy quarry tour.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: Command Center Invite Link */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 md:p-12 text-center space-y-8 max-w-3xl mx-auto shadow-2xl relative overflow-hidden">
        <div className="space-y-3 max-w-lg mx-auto">
          <h3 className="font-serif text-2xl md:text-3xl font-medium text-white">
            Command Center Invite
          </h3>
          <p className="text-xs md:text-sm text-neutral-400 font-mono leading-relaxed">
            Distribute your secure partner link. Each verified premium slab selection yields <span className="text-gold font-bold">2,500 PTS</span>.
          </p>
        </div>

        {/* Link Box */}
        <div className="flex flex-col md:flex-row gap-4 justify-center items-stretch max-w-xl mx-auto">
          <div className="bg-black border border-neutral-800 p-4 flex-grow flex items-center justify-between gap-4 rounded-xl">
            <span className="font-mono text-xs text-gold truncate font-bold">
              {referralLink}
            </span>
            <button
              onClick={handleCopy}
              className="font-mono text-neutral-400 text-xs uppercase font-bold tracking-widest hover:text-gold transition-all flex items-center gap-2 shrink-0 border border-neutral-700 px-3 py-1.5 rounded cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <button
            onClick={handleWhatsAppShare}
            className="bg-gold text-neutral-950 px-8 py-4 font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors flex items-center justify-center gap-3 rounded-xl shrink-0 cursor-pointer shadow-lg shadow-gold/20"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
        </div>

        <div className="flex justify-center items-center gap-8 text-neutral-500 font-mono text-[10px] uppercase tracking-[0.2em] pt-4">
          <span>SECURE</span>
          <span className="w-1 h-1 bg-neutral-600 rounded-none"></span>
          <span>VERIFIED</span>
          <span className="w-1 h-1 bg-neutral-600 rounded-none"></span>
          <span>TRACKED</span>
        </div>
      </div>

      {/* MODAL: Submit Client Referral */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-gold/40 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
              <h3 className="font-serif text-xl font-medium text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-gold" /> Register Client Introduction
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-white text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddReferralSubmit} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-neutral-300 block uppercase">
                  Client Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lady Sarah Kensington"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-neutral-300 block uppercase">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. sarah@kensingtondesign.co.uk"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-neutral-300 block uppercase">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +44 7700 900077"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-neutral-300 block uppercase">
                  Project Type
                </label>
                <select
                  value={newClientProject}
                  onChange={(e) => setNewClientProject(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold font-sans"
                >
                  <option value="Kitchen Worktops & Island">Kitchen Worktops & Waterfall Island</option>
                  <option value="Master Bath Cladding">Master Bath Marble Cladding</option>
                  <option value="Commercial Reception Desk">Commercial Reception & Feature Wall</option>
                  <option value="Outdoor Kitchen & Living">Outdoor Kitchen Sintered Stone</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-3 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs font-mono font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-gold hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-gold/20 flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Submit Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
