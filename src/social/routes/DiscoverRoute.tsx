import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { fetchPublicProfessionals, type PublicProfessional } from "../services/socialClient";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; professionals: PublicProfessional[] };

const CATEGORY_LABELS: Record<string, string> = {
  architect: "Architect",
  interior_designer: "Interior Designer",
  stone_fabricator: "Stone Fabricator",
  stone_supplier: "Stone Supplier",
  installer: "Installer",
  contractor: "Contractor",
  developer: "Developer",
  construction_professional: "Construction Professional",
  smc_team: "SMC Team",
  other: "Professional",
};

export default function DiscoverRoute() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(() => {
    setState({ status: "loading" });
    fetchPublicProfessionals()
      .then((professionals) => setState({ status: "ready", professionals }))
      .catch((error: unknown) =>
        setState({ status: "error", message: error instanceof Error ? error.message : "Discover could not be loaded." })
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-[var(--smc-charcoal)]">Discover</h1>
        <p className="text-sm text-[var(--smc-charcoal-soft)]">Professionals on SMC Pro Studio. Materials and project inspiration arrive in a later slice.</p>
      </div>

      {state.status === "loading" && <LoadingState label="Loading professionals" />}
      {state.status === "error" && <ErrorState message={state.message} onRetry={load} />}
      {state.status === "ready" && state.professionals.length === 0 && (
        <EmptyState title="No public professional profiles yet" description="Professionals who complete onboarding will appear here." />
      )}
      {state.status === "ready" && state.professionals.length > 0 && (
        <ul className="flex flex-col gap-3">
          {state.professionals.map((pro) => (
            <li key={pro.user_id} className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] p-4">
              <p className="text-sm font-semibold text-[var(--smc-charcoal)]">{pro.profile?.display_name ?? "SMC professional"}</p>
              <p className="text-xs text-[var(--smc-charcoal-faint)]">{pro.category ? CATEGORY_LABELS[pro.category] ?? pro.category : "Professional"}</p>
              {pro.company_name && <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">{pro.company_name}</p>}
              {pro.service_area && <p className="text-xs text-[var(--smc-charcoal-faint)]">{pro.service_area}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
