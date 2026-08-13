import VerifyEmailView from "@/app/components/forms/verifyEmailView";
import { verifyEmailToken } from "@/app/lib/controllers/users/emailVerification";
import { getAuthenticatedUser } from "@/app/lib/auth-middleware";

export default async function VerifyEmailPage({
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // Consume the token during render so the user lands on a finished result
  // rather than a page that asks them to click again.
  const result = token
    ? await verifyEmailToken(token)
    : { error: "Missing verification token." };

  const verified = Boolean(result && "success" in result && result.success);
  const alreadyVerified = Boolean(
    result && "alreadyVerified" in result && result.alreadyVerified
  );

  // If the browser already carries a session (verifying in the same browser
  // that was mid-onboarding, rather than a fresh device via the emailed
  // link), send the "continue" action straight back to onboarding so the
  // user can resume creating/joining a company instead of being detoured
  // through sign-in.
  const sessionUser = verified ? await getAuthenticatedUser() : null;

  return (
    <VerifyEmailView
      verified={verified}
      alreadyVerified={alreadyVerified}
      continueHref={sessionUser ? "/onboarding" : undefined}
    />
  );
}
