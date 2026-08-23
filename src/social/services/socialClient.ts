import { getSupabaseClient, isSupabaseConfigured } from "../../services/supabaseClient";

export type ContentVisibility = "public" | "followers" | "connections" | "project" | "private";
export type AccountType = "customer" | "professional";

export interface PublicAuthor {
  id: string;
  display_name: string;
  username: string | null;
  avatar_path: string | null;
  account_type: AccountType;
}

export interface FeedAuthorProfessionalSummary {
  category: string | null;
  company_name: string | null;
}

export interface FeedPost {
  id: string;
  author_id: string;
  body: string | null;
  visibility: ContentVisibility;
  created_at: string;
  /** `professional` is only populated by queries that ask for it (currently just fetchHomeFeed) — optional so fetchPublicPostsByAuthor's narrower select still satisfies this shared type. */
  author: (PublicAuthor & { professional?: FeedAuthorProfessionalSummary | null }) | null;
}

export interface PublicProfessional {
  user_id: string;
  category: string | null;
  company_name: string | null;
  service_area: string | null;
  profile: PublicAuthor | null;
}

export class SocialUnavailableError extends Error {
  constructor(message = "This requires a configured Supabase connection.") {
    super(message);
    this.name = "SocialUnavailableError";
  }
}

function requireClient() {
  if (!isSupabaseConfigured) throw new SocialUnavailableError();
  return getSupabaseClient();
}

export interface HomeFeedCursor {
  createdAt: string;
  id: string;
}

export interface HomeFeedPage {
  posts: FeedPost[];
  /** Present only when the one-row overfetch confirms a next page exists. */
  nextCursor: HomeFeedCursor | null;
}

const HOME_FEED_PAGE_SIZE = 20;

/**
 * Relationship-aware Home feed. This issues exactly one query, unfiltered by
 * visibility or relationship, and lets `posts`' existing RLS policies decide
 * which rows come back: `posts_public_read` (guests and members alike),
 * `posts_owner_read` (the signed-in caller's own posts), and
 * `posts_relationship_read` (followers/connections-visibility posts where
 * the caller genuinely has that relationship) are OR'd together by Postgres
 * itself — nothing here re-implements or narrows that logic. The only
 * client-side filter is `moderation_status = 'visible'`, which is a content
 * display choice (don't surface a post you removed yourself), not an
 * authorization check — every RLS branch except posts_owner_read already
 * requires it anyway.
 *
 * Keyset-paginated on (created_at, id) descending, both already indexable
 * without a new migration; the id tiebreaker keeps pages stable even when
 * two posts share a created_at timestamp.
 */
export async function fetchHomeFeed(cursor: HomeFeedCursor | null = null, pageSize = HOME_FEED_PAGE_SIZE): Promise<HomeFeedPage> {
  if (!isSupabaseConfigured) return { posts: [], nextCursor: null };
  let query = getSupabaseClient()
    .from("posts")
    .select(
      "id, author_id, body, visibility, created_at, " +
        "author:profiles(id, display_name, username, avatar_path, account_type, professional:professional_profiles(category, company_name))"
    )
    .eq("moderation_status", "visible")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);
  if (cursor) {
    // Double-quoted: PostgREST's or()/and() grouped-filter grammar treats
    // "." and ":" as reserved inside a value (unlike a plain top-level
    // filter, where an unquoted ISO timestamp is fine) — quoting removes
    // any ambiguity for the timestamp. The uuid id needs no quoting, since
    // hyphens aren't reserved there.
    const quotedCreatedAt = JSON.stringify(cursor.createdAt);
    query = query.or(`created_at.lt.${quotedCreatedAt},and(created_at.eq.${quotedCreatedAt},id.lt.${cursor.id})`);
  }
  const { data, error } = await query;
  if (error) throw new Error("The feed could not be loaded. Please try again.");
  const rows = (data ?? []) as unknown as FeedPost[];
  const hasMore = rows.length > pageSize;
  const page = hasMore ? rows.slice(0, pageSize) : rows;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? { createdAt: last.created_at, id: last.id } : null;
  return { posts: page, nextCursor };
}

const SEARCH_MIN_PAGE_SIZE = 1;
const SEARCH_MAX_PAGE_SIZE = 50;
const SEARCH_DEFAULT_PAGE_SIZE = 20;

