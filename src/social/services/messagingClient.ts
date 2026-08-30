import { getSupabaseClient, isSupabaseConfigured } from "../../services/supabaseClient";
import { SocialUnavailableError } from "./socialClient";

/**
 * Phase 4 Slice B: service boundary for direct messaging only. Wraps
 * 20260824090000_direct_messaging_foundation.sql (conversations,
 * conversation_members, messages, create_direct_conversation()) — no schema
 * change, no route/component/Realtime work. See that migration for the
 * authoritative RLS/grant rules this file only ever calls through, never
 * duplicates client-side.
 */

// Mirrors public.conversation_kind exactly (Phase 4 Slice A). Only 'direct'
// is shipped — project/group kinds remain schema-only extension points
// (direct_member_low/high stay null for them) and must not be added here
// ahead of the migration that would back them.
export type ConversationKind = "direct";

/**
 * Exactly what conversation_members_member_read RLS lets a member read for
 * a conversation they belong to — real rows, not a fabricated participant
 * summary.
 */
export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  joined_at: string;
}

/**
 * Exactly what conversations_member_read RLS + the column-scoped grant let
 * a member read (id, kind, created_at only — direct_member_low/high are an
 * internal uniqueness-enforcement mechanism, never exposed to clients).
 * `members` is the real embedded conversation_members rows for this
 * conversation — genuinely available under existing grants, not invented.
 * Deliberately absent: any unread count, last-message preview, delivery
 * status, or participant profile data — the schema has no honest source for
 * any of those yet.
 */
export interface ConversationSummary {
  id: string;
  kind: ConversationKind;
  created_at: string;
  members: ConversationMember[];
}

/** Exactly what messages_member_read RLS lets a member read. */
export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface MessageCursor {
  createdAt: string;
  id: string;
}

export interface MessagePage {
  messages: DirectMessage[];
  /** Present only when the one-row overfetch confirms a next (older) page exists. */
  nextCursor: MessageCursor | null;
}

/**
 * Phase 4 Slice C.1: the one error boundary every backend (Postgres/
 * PostgREST/RPC) failure in this file passes through before reaching a
 * caller. `operation` identifies which messaging action failed — for
 * tests/logging only, never rendered — so callers/tests can assert on
 * *which* thing failed without the class needing to inspect, match, or
 * repeat any part of the underlying error's own text (that text is kept
 * only as `cause`, never copied into `message`). This is what makes it
 * structurally impossible for a raw SQLSTATE, schema/table/function/policy
 * name, or other backend-internal detail to reach the UI through this
 * type: `message` is always one of the four caller-supplied constants
 * below, authored by this file, never derived from `error.message`.
 */
export type MessagingOperation =
  | "create_conversation"
  | "list_conversations"
  | "fetch_messages"
  | "send_message"
  | "fetch_unread_counts"
  | "mark_read"
  | "fetch_conversation_counterpart"
  | "fetch_block_state"
  | "block_user"
  | "unblock_user";

export class MessagingOperationError extends Error {
  readonly operation: MessagingOperation;

  constructor(operation: MessagingOperation, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MessagingOperationError";
    this.operation = operation;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Rejects a malformed ID client-side, before it ever reaches a query or RPC
 * call. Accepts `unknown` (not just `string`) so this same guard can also
 * validate an untyped RPC response field (see fetchUnreadMessageCounts/
 * markConversationRead below) without a caller needing an unsafe cast first
 * — the runtime `typeof` check below is what actually does the rejecting
 * either way.
 */
function requireUuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error(`${label} must be a valid ID.`);
  }
  return value;
}

function requireClient() {
  if (!isSupabaseConfigured) throw new SocialUnavailableError();
  return getSupabaseClient();
}

/**
 * Shared auth gate for every read/write in this file: an unconfigured
 * client throws SocialUnavailableError (via requireClient), a genuine
 * `auth.getUser()` failure (network/token-verification problem, not "no
 * session") also throws SocialUnavailableError — with a safe, generic
 * session-verification message rather than telling the user to sign in,
 * since they may already be signed in and this isn't actually an auth-state
 * problem — and only a *successful* getUser() call that comes back with no
 * user throws `signInMessage`. All three cases happen before any
 * conversation/message query or RPC runs, which is what makes an
 * unauthenticated caller's "no messages" indistinguishable from a genuine
 * empty inbox impossible: the caller never reaches the query in the first
 * place, so a `[]`/empty page can only ever come from a real zero-row
 * response to a query that actually ran.
 */
async function requireAuthenticatedClient(signInMessage: string) {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) {
    throw new SocialUnavailableError("Your session could not be verified. Please try again.", { cause: userError });
  }
  if (!userData.user) throw new Error(signInMessage);
  return { client, userId: userData.user.id };
}

