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
  created_by: string;
  appointment_type: string;
  status: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  notes: string | null;
  customer_note: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
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
  created_by: string;
  title: string;
  description: string | null;
  amount_delta: number;
  days_delta: number;
  status: string;
  sent_at: string | null;
  decided_at: string | null;
  customer_note: string | null;
  created_at: string;
}

export interface ProjectDocument {
  id: string;
  uploaded_by: string;
  kind: "photo" | "plan" | "quote" | "contract" | "invoice" | "receipt" | "warranty" | "certificate" | "measurement" | "other";
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  signed_url: string | null;
}

export interface ProjectMeasurement {
  id: string;
  created_by: string;
  source: "manual" | "assisted" | "professional";
  label: string;
  data: Record<string, unknown>;
  is_survey_grade: boolean;
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
  customer_id: string;
  lead_professional_id: string | null;
  current_user_role: string | null;
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
  measurements: ProjectMeasurement[];
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
      .select("id, project_id, created_by, appointment_type, status, starts_at, ends_at, location, notes, customer_note, confirmed_at, cancelled_at, project:projects(title)")
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
  const userId = await currentUserId();
  const supabase = client();

  const projectResult = await supabase
    .from("projects")
    .select(
      "id, customer_id, lead_professional_id, title, description, status, progress, start_date, target_completion_date, completed_at, updated_at, " +
        "property:properties(id, label, property_kind, address_line1, address_line2, city, postcode), " +
        "quote:quotes(id, status, total, currency, scope_summary, valid_until)"
    )
    .eq("id", projectId)
    .maybeSingle();

  if (projectResult.error) throw new Error("This project could not be loaded. Please try again.", { cause: projectResult.error });
  if (!projectResult.data) return null;

  const [membership, milestones, appointments, variations, documents, measurements, payments, warranties] = await Promise.all([
    supabase.from("project_members").select("role").eq("project_id", projectId).eq("user_id", userId).maybeSingle(),
    supabase.from("project_milestones").select("id, title, description, status, position, due_at, completed_at").eq("project_id", projectId).order("position"),
    supabase.from("appointments").select("id, project_id, created_by, appointment_type, status, starts_at, ends_at, location, notes, customer_note, confirmed_at, cancelled_at, project:projects(title)").eq("project_id", projectId).order("starts_at"),
    supabase.from("variations").select("id, created_by, title, description, amount_delta, days_delta, status, sent_at, decided_at, customer_note, created_at").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("project_documents").select("id, uploaded_by, kind, storage_path, file_name, mime_type, size_bytes, created_at").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("project_measurements").select("id, created_by, source, label, data, is_survey_grade, created_at").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("payments").select("id, kind, status, currency, amount, due_at, paid_at").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("warranties").select("id, warranty_type, provider_name, starts_on, ends_on, terms_summary").eq("project_id", projectId).order("starts_on", { ascending: false }),
  ]);

  const failed = [membership.error, milestones.error, appointments.error, variations.error, documents.error, measurements.error, payments.error, warranties.error].find(Boolean);
  if (failed) throw new Error("Some project details could not be loaded. Please try again.", { cause: failed });

  const signedDocuments = await Promise.all(
    (documents.data ?? []).map(async (row) => {
      const { data: signed, error: signedError } = await supabase.storage
        .from("private-project-media")
        .createSignedUrl(row.storage_path, 600);
      return {
        ...(row as Omit<ProjectDocument, "signed_url">),
        signed_url: signedError ? null : signed?.signedUrl ?? null,
      };
    }),
  );

  const base = projectResult.data as unknown as Omit<LaunchProjectDetail, "milestones" | "appointments" | "variations" | "documents" | "measurements" | "payments" | "warranties">;
  return {
    ...base,
    current_user_role: (membership.data as { role?: string } | null)?.role ?? null,
    milestones: (milestones.data ?? []) as ProjectMilestone[],
    appointments: (appointments.data ?? []) as unknown as LaunchAppointmentSummary[],
    variations: (variations.data ?? []) as ProjectVariation[],
    documents: signedDocuments,
    measurements: (measurements.data ?? []) as ProjectMeasurement[],
    payments: (payments.data ?? []) as ProjectPayment[],
    warranties: (warranties.data ?? []) as ProjectWarranty[],
  };
}

