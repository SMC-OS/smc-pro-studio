import { useCallback, useEffect, useState } from "react";
import { FileText, Hammer, MapPin } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, SectionHeading } from "../components/ui";
import { EmptyState, ErrorState, GuestNotice, LoadingState } from "../components/StateViews";
import { createOrGetDraftQuote, fetchQuoteForRequest, fetchQuoteRequest, type QuoteRecord, type QuoteRequestRecord } from "../services/quoteClient";
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
  const [state, setState] = useState<"idle" | "loading" | "ready" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    if (auth.status !== "authenticated" || !requestId) return;
    setState("loading");
    Promise.all([fetchQuoteRequest(requestId), fetchQuoteForRequest(requestId)])
      .then(([requestRow, quoteRow]) => {
        setRequest(requestRow);
        setQuote(quoteRow);
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

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") return <GuestNotice message="Sign in to open this quote request." />;
  if (state === "loading" || state === "idle") return <LoadingState label="Loading quote request" />;
  if (state === "error") return <ErrorState message={message} onRetry={load} />;
  if (!request) return <EmptyState title="Quote request not found" description="It may have been removed or your account does not have access." />;

  const me = auth.session.subject;
  const isProfessional = request.assigned_professional_id === me;
  const isCustomer = request.requester_id === me;

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

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--smc-mineral-bronze)]">People</p>
        <div className="mt-3 grid gap-2 text-sm">
          <p>Customer: <strong>{request.requester?.display_name ?? "Customer"}</strong></p>
          <p>Professional: <strong>{request.professional?.display_name ?? "Assigned professional"}</strong></p>
        </div>
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