const CONVERSATIONS_MIN_LIMIT = 1;
const CONVERSATIONS_MAX_LIMIT = 50;
const CONVERSATIONS_DEFAULT_LIMIT = 20;

const MESSAGES_MIN_PAGE_SIZE = 1;
const MESSAGES_MAX_PAGE_SIZE = 50;
const MESSAGES_DEFAULT_PAGE_SIZE = 30;

/** Matches messages.body's `char_length(body) between 1 and 2000` check constraint. */
const MESSAGE_BODY_MAX_LENGTH = 2000;

function clampLimit(limit: number | undefined, fallback: number, max: number, min = 1): number {
  if (limit === undefined || !Number.isFinite(limit)) return fallback;
  return Math.min(Math.max(Math.trunc(limit), min), max);
}

// ==========================================================================
// Create or retrieve a direct conversation.
// ==========================================================================

const CREATE_CONVERSATION_ERROR = "This conversation is unavailable. Please try again.";

/**
 * Calls public.create_direct_conversation(other_user_id), the sole
 * client-reachable write path for conversations/conversation_members (see
 * the migration — clients have no direct insert grant on either table).
 * The RPC is authoritative for self-message, missing-user, duplicate-pair
 * idempotency, and bidirectional-block enforcement; this function performs
 * no business-rule duplication, only auth/shape validation before the call.
 *
 * Every RPC failure — self-message, missing user, a bidirectional block,
 * or a genuine network/database problem — collapses to the same
 * CREATE_CONVERSATION_ERROR text (Slice C.1; previously the RPC's own
 * exception message, e.g. "create_direct_conversation: this conversation is
 * not available", was propagated verbatim, which both leaked the internal
 * function name to the UI and, more importantly, let a caller distinguish
 * "blocked" from "any other reason" by reading the error text — see the
 * "do not infer or reveal whether another user blocked the caller"
 * requirement. Collapsing every cause to one identical message removes that
 * signal entirely, not just the raw text. The original error/data-shape
 * problem is preserved as `cause` for logging.
 */
export async function createOrGetDirectConversation(otherUserId: string): Promise<string> {
  const { client } = await requireAuthenticatedClient("Sign in to start a conversation.");
  requireUuid(otherUserId, "The other participant's user ID");
  const { data, error } = await client.rpc("create_direct_conversation", { other_user_id: otherUserId });
  if (error) throw new MessagingOperationError("create_conversation", CREATE_CONVERSATION_ERROR, { cause: error });
  if (typeof data !== "string" || !data) {
    throw new MessagingOperationError("create_conversation", CREATE_CONVERSATION_ERROR);
  }
  return data;
}

// ==========================================================================
// Fetch the authenticated user's conversations.
// ==========================================================================

/**
 * An unconfigured client (SocialUnavailableError) or a missing session
 * (explicit "sign in" error) both throw before any query runs — see
 * requireAuthenticatedClient. `[]` is returned only for a successful
 * authenticated query that genuinely found zero conversations; a real
 * query/network failure still throws.
 *
 * Ordered by (created_at desc, id desc) for a fully deterministic result
 * even when two conversations share a created_at timestamp — same
 * two-column tiebreak idiom fetchHomeFeed already uses in socialClient.ts.
 */
export async function fetchMyConversations(limit?: number): Promise<ConversationSummary[]> {
  const { client } = await requireAuthenticatedClient("Sign in to view your conversations.");
  const boundedLimit = clampLimit(limit, CONVERSATIONS_DEFAULT_LIMIT, CONVERSATIONS_MAX_LIMIT, CONVERSATIONS_MIN_LIMIT);
  const { data, error } = await client
    .from("conversations")
    .select("id, kind, created_at, members:conversation_members(conversation_id, user_id, joined_at)")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(boundedLimit);
  if (error) {
    throw new MessagingOperationError("list_conversations", "Your conversations could not be loaded. Please try again.", { cause: error });
  }
  return (data ?? []) as unknown as ConversationSummary[];
}

// ==========================================================================
// Fetch messages for one conversation.
// ==========================================================================

/**
 * Membership is enforced entirely by messages_member_read RLS — this
 * function issues one query with no client-side membership check of its
 * own, and never queries any table other than messages filtered to the
 * given conversation_id, so it is structurally impossible for it to return
 * another conversation's rows. A non-member querying a real conversation id
 * they don't belong to gets a legitimate-looking empty page from RLS (the
 * same documented behaviour as fetchPublicProfileById's "profile doesn't
 * exist" vs "exists but private" — RLS collapses both to nothing found);
 * that is correct, secure behaviour, not a bug to work around here. A
 * genuine query/network failure still throws — it is never reinterpreted
 * as "no messages". An unconfigured client or missing session throws
 * before the query even runs (see requireAuthenticatedClient) — an anon
 * caller never reaches messages_member_read at all, let alone gets a
 * fabricated empty page from it.
 *
 * Keyset-paginated on (created_at desc, id desc), identical mechanics to
 * fetchHomeFeed's HomeFeedCursor: both are real primary-key/timestamp
 * columns, so the cursor is stable across pages regardless of how many
 * messages share a created_at timestamp — no schema limitation blocks this,
 * and no new index is required (messages_conversation_created_idx already
 * covers the (conversation_id, created_at) scan).
 */
