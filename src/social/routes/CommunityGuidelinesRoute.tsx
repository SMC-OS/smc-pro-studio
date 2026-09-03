import { Card, EditorialHeading, SectionHeading } from "../components/ui";

/**
 * Phase 4 Community Guidelines page — `/community-guidelines`.
 *
 * Deliberately public and guest-accessible: unlike every other route in
 * this shell, this component reads no auth state at all and renders
 * unconditionally, so it can never redirect to sign-in and never shows a
 * loading state — the same reasoning that already makes Terms/Privacy
 * content public in the legacy app. Static content only; no data fetch, no
 * mutation, no service import.
 *
 * Content status: interim, owner-approved for use ahead of public beta,
 * pending final UK legal review — stated explicitly on the page itself
 * rather than only in this comment, so the reader (not just future
 * engineers) sees the same caveat. Do not remove the "pending legal
 * review" language when editing this file; only replace it once that
 * review has actually happened.
 *
 * Every claim on this page is deliberately scoped to what the product
 * actually does today:
 * - No anonymity, guaranteed action, response time, or individual outcome
 *   notification is promised anywhere below (see the moderation client's
 *   own SAFE_* error-text discipline for the same "never promise more
 *   than the backend can honour" rule applied to error copy).
 * - Hide/Restore is described as message-only, tied to a resolved message
 *   report — profile/post/comment/account enforcement does not exist yet
 *   (see moderate_reported_message()'s own target_kind = 'message' gate),
 *   and this page must never imply otherwise.
 * - The report-category enum is unchanged; "privacy violations" has no
 *   dedicated category yet, so this page says plainly to use "Something
 *   else" for now, rather than pretending a category exists that doesn't.
 */

const EFFECTIVE_DATE = "3 September 2026";
const SAFETY_CONTACT_EMAIL = "smcprostudio@outlook.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <EditorialHeading as="h2" className="text-lg">
        {title}
      </EditorialHeading>
      <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-[var(--smc-charcoal-soft)]">{children}</div>
    </Card>
  );
}

export default function CommunityGuidelinesRoute() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionHeading eyebrow="Safety" title="Community Guidelines" />
        <p
          role="status"
          className="mt-3 rounded-[var(--smc-radius-card)] border border-[var(--smc-border-strong)] bg-[var(--smc-limestone)] px-4 py-2.5 text-xs font-semibold text-[var(--smc-charcoal)]"
        >
          Interim guidelines, approved for use ahead of public beta. Final UK legal review is still pending.
        </p>
      </div>

      <Section title="Purpose and scope">
        <p>
          These guidelines apply to profiles, posts, comments, and messages on SMC Pro Studio's professional network.
        </p>
        <p>
          They are separate from SMC's existing fabrication Terms of Use and Privacy Policy, which continue to govern quotes,
          surveys, and installation contracts and are not changed by this page.
        </p>
      </Section>

      <Section title="Prohibited conduct">
        <p>The following are not allowed anywhere on SMC Pro Studio:</p>
        <ul className="list-disc pl-5">
          <li>Harassment and bullying</li>
          <li>Hate and discrimination</li>
          <li>Threats and violence</li>
          <li>Sexual or exploitative content</li>
          <li>Impersonation</li>
          <li>Fraud and scams</li>
          <li>Spam</li>
          <li>Privacy violations — sharing someone else's personal information without their consent</li>
          <li>Illegal activity</li>
          <li>Coordinated abuse — multiple accounts or people acting together to harass, manipulate, or evade enforcement</li>
        </ul>
      </Section>

      <Section title="How reporting works">
        <p>You can report another user's profile or a message available to you.</p>
        <p>
          Choose the reason that fits best. Privacy concerns currently use "Something else" — there is no dedicated category for
          them yet.
        </p>
        <p>Reports go to authorised moderators for review.</p>
      </Section>

      <Section title="Report confidentiality">
        <p>
          Report information is restricted to authorised moderators, except where disclosure is required for safety, legal, or
          regulatory reasons.
        </p>
        <p>We do not promise anonymity.</p>
      </Section>

      <Section title="What happens after you report">
        <p>A moderator reviews the report and may take action.</p>
        <p>We do not guarantee any particular action, a response time, or an individual update on the outcome.</p>
      </Section>

      <Section title="Blocking">
        <p>
          Blocking stops messaging between you and another person. It is separate from reporting, does not notify moderators, and
          does not remove your existing conversation history.
        </p>
      </Section>

      <Section title="Enforcement">
        <p>Moderators may resolve or dismiss a report. This alone records a review decision and takes no automatic action.</p>
        <p>
          For a report about a message that has been resolved, a moderator may additionally hide or restore that specific
          message's content. This is currently the only enforcement action that exists — there is no profile, post, comment, or
          account-level enforcement (such as a warning, suspension, or ban) yet.
        </p>
        <p>Hiding a message is reversible at any time and affects only that one message, never other content.</p>
      </Section>

      <Section title="Appeals and contact">
        <p>There is no in-app appeal flow yet.</p>
        <p>
          For questions about a moderation decision, or to report a safety concern directly, contact{" "}
          <a href={`mailto:${SAFETY_CONTACT_EMAIL}`} className="font-semibold text-[var(--smc-charcoal)] underline underline-offset-2">
            {SAFETY_CONTACT_EMAIL}
          </a>
          . This is reviewed manually.
        </p>
      </Section>

      <p className="px-1 text-xs text-[var(--smc-charcoal-faint)]">
        Effective and last updated {EFFECTIVE_DATE} — interim policy, final legal review pending.
      </p>
    </div>
  );
}
