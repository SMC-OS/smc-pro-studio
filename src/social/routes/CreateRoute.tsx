import { useState } from "react";
import { EmptyState, LoadingState } from "../components/StateViews";
import { createPost, type ContentVisibility } from "../services/socialClient";
import { useAuthSession } from "../services/useAuthSession";

const VISIBILITY_OPTIONS: Array<{ value: ContentVisibility; label: string }> = [
  { value: "public", label: "Public — anyone can see this" },
  { value: "followers", label: "Followers only" },
  { value: "private", label: "Only me" },
];

export default function CreateRoute() {
  const auth = useAuthSession();

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") {
    return (
      <EmptyState
        title="Sign in to create a post"
        description="Posting requires an SMC Pro Studio account. Guests can browse Home and Discover freely."
      />
    );
  }

  return <PostComposer />;
}

function PostComposer() {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<ContentVisibility>("public");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createPost({ body, visibility });
      setBody("");
      setPublished(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The post could not be published.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold text-[var(--smc-charcoal)]">Create a post</h1>
      {published && (
        <p role="status" className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-limestone)] px-4 py-2 text-sm text-[var(--smc-charcoal)]">
          Published.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-[var(--smc-radius-card)] border border-[var(--smc-mineral-clay)]/40 bg-[var(--smc-surface-raised)] px-4 py-2 text-sm text-[var(--smc-charcoal)]">
          {error}
        </p>
      )}
      <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--smc-charcoal)]">
        What would you like to share?
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={3000}
          rows={5}
          required
          className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] p-3 text-sm text-[var(--smc-charcoal)] focus:border-[var(--smc-mineral-bronze)] focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--smc-charcoal)]">
        Who can see this?
        <select
          value={visibility}
          onChange={(event) => setVisibility(event.target.value as ContentVisibility)}
          className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] p-3 text-sm text-[var(--smc-charcoal)]"
        >
          {VISIBILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={busy}
        className="min-h-[44px] rounded-[var(--smc-radius-pill)] bg-[var(--smc-charcoal)] px-4 py-2.5 text-sm font-semibold text-[var(--smc-ivory)] disabled:opacity-50"
      >
        {busy ? "Publishing…" : "Publish"}
      </button>
    </form>
  );
}
