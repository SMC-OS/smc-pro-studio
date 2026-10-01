import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import {
  isOAuthProviderEnabled,
  requestPasswordReset,
  signInWithOAuth,
  signInWithPassword,
  signUpWithPassword,
  updatePassword,
  type AccountType,
  type ProfessionalCategory,
  type SupportedOAuthProvider,
} from "../../services/authClient";
import { Button } from "./ui";

/**
 * SMC-styled sign-in / create-account / forgot-password / reset-password
 * screens. Reuses the same authClient service functions (and therefore the
 * same real Supabase logic, validation, and fail-closed OAuth behaviour) as
 * the legacy dark-themed SecureAuthPortal — that component is left
 * untouched since it's still used by the legacy dashboard in App.tsx.
 *
 * Motion: switching mode (sign in / create account / forgot / reset)
 * cross-fades the heading + form as one restrained block — a short opacity
 * + vertical-drift + scale transition, never a bounce or flip. The
 * sign-in/create-account tab pill itself stays static (it's the control,
 * not the content) so clicking it doesn't visually jump. Field values are
 * never cleared by a mode switch — they live in this component's own state,
 * not inside the animated subtree, so nothing resets. No autofocus is
 * forced on transition either, so focus stays wherever the person left it
 * rather than being yanked around by the animation. Everything collapses to
 * an instant swap under prefers-reduced-motion.
 */

const EASE_OUT: Transition["ease"] = [0.16, 1, 0.3, 1];
const EASE_IN: Transition["ease"] = [0.4, 0, 1, 1];

type Mode = "login" | "register" | "forgot" | "reset";

const PROFESSIONAL_CATEGORIES: Array<{ value: ProfessionalCategory; label: string }> = [
  { value: "architect", label: "Architect" },
  { value: "interior_designer", label: "Interior Designer" },
  { value: "stone_fabricator", label: "Stone Fabricator" },
  { value: "stone_supplier", label: "Stone Supplier" },
  { value: "installer", label: "Installer" },
  { value: "contractor", label: "Contractor" },
  { value: "developer", label: "Developer" },
  { value: "construction_professional", label: "Construction Professional" },
  { value: "other", label: "Other" },
];

const PROVIDER_LABELS: Record<SupportedOAuthProvider, string> = {
  google: "Continue with Google",
  apple: "Continue with Apple",
  facebook: "Continue with Facebook",
};

const HEADINGS: Record<Mode, { title: string; description: string }> = {
  login: { title: "Welcome back", description: "Sign in to save, share and manage your SMC Pro Studio account." },
  register: { title: "Create your account", description: "Join the SMC Pro Studio community — browse publicly as a guest, or sign in for the full experience." },
  forgot: { title: "Reset your password", description: "We'll send reset instructions to your email address." },
  reset: { title: "Choose a new password", description: "Set a new password to finish recovering your account." },
};

