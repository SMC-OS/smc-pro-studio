import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { Button, Card, SectionHeading } from "../components/ui";
import {
  archiveMaterial,
  checkCatalogueEditorAccess,
  createDraftMaterial,
  fetchMaterialsForEditor,
  MATERIAL_CATEGORIES,
  publishMaterial,
  updateDraftMaterial,
  type EditorMaterial,
  type MaterialCategory,
} from "../services/materialsClient";
import { useAuthSession } from "../services/useAuthSession";

/**
 * Phase 5 Slice B: `/catalogue` — staff-only materials catalogue authoring
 * and publishing. Contextual only (reached from ProfileRoute's own link,
 * shown only after confirmed active-editor access), not a primary nav tab —
 * the same pattern ModerationRoute already establishes for report review.
 * ModerationRoute's own honest access-gate discipline is mirrored exactly:
 * a genuinely empty catalogue and a confirmed access denial are two
 * distinct, clearly-worded states, and nothing here renders before the
 * corresponding server call actually confirms it.
 *
 * No price, stock, discount, origin, certification, standards, warranty,
 * or provenance field exists anywhere on this screen — the underlying
 * schema has none, and none is invented here either.
 */

const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  quartz: "Quartz",
  granite: "Granite",
  marble: "Marble",
  porcelain: "Porcelain",
  dekton: "Dekton",
};

const STATUS_LABELS: Record<EditorMaterial["status"], string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

type AccessState = { status: "loading" } | { status: "error"; message: string } | { status: "denied" } | { status: "granted" };

export default function CatalogueManagementRoute() {
  const auth = useAuthSession();
  const [accessState, setAccessState] = useState<AccessState>({ status: "loading" });

  const loadAccess = useCallback(() => {
    if (auth.status !== "authenticated") return;
    setAccessState({ status: "loading" });
    checkCatalogueEditorAccess()
      .then((granted) => setAccessState(granted ? { status: "granted" } : { status: "denied" }))
      .catch((error: unknown) =>
        setAccessState({ status: "error", message: error instanceof Error ? error.message : "We couldn't verify your access. Please try again." })
      );
  }, [auth.status]);

  useEffect(() => {
    loadAccess();
  }, [loadAccess]);

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") {
    return (
      <EmptyState
        title="Sign in to manage the catalogue"
        description="Catalogue publishing is restricted to active catalogue editors."
        action={
          <Link
            to="/auth"
            className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 text-sm font-semibold text-[var(--smc-charcoal)] outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] focus-visible:ring-offset-1"
          >
            Sign in
          </Link>
        }
      />
    );
  }

  if (accessState.status === "loading") return <LoadingState label="Checking your access" />;
  if (accessState.status === "error") return <ErrorState message={accessState.message} onRetry={loadAccess} />;
  // Neutral denial — deliberately never worded like, or adjacent to, an
  // empty-catalogue state; a non-editor must never be able to infer whether
  // any draft/archived material exists.
  if (accessState.status === "denied") {
    return <EmptyState title="You don't have access to this page" description="Catalogue publishing is restricted to active catalogue editors." />;
  }

  return <CatalogueWorkspace />;
}

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: EditorMaterial[] };

interface FormValues {
  slug: string;
  name: string;
  category: MaterialCategory;
  summary: string;
  description: string;
  applicationsText: string;
}

const EMPTY_FORM: FormValues = { slug: "", name: "", category: "quartz", summary: "", description: "", applicationsText: "" };

function toFormValues(material: EditorMaterial): FormValues {
  return {
    slug: material.slug,
    name: material.name,
    category: material.category,
    summary: material.summary ?? "",
    description: material.description ?? "",
    applicationsText: material.applications.join(", "),
  };
}

