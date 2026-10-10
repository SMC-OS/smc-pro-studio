import { useCallback, useEffect, useState } from "react";
import { CalendarDays, FileText, PoundSterling, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Card, SectionHeading } from "../components/ui";
import { EmptyState, ErrorState, GuestNotice, LoadingState } from "../components/StateViews";
import { fetchLaunchProject, type LaunchProjectDetail } from "../services/launchClient";
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
    | { status: "idle" | "loading" }
    | { status: "ready"; project: LaunchProjectDetail | null }
    | { status: "error"; message: string }
  >({ status: "idle" });

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
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/projects" className="text-sm font-semibold text-[var(--smc-mineral-bronze)] hover:underline">← Projects</Link>
        <div className="mt-4">
          <SectionHeading eyebrow={label(project.status)} title={project.title} description={project.description ?? undefined} />
        </div>
      </div>

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
            {project.quote && <p className="text-sm">Approved scope: <strong>{money(project.quote.total, project.quote.currency)}</strong></p>}
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
          <div className="mt-4 grid gap-2">
            {project.documents.length === 0 ? <p className="text-sm text-[var(--smc-charcoal-soft)]">No project documents yet.</p> : project.documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{document.file_name}</span>
                <span className="text-xs text-[var(--smc-charcoal-faint)]">{label(document.kind)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /><h2 className="font-semibold">Variations & warranty</h2></div>
          <div className="mt-4 grid gap-3">
            {project.variations.length === 0 && project.warranties.length === 0 && (
              <p className="text-sm text-[var(--smc-charcoal-soft)]">Nothing recorded yet.</p>
            )}
            {project.variations.map((variation) => (
              <div key={variation.id}>
                <p className="text-sm font-semibold">{variation.title}</p>
                <p className="text-xs text-[var(--smc-charcoal-soft)]">{label(variation.status)} · {variation.amount_delta >= 0 ? "+" : ""}{money(variation.amount_delta, "GBP")}</p>
              </div>
            ))}
            {project.warranties.map((warranty) => (
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
