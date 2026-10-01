import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { Card, SectionHeading } from "../components/ui";
import { MaterialImage } from "../components/MaterialImage";
import { fetchMaterialBySlug, type Material, type MaterialCategory } from "../services/materialsClient";
import { describeError } from "../services/networkErrors";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; material: Material | null };

// Mirrors materialsClient.ts's MATERIAL_CATEGORIES exactly (same source of
// truth as NetworkRoute.tsx's own copy of this label map).
const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  quartz: "Quartz",
  granite: "Granite",
  marble: "Marble",
  porcelain: "Porcelain",
  dekton: "Dekton",
};

function NotFound() {
  return (
    <EmptyState
      title="Material not found"
      description="This material doesn't exist, or isn't published yet."
      action={
        <Link
          to="/network"
          className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 text-sm font-semibold text-[var(--smc-charcoal)] outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] focus-visible:ring-offset-1"
        >
          Back to Network
        </Link>
      }
    />
  );
}

/**
 * Phase 5 Slice A: `/materials/:slug` — a single published material.
 * `fetchMaterialBySlug` returns null for a nonexistent, draft, or archived
 * slug alike (RLS-collapsed, indistinguishable by design), so all three —
 * plus a missing/malformed slug param, handled below without ever querying
 * — render the identical NotFound state. No price, stock, discount, origin,
 * certification, standards, warranty, or provenance content exists on this
 * screen. Slice C adds the material's single editorial image, when one has
 * been uploaded — never a placeholder.
 */
export default function MaterialDetailRoute() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(() => {
    if (!slug) {
      setState({ status: "ready", material: null });
      return;
    }
    setState({ status: "loading" });
    fetchMaterialBySlug(slug)
      .then((material) => setState({ status: "ready", material }))
      .catch((error: unknown) =>
        setState({ status: "error", message: describeError(error, "This material could not be loaded.").message })
      );
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === "loading") return <LoadingState label="Loading material" />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={load} />;
  if (!state.material) return <NotFound />;

  const material = state.material;

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading eyebrow={CATEGORY_LABELS[material.category]} title={material.name} description={material.summary ?? undefined} />
      <MaterialImage imagePath={material.image_path} name={material.name} variant="hero" />
      <Card className="flex flex-col gap-4 p-5">
        {material.description && (
          <p className="whitespace-pre-line text-sm text-[var(--smc-charcoal-soft)]">{material.description}</p>
        )}
        {material.applications.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--smc-mineral-bronze)]">
              Applications
            </span>
            <div className="flex flex-wrap gap-2">
              {material.applications.map((application) => (
                <span
                  key={application}
                  className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] bg-[var(--smc-surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--smc-charcoal-soft)]"
                >
                  {application}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
