import React, { useState } from "react";
import {
  Menu,
  User,
  CheckCircle,
  Download,
  Sparkles,
  Layers,
  Compass,
  FileText,
  Activity,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Home,
  X
} from "lucide-react";

interface ExhibitionWalkthroughViewProps {
  onNavigateHome: () => void;
  userEmail?: string;
}

export default function ExhibitionWalkthroughView({
  onNavigateHome,
  userEmail = "client@smcpro.co.uk"
}: ExhibitionWalkthroughViewProps) {
  const [activeSection, setActiveSection] = useState<string>("exhibition");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  const handleAuthorize = () => {
    setAuthorized(true);
    setShowExportModal(true);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1A1A1A] font-sans antialiased selection:bg-[#D4AF37] selection:text-white relative pb-24">
      
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 md:px-16 h-20 bg-[#F7F6F2]/90 backdrop-blur-md border-b border-black/5 transition-all duration-300">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 rounded-lg text-[#1A1A1A] hover:bg-black/5 transition-colors cursor-pointer"
            title="Open Curation Pillars"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={onNavigateHome}>
            <img
              alt="SMC PRO Logo"
              className="h-8 w-auto object-contain"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBXNV_RiofajRHjAoUdeRL9DEe2QkYbM7Tc0A4TQGbDMcjFQw7Q5zg9KIK2ijao316cxP_79D-6J5NzIHqGSsKu4We4TrVBU9wXJ-Oki7eDSGHaKKrZC6H9bitIoGlyNOMKRzOMOxJ7P98OaPN4DFpS7I8k6ifbcEAbyIrTMtqR8d6Yfx7XBkh3itiTP9iEqSYh_FMLknw4CwMtdIRxcCZr-5-A3zhzsZvV5yGDXPOTs9J_FTIffTZ0lCxFXwpnnkh4xJeo_osw6k"
            />
            <div>
              <span className="font-serif text-lg font-bold tracking-wider text-black block leading-none">
                SMC PRO
              </span>
              <span className="text-[9px] font-mono tracking-widest text-[#D4AF37] uppercase">
                Obsidian Vision
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <nav className="hidden md:flex gap-8 items-center font-mono text-xs uppercase tracking-widest">
            <button
              onClick={() => setActiveSection("exhibition")}
              className={`pb-1 transition-colors cursor-pointer ${
                activeSection === "exhibition"
                  ? "text-black font-semibold border-b-2 border-[#D4AF37]"
                  : "text-[#1A1A1A]/60 hover:text-black"
              }`}
            >
              EXHIBITION
            </button>
            <button
              onClick={() => setActiveSection("archive")}
              className={`pb-1 transition-colors cursor-pointer ${
                activeSection === "archive"
                  ? "text-black font-semibold border-b-2 border-[#D4AF37]"
                  : "text-[#1A1A1A]/60 hover:text-black"
              }`}
            >
              ARCHIVE
            </button>
            <button
              onClick={() => setActiveSection("provenance")}
              className={`pb-1 transition-colors cursor-pointer ${
                activeSection === "provenance"
                  ? "text-black font-semibold border-b-2 border-[#D4AF37]"
                  : "text-[#1A1A1A]/60 hover:text-black"
              }`}
            >
              PROVENANCE
            </button>
          </nav>

          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 bg-black text-[#D4AF37] hover:bg-[#1A1A1A] px-4 py-2 rounded text-xs font-mono tracking-wider transition-all cursor-pointer shadow-sm"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">DASHBOARD</span>
          </button>
        </div>
      </header>

      {/* Navigation Drawer Slide-over */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex animate-fade-in">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsDrawerOpen(false)}
          />
          <aside className="relative w-80 bg-white border-r border-black/10 shadow-2xl z-10 p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-black/5">
                <h2 className="font-mono text-xs text-[#1A1A1A]/50 tracking-widest uppercase font-bold">
                  CURATION PILLARS
                </h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded hover:bg-black/5 text-neutral-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-3 font-mono text-xs uppercase tracking-wider">
                <button
                  onClick={() => {
                    setActiveSection("exhibition");
                    setIsDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded text-[#1A1A1A] hover:bg-black/5 transition-colors text-left"
                >
                  <Compass className="w-4 h-4 text-[#D4AF37]" />
                  <span>Vision &amp; Conception</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSection("provenance");
                    setIsDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded text-[#1A1A1A] hover:bg-black/5 transition-colors text-left"
                >
                  <Layers className="w-4 h-4 text-[#D4AF37]" />
                  <span>Material Authority</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSection("exhibition");
                    setIsDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded bg-black/5 text-black border-l-2 border-[#D4AF37] text-left font-bold"
                >
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span>Exhibition Space</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSection("archive");
                    setIsDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded text-[#1A1A1A] hover:bg-black/5 transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-[#D4AF37]" />
                  <span>Provenance &amp; Archive</span>
                </button>
              </nav>
            </div>

            <div className="pt-6 border-t border-black/5 font-mono text-[11px] text-neutral-500 space-y-2">
              <div className="flex items-center justify-between">
                <span>SYSTEM STATUS</span>
                <span className="text-emerald-600 font-bold">OPTIMAL</span>
              </div>
              <div className="flex items-center justify-between">
                <span>CLIENT SPEC</span>
                <span className="text-black font-semibold truncate max-w-[120px]">{userEmail}</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto pt-32 px-6 md:px-12">
        
        {/* Section 1: Editorial Hero */}
        <section className="mb-24">
          <div className="flex flex-col items-center text-center mb-16 space-y-4">
            <span className="font-mono text-xs text-[#D4AF37] tracking-[0.3em] uppercase font-bold">
              Exhibition I
            </span>
            <h1 className="font-serif text-4xl md:text-6xl text-black max-w-4xl leading-tight font-normal">
              SMC PRO: Architectural Finalization
            </h1>
            <p className="font-serif text-lg text-[#1A1A1A]/70 max-w-2xl italic">
              A curated exploration of material perfection and elite precision.
            </p>
          </div>

          <div className="relative h-[500px] md:h-[650px] w-full bg-white p-3 md:p-4 rounded-xl shadow-2xl border border-black/5 overflow-hidden group">
            <div
              className="w-full h-full bg-cover bg-center transition-transform duration-1000 group-hover:scale-105 rounded-lg"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBvl6r3KBcb7f2ZVWPXmbO05auPp_EHY23GZ7G9h1RBLA64qLaU4krhCdZbzzLydi343-sIkQnfYOPpqNLYDiK9M4q7pFVwlUeTtyLh_Xyk85CwEzJ532rBmrvjyZMoTXIHV2XrxTs2xg3Dgf4CUGo6-aXRRy1MSVVhuqAt-d9NRLSj9vTdyYysLpDXVOF2KsOnwGR0yc5993YOyqbY1KVD7RlDEAR3chIwEzzGcGbvdWXEn6j2x3lKSPh1mWT8l0ZxSxouRACYlf0')"
              }}
            />
            <div className="absolute bottom-8 left-8 right-8 md:left-12 md:right-auto bg-white/90 backdrop-blur-md p-6 rounded-lg border border-black/5 max-w-md shadow-lg">
              <span className="font-mono text-[10px] text-[#D4AF37] tracking-widest uppercase font-bold block mb-1">
                Book-Matched Slab Portfolio
              </span>
              <h3 className="font-serif text-xl font-bold text-black mb-2">
                Calacatta Viola &amp; Obsidian Brass Inlay
              </h3>
              <p className="font-sans text-xs text-neutral-600 leading-relaxed">
                Precision cut to 0.1mm tolerance. Manufactured in the UK using 5-axis CNC waterjet technology for flawless veining continuity.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Brand Identity - Editorial Style */}
        <section className="mb-24 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            
            <div className="md:col-span-5 relative">
              <div className="aspect-[3/4] relative overflow-hidden bg-white p-3 rounded-xl shadow-xl border border-black/5">
                <div
                  className="w-full h-full bg-cover bg-center rounded-lg"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAJTkIQAwfnJenKZ6hBvRc260VxbB5kMwxTVVn_NvItJRxFyUx0n8f8sPwfYeYFW5PnkWYf1TLkQVGYBoRl8vPd1ygHZARxlwh7RL--x1LATCrA5ICD15JZ6OPExbf0igge6GgOHffLHarhwXk9WFX2g4nvIbp89L0C_PEqhIQC_UAJre3oDLTJRKS0SDYAv--njZ3CQK7OeYr-Mr2Ac9QFnmeyAL6n2GfJFuBMFY20xejx1P-XAJao5FEEY8ezC-mxbQqhEW5L7Z0')"
                  }}
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-[#F7F6F2] border border-black/10 flex items-center justify-center rounded-full shadow-lg z-10">
                <span className="font-serif text-2xl italic text-black font-semibold">01</span>
              </div>
            </div>

            <div className="md:col-span-7 space-y-6 pl-0 md:pl-6">
              <h3 className="font-serif text-3xl md:text-4xl text-black font-normal">
                The Digital Curator
              </h3>
              <div className="w-16 h-[1px] bg-[#D4AF37]" />
              <p className="font-sans text-base text-[#1A1A1A]/80 leading-relaxed font-light">
                Our <span className="text-black font-medium">'Elite Precision'</span> design system is more than an aesthetic; it is a philosophy of absolute clarity. Within a sophisticated <span className="text-black font-medium">Off-White &amp; Charcoal</span> spectrum, we operate at the intersection of technical authority and emotive luxury. Every pixel serves the slab, ensuring that the material remains the undisputed hero of the narrative, presented as art in a gallery space.
              </p>

              <div className="flex gap-8 pt-6 border-t border-black/5">
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] text-[#1A1A1A]/50 uppercase tracking-widest font-bold">
                    Base Canvas
                  </span>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="w-7 h-7 bg-[#F7F6F2] border border-black/10 rounded-full shadow-sm" />
                    <span className="font-mono text-xs text-black font-medium">#F7F6F2</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] text-[#1A1A1A]/50 uppercase tracking-widest font-bold">
                    Accent State
                  </span>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="w-7 h-7 bg-[#D4AF37] rounded-full shadow-sm" />
                    <span className="font-mono text-xs text-black font-medium">#D4AF37</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Section 3: Cinematic Timeline */}
        <section className="mb-24 max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-2">
            <span className="font-mono text-xs text-[#1A1A1A]/50 tracking-widest uppercase block font-bold">
              Provenance
            </span>
            <h3 className="font-serif text-3xl md:text-4xl text-black font-normal">
              Property Lifecycle
            </h3>
          </div>

          <div className="relative">
            {/* Timeline Vertical Line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-[1px] bg-gradient-to-b from-[#D4AF37] via-[#D4AF37]/50 to-transparent -translate-x-1/2" />

            {/* Event 1 */}
            <div className="relative flex flex-col md:flex-row items-center justify-between mb-20 group">
              <div className="hidden md:block w-5/12 text-right pr-10">
                <div className="bg-white p-2 rounded-lg border border-black/5 shadow-md">
                  <img
                    alt="Phase 1 Render"
                    className="w-full h-44 object-cover rounded"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQq9F-ikISDLO_jvAIuXFZrHfY-5qXHkeIBABT0LdnfCT1YT_teEydI6UVz6t6V1Yle-8nq7b-oaPfwgJtNQKErPOKlRBgIF_7mKG3j0YkN1PlBIo0FK4Inb_fcnzhGw4Gocnk1dw5f8uiqIIiDRYT1erAdwrmeojMNV-dcih5YC1MLay9gWn5zNF8QoUSK-avuxrD1cUNyiIzU3g0Y_hpG35Lancm_8P4GvEHf9tCyWbG0Juo-rLn"
                  />
                </div>
              </div>
              <div className="absolute left-6 md:left-1/2 w-4 h-4 bg-white border-2 border-[#D4AF37] rounded-full -translate-x-1/2 shadow-[0_0_0_4px_rgba(212,175,55,0.2)] z-10" />
              <div className="w-full pl-16 md:pl-0 md:w-5/12 md:text-left md:pl-10">
                <span className="font-mono text-xs text-[#D4AF37] mb-1 block font-bold">Phase I</span>
                <h4 className="font-serif text-xl text-black mb-2 font-semibold">Vision &amp; Conception</h4>
                <p className="font-sans text-xs text-[#1A1A1A]/70 leading-relaxed">
                  Initial AR visualization and curation of materials from the exclusive Slab Vault. Interactive 3D surface modeling.
                </p>
              </div>
            </div>

            {/* Event 2 */}
            <div className="relative flex flex-col md:flex-row items-center justify-between mb-20 group md:flex-row-reverse">
              <div className="hidden md:block w-5/12 text-left pl-10">
                <div className="bg-white p-2 rounded-lg border border-black/5 shadow-md">
                  <img
                    alt="Phase 2 Technical"
                    className="w-full h-44 object-cover rounded"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5SVjUEYbJgiomgdsloMffK4YumSGqg7V8elDmJWIhCrpv_N33rwgprEFONRVuC25F4nC1zjBktXn40PLEcVV5czHKfpwuWthGm-n53i9hGUBuPWQUewfG3ZmeJa2heOuByLlQxODE81qhhVwSZbM6BVnsyYL08N0I9FjJm0ysL8KW1Zvsa0S-Zx94rTry5wwQJRxFvNKkhza4blRJv8PRCCZpHzpOKSuGbb74NOrxMR2yNjhNJBbm"
                  />
                </div>
              </div>
              <div className="absolute left-6 md:left-1/2 w-4 h-4 bg-[#D4AF37] rounded-full -translate-x-1/2 shadow-[0_0_0_4px_rgba(212,175,55,0.2)] z-10" />
              <div className="w-full pl-16 md:pl-0 md:w-5/12 md:text-right md:pr-10">
                <span className="font-mono text-xs text-[#D4AF37] mb-1 block font-bold">Phase II</span>
                <h4 className="font-serif text-xl text-black mb-2 font-semibold">Technical Authority</h4>
                <p className="font-sans text-xs text-[#1A1A1A]/70 leading-relaxed">
                  Integration of CAD libraries, precise substrate specifications, and CNC tooling paths for edge profiles.
                </p>
              </div>
            </div>

            {/* Event 3 */}
            <div className="relative flex flex-col md:flex-row items-center justify-between mb-20 group">
              <div className="hidden md:block w-5/12 text-right pr-10">
                <div className="bg-white p-2 rounded-lg border border-black/5 shadow-md">
                  <img
                    alt="Phase 3 Fabrication"
                    className="w-full h-44 object-cover rounded"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuACUUB7emiS_8YJWq6GHo6vQW4MbahpTjKRPu08xg0HShJCNQTjLYc8IWHOqQVxicLuEjWYwwUIHS2KsAc_FqNCqSrnU5ts_B7IZT3uolGddXqIlUB72DZgdwBvrN3q9xpUkM4chLA0CMgxwX0Rq73M3RdT9Ar3XcirHRMtZd55vKvahOeES5jzLQV7C0PwWXdJzIYbJHfo0p6ILBcMtUOFwHj75fsF7sXNmZL5o6pJRrEPvihy7ULY"
                  />
                </div>
              </div>
              <div className="absolute left-6 md:left-1/2 w-4 h-4 bg-white border-2 border-black/30 rounded-full -translate-x-1/2 z-10" />
              <div className="w-full pl-16 md:pl-0 md:w-5/12 md:text-left md:pl-10">
                <span className="font-mono text-xs text-neutral-400 mb-1 block font-bold">Phase III</span>
                <h4 className="font-serif text-xl text-black mb-2 font-semibold">Exhibition Space Command</h4>
                <p className="font-sans text-xs text-[#1A1A1A]/70 leading-relaxed">
                  Real-time telemetry, site readiness validation, live logistics tracking, and active fabrication monitoring.
                </p>
              </div>
            </div>

            {/* Event 4 */}
            <div className="relative flex flex-col md:flex-row items-center justify-between group md:flex-row-reverse">
              <div className="hidden md:block w-5/12 text-left pl-10">
                <div className="bg-white p-2 rounded-lg border border-black/5 shadow-md">
                  <img
                    alt="Phase 4 Archive"
                    className="w-full h-44 object-cover rounded"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuACVh_k8WNocOgbsR5TfN5rbciqB-YKR6VrFBL-oBE1i9GhsgIUJaVphraFCVshcbTjhDdn8B3_BC6Km9aN8qZ05cAMLom0ClAsx_Wi4K6vpPvH2FVdRCs5McFdQfCTu7k-ex8Ro_Mx-HQ9dnrntBu4M94wgea_AAKvMnuZQdnwPqjkQOeeNAHrxcpJ9IeU1tLT4qT_kf629HQQiL8yt96WyFYpGT5XZ3a1p2tCcq20WTkV2sncz-HP"
                  />
                </div>
              </div>
              <div className="absolute left-6 md:left-1/2 w-4 h-4 bg-white border-2 border-black/30 rounded-full -translate-x-1/2 z-10" />
              <div className="w-full pl-16 md:pl-0 md:w-5/12 md:text-right md:pr-10">
                <span className="font-mono text-xs text-neutral-400 mb-1 block font-bold">Phase IV</span>
                <h4 className="font-serif text-xl text-black mb-2 font-semibold">The Archive</h4>
                <p className="font-sans text-xs text-[#1A1A1A]/70 leading-relaxed">
                  Digital sign-off, immutable 3D archive preservation, warranty certificates, and comprehensive daily logs.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Section 4 & 5: Summary Quote & Action */}
        <section className="mb-24 text-center max-w-3xl mx-auto space-y-12">
          <div className="py-12 border-y border-black/10 relative">
            <blockquote className="font-serif text-3xl md:text-5xl text-black italic leading-snug">
              "Precision is the foundation of <span className="text-[#D4AF37]">luxury</span>."
            </blockquote>
          </div>

          <div className="flex flex-col items-center gap-6">
            <p className="font-mono text-xs text-[#1A1A1A]/80 max-w-xl text-center leading-relaxed uppercase tracking-wider">
              This executive brief serves as the final architectural authorization. By authorizing below, all specifications, telemetry logs, and material archives will be compiled into a secure technical package.
            </p>

            <button
              onClick={handleAuthorize}
              className="group relative px-12 py-5 bg-black text-white font-mono text-xs tracking-[0.2em] uppercase hover:bg-[#D4AF37] hover:text-black transition-all duration-500 cursor-pointer shadow-lg rounded"
            >
              {authorized ? "EXHIBITION AUTHORIZED ✓" : "AUTHORIZE EXHIBITION"}
              <div className="absolute -bottom-2 -right-2 w-full h-full border border-black/20 group-hover:border-[#D4AF37]/50 transition-all z-[-1]" />
            </button>
          </div>
        </section>

      </main>

      {/* Export Confirmation Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-black/10 shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-scale-in">
            <div className="w-12 h-12 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center mx-auto text-emerald-700">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-black">
              Architectural Package Authorized
            </h3>
            <p className="font-sans text-xs text-neutral-600 leading-relaxed">
              All specs, CAD files, slab telemetry logs, and warranty certificates for <span className="font-mono font-bold text-black">{userEmail}</span> have been compiled into an immutable digital package.
            </p>

            <div className="bg-[#F7F6F2] p-3 rounded font-mono text-[11px] text-left border border-black/5 space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">Package Hash:</span>
                <span className="font-bold text-black">SMC-EXHIBIT-2026-99A</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Timestamp:</span>
                <span>{new Date().toISOString().split("T")[0]} 19:15 GMT</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 bg-black text-white hover:bg-[#D4AF37] hover:text-black py-3 rounded text-xs font-mono tracking-wider font-bold transition-all cursor-pointer"
              >
                CLOSE
              </button>
              <button
                onClick={() => {
                  alert("Architectural Specs Package downloaded successfully.");
                  setShowExportModal(false);
                }}
                className="flex-1 bg-[#D4AF37] text-black hover:bg-black hover:text-white py-3 rounded text-xs font-mono tracking-wider font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>DOWNLOAD</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Mobile Floating Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-4 py-3 bg-[#F7F6F2]/95 backdrop-blur-md border-t border-black/10 shadow-lg">
        <button
          onClick={() => setActiveSection("exhibition")}
          className="flex flex-col items-center text-[#1A1A1A]/70 hover:text-black"
        >
          <Compass className="w-5 h-5" />
          <span className="font-mono text-[10px] mt-1">Vision</span>
        </button>
        <button
          onClick={() => setActiveSection("provenance")}
          className="flex flex-col items-center text-[#1A1A1A]/70 hover:text-black"
        >
          <Layers className="w-5 h-5" />
          <span className="font-mono text-[10px] mt-1">Material</span>
        </button>
        <button
          onClick={() => setActiveSection("exhibition")}
          className="flex flex-col items-center text-[#D4AF37] font-bold"
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-mono text-[10px] mt-1">Exhibit</span>
        </button>
        <button
          onClick={() => setActiveSection("archive")}
          className="flex flex-col items-center text-[#1A1A1A]/70 hover:text-black"
        >
          <FileText className="w-5 h-5" />
          <span className="font-mono text-[10px] mt-1">Archive</span>
        </button>
      </nav>

    </div>
  );
}
