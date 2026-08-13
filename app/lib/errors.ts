/**
 * Application Error Hierarchy
 *
 * Every custom error carries:
 *  - `code`   — machine-readable identifier (e.g. "NOT_FOUND") for i18n / client-side matching
 *  - `status` — suggested HTTP status code for API route handlers
 *
 * Server actions can `throw new NotFoundError(...)` and the `controllerGuard`
 * (or API route handler) translates it into a structured JSON response.
 *
 * IMPORTANT: This file is server-only. It must NOT be imported by client components.
 */

// ─── Error Codes ────────────────────────────────────────────────────────────
export const ErrorCode = {
  // Generic
  INTERNAL: "INTERNAL",
  VALIDATION: "VALIDATION",

  // Auth / Authz
  FORBIDDEN: "FORBIDDEN",
  NO_COMPANY: "NO_COMPANY",
  UNAUTHORIZED: "UNAUTHORIZED",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",

  // Resource
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",

  // Rate limiting
  RATE_LIMITED: "RATE_LIMITED",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// ─── Base ───────────────────────────────────────────────────────────────────
export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly status: number;

  constructor(
    message: string,
    code: ErrorCodeType = ErrorCode.INTERNAL,
    status: number = 500
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── 400 — Validation ───────────────────────────────────────────────────────
export class ValidationError extends AppError {
  /** Zod field-level issues (if available) */
  public readonly fieldErrors: Record<string, string[]>;

  constructor(
    message: string = "Validation failed",
    fieldErrors: Record<string, string[]> = {}
  ) {
    super(message, ErrorCode.VALIDATION, 400);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

// ─── 403 — Forbidden ────────────────────────────────────────────────────────
export class ForbiddenError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, ErrorCode.FORBIDDEN, 403);
    this.name = "ForbiddenError";
  }
}

// ─── 403 — No Company ───────────────────────────────────────────────────────
/** Thrown when an action requires a company but the user has none. */
export class NoCompanyError extends AppError {
  constructor() {
    super("User has no company", ErrorCode.NO_COMPANY, 403);
    this.name = "NoCompanyError";
  }
}

// ─── 403 — Email Not Verified ───────────────────────────────────────────────
/**
 * Thrown when an action requires a proven email address. Distinct from
 * ForbiddenError so the client can offer "resend verification" rather than
 * telling the user they lack permission — the fix is in their inbox.
 */
export class EmailNotVerifiedError extends AppError {
  constructor(
    message: string = "Please verify your email address to continue"
  ) {
    super(message, ErrorCode.EMAIL_NOT_VERIFIED, 403);
    this.name = "EmailNotVerifiedError";
  }
}

// ─── 404 — Not Found ────────────────────────────────────────────────────────
export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found or unauthorized`, ErrorCode.NOT_FOUND, 404);
    this.name = "NotFoundError";
  }
}

// ─── 409 — Conflict ─────────────────────────────────────────────────────────
export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, ErrorCode.CONFLICT, 409);
    this.name = "ConflictError";
  }
}

// ─── 429 — Rate Limited ─────────────────────────────────────────────────────
export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests. Please try again later.") {
    super(message, ErrorCode.RATE_LIMITED, 429);
    this.name = "RateLimitError";
  }
}

// ─── Helper: Wrap Zod errors into ValidationError ───────────────────────────
/**
 * Wraps a ZodError into a structured ValidationError.
 * Import lazily to avoid pulling zod into the client bundle.
 */
export function fromZodError(zodError: {
  issues: Array<{ path: Array<string | number>; message: string }>;
}): ValidationError {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of zodError.issues) {
    const path = issue.path.join(".") || "_root";
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path].push(issue.message);
  }

  const summary = zodError.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");

  return new ValidationError(`Validation failed: ${summary}`, fieldErrors);
}
