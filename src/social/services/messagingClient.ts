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
export type MessagingOperation = "create_conversation" | "list_conversations" | "fetch_messages" | "send_message";

export class MessagingOperationError extends Error {
  readonly operation: MessagingOperation;

  constructor(operation: MessagingOperation, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MessagingOperationError";
    this.operation = operation;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rejects a malformed ID client-side, before it ever reaches a query or RPC call. */
function requireUuid(value: string, label: string): string {
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
