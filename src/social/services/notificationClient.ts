import { getSupabaseClient, isSupabaseConfigured } from "../../services/supabaseClient";

export interface LaunchNotification {
  id: string;
  project_id: string | null;
  quote_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

function client() {
  if (!isSupabaseConfigured) throw new Error("SMC Pro Studio is not connected to its workspace.");
  return getSupabaseClient();
}

async function currentUserId(): Promise<string> {
  const { data, error } = await client().auth.getUser();
  if (error) throw new Error("Your session could not be verified. Please try again.", { cause: error });
  if (!data.user) throw new Error("Sign in to continue.");
  return data.user.id;
}

export async function fetchNotifications(): Promise<LaunchNotification[]> {
  const userId = await currentUserId();
  const { data, error } = await client()
    .from("notifications")
    .select("id, project_id, quote_id, kind, title, body, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Notifications could not be loaded. Please try again.", { cause: error });
  return (data ?? []) as LaunchNotification[];
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const userId = await currentUserId();
  const { count, error } = await client()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await currentUserId();
  const { error } = await client().rpc("mark_notification_read", {
    p_notification_id: notificationId,
  });
  if (error) throw new Error("The notification could not be marked as read.", { cause: error });
}
