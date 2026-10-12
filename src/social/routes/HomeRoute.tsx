import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, FolderKanban, Layers3, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui";
import { ErrorState, LoadingState } from "../components/StateViews";
import { fetchLaunchDashboard, type LaunchDashboard } from "../services/launchClient";
import { useAuthSession } from "../services/useAuthSession";
import { describeError } from "../services/networkErrors";

function label(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function when(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
}

export default function HomeRoute() {
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
        setState({ status: "error", message: describeError(error, "Your home could not be loaded.").message }),
      );
  }, [auth.status]);

  useEffect(() => {
    if (auth.status === "authenticated") load();
    else if (auth.status === "guest") setState({ status: "idle" });
  }, [auth.status, load]);

  const nextActionQuote = useMemo(() => {
    if (state.status !== "ready") return null;
    return state.dashboard.quotes.find((quote) => quote.status === "sent" || quote.status === "viewed") ?? null;
  }, [state]);

  if (auth.status === "loading") return <LoadingState label="Opening SMC Pro Studio" />;

  if (auth.status === "guest") {
    return (
      <div className="flex flex-col gap-7">
        <section
          className="overflow-hidden rounded-[2rem] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] px-6 py-8 sm:px-8 sm:py-10"
          style={{ boxShadow: "var(--smc-shadow-raised)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--smc-mineral-bronze)]">
            SMC Pro Studio
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.045em] text-[var(--smc-charcoal)] sm:text-4xl">
            Design your project. Build it with the right people. Keep the record.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--smc-charcoal-soft)]">
            Explore materials and professionals, then keep quotes, progress, appointments, documents and handover together when your project starts.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/quotes/new"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-white"
            >
              Request a quote <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/network"
              className="inline-flex min-h-[48px] items-center rounded-full border border-[var(--smc-border-strong)] px-5 text-sm font-semibold text-[var(--smc-charcoal)]"
            >
              Find professionals
            </Link>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          <Link to="/studio" className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]">
            <Card className="h-full p-5 transition-colors hover:bg-[var(--smc-limestone)]">
              <Layers3 className="h-5 w-5 text-[var(--smc-mineral-bronze)]" aria-hidden="true" />
              <h2 className="mt-4 font-semibold">Explore materials</h2>
              <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">Browse materials published by SMC.</p>
            </Card>
          </Link>
          <Link to="/studio" className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]">
            <Card className="h-full p-5 transition-colors hover:bg-[var(--smc-limestone)]">
              <Sparkles className="h-5 w-5 text-[var(--smc-mineral-bronze)]" aria-hidden="true" />
              <h2 className="mt-4 font-semibold">Plan a project</h2>
              <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">Save ideas and carry choices into a quote.</p>
            </Card>
          </Link>
          <Link to="/projects" className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]">
            <Card className="h-full p-5 transition-colors hover:bg-[var(--smc-limestone)]">
              <FolderKanban className="h-5 w-5 text-[var(--smc-mineral-bronze)]" aria-hidden="true" />
              <h2 className="mt-4 font-semibold">Keep work together</h2>
              <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">Quotes and approved projects stay in one place.</p>
            </Card>
          </Link>
        </div>
      </div>
    );
  }

  if (state.status === "loading" || state.status === "idle") return <LoadingState label="Loading your workspace" />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={load} />;

  const { dashboard } = state;
  const firstName = dashboard.profile.display_name.trim().split(/\s+/)[0] || "there";
  const activeProject =
    dashboard.projects.find((project) => project.status !== "complete" && project.status !== "cancelled") ??
    dashboard.projects[0] ??
    null;
  const nextAppointment = dashboard.appointments[0] ?? null;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--smc-mineral-bronze)]">
            {dashboard.profile.account_type === "professional" ? "Professional workspace" : "Your renovation workspace"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.035em] sm:text-3xl">Welcome back, {firstName}</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--smc-charcoal-soft)]">Your next step starts here.</p>
        </div>
        {dashboard.unreadNotifications > 0 && (
          <Link
            to="/notifications"
            className="rounded-full bg-[var(--smc-limestone)] px-3 py-2 text-xs font-semibold text-[var(--smc-charcoal)] hover:bg-[var(--smc-travertine)]"
          >
            {dashboard.unreadNotifications} unread {dashboard.unreadNotifications === 1 ? "update" : "updates"}
          </Link>
        )}
      </div>

      {nextActionQuote && (
        <Card className="border-[var(--smc-border-strong)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--smc-mineral-bronze)]">Action needed</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Your quote is ready</h2>
              <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">
                {money(nextActionQuote.total, nextActionQuote.currency)} · {label(nextActionQuote.status)}
              </p>
            </div>
            <Link to="/projects" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[var(--smc-charcoal)]">
              Review work <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      )}

      {activeProject ? (
        <Link to={`/projects/${activeProject.id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--smc-mineral-bronze)]">
                  {label(activeProject.status)}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{activeProject.title}</h2>
                {activeProject.property && (
                  <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">
                    {activeProject.property.label} · {activeProject.property.city}
                  </p>
                )}
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--smc-charcoal-faint)]" />
            </div>
            <div className="mt-6 flex items-center justify-between text-xs">
              <span>Project progress</span>
              <strong>{activeProject.progress}%</strong>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--smc-limestone)]">
              <div className="h-full rounded-full bg-[var(--smc-mineral-bronze)]" style={{ width: `${activeProject.progress}%` }} />
            </div>
          </Card>
        </Link>
      ) : (
        <Card className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--smc-mineral-bronze)]">Build your next project</p>
          <h2 className="mt-2 text-xl font-semibold leading-snug tracking-tight">What are you planning?</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--smc-charcoal-soft)]">Tell us about the work, explore surfaces or find the right professional.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link to="/quotes/new" className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--smc-charcoal)] px-4 text-sm font-semibold text-white">Request a quote <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
            <Link to="/studio" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--smc-border-strong)] px-3 text-center text-sm font-semibold">Explore materials</Link>
            <Link to="/network" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--smc-border-strong)] px-3 text-center text-sm font-semibold">Find professionals</Link>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {nextAppointment && (
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[var(--smc-mineral-bronze)]" aria-hidden="true" />
              <h2 className="font-semibold">Next appointment</h2>
            </div>
            <p className="mt-4 text-sm font-semibold">{label(nextAppointment.appointment_type)}</p>
            <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">{when(nextAppointment.starts_at)}</p>
            {nextAppointment.project && <p className="mt-1 text-xs text-[var(--smc-charcoal-faint)]">{nextAppointment.project.title}</p>}
          </Card>
        )}
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--smc-mineral-bronze)]" aria-hidden="true" />
            <h2 className="font-semibold">Explore Studio</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--smc-charcoal-soft)]">Browse published materials, compare surfaces and prepare your project brief.</p>
          <Link to="/studio" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
            Explore materials <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/projects" className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-white">
          <FolderKanban className="h-4 w-4" /> All projects
        </Link>
        <Link to="/network" className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-[var(--smc-border-strong)] px-5 text-sm font-semibold">
          <Users className="h-4 w-4" /> Network
        </Link>
      </div>
    </div>
  );
}