const PROJECT_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "application/pdf",
]);
const MAX_PROJECT_FILE_BYTES = 25 * 1024 * 1024;

function safeProjectFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return (cleaned || "file").slice(-120);
}

export async function scheduleProjectAppointment(
  projectId: string,
  input: {
    appointmentType: "consultation" | "site_survey" | "templating" | "delivery" | "installation" | "snagging" | "other";
    startsAt: string;
    endsAt: string;
    location: string;
    notes: string;
  },
): Promise<void> {
  await currentUserId();
  if (!input.startsAt || !input.endsAt) throw new Error("Choose a start and end time.");
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error("Appointment date or time is invalid.");
  }
  if (endsAt <= startsAt) throw new Error("Appointment end time must be after the start time.");
  if (input.location.trim().length > 500) throw new Error("Location must be 500 characters or fewer.");
  if (input.notes.trim().length > 3000) throw new Error("Appointment notes must be 3000 characters or fewer.");

  const { error } = await client().rpc("schedule_project_appointment", {
    p_project_id: projectId,
    p_appointment_type: input.appointmentType,
    p_starts_at: startsAt.toISOString(),
    p_ends_at: endsAt.toISOString(),
    p_location: input.location.trim() || null,
    p_notes: input.notes.trim() || null,
  });
  if (error) throw new Error("The appointment could not be proposed. Please try again.", { cause: error });
}

export async function respondProjectAppointment(
  appointmentId: string,
  confirm: boolean,
  note: string,
): Promise<void> {
  await currentUserId();
  const cleanNote = note.trim();
  if (cleanNote.length > 2000) throw new Error("Appointment note must be 2000 characters or fewer.");
  const { error } = await client().rpc("respond_project_appointment", {
    p_appointment_id: appointmentId,
    p_confirm: confirm,
    p_note: cleanNote || null,
  });
  if (error) throw new Error(
    confirm ? "The appointment could not be confirmed. Please try again." : "The appointment could not be declined. Please try again.",
    { cause: error },
  );
}

export async function completeProjectAppointment(appointmentId: string): Promise<void> {
  await currentUserId();
  const { error } = await client().rpc("complete_project_appointment", {
    p_appointment_id: appointmentId,
  });
  if (error) throw new Error("The appointment could not be completed. Please try again.", { cause: error });
}

export async function cancelProjectAppointment(
  appointmentId: string,
  note: string,
): Promise<void> {
  await currentUserId();
  const cleanNote = note.trim();
  if (cleanNote.length > 2000) throw new Error("Cancellation note must be 2000 characters or fewer.");
  const { error } = await client().rpc("cancel_project_appointment", {
    p_appointment_id: appointmentId,
    p_note: cleanNote || null,
  });
  if (error) throw new Error("The appointment could not be cancelled. Please try again.", { cause: error });
}

