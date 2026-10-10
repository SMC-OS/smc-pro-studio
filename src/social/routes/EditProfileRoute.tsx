import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { Button, Card, SectionHeading } from "../components/ui";
import { fetchOwnProfessionalProfile, fetchOwnProfile, type OwnProfessionalProfile, type OwnProfile } from "../services/socialClient";
import {
  PROFESSIONAL_CATEGORY_OPTIONS,
  PROFILE_LIMITS,
  ProfileValidationError,
  missingForCompletion,
  saveOwnProfile,
  type EditableProfessionalCategory,
  type ProfileVisibility,
} from "../services/profileClient";
import { useAuthSession } from "../services/useAuthSession";
import { describeError } from "../services/networkErrors";

/**
 * V1-1: `/profile/edit` — the owner edits their own profile. For a
 * professional, adding a profession and a service area completes onboarding,
 * which is what makes them discoverable in Network search. Form values are
 * kept on any failure; nothing is shown as saved until the database confirms.
 */

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; profile: OwnProfile; professional: OwnProfessionalProfile | null };

interface FormValues {
  displayName: string;
  username: string;
  bio: string;
  visibility: ProfileVisibility;
  category: string;
  companyName: string;
  serviceArea: string;
  servicesText: string;
  websiteUrl: string;
}

const EDITABLE = new Set<string>(PROFESSIONAL_CATEGORY_OPTIONS.map((o) => o.value));

const inputClass =
  "rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-sunken)] p-3 text-base text-[var(--smc-charcoal)] focus:border-[var(--smc-mineral-bronze)] focus:outline-none aria-[invalid=true]:border-[var(--smc-mineral-clay)]";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-[var(--smc-charcoal)]";
const hintClass = "font-normal text-[var(--smc-charcoal-faint)]";

function toForm(profile: OwnProfile, professional: OwnProfessionalProfile | null): FormValues {
  return {
    displayName: profile.display_name,
    username: profile.username ?? "",
    bio: profile.bio ?? "",
    visibility: profile.visibility,
    category: professional?.category ?? "",
    companyName: professional?.company_name ?? "",
    serviceArea: professional?.service_area ?? "",
    servicesText: (professional?.services ?? []).join(", "),
    websiteUrl: professional?.website_url ?? "",
  };
}

const MISSING_LABELS = { displayName: "a display name", category: "your profession", serviceArea: "your service area" } as const;