function clampSearchPageSize(size: number | undefined): number {
  if (size === undefined || !Number.isFinite(size)) return SEARCH_DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(size), SEARCH_MIN_PAGE_SIZE), SEARCH_MAX_PAGE_SIZE);
}

export interface ProfessionalSearchFilters {
  /** Free-text match against display name, company name, and service area (server-side, via `search_public_professionals`). */
  q?: string;
  /** `professional_profiles.category` — a bounded enum, matched exactly. */
  category?: string;
  /** Free-text match against `professional_profiles.service_area`. */
  serviceArea?: string;
  pageSize?: number;
  /** Keyset cursor — both fields must be provided together (the RPC rejects a partial cursor), or both omitted for the first page. */
  afterDisplayName?: string;
  afterUserId?: string;
}

export interface ProfessionalSearchPage {
  items: PublicProfessional[];
  /** Present only when the RPC's one-row overfetch confirms a next page exists. */
  nextCursor: { displayName: string; userId: string } | null;
}

interface SearchProfessionalRow {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_path: string | null;
  account_type: AccountType;
  category: string | null;
  company_name: string | null;
  service_area: string | null;
}

/**
 * Guest-safe: calls the `search_public_professionals` SECURITY INVOKER RPC.
 * RLS (`profiles_public_read`/`professional_profiles_public_read`) applies
 * exactly as it does for any other query; the RPC additionally excludes
 * onboarding-incomplete professionals, scoped to this function only — no
 * general RLS policy changed. The RPC overfetches by one row so `nextCursor`
 * reflects a real next page rather than an assumption.
 */
export async function searchPublicProfessionals(filters: ProfessionalSearchFilters = {}): Promise<ProfessionalSearchPage> {
  if (!isSupabaseConfigured) return { items: [], nextCursor: null };
  const pageSize = clampSearchPageSize(filters.pageSize);
  const { data, error } = await getSupabaseClient().rpc("search_public_professionals", {
    q: filters.q?.trim() || null,
    category_filter: filters.category || null,
    service_area_filter: filters.serviceArea?.trim() || null,
    after_display_name: filters.afterDisplayName ?? null,
    after_user_id: filters.afterUserId ?? null,
    page_size: pageSize,
  });
  if (error) throw new Error("Professionals could not be loaded. Please try again.");
  const rows = (data ?? []) as SearchProfessionalRow[];
  const hasMore = rows.length > pageSize;
  const page = hasMore ? rows.slice(0, pageSize) : rows;
  const items: PublicProfessional[] = page.map((row) => ({
    user_id: row.user_id,
    category: row.category,
    company_name: row.company_name,
    service_area: row.service_area,
    profile: {
      id: row.user_id,
      display_name: row.display_name,
      username: row.username,
      avatar_path: row.avatar_path,
      account_type: row.account_type,
    },
  }));
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? { displayName: last.display_name, userId: last.user_id } : null;
  return { items, nextCursor };
}

export interface OwnProfile extends PublicAuthor {
  bio: string | null;
  visibility: "public" | "private";
  onboarding_completed: boolean;
}

export async function fetchOwnProfile(): Promise<OwnProfile | null> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) return null;
  const { data, error } = await client
    .from("profiles")
    .select("id, display_name, username, avatar_path, account_type, bio, visibility, onboarding_completed")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (error) throw new Error("Your profile could not be loaded. Please try again.");
  return data as OwnProfile | null;
}

export async function createPost(input: { body: string; visibility: ContentVisibility }): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to post.");
  const body = input.body.trim();
  if (!body) throw new Error("Write something before posting.");
  if (body.length > 3000) throw new Error("Posts must be 3000 characters or fewer.");
  const { error } = await client.from("posts").insert({
    author_id: userData.user.id,
    body,
    visibility: input.visibility,
  });
  if (error) throw new Error("The post could not be published. Please try again.");
}

export async function followUser(followeeId: string): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to follow.");
  const { error } = await client.from("follows").insert({ follower_id: userData.user.id, followee_id: followeeId });
  if (error) throw new Error("This could not be followed right now.");
}

export async function unfollowUser(followeeId: string): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to manage follows.");
  const { error } = await client
    .from("follows")
    .delete()
    .eq("follower_id", userData.user.id)
    .eq("followee_id", followeeId);
  if (error) throw new Error("This could not be unfollowed right now.");
}

