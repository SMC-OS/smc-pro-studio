import { getSupabaseClient, isSupabaseConfigured } from "../../services/supabaseClient";

export interface PropertySummary {
  id: string;
  label: string;
  property_kind: "house" | "flat" | "commercial" | "other";
  address_line1: string;
  address_line2: string | null;
  city: string;
  postcode: string;
  country_code: string;
}

export interface QuoteRequestRecord {
  id: string;
  requester_id: string;
  assigned_professional_id: string | null;
  material_id: string | null;
  title: string;
  project_type: string;
  description: string | null;
  selections: Record<string, unknown>;
  status: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  property: PropertySummary | null;
  material: { id: string; name: string; slug: string } | null;
  requester: { id: string; display_name: string } | null;
  professional: { id: string; display_name: string } | null;
}

export interface QuoteRequestDocumentRecord {
  id: string;
  quote_request_id: string;
  uploaded_by: string;
  kind: "photo" | "plan" | "measurement" | "other";
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  signed_url: string | null;
}

export interface QuoteItemRecord {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
  net_total: number;
  tax_amount: number;
}

export interface QuoteRecord {
  id: string;
  quote_request_id: string | null;
  customer_id: string;
  issuer_id: string;
  status: string;
  currency: string;
  scope_summary: string | null;
  terms: string | null;
  subtotal: number;
  tax_total: number;
  total: number;
  valid_until: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  request: {
    id: string;
    title: string;
    project_type: string;
    description: string | null;
    property: PropertySummary | null;
    material: { id: string; name: string; slug: string } | null;
  } | null;
  customer: { id: string; display_name: string } | null;
  issuer: { id: string; display_name: string } | null;
  items: QuoteItemRecord[];
}

export interface CreatePropertyInput {
  label: string;
  propertyKind: PropertySummary["property_kind"];
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
}

export interface SubmitQuoteRequestInput {
  propertyId: string;
  professionalId: string;
  materialId?: string | null;
  title: string;
  projectType: string;
  description?: string;
  selections?: Record<string, unknown>;
}

