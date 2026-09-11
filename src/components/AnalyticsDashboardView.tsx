import { BarChart3 } from "lucide-react";

/**
 * Phase 5 Gate 0 purge.
 *
 * This dashboard previously displayed entirely fabricated commercial data
 * presented as "Real-time commercial analytics": a hardcoded £2,015,000 YTD
 * revenue figure with an invented +24.8% growth claim, a fabricated
 * £42,850 average deal size "across 47 projects", a fabricated 46.2% gross
 * margin, a fabricated 62.4% quote conversion rate, eight months of
 * invented monthly revenue/margin/quote-count figures, four invented lead
 * sources with fabricated revenue and ROI percentages (e.g. "1250% ROI"),
 * fabricated per-material conversion rates and total values, and fabricated
 * fabrication-stage velocity figures. None of it was ever connected to a
 * real analytics or accounting source.
 *
 * Per the approved Gate 0 decision to remove fabricated revenue, this is
 * replaced with a plain "not configured" state rather than any new
 * invented numbers.
 */
export default function AnalyticsDashboardView() {
  return (
    <div className="space-y-6 animate-fade-in text-neutral-100">
      <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl shadow-xl flex flex-col items-center text-center gap-3">
        <BarChart3 className="w-10 h-10 text-neutral-600" />
        <h2 className="font-serif text-xl font-bold text-white">Commercial Analytics</h2>
        <p className="text-xs text-neutral-400 max-w-md">
          Analytics are not yet connected to a data source. Revenue, margin, conversion and lead-source figures will
          appear here once a reporting integration is configured.
        </p>
      </div>
    </div>
  );
}
