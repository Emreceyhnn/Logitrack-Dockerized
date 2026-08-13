import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuthenticatedUser, type AuthenticatedUser } from "./auth-middleware";
import { runAsSystem } from "./tenant-context";
import { rateLimit } from "./rate-limiter";
import { logAuditEvent } from "./controllers/session/audit";
import { ForbiddenError, RateLimitError } from "./errors";
import { DEFAULT_LOCALE, LOCALES } from "./constants";
import { logger } from "@/app/lib/logger";

/**
 * Platform-admin authorization.
 *
 * WHY THIS IS NOT ROLE-BASED
 * --------------------------
 * `roles.json` defines `role_admin` ("Administrator" / "Super Admin") as a
 * COMPANY-scoped role: every tenant has one, and it grants `"*"` **within that
 * tenant**. Treating it as platform-wide would hand every customer's admin the
 * keys to every other customer's data — the exact opposite of what the
 * tenant-guard in `db.ts` exists to enforce.
 *
 * Platform admin is therefore a separate concept, pinned to explicit user IDs
 * supplied out-of-band via `PLATFORM_ADMIN_USER_IDS`. An attacker who achieves
 * write access to the `users` or `roles` tables still cannot promote themselves
 * to platform admin, because the allowlist does not live in the database.
 *
 * CROSS-TENANT ACCESS
 * -------------------
 * The admin console is cross-tenant by definition, so it is the one legitimate
 * user-facing caller of `runAsSystem()` (which bypasses the fail-closed tenant
 * guard). `platformAdminAction` is deliberately the ONLY place in the app that
 * pairs `runAsSystem` with a request path: every such call is authorized
 * against the allowlist, rate limited, and written to the audit log first.
 * Never call `runAsSystem()` directly from a route handler or server action.
 */

/** Cap on admin actions per window. Deliberately tighter than the 300/min
 *  applied to ordinary authenticated actions: these run unscoped across every
 *  tenant, so a compromised admin session should be slowed down hard. */
const ADMIN_RATE_LIMIT = 60;
const ADMIN_RATE_WINDOW_SECONDS = 60;

/**
 * tr-Ortam değişkeninden platform yöneticisi kimliklerini okur.
 * en-Reads the platform-admin user ID allowlist from the environment.
 * input ()
 * output (ReadonlySet<string>)
 */
