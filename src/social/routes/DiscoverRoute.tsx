import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { Avatar, Card, Chip, SectionHeading } from "../components/ui";
import { fetchPublicProfessionals, type PublicProfessional } from "../services/socialClient";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; professionals: PublicProfessional[] };

const CATEGORY_LABELS: Record<string, string> = {
  architect: "Architect",
  interior_designer: "Interior Designer",
  stone_fabricator: "Stone Fabricator",
  stone_supplier: "Stone Supplier",
  installer: "Installer",
  contractor: "Contractor",
  developer: "Developer",
  construction_professional: "Construction Professional",
  smc_team: "SMC Team",
  other: "Professional",
};

type DiscoverTab = "professionals" | "materials" | "projects" | "architecture" | "interiors" | "applications";

const TABS: Array<{ key: DiscoverTab; label: string }> = [
  { key: "professionals", label: "Professionals" },
  { key: "materials", label: "Materials" },
  { key: "projects", label: "Projects" },
  { key: "architecture", label: "Architecture" },
  { key: "interiors", label: "Interiors" },
  { key: "applications", label: "Applications" },
];

const TAB_SEARCH_PLACEHOLDER: Record<DiscoverTab, string> = {
  professionals: "Search architects, fabricators, installers…",
  materials: "Search Materials",
  projects: "Search Projects",
  architecture: "Search Architecture",
  interiors: "Search Interiors",
  applications: "Search Applications",
};

const TAB_EMPTY_DESCRIPTION: Record<Exclude<DiscoverTab, "professionals">, string> = {
  materials: "The materials catalogue — quartz, granite, marble, porcelain, Dekton — lands alongside the Materials/Marketplace phase, not this slice.",
  projects: "Real projects will appear here once project portfolios are built. No results are simulated in the meantime.",
  architecture: "Architectural inspiration and case studies land in a later slice — no results are simulated here.",
  interiors: "Interior design inspiration lands in a later slice — no results are simulated here.",
  applications: "Application-specific galleries (kitchens, bathrooms, staircases, fireplaces…) land in a later slice — no results are simulated here.",
};

export default function DiscoverRoute() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [tab, setTab] = useState<DiscoverTab>("professionals");
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    setState({ status: "loading" });
    fetchPublicProfessionals()
      .then((professionals) => setState({ status: "ready", professionals }))
      .catch((error: unknown) =>
        setState({ status: "error", message: error instanceof Error ? error.message : "Discover could not be loaded." })
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (state.status !== "ready") return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return state.professionals;
    return state.professionals.filter((pro) => {
      const haystack = [
        pro.profile?.display_name,
        pro.company_name,
        pro.service_area,
        pro.category ? CATEGORY_LABELS[pro.category] ?? pro.category : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [state, query]);

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading eyebrow="Discover" title="Find professionals, materials and inspiration" description="Search the SMC Pro Studio community." />

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--smc-charcoal-faint)]" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={TAB_SEARCH_PLACEHOLDER[tab]}
          aria-label="Search Discover"
          className="w-full rounded-[var(--smc-radius-pill)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] py-3 pl-11 pr-4 text-sm text-[var(--smc-charcoal)] focus:border-[var(--smc-mineral-bronze)] focus:outline-none"
        />
      </div>

      <div role="tablist" aria-label="Discover categories" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Chip key={t.key} role="tab" aria-selected={tab === t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </Chip>
        ))}
      </div>

      {tab !== "professionals" ? (
        <EmptyState title={`${TABS.find((t) => t.key === tab)?.label} arrive in a later slice`} description={TAB_EMPTY_DESCRIPTION[tab]} />
      ) : (
        <>
          {state.status === "loading" && <LoadingState label="Loading professionals" />}
          {state.status === "error" && <ErrorState message={state.message} onRetry={load} />}
          {state.status === "ready" && state.professionals.length === 0 && (
            <EmptyState title="No public professional profiles yet" description="Professionals who complete onboarding will appear here." />
          )}
          {state.status === "ready" && state.professionals.length > 0 && filtered.length === 0 && (
            <EmptyState title="No matches" description={`Nothing found for "${query}".`} />
          )}
          {filtered.length > 0 && (
            <ul className="flex flex-col gap-3">
              {filtered.map((pro) => {
                const name = pro.profile?.display_name ?? "SMC professional";
                return (
                  <Card as="li" key={pro.user_id} className="p-0">
                    <Link to={`/profile/${pro.user_id}`} className="flex items-start gap-3 p-4 outline-none">
                      <Avatar name={name} size={44} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--smc-charcoal)]">{name}</p>
                        <p className="text-xs font-medium text-[var(--smc-mineral-bronze)]">
                          {pro.category ? CATEGORY_LABELS[pro.category] ?? pro.category : "Professional"}
                        </p>
                        {pro.company_name && <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">{pro.company_name}</p>}
                        {pro.service_area && <p className="text-xs text-[var(--smc-charcoal-faint)]">{pro.service_area}</p>}
                      </div>
                    </Link>
                  </Card>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