export default function AuthForm({
  initialMode = "login",
  lockMode = false,
  onSuccess,
}: {
  initialMode?: Mode;
  /** true on the dedicated /auth/reset-password route — no tab-switching away from "reset". */
  lockMode?: boolean;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("customer");
  const [professionalCategory, setProfessionalCategory] = useState<ProfessionalCategory>("architect");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const enterTransition: Transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.22, ease: EASE_OUT };
  const exitTransition: Transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.15, ease: EASE_IN };
  const bannerTransition: Transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.16, ease: EASE_OUT };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await signInWithPassword(email, password);
      onSuccess();
    });
  };

  const handleRegister = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (password !== confirmPassword) throw new Error("Passwords do not match.");
      if (!acceptTerms) throw new Error("Accept the Terms of Use and Privacy Policy to create an account.");
      const result = await signUpWithPassword({ email, password, displayName, accountType, professionalCategory });
      if (result.requiresEmailVerification) {
        setNotice("Check your email to verify the account before signing in.");
      } else {
        onSuccess();
      }
    });
  };

  const handleForgot = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await requestPasswordReset(email);
      setNotice("If an eligible account exists, password-reset instructions have been sent.");
    });
  };

  const handleReset = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (password !== confirmPassword) throw new Error("Passwords do not match.");
      await updatePassword(password);
      setNotice("Your password has been updated. You can continue securely.");
    });
  };

  const handleOAuth = (provider: SupportedOAuthProvider) => {
    void run(() => signInWithOAuth(provider));
  };

  const heading = HEADINGS[mode];

  return (
    <div
      className="mx-auto w-full max-w-md overflow-hidden rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)]"
      style={{ boxShadow: "var(--smc-shadow-raised)" }}
    >
      <div className="px-6 pb-8 pt-8 sm:px-8">
        <span className="inline-flex items-center gap-1.5 rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] bg-[var(--smc-limestone)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--smc-mineral-bronze)]">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Secure account access
        </span>

        {/* Static control — stays put so clicking it doesn't itself animate. */}
        {!lockMode && (mode === "login" || mode === "register") && (
          <div className="mt-4 grid grid-cols-2 rounded-[var(--smc-radius-pill)] border border-[var(--smc-border)] bg-[var(--smc-surface-sunken)] p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              aria-pressed={mode === "login"}
              className={`rounded-[var(--smc-radius-pill)] py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                mode === "login" ? "bg-[var(--smc-charcoal)] text-[var(--smc-ivory)]" : "text-[var(--smc-charcoal-faint)]"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              aria-pressed={mode === "register"}
              className={`rounded-[var(--smc-radius-pill)] py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                mode === "register" ? "bg-[var(--smc-charcoal)] text-[var(--smc-ivory)]" : "text-[var(--smc-charcoal-faint)]"
              }`}
            >
              Create account
            </button>
          </div>
        )}

        {/* Everything below animates together as one restrained block whenever `mode` changes. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: enterTransition }}
            exit={{ opacity: 0, y: -6, scale: 0.99, transition: exitTransition }}
          >
            <h1 className="smc-editorial mt-4 text-3xl font-medium text-[var(--smc-charcoal)]">{heading.title}</h1>
            <p className="mt-1.5 text-sm text-[var(--smc-charcoal-soft)]">{heading.description}</p>

            <AnimatePresence initial={false}>
              {error && (
                <motion.div
                  key="error"
                  role="alert"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0, transition: bannerTransition }}
                  exit={{ opacity: 0, y: -6, transition: bannerTransition }}
                  className="mt-5 flex gap-3 rounded-[var(--smc-radius-card)] border border-[var(--smc-mineral-clay)]/40 bg-[color-mix(in_srgb,var(--smc-mineral-clay)_8%,var(--smc-surface-raised))] p-3.5 text-sm text-[var(--smc-charcoal)]"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--smc-mineral-clay)]" aria-hidden="true" />
                  <span>{error}</span>
                </motion.div>
              )}
              {notice && (
                <motion.div
                  key="notice"
                  role="status"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0, transition: bannerTransition }}
                  exit={{ opacity: 0, y: -6, transition: bannerTransition }}
                  className="mt-5 flex gap-3 rounded-[var(--smc-radius-card)] border border-[var(--smc-mineral-slate)]/30 bg-[var(--smc-surface-sunken)] p-3.5 text-sm text-[var(--smc-charcoal)]"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--smc-mineral-slate)]" aria-hidden="true" />
                  <span>{notice}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {mode === "login" && (
              <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
                <EmailField value={email} onChange={setEmail} />
                <PasswordField label="Password" value={password} onChange={setPassword} shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                <div className="flex justify-end">
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs font-semibold text-[var(--smc-mineral-bronze)] hover:underline">
                    Forgot password?
                  </button>
                </div>
                <SubmitButton busy={busy}>Sign in securely</SubmitButton>
              </form>
            )}

            {mode === "register" && (
              <form onSubmit={handleRegister} className="mt-6 flex flex-col gap-4">
                <TextField label="Full name" value={displayName} onChange={setDisplayName} autoComplete="name" maxLength={100} />
                <fieldset>
                  <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--smc-charcoal-soft)]">How will you use SMC Pro Studio?</legend>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(["customer", "professional"] as AccountType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAccountType(type)}
                        aria-pressed={accountType === type}
                        className={`rounded-[var(--smc-radius-card)] border px-4 py-3 text-sm font-semibold capitalize transition-colors ${
                          accountType === type
                            ? "border-[var(--smc-mineral-bronze)] bg-[var(--smc-limestone)] text-[var(--smc-charcoal)]"
                            : "border-[var(--smc-border)] text-[var(--smc-charcoal-soft)]"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {accountType === "professional" && (
                  <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--smc-charcoal-soft)]">
                    Professional category
                    <select
                      value={professionalCategory}
                      onChange={(event) => setProfessionalCategory(event.target.value as ProfessionalCategory)}
                      className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] px-4 py-3 text-sm font-normal normal-case text-[var(--smc-charcoal)]"
                    >
                      {PROFESSIONAL_CATEGORIES.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    <span className="mt-0.5 text-[11px] font-normal normal-case text-[var(--smc-charcoal-faint)]">
                      This describes your profile and never grants staff or administrative access.
                    </span>
                  </label>
                )}
                <EmailField value={email} onChange={setEmail} />
                <PasswordField label="Password (minimum 8 characters)" value={password} onChange={setPassword} shown={showPassword} onToggle={() => setShowPassword(!showPassword)} autoComplete="new-password" />
                <PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} shown={showPassword} onToggle={() => setShowPassword(!showPassword)} autoComplete="new-password" />
                <label className="flex items-start gap-3 text-xs text-[var(--smc-charcoal-faint)]">
                  <input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} className="mt-0.5" />
                  <span>
                    I accept the{" "}
                    <Link to="/terms" className="font-semibold underline underline-offset-2">
                      Terms of Use
                    </Link>{" "}
                    and{" "}
                    <Link to="/community-guidelines" className="font-semibold underline underline-offset-2">
                      Community Guidelines
                    </Link>
                    , and I have read the{" "}
                    <Link to="/privacy" className="font-semibold underline underline-offset-2">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                <SubmitButton busy={busy}>Create account</SubmitButton>
              </form>
            )}

            {mode === "forgot" && (
              <form onSubmit={handleForgot} className="mt-6 flex flex-col gap-4">
                <EmailField value={email} onChange={setEmail} />
                <SubmitButton busy={busy}>Send reset instructions</SubmitButton>
                <button type="button" onClick={() => setMode("login")} className="text-center text-xs font-semibold text-[var(--smc-charcoal-faint)] hover:text-[var(--smc-charcoal)]">
                  Back to sign in
                </button>
              </form>
            )}

            {mode === "reset" && (
              <form onSubmit={handleReset} className="mt-6 flex flex-col gap-4">
                <PasswordField label="New password (minimum 8 characters)" value={password} onChange={setPassword} shown={showPassword} onToggle={() => setShowPassword(!showPassword)} autoComplete="new-password" />
                <PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} shown={showPassword} onToggle={() => setShowPassword(!showPassword)} autoComplete="new-password" />
                <SubmitButton busy={busy}>Update password</SubmitButton>
              </form>
            )}

            {(mode === "login" || mode === "register") && (
              <div className="mt-7 border-t border-[var(--smc-border)] pt-6">
                <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--smc-charcoal-faint)]">Or continue with</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(["google", "apple", "facebook"] as SupportedOAuthProvider[]).map((provider) => {
                    const enabled = isOAuthProviderEnabled(provider);
                    return (
                      <button
                        key={provider}
                        type="button"
                        disabled={!enabled || busy}
                        onClick={() => handleOAuth(provider)}
                        title={enabled ? PROVIDER_LABELS[provider] : `${PROVIDER_LABELS[provider]} is not configured`}
                        className="min-h-[44px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-sunken)] px-3 py-3 text-xs font-semibold text-[var(--smc-charcoal-soft)] transition-colors hover:bg-[var(--smc-limestone)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {PROVIDER_LABELS[provider]}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-center text-[11px] text-[var(--smc-charcoal-faint)]">
                  Providers remain disabled until SMC-owned credentials and redirect settings are configured and tested.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  autoComplete,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--smc-charcoal-soft)]">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        maxLength={maxLength}
        required
        className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] px-4 py-3 text-sm font-normal normal-case text-[var(--smc-charcoal)] focus:border-[var(--smc-mineral-bronze)] focus:outline-none"
      />
    </label>
  );
}

