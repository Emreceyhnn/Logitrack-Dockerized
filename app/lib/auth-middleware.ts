import { cache } from "react";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { jwtVerify } from "jose";
import {
  getJwtSecret,
  hashToken,
  revokedTokenKey,
  type SessionJWTPayload,
} from "./controllers/session/internal";
import { DEFAULT_LOCALE, LOCALES } from "./constants";
import { runWithTenant } from "./tenant-context";
import { rateLimit } from "./rate-limiter";
import { redis } from "./redis";
import { logger } from "@/app/lib/logger";
import { RateLimitError } from "./errors";
import type { AccessStatus } from "./entitlement";

export type AuthenticatedUser = {
  id: string;
  companyId: string | null;
  roleId: string | null;
  roleName: string | null;
  sessionId: string;
  name: string;
  surname: string;
  avatarUrl: string | null;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  language: string;
  notifEmailShipment: boolean;
  notifEmailMaint: boolean;
  notifEmailWeekly: boolean;
  notifEmailAssignment: boolean;
  notifEmailDelay: boolean;
  notifPushAssignment: boolean;
  notifPushDelay: boolean;
  accessStatus: AccessStatus;
  trialEndsAt: number | null;
  emailVerified: boolean;
};

/**
 * tr-Giriş yapan kullanıcıyı döndürür veya oturum açılmamışsa oturum açma sayfasına yönlendirir.
 * en-Returns the authenticated user or redirects to the sign-in page if not logged in.
 * input (
  action: (user: AuthenticatedUser, ...args: Args) => Promise<T>
)
 * output (Promise<T>)
 */

export const getAuthenticatedUser = cache(
  async (): Promise<AuthenticatedUser | null> => {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("token")?.value;

      if (!token) return null;

      const secret = new TextEncoder().encode(getJwtSecret());
      const { payload } = await jwtVerify(token, secret);
      const sessionUser = payload as SessionJWTPayload;

      if (!sessionUser || !sessionUser.id) return null;

      // Reject tokens whose session was revoked (logout, admin deactivation,
      // password change) before they expire. One Redis GET, and getAuthenticatedUser
      // is React-cached so it runs at most once per request. Fail-open on a Redis
      // error: the token is still signature-valid and short-lived, and failing
      // closed would log everyone out during a transient Redis blip — matching
      // the app's existing Redis-optional posture.
      try {
        const revoked = await redis.get(revokedTokenKey(hashToken(token)));
        if (revoked) return null;
      } catch (err) {
        logger.warn(
          "[getAuthenticatedUser] revocation check failed (fail-open)",
          err
        );
      }

      return {
        id: sessionUser.id,
        name: sessionUser.name ?? "",
        surname: sessionUser.surname ?? "",
        avatarUrl: sessionUser.avatarUrl ?? null,
        companyId: sessionUser.companyId ?? null,
        roleId: sessionUser.role ?? null,
        roleName: sessionUser.roleName ?? null,
        sessionId: sessionUser.sessionId ?? "",
        timezone: sessionUser.timezone ?? "UTC",
        dateFormat: sessionUser.dateFormat ?? "DD/MM/YYYY",
        timeFormat: sessionUser.timeFormat ?? "24h",
        currency: sessionUser.currency ?? "USD",
        language: sessionUser.language ?? "en",
        notifEmailShipment: sessionUser.notifEmailShipment ?? true,
        notifEmailMaint: sessionUser.notifEmailMaint ?? true,
        notifEmailWeekly: sessionUser.notifEmailWeekly ?? false,
        notifEmailAssignment: sessionUser.notifEmailAssignment ?? true,
        notifEmailDelay: sessionUser.notifEmailDelay ?? true,
        notifPushAssignment: sessionUser.notifPushAssignment ?? true,
        notifPushDelay: sessionUser.notifPushDelay ?? true,
        accessStatus: (sessionUser.accessStatus as AccessStatus) ?? "NONE",
        trialEndsAt:
          typeof sessionUser.trialEndsAt === "number"
            ? sessionUser.trialEndsAt
            : null,
        // Defaults to false: a token minted before this field existed must not
        // be treated as verified just because the claim is absent.
        emailVerified: sessionUser.emailVerified === true,
      };
    } catch (error) {
      if ((error as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") {
        throw error;
      }
      if (
        error instanceof Error &&
        !error.name.includes("JOSE") &&
        !error.name.includes("JWT")
      ) {
        logger.error(
          "[getAuthenticatedUser] ❌ Session check failed critical:",
          error
        );
      }
    }

    return null;
  }
);

