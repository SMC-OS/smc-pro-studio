import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Layers3, Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, SectionHeading } from "../components/ui";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { fetchPublishedMaterials, getMaterialImageUrl, MATERIAL_CATEGORIES, type Material } from "../services/materialsClient";
import { fetchStudioDesigns, type StudioDesignSummary } from "../services/launchClient";
import { useAuthSession } from "../services/useAuthSession";
import { describeError } from "../services/networkErrors";

function label(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StudioRoute() {
  const auth = useAuthSession();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [designs, setDesigns] = useState<StudioDesignSummary[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    setState("loading");
    Promise.all([
      fetchPublishedMaterials(),
      auth.status === "authenticated" ? fetchStudioDesigns() : Promise.resolve([]),
    ])
      .then(([materialRows, designRows]) => {
        setMaterials(materialRows);
        setDesigns(designRows);
        setState("ready");
      })
      .catch((error: unknown) => {
        setMessage(describeError(error, "Studio could not be loaded.").message);
        setState("error");
      });
  }, [auth.status]);

  useEffect(() => {
    if (auth.status !== "loading") load();
  }, [auth.status, load]);

  const visibleMaterials = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return materials.filter((material) =>
      (category === "all" || material.category === category) &&
      (!term || [material.name, material.category, material.summary ?? "", ...material.applications]
        .some((value) => value.toLocaleLowerCase().includes(term)))
    );
  }, [category, materials, search]);

  return (
    <div className="flex flex-col gap-7">
      <SectionHeading
        eyebrow="Plan before you build"
        title="Studio"
        description="Explore materials, keep design ideas together and turn inspiration into a real project."
      />

      <div className="rounded-[2rem] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--smc-limestone)] text-[var(--smc-mineral-bronze)]">
            <Layers3 aria-hidden="true" className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--smc-mineral-bronze)]">From idea to installation</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Choose materials. Shape your brief.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--smc-charcoal-soft)]">Discover published surfaces and send your choices to a verified professional. Final measurements and suitability are confirmed by them.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link to="/quotes/new" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--smc-charcoal)] px-3 text-center text-sm font-semibold text-white">
            Plan a quote <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link to="/network" className="flex min-h-12 items-center justify-center rounded-2xl border border-[var(--smc-border-strong)] px-3 text-center text-sm font-semibold">Find professionals</Link>
        </div>
        <p className="mt-4 text-xs text-[var(--smc-charcoal-faint)]"><Sparkles className="mr-1 inline h-4 w-4" aria-hidden="true" /> Photo visualisation is being developed; it is not available to use yet.</p>
      </div>

      {auth.status === "authenticated" && designs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold tracking-[-0.02em]">Your designs</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {designs.map((design) => (
              <Card key={design.id} className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--smc-mineral-bronze)]">{label(design.status)}</p>
                <p className="mt-1 font-semibold">{label(design.room_type)}</p>
                <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">{design.material?.name ?? "No material selected yet"}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section id="materials">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em]">Materials</h2>
            <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">Browse real published surfaces. Ask a professional about availability and suitability.</p>
          </div>
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => setCategory("all")} className={`min-h-[44px] rounded-full border px-4 text-xs font-semibold ${category === "all" ? "border-[var(--smc-charcoal)] bg-[var(--smc-charcoal)] text-white" : "border-[var(--smc-border-strong)]"}`}>All</button>
            {MATERIAL_CATEGORIES.map((item) => (
              <button key={item} type="button" onClick={() => setCategory(item)} className={`min-h-[44px] rounded-full border px-4 text-xs font-semibold ${category === item ? "border-[var(--smc-charcoal)] bg-[var(--smc-charcoal)] text-white" : "border-[var(--smc-border-strong)]"}`}>
                {label(item)}
              </button>
            ))}
          </div>
        </div>

        <label className="relative mt-4 block">
          <span className="sr-only">Search published materials</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--smc-charcoal-faint)]" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Search a surface or application"
            className="min-h-[52px] w-full rounded-2xl border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] py-3 pl-12 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]" />
        </label>
        {state === "ready" && materials.length > 0 && (
          <p role="status" className="mt-2 text-xs text-[var(--smc-charcoal-soft)]">
            Showing {visibleMaterials.length} of {materials.length} published materials
          </p>
        )}

        <div className="mt-4">
          {state === "loading" && <LoadingState label="Loading Studio" />}
          {state === "error" && <ErrorState message={message} onRetry={load} />}
          {state === "ready" && visibleMaterials.length === 0 && (
            <EmptyState
              title={materials.length === 0 ? "Our published collection is being prepared" : "No surfaces match your search"}
              description={materials.length === 0
                ? "No materials have been published yet. You can still plan your requirements without relying on invented products or prices."
                : "Try a different search, clear your search or choose another category."}
              action={materials.length > 0
                ? <button type="button" onClick={() => { setCategory("all"); setSearch(""); }} className="min-h-11 rounded-full border border-[var(--smc-border-strong)] px-5 text-sm font-semibold">Clear filters</button>
                : <div className="flex flex-wrap justify-center gap-2">
                    <Link to="/network" className="inline-flex min-h-11 items-center rounded-full bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-white">Find a professional</Link>
                    <Link to="/quotes/new" className="inline-flex min-h-11 items-center rounded-full border border-[var(--smc-border-strong)] px-5 text-sm font-semibold">Plan a quote</Link>
                  </div>}
            />
          )}
          {state === "ready" && visibleMaterials.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {visibleMaterials.map((material) => {
                const imageUrl = getMaterialImageUrl(material.image_path);
                return (
                  <li key={material.id}>
                    <Link to={`/materials/${material.slug}`} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]">
                      <Card className="h-full overflow-hidden">
                        {imageUrl
                          ? <img src={imageUrl} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy" />
                          : <div className="flex aspect-[16/10] items-center justify-center bg-[var(--smc-limestone)]"><Layers3 className="h-12 w-12 text-[var(--smc-mineral-bronze)]" aria-hidden="true" /></div>}
                        <div className="p-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--smc-mineral-bronze)]">{label(material.category)}</p>
                          <h3 className="mt-1 text-base font-semibold">{material.name}</h3>
                          {material.summary && <p className="mt-2 text-sm text-[var(--smc-charcoal-soft)]">{material.summary}</p>}
                          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">View details <ArrowRight aria-hidden="true" className="h-4 w-4" /></span>
                        </div>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