function parseApplicationsText(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function CatalogueWorkspace() {
  const [listState, setListState] = useState<ListState>({ status: "loading" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const load = useCallback(() => {
    setListState({ status: "loading" });
    fetchMaterialsForEditor()
      .then((items) => setListState({ status: "ready", items }))
      .catch((error: unknown) =>
        setListState({ status: "error", message: error instanceof Error ? error.message : "The catalogue could not be loaded." })
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function startEdit(material: EditorMaterial) {
    setEditingId(material.id);
    setForm(toFormValues(material));
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);
    const input = {
      slug: form.slug,
      name: form.name,
      category: form.category,
      summary: form.summary,
      description: form.description,
      applications: parseApplicationsText(form.applicationsText),
    };
    try {
      if (editingId) {
        await updateDraftMaterial(editingId, input);
      } else {
        await createDraftMaterial(input);
      }
      startCreate();
      load();
    } catch (caught) {
      // Form values are deliberately left as-is on failure — a rejected
      // save must not lose the editor's in-progress draft text.
      setFormError(caught instanceof Error ? caught.message : "This material could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(id: string) {
    if (rowBusyId) return;
    setRowBusyId(id);
    setRowError(null);
    try {
      await publishMaterial(id);
      load();
    } catch (caught) {
      setRowError(caught instanceof Error ? caught.message : "This material could not be published.");
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleArchive(id: string) {
    if (rowBusyId) return;
    setRowBusyId(id);
    setRowError(null);
    try {
      await archiveMaterial(id);
      if (editingId === id) startCreate();
      load();
    } catch (caught) {
      setRowError(caught instanceof Error ? caught.message : "This material could not be archived.");
    } finally {
      setRowBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        eyebrow="Catalogue"
        title="Manage materials"
        description="Create, edit, publish, and archive materials in the guest-facing catalogue."
      />

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="smc-editorial text-base font-medium text-[var(--smc-charcoal)]">
            {editingId ? "Edit draft" : "New material"}
          </h2>
          {formError && (
            <p role="alert" className="rounded-[var(--smc-radius-card)] border border-[var(--smc-mineral-clay)]/40 px-4 py-2.5 text-sm text-[var(--smc-charcoal)]">
              {formError}
            </p>
          )}
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--smc-charcoal)]">
            Slug
            <input
              type="text"
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              placeholder="calacatta-quartz"
              required
              className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-sunken)] p-3 text-sm text-[var(--smc-charcoal)] focus:border-[var(--smc-mineral-bronze)] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--smc-charcoal)]">
            Name
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-sunken)] p-3 text-sm text-[var(--smc-charcoal)] focus:border-[var(--smc-mineral-bronze)] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--smc-charcoal)]">
            Category
            <select
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as MaterialCategory }))}
              className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-sunken)] p-3 text-sm text-[var(--smc-charcoal)]"
            >
              {MATERIAL_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--smc-charcoal)]">
            Summary <span className="font-normal text-[var(--smc-charcoal-faint)]">(required before publishing)</span>
            <textarea
              value={form.summary}
              onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
              maxLength={240}
              rows={2}
              className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-sunken)] p-3 text-sm text-[var(--smc-charcoal)] focus:border-[var(--smc-mineral-bronze)] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--smc-charcoal)]">
            Description <span className="font-normal text-[var(--smc-charcoal-faint)]">(optional)</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              maxLength={4000}
              rows={4}
              className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-sunken)] p-3 text-sm text-[var(--smc-charcoal)] focus:border-[var(--smc-mineral-bronze)] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--smc-charcoal)]">
            Applications <span className="font-normal text-[var(--smc-charcoal-faint)]">(comma-separated, optional)</span>
            <input
              type="text"
              value={form.applicationsText}
              onChange={(event) => setForm((prev) => ({ ...prev, applicationsText: event.target.value }))}
              placeholder="Kitchen Worktops, Bathroom Vanities"
              className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-sunken)] p-3 text-sm text-[var(--smc-charcoal)] focus:border-[var(--smc-mineral-bronze)] focus:outline-none"
            />
          </label>
          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save draft" : "Create draft"}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={startCreate} disabled={saving}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      {rowError && (
        <p role="alert" className="rounded-[var(--smc-radius-card)] border border-[var(--smc-mineral-clay)]/40 bg-[var(--smc-surface-raised)] px-4 py-2.5 text-sm text-[var(--smc-charcoal)]">
          {rowError}
        </p>
      )}

      {listState.status === "loading" && <LoadingState label="Loading catalogue" />}
      {listState.status === "error" && <ErrorState message={listState.message} onRetry={load} />}
      {listState.status === "ready" && listState.items.length === 0 && (
        <EmptyState title="No materials yet" description="Create the first material using the form above." />
      )}
      {listState.status === "ready" && listState.items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {listState.items.map((material) => (
            <Card as="li" key={material.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--smc-charcoal)]">{material.name}</p>
                  <p className="text-xs text-[var(--smc-charcoal-faint)]">
                    {CATEGORY_LABELS[material.category]} · /materials/{material.slug}
                  </p>
                </div>
                <span className="shrink-0 rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--smc-charcoal-soft)]">
                  {STATUS_LABELS[material.status]}
                </span>
              </div>
              {material.summary && <p className="text-sm text-[var(--smc-charcoal-soft)]">{material.summary}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {material.status === "draft" && (
                  <Button type="button" variant="secondary" onClick={() => startEdit(material)} disabled={rowBusyId === material.id}>
                    Edit
                  </Button>
                )}
                {material.status === "draft" && (
                  <Button type="button" onClick={() => handlePublish(material.id)} disabled={rowBusyId === material.id}>
                    {rowBusyId === material.id ? "Publishing…" : "Publish"}
                  </Button>
                )}
                {(material.status === "draft" || material.status === "published") && (
                  <Button type="button" variant="ghost" onClick={() => handleArchive(material.id)} disabled={rowBusyId === material.id}>
                    {rowBusyId === material.id ? "Archiving…" : "Archive"}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