export default function EditProfileRoute() {
  const auth = useAuthSession();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [form, setForm] = useState<FormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<{ field: string | null; message: string; isNetwork: boolean } | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const load = useCallback(() => {
    if (auth.status !== "authenticated") return;
    setState({ status: "loading" });
    Promise.all([fetchOwnProfile(), fetchOwnProfessionalProfile()])
      .then(([profile, professional]) => {
        if (!profile) {
          setState({ status: "error", message: "Your profile record could not be found." });
          return;
        }
        setState({ status: "ready", profile, professional });
        setForm(toForm(profile, professional));
      })
      .catch((error: unknown) =>
        setState({ status: "error", message: describeError(error, "Your profile could not be loaded.").message }),
      );
  }, [auth.status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (formError) errorRef.current?.focus();
  }, [formError]);

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") {
    return (
      <EmptyState
        title="Sign in to edit your profile"
        description="Your profile is how professionals and customers find you."
        action={
          <Link to="/auth" className="text-sm font-semibold text-[var(--smc-mineral-bronze)] underline">
            Sign in
          </Link>
        }
      />
    );
  }
  if (state.status === "loading" || !form) {
    if (state.status === "error") return <ErrorState message={state.message} onRetry={load} />;
    return <LoadingState label="Loading your profile" />;
  }
  if (state.status === "error") return <ErrorState message={state.message} onRetry={load} />;

  const isProfessional = state.profile.account_type === "professional";
  // A category outside the editable list (e.g. staff-assigned) is shown but not changeable here.
  const lockedCategory = isProfessional && form.category !== "" && !EDITABLE.has(form.category);
  const missing = missingForCompletion({
    accountType: state.profile.account_type,
    displayName: form.displayName,
    category: form.category || null,
    serviceArea: form.serviceArea,
  });
  const set = (patch: Partial<FormValues>) => setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  const invalid = (field: string) => (formError?.field === field ? true : undefined);

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    if (saving || !form || state.status !== "ready") return;
    setSaving(true);
    setFormError(null);
    try {
      await saveOwnProfile({
        accountType: state.profile.account_type,
        profile: { displayName: form.displayName, username: form.username, bio: form.bio, visibility: form.visibility },
        professional: isProfessional
          ? {
              category: lockedCategory || form.category === "" ? undefined : (form.category as EditableProfessionalCategory),
              companyName: form.companyName,
              serviceArea: form.serviceArea,
              services: form.servicesText.split(","),
              websiteUrl: form.websiteUrl,
            }
          : undefined,
      });
      navigate("/profile", { state: { profileSaved: true } });
    } catch (caught) {
      // Every typed value stays in the form. A profile save is an idempotent
      // update, so after a connection failure the same values can safely be
      // sent again with "Try again" (only ever on the member's own click).
      const described = describeError(caught, "Your profile could not be saved.");
      setFormError({
        field: caught instanceof ProfileValidationError ? caught.field : null,
        message: described.message,
        isNetwork: described.isNetwork,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        eyebrow="Profile"
        title="Edit profile"
        description={
          isProfessional
            ? "Add your profession and where you work so customers and other professionals can find you in the Network."
            : "Tell professionals a little about yourself."
        }
      />

      {isProfessional && !state.profile.onboarding_completed && (
        <p className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border-strong)] bg-[var(--smc-limestone)] px-4 py-3 text-sm text-[var(--smc-charcoal)]">
          {missing.length > 0
            ? `To appear in Network search, add ${missing.map((m) => MISSING_LABELS[m]).join(" and ")}.`
            : "Save to complete your profile and appear in Network search."}
        </p>
      )}

      <Card className="p-5">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {formError && (
            <div className="flex flex-col gap-2 rounded-[var(--smc-radius-card)] border border-[var(--smc-mineral-clay)]/40 px-4 py-2.5">
              <p ref={errorRef} tabIndex={-1} role="alert" className="text-sm text-[var(--smc-charcoal)] outline-none">
                {formError.message}
              </p>
              {formError.isNetwork && (
                <Button type="button" variant="secondary" className="self-start" disabled={saving} onClick={() => void handleSubmit()}>
                  {saving ? "Saving…" : "Try again"}
                </Button>
              )}
            </div>
          )}

          <label className={labelClass}>
            Display name
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => set({ displayName: e.target.value })}
              maxLength={PROFILE_LIMITS.displayName}
              autoComplete="name"
              required
              aria-invalid={invalid("displayName")}
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span>
              Username <span className={hintClass}>(optional)</span>
            </span>
            <input
              type="text"
              value={form.username}
              onChange={(e) => set({ username: e.target.value })}
              maxLength={30}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="e.g. alder.stone"
              aria-invalid={invalid("username")}
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span>
              Bio <span className={hintClass}>(optional, up to {PROFILE_LIMITS.bio} characters)</span>
            </span>
            <textarea
              value={form.bio}
              onChange={(e) => set({ bio: e.target.value })}
              maxLength={PROFILE_LIMITS.bio}
              rows={3}
              aria-invalid={invalid("bio")}
              className={inputClass}
            />
          </label>

          {isProfessional && (
            <fieldset className="flex flex-col gap-4 border-t border-[var(--smc-border)] pt-4">
              <legend className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--smc-mineral-bronze)]">
                Professional details
              </legend>
              {lockedCategory ? (
                <p className="text-sm text-[var(--smc-charcoal-soft)]">
                  Your profession is set by the SMC team and can't be changed here.
                </p>
              ) : (
                <label className={labelClass}>
                  Profession
                  <select
                    value={form.category}
                    onChange={(e) => set({ category: e.target.value })}
                    aria-invalid={invalid("category")}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Choose your profession
                    </option>
                    {PROFESSIONAL_CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className={labelClass}>
                Service area
                <input
                  type="text"
                  value={form.serviceArea}
                  onChange={(e) => set({ serviceArea: e.target.value })}
                  maxLength={PROFILE_LIMITS.serviceArea}
                  placeholder="e.g. Leeds and West Yorkshire"
                  aria-invalid={invalid("serviceArea")}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                <span>
                  Company name <span className={hintClass}>(optional)</span>
                </span>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => set({ companyName: e.target.value })}
                  maxLength={PROFILE_LIMITS.companyName}
                  autoComplete="organization"
                  aria-invalid={invalid("companyName")}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                <span>
                  Services <span className={hintClass}>(optional, comma-separated, up to {PROFILE_LIMITS.services})</span>
                </span>
                <input
                  type="text"
                  value={form.servicesText}
                  onChange={(e) => set({ servicesText: e.target.value })}
                  placeholder="Templating, Fabrication, Installation"
                  aria-invalid={invalid("services")}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                <span>
                  Website <span className={hintClass}>(optional)</span>
                </span>
                <input
                  type="url"
                  inputMode="url"
                  value={form.websiteUrl}
                  onChange={(e) => set({ websiteUrl: e.target.value })}
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="https://"
                  aria-invalid={invalid("websiteUrl")}
                  className={inputClass}
                />
              </label>
            </fieldset>
          )}

          <fieldset className="flex flex-col gap-2 border-t border-[var(--smc-border)] pt-4">
            <legend className="text-sm font-medium text-[var(--smc-charcoal)]">Who can see your profile</legend>
            {(
              [
                ["public", "Everyone", "Your profile can be found and viewed by anyone, including people who aren't signed in."],
                ["private", "Only you", "Your profile is hidden from everyone else and from Network search."],
              ] as const
            ).map(([value, label, description]) => (
              <label key={value} className="flex min-h-[44px] items-start gap-3 text-sm text-[var(--smc-charcoal)]">
                <input
                  type="radio"
                  name="visibility"
                  value={value}
                  checked={form.visibility === value}
                  onChange={() => set({ visibility: value })}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold">{label}</span>
                  <span className="block text-[var(--smc-charcoal-faint)]">{description}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
            <Link
              to="/profile"
              className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 text-sm font-semibold text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
