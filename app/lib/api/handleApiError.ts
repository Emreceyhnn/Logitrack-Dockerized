/**
 * Shared catch-block handler for API route handlers.
 *
 * Controllers (via `controllerGuard`) throw structured `AppError`s that carry
 * the intended HTTP status (403 Forbidden, 404 NotFound, 409 Conflict,
 * 429 RateLimited, ...). Route handlers previously collapsed all of these into
 * a generic 500 — this helper maps them onto proper responses in one place.
 *
 * Server-only (imports `errors.ts`), for use inside `app/api/*` handlers.
 */

import { NextResponse } from "next/server";
import { AppError, ValidationError } from "@/app/lib/errors";
import { logger } from "@/app/lib/logger";

/**
 * tr-API yönlendirme işleyicileri için paylaşılan hata yakalama işleyicisi
 * en-shared catch-block handler for API route handlers
 * input (routeName: string, error: unknown)
 * output (NextResponse)
 */
export function handleApiError(routeName: string, error: unknown): NextResponse {
  // `authenticatedAction` calls redirect() when there is no session; inside a
  // route handler that surfaces as a NEXT_REDIRECT error → translate to 401.
  // Next.js marks redirect errors via `digest` ("NEXT_REDIRECT;<type>;<url>;…"),
  // the message is an implementation detail — check both.
  const digest = (error as { digest?: unknown } | null)?.digest;
  if (
    (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) ||
    (error instanceof Error && error.message === "NEXT_REDIRECT")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (error instanceof AppError) {
    logger.error(`[${routeName}] ${error.name}:`, error.message);
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error instanceof ValidationError
          ? { fieldErrors: error.fieldErrors }
          : {}),
      },
      { status: error.status }
    );
  }

  logger.error(`[${routeName}] error:`, error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
