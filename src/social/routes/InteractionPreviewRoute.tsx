import { useState } from "react";
import { PostCard } from "../components/PostCard";
import { FollowButton } from "../components/FollowButton";
import { ConnectButton } from "../components/ConnectButton";
import { CommentsDrawer } from "../components/CommentsDrawer";
import { Card, SectionHeading } from "../components/ui";
import type { FeedPost } from "../services/socialClient";
import type { AuthSessionState } from "../services/useAuthSession";

/**
 * Design/QA preview for Slice 3's interaction components. Dev-only — see
 * SocialApp.tsx, which only registers this route when `import.meta.env.DEV`
 * is true (verify with `grep -r "interaction-preview" dist/` after
 * `npm run build`: nothing should match). Not linked from any navigation.
 *
 * This is NOT a mock: every control here calls the real ReactionButton,
 * FollowButton, ConnectButton and CommentsDrawer components, which in turn
 * call the real socialClient service functions. In an environment with no
 * Supabase project configured (this sandbox), those calls genuinely fail
 * with "This requires a configured Supabase connection." — that's real
 * error-handling behaviour being exercised, not a simulated success. This
 * page exists to let the signed-in-vs-guest UI states, layout, and
 * accessibility be reviewed even where a live backend isn't available; it
 * never claims a mutation succeeded when it didn't.
 */

const FAKE_AUTHENTICATED: AuthSessionState = {
  status: "authenticated",
  session: { subject: "00000000-0000-0000-0000-000000000000", emailVerified: true, roles: [] },
};
const GUEST: AuthSessionState = { status: "guest" };

const FAKE_POST: FeedPost = {
  id: "00000000-0000-0000-0000-000000000001",
  author_id: "00000000-0000-0000-0000-0000000000aa",
  body: "Preview post used only to review the reaction, comment, and save controls — not real content.",
  visibility: "public",
  post_type: "general",
  created_at: new Date(0).toISOString(),
  author: {
    id: "00000000-0000-0000-0000-0000000000aa",
    display_name: "Preview Author",
    username: "preview",
    avatar_path: null,
    account_type: "professional",
  },
};

export default function InteractionPreviewRoute() {
  const [authMode, setAuthMode] = useState<"guest" | "authenticated">("authenticated");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const auth = authMode === "guest" ? GUEST : FAKE_AUTHENTICATED;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        eyebrow="Dev preview — not in production"
        title="Slice 3 interaction components"
        description="Component review surface. No backend call here ever claims success — a Supabase-less environment shows the real 'not configured' failure path."
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAuthMode("guest")}
          aria-pressed={authMode === "guest"}
          className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-3 py-2 text-xs font-semibold"
        >
          Guest view
        </button>
        <button
          type="button"
          onClick={() => setAuthMode("authenticated")}
          aria-pressed={authMode === "authenticated"}
          className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-3 py-2 text-xs font-semibold"
        >
          Signed-in view
        </button>
      </div>

      <Card className="p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--smc-mineral-bronze)]">PostCard</p>
        <PostCard
          post={FAKE_POST}
          auth={auth}
          canSave={authMode === "authenticated"}
          engagement={{ status: "confirmed", value: { reactionCount: 3, commentCount: 2, reactedByMe: false } }}
        />
      </Card>

      <Card className="p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--smc-mineral-bronze)]">FollowButton states</p>
        <div className="flex flex-wrap gap-3">
          <FollowButton userId="00000000-0000-0000-0000-0000000000bb" initiallyFollowing={false} />
          <FollowButton userId="00000000-0000-0000-0000-0000000000cc" initiallyFollowing={true} />
          <FollowButton userId="00000000-0000-0000-0000-0000000000dd" initiallyFollowing={false} disabled />
        </div>
      </Card>

      <Card className="p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--smc-mineral-bronze)]">ConnectButton states</p>
        <div className="flex flex-wrap items-start gap-3">
          <ConnectButton userId="00000000-0000-0000-0000-0000000000ee" initialState="none" initialConnectionId={null} />
          <ConnectButton userId="00000000-0000-0000-0000-0000000000ff" initialState="pending_outgoing" initialConnectionId="conn-1" />
          <ConnectButton userId="00000000-0000-0000-0000-000000000011" initialState="pending_incoming" initialConnectionId="conn-2" />
          <ConnectButton userId="00000000-0000-0000-0000-000000000022" initialState="connected" initialConnectionId="conn-3" />
        </div>
      </Card>

      <Card className="p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--smc-mineral-bronze)]">CommentsDrawer</p>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 py-2 text-sm font-semibold"
        >
          Open comments drawer
        </button>
        <CommentsDrawer postId={FAKE_POST.id} open={drawerOpen} onClose={() => setDrawerOpen(false)} auth={auth} />
      </Card>
    </div>
  );
}
