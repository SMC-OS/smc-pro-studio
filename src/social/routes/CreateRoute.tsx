import { useState } from "react";
import { EmptyState, LoadingState } from "../components/StateViews";
import { Button, Card, SectionHeading } from "../components/ui";
import { createPost, type ContentVisibility, type PostType } from "../services/socialClient";
import { useAuthSession } from "../services/useAuthSession";

const VISIBILITY_OPTIONS: Array<{ value: ContentVisibility; label: string }> = [
  { value: "public", label: "Public — anyone can see this" },
  { value: "followers", label: "Followers only" },
  { value: "private", label: "Only me" },
];

// field_update, project_update, and opportunity are deferred (see
// tasks/todo.md) — no option for them here ahead of the schema/design that
// would back them.
const POST_TYPE_OPTIONS: Array<{ value: PostType; label: string; description: string }> = [
  { value: "general", label: "General post", description: "Share an update, thought, or anything else with your network." },
  { value: "portfolio", label: "Portfolio", description: "For presenting completed or representative work." },
];

export default function CreateRoute() {
  const auth = useAuthSession();

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") {
    return (
      <EmptyState
        title="Sign in to create a post"
        description="Posting requires an SMC Pro Studio account. Guests can browse Home and Network freely."
      />
    );
  }

  return <PostComposer />;
}

function PostComposer() {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<ContentVisibility>("public");
  const [postType, setPostType] = useState<PostType>("general");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await createPost({ body, visibility, postType });
      setBody("");
      setPublished(true);
    } catch (caught) {
      // body/visibility/postType are deliberately left as-is here — a failed
      // submit must not lose the author's draft or their selected post type.
      setError(caught instanceof Error ? caught.message : "The post could not be published.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading eyebrow="Create" title="Share something" description="Post to the SMC Pro Studio community." />
      <Card className="p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {published && (
            <p role="status" className="rounded-[var(--smc-radius-card)] bg-[var(--smc-limestone)] px-4 py-2.5 text-sm text-[var(--smc-charcoal)]">
              Published.
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-[var(--smc-radius-card)] border border-[var(--smc-mineral-clay)]/40 px-4 py-2.5 text-sm text-[var(--smc-charcoal)]">
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
              className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-sunken)] p-3 text-sm text-[var(--smc-charcoal)] focus:border-[var(--smc-mineral-bronze)] focus:outline-none"
            />
          </label>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-[var(--smc-charcoal)]">Post type</legend>
            <div className="flex flex-col gap-2">
              {POST_TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-2.5 rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-sunken)] p-3 has-[:checked]:border-[var(--smc-mineral-bronze)]"
                >
                  <input
                    type="radio"
                    name="post-type"
                    value={option.value}
                    checked={postType === option.value}
                    onChange={() => setPostType(option.value)}
                    required
                    className="mt-0.5"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-[var(--smc-charcoal)]">{option.label}</span>
                    <span className="text-xs text-[var(--smc-charcoal-faint)]">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--smc-charcoal)]">
            Who can see this?
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as ContentVisibility)}
              className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-sunken)] p-3 text-sm text-[var(--smc-charcoal)]"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? "Publishing…" : "Publish"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
