import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

/**
 * Shared visual primitives for the Phase 3 social shell. Nothing here
 * touches the legacy gold/dark theme in App.tsx — these are scoped by
 * being used only inside `.smc-shell` (see tokens.css) and by consuming
 * only `--smc-*` custom properties.
 *
 * Kept deliberately small: a handful of primitives every restyled screen
 * shares (Card, Avatar, Button, SectionHeading, Chip) rather than a large
 * bespoke component library.
 */

export function EditorialHeading({
  as: Tag = "h1",
  children,
  className = "",
}: {
  as?: "h1" | "h2" | "h3";
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tag className={`smc-editorial font-medium text-[var(--smc-charcoal)] ${className}`}>
      {children}
    </Tag>
  );
}

export function Card({
  as: Tag = "div",
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "div" | "article" | "li" }) {
  return (
    <Tag
      className={`rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-[var(--smc-surface-raised)] ${className}`}
      style={{ boxShadow: "var(--smc-shadow-soft)" }}
      {...props}
    />
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--smc-radius-pill)] px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-[var(--smc-charcoal)] text-[var(--smc-ivory)] hover:bg-[var(--smc-charcoal-soft)]",
    secondary: "border border-[var(--smc-border-strong)] text-[var(--smc-charcoal)] hover:bg-[var(--smc-limestone)]",
    ghost: "text-[var(--smc-charcoal-soft)] hover:bg-[var(--smc-limestone)]",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Avatar({
  name,
  size = 40,
}: {
  name: string;
  size?: number;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "S";

  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-[var(--smc-charcoal)]"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: "linear-gradient(150deg, var(--smc-travertine), var(--smc-sand))",
        border: "1px solid var(--smc-border-strong)",
      }}
    >
      {initials}
    </span>
  );
}

export function Chip({
  active = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`min-h-[36px] shrink-0 rounded-[var(--smc-radius-pill)] border px-3.5 text-xs font-semibold tracking-wide transition-colors ${
        active
          ? "border-[var(--smc-mineral-bronze)] bg-[var(--smc-mineral-bronze)] text-[var(--smc-ivory)]"
          : "border-[var(--smc-border-strong)] bg-[var(--smc-surface-raised)] text-[var(--smc-charcoal-soft)] hover:bg-[var(--smc-limestone)]"
      } ${className}`}
      {...props}
    />
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--smc-mineral-bronze)]">
          {eyebrow}
        </p>
      )}
      <EditorialHeading as="h1" className="mt-0.5 text-2xl">
        {title}
      </EditorialHeading>
      {description && <p className="mt-1.5 text-sm text-[var(--smc-charcoal-soft)]">{description}</p>}
    </div>
  );
}
