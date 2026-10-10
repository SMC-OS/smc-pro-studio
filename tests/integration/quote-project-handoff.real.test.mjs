import { test, mock, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL_ = process.env.SMC_REAL_SUPABASE_URL;
const ANON = process.env.SMC_REAL_SUPABASE_ANON_KEY;
const SERVICE = process.env.SMC_REAL_SUPABASE_SERVICE_KEY;
const configured = Boolean(URL_ && ANON && SERVICE);

if (configured && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(URL_)) {
  throw new Error("quote-project-handoff.real.test.mjs refuses to run against a non-local Supabase URL.");
}

const newClient = () => createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const anonClient = configured ? newClient() : null;
let activeClient = anonClient;

mock.module(new URL("../../src/services/supabaseClient.ts", import.meta.url).href, {
  exports: {
    isSupabaseConfigured: configured,
    getSupabaseClient: () => activeClient,
    getAuthAccessToken: async () => null,
    getAuthRedirectUrl: () => "http://127.0.0.1:5173/auth/callback",
    SupabaseConfigurationError: Error,
  },
});

const quote = await import(new URL("../../src/social/services/quoteClient.ts", import.meta.url).href);
const { saveOwnProfile } = await import(new URL("../../src/social/services/profileClient.ts", import.meta.url).href);

const T = `qh${Date.now().toString(36)}`;
const PASSWORD = "Integration-Test-Pass-1";
const ids = [];
const service = configured ? createClient(URL_, SERVICE, { auth: { persistSession: false } }) : null;

async function signUp(label, metadata) {
  const c = newClient();
  const email = `${T}-${label}@example.test`;
  const { data, error } = await c.auth.signUp({ email, password: PASSWORD, options: { data: metadata } });
  if (error) throw error;
  ids.push(data.user.id);
  if (!data.session) {
    const confirm = await service.auth.admin.updateUserById(data.user.id, { email_confirm: true });
    if (confirm.error) throw confirm.error;
    const signed = await c.auth.signInWithPassword({ email, password: PASSWORD });
    if (signed.error) throw signed.error;
  }
  return { id: data.user.id, client: c };
}

const as = async (user, fn) => {
  activeClient = user.client;
  try {
    return await fn();
  } finally {
    activeClient = anonClient;
  }
};

let customer;
let professional;
let otherCustomer;
let property;
let requestId;
let quoteId;
let projectId;

before(async () => {
  if (!configured) return;

  customer = await signUp("customer", { account_type: "customer", display_name: `${T} Customer` });
  otherCustomer = await signUp("other", { account_type: "customer", display_name: `${T} Other` });
  professional = await signUp("pro", {
    account_type: "professional",
    display_name: `${T} Stone Studio`,
    professional_category: "stone_fabricator",
  });

  await as(professional, () =>
    saveOwnProfile({
      accountType: "professional",
      profile: {
        displayName: `${T} Stone Studio`,
        username: "",
        bio: "Stone fabrication and installation.",
        visibility: "public",
      },
      professional: {
        category: "stone_fabricator",
        companyName: `${T} Stone Ltd`,
        serviceArea: "London",
        services: ["Worktops"],
        websiteUrl: "",
      },
    }),
  );

  property = await as(customer, () =>
    quote.createProperty({
      label: "Home",
      propertyKind: "house",
      addressLine1: "10 Test Street",
      city: "London",
      postcode: "HA0 1AA",
    }),
  );
});

after(async () => {
  for (const id of ids) await service.auth.admin.deleteUser(id);
});

const skip = configured ? false : "SMC_REAL_SUPABASE_* not set — real-backend gate not run";

test("customer cannot assign a quote request to a non-professional account", { skip }, async () => {
  await assert.rejects(
    () =>
      as(customer, () =>
        quote.submitQuoteRequest({
          propertyId: property.id,
          professionalId: otherCustomer.id,
          title: "Invalid assignee",
          projectType: "Kitchen worktops",
        }),
      ),
    /quote request could not be sent/i,
  );
});

test("customer submits a real quote request to an onboarded professional", { skip }, async () => {
  requestId = await as(customer, () =>
    quote.submitQuoteRequest({
      propertyId: property.id,
      professionalId: professional.id,
      title: "Calacatta kitchen worktops",
      projectType: "Kitchen worktops",
      description: "Worktops, island, sink and hob cut-outs.",
      selections: {
        approximateMeasurements: "Main run 2400 × 620 mm; island 1800 × 900 mm",
        preferredTiming: "Ready for templating in 3 weeks",
        requirements: ["Island", "Sink cut-out", "Hob cut-out"],
      },
    }),
  );

  const request = await as(customer, () => quote.fetchQuoteRequest(requestId));
  assert.equal(request.requester_id, customer.id);
  assert.equal(request.assigned_professional_id, professional.id);
  assert.equal(request.status, "submitted");
  assert.equal(request.property.postcode, "HA0 1AA");
  assert.equal(request.selections.approximateMeasurements, "Main run 2400 × 620 mm; island 1800 × 900 mm");
  assert.equal(request.selections.preferredTiming, "Ready for templating in 3 weeks");
  assert.deepEqual(request.selections.requirements, ["Island", "Sink cut-out", "Hob cut-out"]);
});

test("quote request files are private to the customer and assigned professional", { skip }, async () => {
  const sitePhoto = new File(["site-photo"], `${T}-site.jpg`, { type: "image/jpeg" });

  await as(customer, () => quote.uploadQuoteRequestDocument(requestId, sitePhoto, "photo"));

  const customerFiles = await as(customer, () => quote.fetchQuoteRequestDocuments(requestId));
  assert.equal(customerFiles.length, 1);
  assert.equal(customerFiles[0].kind, "photo");
  assert.equal(customerFiles[0].file_name, `${T}-site.jpg`);
  assert.match(customerFiles[0].storage_path, new RegExp(`^quote-requests/${requestId}/${customer.id}/`));

  const professionalFiles = await as(professional, () => quote.fetchQuoteRequestDocuments(requestId));
  assert.equal(professionalFiles.length, 1);
  assert.equal(professionalFiles[0].id, customerFiles[0].id);
  assert.ok(professionalFiles[0].signed_url, "assigned professional receives a short-lived private URL");

  const unrelatedFiles = await as(otherCustomer, () => quote.fetchQuoteRequestDocuments(requestId));
  assert.deepEqual(unrelatedFiles, []);
});

test("assigned professional can open the request and create one draft quote", { skip }, async () => {
  const request = await as(professional, () => quote.fetchQuoteRequest(requestId));
  assert.equal(request.id, requestId);

  quoteId = await as(professional, () => quote.createOrGetDraftQuote(requestId));
  const sameQuoteId = await as(professional, () => quote.createOrGetDraftQuote(requestId));
  assert.equal(sameQuoteId, quoteId, "one request reopens the same quote rather than duplicating it");
});

test("customer cannot read the professional draft quote", { skip }, async () => {
  const hidden = await as(customer, () => quote.fetchQuoteForRequest(requestId));
  assert.equal(hidden, null);
});

test("professional adds scope and line items; server recalculates the sent total", { skip }, async () => {
  await as(professional, () =>
    quote.updateDraftQuote(quoteId, {
      scopeSummary: "Template, fabricate and install kitchen worktops.",
      terms: "Final dimensions subject to templating.",
    }),
  );
  await as(professional, () =>
    quote.addQuoteItem(quoteId, {
      description: "Quartz worktops",
      quantity: 2,
      unit: "item",
      unitPrice: 100,
      taxRate: 0.2,
    }),
  );

  await as(professional, () => quote.sendQuote(quoteId, null));

  const sent = await as(customer, () => quote.fetchQuoteForRequest(requestId));
  assert.equal(sent.status, "sent");
  assert.equal(Number(sent.subtotal), 200);
  assert.equal(Number(sent.tax_total), 40);
  assert.equal(Number(sent.total), 240);
  assert.equal(sent.items.length, 1);
});

test("customer quote-request evidence is locked once a quote has been issued", { skip }, async () => {
  const files = await as(customer, () => quote.fetchQuoteRequestDocuments(requestId));
  assert.equal(files.length, 1);
  await assert.rejects(
    () => as(customer, () => quote.deleteQuoteRequestDocument(files[0])),
    /file could not be removed/i,
  );
});

test("only the customer can mark a sent quote viewed", { skip }, async () => {
  await assert.rejects(
    () => as(professional, () => quote.markQuoteViewed(quoteId)),
    /quote view could not be recorded/i,
  );

  await as(customer, () => quote.markQuoteViewed(quoteId));
  const viewed = await as(customer, () => quote.fetchQuote(quoteId));
  assert.equal(viewed.status, "viewed");
  assert.ok(viewed.viewed_at, "viewed_at is recorded");
});

test("customer approval creates the project, both memberships and launch milestones", { skip }, async () => {
  projectId = await as(customer, () => quote.acceptQuote(quoteId));
  assert.match(projectId, /^[0-9a-f-]{36}$/i);

  const { data: project, error: projectError } = await service
    .from("projects")
    .select("id, quote_id, customer_id, lead_professional_id, title, status")
    .eq("id", projectId)
    .single();
  assert.ifError(projectError);
  assert.equal(project.quote_id, quoteId);
  assert.equal(project.customer_id, customer.id);
  assert.equal(project.lead_professional_id, professional.id);
  assert.equal(project.title, "Calacatta kitchen worktops");

  const { data: members, error: membersError } = await service
    .from("project_members")
    .select("user_id, role")
    .eq("project_id", projectId)
    .order("role");
  assert.ifError(membersError);
  assert.equal(members.length, 2);
  assert.deepEqual(
    new Set(members.map((row) => `${row.user_id}:${row.role}`)),
    new Set([`${customer.id}:customer`, `${professional.id}:professional`]),
  );

  const { data: milestones, error: milestonesError } = await service
    .from("project_milestones")
    .select("title, position")
    .eq("project_id", projectId)
    .order("position");
  assert.ifError(milestonesError);
  assert.deepEqual(milestones.map((row) => row.title), ["Site survey", "Templating", "Fabrication", "Installation", "Handover"]);

  const { data: request, error: requestError } = await service.from("quote_requests").select("status").eq("id", requestId).single();
  assert.ifError(requestError);
  assert.equal(request.status, "converted");

  const { data: accepted, error: acceptedError } = await service.from("quotes").select("status").eq("id", quoteId).single();
  assert.ifError(acceptedError);
  assert.equal(accepted.status, "accepted");
});

test("unrelated authenticated users cannot read the created project", { skip }, async () => {
  const { data, error } = await otherCustomer.client.from("projects").select("id").eq("id", projectId);
  assert.ifError(error);
  assert.deepEqual(data, []);
});

test("customer can decline a separate sent quote with feedback and no project is created", { skip }, async () => {
  const declinedRequestId = await as(customer, () =>
    quote.submitQuoteRequest({
      propertyId: property.id,
      professionalId: professional.id,
      title: "Bathroom vanity worktop",
      projectType: "Bathroom",
      description: "Vanity top with basin cut-out.",
    }),
  );

  const declinedQuoteId = await as(professional, () => quote.createOrGetDraftQuote(declinedRequestId));
  await as(professional, () =>
    quote.addQuoteItem(declinedQuoteId, {
      description: "Vanity worktop",
      quantity: 1,
      unit: "item",
      unitPrice: 500,
      taxRate: 0.2,
    }),
  );
  await as(professional, () => quote.sendQuote(declinedQuoteId, null));
  await as(customer, () => quote.markQuoteViewed(declinedQuoteId));

  await assert.rejects(
    () => as(otherCustomer, () => quote.rejectQuote(declinedQuoteId, "Not mine")),
    /quote could not be declined/i,
  );

  await as(customer, () => quote.rejectQuote(declinedQuoteId, "We are changing the bathroom layout first."));

  const declined = await as(customer, () => quote.fetchQuote(declinedQuoteId));
  assert.equal(declined.status, "rejected");
  assert.equal(declined.rejection_reason, "We are changing the bathroom layout first.");
  assert.ok(declined.rejected_at, "rejected_at is recorded");

  const { data: projects, error: projectsError } = await service
    .from("projects")
    .select("id")
    .eq("quote_id", declinedQuoteId);
  assert.ifError(projectsError);
  assert.deepEqual(projects, [], "declining a quote must never create a project");

  const { data: notices, error: noticesError } = await service
    .from("notifications")
    .select("user_id, kind, quote_id")
    .eq("quote_id", declinedQuoteId)
    .eq("kind", "quote_rejected");
  assert.ifError(noticesError);
  assert.equal(notices.length, 1);
  assert.equal(notices[0].user_id, professional.id);
});
