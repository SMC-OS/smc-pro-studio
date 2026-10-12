import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, X } from "lucide-react";
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
} from "../services/authClient";

interface SecureAuthPortalProps {
  onLoginSuccess: (email: string) => void;
  onNavigateLanding?: () => void;
  onClose?: () => void;
  initialMode?: "login" | "register" | "forgot" | "reset";
}

const professionalCategories: Array<{ value: ProfessionalCategory; label: string }> = [
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

const providerLabels: Record<SupportedOAuthProvider, string> = {
  google: "Continue with Google",
  apple: "Continue with Apple",
  facebook: "Continue with Facebook",
};

export default function SecureAuthPortal({ onLoginSuccess, onNavigateLanding, onClose, initialMode = "login" }: SecureAuthPortalProps) {
  const [mode, setMode] = useState(initialMode);
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

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await signInWithPassword(email, password);
      onLoginSuccess(email.trim().toLowerCase());
    });
  };

  const handleRegister = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (password !== confirmPassword) throw new Error("Passwords do not match.");
      if (!acceptTerms) throw new Error("Accept the Terms and Privacy Notice to create an account.");
      const result = await signUpWithPassword({ email, password, displayName, accountType, professionalCategory });
      if (result.requiresEmailVerification) {
        setNotice("Check your email to verify the account before signing in.");
      } else {
        onLoginSuccess(email.trim().toLowerCase());
      }
    });
  };

  const handleForgot = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await requestPasswordReset(email);
      setNotice("If an eligible account exists, password-reset instructions have been sent.");
    });
  };

  const handleReset = (event: React.FormEvent) => {
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

  return (
    <div className="relative min-h-[min(780px,95vh)] overflow-y-auto rounded-2xl border border-neutral-800 bg-[#121212] text-neutral-100 shadow-2xl">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-neutral-800 bg-[#121212]/95 px-6 backdrop-blur-xl">
        <button type="button" onClick={onNavigateLanding} className="flex items-center gap-3 text-left">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold bg-gold/10 font-serif text-xs font-bold text-gold">SMC</span>
          <span><strong className="block font-serif text-sm tracking-widest text-gold">SMC PRO</strong><small className="text-[10px] uppercase tracking-wider text-neutral-400">Secure account access</small></span>
        </button>
        {onClose && <button type="button" onClick={onClose} aria-label="Close authentication" className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"><X className="h-5 w-5" /></button>}
      </header>

      <main className="mx-auto max-w-xl px-5 py-8 md:px-10">
        <div className="mb-7 text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gold"><ShieldCheck className="h-3.5 w-3.5" /> Supabase authentication</span>
          <h1 className="font-serif text-3xl font-bold text-white">
            {mode === "login" && "Sign in"}{mode === "register" && "Create your account"}{mode === "forgot" && "Reset your password"}{mode === "reset" && "Choose a new password"}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">Browse publicly as a guest, or sign in to save, collaborate and manage private work.</p>
        </div>

        {(mode === "login" || mode === "register") && (
          <div className="mb-6 grid grid-cols-2 rounded-xl border border-neutral-800 bg-neutral-900 p-1">
            <button type="button" onClick={() => setMode("login")} className={`rounded-lg py-2.5 text-xs font-bold ${mode === "login" ? "bg-gold text-neutral-950" : "text-neutral-400"}`}>SIGN IN</button>
            <button type="button" onClick={() => setMode("register")} className={`rounded-lg py-2.5 text-xs font-bold ${mode === "register" ? "bg-gold text-neutral-950" : "text-neutral-400"}`}>CREATE ACCOUNT</button>
          </div>
        )}

        {error && <div role="alert" className="mb-5 flex gap-3 rounded-xl border border-red-500/40 bg-red-950/60 p-4 text-sm text-red-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" /><span>{error}</span></div>}
        {notice && <div role="status" className="mb-5 flex gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/50 p-4 text-sm text-emerald-100"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /><span>{notice}</span></div>}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <EmailField value={email} onChange={setEmail} />
            <PasswordField label="Password" value={password} onChange={setPassword} shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />
            <div className="flex justify-end"><button type="button" onClick={() => setMode("forgot")} className="text-xs text-gold hover:underline">Forgot password?</button></div>
            <SubmitButton busy={busy}>Sign in securely</SubmitButton>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">Full name<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100} autoComplete="name" required className="mt-1.5 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-white" /></label>
            <fieldset><legend className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-300">How will you use SMC Pro Studio?</legend><div className="grid grid-cols-2 gap-3">{(["customer", "professional"] as AccountType[]).map((type) => <button key={type} type="button" onClick={() => setAccountType(type)} aria-pressed={accountType === type} className={`rounded-xl border px-4 py-3 text-sm font-bold capitalize ${accountType === type ? "border-gold bg-gold/10 text-gold" : "border-neutral-700 text-neutral-300"}`}>{type}</button>)}</div></fieldset>
            {accountType === "professional" && <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">Professional category<select value={professionalCategory} onChange={(e) => setProfessionalCategory(e.target.value as ProfessionalCategory)} className="mt-1.5 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-white">{professionalCategories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select><span className="mt-1.5 block text-[11px] normal-case font-normal text-neutral-500">This describes your profile and never grants staff or administrative access.</span></label>}
            <EmailField value={email} onChange={setEmail} />
            <PasswordField label="Password (minimum 8 characters)" value={password} onChange={setPassword} shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />
            <PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />
            <p className="text-xs text-neutral-500">Long passwords and passphrases are supported. Avoid reused or easily guessed passwords.</p>
            <label className="flex items-start gap-3 text-xs text-neutral-400"><input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5" /><span>I accept the Terms of Use and acknowledge the Privacy Notice. Both require final legal review before public beta.</span></label>
            <SubmitButton busy={busy}>Create account</SubmitButton>
          </form>
        )}

        {mode === "forgot" && <form onSubmit={handleForgot} className="space-y-4"><EmailField value={email} onChange={setEmail} /><SubmitButton busy={busy}>Send reset instructions</SubmitButton><button type="button" onClick={() => setMode("login")} className="w-full text-xs text-neutral-400 hover:text-white">Back to sign in</button></form>}
        {mode === "reset" && <form onSubmit={handleReset} className="space-y-4"><PasswordField label="New password (minimum 8 characters)" value={password} onChange={setPassword} shown={showPassword} onToggle={() => setShowPassword(!showPassword)} /><PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} shown={showPassword} onToggle={() => setShowPassword(!showPassword)} /><SubmitButton busy={busy}>Update password</SubmitButton></form>}

        {(mode === "login" || mode === "register") && <div className="mt-7 border-t border-neutral-800 pt-6"><p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-500">Or continue with</p><div className="grid gap-2 sm:grid-cols-3">{(["google", "apple", "facebook"] as SupportedOAuthProvider[]).map((provider) => { const enabled = isOAuthProviderEnabled(provider); return <button key={provider} type="button" disabled={!enabled || busy} onClick={() => handleOAuth(provider)} title={enabled ? providerLabels[provider] : `${providerLabels[provider]} is not configured`} className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-3 text-xs font-semibold text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40">{providerLabels[provider]}</button>; })}</div><p className="mt-3 text-center text-[11px] text-neutral-500">Providers remain disabled until SMC-owned credentials and redirect settings are configured and tested.</p></div>}
      </main>
    </div>
  );
}

function EmailField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">Email address<div className="relative mt-1.5"><input type="email" value={value} onChange={(e) => onChange(e.target.value)} autoComplete="email" maxLength={254} required className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 pr-10 text-sm text-white" /><Mail className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-neutral-500" /></div></label>;
}

function PasswordField({ label, value, onChange, shown, onToggle }: { label: string; value: string; onChange: (value: string) => void; shown: boolean; onToggle: () => void }) {
  return <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">{label}<div className="relative mt-1.5"><input type={shown ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="current-password" minLength={8} maxLength={1024} required className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 pr-10 text-sm text-white" /><button type="button" onClick={onToggle} aria-label={shown ? "Hide password" : "Show password"} className="absolute right-3 top-3 rounded p-1 text-neutral-500 hover:text-white">{shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>;
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-xs font-bold uppercase tracking-wider text-neutral-950 disabled:opacity-50"><Lock className="h-4 w-4" />{busy ? "Please wait…" : children}</button>;
}
