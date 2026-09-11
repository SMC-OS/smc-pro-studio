import { Menu, ShieldCheck } from "lucide-react";

interface ProjectCommandViewProps {
  onOpenSideMenu?: () => void;
  onNavigateTab?: (tab: string) => void;
}

/**
 * Phase 5 Gate 0 purge (correction pass).
 *
 * This view was built entirely around one hardcoded, fabricated project
 * ("Mayfair Penthouse #ALPHA-7") with no real project data ever passed
 * in — every detail on the page was static fiction: a fabricated named
 * "Lead Tech: Marcus L. (Master Fabricator)" with a stock headshot, a
 * "Chat with Master Fabricator" modal with a pre-written fake message and
 * a fake "Message sent... Direct response expected < 15 mins." success
 * claim, a "LiDAR re-scan" that faked a new random point-density reading
 * on every click, and a "3D Telemetry Simulator" whose "Export Point
 * Cloud (.LAS)" button claimed a file was generated when none was. None
 * of it was backed by a real project, person, or scanning pipeline. Per
 * the same Gate 0 decision already applied to other zero-real-backing
 * views (GeologicalProvenanceView.tsx, FinancialCommandView.tsx,
 * PublishingCommandCenterView.tsx), the whole page is replaced with a
 * plain, honest notice rather than left dormant.
 */
export default function ProjectCommandView({ onOpenSideMenu, onNavigateTab }: ProjectCommandViewProps) {
  return (
    <div className="min-h-screen bg-[#000000] text-[#e2e2e2] font-sans pb-28">
      <header className="flex items-center justify-between px-4 md:px-12 py-6 border-b border-[#232323]">
        <div className="flex items-center gap-3">
          {onOpenSideMenu && (
            <button
              onClick={onOpenSideMenu}
              className="p-2 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <span className="font-serif text-lg font-bold text-white">Project Command</span>
        </div>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab("projects")}
            className="text-xs font-mono text-[#D4AF37] hover:underline cursor-pointer"
          >
            Back to Projects
          </button>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-16">
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-2xl p-8 space-y-4 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed" role="status">
            Live project telemetry, LiDAR sync, and direct fabricator messaging are not currently available. Select a project from the Projects tab to view its real details.
          </p>
        </div>
      </main>
    </div>
  );
}
