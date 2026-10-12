import { Link } from "react-router-dom";
import { DeleteAccountPanel } from "../components/DeleteAccountPanel";
import { LoadingState } from "../components/StateViews";
import { Card, SectionHeading } from "../components/ui";
import { PUBLIC_PATHS, SUPPORT_EMAIL, supportMailto } from "../contact";
import { useAuthSession } from "../services/useAuthSession";

/**
 * `/delete-account` — the public account-deletion page (Google Play's
 * "delete account URL", and Apple's in-app deletion path). Signed in, it
 * shows the same deletion flow as Settings. Signed out, it explains the steps
 * and offers sign-in, plus email for anyone who can no longer sign in.
 */
export default function DeleteAccountRoute() {
  const auth = useAuthSession();

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading
        eyebrow="SMC Pro Studio"
        title="Delete your account"
        description="Request deletion of your SMC Pro Studio account and the personal information linked to it."
      />

      <Card className="flex flex-col gap-2 p-5 text-sm text-[var(--smc-charcoal-soft)]">
        <h2 className="smc-editorial text-base font-medium text-[var(--smc-charcoal)]">How it works</h2>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Sign in and confirm that you want to delete your account.</li>
          <li>Your deletion is scheduled for the end of a short cancellation period, shown on screen. You can cancel until then.</li>
          <li>
            When it is processed, your profile, professional details, posts, comments, connections and the text of your messages are
            removed and your sign-in is closed. Reports and reported messages are kept for safety, no longer linked to your name or email.
          </li>
        </ol>
        <Link to={PUBLIC_PATHS.privacy} className="inline-flex min-h-[44px] items-center self-start font-semibold text-[var(--smc-mineral-bronze)] underline underline-offset-2">
          Read the Privacy Policy
        </Link>
      </Card>

      <Card className="p-5">
        {auth.status === "loading" && <LoadingState label="Checking your account" />}
        {auth.status === "authenticated" && <DeleteAccountPanel />}
        {auth.status === "guest" && (
          <div className="flex flex-col gap-3 text-sm text-[var(--smc-charcoal-soft)]">
            <p>Sign in to the account you want to delete to request deletion.</p>
            <Link
              to="/auth"
              className="inline-flex min-h-[44px] items-center justify-center self-start rounded-[var(--smc-radius-pill)] bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-[var(--smc-ivory)]"
            >
              Sign in
            </Link>
            <p>
              Can't sign in? Email{" "}
              <a className="font-semibold underline" href={supportMailto("Account deletion request")}>
                {SUPPORT_EMAIL}
              </a>{" "}
              from the email address on your account and we will help you.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
