import { Link } from "react-router-dom";
import { Card, SectionHeading } from "../components/ui";
import { DRAFT_NOTICE, type LegalDocument } from "../legal/documents";

/**
 * Renders a Privacy Policy / Terms of Use document. Public: never reads auth
 * state, so it can be opened from signup, Settings, store listings or a
 * browser without signing in.
 */
const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

export default function LegalDocumentRoute({ document }: { document: LegalDocument }) {
  return (
    <article className="flex flex-col gap-4">
      <SectionHeading eyebrow="SMC Pro Studio" title={document.title} description={document.summary} />
      {document.status === "draft" && (
        <p
          role="note"
          className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border-strong)] bg-[var(--smc-limestone)] px-4 py-3 text-sm text-[var(--smc-charcoal)]"
        >
          {DRAFT_NOTICE}
        </p>
      )}
      <p className="text-xs text-[var(--smc-charcoal-faint)]">Last updated {formatDate(document.lastUpdated)}</p>
      <Card className="flex flex-col gap-6 p-5">
        {document.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-2">
            <h2 className="smc-editorial text-base font-medium text-[var(--smc-charcoal)]">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-[var(--smc-charcoal-soft)]">
                {paragraph}
              </p>
            ))}
            {section.bullets && (
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--smc-charcoal-soft)]">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
            {section.links && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {section.links.map((link) => (
                  <Link key={link.to} to={link.to} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[var(--smc-mineral-bronze)] underline underline-offset-2">
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </section>
        ))}
      </Card>
    </article>
  );
}
