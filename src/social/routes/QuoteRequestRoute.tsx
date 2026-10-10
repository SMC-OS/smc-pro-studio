import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Plus, Send } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, SectionHeading } from "../components/ui";
import { ErrorState, GuestNotice, LoadingState } from "../components/StateViews";
import { fetchPublishedMaterials, type Material } from "../services/materialsClient";
import { searchPublicProfessionals, type PublicProfessional } from "../services/socialClient";
import {
  createProperty,
  fetchOwnProperties,
  submitQuoteRequest,
  type CreatePropertyInput,
  type PropertySummary,
} from "../services/quoteClient";
import { useAuthSession } from "../services/useAuthSession";
import { describeError } from "../services/networkErrors";

const PROJECT_TYPES = [
  "Kitchen worktops",
  "Bathroom",
  "Flooring",
  "Staircase",
  "Fireplace",
  "Full renovation",
  "Other",
] as const;

const EMPTY_PROPERTY: CreatePropertyInput = {
  label: "Home",
  propertyKind: "house",
  addressLine1: "",
  addressLine2: "",
  city: "",
  postcode: "",
};

export default function QuoteRequestRoute() {
  const auth = useAuthSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [professionals, setProfessionals] = useState<PublicProfessional[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [professionalId, setProfessionalId] = useState(params.get("professional") ?? "");
  const [materialId, setMaterialId] = useState(params.get("material") ?? "");
  const [projectType, setProjectType] = useState<(typeof PROJECT_TYPES)[number]>("Kitchen worktops");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [approximateMeasurements, setApproximateMeasurements] = useState("");
  const [preferredTiming, setPreferredTiming] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [newProperty, setNewProperty] = useState<CreatePropertyInput>(EMPTY_PROPERTY);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    setState("loading");
    Promise.all([
      fetchOwnProperties(),
      searchPublicProfessionals({ pageSize: 50 }),
      fetchPublishedMaterials(),
    ])
      .then(([propertyRows, proPage, materialRows]) => {
        setProperties(propertyRows);
        setProfessionals(proPage.items);
        setMaterials(materialRows);
        setPropertyId((current) => current || propertyRows[0]?.id || "");
        setState("ready");
      })
      .catch((error: unknown) => {
        setMessage(describeError(error, "The quote form could not be loaded.").message);
        setState("error");
      });
  }, [auth.status]);

  useEffect(() => {
    if (auth.status === "authenticated") load();
  }, [auth.status, load]);

  const selectedProfessional = useMemo(
    () => professionals.find((professional) => professional.user_id === professionalId) ?? null,
    [professionalId, professionals],
  );

  async function addProperty() {
    try {
      setState("saving");
      const property = await createProperty(newProperty);
      setProperties((current) => [property, ...current]);
      setPropertyId(property.id);
      setNewProperty(EMPTY_PROPERTY);
      setShowPropertyForm(false);
      setState("ready");
    } catch (error: unknown) {
      setMessage(describeError(error, "The property could not be saved.").message);
      setState("error");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      setState("saving");
      const requestId = await submitQuoteRequest({
        propertyId,
        professionalId,
        materialId: materialId || null,
        projectType,
        title,
        description,
        selections: {
          approximateMeasurements: approximateMeasurements.trim() || null,
          preferredTiming: preferredTiming.trim() || null,
          requirements: projectType === "Kitchen worktops" ? requirements : [],
        },
      });
      navigate(`/quote-requests/${requestId}`);
    } catch (error: unknown) {
      setMessage(describeError(error, "Your quote request could not be sent.").message);
      setState("error");
    }
  }

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") {
    return (
      <div className="flex flex-col gap-4">
        <GuestNotice message="Sign in to request a quote." />
        <Link to="/auth" className="text-sm font-semibold text-[var(--smc-mineral-bronze)] hover:underline">Sign in</Link>
      </div>
    );
  }
  if (state === "loading" || state === "idle") return <LoadingState label="Preparing quote request" />;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        eyebrow="Start a project"
        title="Request a quote"
        description="Tell the professional what you are planning. Keep it useful and specific — the details you add here become the start of the project record."
      />

      {state === "error" && <ErrorState message={message} onRetry={load} />}

      <form onSubmit={submit} className="grid gap-5">
        <Card className="grid gap-4 p-5">
          <h2 className="text-base font-semibold">1. Property</h2>
          {properties.length > 0 && (
            <label className="grid gap-2 text-sm font-medium">
              Choose property
              <select
                value={propertyId}
                onChange={(event) => setPropertyId(event.target.value)}
                className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3"
                required
              >
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.label} — {property.address_line1}, {property.city} {property.postcode}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={() => setShowPropertyForm((value) => !value)}
            className="inline-flex min-h-[44px] items-center gap-2 self-start text-sm font-semibold text-[var(--smc-mineral-bronze)]"
          >
            <Plus className="h-4 w-4" /> {properties.length === 0 ? "Add your property" : "Add another property"}
          </button>

          {(showPropertyForm || properties.length === 0) && (
            <div className="grid gap-3 rounded-[var(--smc-radius-card)] bg-[var(--smc-surface-sunken)] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium">Property name<input value={newProperty.label} onChange={(e) => setNewProperty({ ...newProperty, label: e.target.value })} className="min-h-[46px] rounded-xl border border-[var(--smc-border)] bg-white px-3" required /></label>
                <label className="grid gap-1 text-sm font-medium">Type<select value={newProperty.propertyKind} onChange={(e) => setNewProperty({ ...newProperty, propertyKind: e.target.value as CreatePropertyInput["propertyKind"] })} className="min-h-[46px] rounded-xl border border-[var(--smc-border)] bg-white px-3"><option value="house">House</option><option value="flat">Flat</option><option value="commercial">Commercial</option><option value="other">Other</option></select></label>
              </div>
              <label className="grid gap-1 text-sm font-medium">Address<input value={newProperty.addressLine1} onChange={(e) => setNewProperty({ ...newProperty, addressLine1: e.target.value })} className="min-h-[46px] rounded-xl border border-[var(--smc-border)] bg-white px-3" required /></label>
              <label className="grid gap-1 text-sm font-medium">Address line 2 <span className="sr-only">optional</span><input value={newProperty.addressLine2 ?? ""} onChange={(e) => setNewProperty({ ...newProperty, addressLine2: e.target.value })} className="min-h-[46px] rounded-xl border border-[var(--smc-border)] bg-white px-3" /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium">Town or city<input value={newProperty.city} onChange={(e) => setNewProperty({ ...newProperty, city: e.target.value })} className="min-h-[46px] rounded-xl border border-[var(--smc-border)] bg-white px-3" required /></label>
                <label className="grid gap-1 text-sm font-medium">Postcode<input value={newProperty.postcode} onChange={(e) => setNewProperty({ ...newProperty, postcode: e.target.value })} className="min-h-[46px] rounded-xl border border-[var(--smc-border)] bg-white px-3 uppercase" required /></label>
              </div>
              <button type="button" onClick={() => void addProperty()} disabled={state === "saving"} className="inline-flex min-h-[44px] items-center justify-center self-start rounded-full bg-[var(--smc-charcoal)] px-4 text-sm font-semibold text-white disabled:opacity-50">
                Save property
              </button>
            </div>
          )}
        </Card>

        <Card className="grid gap-4 p-5">
          <h2 className="text-base font-semibold">2. Professional & material</h2>
          <label className="grid gap-2 text-sm font-medium">
            Professional
            <select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3" required>
              <option value="">Choose a professional</option>
              {professionals.map((professional) => (
                <option key={professional.user_id} value={professional.user_id}>
                  {professional.profile?.display_name ?? professional.company_name ?? "Professional"}
                  {professional.company_name ? ` — ${professional.company_name}` : ""}
                </option>
              ))}
            </select>
          </label>
          {selectedProfessional?.service_area && <p className="text-xs text-[var(--smc-charcoal-soft)]">Service area: {selectedProfessional.service_area}</p>}
          <label className="grid gap-2 text-sm font-medium">
            Material <span className="font-normal text-[var(--smc-charcoal-faint)]">(optional)</span>
            <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3">
              <option value="">No material selected yet</option>
              {materials.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}
            </select>
          </label>
        </Card>

        <Card className="grid gap-4 p-5">
          <h2 className="text-base font-semibold">3. Project brief</h2>
          <label className="grid gap-2 text-sm font-medium">Project type<select value={projectType} onChange={(e) => setProjectType(e.target.value as (typeof PROJECT_TYPES)[number])} className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3">{PROJECT_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-medium">Project title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Kitchen worktops — Wembley" maxLength={160} className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3" required /></label>
          <label className="grid gap-2 text-sm font-medium">
            Project details
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the room, layout, finish, access or anything else that will help the professional understand the work."
              maxLength={5000}
              rows={6}
              className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white p-3 leading-6"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Approximate measurements <span className="font-normal text-[var(--smc-charcoal-faint)]">(optional)</span>
            <textarea
              value={approximateMeasurements}
              onChange={(e) => setApproximateMeasurements(e.target.value)}
              placeholder="e.g. Main run 2400 × 620 mm; island 1800 × 900 mm. Approximate only — final dimensions are confirmed professionally."
              maxLength={2000}
              rows={3}
              className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white p-3 leading-6"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Preferred timing <span className="font-normal text-[var(--smc-charcoal-faint)]">(optional)</span>
            <input
              value={preferredTiming}
              onChange={(e) => setPreferredTiming(e.target.value)}
              placeholder="e.g. Ready for templating in 3–4 weeks"
              maxLength={200}
              className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3"
            />
          </label>

          {projectType === "Kitchen worktops" && (
            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium">Common worktop requirements</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  "Island",
                  "Sink cut-out",
                  "Hob cut-out",
                  "Upstands / splashback",
                  "Waterfall end",
                  "Drainer grooves",
                ].map((requirement) => {
                  const checked = requirements.includes(requirement);
                  return (
                    <label
                      key={requirement}
                      className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setRequirements((current) =>
                            event.target.checked
                              ? [...current, requirement]
                              : current.filter((item) => item !== requirement),
                          )
                        }
                        className="h-5 w-5"
                      />
                      <span>{requirement}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
        </Card>

        <button type="submit" disabled={state === "saving" || !propertyId || !professionalId || !title.trim()} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[var(--smc-charcoal)] px-6 text-sm font-semibold text-white disabled:opacity-50">
          <Send className="h-4 w-4" /> {state === "saving" ? "Sending…" : "Send quote request"}
        </button>
        <p className="flex items-center gap-2 text-xs text-[var(--smc-charcoal-faint)]"><Building2 className="h-4 w-4" /> The professional will see only the project information you submit and data your account is authorised to share.</p>
      </form>
    </div>
  );
}
