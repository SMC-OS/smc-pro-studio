import { BookOpen, FileText, LifeBuoy, LogOut, Mail, Pencil, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, LoadingState } from "../components/StateViews";
import { Card, SectionHeading } from "../components/ui";
import { DeleteAccountPanel } from "../components/DeleteAccountPanel";
import { signOut } from "../../services/authClient";
import { PUBLIC_PATHS, SUPPORT_EMAIL, supportMailto } from "../contact";
import { useAuthSession } from "../services/useAuthSession";

/**
 * `/settings` — account, legal, support, sign out and account deletion.
 */

const rowLink =
  "flex min-h-[48px] items-center gap-3 rounded-[var(--smc-radius-card)] px-1 text-sm font-semibold text-[var(--smc-charcoal)] outline-none hover:text-[var(--smc-mineral-bronze)] focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)]";

export default function SettingsRoute() {
  const auth = useAuthSession();

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") {
    return (
      <EmptyState
        title="Sign in to manage your account"
        description="Settings are available once you're signed in."
        action={
          <Link to="/auth" className="text-sm font-semibold text-[var(--smc-mineral-bronze)] underline">
            Sign in
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading eyebrow="Account" title="Settings" />

      <Card className="flex flex-col gap-1 p-4">
        {auth.session.email && (
          <p className="px-1 pb-2 text-sm text-[var(--smc-charcoal-soft)]">
            Signed in as <span className="font-semibold text-[var(--smc-charcoal)]">{auth.session.email}</span>
          </p>
        )}
        <Link to="/profile/edit" className={rowLink}>
          <Pencil className="h-4 w-4" aria-hidden="true" /> Edit profile and visibility
        </Link>
        <button type="button" onClick={() => void signOut()} className={`${rowLink} text-left`}>
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
        </button>
      </Card>

      <Card className="flex flex-col gap-1 p-4">
        <h2 className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--smc-mineral-bronze)]">Help and policies</h2>
        <Link to={PUBLIC_PATHS.support} className={rowLink}>
          <LifeBuoy className="h-4 w-4" aria-hidden="true" /> Help and support
        </Link>
        <a href={supportMailto()} className={rowLink}>
          <Mail className="h-4 w-4" aria-hidden="true" /> Email {SUPPORT_EMAIL}
        </a>
        <Link to={PUBLIC_PATHS.privacy} className={rowLink}>
          <Shield className="h-4 w-4" aria-hidden="true" /> Privacy Policy
        </Link>
        <Link to={PUBLIC_PATHS.terms} className={rowLink}>
          <FileText className="h-4 w-4" aria-hidden="true" /> Terms of Use
        </Link>
        <Link to={PUBLIC_PATHS.communityGuidelines} className={rowLink}>
          <BookOpen className="h-4 w-4" aria-hidden="true" /> Community Guidelines
        </Link>
      </Card>

      <Card className="p-5">
        <DeleteAccountPanel />
      </Card>
    </div>
  );
}