export async function fetchMessages(
  conversationId: string,
  cursor: MessageCursor | null = null,
  pageSize?: number
): Promise<MessagePage> {
  requireUuid(conversationId, "The conversation ID");
  const { client } = await requireAuthenticatedClient("Sign in to view your messages.");
  const boundedPageSize = clampLimit(pageSize, MESSAGES_DEFAULT_PAGE_SIZE, MESSAGES_MAX_PAGE_SIZE, MESSAGES_MIN_PAGE_SIZE);
  let query = client
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(boundedPageSize + 1);
  if (cursor) {
    // Same quoting rationale as fetchHomeFeed: PostgREST's or()/and()
    // grouped-filter grammar treats "." and ":" as reserved inside a value,
    // so the ISO timestamp must be quoted to avoid ambiguity; the uuid id
    // needs no quoting since hyphens aren't reserved there.
    const quotedCreatedAt = JSON.stringify(cursor.createdAt);
    query = query.or(`created_at.lt.${quotedCreatedAt},and(created_at.eq.${quotedCreatedAt},id.lt.${cursor.id})`);
  }
  const { data, error } = await query;
  if (error) {
    throw new MessagingOperationError("fetch_messages", "This conversation could not be loaded. Please try again.", { cause: error });
  }
  const rows = (data ?? []) as unknown as DirectMessage[];
  const hasMore = rows.length > boundedPageSize;
  const page = hasMore ? rows.slice(0, boundedPageSize) : rows;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? { createdAt: last.created_at, id: last.id } : null;
  return { messages: page, nextCursor };
}

// ==========================================================================
// Send a message.
// ==========================================================================

/**
 * sender_id is always the authenticated caller's own id (from
 * requireAuthenticatedClient) — there is no sender parameter for a caller
 * to spoof through. Insert failures (RLS membership/block rejection, or a
 * genuine network/query failure) are surfaced as one generic
 * MessagingOperationError message (Slice C.1) — same convention now shared
 * with createOrGetDirectConversation above, and consistent with the
 * existing genericized-error convention already used by
 * createPost/addComment/reactToPost in socialClient.ts. The returned
 * message is the server-confirmed row via `.select().single()` — real
 * id/created_at generated by Postgres, never fabricated or optimistic.
 */
// ==========================================================================
// Phase 4 Slice D: authenticated Realtime delivery — a typed subscription
// boundary only. This never hands a caller a raw payload row to trust or
// render directly; it only ever signals "something changed, re-fetch
// authoritatively" (see ThreadView, which always re-runs fetchMessages
// through the existing authenticated/RLS/paginated path on every signal).
// ==========================================================================

/** Safe, UI-facing connection state — never a raw Realtime/Postgres status string, error, or channel/socket detail. */
export type MessageRealtimeConnectionState = "connecting" | "connected" | "unavailable";

export interface MessageRealtimeHandlers {
  /**
   * Fired once per INSERT notification on this conversation, and once more
   * immediately after the channel reaches SUBSCRIBED (closing the race
   * between the initial fetch and subscription establishment). Always a
   * bare change signal — never the INSERT payload itself — so the only
   * thing a handler can do with it is re-run an authoritative fetch.
   */
  onSignal: () => void;
  onConnectionStateChange: (state: MessageRealtimeConnectionState) => void;
}

export interface MessageRealtimeSubscribeOptions {
  /**
   * When this is already aborted by the time the authenticated-session
   * check resolves, no channel is ever created. This is what keeps React
   * StrictMode's synchronous mount -> cleanup -> mount from ever leaving two
   * live channels for the same effect: the first (StrictMode-discarded) run
   * aborts before it reaches `client.channel(...)`, so only the surviving
   * mount's run ever calls it.
   */
  signal?: AbortSignal;
}