/**
 * tr-Giriş yapan kullanıcıyı döndürür veya oturum açılmamışsa oturum açma sayfasına yönlendirir.
 * en-Returns the authenticated user or redirects to the sign-in page if not logged in.
 * input (
  action: (user: AuthenticatedUser, ...args: Args) => Promise<T>
)
 * output (Promise<T>)
 */
async function getLocaleFromReferer(): Promise<string> {
  try {
    const headerStore = await headers();
    const referer = headerStore?.get("referer");
    if (referer) {
      const url = new URL(referer);
      const pathname = url.pathname;
      const segments = pathname.split("/").filter(Boolean);
      const possibleLocale = segments[0];
      if (
        possibleLocale &&
        (LOCALES as readonly string[]).includes(possibleLocale)
      ) {
        return possibleLocale;
      }
    }
  } catch {
    // Fail-safe default if headers context is not available (e.g. testing)
  }
  return DEFAULT_LOCALE;
}

// Generous cap on top of the /api mutation limiter in proxy.ts: this wrapper
// is the single choke point for every authenticated Server Action (~150+
// across all controllers), which the edge middleware never sees because
// Server Action POSTs land on the page route, not /api/*. Without this,
// rate limiting only covered the handful of real /api routes and the
// hand-rolled checks in auth.ts, leaving the bulk of the app unprotected.
const ACTION_RATE_LIMIT = 300;
const ACTION_RATE_WINDOW_SECONDS = 60;

/**
 * tr-Giriş yapan kullanıcıyı döndürür veya oturum açılmamışsa oturum açma sayfasına yönlendirir.
 * en-Returns the authenticated user or redirects to the sign-in page if not logged in.
 * input (
  action: (user: AuthenticatedUser, ...args: Args) => Promise<T>
)
 * output (Promise<T>)
 */
export function authenticatedAction<T, Args extends unknown[]>(
  action: (user: AuthenticatedUser, ...args: Args) => Promise<T>
) {
  return async (...args: Args): Promise<T> => {
    const user = await getAuthenticatedUser();

    if (!user) {
      const locale = await getLocaleFromReferer();
      redirect(`/${locale}/auth/sign-in`);
    }

    const limitResult = await rateLimit(
      user.sessionId || user.id,
      ACTION_RATE_LIMIT,
      ACTION_RATE_WINDOW_SECONDS,
      "rate-limit:action:user:"
    );
    if (!limitResult.success) {
      throw new RateLimitError();
    }

    // Every DB query inside the action is automatically scoped to the
    // caller's company by the tenant-guard Prisma extension (see db.ts).
    return runWithTenant(user.companyId, () => action(user, ...args));
  };
}

/**
 * tr-Giriş yapan kullanıcıyı döndürür veya oturum açılmamışsa oturum açma sayfasına yönlendirir.
 * en-Returns the authenticated user or redirects to the sign-in page if not logged in.
 * input (
  action: (user: AuthenticatedUser | null, ...args: Args) => Promise<T>
)
 * output (Promise<T>)
 */
export function maybeAuthenticatedAction<T, Args extends unknown[]>(
  action: (user: AuthenticatedUser | null, ...args: Args) => Promise<T>
) {
  return async (...args: Args): Promise<T> => {
    const user = await getAuthenticatedUser();
    return runWithTenant(user?.companyId ?? null, () => action(user, ...args));
  };
}