export async function savePost(postId: string): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to save.");
  const { error } = await client.from("saved_posts").insert({ user_id: userData.user.id, post_id: postId });
  if (error) throw new Error("This could not be saved right now.");
}

export async function unsavePost(postId: string): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to manage saved posts.");
  const { error } = await client.from("saved_posts").delete().eq("user_id", userData.user.id).eq("post_id", postId);
  if (error) throw new Error("This could not be unsaved right now.");
}

/** Which of the given post ids the signed-in user has already saved — used so the feed can render an honest, real toggle state rather than assuming "not saved." */
export async function fetchMySavedPostIds(postIds: string[]): Promise<Set<string>> {
  if (postIds.length === 0 || !isSupabaseConfigured) return new Set();
  const client = getSupabaseClient();
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return new Set();
  const { data, error } = await client.from("saved_posts").select("post_id").eq("user_id", userData.user.id).in("post_id", postIds);
  if (error) return new Set();
  return new Set((data ?? []).map((row) => row.post_id as string));
}

export interface OwnProfessionalProfile {
  user_id: string;
  category: string | null;
  company_name: string | null;
  services: string[];
  service_area: string | null;
  website_url: string | null;
  verification_status: "not_verified" | "pending" | "verified" | "rejected";
}

/** Owner-only read (professional_profiles_owner_read) — visible regardless of the public-read gate, so an incomplete professional profile can still show honestly to its own owner. */
export async function fetchOwnProfessionalProfile(): Promise<OwnProfessionalProfile | null> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) return null;
  const { data, error } = await client
    .from("professional_profiles")
    .select("user_id, category, company_name, services, service_area, website_url, verification_status")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error) throw new Error("Your professional profile could not be loaded. Please try again.");
  return data as OwnProfessionalProfile | null;
}

// ==========================================================================
// Public profile (viewing someone else's profile page)
// ==========================================================================

export interface PublicProfileDetail {
  id: string;
  display_name: string;
  username: string | null;
  avatar_path: string | null;
  account_type: AccountType;
  bio: string | null;
}

export interface PublicProfileFull {
  profile: PublicProfileDetail;
  professional: OwnProfessionalProfile | null;
}

/**
 * Reads exactly what `profiles_public_read`/`professional_profiles_public_read`
 * expose (visibility = 'public' only). Returns null both when the profile
 * doesn't exist and when it exists but is private — RLS already collapses
 * those two cases for us, and we deliberately don't try to tell them apart
 * so a private profile's existence isn't leaked to a guest or non-connection.
 */
export async function fetchPublicProfileById(userId: string): Promise<PublicProfileFull | null> {
  if (!isSupabaseConfigured) return null;
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("profiles")
    .select("id, display_name, username, avatar_path, account_type, bio")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error("This profile could not be loaded. Please try again.");
  if (!data) return null;
  const profile = data as PublicProfileDetail;
  let professional: OwnProfessionalProfile | null = null;
  if (profile.account_type === "professional") {
    const { data: proData, error: proError } = await client
      .from("professional_profiles")
      .select("user_id, category, company_name, services, service_area, website_url, verification_status")
      .eq("user_id", userId)
      .maybeSingle();
    if (proError) throw new Error("This profile could not be loaded. Please try again.");
    professional = (proData as OwnProfessionalProfile | null) ?? null;
  }
  return { profile, professional };
}

/**
 * A profile owner's own real posts, visible to the current viewer under
 * exactly the same RLS the general feed uses (`posts_public_read` for
 * everyone, `posts_relationship_read` additionally opens up
 * followers/connections-visibility posts to a follower/connection of this
 * author, `posts_owner_read` for the author themselves). No separate
 * visibility logic here — the query goes through the normal anon/
 * authenticated client, so Postgres RLS does the filtering, not this code.
 */
export async function fetchPublicPostsByAuthor(authorId: string, limit = 5): Promise<FeedPost[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await getSupabaseClient()
    .from("posts")
    .select("id, author_id, body, visibility, created_at, author:profiles(id, display_name, username, avatar_path, account_type)")
    .eq("author_id", authorId)
    .eq("moderation_status", "visible")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("This person's activity could not be loaded. Please try again.");
  return (data ?? []) as unknown as FeedPost[];
}

