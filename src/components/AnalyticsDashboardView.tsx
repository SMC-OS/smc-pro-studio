import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
  Award,
  Zap,
  ArrowUpRight,
  Filter,
  Download
} from "lucide-react";

// Sample Financial & Analytics Data
const MONTHLY_REVENUE = [
  { month: "Jan", revenue: 142000, margin: 42, quotes: 18 },
  { month: "Feb", revenue: 185000, margin: 44, quotes: 24 },
  { month: "Mar", revenue: 210000, margin: 41, quotes: 29 },
  { month: "Apr", revenue: 198000, margin: 45, quotes: 26 },
  { month: "May", revenue: 265000, margin: 47, quotes: 35 },
  { month: "Jun", revenue: 290000, margin: 46, quotes: 38 },
  { month: "Jul", revenue: 340000, margin: 48, quotes: 42 },
  { month: "Aug", revenue: 385000, margin: 49, quotes: 46 }
];

const MATERIAL_CONVERSION = [
  { name: "Sintered Quartz", quotes: 142, converted: 88, conversionRate: 61.9, totalValue: 480000, fill: "#D4AF37" },
  { name: "Porcelain Slabs", quotes: 110, converted: 72, conversionRate: 65.4, totalValue: 390000, fill: "#38bdf8" },
  { name: "Natural Marble", quotes: 85, converted: 45, conversionRate: 52.9, totalValue: 520000, fill: "#a855f7" },
  { name: "Granite & Quartzite", quotes: 94, converted: 58, conversionRate: 61.7, totalValue: 440000, fill: "#34d399" }
];

const LEAD_SOURCE_ROI = [
  { source: "Architect Referrals", leads: 48, closedDeals: 32, revenue: 640000, roi: "840%" },
  { source: "Showroom Walk-ins", leads: 62, closedDeals: 28, revenue: 410000, roi: "420%" },
  { source: "Website AI Estimator", leads: 124, closedDeals: 54, revenue: 580000, roi: "1250%" },
  { source: "Trade VIP Portal", leads: 38, closedDeals: 26, revenue: 390000, roi: "610%" }
];

const STAGE_VELOCITY = [
  { stage: "Quote → Survey", avgDays: 3.2, targetDays: 4.0 },
  { stage: "Survey → Contract", avgDays: 2.1, targetDays: 3.0 },
  { stage: "Deposit → Fab", avgDays: 4.5, targetDays: 5.0 },
  { stage: "Fab → Install", avgDays: 6.2, targetDays: 7.0 }
];

