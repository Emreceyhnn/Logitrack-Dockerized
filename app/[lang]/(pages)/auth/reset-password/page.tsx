import ResetPasswordForm from "@/app/components/forms/resetPasswordForm";
import { verifyPasswordResetToken } from "@/app/lib/controllers/users/passwordReset";

export default async function ResetPasswordPage({
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // Validate before rendering the form so an expired or already-used link
  // shows the failure immediately, instead of after the user has typed a
  // password and submitted it.
  const { valid } = token
    ? await verifyPasswordResetToken(token)
    : { valid: false };

  return <ResetPasswordForm token={token ?? ""} tokenValid={valid} />;
}
