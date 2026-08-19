import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";

/**
 * Reusable segmented one-time-code input. This is a UI foundation only —
 * SMC Pro Studio's live Supabase auth (see services/authClient.ts) does not
 * currently issue or verify OTP codes anywhere (email/password + deferred
 * OAuth only), so nothing wires this to a real verification call. It exists
 * so a future OTP flow (email code, SMS, authenticator step-up) has a
 * finished, accessible, on-brand input ready to drop in — it never
 * simulates a successful verification itself; that's entirely up to
 * whatever backend call a future consumer wires to `onComplete`.
 *
 * Motion: the focused cell gets a small border-emphasis + lift, a digit
 * fades/scales in very slightly as it's entered, and an `invalid` cell set
 * plays one short restrained horizontal shake — never a bounce. Everything
 * collapses to instant state changes under prefers-reduced-motion.
 */

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  label = "Verification code",
  disabled = false,
  loading = false,
  invalid = false,
  autoFocus = false,
}: OtpInputProps) {
  const prefersReducedMotion = useReducedMotion();
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [poppedIndex, setPoppedIndex] = useState<number | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const lastInvalid = useRef(invalid);
  const popTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function popDigit(index: number) {
    setPoppedIndex(index);
    if (popTimeout.current) clearTimeout(popTimeout.current);
    popTimeout.current = setTimeout(() => setPoppedIndex(null), 160);
  }

  useEffect(() => () => {
    if (popTimeout.current) clearTimeout(popTimeout.current);
  }, []);

  useEffect(() => {
    if (invalid && !lastInvalid.current) setShakeKey((k) => k + 1);
    lastInvalid.current = invalid;
  }, [invalid]);

  useEffect(() => {
    if (autoFocus) inputRefs.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setDigitAt(index: number, char: string) {
    const next = digits.slice();
    next[index] = char;
    const joined = next.join("").slice(0, length);
    onChange(joined);
    if (joined.length === length && next.every((d) => d !== "")) onComplete?.(joined);
  }

  function handleChange(index: number, raw: string) {
    const sanitized = raw.replace(/\D/g, "");
    if (!sanitized) {
      setDigitAt(index, "");
      return;
    }
    // Mobile keyboards / autofill sometimes deliver more than one character
    // to a single cell — take the last one typed and let paste handling
    // (below) own the "distribute many digits across cells" case.
    const char = sanitized[sanitized.length - 1];
    setDigitAt(index, char);
    popDigit(index);
    if (index < length - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      if (digits[index]) {
        setDigitAt(index, "");
        return;
      }
      if (index > 0) {
        event.preventDefault();
        setDigitAt(index - 1, "");
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    event.preventDefault();
    const next = digits.slice();
    let cursor = index;
    for (const char of pasted) {
      if (cursor >= length) break;
      next[cursor] = char;
      cursor += 1;
    }
    const joined = next.join("").slice(0, length);
    onChange(joined);
    const lastFilled = Math.min(cursor - 1, length - 1);
    if (lastFilled >= index) popDigit(lastFilled);
    const focusIndex = Math.min(cursor, length - 1);
    inputRefs.current[focusIndex]?.focus();
    if (joined.length === length && next.every((d) => d !== "")) onComplete?.(joined);
  }

  const shakeTransition: Transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.36, ease: "easeInOut" };
  const digitTransition: Transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.14, ease: "easeOut" };

  return (
    <div role="group" aria-label={label}>
      <motion.div
        key={shakeKey}
        className="flex gap-2"
        animate={
          invalid && !prefersReducedMotion
            ? { x: [0, -6, 6, -4, 4, 0] }
            : { x: 0 }
        }
        transition={shakeTransition}
      >
        {digits.map((digit, index) => (
          <motion.div
            key={index}
            animate={{
              y: !prefersReducedMotion && focusedIndex === index ? -2 : 0,
              scale: !prefersReducedMotion && poppedIndex === index ? [0.86, 1] : 1,
              boxShadow:
                !prefersReducedMotion && focusedIndex === index
                  ? "0 6px 14px -6px rgba(138, 106, 69, 0.35)"
                  : "0 0 0 rgba(0,0,0,0)",
            }}
            transition={poppedIndex === index ? digitTransition : { duration: 0.15 }}
          >
            <input
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              disabled={disabled || loading}
              aria-label={`${label}, digit ${index + 1} of ${length}`}
              aria-invalid={invalid || undefined}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={(event) => handlePaste(index, event)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex((current) => (current === index ? null : current))}
              className={`h-12 w-10 rounded-[var(--smc-radius-card)] border bg-[var(--smc-surface-raised)] text-center text-lg font-semibold text-[var(--smc-charcoal)] outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                invalid
                  ? "border-[var(--smc-mineral-clay)]"
                  : focusedIndex === index
                    ? "border-[var(--smc-mineral-bronze)]"
                    : "border-[var(--smc-border)]"
              }`}
            />
          </motion.div>
        ))}
      </motion.div>
      <p aria-live="polite" className="sr-only">
        {invalid ? "The code entered was not accepted." : loading ? "Verifying code." : ""}
      </p>
    </div>
  );
}
