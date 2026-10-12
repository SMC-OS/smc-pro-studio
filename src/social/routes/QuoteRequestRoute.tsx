import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, Check, ChevronLeft, ChevronRight, Plus, Send, ShieldCheck } from "lucide-react";
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

const QUOTE_STEPS = ["Your project", "Property", "Professional", "Review"] as const;

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
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState("");
  const [professionalSearch, setProfessionalSearch] = useState("");

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

  const canSubmit = Boolean(propertyId && title.trim() && professionalId && selectedProfessional);
  const visibleProfessionals = useMemo(() => {
    const q = professionalSearch.trim().toLocaleLowerCase();
    if (!q) return professionals;
    return professionals.filter((pro) => [
      pro.profile?.display_name ?? "", pro.company_name ?? "", pro.category ?? "", pro.service_area ?? "",
    ].some((value) => value.toLocaleLowerCase().includes(q)));
  }, [professionalSearch, professionals]);

  function nextStep() {
    if (step === 0 && !title.trim()) {
      setStepError("Add a short project title to continue.");
      return;
    }
    if (step === 1 && !propertyId) {
      setStepError("Save or choose a property to continue.");
      return;
    }
    setStepError("");
    setStep((current) => Math.min(current + 1, QUOTE_STEPS.length - 1));
  }

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
    if (!canSubmit) { setStepError("Check your title, property and verified professional before sending."); return; }
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
        description="Start with your idea, add your property, choose a verified professional, then check every detail before sending."
      />

      {state === "error" && <ErrorState message={message} onRetry={load} />}

      <div className="rounded-[2rem] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--smc-mineral-bronze)]">Step {step + 1} of {QUOTE_STEPS.length}</p>
          <p className="text-sm font-semibold">{QUOTE_STEPS[step]}</p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--smc-limestone)]">
          <div className="h-full rounded-full bg-[var(--smc-mineral-bronze)] transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${((step + 1) / QUOTE_STEPS.length) * 100}%` }} />
        </div>
        <ol aria-label="Quote request steps" className="mt-4 grid grid-cols-4 gap-1.5">
          {QUOTE_STEPS.map((name, index) => (
            <li key={name}><button type="button" disabled={index > step} onClick={() => { setStep(index); setStepError(""); }} aria-current={index === step ? "step" : undefined} className={`flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[11px] font-semibold ${index === step ? "bg-[var(--smc-charcoal)] text-white" : "bg-[var(--smc-limestone)] text-[var(--smc-charcoal)]"} disabled:opacity-60`}>
              {index < step ? <Check aria-hidden="true" className="h-4 w-4" /> : <span aria-hidden="true">{index + 1}</span>}
              <span>{name}</span>
            </button></li>
          ))}
        </ol>
      </div>

      <form onSubmit={submit} noValidate className="grid gap-5">
        {step === 0 && (<> 
        <Card className="grid gap-4 p-5">
          <h2 className="text-base font-semibold">Tell us about your project</h2>
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


        </>)}
        {step === 1 && (<>
        <Card className="grid gap-4 p-5">
          <h2 className="text-base font-semibold">Your property</h2>
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


        </>)}
        {step === 2 && (<>
        <Card className="grid gap-4 p-5">
          <h2 className="text-base font-semibold">Choose a professional and surface</h2>
          <p className="text-sm leading-6 text-[var(--smc-charcoal-soft)]">We only show professionals whose accounts are verified and published. Your brief goes directly to the person you select.</p>
          {professionals.length === 0 ? (
            <div role="status" className="rounded-2xl border border-[var(--smc-border-strong)] bg-[var(--smc-limestone)] p-5">
              <p className="font-semibold">No verified professionals available yet</p>
              <p className="mt-2 text-sm leading-6 text-[var(--smc-charcoal-soft)]">You can review your project plan, but sending is unavailable until an approved professional can receive it. No request will be assigned to a placeholder account.</p>
              <Link to="/network" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold">Check professional directory <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          ) : (
            <>
              <label className="grid gap-2 text-sm font-medium">Search professionals
                <input type="search" value={professionalSearch} onChange={(e) => setProfessionalSearch(e.target.value)} placeholder="Name, trade or service area" className="min-h-12 rounded-xl border border-[var(--smc-border)] bg-white px-4" />
              </label>
              <fieldset className="grid max-h-64 gap-2 overflow-y-auto" aria-label="Choose a professional">
                {visibleProfessionals.map((pro) => (
                  <label key={pro.user_id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 ${professionalId === pro.user_id ? "border-[var(--smc-mineral-bronze)] bg-[var(--smc-limestone)]" : "border-[var(--smc-border)]"}`}>
                    <input type="radio" name="quoteProfessional" value={pro.user_id} checked={professionalId === pro.user_id} onChange={() => setProfessionalId(pro.user_id)} className="h-5 w-5 accent-[var(--smc-charcoal)]" />
                    <span className="min-w-0 text-sm font-semibold">{pro.profile?.display_name ?? pro.company_name ?? "Professional"}<span className="block text-xs font-normal text-[var(--smc-charcoal-soft)]">{pro.company_name ?? pro.category ?? "Professional"}{pro.service_area ? ` · ${pro.service_area}` : ""}</span></span>
                  </label>
                ))}
                {visibleProfessionals.length === 0 && <p className="text-sm text-[var(--smc-charcoal-soft)]">No professionals match this search. Try a broader term.</p>}
              </fieldset>
            </>
          )}
          {selectedProfessional?.service_area && <p className="text-xs text-[var(--smc-charcoal-soft)]">Service area: {selectedProfessional.service_area}</p>}
          {materials.length === 0 && <p className="text-sm text-[var(--smc-charcoal-soft)]">No published materials yet. Material selection is optional—you can discuss it with the professional later.</p>}
          <label className="grid gap-2 text-sm font-medium">
            Material <span className="font-normal text-[var(--smc-charcoal-faint)]">(optional)</span>
            <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3">
              <option value="">No material selected yet</option>
              {materials.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}
            </select>
          </label>
        </Card>


        </>)}
          {step === QUOTE_STEPS.length - 1 && (
            <Card className="grid gap-4 p-5">
              <h2 className="text-lg font-semibold">Review your request</h2>
              <dl className="grid gap-3 text-sm">
                <div><dt className="text-[var(--smc-charcoal-faint)]">Project</dt><dd className="font-semibold">{title || "Not provided"} · {projectType}</dd></div>
                <div><dt className="text-[var(--smc-charcoal-faint)]">Property</dt><dd className="font-semibold">{properties.find((p) => p.id === propertyId)?.label ?? "Choose a property"}</dd></div>
                <div><dt className="text-[var(--smc-charcoal-faint)]">Professional</dt><dd className="font-semibold">{selectedProfessional?.profile?.display_name ?? selectedProfessional?.company_name ?? "Not selected"}</dd></div>
                <div><dt className="text-[var(--smc-charcoal-faint)]">Material</dt><dd className="font-semibold">{materials.find((m) => m.id === materialId)?.name ?? "To be discussed"}</dd></div>
                {description.trim() && <div><dt className="text-[var(--smc-charcoal-faint)]">Details</dt><dd className="whitespace-pre-wrap">{description}</dd></div>}
              </dl>
              {!canSubmit && <p role="status" className="rounded-xl bg-[var(--smc-limestone)] p-3 text-sm">Before sending: {!title.trim() ? "add a project title. " : ""}{!propertyId ? "choose or save a property. " : ""}{!selectedProfessional ? "select a currently verified professional. " : ""}</p>}
              <p className="flex items-start gap-2 text-xs text-[var(--smc-charcoal-soft)]"><ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />A request is only submitted to the selected professional. No payment is taken when sending a quote request.</p>
            </Card>
          )}
          {stepError && <p role="alert" className="rounded-xl border border-[var(--smc-mineral-bronze)] bg-[var(--smc-limestone)] p-3 text-sm font-semibold">{stepError}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {step > 0
              ? <button type="button" onClick={() => { setStep((v) => v - 1); setStepError(""); }} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--smc-border-strong)] px-5 text-sm font-semibold"><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back</button>
              : <Link to="/studio" className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold"><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Studio</Link>}
            {step < QUOTE_STEPS.length - 1
              ? <button type="button" onClick={nextStep} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--smc-charcoal)] px-6 text-sm font-semibold text-white">Continue <ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
              : <button type="submit" disabled={state === "saving" || !canSubmit} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" aria-hidden="true" />{state === "saving" ? "Sending…" : "Send quote request"}</button>}
          </div>
          <p className="text-xs leading-5 text-[var(--smc-charcoal-faint)]"><Building2 className="mr-1 inline h-4 w-4 align-middle" aria-hidden="true" /> Only information you choose to submit and data you're authorised to share is sent to the professional.</p>
      </form>
    </div>
  );
}
