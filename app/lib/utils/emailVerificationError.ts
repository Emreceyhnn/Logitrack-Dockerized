/**
 * Client-safe detection for the EMAIL_NOT_VERIFIED guard.
 *
 * Server actions reject with an `EmailNotVerifiedError` (code
 * "EMAIL_NOT_VERIFIED", HTTP 403). Across the server-action boundary only the
 * message survives as a plain Error, so match on the code string the server
 * sends as well as the default message text.
 *
 * Deliberately does NOT import `errors.ts` — that module is server-only and
 * pulling it into a dialog would break the client bundle.
 */
export function isEmailNotVerifiedError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "code" in error) {
    if ((error as { code?: unknown }).code === "EMAIL_NOT_VERIFIED") return true;
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("EMAIL_NOT_VERIFIED") ||
    message.includes("verify your email address")
  );
}
