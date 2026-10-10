import { useCallback, useEffect, useState } from "react";
import { ExternalLink, FileText, Hammer, MapPin, Paperclip, Trash2, Upload } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, SectionHeading } from "../components/ui";
import { EmptyState, ErrorState, GuestNotice, LoadingState } from "../components/StateViews";
import {
  createOrGetDraftQuote,
  deleteQuoteRequestDocument,
  fetchQuoteForRequest,
  fetchQuoteRequest,
  fetchQuoteRequestDocuments,
  uploadQuoteRequestDocument,
  type QuoteRecord,
  type QuoteRequestDocumentRecord,
  type QuoteRequestRecord,
} from "../services/quoteClient";
import { useAuthSession } from "../services/useAuthSession";
import { describeError } from "../services/networkErrors";

function label(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function QuoteRequestDetailRoute() {
  const { requestId = "" } = useParams();
  const auth = useAuthSession();
  const navigate = useNavigate();
  const [request, setRequest] = useState<QuoteRequestRecord | null>(null);
  const [quote, setQuote] = useState<QuoteRecord | null>(null);
  const [documents, setDocuments] = useState<QuoteRequestDocumentRecord[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentKind, setDocumentKind] = useState<QuoteRequestDocumentRecord["kind"]>("photo");

  const load = useCallback(() => {
    if (auth.status !== "authenticated" || !requestId) return;
    setState("loading");
    Promise.all([
      fetchQuoteRequest(requestId),
      fetchQuoteForRequest(requestId),
      fetchQuoteRequestDocuments(requestId),
    ])
      .then(([requestRow, quoteRow, documentRows]) => {
        setRequest(requestRow);
        setQuote(quoteRow);
        setDocuments(documentRows);
        setState("ready");
      })
      .catch((error: unknown) => {
        setMessage(describeError(error, "The quote request could not be loaded.").message);
        setState("error");
      });
  }, [auth.status, requestId]);

  useEffect(() => {
    if (auth.status === "authenticated") load();
  }, [auth.status, load]);

  async function prepareQuote() {
    try {
      setState("saving");
      const quoteId = await createOrGetDraftQuote(requestId);
      navigate(`/quotes/${quoteId}`);
    } catch (error: unknown) {
      setMessage(describeError(error, "The quote could not be opened.").message);
      setState("error");
    }
  }

  async function uploadDocument() {
    if (!selectedFile) return;
    try {
      setUploading(true);
      await uploadQuoteRequestDocument(requestId, selectedFile, documentKind);
      setSelectedFile(null);
      setDocuments(await fetchQuoteRequestDocuments(requestId));
    } catch (error: unknown) {
      setMessage(describeError(error, "The file could not be attached.").message);
      setState("error");
    } finally {
      setUploading(false);
    }
  }

  async function removeDocument(document: QuoteRequestDocumentRecord) {
    try {
      setUploading(true);
      await deleteQuoteRequestDocument(document);
      setDocuments(await fetchQuoteRequestDocuments(requestId));
    } catch (error: unknown) {
      setMessage(describeError(error, "The file could not be removed.").message);
      setState("error");
    } finally {
      setUploading(false);
    }
  }

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") return <GuestNotice message="Sign in to open this quote request." />;
  if (state === "loading" || state === "idle") return <LoadingState label="Loading quote request" />;
  if (state === "error") return <ErrorState message={message} onRetry={load} />;
  if (!request) return <EmptyState title="Quote request not found" description="It may have been removed or your account does not have access." />;

  const me = auth.session.subject;
  const isProfessional = request.assigned_professional_id === me;
  const isCustomer = request.requester_id === me;
  const approximateMeasurements =
    typeof request.selections?.approximateMeasurements === "string"
      ? request.selections.approximateMeasurements
      : "";
  const preferredTiming =
    typeof request.selections?.preferredTiming === "string"
      ? request.selections.preferredTiming
      : "";
  const requirements = Array.isArray(request.selections?.requirements)
    ? request.selections.requirements.filter((item): item is string => typeof item === "string")
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/projects" className="text-sm font-semibold text-[var(--smc-mineral-bronze)] hover:underline">← Projects & quotes</Link>
        <div className="mt-4"><SectionHeading eyebrow={label(request.status)} title={request.title} description={request.description ?? undefined} /></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--smc-mineral-bronze)]">Brief</p>
          <p className="mt-2 font-semibold">{request.project_type}</p>
          {request.material && <p className="mt-2 text-sm text-[var(--smc-charcoal-soft)]">Material: {request.material.name}</p>}
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><p className="font-semibold">{request.property?.label ?? "Property"}</p></div>
          {request.property && <p className="mt-2 text-sm text-[var(--smc-charcoal-soft)]">{request.property.address_line1}, {request.property.city} {request.property.postcode}</p>}
        </Card>
      </div>

      {(approximateMeasurements || preferredTiming || requirements.length > 0) && (
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--smc-mineral-bronze)]">Project brief</p>
          <div className="mt-3 grid gap-4">
            {approximateMeasurements && (
              <div>
                <p className="text-sm font-semibold">Approximate measurements</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[var(--smc-charcoal-soft)]">{approximateMeasurements}</p>
                <p className="mt-1 text-xs text-[var(--smc-charcoal-faint)]">Customer-provided approximation — not a professional template or survey.</p>
              </div>
            )}
            {preferredTiming && (
              <div>
                <p className="text-sm font-semibold">Preferred timing</p>
                <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">{preferredTiming}</p>
              </div>
            )}
            {requirements.length > 0 && (
              <div>
                <p className="text-sm font-semibold">Requirements</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {requirements.map((item) => (
                    <span key={item} className="rounded-full bg-[var(--smc-limestone)] px-3 py-1.5 text-xs font-medium text-[var(--smc-charcoal)]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--smc-mineral-bronze)]">People</p>
        <div className="mt-3 grid gap-2 text-sm">
          <p>Customer: <strong>{request.requester?.display_name ?? "Customer"}</strong></p>
          <p>Professional: <strong>{request.professional?.display_name ?? "Assigned professional"}</strong></p>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-[var(--smc-mineral-bronze)]" />
          <h2 className="font-semibold">Photos & files</h2>
        </div>
        <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">
          Photos, drawings, PDFs and measurement files stay private to the customer, assigned professional and authorised SMC staff.
        </p>

        <div className="mt-4 grid gap-3">
          {documents.length === 0 ? (
            <p className="text-sm text-[var(--smc-charcoal-soft)]">No files attached yet.</p>
          ) : (
            documents.map((document) => (
              <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--smc-radius-card)] bg-[var(--smc-surface-sunken)] p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{document.file_name}</p>
                  <p className="mt-1 text-xs text-[var(--smc-charcoal-faint)]">
                    {label(document.kind)} · {Math.max(1, Math.round(document.size_bytes / 1024))} KB
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {document.signed_url && (
                    <a
                      href={document.signed_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--smc-charcoal-soft)] hover:bg-white"
                      aria-label={`Open ${document.file_name}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {isCustomer && document.uploaded_by === me && (request.status === "draft" || request.status === "submitted") && (
                    <button
                      type="button"
                      onClick={() => void removeDocument(document)}
                      disabled={uploading}
                      className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--smc-charcoal-soft)] hover:bg-white disabled:opacity-50"
                      aria-label={`Remove ${document.file_name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {isCustomer && (request.status === "draft" || request.status === "submitted") && (
          <div className="mt-5 grid gap-3 border-t border-[var(--smc-border)] pt-5">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <label className="grid gap-2 text-sm font-medium">
                Add file
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                File type
                <select
                  value={documentKind}
                  onChange={(event) => setDocumentKind(event.target.value as QuoteRequestDocumentRecord["kind"])}
                  className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3"
                >
                  <option value="photo">Photo</option>
                  <option value="plan">Plan / drawing</option>
                  <option value="measurement">Measurement</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={() => void uploadDocument()}
              disabled={!selectedFile || uploading}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 self-start rounded-full bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Attach file"}
            </button>
            <p className="text-xs text-[var(--smc-charcoal-faint)]">JPG, PNG, WebP or PDF · maximum 25 MB per file.</p>
          </div>
        )}
      </Card>

      {quote ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <div className="flex items-center gap-2"><FileText className="h-5 w-5" /><h2 className="font-semibold">Quote {label(quote.status)}</h2></div>
            <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">{quote.status === "draft" ? "The quote is being prepared." : "Open the quote for the latest scope and total."}</p>
          </div>
          <Link to={`/quotes/${quote.id}`} className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--smc-charcoal)] px-4 text-sm font-semibold text-white">Open quote</Link>
        </Card>
      ) : isProfessional ? (
        <button type="button" onClick={prepareQuote} disabled={state === "saving"} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[var(--smc-charcoal)] px-6 text-sm font-semibold text-white disabled:opacity-50">
          <Hammer className="h-4 w-4" /> {state === "saving" ? "Opening…" : "Prepare quote"}
        </button>
      ) : isCustomer ? (
        <Card className="p-5"><p className="font-semibold">Request sent</p><p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">The assigned professional can now review the brief and prepare your quote.</p></Card>
      ) : null}
    </div>
  );
}
