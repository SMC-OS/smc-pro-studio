import { useCallback, useEffect, useState } from "react";
import { Bell, Check, FolderKanban, ReceiptText } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, SectionHeading } from "../components/ui";
import { EmptyState, ErrorState, GuestNotice, LoadingState } from "../components/StateViews";
import { fetchNotifications, markNotificationRead, type LaunchNotification } from "../services/notificationClient";
import { useAuthSession } from "../services/useAuthSession";
import { describeError } from "../services/networkErrors";

function when(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function destination(notification: LaunchNotification): string | null {
  if (notification.project_id) return `/projects/${notification.project_id}`;
  if (notification.quote_id) return `/quotes/${notification.quote_id}`;
  return null;
}

export default function NotificationsRoute() {
  const auth = useAuthSession();
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ready"; rows: LaunchNotification[] }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    setState({ status: "loading" });
    fetchNotifications()
      .then((rows) => setState({ status: "ready", rows }))
      .catch((error: unknown) =>
        setState({ status: "error", message: describeError(error, "Notifications could not be loaded.").message }),
      );
  }, [auth.status]);

  useEffect(() => {
    if (auth.status === "authenticated") load();
  }, [auth.status, load]);

  async function markRead(notificationId: string) {
    try {
      setBusyId(notificationId);
      await markNotificationRead(notificationId);
      if (state.status === "ready") {
        setState({
          status: "ready",
          rows: state.rows.map((row) =>
            row.id === notificationId ? { ...row, read_at: row.read_at ?? new Date().toISOString() } : row,
          ),
        });
      }
    } catch (error: unknown) {
      setState({ status: "error", message: describeError(error, "The notification could not be updated.").message });
    } finally {
      setBusyId(null);
    }
  }

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") return <GuestNotice message="Sign in to view project notifications." />;
  if (state.status === "idle" || state.status === "loading") return <LoadingState label="Loading notifications" />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={load} />;

  const unread = state.rows.filter((row) => !row.read_at).length;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        eyebrow={unread > 0 ? `${unread} unread` : "Up to date"}
        title="Notifications"
        description="Only project actions that need your attention: quotes, appointments, variations and project updates."
      />

      {state.rows.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="Project actions and approvals will appear here when something needs your attention."
        />
      ) : (
        <ul className="grid gap-3">
          {state.rows.map((notification) => {
            const href = destination(notification);
            const icon = notification.project_id ? FolderKanban : notification.quote_id ? ReceiptText : Bell;
            const Icon = icon;

            return (
              <li key={notification.id}>
                <Card className={`p-4 ${notification.read_at ? "opacity-75" : "border-[var(--smc-border-strong)]"}`}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--smc-limestone)]">
                      <Icon className="h-4 w-4 text-[var(--smc-mineral-bronze)]" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[var(--smc-charcoal)]">{notification.title}</p>
                          {notification.body && (
                            <p className="mt-1 text-sm leading-6 text-[var(--smc-charcoal-soft)]">{notification.body}</p>
                          )}
                        </div>
                        <span className="text-xs text-[var(--smc-charcoal-faint)]">{when(notification.created_at)}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        {href && (
                          <Link
                            to={href}
                            onClick={() => {
                              if (!notification.read_at) void markRead(notification.id);
                            }}
                            className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[var(--smc-mineral-bronze)] hover:underline"
                          >
                            Open
                          </Link>
                        )}
                        {!notification.read_at && (
                          <button
                            type="button"
                            onClick={() => void markRead(notification.id)}
                            disabled={busyId === notification.id}
                            className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[var(--smc-charcoal)] disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