export default function AnalyticsDashboardView() {
  const [timeRange, setTimeRange] = useState<"6m" | "1y" | "ytd">("ytd");

  return (
    <div className="space-y-6 animate-fade-in text-neutral-100">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gold uppercase font-bold tracking-widest bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
              SMC PRO COMMERCIAL INTELLIGENCE
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              EXECUTIVE METRICS
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Analytics & Commercial Performance
          </h2>
          <p className="text-xs text-neutral-400 font-sans max-w-2xl">
            Real-time commercial analytics tracking monthly revenue growth, average order value, margin retention, lead source conversion, and fabrication stage velocity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-black/60 border border-neutral-800 p-1 rounded-xl flex items-center font-mono text-xs">
            <button
              onClick={() => setTimeRange("6m")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeRange === "6m" ? "bg-gold text-neutral-950" : "text-neutral-400 hover:text-white"
              }`}
            >
              6 Months
            </button>
            <button
              onClick={() => setTimeRange("ytd")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeRange === "ytd" ? "bg-gold text-neutral-950" : "text-neutral-400 hover:text-white"
              }`}
            >
              YTD 2026
            </button>
            <button
              onClick={() => setTimeRange("1y")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeRange === "1y" ? "bg-gold text-neutral-950" : "text-neutral-400 hover:text-white"
              }`}
            >
              Full Year
            </button>
          </div>
        </div>
      </div>

      {/* High-Level Executive Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 p-4.5 rounded-2xl space-y-1 shadow-md">
          <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">YTD Gross Revenue</span>
          <div className="font-serif text-2xl font-bold text-gold">£2,015,000</div>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +24.8% vs last year
          </span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-4.5 rounded-2xl space-y-1 shadow-md">
          <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">Avg Deal Size</span>
          <div className="font-serif text-2xl font-bold text-sky-400">£42,850</div>
          <span className="text-[10px] font-mono text-neutral-400 block">Across 47 projects</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-4.5 rounded-2xl space-y-1 shadow-md">
          <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">Gross Profit Margin</span>
          <div className="font-serif text-2xl font-bold text-emerald-400">46.2%</div>
          <span className="text-[10px] font-mono text-emerald-400/80 block">+2.1% via AI Slab Yield</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-4.5 rounded-2xl space-y-1 shadow-md">
          <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">Quote Conversion Rate</span>
          <div className="font-serif text-2xl font-bold text-amber-300">62.4%</div>
          <span className="text-[10px] font-mono text-amber-400/80 block">Highest: Sintered Quartz</span>
        </div>
      </div>

      {/* Chart Row 1: Monthly Revenue & Margin Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <span className="text-[10px] font-mono text-gold uppercase font-bold tracking-wider">Financial Growth Trend</span>
              <h3 className="font-serif text-lg font-bold text-white">Monthly Contract Revenue (£)</h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800 font-bold">
              Consistent Upward Curve
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_REVENUE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="month" stroke="#a3a3a3" fontSize={11} />
                <YAxis stroke="#a3a3a3" fontSize={11} tickFormatter={(v) => `£${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0a0a0a", borderColor: "#333", borderRadius: "8px" }}
                  formatter={(value: any) => [`£${Number(value).toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#D4AF37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Source ROI Table */}
        <div className="lg:col-span-1 bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="border-b border-neutral-800 pb-3">
            <span className="text-[10px] font-mono text-gold uppercase font-bold tracking-wider">Acquisition Channels</span>
            <h3 className="font-serif text-lg font-bold text-white">Lead Source ROI</h3>
          </div>

          <div className="space-y-3">
            {LEAD_SOURCE_ROI.map((src, idx) => (
              <div key={idx} className="p-3 bg-black/60 border border-neutral-800 rounded-xl space-y-1">
                <div className="flex justify-between items-center text-xs font-serif font-bold text-white">
                  <span>{src.source}</span>
                  <span className="text-gold font-mono">{src.roi} ROI</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400">
                  <span>{src.closedDeals}/{src.leads} Closed Deals</span>
                  <span className="text-emerald-400 font-bold">£{(src.revenue / 1000).toFixed(0)}k Generated</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Chart Row 2: Material Conversion & Stage Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Material Conversion Chart */}
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="border-b border-neutral-800 pb-3">
            <span className="text-[10px] font-mono text-gold uppercase font-bold tracking-wider">Conversion Analytics</span>
            <h3 className="font-serif text-lg font-bold text-white">Conversion Rate by Surface Class</h3>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MATERIAL_CONVERSION} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis type="number" domain={[0, 100]} stroke="#a3a3a3" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="name" type="category" stroke="#a3a3a3" fontSize={11} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0a0a0a", borderColor: "#333", borderRadius: "8px" }}
                  formatter={(val: any) => [`${val}% Conversion`, "Rate"]}
                />
                <Bar dataKey="conversionRate" fill="#38bdf8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stage Velocity Grid */}
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="border-b border-neutral-800 pb-3">
            <span className="text-[10px] font-mono text-gold uppercase font-bold tracking-wider">Operational Throughput</span>
            <h3 className="font-serif text-lg font-bold text-white">Stage Velocity (Average Days)</h3>
          </div>

          <div className="space-y-3">
            {STAGE_VELOCITY.map((stg, idx) => (
              <div key={idx} className="p-3.5 bg-black/60 border border-neutral-800 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-white">{stg.stage}</span>
                  <span className="text-emerald-400 font-bold">{stg.avgDays} Days (Target: {stg.targetDays}d)</span>
                </div>
                <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gold h-full rounded-full transition-all"
                    style={{ width: `${(stg.avgDays / stg.targetDays) * 80}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
