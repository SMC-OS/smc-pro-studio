import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Check, ExternalLink, FileText, Plus, PoundSterling, Ruler, Send, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Card, SectionHeading } from "../components/ui";
import { EmptyState, ErrorState, GuestNotice, LoadingState } from "../components/StateViews";
import {
  addApproximateProjectMeasurement,
  createDraftVariation,
  decideVariation,
  deleteDraftVariation,
  deleteProjectDocument,
  deleteProjectMeasurement,
  fetchLaunchProject,
  sendVariation,
  uploadProjectDocument,
  type LaunchProjectDetail,
  type ProjectDocument,
} from "../services/launchClient";
import { useAuthSession } from "../services/useAuthSession";
import { describeError } from "../services/networkErrors";

function label(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
}

function when(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function ProjectDetailRoute() {
  const { projectId = "" } = useParams();
  const auth = useAuthSession();
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ready"; project: LaunchProjectDetail | null }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentKind, setDocumentKind] = useState<ProjectDocument["kind"]>("photo");
  const [measurementLabel, setMeasurementLabel] = useState("");
  const [measurementDetails, setMeasurementDetails] = useState("");
  const [variationTitle, setVariationTitle] = useState("");
  const [variationDescription, setVariationDescription] = useState("");
  const [variationAmount, setVariationAmount] = useState("");
  const [variationDays, setVariationDays] = useState("0");
  const [decisionVariationId, setDecisionVariationId] = useState<string | null>(null);
  const [variationNote, setVariationNote] = useState("");

  const load = useCallback(() => {
    if (auth.status !== "authenticated" || !projectId) return;
    setState({ status: "loading" });
    fetchLaunchProject(projectId)
      .then((project) => setState({ status: "ready", project }))
      .catch((error: unknown) => setState({ status: "error", message: describeError(error, "This project could not be loaded.").message }));
  }, [auth.status, projectId]);

  useEffect(() => {
    if (auth.status === "authenticated") load();
  }, [auth.status, load]);

  async function uploadDocument() {
    if (!selectedFile) return;
    try {
      setActionBusy(true);
      setActionError("");
      await uploadProjectDocument(projectId, selectedFile, documentKind);
      setSelectedFile(null);
      await load();
    } catch (error: unknown) {
      setActionError(describeError(error, "The project file could not be uploaded.").message);
    } finally {
      setActionBusy(false);
    }
  }

  async function removeDocument(document: ProjectDocument) {
    try {
      setActionBusy(true);
      setActionError("");
      await deleteProjectDocument(document);
      await load();
    } catch (error: unknown) {
      setActionError(describeError(error, "The project file could not be removed.").message);
    } finally {
      setActionBusy(false);
    }
  }

  async function saveMeasurement() {
    try {
      setActionBusy(true);
      setActionError("");
      await addApproximateProjectMeasurement(projectId, {
        label: measurementLabel,
        details: measurementDetails,
      });
      setMeasurementLabel("");
      setMeasurementDetails("");
      await load();
    } catch (error: unknown) {
      setActionError(describeError(error, "The measurement could not be saved.").message);
    } finally {
      setActionBusy(false);
    }
  }

  async function removeMeasurement(measurementId: string) {
    try {
      setActionBusy(true);
      setActionError("");
      await deleteProjectMeasurement(measurementId);
      await load();
    } catch (error: unknown) {
      setActionError(describeError(error, "The measurement could not be removed.").message);
    } finally {
      setActionBusy(false);
    }
  }

  async function addVariation() {
    try {
      setActionBusy(true);
      setActionError("");
      await createDraftVariation(projectId, {
        title: variationTitle,
        description: variationDescription,
        amountDelta: Number(variationAmount || "0"),
        daysDelta: Number(variationDays || "0"),
      });
      setVariationTitle("");
      setVariationDescription("");
      setVariationAmount("");
      setVariationDays("0");
      await load();
    } catch (error: unknown) {
      setActionError(describeError(error, "The variation could not be created.").message);
    } finally {
      setActionBusy(false);
    }
  }

  async function submitVariation(variationId: string) {
    try {
      setActionBusy(true);
      setActionError("");
      await sendVariation(variationId);
      await load();
    } catch (error: unknown) {
      setActionError(describeError(error, "The variation could not be sent.").message);
    } finally {
      setActionBusy(false);
    }
  }

  async function removeVariation(variationId: string) {
    try {
      setActionBusy(true);
      setActionError("");
      await deleteDraftVariation(variationId);
      await load();
    } catch (error: unknown) {
      setActionError(describeError(error, "The variation could not be removed.").message);
    } finally {
      setActionBusy(false);
    }
  }

  async function answerVariation(variationId: string, accept: boolean) {
    try {
      setActionBusy(true);
      setActionError("");
      await decideVariation(variationId, accept, variationNote);
      setDecisionVariationId(null);
      setVariationNote("");
      await load();
    } catch (error: unknown) {
      setActionError(describeError(error, accept ? "The variation could not be approved." : "The variation could not be declined.").message);
    } finally {
      setActionBusy(false);
    }
  }

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") {
    return (
      <div className="flex flex-col gap-4">
        <GuestNotice message="Sign in to open this project." />
        <Link to="/auth" className="text-sm font-semibold text-[var(--smc-mineral-bronze)] hover:underline">Sign in</Link>
      </div>
    );
  }
  if (state.status === "loading" || state.status === "idle") return <LoadingState label="Loading project" />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={load} />;
  if (!state.project) {
    return <EmptyState title="Project not found" description="It may have been removed, or your account does not have access to it." />;
  }

  const project = state.project;
  const me = auth.session.subject;
  const canManageProject =
    project.current_user_role === "professional" ||
    project.current_user_role === "project_manager" ||
    project.lead_professional_id === me;
  const isCustomer = project.customer_id === me;
  const acceptedVariationTotal = project.variations
    .filter((variation) => variation.status === "accepted")
    .reduce((sum, variation) => sum + Number(variation.amount_delta), 0);
  const approvedProjectValue = Number(project.quote?.total ?? 0) + acceptedVariationTotal;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/projects" className="text-sm font-semibold text-[var(--smc-mineral-bronze)] hover:underline">← Projects</Link>
        <div className="mt-4">
          <SectionHeading eyebrow={label(project.status)} title={project.title} description={project.description ?? undefined} />
        </div>
      </div>

      {actionError && (
        <Card className="border-red-200 bg-red-50 p-4">
          <p role="alert" className="text-sm font-medium text-red-800">{actionError}</p>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-[var(--smc-charcoal-soft)]">Overall progress</span>
          <span className="font-semibold text-[var(--smc-charcoal)]">{project.progress}%</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--smc-limestone)]">
          <div className="h-full rounded-full bg-[var(--smc-mineral-bronze)]" style={{ width: `${project.progress}%` }} />
        </div>
        {project.property && (
          <p className="mt-4 text-sm text-[var(--smc-charcoal-soft)]">
            {project.property.label} · {project.property.address_line1}, {project.property.city} {project.property.postcode}
          </p>
        )}
      </Card>

      <section>
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--smc-charcoal)]">Timeline</h2>
        <ol className="mt-3 grid gap-2">
          {project.milestones.map((milestone) => (
            <li key={milestone.id}>
              <Card className="flex items-center gap-4 p-4">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: milestone.status === "completed" ? "var(--smc-success)" : milestone.status === "active" ? "var(--smc-mineral-bronze)" : "var(--smc-border-strong)" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--smc-charcoal)]">{milestone.title}</p>
                  <p className="text-xs text-[var(--smc-charcoal-soft)]">{label(milestone.status)}{milestone.due_at ? ` · ${when(milestone.due_at)}` : ""}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /><h2 className="font-semibold">Appointments</h2></div>
          <div className="mt-4 grid gap-3">
            {project.appointments.length === 0 ? <p className="text-sm text-[var(--smc-charcoal-soft)]">No appointments scheduled.</p> : project.appointments.map((appointment) => (
              <div key={appointment.id}>
                <p className="text-sm font-semibold">{label(appointment.appointment_type)}</p>
                <p className="text-xs text-[var(--smc-charcoal-soft)]">{when(appointment.starts_at)} · {label(appointment.status)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2"><PoundSterling className="h-5 w-5" /><h2 className="font-semibold">Financials</h2></div>
          <div className="mt-4 grid gap-3">
            {project.quote && (
              <>
                <p className="text-sm">Original approved quote: <strong>{money(project.quote.total, project.quote.currency)}</strong></p>
                {acceptedVariationTotal !== 0 && (
                  <p className="text-sm">
                    Accepted variations: <strong>{acceptedVariationTotal >= 0 ? "+" : ""}{money(acceptedVariationTotal, project.quote.currency)}</strong>
                  </p>
                )}
                <p className="text-sm">Approved project value: <strong>{money(approvedProjectValue, project.quote.currency)}</strong></p>
              </>
            )}
            {project.payments.length === 0 ? <p className="text-sm text-[var(--smc-charcoal-soft)]">No payment schedule yet.</p> : project.payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-3 text-sm">
                <span>{label(payment.kind)} · {label(payment.status)}</span>
                <strong>{money(payment.amount, payment.currency)}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2"><FileText className="h-5 w-5" /><h2 className="font-semibold">Documents</h2></div>
          <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">Private project photos, plans and records shared only with project members.</p>
          <div className="mt-4 grid gap-2">
            {project.documents.length === 0 ? <p className="text-sm text-[var(--smc-charcoal-soft)]">No project documents yet.</p> : project.documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-3 rounded-[var(--smc-radius-card)] bg-[var(--smc-surface-sunken)] p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{document.file_name}</p>
                  <p className="mt-1 text-xs text-[var(--smc-charcoal-faint)]">{label(document.kind)} · {Math.max(1, Math.round(document.size_bytes / 1024))} KB</p>
                </div>
                <div className="flex items-center gap-1">
                  {document.signed_url && (
                    <a
                      href={document.signed_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white"
                      aria-label={`Open ${document.file_name}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {document.uploaded_by === me && (
                    <button
                      type="button"
                      onClick={() => void removeDocument(document)}
                      disabled={actionBusy}
                      className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white disabled:opacity-50"
                      aria-label={`Remove ${document.file_name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 border-t border-[var(--smc-border)] pt-5">
            <label className="grid gap-2 text-sm font-medium">
              Add project file
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              File type
              <select
                value={documentKind}
                onChange={(event) => setDocumentKind(event.target.value as ProjectDocument["kind"])}
                className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3"
              >
                <option value="photo">Photo</option>
                <option value="plan">Plan / drawing</option>
                <option value="measurement">Measurement</option>
                <option value="contract">Contract</option>
                <option value="invoice">Invoice</option>
                <option value="warranty">Warranty</option>
                <option value="certificate">Certificate</option>
                <option value="other">Other</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => void uploadDocument()}
              disabled={!selectedFile || actionBusy}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> {actionBusy ? "Working…" : "Attach file"}
            </button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2"><Ruler className="h-5 w-5" /><h2 className="font-semibold">Measurements</h2></div>
          <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">Customer entries are approximate unless an authorised professional records them otherwise.</p>
          <div className="mt-4 grid gap-3">
            {project.measurements.length === 0 ? (
              <p className="text-sm text-[var(--smc-charcoal-soft)]">No measurements recorded yet.</p>
            ) : (
              project.measurements.map((measurement) => {
                const details = typeof measurement.data?.details === "string" ? measurement.data.details : "";
                return (
                  <div key={measurement.id} className="rounded-[var(--smc-radius-card)] bg-[var(--smc-surface-sunken)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{measurement.label}</p>
                        <p className="mt-1 text-xs text-[var(--smc-charcoal-faint)]">
                          {measurement.is_survey_grade ? "Professional measurement" : "Approximate measurement"} · {label(measurement.source)}
                        </p>
                      </div>
                      {measurement.created_by === me && !measurement.is_survey_grade && (
                        <button
                          type="button"
                          onClick={() => void removeMeasurement(measurement.id)}
                          disabled={actionBusy}
                          className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white disabled:opacity-50"
                          aria-label={`Remove ${measurement.label}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {details && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--smc-charcoal-soft)]">{details}</p>}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-5 grid gap-3 border-t border-[var(--smc-border)] pt-5">
            <label className="grid gap-2 text-sm font-medium">
              Measurement name
              <input
                value={measurementLabel}
                onChange={(event) => setMeasurementLabel(event.target.value)}
                maxLength={160}
                placeholder="e.g. Island worktop"
                className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Approximate dimensions / notes
              <textarea
                value={measurementDetails}
                onChange={(event) => setMeasurementDetails(event.target.value)}
                maxLength={4000}
                rows={4}
                placeholder="e.g. 1800 × 900 mm. Customer-provided approximation."
                className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white p-3 leading-6"
              />
            </label>
            <button
              type="button"
              onClick={() => void saveMeasurement()}
              disabled={!measurementLabel.trim() || !measurementDetails.trim() || actionBusy}
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[var(--smc-border-strong)] px-5 text-sm font-semibold disabled:opacity-50"
            >
              Save approximate measurement
            </button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /><h2 className="font-semibold">Variations</h2></div>
          <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">
            Any change to scope, price or timing is recorded here and requires a clear customer decision.
          </p>

          <div className="mt-4 grid gap-3">
            {project.variations.length === 0 && (
              <p className="text-sm text-[var(--smc-charcoal-soft)]">No variations recorded.</p>
            )}

            {project.variations.map((variation) => (
              <div key={variation.id} className="rounded-[var(--smc-radius-card)] bg-[var(--smc-surface-sunken)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{variation.title}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--smc-mineral-bronze)]">
                      {label(variation.status)}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">
                      {variation.amount_delta >= 0 ? "+" : ""}{money(Number(variation.amount_delta), project.quote?.currency ?? "GBP")}
                    </p>
                    <p className="mt-1 text-xs text-[var(--smc-charcoal-faint)]">
                      {variation.days_delta === 0
                        ? "No schedule change"
                        : `${variation.days_delta > 0 ? "+" : ""}${variation.days_delta} day${Math.abs(variation.days_delta) === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>

                {variation.description && (
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--smc-charcoal-soft)]">{variation.description}</p>
                )}
                {variation.customer_note && (
                  <div className="mt-3 rounded-xl bg-white p-3">
                    <p className="text-xs font-semibold text-[var(--smc-charcoal-faint)]">Customer note</p>
                    <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">{variation.customer_note}</p>
                  </div>
                )}

                {canManageProject && variation.status === "draft" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void submitVariation(variation.id)}
                      disabled={actionBusy}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[var(--smc-charcoal)] px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" /> Send for approval
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeVariation(variation.id)}
                      disabled={actionBusy}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--smc-border-strong)] px-4 text-sm font-semibold disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" /> Remove draft
                    </button>
                  </div>
                )}

                {isCustomer && variation.status === "sent" && (
                  <div className="mt-4 grid gap-3">
                    {decisionVariationId === variation.id ? (
                      <>
                        <label className="grid gap-2 text-sm font-medium">
                          Note <span className="font-normal text-[var(--smc-charcoal-faint)]">(optional)</span>
                          <textarea
                            value={variationNote}
                            onChange={(event) => setVariationNote(event.target.value)}
                            maxLength={2000}
                            rows={3}
                            className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white p-3 leading-6"
                            placeholder="Add context for the professional."
                          />
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => void answerVariation(variation.id, true)}
                            disabled={actionBusy}
                            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-[var(--smc-charcoal)] px-4 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" /> Approve variation
                          </button>
                          <button
                            type="button"
                            onClick={() => void answerVariation(variation.id, false)}
                            disabled={actionBusy}
                            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full border border-[var(--smc-border-strong)] px-4 text-sm font-semibold disabled:opacity-50"
                          >
                            <X className="h-4 w-4" /> Decline variation
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDecisionVariationId(null); setVariationNote(""); }}
                            disabled={actionBusy}
                            className="inline-flex min-h-[48px] items-center justify-center px-4 text-sm font-semibold text-[var(--smc-charcoal-soft)] disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDecisionVariationId(variation.id)}
                        className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-white"
                      >
                        Review variation
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {canManageProject && (
            <div className="mt-5 grid gap-3 border-t border-[var(--smc-border)] pt-5">
              <h3 className="text-sm font-semibold">Create variation</h3>
              <label className="grid gap-2 text-sm font-medium">
                Title
                <input
                  value={variationTitle}
                  onChange={(event) => setVariationTitle(event.target.value)}
                  maxLength={180}
                  placeholder="e.g. Add full-height splashback"
                  className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Description
                <textarea
                  value={variationDescription}
                  onChange={(event) => setVariationDescription(event.target.value)}
                  maxLength={5000}
                  rows={4}
                  placeholder="Describe exactly what changes from the approved scope."
                  className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white p-3 leading-6"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Price change (£)
                  <input
                    type="number"
                    step="0.01"
                    value={variationAmount}
                    onChange={(event) => setVariationAmount(event.target.value)}
                    placeholder="0.00"
                    className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Schedule change (days)
                  <input
                    type="number"
                    step="1"
                    value={variationDays}
                    onChange={(event) => setVariationDays(event.target.value)}
                    className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => void addVariation()}
                disabled={!variationTitle.trim() || actionBusy}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[var(--smc-border-strong)] px-5 text-sm font-semibold disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Save variation draft
              </button>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /><h2 className="font-semibold">Warranty</h2></div>
          <div className="mt-4 grid gap-3">
            {project.warranties.length === 0 ? (
              <p className="text-sm text-[var(--smc-charcoal-soft)]">No warranty recorded yet.</p>
            ) : project.warranties.map((warranty) => (
              <div key={warranty.id}>
                <p className="text-sm font-semibold">{warranty.warranty_type}</p>
                <p className="text-xs text-[var(--smc-charcoal-soft)]">{warranty.provider_name ?? "Project warranty"}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Link to="/messages" className="inline-flex min-h-[48px] items-center justify-center rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-5 text-sm font-semibold text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)]">
        Open messages
      </Link>
    </div>
  );
}
