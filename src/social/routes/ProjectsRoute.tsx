import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarDays, FileText, FolderKanban, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, SectionHeading } from "../components/ui";
import { EmptyState, ErrorState, GuestNotice, LoadingState } from "../components/StateViews";
import { fetchLaunchDashboard, type LaunchDashboard } from "../services/launchClient";
import { useAuthSession } from "../services/useAuthSession";
import { describeError } from "../services/networkErrors";

function label(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
}

export default function ProjectsRoute() {
  const auth = useAuthSession();
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ready"; dashboard: LaunchDashboard }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    setState({ status: "loading" });
    fetchLaunchDashboard()
      .then((dashboard) => setState({ status: "ready", dashboard }))
      .catch((error: unknown) =>
        setState({
          status: "error",
          message: describeError(error, "Your projects and quotes could not be loaded.").message,
        }),
      );
  }, [auth.status]);

  useEffect(() => {
    if (auth.status === "authenticated") load();
    else if (auth.status === "guest") setState({ status: "idle" });
  }, [auth.status, load]);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          eyebrow="Your work"
          title="Projects & quotes"
          description="Start with a quote, then keep progress, appointments, documents, variations, payments and handover together."
        />
        {auth.status === "authenticated" && (
          <Link
            to="/quotes/new"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> Request a quote
          </Link>
        )}
      </div>

      {auth.status === "loading" && <LoadingState label="Checking your account" />}
      {auth.status === "guest" && (
        <>
          <GuestNotice message="Sign in to manage quote requests, quotes and projects." />
          <Link
            to="/auth"
            className="inline-flex min-h-[48px] items-center justify-center self-start rounded-full bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        </>
      )}

      {auth.status === "authenticated" && state.status === "loading" && <LoadingState label="Loading projects and quotes" />}
      {auth.status === "authenticated" && state.status === "error" && <ErrorState message={state.message} onRetry={load} />}

      {auth.status === "authenticated" && state.status === "ready" && (
        <>
          {(state.dashboard.quoteRequests.length > 0 || state.dashboard.quotes.length > 0) && (
            <section>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--smc-charcoal)]">Before the project</h2>
                  <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">
                    Requests and quotes stay here until approved work becomes a project.
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-3">
                {state.dashboard.quoteRequests.map((request) => (
                  <Link
                    key={request.id}
                    to={`/quote-requests/${request.id}`}
                    className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]"
                  >
                    <Card className="flex items-center justify-between gap-4 p-5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[var(--smc-mineral-bronze)]">
                          <FileText className="h-4 w-4" aria-hidden="true" />
                          <span className="text-xs font-semibold uppercase tracking-[0.12em]">
                            Request · {label(request.status)}
                          </span>
                        </div>
                        <h3 className="mt-2 truncate font-semibold text-[var(--smc-charcoal)]">{request.title}</h3>
                        <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">{request.project_type}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 shrink-0 text-[var(--smc-charcoal-faint)]" aria-hidden="true" />
                    </Card>
                  </Link>
                ))}

                {state.dashboard.quotes.map((quote) => (
                  <Link
                    key={quote.id}
                    to={`/quotes/${quote.id}`}
                    className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]"
                  >
                    <Card className="flex items-center justify-between gap-4 p-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--smc-mineral-bronze)]">
                          Quote · {label(quote.status)}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[var(--smc-charcoal)]">
                          {quote.status === "draft" ? "Draft quote" : money(Number(quote.total), quote.currency)}
                        </p>
                        {quote.valid_until && (
                          <p className="mt-1 text-xs text-[var(--smc-charcoal-soft)]">
                            Valid until {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(quote.valid_until))}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-5 w-5 shrink-0 text-[var(--smc-charcoal-faint)]" aria-hidden="true" />
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--smc-charcoal)]">Projects</h2>
            <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">Approved work and live delivery.</p>

            {state.dashboard.projects.length === 0 ? (
              <div className="mt-3">
                <EmptyState
                  title="No projects yet"
                  description="When a customer approves a quote, SMC Pro Studio creates the project and its first milestones automatically."
                  action={
                    <div className="flex flex-wrap justify-center gap-3">
                      <Link to="/quotes/new" className="text-sm font-semibold text-[var(--smc-mineral-bronze)] hover:underline">
                        Request a quote
                      </Link>
                      <Link to="/studio" className="text-sm font-semibold text-[var(--smc-mineral-bronze)] hover:underline">
                        Explore Studio
                      </Link>
                    </div>
                  }
                />
              </div>
            ) : (
              <ul className="mt-3 grid gap-3">
                {state.dashboard.projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      to={`/projects/${project.id}`}
                      className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]"
                    >
                      <Card className="p-5 transition-transform hover:-translate-y-0.5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[var(--smc-charcoal-faint)]">
                              <FolderKanban className="h-4 w-4" aria-hidden="true" />
                              <span className="text-xs font-semibold uppercase tracking-[0.12em]">{label(project.status)}</span>
                            </div>
                            <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--smc-charcoal)]">{project.title}</h3>
                            {project.property && (
                              <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">
                                {project.property.label} · {project.property.city}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-[var(--smc-charcoal-faint)]" aria-hidden="true" />
                        </div>

                        <div className="mt-5">
                          <div className="flex items-center justify-between text-xs text-[var(--smc-charcoal-soft)]">
                            <span>Progress</span>
                            <span className="font-semibold text-[var(--smc-charcoal)]">{project.progress}%</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--smc-limestone)]">
                            <div className="h-full rounded-full bg-[var(--smc-mineral-bronze)]" style={{ width: `${project.progress}%` }} />
                          </div>
                        </div>

                        {project.target_completion_date && (
                          <div className="mt-4 flex items-center gap-2 text-xs text-[var(--smc-charcoal-soft)]">
                            <CalendarDays className="h-4 w-4" aria-hidden="true" />
                            Target {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(project.target_completion_date))}
                          </div>
                        )}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
