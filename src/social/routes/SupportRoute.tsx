import { BookOpen, FileText, Mail, Shield, UserX } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, SectionHeading } from "../components/ui";
import { PUBLIC_PATHS, SUPPORT_EMAIL, supportMailto } from "../contact";

/**
 * `/support` — the public support page (store listing "support URL").
 * Public: never reads auth state. Every answer describes what the app
 * actually does today; no response-time promise is made.
 */

const row =
  "flex min-h-[48px] items-center gap-3 px-1 text-sm font-semibold text-[var(--smc-charcoal)] outline-none hover:text-[var(--smc-mineral-bronze)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]";

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "How do I appear in Network search?",
    a: "Professionals appear once their profile is set to Everyone and they have added their profession and service area in Edit profile.",
  },
  {
    q: "How do I reset my password?",
    a: "On the sign-in screen choose \"Forgot password?\" and follow the email we send you.",
  },
  {
    q: "How do I block or report someone?",
    a: "Open their profile and choose Block or Report. To report a specific message, use Report on that message in your conversation. Reports are reviewed by authorised moderators.",
  },
  {
    q: "Can I get a quote or pay through the app?",
    a: "Not in this version. Quotations, payments and project management are not available in the app yet.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Settings → Delete account, or use the Delete account page. You can cancel during the cancellation period shown when you request it.",
  },
];

export default function SupportRoute() {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeading eyebrow="SMC Pro Studio" title="Help and support" description="Get in touch, or find a quick answer below." />

      <Card className="flex flex-col gap-2 p-5">
        <h2 className="smc-editorial text-base font-medium text-[var(--smc-charcoal)]">Contact us</h2>
        <p className="text-sm text-[var(--smc-charcoal-soft)]">
          Email us with your question and the email address you use for SMC Pro Studio. Please never send your password.
        </p>
        <a href={supportMailto("SMC Pro Studio support")} className={row}>
          <Mail className="h-4 w-4" aria-hidden="true" /> {SUPPORT_EMAIL}
        </a>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="smc-editorial text-base font-medium text-[var(--smc-charcoal)]">Common questions</h2>
        {FAQ.map((item) => (
          <div key={item.q} className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-[var(--smc-charcoal)]">{item.q}</h3>
            <p className="text-sm text-[var(--smc-charcoal-soft)]">{item.a}</p>
          </div>
        ))}
      </Card>

      <Card className="flex flex-col gap-1 p-4">
        <Link to={PUBLIC_PATHS.deleteAccount} className={row}>
          <UserX className="h-4 w-4" aria-hidden="true" /> Delete your account
        </Link>
        <Link to={PUBLIC_PATHS.privacy} className={row}>
          <Shield className="h-4 w-4" aria-hidden="true" /> Privacy Policy
        </Link>
        <Link to={PUBLIC_PATHS.terms} className={row}>
          <FileText className="h-4 w-4" aria-hidden="true" /> Terms of Use
        </Link>
        <Link to={PUBLIC_PATHS.communityGuidelines} className={row}>
          <BookOpen className="h-4 w-4" aria-hidden="true" /> Community Guidelines
        </Link>
      </Card>
    </div>
  );
}