// ==========================================================================
// Post engagement: reaction/comment counts + the signed-in user's own state.
// Real counts only — computed by counting the rows RLS actually lets us
// read (guests get real counts too, since reactions/comments select is
// granted to anon for anything can_view_post() allows). On a fetch error we
// deliberately return an empty map rather than guessing zeros for posts we
// couldn't check — callers treat "missing entry" as "unknown", not "zero".
// ==========================================================================

export interface PostEngagement {
  reactionCount: number;
  commentCount: number;
  reactedByMe: boolean;
}

export async function fetchPostEngagement(postIds: string[]): Promise<Map<string, PostEngagement>> {
  const map = new Map<string, PostEngagement>();
  if (postIds.length === 0 || !isSupabaseConfigured) return map;
  const client = getSupabaseClient();
  try {
    const [{ data: reactions, error: reactionsError }, { data: comments, error: commentsError }, { data: userData }] = await Promise.all([
      client.from("reactions").select("post_id, user_id").in("post_id", postIds),
      client.from("comments").select("post_id").eq("moderation_status", "visible").in("post_id", postIds),
      client.auth.getUser(),
    ]);
    if (reactionsError || commentsError) return map;
    const myId = userData.user?.id ?? null;
    for (const id of postIds) map.set(id, { reactionCount: 0, commentCount: 0, reactedByMe: false });
    for (const row of reactions ?? []) {
      const entry = map.get(row.post_id as string);
      if (!entry) continue;
      entry.reactionCount += 1;
      if (myId && row.user_id === myId) entry.reactedByMe = true;
    }
    for (const row of comments ?? []) {
      const entry = map.get(row.post_id as string);
      if (!entry) continue;
      entry.commentCount += 1;
    }
    return map;
  } catch {
    return new Map();
  }
}

export async function reactToPost(postId: string): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to react.");
  const { error } = await client.from("reactions").insert({ post_id: postId, user_id: userData.user.id, reaction_type: "like" });
  if (error) throw new Error("This could not be reacted to right now.");
}

export async function unreactToPost(postId: string): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to manage reactions.");
  const { error } = await client.from("reactions").delete().eq("post_id", postId).eq("user_id", userData.user.id);
  if (error) throw new Error("This could not be undone right now.");
}

// ==========================================================================
// Comments
// ==========================================================================

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: PublicAuthor | null;
}

export async function fetchComments(postId: string): Promise<PostComment[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await getSupabaseClient()
    .from("comments")
    .select("id, post_id, author_id, body, created_at, author:profiles(id, display_name, username, avatar_path, account_type)")
    .eq("post_id", postId)
    .eq("moderation_status", "visible")
    .order("created_at", { ascending: true });
  if (error) throw new Error("Comments could not be loaded. Please try again.");
  return (data ?? []) as unknown as PostComment[];
}

export async function addComment(postId: string, body: string): Promise<PostComment> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to comment.");
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Write a comment before posting.");
  if (trimmed.length > 1000) throw new Error("Comments must be 1000 characters or fewer.");
  const { data, error } = await client
    .from("comments")
    .insert({ post_id: postId, author_id: userData.user.id, body: trimmed })
    .select("id, post_id, author_id, body, created_at, author:profiles(id, display_name, username, avatar_path, account_type)")
    .single();
  if (error) throw new Error("Your comment could not be posted. Please try again.");
  return data as unknown as PostComment;
}

export async function deleteComment(commentId: string): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to manage comments.");
  const { error } = await client.from("comments").delete().eq("id", commentId);
  if (error) throw new Error("This comment could not be deleted. Please try again.");
}

// ==========================================================================
// Follow (unilateral) — separate concept from Connections (mutual request/accept).
// ==========================================================================

