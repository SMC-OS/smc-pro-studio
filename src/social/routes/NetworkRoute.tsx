import { useCallback, useEffect, useState } from "react";
import { ArrowRight, MapPin, Search, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, GuestNotice, LoadingState } from "../components/StateViews";
import { Avatar, Card, Chip, SectionHeading } from "../components/ui";
import { MaterialImage } from "../components/MaterialImage";
import { searchPublicProfessionals, type PublicProfessional } from "../services/socialClient";
import {
  fetchPublishedMaterials,
  MATERIAL_CATEGORIES,
  type Material,
  type MaterialCategory,
} from "../services/materialsClient";
import { useAuthSession } from "../services/useAuthSession";
import { describeError } from "../services/networkErrors";

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

const ALL_TABS: Array<{ key: NetworkTab; label: string }> = [
  { key: "professionals", label: "Professionals" },
  { key: "materials", label: "Materials" },
  { key: "projects", label: "Projects" },
  { key: "architecture", label: "Architecture" },
  { key: "interiors", label: "Interiors" },
  { key: "applications", label: "Applications" },
];

// Launch roadmap V1-5: only tabs backed by real data ship. The remaining
// scaffolded tabs stay defined (and their honest empty state stays in place)
// so they can be switched back on when their slices land.
const LAUNCHED_TABS = new Set<NetworkTab>(["professionals", "materials"]);
const TABS = ALL_TABS.filter((t) => LAUNCHED_TABS.has(t.key));

const TAB_SEARCH_PLACEHOLDER: Record<NetworkTab, string> = {
  professionals: "Search by name or company…",
  materials: "Search Materials",
  projects: "Search Projects",
  architecture: "Search Architecture",
  interiors: "Search Interiors",
  applications: "Search Applications",
};

const TAB_EMPTY_DESCRIPTION: Record<Exclude<NetworkTab, "professionals" | "materials">, string> = {
  projects: "Real projects will appear here once project portfolios are built. No results are simulated in the meantime.",
  architecture: "Architectural inspiration and case studies land in a later slice — no results are simulated here.",
  interiors: "Interior design inspiration lands in a later slice — no results are simulated here.",
  applications: "Application-specific galleries (kitchens, bathrooms, staircases, fireplaces…) land in a later slice — no results are simulated here.",
};

// Mirrors materialsClient.ts's MaterialCategory exactly — no "other" or
// speculative category.
const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  quartz: "Quartz",
  granite: "Granite",
  marble: "Marble",
  porcelain: "Porcelain",
  dekton: "Dekton",
};

type MaterialsLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; materials: Material[] };

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
        setState({ status: "error", message: describeError(error, "Network could not be loaded.").message })
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

  const [materialCategory, setMaterialCategory] = useState<MaterialCategory | "all">("all");
  const [materialsState, setMaterialsState] = useState<MaterialsLoadState>({ status: "loading" });

  const loadMaterials = useCallback(() => {
    setMaterialsState({ status: "loading" });
    fetchPublishedMaterials(materialCategory === "all" ? undefined : materialCategory)
      .then((materials) => setMaterialsState({ status: "ready", materials }))
      .catch((error: unknown) =>
        setMaterialsState({ status: "error", message: describeError(error, "Materials could not be loaded.").message })
      );
  }, [materialCategory]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        eyebrow="Network"
        title="Find the right professional"
        description="Search verified, published profiles by trade, location or company. Compare real services before getting in touch."
      />

      <section className="rounded-[2rem] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--smc-limestone)] text-[var(--smc-mineral-bronze)]"><ShieldCheck className="h-6 w-6" aria-hidden="true" /></div>
          <div>
            <h2 className="text-lg font-semibold">People for your project, not just a directory</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--smc-charcoal-soft)]">Published professionals appear after verification. Browse their profile, then send your project requirements directly.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link to="/studio" className="flex min-h-12 items-center justify-center rounded-2xl border border-[var(--smc-border-strong)] px-3 text-center text-sm font-semibold">Explore materials</Link>
          <Link to="/quotes/new" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--smc-charcoal)] px-3 text-center text-sm font-semibold text-white">Request a quote <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </section>

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

      {tab === "materials" ? (
        <>
          <div role="tablist" aria-label="Material category" className="flex gap-2 overflow-x-auto pb-1">
            <Chip
              role="tab"
              aria-selected={materialCategory === "all"}
              active={materialCategory === "all"}
              onClick={() => setMaterialCategory("all")}
            >
              All
            </Chip>
            {MATERIAL_CATEGORIES.map((category) => (
              <Chip
                key={category}
                role="tab"
                aria-selected={materialCategory === category}
                active={materialCategory === category}
                onClick={() => setMaterialCategory(category)}
              >
                {MATERIAL_CATEGORY_LABELS[category]}
              </Chip>
            ))}
          </div>

          {materialsState.status === "loading" && <LoadingState label="Loading materials" />}
          {materialsState.status === "error" && <ErrorState message={materialsState.message} onRetry={loadMaterials} />}
          {materialsState.status === "ready" && materialsState.materials.length === 0 && materialCategory === "all" && (
            <EmptyState title="No materials published yet" description="We only show reviewed, published materials. Explore the Studio or plan your requirements in the meantime." action={<Link to="/studio" className="inline-flex min-h-11 items-center rounded-full bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-white">Explore Studio</Link>} />
          )}
          {materialsState.status === "ready" && materialsState.materials.length === 0 && materialCategory !== "all" && (
            <EmptyState
              title="No materials in this category yet"
              description="Try a different category, or view all materials."
              action={
                <button
                  type="button"
                  onClick={() => setMaterialCategory("all")}
                  className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)]"
                >
                  Show all categories
                </button>
              }
            />
          )}
          {materialsState.status === "ready" && materialsState.materials.length > 0 && (
            <ul className="flex flex-col gap-3">
              {materialsState.materials.map((material) => (
                <Card as="li" key={material.id} className="p-0">
                  <Link to={`/materials/${material.slug}`} className="flex items-start gap-3 p-4 outline-none">
                    <MaterialImage imagePath={material.image_path} name={material.name} variant="thumb" />
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="text-xs font-medium text-[var(--smc-mineral-bronze)]">{MATERIAL_CATEGORY_LABELS[material.category]}</p>
                      <p className="text-sm font-semibold text-[var(--smc-charcoal)]">{material.name}</p>
                      {material.summary && <p className="text-sm text-[var(--smc-charcoal-soft)]">{material.summary}</p>}
                    </div>
                  </Link>
                </Card>
              ))}
            </ul>
          )}
        </>
      ) : tab !== "professionals" ? (
        <EmptyState title={`${ALL_TABS.find((t) => t.key === tab)?.label} arrive in a later slice`} description={TAB_EMPTY_DESCRIPTION[tab]} />
      ) : (
        <>
          <section className="rounded-2xl border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] p-4">
            <h2 className="text-sm font-semibold">What kind of professional?</h2>
            <div role="group" aria-label="Filter by profession" className="mt-3 flex gap-2 overflow-x-auto pb-2">
              <button type="button" aria-pressed={profession === ""} onClick={() => setProfession("")}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-xs font-semibold ${profession === "" ? "border-[var(--smc-charcoal)] bg-[var(--smc-charcoal)] text-white" : "border-[var(--smc-border-strong)]"}`}>All trades</button>
              {PROFESSION_FILTER_OPTIONS.map((key) => (
                <button key={key} type="button" aria-pressed={profession === key} onClick={() => setProfession(key)}
                  className={`min-h-11 shrink-0 rounded-full border px-4 text-xs font-semibold ${profession === key ? "border-[var(--smc-charcoal)] bg-[var(--smc-charcoal)] text-white" : "border-[var(--smc-border-strong)]"}`}>
                  {CATEGORY_LABELS[key]}
                </button>
              ))}
            </div>
            <label className="mt-3 flex flex-col gap-2 text-sm font-medium">
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4" aria-hidden="true" /> Location or service area</span>
              <input type="search" value={serviceArea} onChange={(event) => setServiceArea(event.target.value)}
                placeholder="London, Wembley, Manchester…" aria-label="Filter by location or service area"
                className="min-h-12 rounded-xl border border-[var(--smc-border)] bg-white px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]" />
            </label>
          </section>

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
            <EmptyState title="No verified professionals published yet" description="The directory is awaiting approved profiles. Nobody is displayed or assigned until verification and publication are complete." action={<Link to="/studio" className="inline-flex min-h-11 items-center rounded-full border border-[var(--smc-border-strong)] px-5 text-sm font-semibold">Explore materials instead</Link>} />
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
            <section>
              <p role="status" className="mb-3 text-sm text-[var(--smc-charcoal-soft)]">
                {state.professionals.length} verified {state.professionals.length === 1 ? "professional" : "professionals"} shown
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {state.professionals.map((pro) => {
                  const name = pro.profile?.display_name ?? pro.company_name ?? "Professional";
                  return (
                    <Card as="li" key={pro.user_id} className="flex flex-col justify-between p-5">
                      <div className="flex items-start gap-3">
                        <Avatar name={name} size={48} />
                        <div className="min-w-0">
                          <p className="break-words font-semibold">{name}</p>
                          <p className="mt-1 text-xs font-semibold text-[var(--smc-mineral-bronze)]">{pro.category ? CATEGORY_LABELS[pro.category] ?? pro.category : "Professional"}</p>
                          {pro.company_name && <p className="mt-2 text-sm text-[var(--smc-charcoal-soft)]">{pro.company_name}</p>}
                          {pro.service_area && <p className="mt-1 flex items-center gap-1 text-xs text-[var(--smc-charcoal-faint)]"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{pro.service_area}</p>}
                        </div>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <Link to={`/profile/${pro.user_id}`} className="flex min-h-12 items-center justify-center rounded-xl border border-[var(--smc-border-strong)] px-2 text-center text-sm font-semibold">View profile</Link>
                        <Link to={`/quotes/new?professional=${encodeURIComponent(pro.user_id)}`} className="flex min-h-12 items-center justify-center rounded-xl bg-[var(--smc-charcoal)] px-2 text-center text-sm font-semibold text-white">Request quote</Link>
                      </div>
                    </Card>
                  );
                })}
              </ul>
            </section>
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
