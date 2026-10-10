import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Check, Plus, Send, Trash2, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, SectionHeading } from "../components/ui";
import { EmptyState, ErrorState, GuestNotice, LoadingState } from "../components/StateViews";
import {
  acceptQuote,
  addQuoteItem,
  deleteQuoteItem,
  fetchQuote,
  markQuoteViewed,
  rejectQuote,
  sendQuote,
  updateDraftQuote,
  type QuoteItemRecord,
  type QuoteRecord,
} from "../services/quoteClient";
import { useAuthSession } from "../services/useAuthSession";
import { describeError } from "../services/networkErrors";

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
}

function label(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function draftTotals(items: QuoteItemRecord[]) {
  return items.reduce(
    (totals, item) => ({
      subtotal: totals.subtotal + Number(item.net_total),
      tax: totals.tax + Number(item.tax_amount),
    }),
    { subtotal: 0, tax: 0 },
  );
}

export default function QuoteRoute() {
  const { quoteId = "" } = useParams();
  const auth = useAuthSession();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<QuoteRecord | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const [scopeSummary, setScopeSummary] = useState("");
  const [terms, setTerms] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [item, setItem] = useState({ description: "", quantity: "1", unit: "item", unitPrice: "", vat: "20" });
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const load = useCallback(() => {
    if (auth.status !== "authenticated" || !quoteId) return;
    const userId = auth.session.subject;
    setState("loading");
    fetchQuote(quoteId)
      .then(async (row) => {
        if (row && row.customer_id === userId && row.status === "sent") {
          await markQuoteViewed(row.id);
          row = await fetchQuote(quoteId);
        }
        setQuote(row);
        setScopeSummary(row?.scope_summary ?? "");
        setTerms(row?.terms ?? "");
        setValidUntil(row?.valid_until ?? "");
        setDeclineReason(row?.rejection_reason ?? "");
        setState("ready");
      })
      .catch((error: unknown) => {
        setMessage(describeError(error, "The quote could not be loaded.").message);
        setState("error");
      });
  }, [auth.status, auth.status === "authenticated" ? auth.session.subject : null, quoteId]);

  useEffect(() => {
    if (auth.status === "authenticated") load();
  }, [auth.status, load]);

  const computed = useMemo(() => (quote ? draftTotals(quote.items) : { subtotal: 0, tax: 0 }), [quote]);
  const me = auth.status === "authenticated" ? auth.session.subject : null;
  const isIssuer = Boolean(quote && me === quote.issuer_id);
  const isCustomer = Boolean(quote && me === quote.customer_id);
  const editable = Boolean(quote && quote.status === "draft" && isIssuer);
  const subtotal = quote?.status === "draft" ? computed.subtotal : Number(quote?.subtotal ?? 0);
  const tax = quote?.status === "draft" ? computed.tax : Number(quote?.tax_total ?? 0);
  const total = quote?.status === "draft" ? computed.subtotal + computed.tax : Number(quote?.total ?? 0);

  async function saveDetails() {
    if (!quote) return;
    try {
      setState("saving");
      await updateDraftQuote(quote.id, { scopeSummary, terms });
      await load();
    } catch (error: unknown) {
      setMessage(describeError(error, "The quote details could not be saved.").message);
      setState("error");
    }
  }

  async function addItem(event: FormEvent) {
    event.preventDefault();
    if (!quote) return;
    try {
      setState("saving");
      await addQuoteItem(quote.id, {
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        taxRate: Number(item.vat) / 100,
      });
      setItem({ description: "", quantity: "1", unit: "item", unitPrice: "", vat: "20" });
      await load();
    } catch (error: unknown) {
      setMessage(describeError(error, "The quote item could not be added.").message);
      setState("error");
    }
  }

  async function removeItem(itemId: string) {
    try {
      setState("saving");
      await deleteQuoteItem(itemId);
      await load();
    } catch (error: unknown) {
      setMessage(describeError(error, "The quote item could not be removed.").message);
      setState("error");
    }
  }

  async function send() {
    if (!quote) return;
    try {
      setState("saving");
      await updateDraftQuote(quote.id, { scopeSummary, terms });
      await sendQuote(quote.id, validUntil || null);
      await load();
    } catch (error: unknown) {
      setMessage(describeError(error, "The quote could not be sent.").message);
      setState("error");
    }
  }

  async function approve() {
    if (!quote) return;
    try {
      setState("saving");
      const projectId = await acceptQuote(quote.id);
      navigate(`/projects/${projectId}`);
    } catch (error: unknown) {
      setMessage(describeError(error, "The quote could not be approved.").message);
      setState("error");
    }
  }

  async function decline() {
    if (!quote) return;
    try {
      setState("saving");
      await rejectQuote(quote.id, declineReason);
      setDeclineOpen(false);
      await load();
    } catch (error: unknown) {
      setMessage(describeError(error, "The quote could not be declined.").message);
      setState("error");
    }
  }

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") return <GuestNotice message="Sign in to open this quote." />;
  if (state === "loading" || state === "idle") return <LoadingState label="Loading quote" />;
  if (state === "error" && !quote) return <ErrorState message={message} onRetry={load} />;
  if (!quote) return <EmptyState title="Quote not found" description="It may not have been sent yet, or your account does not have access." />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to={quote.quote_request_id ? `/quote-requests/${quote.quote_request_id}` : "/projects"} className="text-sm font-semibold text-[var(--smc-mineral-bronze)] hover:underline">
          ← Quote request
        </Link>
        <div className="mt-4">
          <SectionHeading
            eyebrow={label(quote.status)}
            title={quote.request?.title ?? "Quote"}
            description={quote.request?.description ?? undefined}
          />
        </div>
      </div>

      {state === "error" && quote && <ErrorState message={message} onRetry={load} />}

      <Card className="p-5">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>Customer: <strong>{quote.customer?.display_name ?? "Customer"}</strong></p>
          <p>Professional: <strong>{quote.issuer?.display_name ?? "Professional"}</strong></p>
          {quote.request?.property && <p>Property: <strong>{quote.request.property.label}</strong></p>}
          {quote.request?.material && <p>Material: <strong>{quote.request.material.name}</strong></p>}
        </div>
      </Card>

      {editable ? (
        <>
          <Card className="grid gap-4 p-5">
            <h2 className="text-base font-semibold">Scope & terms</h2>
            <label className="grid gap-2 text-sm font-medium">
              Scope summary
              <textarea value={scopeSummary} onChange={(e) => setScopeSummary(e.target.value)} maxLength={5000} rows={5} className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white p-3 leading-6" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Terms
              <textarea value={terms} onChange={(e) => setTerms(e.target.value)} maxLength={12000} rows={5} className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white p-3 leading-6" />
            </label>
            <button type="button" onClick={saveDetails} disabled={state === "saving"} className="inline-flex min-h-[44px] items-center justify-center self-start rounded-full border border-[var(--smc-border-strong)] px-4 text-sm font-semibold disabled:opacity-50">
              Save details
            </button>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold">Quote items</h2>
            <div className="mt-4 grid gap-3">
              {quote.items.length === 0 && <p className="text-sm text-[var(--smc-charcoal-soft)]">Add at least one item before sending the quote.</p>}
              {quote.items.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-4 border-b border-[var(--smc-border)] pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold">{row.description}</p>
                    <p className="mt-1 text-xs text-[var(--smc-charcoal-soft)]">{row.quantity} {row.unit} × {money(Number(row.unit_price), quote.currency)} · VAT {Math.round(Number(row.tax_rate) * 100)}%</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm">{money(Number(row.net_total) + Number(row.tax_amount), quote.currency)}</strong>
                    <button type="button" onClick={() => removeItem(row.id)} disabled={state === "saving"} aria-label={`Remove ${row.description}`} className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--smc-charcoal-faint)] hover:bg-[var(--smc-limestone)] disabled:opacity-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={addItem} className="mt-5 grid gap-3 rounded-[var(--smc-radius-card)] bg-[var(--smc-surface-sunken)] p-4">
              <label className="grid gap-1 text-sm font-medium">Description<input value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} maxLength={1000} className="min-h-[46px] rounded-xl border border-[var(--smc-border)] bg-white px-3" required /></label>
              <div className="grid gap-3 sm:grid-cols-4">
                <label className="grid gap-1 text-sm font-medium">Quantity<input type="number" min="0.001" step="0.001" value={item.quantity} onChange={(e) => setItem({ ...item, quantity: e.target.value })} className="min-h-[46px] rounded-xl border border-[var(--smc-border)] bg-white px-3" required /></label>
                <label className="grid gap-1 text-sm font-medium">Unit<input value={item.unit} onChange={(e) => setItem({ ...item, unit: e.target.value })} maxLength={30} className="min-h-[46px] rounded-xl border border-[var(--smc-border)] bg-white px-3" required /></label>
                <label className="grid gap-1 text-sm font-medium">Unit price (£)<input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => setItem({ ...item, unitPrice: e.target.value })} className="min-h-[46px] rounded-xl border border-[var(--smc-border)] bg-white px-3" required /></label>
                <label className="grid gap-1 text-sm font-medium">VAT %<input type="number" min="0" max="100" step="0.1" value={item.vat} onChange={(e) => setItem({ ...item, vat: e.target.value })} className="min-h-[46px] rounded-xl border border-[var(--smc-border)] bg-white px-3" required /></label>
              </div>
              <button type="submit" disabled={state === "saving"} className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-full bg-[var(--smc-charcoal)] px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" /> Add item</button>
            </form>
          </Card>
        </>
      ) : (
        <>
          {quote.scope_summary && <Card className="p-5"><h2 className="font-semibold">Scope</h2><p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--smc-charcoal-soft)]">{quote.scope_summary}</p></Card>}
          {quote.terms && <Card className="p-5"><h2 className="font-semibold">Terms</h2><p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--smc-charcoal-soft)]">{quote.terms}</p></Card>}
          <Card className="p-5">
            <h2 className="font-semibold">Items</h2>
            <div className="mt-4 grid gap-3">
              {quote.items.map((row) => (
                <div key={row.id} className="flex justify-between gap-4 text-sm">
                  <div><p className="font-semibold">{row.description}</p><p className="text-xs text-[var(--smc-charcoal-soft)]">{row.quantity} {row.unit}</p></div>
                  <strong>{money(Number(row.net_total) + Number(row.tax_amount), quote.currency)}</strong>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <Card className="p-5">
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal, quote.currency)}</strong></div>
          <div className="flex justify-between"><span>VAT</span><strong>{money(tax, quote.currency)}</strong></div>
          <div className="mt-2 flex justify-between border-t border-[var(--smc-border)] pt-3 text-lg"><span>Total</span><strong>{money(total, quote.currency)}</strong></div>
        </div>
        {quote.status === "draft" && <p className="mt-3 text-xs text-[var(--smc-charcoal-faint)]">Draft display only. The server recalculates and stores the authoritative totals when the quote is sent.</p>}
      </Card>

      {editable && (
        <Card className="grid gap-4 p-5">
          <label className="grid gap-2 text-sm font-medium">Valid until <span className="font-normal text-[var(--smc-charcoal-faint)]">(optional)</span><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3" /></label>
          <button type="button" onClick={send} disabled={state === "saving" || quote.items.length === 0} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[var(--smc-charcoal)] px-6 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" /> {state === "saving" ? "Sending…" : "Send quote"}</button>
        </Card>
      )}

      {isCustomer && (quote.status === "sent" || quote.status === "viewed") && (
        <Card className="grid gap-4 p-5">
          <div>
            <h2 className="font-semibold">Your decision</h2>
            <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">
              Approving creates the live project and its first delivery milestones. Declining closes this quote without creating a project.
            </p>
          </div>

          {!declineOpen ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={approve}
                disabled={state === "saving"}
                className="inline-flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-full bg-[var(--smc-charcoal)] px-6 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> {state === "saving" ? "Approving…" : "Approve quote & create project"}
              </button>
              <button
                type="button"
                onClick={() => setDeclineOpen(true)}
                disabled={state === "saving"}
                className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full border border-[var(--smc-border-strong)] px-6 text-sm font-semibold text-[var(--smc-charcoal)] disabled:opacity-50"
              >
                <X className="h-4 w-4" /> Decline quote
              </button>
            </div>
          ) : (
            <div className="grid gap-3 rounded-[var(--smc-radius-card)] bg-[var(--smc-surface-sunken)] p-4">
              <label className="grid gap-2 text-sm font-medium">
                Why are you declining? <span className="font-normal text-[var(--smc-charcoal-faint)]">(optional)</span>
                <textarea
                  value={declineReason}
                  onChange={(event) => setDeclineReason(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="Share anything the professional should know before you discuss the next step."
                  className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white p-3 leading-6"
                />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={decline}
                  disabled={state === "saving"}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {state === "saving" ? "Declining…" : "Confirm decline"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeclineOpen(false)}
                  disabled={state === "saving"}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[var(--smc-border-strong)] px-5 text-sm font-semibold disabled:opacity-50"
                >
                  Keep quote
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {quote.status === "accepted" && (
        <Card className="p-5">
          <p className="font-semibold">Quote approved</p>
          <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">This work is now managed as a project.</p>
          <Link to="/projects" className="mt-4 inline-flex text-sm font-semibold text-[var(--smc-mineral-bronze)]">Open Projects</Link>
        </Card>
      )}

      {quote.status === "rejected" && (
        <Card className="p-5">
          <p className="font-semibold">Quote declined</p>
          <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">
            No project was created from this quote. You can continue the conversation with the professional if the scope or price needs to change.
          </p>
          {quote.rejection_reason && (
            <div className="mt-4 rounded-[var(--smc-radius-card)] bg-[var(--smc-surface-sunken)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--smc-charcoal-faint)]">Customer feedback</p>
              <p className="mt-2 whitespace-pre-line text-sm text-[var(--smc-charcoal-soft)]">{quote.rejection_reason}</p>
            </div>
          )}
          <Link to="/messages" className="mt-4 inline-flex text-sm font-semibold text-[var(--smc-mineral-bronze)]">Message professional</Link>
        </Card>
      )}
    </div>
  );
}
