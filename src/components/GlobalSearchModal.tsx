import React, { useState, useEffect } from "react";
import { Search, X, Layers, Calculator, Briefcase, ChevronRight, Sparkles, ArrowRight, Compass } from "lucide-react";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  materialsCatalog?: any[];
  projects?: any[];
}

export default function GlobalSearchModal({
  isOpen,
  onClose,
  onNavigate,
  materialsCatalog = [],
  projects = []
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickLinks = [
    { label: "Quartz & Calacatta Slabs", tab: "artisan-shop", icon: Layers, count: "Browse Slabs" },
    { label: "Instant Kitchen Estimator", tab: "estimator", icon: Calculator, count: "Free Quote" },
    { label: "3D Design Studio", tab: "design-studio", icon: Sparkles, count: "AI Generator" },
    { label: "Digital Curator Vault", tab: "digital-curator", icon: Compass, count: "Lookbook" },
    { label: "Active Projects & Tracker", tab: "projects", icon: Briefcase, count: "Live Status" }
  ];

  const filteredMaterials = query.trim()
    ? materialsCatalog.filter(
        (m) =>
          m.name.toLowerCase().includes(query.toLowerCase()) ||
          m.type.toLowerCase().includes(query.toLowerCase()) ||
          (m.finish && m.finish.toLowerCase().includes(query.toLowerCase()))
      )
    : [];

  const filteredProjects = query.trim()
    ? projects.filter(
        (p) =>
          p.title?.toLowerCase().includes(query.toLowerCase()) ||
          p.clientName?.toLowerCase().includes(query.toLowerCase()) ||
          p.status?.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center pt-16 md:pt-24 px-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-neutral-900 border border-gold/40 rounded-2xl shadow-2xl overflow-hidden z-10 space-y-0 text-white">
        {/* Search Header Input */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-neutral-800 bg-neutral-950/80">
          <Search className="w-5 h-5 text-gold shrink-0 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search quartz slabs, kitchen quotes, 3D renders, or projects..."
            autoFocus
            className="w-full bg-transparent text-sm md:text-base text-white placeholder-neutral-500 focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-neutral-400 hover:text-white mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-mono transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Results / Quick Shortcuts Area */}
        <div className="p-4 max-h-[65vh] overflow-y-auto space-y-5 custom-scrollbar">
          {/* If no query, show Quick Navigation Shortcuts */}
          {!query.trim() && (
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-bold block">
                Popular Quick Searches
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickLinks.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        onNavigate(item.tab);
                        onClose();
                      }}
                      className="p-3 bg-neutral-950/70 hover:bg-neutral-800/80 border border-neutral-800 hover:border-gold/50 rounded-xl transition-all flex items-center justify-between text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center group-hover:bg-gold/20">
                          <IconComp className="w-4 h-4 text-gold" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-neutral-200 group-hover:text-gold block">
                            {item.label}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400 block">
                            {item.count}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Query Results */}
          {query.trim() && (
            <div className="space-y-4">
              {/* Materials Results */}
              {filteredMaterials.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-gold uppercase tracking-widest font-bold block">
                    Materials &amp; Slabs ({filteredMaterials.length})
                  </span>
                  <div className="space-y-1.5">
                    {filteredMaterials.slice(0, 5).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          onNavigate("artisan-shop");
                          onClose();
                        }}
                        className="w-full p-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-gold/50 rounded-xl transition-all flex items-center justify-between text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-neutral-800 overflow-hidden border border-neutral-700">
                            {m.imageUrl ? (
                              <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gold/20 flex items-center justify-center text-gold font-bold text-xs">
                                SMC
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block group-hover:text-gold">
                              {m.name}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-400 block">
                              {m.type} • {m.finish || "Polished"}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects Results */}
              {filteredProjects.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold block">
                    Projects &amp; Orders ({filteredProjects.length})
                  </span>
                  <div className="space-y-1.5">
                    {filteredProjects.slice(0, 4).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onNavigate("projects");
                          onClose();
                        }}
                        className="w-full p-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-400/50 rounded-xl transition-all flex items-center justify-between text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono text-xs font-bold border border-amber-500/30">
                            PROJ
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block group-hover:text-amber-400">
                              {p.title}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-400 block">
                              Client: {p.clientName} • Status: {p.status}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredMaterials.length === 0 && filteredProjects.length === 0 && (
                <div className="py-8 text-center space-y-2">
                  <Search className="w-8 h-8 text-neutral-600 mx-auto" />
                  <p className="text-xs text-neutral-400">No matching slabs or projects found for "{query}".</p>
                  <button
                    onClick={() => {
                      onNavigate("estimator");
                      onClose();
                    }}
                    className="px-4 py-2 bg-gold text-neutral-950 text-xs font-mono font-bold rounded-xl cursor-pointer"
                  >
                    Create Custom Quote Estimate
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-[10px] font-mono text-neutral-500">
          <span>Search SMC Pro Database</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
