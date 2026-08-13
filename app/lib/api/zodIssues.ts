import { fromZodError, type ValidationError } from "@/app/lib/errors";

/**
 * tr-Zod v4 hata listesini `fromZodError`'ın beklediği şekle çevirir.
 * en-Adapts a Zod v4 error into the shape `fromZodError` expects.
 *
 *    Zod v4 types `issue.path` as `PropertyKey[]`, which includes `symbol`;
 *    `fromZodError` accepts only string/number segments. This mirrors the
 *    normalisation already done in `controllers/utils/controllerGuard.ts`,
 *    kept here so API route handlers do not each reimplement it.
 * input (error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] })
 * output (ValidationError)
 */
export function toValidationError(error: {
  issues: readonly { path: readonly PropertyKey[]; message: string }[];
}): ValidationError {
  return fromZodError({
    issues: error.issues.map((issue) => ({
      path: issue.path.map((segment) => String(segment)),
      message: issue.message,
    })),
  });
}
