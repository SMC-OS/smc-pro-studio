import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarDays, FolderKanban } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, SectionHeading } from "../components/ui";
import { EmptyState, ErrorState, GuestNotice, LoadingState } from "../components/StateViews";
import { fetchLaunchProjects, type LaunchProjectSummary } from "../services/launchClient";
import { useAuthSession } from "../services/useAuthSession";
import { describeError } from "../services/networkErrors";

function label(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProjectsRoute() {
  const auth = useAuthSession();
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ready"; projects: LaunchProjectSummary[] }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    setState({ status: "loading" });
    fetchLaunchProjects()
      .then((projects) => setState({ status: "ready", projects }))
      .catch((error: unknown) => setState({ status: "error", message: describeError(error, "Your projects could not be loaded.").message }));
  }, [auth.status]);

  useEffect(() => {
    if (auth.status === "authenticated") load();
    else if (auth.status === "guest") setState({ status: "idle" });
  }, [auth.status, load]);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        eyebrow="Your work"
        title="Projects"
        description="One place for progress, appointments, documents, variations, payments and handover."
      />

      {auth.status === "loading" && <LoadingState label="Checking your account" />}
      {auth.status === "guest" && (
        <GuestNotice message="Sign in to view and manage your projects." />
      )}
      {auth.status === "guest" && (
        <Link
          to="/auth"
          className="inline-flex min-h-[48px] items-center justify-center self-start rounded-[var(--smc-radius-pill)] bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-white"
        >
          Sign in
        </Link>
      )}

      {auth.status === "authenticated" && state.status === "loading" && <LoadingState label="Loading projects" />}
      {auth.status === "authenticated" && state.status === "error" && <ErrorState message={state.message} onRetry={load} />}

      {auth.status === "authenticated" && state.status === "ready" && state.projects.length === 0 && (
        <EmptyState
          title="No projects yet"
          description="A project will appear here when an approved quote is converted into work."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/studio" className="text-sm font-semibold text-[var(--smc-mineral-bronze)] hover:underline">
                Explore Studio
              </Link>
              <Link to="/network" className="text-sm font-semibold text-[var(--smc-mineral-bronze)] hover:underline">
                Find a professional
              </Link>
            </div>
          }
        />
      )}

      {auth.status === "authenticated" && state.status === "ready" && state.projects.length > 0 && (
        <ul className="grid gap-3">
          {state.projects.map((project) => (
            <li key={project.id}>
              <Link to={`/projects/${project.id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]">
                <Card className="p-5 transition-transform hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[var(--smc-charcoal-faint)]">
                        <FolderKanban className="h-4 w-4" aria-hidden="true" />
                        <span className="text-xs font-semibold uppercase tracking-[0.12em]">{label(project.status)}</span>
                      </div>
                      <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--smc-charcoal)]">{project.title}</h2>
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
                      <div
                        className="h-full rounded-full bg-[var(--smc-mineral-bronze)]"
                        style={{ width: `${project.progress}%` }}
                      />
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
    </div>
  );
}