function EmailField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--smc-charcoal-soft)]">
      Email address
      <div className="relative">
        <input
          type="email"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="email"
          maxLength={254}
          required
          className="w-full rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] px-4 py-3 pr-10 text-sm font-normal normal-case text-[var(--smc-charcoal)] focus:border-[var(--smc-mineral-bronze)] focus:outline-none"
        />
        <Mail className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-[var(--smc-charcoal-faint)]" aria-hidden="true" />
      </div>
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  shown,
  onToggle,
  autoComplete = "current-password",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  shown: boolean;
  onToggle: () => void;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--smc-charcoal-soft)]">
      {label}
      <div className="relative">
        <input
          type={shown ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          minLength={8}
          maxLength={1024}
          required
          className="w-full rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] px-4 py-3 pr-10 text-sm font-normal normal-case text-[var(--smc-charcoal)] focus:border-[var(--smc-mineral-bronze)] focus:outline-none"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={shown ? "Hide password" : "Show password"}
          className="absolute right-3 top-2.5 rounded p-1 text-[var(--smc-charcoal-faint)] hover:text-[var(--smc-charcoal)]"
        >
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  const transition: Transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.12 };
  return (
    <Button type="submit" disabled={busy} className="w-full uppercase tracking-wider">
      <Lock className="h-4 w-4" aria-hidden="true" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={busy ? "busy" : "idle"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition }}
          exit={{ opacity: 0, transition }}
        >
          {busy ? "Please wait…" : children}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