function readAllowlist(): ReadonlySet<string> {
  const raw = process.env.PLATFORM_ADMIN_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

/**
 * tr-Verilen kullanıcının platform yöneticisi olup olmadığını kontrol eder.
 * en-True when the given user is on the platform-admin allowlist.
 * input (user: AuthenticatedUser | null)
 * output (boolean)
 */
export function isPlatformAdmin(user: AuthenticatedUser | null): boolean {
  if (!user) return false;

  const allowlist = readAllowlist();

  // Fail closed: an empty or unset allowlist grants nobody access. A typo in
  // the env var must lock the console, never open it to every signed-in user.
  if (allowlist.size === 0) return false;

  return allowlist.has(user.id);
}

/**
 * tr-Geçerli platform yöneticisini döndürür, yoksa null.
 * en-Returns the current user when they are a platform admin, otherwise null.
 * input ()
 * output (Promise<AuthenticatedUser | null>)
 */
export const getPlatformAdmin = cache(
  async (): Promise<AuthenticatedUser | null> => {
    const user = await getAuthenticatedUser();
    return isPlatformAdmin(user) ? user : null;
  }
);

/**
 * tr-İstek başlıklarından IP ve cihaz bilgisini çıkarır.
 * en-Extracts client IP and user-agent from the request headers for auditing.
 * input ()
 * output (Promise<{ ipAddress: string | null; deviceInfo: string | null }>)
 */
async function getRequestFingerprint(): Promise<{
  ipAddress: string | null;
  deviceInfo: string | null;
}> {
  try {
    const headerStore = await headers();
    const forwarded = headerStore.get("x-forwarded-for");
    const ipAddress =
      forwarded?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || null;
    return {
      ipAddress,
      deviceInfo: headerStore.get("user-agent"),
    };
  } catch {
    // Headers are unavailable outside a request scope (e.g. in tests).
    return { ipAddress: null, deviceInfo: null };
  }
}

/**
 * tr-Referer başlığından yerel ayarı okur.
 * en-Best-effort locale for redirects, read from the referer header.
 * input ()
 * output (Promise<string>)
 */
async function getLocaleFromReferer(): Promise<string> {
  try {
    const headerStore = await headers();
    const referer = headerStore.get("referer");
    if (referer) {
      const segment = new URL(referer).pathname.split("/").filter(Boolean)[0];
      if (segment && (LOCALES as readonly string[]).includes(segment)) {
        return segment;
      }
    }
  } catch {
    // Fall through to the default locale.
  }
  return DEFAULT_LOCALE;
}

/**
 * tr-Sadece platform yöneticilerinin çalıştırabileceği, kiracılar arası ve
 *    denetim kaydı tutulan bir sunucu eylemi sarmalayıcısı.
 * en-Wraps a server action so it runs only for platform admins, with
 *    cross-tenant access, rate limiting and an audit record per invocation.
 *
 *    `operation` is a stable machine-readable name (e.g. "tenants.list") that
 *    lands in the audit metadata — keep it descriptive, it is the forensic
 *    trail for everything the console does.
 *
 * input (operation: string, action: (user, ...args) => Promise<T>)
 * output ((...args: Args) => Promise<T>)
 */
export function platformAdminAction<T, Args extends unknown[]>(
  operation: string,
  action: (user: AuthenticatedUser, ...args: Args) => Promise<T>
) {
  return async (...args: Args): Promise<T> => {
    const user = await getAuthenticatedUser();

    if (!user) {
      const locale = await getLocaleFromReferer();
      redirect(`/${locale}/auth/sign-in`);
    }

    if (!isPlatformAdmin(user)) {
      // Log the denial before throwing: a non-admin probing the console is a
      // security signal worth keeping, and it must be recorded even though the
      // action never runs.
      const { ipAddress, deviceInfo } = await getRequestFingerprint();
      await logAuditEvent({
        userId: user.id,
        action: "SETTINGS_UPDATE",
        ipAddress,
        deviceInfo,
        metadata: {
          scope: "platform-admin",
          operation,
          outcome: "denied",
          reason: "not_on_allowlist",
        },
      });

      logger.warn("[platformAdminAction] denied", {
        userId: user.id,
        operation,
      });

      throw new ForbiddenError("Platform administrator access required");
    }

    const limitResult = await rateLimit(
      user.sessionId || user.id,
      ADMIN_RATE_LIMIT,
      ADMIN_RATE_WINDOW_SECONDS,
      "rate-limit:platform-admin:"
    );
    if (!limitResult.success) {
      throw new RateLimitError();
    }

    const { ipAddress, deviceInfo } = await getRequestFingerprint();

    // NOTE: `AuditAction` is a Postgres enum with no admin-specific members, so
    // we reuse SETTINGS_UPDATE and carry the real detail in `metadata.scope` /
    // `metadata.operation`. Adding dedicated members (PLATFORM_ADMIN_ACTION,
    // MASQUERADE_START, MASQUERADE_END) requires a migration — recommended, but
    // deliberately not done here since no schema change was approved.
    await logAuditEvent({
      userId: user.id,
      action: "SETTINGS_UPDATE",
      ipAddress,
      deviceInfo,
      metadata: {
        scope: "platform-admin",
        operation,
        outcome: "invoked",
      },
    });

    // The one sanctioned cross-tenant entry point in a user-facing path.
    return runAsSystem(() => action(user, ...args));
  };
}

/**
 * tr-Platform yöneticisi değilse sayfayı engeller; layout guard olarak kullanılır.
 * en-Guards an admin page: returns the platform admin or redirects away.
 *    Used by the admin layout so no admin route can render without a check.
 * input ()
 * output (Promise<AuthenticatedUser>)
 */
export async function requirePlatformAdmin(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  const locale = await getLocaleFromReferer();

  if (!user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  if (!isPlatformAdmin(user)) {
    // Redirect rather than 403: the console's existence should not be
    // confirmable by a signed-in non-admin probing the URL.
    redirect(`/${locale}/overview`);
  }

  return user;
}
