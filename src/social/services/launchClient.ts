import { getSupabaseClient, isSupabaseConfigured } from "../../services/supabaseClient";

export type LaunchAccountType = "customer" | "professional";
export type ProjectStatus = "planning" | "survey" | "templating" | "fabrication" | "installation" | "snagging" | "complete" | "cancelled";

export interface LaunchProjectSummary {
  id: string;
  title: string;
  status: ProjectStatus;
  progress: number;
  target_completion_date: string | null;
  updated_at: string;
  property: { label: string; city: string } | null;
}

export interface LaunchQuoteSummary {
  id: string;
  status: string;
  total: number;
  currency: string;
  valid_until: string | null;
  created_at: string;
}

export interface LaunchQuoteRequestSummary {
  id: string;
  title: string;
  project_type: string;
  status: string;
  updated_at: string;
}

export interface LaunchAppointmentSummary {
  id: string;
  project_id: string;
  appointment_type: string;
  status: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  project: { title: string } | null;
}

export interface LaunchDashboard {
  profile: { display_name: string; account_type: LaunchAccountType };
  projects: LaunchProjectSummary[];
  quoteRequests: LaunchQuoteRequestSummary[];
  quotes: LaunchQuoteSummary[];
  appointments: LaunchAppointmentSummary[];
  unreadNotifications: number;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  description: string | null;
  status: string;
  position: number;
  due_at: string | null;
  completed_at: string | null;
}

export interface ProjectVariation {
  id: string;
  title: string;
  description: string | null;
  amount_delta: number;
  days_delta: number;
  status: string;
  created_at: string;
}

export interface ProjectDocument {
  id: string;
  kind: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface ProjectPayment {
  id: string;
  kind: string;
  status: string;
  currency: string;
  amount: number;
  due_at: string | null;
  paid_at: string | null;
}

export interface ProjectWarranty {
  id: string;
  warranty_type: string;
  provider_name: string | null;
  starts_on: string;
  ends_on: string | null;
  terms_summary: string | null;
}

export interface LaunchProjectDetail extends LaunchProjectSummary {
  description: string | null;
  start_date: string | null;
  completed_at: string | null;
  property: {
    id: string;
    label: string;
    property_kind: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    postcode: string;
  } | null;
  quote: {
    id: string;
    status: string;
    total: number;
    currency: string;
    scope_summary: string | null;
    valid_until: string | null;
  } | null;
  milestones: ProjectMilestone[];
  appointments: LaunchAppointmentSummary[];
  variations: ProjectVariation[];
  documents: ProjectDocument[];
  payments: ProjectPayment[];
  warranties: ProjectWarranty[];
}

export interface StudioDesignSummary {
  id: string;
  room_type: string;
  status: string;
  result_image_path: string | null;
  created_at: string;
  updated_at: string;
  material: { name: string; slug: string } | null;
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

export async function fetchLaunchDashboard(): Promise<LaunchDashboard> {
  const userId = await currentUserId();
  const supabase = client();

  const [profileResult, projectsResult, requestsResult, quotesResult, appointmentsResult, notificationsResult] = await Promise.all([
    supabase.from("profiles").select("display_name, account_type").eq("id", userId).single(),
    supabase
      .from("projects")
      .select("id, title, status, progress, target_completion_date, updated_at, property:properties(label, city)")
      .order("updated_at", { ascending: false })
      .limit(4),
    supabase
      .from("quote_requests")
      .select("id, title, project_type, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(4),
    supabase
      .from("quotes")
      .select("id, status, total, currency, valid_until, created_at")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("appointments")
      .select("id, project_id, appointment_type, status, starts_at, ends_at, location, project:projects(title)")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(4),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);

  const failed = [profileResult.error, projectsResult.error, requestsResult.error, quotesResult.error, appointmentsResult.error, notificationsResult.error].find(Boolean);
  if (failed) throw new Error("Your dashboard could not be loaded. Please try again.", { cause: failed });

  return {
    profile: profileResult.data as LaunchDashboard["profile"],
    projects: (projectsResult.data ?? []) as unknown as LaunchProjectSummary[],
    quoteRequests: (requestsResult.data ?? []) as LaunchQuoteRequestSummary[],
    quotes: (quotesResult.data ?? []) as LaunchQuoteSummary[],
    appointments: (appointmentsResult.data ?? []) as unknown as LaunchAppointmentSummary[],
    unreadNotifications: notificationsResult.count ?? 0,
  };
}

export async function fetchLaunchProjects(): Promise<LaunchProjectSummary[]> {
  await currentUserId();
  const { data, error } = await client()
    .from("projects")
    .select("id, title, status, progress, target_completion_date, updated_at, property:properties(label, city)")
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Your projects could not be loaded. Please try again.", { cause: error });
  return (data ?? []) as unknown as LaunchProjectSummary[];
}

export async function fetchLaunchProject(projectId: string): Promise<LaunchProjectDetail | null> {
  await currentUserId();
  const supabase = client();

  const projectResult = await supabase
    .from("projects")
    .select(
      "id, title, description, status, progress, start_date, target_completion_date, completed_at, updated_at, " +
        "property:properties(id, label, property_kind, address_line1, address_line2, city, postcode), " +
        "quote:quotes(id, status, total, currency, scope_summary, valid_until)"
    )
    .eq("id", projectId)
    .maybeSingle();

  if (projectResult.error) throw new Error("This project could not be loaded. Please try again.", { cause: projectResult.error });
  if (!projectResult.data) return null;

  const [milestones, appointments, variations, documents, payments, warranties] = await Promise.all([
    supabase.from("project_milestones").select("id, title, description, status, position, due_at, completed_at").eq("project_id", projectId).order("position"),
    supabase.from("appointments").select("id, project_id, appointment_type, status, starts_at, ends_at, location, project:projects(title)").eq("project_id", projectId).order("starts_at"),
    supabase.from("variations").select("id, title, description, amount_delta, days_delta, status, created_at").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("project_documents").select("id, kind, file_name, mime_type, size_bytes, created_at").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("payments").select("id, kind, status, currency, amount, due_at, paid_at").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("warranties").select("id, warranty_type, provider_name, starts_on, ends_on, terms_summary").eq("project_id", projectId).order("starts_on", { ascending: false }),
  ]);

  const failed = [milestones.error, appointments.error, variations.error, documents.error, payments.error, warranties.error].find(Boolean);
  if (failed) throw new Error("Some project details could not be loaded. Please try again.", { cause: failed });

  const base = projectResult.data as unknown as Omit<LaunchProjectDetail, "milestones" | "appointments" | "variations" | "documents" | "payments" | "warranties">;
  return {
    ...base,
    milestones: (milestones.data ?? []) as ProjectMilestone[],
    appointments: (appointments.data ?? []) as unknown as LaunchAppointmentSummary[],
    variations: (variations.data ?? []) as ProjectVariation[],
    documents: (documents.data ?? []) as ProjectDocument[],
    payments: (payments.data ?? []) as ProjectPayment[],
    warranties: (warranties.data ?? []) as ProjectWarranty[],
  };
}

export async function fetchStudioDesigns(): Promise<StudioDesignSummary[]> {
  const userId = await currentUserId();
  const { data, error } = await client()
    .from("studio_designs")
    .select("id, room_type, status, result_image_path, created_at, updated_at, material:materials(name, slug)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(12);
  if (error) throw new Error("Your Studio designs could not be loaded. Please try again.", { cause: error });
  return (data ?? []) as unknown as StudioDesignSummary[];
}