/**
 * Subscribes to INSERT events on public.messages for exactly one
 * conversation, using an exact server-side `conversation_id=eq.<uuid>`
 * filter (never a broad subscription filtered client-side — see the
 * migration this rides on, 20260828174637_enable_messages_realtime.sql,
 * which publishes only public.messages). Postgres Changes is RLS-gated per
 * subscriber by messages_member_read (unchanged by that migration), so a
 * non-member's equivalent call would simply never receive an event for this
 * conversation — the same "RLS collapses it to nothing" guarantee
 * fetchMessages already documents, not a client-side check duplicated here.
 *
 * Auth/shape validation mirrors fetchMessages exactly: a malformed
 * conversation id is rejected before any async work, an unconfigured client
 * or failed session-verification throws SocialUnavailableError, and a
 * verified-missing session throws the same sign-in message fetchMessages
 * uses for this conversation — in every one of those cases, no channel is
 * ever created.
 *
 * Returns an idempotent cleanup function that removes exactly the one
 * channel this call created; calling it more than once (or before a channel
 * was ever created, per the `signal` case above) is always a safe no-op.
 */
export async function subscribeToConversationMessages(
  conversationId: string,
  handlers: MessageRealtimeHandlers,
  options: MessageRealtimeSubscribeOptions = {}
): Promise<() => void> {
  requireUuid(conversationId, "The conversation ID");
  const { client } = await requireAuthenticatedClient("Sign in to view your messages.");
  if (options.signal?.aborted) return () => {};

  handlers.onConnectionStateChange("connecting");

  const channel = client
    .channel(`messages:conversation:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      () => handlers.onSignal()
    )
    .subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        handlers.onConnectionStateChange("connected");
        handlers.onSignal();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        handlers.onConnectionStateChange("unavailable");
      }
    });

  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    void client.removeChannel(channel).catch(() => {});
  };
}

export async function sendMessage(conversationId: string, body: string): Promise<DirectMessage> {
  const { client, userId } = await requireAuthenticatedClient("Sign in to send a message.");
  requireUuid(conversationId, "The conversation ID");
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Write something before sending.");
  if (trimmed.length > MESSAGE_BODY_MAX_LENGTH) {
    throw new Error(`Messages must be ${MESSAGE_BODY_MAX_LENGTH} characters or fewer.`);
  }
  const { data, error } = await client
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: userId, body: trimmed })
    .select("id, conversation_id, sender_id, body, created_at")
    .single();
  if (error) {
    throw new MessagingOperationError("send_message", "This message could not be sent. Please try again.", { cause: error });
  }
  return data as unknown as DirectMessage;
}

// ==========================================================================
// Phase 4 Slice F: read-state — wraps 20260829172436_message_read_state.sql
// (public.message_read_state, mark_conversation_read(), get_unread_message_
// counts()) exactly as merged. No schema/RLS/grant/RPC change of any kind
// happens here; this is a service-layer client only.
// ==========================================================================

/** Mirrors one row of public.mark_conversation_read()'s SETOF public.message_read_state result. */
export interface MessageReadCursor {
  conversationId: string;
  userId: string;
  lastReadMessageId: string;
  lastReadMessageCreatedAt: string;
  updatedAt: string;
}

/** One row of public.get_unread_message_counts()'s result, before being folded into the map callers actually use. */
export interface UnreadConversationCount {
  conversationId: string;
  unreadCount: number;
}

/**
 * What ConversationList actually consumes: an O(1)-lookup map keyed by
 * conversation id, built only after every row has been validated and no
 * conversation id repeats (see fetchUnreadMessageCounts) — so, unlike a raw
 * array, a caller holding this type can trust `.size` already equals the
 * number of distinct conversations the RPC reported, with no silent
 * dedup/overwrite having happened on the way here.
 */
export type UnreadCountsByConversation = Map<string, number>;

const UNREAD_COUNTS_ERROR = "Your unread counts could not be loaded. Please try again.";
const MARK_READ_ERROR = "Your read status could not be updated. Please try again.";

/**
 * public.get_unread_message_counts() returns `unread_count` as Postgres
 * `bigint`. PostgREST/Postgres's JSON serialization emits that as a bare
 * numeric literal (not a quoted string), which means by the time
 * supabase-js hands back `data`, the response body has already been
 * through the Fetch API's own `JSON.parse` — so a value exceeding
 * `Number.MAX_SAFE_INTEGER` has *already* silently lost precision at the
 * network layer, before any code in this file runs. There is no way to
 * recover exactness after that point, so this rejects outright rather than
 * accepting a value it cannot vouch for; it never rounds, truncates, or
 * otherwise coerces an out-of-range or malformed value into something
 * that merely looks like a valid count. A real per-conversation unread
 * count (bounded by how many messages actually exist in one conversation)
 * has no legitimate reason to approach that range — a value that does is
 * a contract violation to surface, not a capacity case to silently
 * accommodate. Also accepts a numeric string defensively, since some
 * PostgREST/driver configurations do quote `bigint` as a string
 * specifically to avoid this precision loss; either representation is
 * validated to the same standard before being trusted.
 */
function parseUnreadCount(raw: unknown): number {
  if (typeof raw === "number") {
    if (Number.isFinite(raw) && Number.isSafeInteger(raw) && raw >= 0) return raw;
    throw new Error("unread_count is not a finite, non-negative safe integer.");
  }
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    const parsed = Number(raw);
    // The round-trip check (`String(parsed) === raw`) guards against a
    // digit string so long that converting it to a JS number already
    // rounds it to a different value than what was received — silently
    // accepting that would be exactly the coercion this function must
    // never perform.
    if (Number.isSafeInteger(parsed) && String(parsed) === raw) return parsed;
  }
  throw new Error("unread_count is malformed.");
}

/**
 * Calls the merged, zero-argument public.get_unread_message_counts() RPC —
 * no arguments are ever sent, matching its signature exactly; there is no
 * parameter through which a caller could ask about anyone else's counts.
 * Every returned row is validated (a real UUID conversation id, a genuine
 * non-negative safe-integer count) before being trusted, and a repeated
 * conversation id anywhere in the result is treated as a malformed
 * response — the caller could otherwise silently see whichever of the two
 * counts happened to overwrite the other. An RPC failure or a
 * malformed/duplicate row throws the safe UNREAD_COUNTS_ERROR (original
 * cause preserved for logging); it is never reinterpreted as "zero unread"
 * — only a genuinely empty, successful result produces an empty map.
 */
export async function fetchUnreadMessageCounts(): Promise<UnreadCountsByConversation> {
  const { client } = await requireAuthenticatedClient("Sign in to view your unread messages.");
  const { data, error } = await client.rpc("get_unread_message_counts");
  if (error) {
    throw new MessagingOperationError("fetch_unread_counts", UNREAD_COUNTS_ERROR, { cause: error });
  }
  if (!Array.isArray(data)) {
    throw new MessagingOperationError("fetch_unread_counts", UNREAD_COUNTS_ERROR);
  }
  const result: UnreadCountsByConversation = new Map();
  for (const row of data) {
    if (!row || typeof row !== "object") {
      throw new MessagingOperationError("fetch_unread_counts", UNREAD_COUNTS_ERROR);
    }
    const record = row as Record<string, unknown>;
    let conversationId: string;
    let unreadCount: number;
    try {
      conversationId = requireUuid(record.conversation_id, "conversation_id");
      unreadCount = parseUnreadCount(record.unread_count);
    } catch (parseError) {
      throw new MessagingOperationError("fetch_unread_counts", UNREAD_COUNTS_ERROR, { cause: parseError });
    }
    if (result.has(conversationId)) {
      throw new MessagingOperationError("fetch_unread_counts", UNREAD_COUNTS_ERROR);
    }
    result.set(conversationId, unreadCount);
  }
  return result;
}

/**
 * Calls public.mark_conversation_read(p_conversation_id, p_message_id) —
 * the exact merged parameter names, and no others (there is no
 * caller-suppliable user id parameter to fabricate; the RPC binds to
 * auth.uid() internally). Both ids are validated before the authenticated-
 * client check even runs, matching fetchMessages'/sendMessage's existing
 * "validate shape before auth" ordering.
 *
 * The RPC's own contract is `returns setof public.message_read_state`, so
 * a well-formed call always returns exactly one row (the caller's own,
 * upserted) or throws — never zero, never more than one. This function
 * additionally proves the returned row is genuinely the row this call
 * asked for: its conversation_id and last_read_message_id must match the
 * request, and its user_id must match the session's own authenticated id
 * (never merely "some row", and never another user's). Any RPC failure —
 * membership/RLS rejection or a genuine network/database problem — and any
 * shape/identity mismatch in a "successful" response both collapse to the
 * same safe MARK_READ_ERROR; only a row that passes every one of these
 * checks is ever returned, so there is no optimistic/assumed-success path.
 */
export async function markConversationRead(conversationId: string, messageId: string): Promise<MessageReadCursor> {
  requireUuid(conversationId, "The conversation ID");
  requireUuid(messageId, "The message ID");
  const { client, userId } = await requireAuthenticatedClient("Sign in to update your read status.");
  const { data, error } = await client.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
    p_message_id: messageId,
  });
  if (error) {
    throw new MessagingOperationError("mark_read", MARK_READ_ERROR, { cause: error });
  }
  if (!Array.isArray(data) || data.length !== 1) {
    throw new MessagingOperationError("mark_read", MARK_READ_ERROR);
  }
  const row = data[0];
  if (!row || typeof row !== "object") {
    throw new MessagingOperationError("mark_read", MARK_READ_ERROR);
  }
  const record = row as Record<string, unknown>;
  let validConversationId: string;
  let validUserId: string;
  let validMessageId: string;
  try {
    validConversationId = requireUuid(record.conversation_id, "conversation_id");
    validUserId = requireUuid(record.user_id, "user_id");
    validMessageId = requireUuid(record.last_read_message_id, "last_read_message_id");
  } catch (parseError) {
    throw new MessagingOperationError("mark_read", MARK_READ_ERROR, { cause: parseError });
  }
  if (typeof record.last_read_message_created_at !== "string" || typeof record.updated_at !== "string") {
    throw new MessagingOperationError("mark_read", MARK_READ_ERROR);
  }
  if (validConversationId !== conversationId || validMessageId !== messageId || validUserId !== userId) {
    throw new MessagingOperationError("mark_read", MARK_READ_ERROR);
  }
  return {
    conversationId: validConversationId,
    userId: validUserId,
    lastReadMessageId: validMessageId,
    lastReadMessageCreatedAt: record.last_read_message_created_at,
    updatedAt: record.updated_at,
  };
}

// ==========================================================================
// Phase 4 Slice G: the other member of an existing direct conversation.
//
// Reads public.conversation_members — the exact same table/RLS
// (conversation_members_member_read: "a member may read every membership
// row of any conversation they themselves belong to", gated only by
// private.is_conversation_member(), 20260824090000_direct_messaging_foundation.sql)
// ConversationList's own enrichConversations() already relies on to resolve
// a counterpart's display name from fetchMyConversations()'s embedded
// `members`. This is not a new grant or a new database contract — only a
// query this file did not previously need.
//
// Safe to call from a genuinely fresh mount (no cached component state) even
// once the caller has blocked the other member: membership rows are never
// removed or hidden by a block — conversation_members_member_read,
// messages_member_read, and message_read_state's own owner-scoped read
// policy are all conditioned purely on conversation membership /
// ownership, never on private.has_blocked(). Only messages_member_insert
// (sending) is block-gated, via private.conversation_has_blocked_participant().
// This was re-verified live against a running local instance rather than
// assumed from the migration alone: with an existing conversation and an
// active block from A to B, a genuinely fresh full-page load of A's thread
// (fetch instrumented before the app's own data effects ran, so every
// request was captured) returned exactly this: conversation_members GET
// 200, messages GET 200 (prior history intact), conversations GET 200,
// blocks GET 200, rpc/get_unread_message_counts POST 200,
// rpc/mark_conversation_read POST 200, and the Realtime channel reached
// SUBSCRIBED ("Live updates on") — zero RLS rejections anywhere on the read
// side. The corresponding pgTAP suite (supabase/tests/database/) is
// unmodified and still exercises conversation_members/messages RLS
// directly against the schema.
// ==========================================================================

const FETCH_COUNTERPART_ERROR = "This conversation could not be loaded. Please try again.";

/**
 * Returns the other member's user id for a direct conversation the caller
 * already belongs to, or null if none can be determined (a caller that gets
 * null simply has nothing further to show — the same "unknown for an
 * honest reason" discipline used throughout this file).
 *
 * Deliberately does not `.limit(1)`: public.conversation_kind is currently
 * a single-value enum (`'direct'` only, 20260824090000_direct_messaging_foundation.sql)
 * so every real row today has exactly one other member — but that enum's
 * own comment explicitly anticipates a future non-direct kind, and
 * `.limit(1)` would silently hand back an arbitrary member of some future
 * multi-member conversation instead of surfacing that this function's
 * "exactly one counterpart" assumption no longer holds. Fetching every
 * matching row and rejecting more than one as a contract failure — the same
 * "structurally impossible today, never trusted blindly" idiom
 * unblockUser() already uses for blocks' own primary key — means a future
 * project/group conversation kind fails loudly here rather than this
 * function quietly mis-identifying the "other" participant.
 */
export async function fetchConversationCounterpart(conversationId: string): Promise<string | null> {
  requireUuid(conversationId, "The conversation ID");
  const { client, userId } = await requireAuthenticatedClient("Sign in to view your messages.");
  const { data, error } = await client.from("conversation_members").select("user_id").eq("conversation_id", conversationId).neq("user_id", userId);
  if (error) {
    throw new MessagingOperationError("fetch_conversation_counterpart", FETCH_COUNTERPART_ERROR, { cause: error });
  }
  if (!Array.isArray(data)) {
    throw new MessagingOperationError("fetch_conversation_counterpart", FETCH_COUNTERPART_ERROR);
  }
  // Zero rows is a genuine, honest outcome — no other member exists to
  // report (a caller's own-only degenerate conversation reduces to this
  // same case, since `.neq("user_id", userId)` above already excludes the
  // caller's own row from ever matching). More than one is not: today it is
  // structurally impossible (conversation_kind is 'direct'-only, see this
  // function's own comment), so it is a contract failure, never an
  // arbitrary pick.
  if (data.length === 0) return null;
  if (data.length > 1) {
    throw new MessagingOperationError("fetch_conversation_counterpart", FETCH_COUNTERPART_ERROR);
  }
  // A single row is expected to be well-formed; a malformed one (missing or
  // non-string user_id) is a contract failure to surface loudly, not a
  // silent null — null is reserved for the genuine "no counterpart" case
  // above, never conflated with a corrupted response.
  const row = data[0];
  const userIdValue = row && typeof row === "object" ? (row as Record<string, unknown>).user_id : undefined;
  try {
    return requireUuid(userIdValue, "user_id");
  } catch (parseError) {
    throw new MessagingOperationError("fetch_conversation_counterpart", FETCH_COUNTERPART_ERROR, { cause: parseError });
  }
}

// ==========================================================================
// Phase 4 Slice G: block/unblock — wraps public.blocks exactly as it already
// exists (20260819120000_social_core.sql). No schema/RLS/grant change of any
// kind: blocks_owner_read/blocks_owner_insert/blocks_owner_delete already
// restrict every operation on this table to `auth.uid() = blocker_id`, and
// the blocks_no_self CHECK constraint already rejects self-blocking at the
// database level regardless of anything this file does. Bidirectional
// messaging enforcement (private.has_blocked(), checked both directions by
// create_direct_conversation() and messages_member_insert) is completely
// untouched and unaffected — this file never reads, infers, or exposes the
// reverse direction (whether the target has blocked the caller) at all,
// because blocks_owner_read makes that row structurally unreadable to
// anyone but its own blocker; there is no query this file could even write
// that would surface it.
// ==========================================================================

export interface BlockConfirmation {
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

export interface UnblockResult {
  blockerId: string;
  blockedId: string;
  /**
   * True if a block row was actually deleted; false if the caller already
   * did not block the target — an explicit, confirmed idempotent no-op,
   * never a fabricated success. Both outcomes mean the same true
   * post-condition: the caller does not block the target.
   */
  removed: boolean;
}

const BLOCK_STATE_ERROR = "Your block status could not be checked. Please try again.";
const BLOCK_ERROR = "This person could not be blocked right now. Please try again.";
const UNBLOCK_ERROR = "This person could not be unblocked right now. Please try again.";

/**
 * Whether the authenticated caller has personally blocked targetUserId —
 * never whether targetUserId has blocked the caller. There is deliberately
 * no function anywhere in this file that answers "has either side
 * blocked?" — blocks_owner_read RLS already makes the reverse row
 * unreadable to this caller, so exposing that distinction is not a matter
 * of this function choosing not to ask; the database itself would return
 * nothing for that row regardless of how the query were written.
 *
 * `.maybeSingle()` relies on blocks' own primary key `(blocker_id,
 * blocked_id)` to guarantee at most one row could ever match both filters;
 * PostgREST/supabase-js surface a genuine multi-row result (which should be
 * structurally impossible here) as `error`, not as extra rows silently
 * ignored — so an unexpected shape fails safely rather than picking one row
 * arbitrarily.
 */
export async function fetchMyBlockState(targetUserId: string): Promise<boolean> {
  requireUuid(targetUserId, "The target user ID");
  const { client, userId } = await requireAuthenticatedClient("Sign in to view this profile's block status.");
  const { data, error } = await client
    .from("blocks")
    .select("blocker_id")
    .eq("blocker_id", userId)
    .eq("blocked_id", targetUserId)
    .maybeSingle();
  if (error) {
    throw new MessagingOperationError("fetch_block_state", BLOCK_STATE_ERROR, { cause: error });
  }
  return data !== null;
}

/**
 * Blocks targetUserId as the authenticated caller. Self-targeting is
 * rejected here before any write is attempted (the blocks_no_self CHECK
 * constraint would also reject it, but this avoids a round trip and a raw
 * constraint-violation error reaching a caller for a case this file can
 * already recognize locally).
 *
 * Uses a plain `.insert()`, not `.upsert()`: blocks' own grants
 * (`grant select, insert, delete on public.blocks to authenticated` —
 * 20260819120000_social_core.sql) deliberately omit UPDATE, and
 * `.upsert(..., { onConflict })` compiles to `INSERT ... ON CONFLICT DO
 * UPDATE`, which Postgres refuses to plan for a role with no UPDATE
 * privilege at all — confirmed against a live local instance, where that
 * statement fails with `permission denied for table blocks` before RLS is
 * even reached (`GRANT UPDATE` is exactly the fix the error's own HINT
 * suggests, but this file changes no grants). A caller who already blocks
 * this target instead gets a `23505` unique-violation from the plain
 * insert, which is then treated as the same idempotent success by
 * re-fetching the existing row with `fetchMyBlockState`'s own `.select()`
 * shape — read access blocks_owner_read already grants — rather than
 * fabricating a result locally. Only `blocker_id`/`blocked_id` are ever
 * written, so a repeat block never resets the row's original `created_at`;
 * idempotent and explicit, never a locally-fabricated "success" — the
 * returned row is always the database's own confirmation, and its
 * blocker_id/blocked_id are re-validated below to equal the exact request
 * before this ever returns.
 */
export async function blockUser(targetUserId: string): Promise<BlockConfirmation> {
  requireUuid(targetUserId, "The target user ID");
  const { client, userId } = await requireAuthenticatedClient("Sign in to block this person.");
  if (targetUserId === userId) {
    throw new MessagingOperationError("block_user", "You can't block yourself.");
  }
  const insertResult = await client
    .from("blocks")
    .insert({ blocker_id: userId, blocked_id: targetUserId })
    .select("blocker_id, blocked_id, created_at")
    .single();
  let data = insertResult.data;
  if (insertResult.error) {
    // 23505 = unique_violation on (blocker_id, blocked_id): the caller
    // already blocks this target. That is this operation's success
    // condition too, so fetch the existing row rather than treat it as a
    // failure — never assume the shape of the pre-existing row locally.
    if (insertResult.error.code !== "23505") {
      throw new MessagingOperationError("block_user", BLOCK_ERROR, { cause: insertResult.error });
    }
    const existing = await client
      .from("blocks")
      .select("blocker_id, blocked_id, created_at")
      .eq("blocker_id", userId)
      .eq("blocked_id", targetUserId)
      .single();
    if (existing.error) {
      throw new MessagingOperationError("block_user", BLOCK_ERROR, { cause: existing.error });
    }
    data = existing.data;
  }
  if (!data || typeof data !== "object") {
    throw new MessagingOperationError("block_user", BLOCK_ERROR);
  }
  const record = data as Record<string, unknown>;
  let blockerId: string;
  let blockedId: string;
  try {
    blockerId = requireUuid(record.blocker_id, "blocker_id");
    blockedId = requireUuid(record.blocked_id, "blocked_id");
  } catch (parseError) {
    throw new MessagingOperationError("block_user", BLOCK_ERROR, { cause: parseError });
  }
  if (typeof record.created_at !== "string") {
    throw new MessagingOperationError("block_user", BLOCK_ERROR);
  }
  if (blockerId !== userId || blockedId !== targetUserId) {
    throw new MessagingOperationError("block_user", BLOCK_ERROR);
  }
  return { blockerId, blockedId, createdAt: record.created_at };
}

/**
 * Unblocks targetUserId as the authenticated caller. Scoped to the caller's
 * own row by both an explicit `.eq("blocker_id", userId)` filter and
 * blocks_owner_delete RLS (redundant with each other by design, the same
 * "never rely on RLS alone to express intent" convention every other
 * mutation in this file already follows) — this can never delete another
 * user's block row, even in principle.
 *
 * Explicit idempotency: deleting a row that doesn't exist is not an error
 * (Postgres/PostgREST report 0 affected rows, not a failure) and is treated
 * as a genuine, confirmed "already not blocked" outcome (`removed: false`)
 * rather than being conflated with a real deletion (`removed: true`) or
 * with a query failure (which still throws below). More than one returned
 * row is structurally impossible given blocks' primary key, but is treated
 * as a contract failure rather than silently taking the first row, exactly
 * like every other multi-row-shaped result in this file.
 */
export async function unblockUser(targetUserId: string): Promise<UnblockResult> {
  requireUuid(targetUserId, "The target user ID");
  const { client, userId } = await requireAuthenticatedClient("Sign in to manage blocked users.");
  const { data, error } = await client
    .from("blocks")
    .delete()
    .eq("blocker_id", userId)
    .eq("blocked_id", targetUserId)
    .select("blocker_id, blocked_id");
  if (error) {
    throw new MessagingOperationError("unblock_user", UNBLOCK_ERROR, { cause: error });
  }
  if (!Array.isArray(data) || data.length > 1) {
    throw new MessagingOperationError("unblock_user", UNBLOCK_ERROR);
  }
  if (data.length === 0) {
    return { blockerId: userId, blockedId: targetUserId, removed: false };
  }
  const record = data[0] as Record<string, unknown>;
  let blockerId: string;
  let blockedId: string;
  try {
    blockerId = requireUuid(record.blocker_id, "blocker_id");
    blockedId = requireUuid(record.blocked_id, "blocked_id");
  } catch (parseError) {
    throw new MessagingOperationError("unblock_user", UNBLOCK_ERROR, { cause: parseError });
  }
  if (blockerId !== userId || blockedId !== targetUserId) {
    throw new MessagingOperationError("unblock_user", UNBLOCK_ERROR);
  }
  return { blockerId, blockedId, removed: true };
}