export interface QuoteItemInput {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
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

function text(value: string, label: string, max: number): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  if (trimmed.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return trimmed;
}

export async function fetchOwnProperties(): Promise<PropertySummary[]> {
  const userId = await currentUserId();
  const { data, error } = await client()
    .from("properties")
    .select("id, label, property_kind, address_line1, address_line2, city, postcode, country_code")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Your properties could not be loaded. Please try again.", { cause: error });
  return (data ?? []) as PropertySummary[];
}

export async function createProperty(input: CreatePropertyInput): Promise<PropertySummary> {
  const userId = await currentUserId();
  const payload = {
    owner_id: userId,
    label: text(input.label, "Property name", 120),
    property_kind: input.propertyKind,
    address_line1: text(input.addressLine1, "Address", 200),
    address_line2: input.addressLine2?.trim() || null,
    city: text(input.city, "Town or city", 120),
    postcode: text(input.postcode, "Postcode", 20).toUpperCase(),
    country_code: "GB",
  };
  const { data, error } = await client()
    .from("properties")
    .insert(payload)
    .select("id, label, property_kind, address_line1, address_line2, city, postcode, country_code")
    .single();
  if (error || !data) throw new Error("The property could not be saved. Please try again.", { cause: error ?? undefined });
  return data as PropertySummary;
}

export async function submitQuoteRequest(input: SubmitQuoteRequestInput): Promise<string> {
  const userId = await currentUserId();
  if (!input.propertyId) throw new Error("Choose a property.");
  if (!input.professionalId) throw new Error("Choose a professional.");
  const payload = {
    requester_id: userId,
    property_id: input.propertyId,
    assigned_professional_id: input.professionalId,
    material_id: input.materialId || null,
    title: text(input.title, "Project title", 160),
    project_type: text(input.projectType, "Project type", 80),
    description: input.description?.trim() || null,
    selections: input.selections ?? {},
    status: "submitted",
    submitted_at: new Date().toISOString(),
  };
  if (payload.description && payload.description.length > 5000) throw new Error("Project details must be 5000 characters or fewer.");
  const { data, error } = await client().from("quote_requests").insert(payload).select("id").single();
  if (error || !data) throw new Error("Your quote request could not be sent. Please try again.", { cause: error ?? undefined });
  return (data as { id: string }).id;
}

export async function fetchQuoteRequest(requestId: string): Promise<QuoteRequestRecord | null> {
  await currentUserId();
  const { data, error } = await client()
    .from("quote_requests")
    .select(
      "id, requester_id, assigned_professional_id, material_id, title, project_type, description, selections, status, submitted_at, created_at, updated_at, " +
        "property:properties(id, label, property_kind, address_line1, address_line2, city, postcode, country_code), " +
        "material:materials(id, name, slug), " +
        "requester:profiles!quote_requests_requester_id_fkey(id, display_name), " +
        "professional:profiles!quote_requests_assigned_professional_id_fkey(id, display_name)",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw new Error("The quote request could not be loaded. Please try again.", { cause: error });
  return data as unknown as QuoteRequestRecord | null;
}

const QUOTE_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const MAX_QUOTE_FILE_BYTES = 25 * 1024 * 1024;

function safeFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return (cleaned || "file").slice(-120);
}

export async function fetchQuoteRequestDocuments(requestId: string): Promise<QuoteRequestDocumentRecord[]> {
  await currentUserId();
  const supabase = client();
  const { data, error } = await supabase
    .from("quote_request_documents")
    .select("id, quote_request_id, uploaded_by, kind, storage_path, file_name, mime_type, size_bytes, created_at")
    .eq("quote_request_id", requestId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Quote request files could not be loaded. Please try again.", { cause: error });

  return Promise.all(
    (data ?? []).map(async (row) => {
      const { data: signed, error: signedError } = await supabase.storage
        .from("private-project-media")
        .createSignedUrl(row.storage_path, 600);
      return {
        ...(row as Omit<QuoteRequestDocumentRecord, "signed_url">),
        signed_url: signedError ? null : signed?.signedUrl ?? null,
      };
    }),
  );
}

export async function uploadQuoteRequestDocument(
  requestId: string,
  file: File,
  kind: QuoteRequestDocumentRecord["kind"],
): Promise<void> {
  const userId = await currentUserId();
  if (!QUOTE_FILE_TYPES.has(file.type)) {
    throw new Error("Upload a JPG, PNG, WebP or PDF file.");
  }
  if (file.size <= 0 || file.size > MAX_QUOTE_FILE_BYTES) {
    throw new Error("Files must be larger than 0 bytes and no more than 25 MB.");
  }

  const supabase = client();
  const objectPath = `quote-requests/${requestId}/${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("private-project-media")
    .upload(objectPath, file, { cacheControl: "3600", contentType: file.type, upsert: false });
  if (uploadError) throw new Error("The file could not be uploaded. Please try again.", { cause: uploadError });

  const { error: rowError } = await supabase.from("quote_request_documents").insert({
    quote_request_id: requestId,
    uploaded_by: userId,
    kind,
    storage_path: objectPath,
    file_name: file.name.slice(0, 255),
    mime_type: file.type,
    size_bytes: file.size,
  });

  if (rowError) {
    await supabase.storage.from("private-project-media").remove([objectPath]);
    throw new Error("The uploaded file could not be attached to the quote request.", { cause: rowError });
  }
}

export async function deleteQuoteRequestDocument(document: QuoteRequestDocumentRecord): Promise<void> {
  const userId = await currentUserId();
  const supabase = client();

  const request = await fetchQuoteRequest(document.quote_request_id);
  if (!request || request.requester_id !== userId) {
    throw new Error("Only the customer who attached this file can remove it.");
  }
  if (request.status !== "draft" && request.status !== "submitted") {
    throw new Error("The file could not be removed because the quote request is already being used as project evidence.");
  }

  const { data: removed, error: storageError } = await supabase.storage
    .from("private-project-media")
    .remove([document.storage_path]);
  if (storageError || !removed?.some((row) => row.name === document.storage_path || document.storage_path.endsWith(row.name))) {
    throw new Error("The file could not be removed. Please try again.", { cause: storageError ?? undefined });
  }

  const { data: deletedRows, error: rowError } = await supabase
    .from("quote_request_documents")
    .delete()
    .eq("id", document.id)
    .eq("uploaded_by", userId)
    .select("id");
  if (rowError || deletedRows?.length !== 1) {
    throw new Error("The file record could not be removed. Please try again.", { cause: rowError ?? undefined });
  }
}

export async function createOrGetDraftQuote(requestId: string): Promise<string> {
  const userId = await currentUserId();
  const supabase = client();

  const existing = await supabase
    .from("quotes")
    .select("id")
    .eq("quote_request_id", requestId)
    .maybeSingle();
  if (existing.error) throw new Error("The quote could not be opened. Please try again.", { cause: existing.error });
  if (existing.data) return (existing.data as { id: string }).id;

  const request = await fetchQuoteRequest(requestId);
  if (!request) throw new Error("Quote request not found.");
  if (request.assigned_professional_id !== userId) throw new Error("This quote request is not assigned to your account.");

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      quote_request_id: request.id,
      customer_id: request.requester_id,
      issuer_id: userId,
      status: "draft",
      currency: "GBP",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("The draft quote could not be created. Please try again.", { cause: error ?? undefined });
  return (data as { id: string }).id;
}

export async function fetchQuote(quoteId: string): Promise<QuoteRecord | null> {
  await currentUserId();
  const supabase = client();
  const quoteResult = await supabase
    .from("quotes")
    .select(
      "id, quote_request_id, customer_id, issuer_id, status, currency, scope_summary, terms, subtotal, tax_total, total, valid_until, sent_at, viewed_at, accepted_at, rejected_at, rejection_reason, created_at, updated_at, " +
        "request:quote_requests(id, title, project_type, description, property:properties(id, label, property_kind, address_line1, address_line2, city, postcode, country_code), material:materials(id, name, slug)), " +
        "customer:profiles!quotes_customer_id_fkey(id, display_name), " +
        "issuer:profiles!quotes_issuer_id_fkey(id, display_name)",
    )
    .eq("id", quoteId)
    .maybeSingle();
  if (quoteResult.error) throw new Error("The quote could not be loaded. Please try again.", { cause: quoteResult.error });
  if (!quoteResult.data) return null;

  const itemsResult = await supabase
    .from("quote_items")
    .select("id, description, quantity, unit, unit_price, tax_rate, net_total, tax_amount")
    .eq("quote_id", quoteId)
    .order("created_at");
  if (itemsResult.error) throw new Error("Quote items could not be loaded. Please try again.", { cause: itemsResult.error });

  return {
    ...(quoteResult.data as unknown as Omit<QuoteRecord, "items">),
    items: (itemsResult.data ?? []) as QuoteItemRecord[],
  };
}

export async function updateDraftQuote(
  quoteId: string,
  input: { scopeSummary: string; terms: string },
): Promise<void> {
  await currentUserId();
  const scope = input.scopeSummary.trim();
  const terms = input.terms.trim();
  if (scope.length > 5000) throw new Error("Scope summary must be 5000 characters or fewer.");
  if (terms.length > 12000) throw new Error("Terms must be 12000 characters or fewer.");
  const { error } = await client()
    .from("quotes")
    .update({ scope_summary: scope || null, terms: terms || null })
    .eq("id", quoteId)
    .eq("status", "draft");
  if (error) throw new Error("The quote details could not be saved. Please try again.", { cause: error });
}

export async function addQuoteItem(quoteId: string, input: QuoteItemInput): Promise<void> {
  await currentUserId();
  const description = text(input.description, "Item description", 1000);
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new Error("Quantity must be greater than zero.");
  if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) throw new Error("Unit price cannot be negative.");
  if (!Number.isFinite(input.taxRate) || input.taxRate < 0 || input.taxRate > 1) throw new Error("VAT rate is invalid.");
  const { error } = await client().from("quote_items").insert({
    quote_id: quoteId,
    description,
    quantity: input.quantity,
    unit: text(input.unit, "Unit", 30),
    unit_price: input.unitPrice,
    tax_rate: input.taxRate,
  });
  if (error) throw new Error("The quote item could not be added. Please try again.", { cause: error });
}

export async function deleteQuoteItem(itemId: string): Promise<void> {
  await currentUserId();
  const { error } = await client().from("quote_items").delete().eq("id", itemId);
  if (error) throw new Error("The quote item could not be removed. Please try again.", { cause: error });
}

export async function sendQuote(quoteId: string, validUntil: string | null): Promise<void> {
  await currentUserId();
  const { error } = await client().rpc("send_quote", {
    p_quote_id: quoteId,
    p_valid_until: validUntil || null,
  });
  if (error) throw new Error("The quote could not be sent. Please check it and try again.", { cause: error });
}

export async function markQuoteViewed(quoteId: string): Promise<void> {
  await currentUserId();
  const { error } = await client().rpc("mark_quote_viewed", { p_quote_id: quoteId });
  if (error) throw new Error("The quote view could not be recorded. Please try again.", { cause: error });
}

export async function rejectQuote(quoteId: string, reason: string): Promise<void> {
  await currentUserId();
  const cleanReason = reason.trim();
  if (cleanReason.length > 2000) throw new Error("Decline reason must be 2000 characters or fewer.");
  const { error } = await client().rpc("reject_quote", {
    p_quote_id: quoteId,
    p_reason: cleanReason || null,
  });
  if (error) throw new Error("The quote could not be declined. Please try again.", { cause: error });
}

export async function acceptQuote(quoteId: string): Promise<string> {
  await currentUserId();
  const { data, error } = await client().rpc("accept_quote", { p_quote_id: quoteId });
  if (error || !data) throw new Error("The quote could not be approved. Please try again.", { cause: error ?? undefined });
  return String(data);
}

export async function fetchQuoteForRequest(requestId: string): Promise<QuoteRecord | null> {
  await currentUserId();
  const { data, error } = await client()
    .from("quotes")
    .select("id")
    .eq("quote_request_id", requestId)
    .maybeSingle();
  if (error) throw new Error("The quote could not be loaded. Please try again.", { cause: error });
  if (!data) return null;
  return fetchQuote((data as { id: string }).id);
}
