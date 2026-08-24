import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, GuestNotice, LoadingState } from "../components/StateViews";
import { Avatar, Card, Chip, SectionHeading } from "../components/ui";
import { searchPublicProfessionals, type PublicProfessional } from "../services/socialClient";
import { useAuthSession } from "../services/useAuthSession";

/**
 * Network — professional discovery (people, trades, companies). Reframed
 * from the earlier "Discover" surface per the 2026-08-19 product-direction
 * amendment (see DESIGN.md / tasks/plan.md): professional discovery is now
 * the primary purpose of this screen, with materials/projects/inspiration
 * kept as secondary, honestly-labelled tabs rather than removed.
 */

type SearchCursor = { displayName: string; userId: string };

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; professionals: PublicProfessional[]; cursor: SearchCursor | null; loadingMore: boolean };

const SEARCH_DEBOUNCE_MS = 300;

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

// Mirrors the public.professional_category enum exactly (see
// supabase/migrations/20260818194558_identity_profiles_roles.sql) — no
// invented categories.
const PROFESSION_FILTER_OPTIONS = Object.keys(CATEGORY_LABELS);

type NetworkTab = "professionals" | "materials" | "projects" | "architecture" | "interiors" | "applications";

const TABS: Array<{ key: NetworkTab; label: string }> = [
  { key: "professionals", label: "Professionals" },
  { key: "materials", label: "Materials" },
  { key: "projects", label: "Projects" },
  { key: "architecture", label: "Architecture" },
  { key: "interiors", label: "Interiors" },
  { key: "applications", label: "Applications" },
];

const TAB_SEARCH_PLACEHOLDER: Record<NetworkTab, string> = {
  professionals: "Search by name or company…",
  materials: "Search Materials",
  projects: "Search Projects",
  architecture: "Search Architecture",
  interiors: "Search Interiors",
  applications: "Search Applications",
};

const TAB_EMPTY_DESCRIPTION: Record<Exclude<NetworkTab, "professionals">, string> = {
  materials: "The materials catalogue — quartz, granite, marble, porcelain, Dekton — lands alongside the Materials/Marketplace phase, not this slice.",
  projects: "Real projects will appear here once project portfolios are built. No results are simulated in the meantime.",
  architecture: "Architectural inspiration and case studies land in a later slice — no results are simulated here.",
  interiors: "Interior design inspiration lands in a later slice — no results are simulated here.",
  applications: "Application-specific galleries (kitchens, bathrooms, staircases, fireplaces…) land in a later slice — no results are simulated here.",
};

export default function NetworkRoute() {
  const auth = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [tab, setTab] = useState<NetworkTab>("professionals");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [profession, setProfession] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [debouncedServiceArea, setDebouncedServiceArea] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedServiceArea(serviceArea), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [serviceArea]);

  const hasAnyFilter = profession !== "" || debouncedServiceArea.trim() !== "" || debouncedQuery.trim() !== "";

  const load = useCallback(() => {
    setState({ status: "loading" });
    searchPublicProfessionals({
      q: debouncedQuery || undefined,
      category: profession || undefined,
      serviceArea: debouncedServiceArea || undefined,
    })
      .then((page) => setState({ status: "ready", professionals: page.items, cursor: page.nextCursor, loadingMore: false }))
      .catch((error: unknown) =>
        setState({ status: "error", message: error instanceof Error ? error.message : "Network could not be loaded." })
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profession, debouncedServiceArea, debouncedQuery]);

  useEffect(() => {
    load();
  }, [load]);

  function loadMore() {
    if (state.status !== "ready" || !state.cursor || state.loadingMore) return;
    const cursor = state.cursor;
    setState({ ...state, loadingMore: true });
    searchPublicProfessionals({
      q: debouncedQuery || undefined,
      category: profession || undefined,
      serviceArea: debouncedServiceArea || undefined,
      afterDisplayName: cursor.displayName,
      afterUserId: cursor.userId,
    })
      .then((page) =>
        setState((prev) =>
          prev.status === "ready"
            ? { status: "ready", professionals: [...prev.professionals, ...page.items], cursor: page.nextCursor, loadingMore: false }
            : prev
        )
      )
      .catch(() => setState((prev) => (prev.status === "ready" ? { ...prev, loadingMore: false } : prev)));
  }

  function clearFilters() {
    setProfession("");
    setServiceArea("");
    setDebouncedServiceArea("");
    setQuery("");
    setDebouncedQuery("");
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        eyebrow="Network"
        title="Find people, trades and companies"
        description="Meet professionals across the built environment — architects, fabricators, installers and more building real projects."
      />

      {auth.status === "guest" && (
        <GuestNotice message="Browsing Network is open to everyone. Sign in to follow or connect with a professional." />
      )}

      <div role="tablist" aria-label="Network categories" className="flex gap-2 overflow-x-auto pb-1">
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
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-[var(--smc-charcoal-soft)]">
              Profession
              <select
                value={profession}
                onChange={(event) => setProfession(event.target.value)}
                aria-label="Filter by profession"
                className="min-h-[44px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] px-3 text-sm text-[var(--smc-charcoal)] focus:border-[var(--smc-mineral-bronze)] focus:outline-none"
              >
                <option value="">All professions</option>
                {PROFESSION_FILTER_OPTIONS.map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-[var(--smc-charcoal-soft)]">
              Location / service area
              <input
                type="text"
                value={serviceArea}
                onChange={(event) => setServiceArea(event.target.value)}
                placeholder="e.g. London, Greater Manchester"
                aria-label="Filter by location or service area"
                className="min-h-[44px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] px-3 text-sm text-[var(--smc-charcoal)] focus:border-[var(--smc-mineral-bronze)] focus:outline-none"
              />
            </label>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--smc-charcoal-faint)]" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={TAB_SEARCH_PLACEHOLDER[tab]}
              aria-label="Search Network"
              className="w-full rounded-[var(--smc-radius-pill)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] py-3 pl-11 pr-4 text-sm text-[var(--smc-charcoal)] focus:border-[var(--smc-mineral-bronze)] focus:outline-none"
            />
          </div>

          {state.status === "loading" && <LoadingState label="Loading professionals" />}
          {state.status === "error" && <ErrorState message={state.message} onRetry={load} />}
          {state.status === "ready" && state.professionals.length === 0 && !hasAnyFilter && (
            <EmptyState title="No public professional profiles yet" description="Professionals who complete onboarding will appear here." />
          )}
          {state.status === "ready" && state.professionals.length === 0 && hasAnyFilter && (
            <EmptyState
              title="No professionals match these filters"
              description="Try a different profession, search term, or a broader location, or clear the filters to see everyone."
              action={
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)]"
                >
                  Clear filters
                </button>
              }
            />
          )}
          {state.status === "ready" && state.professionals.length > 0 && (
            <ul className="flex flex-col gap-3">
              {state.professionals.map((pro) => {
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
          {state.status === "ready" && state.cursor && (
            <button
              type="button"
              onClick={loadMore}
              disabled={state.loadingMore}
              className="self-center rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)] disabled:opacity-60"
            >
              {state.loadingMore ? "Loading more…" : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