export async function createDraftVariation(
  projectId: string,
  input: { title: string; description: string; amountDelta: number; daysDelta: number },
): Promise<string> {
  const userId = await currentUserId();
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title) throw new Error("Variation title is required.");
  if (title.length > 180) throw new Error("Variation title must be 180 characters or fewer.");
  if (description.length > 5000) throw new Error("Variation description must be 5000 characters or fewer.");
  if (!Number.isFinite(input.amountDelta)) throw new Error("Variation amount is invalid.");
  if (!Number.isInteger(input.daysDelta)) throw new Error("Schedule impact must be a whole number of days.");

  const { data, error } = await client()
    .from("variations")
    .insert({
      project_id: projectId,
      created_by: userId,
      title,
      description: description || null,
      amount_delta: input.amountDelta,
      days_delta: input.daysDelta,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("The variation could not be created. Please try again.", { cause: error ?? undefined });
  return String((data as { id: string }).id);
}

export async function deleteDraftVariation(variationId: string): Promise<void> {
  await currentUserId();
  const { error } = await client().from("variations").delete().eq("id", variationId).eq("status", "draft");
  if (error) throw new Error("The variation could not be removed. Please try again.", { cause: error });
}

export async function sendVariation(variationId: string): Promise<void> {
  await currentUserId();
  const { error } = await client().rpc("send_variation", { p_variation_id: variationId });
  if (error) throw new Error("The variation could not be sent for approval. Please try again.", { cause: error });
}

export async function decideVariation(
  variationId: string,
  accept: boolean,
  note: string,
): Promise<void> {
  await currentUserId();
  const cleanNote = note.trim();
  if (cleanNote.length > 2000) throw new Error("Variation note must be 2000 characters or fewer.");
  const { error } = await client().rpc("decide_variation", {
    p_variation_id: variationId,
    p_accept: accept,
    p_note: cleanNote || null,
  });
  if (error) throw new Error(
    accept ? "The variation could not be approved. Please try again." : "The variation could not be declined. Please try again.",
    { cause: error },
  );
}

export async function uploadProjectDocument(
  projectId: string,
  file: File,
  kind: ProjectDocument["kind"],
): Promise<void> {
  const userId = await currentUserId();
  if (!PROJECT_FILE_TYPES.has(file.type)) {
    throw new Error("Upload a JPG, PNG, WebP, MP4 or PDF file.");
  }
  if (file.size <= 0 || file.size > MAX_PROJECT_FILE_BYTES) {
    throw new Error("Files must be larger than 0 bytes and no more than 25 MB.");
  }

  const supabase = client();
  const objectPath = `${projectId}/${userId}/${crypto.randomUUID()}-${safeProjectFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("private-project-media")
    .upload(objectPath, file, { cacheControl: "3600", contentType: file.type, upsert: false });
  if (uploadError) throw new Error("The project file could not be uploaded. Please try again.", { cause: uploadError });

  const { error: rowError } = await supabase.from("project_documents").insert({
    project_id: projectId,
    uploaded_by: userId,
    kind,
    storage_path: objectPath,
    file_name: file.name.slice(0, 255),
    mime_type: file.type,
    size_bytes: file.size,
  });

  if (rowError) {
    await supabase.storage.from("private-project-media").remove([objectPath]);
    throw new Error("The uploaded file could not be attached to the project.", { cause: rowError });
  }
}

export async function deleteProjectDocument(document: ProjectDocument): Promise<void> {
  const userId = await currentUserId();
  if (document.uploaded_by !== userId) {
    throw new Error("Only the person who uploaded this file can remove it from the app.");
  }

  const supabase = client();
  const { data: removed, error: storageError } = await supabase.storage
    .from("private-project-media")
    .remove([document.storage_path]);
  if (storageError || !removed?.some((row) => row.name === document.storage_path || document.storage_path.endsWith(row.name))) {
    throw new Error("The project file could not be removed. Please try again.", { cause: storageError ?? undefined });
  }

  const { data: deletedRows, error: rowError } = await supabase
    .from("project_documents")
    .delete()
    .eq("id", document.id)
    .eq("uploaded_by", userId)
    .select("id");
  if (rowError || deletedRows?.length !== 1) {
    throw new Error("The project file record could not be removed. Please try again.", { cause: rowError ?? undefined });
  }
}

export async function addApproximateProjectMeasurement(
  projectId: string,
  input: { label: string; details: string; source?: "manual" | "assisted" },
): Promise<void> {
  const userId = await currentUserId();
  const label = input.label.trim();
  const details = input.details.trim();
  if (!label) throw new Error("Measurement name is required.");
  if (label.length > 160) throw new Error("Measurement name must be 160 characters or fewer.");
  if (!details) throw new Error("Add the approximate dimensions or measurement notes.");
  if (details.length > 4000) throw new Error("Measurement details must be 4000 characters or fewer.");

  const { error } = await client().from("project_measurements").insert({
    project_id: projectId,
    created_by: userId,
    source: input.source ?? "manual",
    label,
    data: { details },
    is_survey_grade: false,
  });
  if (error) throw new Error("The measurement could not be saved. Please try again.", { cause: error });
}

export async function deleteProjectMeasurement(measurementId: string): Promise<void> {
  await currentUserId();
  const { error } = await client().from("project_measurements").delete().eq("id", measurementId);
  if (error) throw new Error("The measurement could not be removed. Please try again.", { cause: error });
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
