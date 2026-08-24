import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, Clock } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { Avatar, Button, Card, SectionHeading } from "../components/ui";
import {
  fetchMyConnections,
  respondToConnection,
  revokeConnectionRequest,
  type ConnectionListItem,
} from "../services/socialClient";
import { useAuthSession } from "../services/useAuthSession";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: ConnectionListItem[] };

const LINK_BUTTON_CLASS =
  "inline-flex min-h-[44px] items-center justify-center rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 text-xs font-semibold uppercase tracking-wide text-[var(--smc-charcoal)] outline-none hover:bg-[var(--smc-limestone)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]";

/**
 * Connections — managing real professional relationships (see DESIGN.md's
 * 2026-08-19 pivot, tasks/todo.md priority item 3). Reached from the
 * signed-in user's own profile; deliberately not a primary nav tab.
 *
 * Three real, RLS-scoped states: requests received, requests sent, and
 * accepted connections — see fetchMyConnections()'s doc comment for why
 * there's no "disconnect" action for an accepted connection (not an
 * oversight: the schema/RLS genuinely doesn't support it yet).
 */
export default function ConnectionsRoute() {
  const auth = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    setState({ status: "loading" });
    fetchMyConnections()
      .then((items) => setState({ status: "ready", items }))
      .catch((error: unknown) =>
        setState({ status: "error", message: error instanceof Error ? error.message : "Your connections could not be loaded." })
      );
  }, [auth.status]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAccept(item: ConnectionListItem) {
    if (busyId) return;
    setBusyId(item.connectionId);
    setRowError((prev) => ({ ...prev, [item.connectionId]: "" }));
    try {
      await respondToConnection(item.connectionId, true);
      setState((prev) =>
        prev.status === "ready"
          ? { status: "ready", items: prev.items.map((i) => (i.connectionId === item.connectionId ? { ...i, relationship: "connected" } : i)) }
          : prev
      );
    } catch (err) {
      setRowError((prev) => ({ ...prev, [item.connectionId]: err instanceof Error ? err.message : "This request could not be updated right now." }));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(item: ConnectionListItem) {
    if (busyId) return;
    setBusyId(item.connectionId);
    setRowError((prev) => ({ ...prev, [item.connectionId]: "" }));
    try {
      await respondToConnection(item.connectionId, false);
      setState((prev) => (prev.status === "ready" ? { status: "ready", items: prev.items.filter((i) => i.connectionId !== item.connectionId) } : prev));
    } catch (err) {
      setRowError((prev) => ({ ...prev, [item.connectionId]: err instanceof Error ? err.message : "This request could not be updated right now." }));
    } finally {
      setBusyId(null);
    }
  }

  async function handleWithdraw(item: ConnectionListItem) {
    if (busyId) return;
    setBusyId(item.connectionId);
    setRowError((prev) => ({ ...prev, [item.connectionId]: "" }));
    try {
      await revokeConnectionRequest(item.connectionId);
      setState((prev) => (prev.status === "ready" ? { status: "ready", items: prev.items.filter((i) => i.connectionId !== item.connectionId) } : prev));
    } catch (err) {
      setRowError((prev) => ({ ...prev, [item.connectionId]: err instanceof Error ? err.message : "This request could not be withdrawn right now." }));
    } finally {
      setBusyId(null);
    }
  }

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") {
    return (
      <EmptyState
        title="Sign in to view your connections"
        description="Requests you've sent and received, and the professionals you're connected to, live here once you're signed in."
        action={
          <Link to="/auth" className={LINK_BUTTON_CLASS}>
            Sign in
          </Link>
        }
      />
    );
  }
  if (state.status === "loading") return <LoadingState label="Loading your connections" />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={load} />;

  const incoming = state.items.filter((i) => i.relationship === "incoming");
  const outgoing = state.items.filter((i) => i.relationship === "outgoing");
  const connected = state.items.filter((i) => i.relationship === "connected");

  function Row({ item, children }: { item: ConnectionListItem; children: ReactNode }) {
    const name = item.otherUser.display_name;
    return (
      <Card as="li" className="p-4">
        <div className="flex items-start gap-3">
          <Link
            to={`/profile/${item.otherUser.id}`}
            className="flex min-w-0 flex-1 items-start gap-3 rounded-[var(--smc-radius-card)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]"
          >
            <Avatar name={name} size={44} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--smc-charcoal)]">{name}</p>
              {item.otherUser.username && <p className="text-xs text-[var(--smc-charcoal-faint)]">@{item.otherUser.username}</p>}
            </div>
          </Link>
          <div className="shrink-0">{children}</div>
        </div>
        {rowError[item.connectionId] && (
          <p role="alert" className="mt-2 text-xs font-medium text-[var(--smc-mineral-clay)]">
            {rowError[item.connectionId]}
          </p>
        )}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        eyebrow="Network"
        title="Connections"
        description="The real professional relationships you've built on SMC Pro — nothing simulated."
      />

      {state.items.length === 0 && (
        <EmptyState
          title="No connections yet"
          description="Visit Network to find professionals and send a connection request."
          action={
            <Link to="/network" className={LINK_BUTTON_CLASS}>
              Go to Network
            </Link>
          }
        />
      )}

      {incoming.length > 0 && (
        <section aria-labelledby="connections-incoming">
          <h2 id="connections-incoming" className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--smc-mineral-bronze)]">
            Requests received
          </h2>
          <ul className="flex flex-col gap-3">
            {incoming.map((item) => (
              <Row key={item.connectionId} item={item}>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleAccept(item)}
                    disabled={busyId === item.connectionId}
                    aria-label={`Accept connection request from ${item.otherUser.display_name}`}
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void handleDecline(item)}
                    disabled={busyId === item.connectionId}
                    aria-label={`Decline connection request from ${item.otherUser.display_name}`}
                  >
                    Decline
                  </Button>
                </div>
              </Row>
            ))}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section aria-labelledby="connections-outgoing">
          <h2 id="connections-outgoing" className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--smc-mineral-bronze)]">
            Requests sent
          </h2>
          <ul className="flex flex-col gap-3">
            {outgoing.map((item) => (
              <Row key={item.connectionId} item={item}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void handleWithdraw(item)}
                  disabled={busyId === item.connectionId}
                  aria-label={`Withdraw connection request to ${item.otherUser.display_name}`}
                >
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  Requested
                </Button>
              </Row>
            ))}
          </ul>
        </section>
      )}

      {connected.length > 0 && (
        <section aria-labelledby="connections-connected">
          <h2 id="connections-connected" className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--smc-mineral-bronze)]">
            Connected
          </h2>
          <ul className="flex flex-col gap-3">
            {connected.map((item) => (
              <Row key={item.connectionId} item={item}>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--smc-charcoal-soft)]">
                  <Check className="h-4 w-4" aria-hidden="true" style={{ color: "var(--smc-mineral-bronze)" }} />
                  Connected
                </span>
              </Row>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