export async function fetchFollowState(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const client = getSupabaseClient();
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return false;
  const { data, error } = await client
    .from("follows")
    .select("follower_id")
    .eq("follower_id", userData.user.id)
    .eq("followee_id", userId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

// ==========================================================================
// Connections — mutual request/accept, kept distinct from Follow.
// ==========================================================================

export type ConnectionState = "none" | "pending_outgoing" | "pending_incoming" | "connected";

export interface ConnectionSummary {
  state: ConnectionState;
  connectionId: string | null;
}

export async function fetchConnectionState(userId: string): Promise<ConnectionSummary> {
  if (!isSupabaseConfigured) return { state: "none", connectionId: null };
  const client = getSupabaseClient();
  const { data: userData } = await client.auth.getUser();
  const me = userData.user?.id;
  if (!me) return { state: "none", connectionId: null };
  const { data, error } = await client
    .from("connections")
    .select("id, requester_id, addressee_id, status")
    .or(`and(requester_id.eq.${me},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${me})`)
    .in("status", ["pending", "accepted"])
    .maybeSingle();
  if (error || !data) return { state: "none", connectionId: null };
  if (data.status === "accepted") return { state: "connected", connectionId: data.id as string };
  return {
    state: data.requester_id === me ? "pending_outgoing" : "pending_incoming",
    connectionId: data.id as string,
  };
}

export async function requestConnection(userId: string): Promise<string> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to connect.");
  if (userData.user.id === userId) throw new Error("You can't connect with yourself.");
  const { data, error } = await client
    .from("connections")
    .insert({ requester_id: userData.user.id, addressee_id: userId, status: "pending" })
    .select("id")
    .single();
  if (error) throw new Error("This connection request could not be sent right now.");
  return data.id as string;
}

export async function respondToConnection(connectionId: string, accept: boolean): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to manage connection requests.");
  const { data, error } = await client
    .from("connections")
    .update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
    .eq("id", connectionId)
    .select("id")
    .maybeSingle();
  // RLS silently filters out rows the caller isn't allowed to update (wrong party, or the
  // request is no longer pending — e.g. already responded to elsewhere) rather than erroring,
  // so a null row here means nothing actually changed and callers must not treat it as success.
  if (error || !data) throw new Error("This request could not be updated right now.");
}

export async function revokeConnectionRequest(connectionId: string): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in to manage connection requests.");
  const { data, error } = await client
    .from("connections")
    .update({ status: "revoked", responded_at: new Date().toISOString() })
    .eq("id", connectionId)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("This request could not be withdrawn right now.");
}

/**
 * The signed-in user's real connection relationships, for the Connections
 * management screen — everything `connections_party_read` RLS lets them
 * see (rows where they're requester or addressee), narrowed to the three
 * meaningful ongoing states this screen manages. `declined`/`revoked` rows
 * are excluded: they're terminal history, not something to act on here.
 *
 * There's deliberately no way to end an already-`connected` relationship:
 * no RLS policy allows updating an `accepted` connections row (see
 * ConnectButton.tsx's comment) — a "disconnect" control would either
 * silently fail or need a new migration, so this is a reported gap, not
 * built here.
 */
export type ConnectionRelationship = "incoming" | "outgoing" | "connected";

export interface ConnectionListItem {
  connectionId: string;
  relationship: ConnectionRelationship;
  otherUser: PublicAuthor;
  createdAt: string;
}

interface ConnectionRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  created_at: string;
  requester: PublicAuthor | null;
  addressee: PublicAuthor | null;
}

export async function fetchMyConnections(limit = 100): Promise<ConnectionListItem[]> {
  if (!isSupabaseConfigured) return [];
  const client = getSupabaseClient();
  const { data: userData } = await client.auth.getUser();
  const me = userData.user?.id;
  if (!me) return [];
  const { data, error } = await client
    .from("connections")
    .select(
      "id, requester_id, addressee_id, status, created_at, " +
        "requester:profiles!connections_requester_id_fkey(id, display_name, username, avatar_path, account_type), " +
        "addressee:profiles!connections_addressee_id_fkey(id, display_name, username, avatar_path, account_type)"
    )
    .or(`requester_id.eq.${me},addressee_id.eq.${me}`)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Your connections could not be loaded. Please try again.");
  const rows = (data ?? []) as unknown as ConnectionRow[];
  const items: ConnectionListItem[] = [];
  for (const row of rows) {
    const iAmRequester = row.requester_id === me;
    const other = iAmRequester ? row.addressee : row.requester;
    if (!other) continue; // Defensive: skip a row whose counterpart profile couldn't be read rather than render a broken entry.
    const relationship: ConnectionRelationship = row.status === "accepted" ? "connected" : iAmRequester ? "outgoing" : "incoming";
    items.push({ connectionId: row.id, relationship, otherUser: other, createdAt: row.created_at });
  }
  return items;
}
