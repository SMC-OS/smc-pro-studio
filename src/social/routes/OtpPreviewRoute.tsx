import { useState } from "react";
import { OtpInput } from "../components/OtpInput";
import { Card, SectionHeading } from "../components/ui";

/**
 * Design/QA preview for the reusable OtpInput component. Dev-only — see
 * SocialApp.tsx, which only registers this route when `import.meta.env.DEV`
 * is true, so it's excluded entirely from production builds (verify with
 * `grep -r "otp-preview" dist/` after `npm run build`: nothing should
 * match). Not linked from any navigation. There is no live OTP backend to
 * call here — "Simulate invalid code" just flips the `invalid` prop so the
 * shake/error styling can be reviewed; it never claims a real code was
 * checked or verified.
 */
export default function OtpPreviewRoute() {
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading
        eyebrow="Dev preview — not in production"
        title="OTP input component"
        description="This route only exists in local development. No backend call happens here — it's a component review surface."
      />
      <Card className="p-6">
        <OtpInput
          value={code}
          onChange={(next) => {
            setCode(next);
            setInvalid(false);
            setCompleted(null);
          }}
          onComplete={(next) => setCompleted(next)}
          invalid={invalid}
          loading={loading}
          label="Verification code"
        />
        <p className="mt-4 text-sm text-[var(--smc-charcoal-soft)]">Current value: {code || "(empty)"}</p>
        {completed && <p className="mt-1 text-sm text-[var(--smc-mineral-bronze)]">onComplete fired with: {completed}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setInvalid(true)}
            className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-3 py-2 text-xs font-semibold"
          >
            Simulate invalid code (shake)
          </button>
          <button
            type="button"
            onClick={() => setLoading((v) => !v)}
            className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-3 py-2 text-xs font-semibold"
          >
            Toggle loading/disabled
          </button>
          <button
            type="button"
            onClick={() => {
              setCode("");
              setInvalid(false);
              setCompleted(null);
            }}
            className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-3 py-2 text-xs font-semibold"
          >
            Reset
          </button>
        </div>
      </Card>
    </div>
  );
}
