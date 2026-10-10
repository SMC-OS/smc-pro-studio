import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers3, Ruler, Sparkles } from "lucide-react";
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

  const visibleMaterials = useMemo(
    () => category === "all" ? materials : materials.filter((material) => material.category === category),
    [category, materials],
  );

  return (
    <div className="flex flex-col gap-7">
      <SectionHeading
        eyebrow="Plan before you build"
        title="Studio"
        description="Explore materials, keep design ideas together and turn inspiration into a real project."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <Sparkles className="h-5 w-5 text-[var(--smc-mineral-bronze)]" />
          <h2 className="mt-4 font-semibold">Visualise</h2>
          <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">Your saved room concepts and material ideas live here as the visualiser is connected into the launch flow.</p>
        </Card>
        <Card className="p-5">
          <Layers3 className="h-5 w-5 text-[var(--smc-mineral-bronze)]" />
          <h2 className="mt-4 font-semibold">Materials</h2>
          <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">Browse the real SMC catalogue and carry a material choice into your project.</p>
        </Card>
        <Card className="p-5">
          <Ruler className="h-5 w-5 text-[var(--smc-mineral-bronze)]" />
          <h2 className="mt-4 font-semibold">Measure & quote</h2>
          <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">Project measurements and quote requests are now backed by the launch database.</p>
        </Card>
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
            <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">Published catalogue materials only — no demo stock or fabricated availability.</p>
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

        <div className="mt-4">
          {state === "loading" && <LoadingState label="Loading Studio" />}
          {state === "error" && <ErrorState message={message} onRetry={load} />}
          {state === "ready" && visibleMaterials.length === 0 && (
            <EmptyState title="No published materials in this view" description="Catalogue editors can publish real materials from the existing management area." />
          )}
          {state === "ready" && visibleMaterials.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {visibleMaterials.map((material) => {
                const imageUrl = getMaterialImageUrl(material.image_path);
                return (
                  <li key={material.id}>
                    <Link to={`/materials/${material.slug}`} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]">
                      <Card className="h-full overflow-hidden">
                        {imageUrl && <img src={imageUrl} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy" />}
                        <div className="p-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--smc-mineral-bronze)]">{label(material.category)}</p>
                          <h3 className="mt-1 text-base font-semibold">{material.name}</h3>
                          {material.summary && <p className="mt-2 text-sm text-[var(--smc-charcoal-soft)]">{material.summary}</p>}
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
