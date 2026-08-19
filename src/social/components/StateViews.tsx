import type { ReactNode } from "react";

/**
 * Shared honest loading / empty / error primitives for Phase 3 screens.
 * DESIGN.md: "Empty: 'No stories yet' ... never synthetic content." /
 * "Failure: explain what failed, preserve user input, offer retry when safe."
 */

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--smc-charcoal-faint)]">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--smc-border-strong)] border-t-[var(--smc-charcoal)]" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] px-6 py-14 text-center">
      <p className="text-base font-semibold text-[var(--smc-charcoal)]">{title}</p>
      {description && <p className="max-w-sm text-sm text-[var(--smc-charcoal-soft)]">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-[var(--smc-radius-card)] border border-[var(--smc-mineral-clay)]/40 bg-[var(--smc-surface-raised)] px-6 py-10 text-center">
      <p className="text-sm font-medium text-[var(--smc-charcoal)]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-[var(--smc-radius-pill)] border border-[var(--smc-border-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)]"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function GuestNotice({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-limestone)] px-4 py-3 text-sm text-[var(--smc-charcoal-soft)]">
      {message}
    </div>
  );
}
