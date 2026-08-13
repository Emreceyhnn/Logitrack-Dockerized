"use server";

import { cookies, headers } from "next/headers";
import { jwtVerify, JWTPayload } from "jose";
import { db } from "../../db";
import { redis } from "../../redis";
import { Prisma } from "@prisma/client";
import {
  getJwtSecret,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_EXPIRY_DAYS,
  ACTIVITY_THROTTLE_MS,
  COOKIE_OPTIONS,
  type SessionUser,
  type SessionJWTPayload,
} from "./internal";
import { clearAuthCookies, clearStaleClaims } from "./manage";
import { logAuditEvent } from "./audit";
import { resolveEntitlement } from "@/app/lib/entitlement.server";
import { logger } from "@/app/lib/logger";


/**
 * tr-jose payload nesnesini oturum payload yapısına dönüştürür ve doğrular
 * en-converts and validates a jose payload object into the session payload structure
 * input (payload: JWTPayload)
 * output (Promise<SessionJWTPayload | null>)
 */
export async function toSessionPayload(
  payload: JWTPayload
): Promise<SessionJWTPayload | null> {
  const { id, role, companyId } = payload;
  if (typeof id !== "string" || id.length === 0) return null;

  return {
    ...payload,
    id,
    role: typeof role === "string" ? role : null,
    companyId: typeof companyId === "string" ? companyId : null,
  };
}

/**
 * tr-kullanıcı için yeni bir sunucu taraflı oturum oluşturur ve yetkilendirme çerezlerini ayarlar
 * en-creates a new server-side session for a user and sets authorization cookies
 * input (user: object, deviceInfo?: string, ipAddress?: string)
 * output (Promise<{ accessToken: string, sessionId: string }>)
 */
export async function createSession(
  user: {
    id: string;
    roleId?: string | null;
    roleName?: string | null;
    companyId?: string | null;
    name?: string | null;
    surname?: string | null;
    avatarUrl?: string | null;
    timezone?: string;
    dateFormat?: string;
    timeFormat?: string;
    currency?: string;
    language?: string;
    notifEmailShipment?: boolean;
    notifEmailMaint?: boolean;
    notifEmailWeekly?: boolean;
    notifEmailAssignment?: boolean;
    notifEmailDelay?: boolean;
    notifPushAssignment?: boolean;
    notifPushDelay?: boolean;
    emailVerifiedAt?: Date | null;
  },
  deviceInfo?: string,
  ipAddress?: string
): Promise<{ accessToken: string; sessionId: string }> {
  let finalRoleName = user.roleName ?? null;
  if (user.roleId && !finalRoleName) {
    const role = await db.role.findUnique({ where: { id: user.roleId }, select: { name: true } });
    finalRoleName = role?.name ?? null;
  }
  
  // Bake the current access entitlement into the token so the edge middleware
  // can gate the dashboard without a DB round-trip.
  const access = await resolveEntitlement(user.id);
  const tokenUser = {
    ...user,
    roleName: finalRoleName,
    accessStatus: access.accessStatus,
    trialEndsAt: access.trialEndsAt,
  };
  const accessToken = await generateAccessToken(tokenUser);
  const refreshToken = generateRefreshToken();

  const tokenHash = hashToken(accessToken);
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  // Create session in DB
  try {
    const session = await db.session.create({
      data: {
        userId: user.id,
        token: tokenHash,
        refreshToken: refreshTokenHash,
        deviceInfo: deviceInfo || null,
        ipAddress: ipAddress || null,
        expiresAt,
      },
    });

    // Set cookies
    const cookieStore = await cookies();

    cookieStore.set("token", accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    cookieStore.set("refreshToken", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60, // 7 days (seconds)
    });

    return { accessToken, sessionId: session.id };
  } catch (error) {
    logger.error("Failed to create session in DB:", error);
    throw new Error(
      "Authentication session failed to initialize properly. Please try again."
    );
  }
}

/**
 * tr-mevcut oturumu doğrulayarak geçerli kullanıcının oturum bilgilerini getirir
 * en-validates the current session and retrieves the active user's session information
 * input ()
 * output (Promise<SessionUser | null>)
 */
export async function validateSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("token")?.value;

    if (!accessToken) {
      return null;
    }

    // Verify JWT signature & expiry. The payload itself is not used below —
    // the session row is looked up by token hash — but it must still parse
    // to a valid session payload (non-empty `id`).
    try {
      const secret = new TextEncoder().encode(getJwtSecret());
      const { payload } = await jwtVerify(accessToken, secret);
      if (!(await toSessionPayload(payload))) return null;
    } catch {
      return null;
    }

    // Check cache for session
    const tokenHash = hashToken(accessToken);
    const cacheKey = `session:${tokenHash}`;
    type SessionWithUser = Prisma.SessionGetPayload<{
      include: {
        user: {
          select: {
            id: true;
            companyId: true;
            roleId: true;
            status: true;
            name: true;
            surname: true;
            avatarUrl: true;
            timezone: true;
            dateFormat: true;
            timeFormat: true;
            currency: true;
            language: true;
            notifEmailShipment: true;
            notifEmailMaint: true;
            notifEmailWeekly: true;
            notifEmailAssignment: true;
            notifEmailDelay: true;
            notifPushAssignment: true;
            notifPushDelay: true;
            emailVerifiedAt: true;
            role: {
              select: {
                name: true;
              };
            };
          };
        };
      };
    }>;

    let session: SessionWithUser | null = null;

    try {
      const cached = await redis.get<SessionWithUser>(cacheKey);
      if (cached) {
        cached.expiresAt = new Date(cached.expiresAt);
        cached.lastActivityAt = new Date(cached.lastActivityAt);
        session = cached;
      }
    } catch (err) {
      logger.warn("[validateSession] Redis get failed", err);
    }

    if (!session) {
      session = await db.session.findUnique({
        where: { token: tokenHash },
        include: {
          user: {
            select: {
              id: true,
              companyId: true,
              roleId: true,
              status: true,
              name: true,
              surname: true,
              avatarUrl: true,
              timezone: true,
              dateFormat: true,
              timeFormat: true,
              currency: true,
              language: true,
              notifEmailShipment: true,
              notifEmailMaint: true,
              notifEmailWeekly: true,
              notifEmailAssignment: true,
              notifEmailDelay: true,
              notifPushAssignment: true,
              notifPushDelay: true,
              emailVerifiedAt: true,
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (session) {
        const remainingTtl = Math.max(
          1,
          Math.min(300, Math.round((new Date(session.expiresAt).getTime() - Date.now()) / 1000))
        );
        await redis.set(cacheKey, session, { ex: remainingTtl }).catch(() => {});
      }
    }

    if (!session) {
      await clearAuthCookies();
      return null;
    }

    // Check session validity
    if (session.isRevoked) {
      await clearAuthCookies();
      return null;
    }

    if (new Date(session.expiresAt) < new Date()) {
      await clearAuthCookies();
      return null;
    }

    // Check user is still active
    if (session.user.status !== "ACTIVE") {
      return null;
    }

    const access = await resolveEntitlement(session.user.id);

    // Throttled update of lastActivityAt
    const timeSinceLastActivity = Date.now() - new Date(session.lastActivityAt).getTime();
    if (timeSinceLastActivity > ACTIVITY_THROTTLE_MS) {
      const newActivity = new Date();
      db.session
        .update({
          where: { id: session.id },
          data: { lastActivityAt: newActivity },
        })
        .then(async () => {
          session.lastActivityAt = newActivity;
          const remainingTtl = Math.max(
            1,
            Math.min(300, Math.round((new Date(session.expiresAt).getTime() - Date.now()) / 1000))
          );
          await redis.set(cacheKey, session, { ex: remainingTtl }).catch(() => {});
        })
        .catch(() => {});
    }

    return {
      id: session.user.id,
      companyId: session.user.companyId,
      roleId: session.user.roleId,
      roleName: session.user.role?.name || null,
      sessionId: session.id,
      name: session.user.name,
      surname: session.user.surname,
      avatarUrl: session.user.avatarUrl,
      timezone: session.user.timezone,
      dateFormat: session.user.dateFormat,
      timeFormat: session.user.timeFormat,
      currency: session.user.currency || "USD",
      language: session.user.language || "en",
      notifEmailShipment: session.user.notifEmailShipment,
      notifEmailMaint: session.user.notifEmailMaint,
      notifEmailWeekly: session.user.notifEmailWeekly,
      notifEmailAssignment: session.user.notifEmailAssignment,
      notifEmailDelay: session.user.notifEmailDelay,
      notifPushAssignment: session.user.notifPushAssignment,
      notifPushDelay: session.user.notifPushDelay,
      accessStatus: access.accessStatus,
      trialEndsAt: access.trialEndsAt,
      emailVerified: session.user.emailVerifiedAt != null,
    };
  } catch (error) {
    if ((error as { digest?: string })?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw error;
    }
    logger.error("[validateSession] ❌ Unexpected error:", error);
    return null;
  }
}

/**
 * tr-refresh token kullanarak kullanıcının oturumunu yeniler ve yeni yetkilendirme çerezleri ayarlar
 * en-refreshes the user's session using the refresh token and sets new authorization cookies
 * input ()
 * output (Promise<boolean>)
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (!refreshToken) {
      return false;
    }

    const hashedRefreshToken = hashToken(refreshToken);

    // Find session by refresh token
    const session = await db.session.findUnique({
      where: { refreshToken: hashedRefreshToken },
      include: {
        user: {
          select: {
            id: true,
            roleId: true,
            companyId: true,
            status: true,
            name: true,
            surname: true,
            avatarUrl: true,
            timezone: true,
            dateFormat: true,
            timeFormat: true,
            currency: true,
            language: true,
            notifEmailShipment: true,
            notifEmailMaint: true,
            notifEmailWeekly: true,
            notifEmailAssignment: true,
            notifEmailDelay: true,
            notifPushAssignment: true,
            notifPushDelay: true,
            emailVerifiedAt: true,
            role: {
              select: { name: true }
            }
          },
        },
      },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      await clearAuthCookies();
      return false;
    }

    if (session.user.status !== "ACTIVE") {
      await clearAuthCookies();
      return false;
    }

    // Generate new tokens — re-resolve entitlement so a trial granted after the
    // last login (e.g. an approved demo) takes effect on the next refresh.
    const access = await resolveEntitlement(session.user.id);
    const newAccessToken = await generateAccessToken({
      ...session.user,
      roleName: session.user.role?.name ?? null,
      accessStatus: access.accessStatus,
      trialEndsAt: access.trialEndsAt,
    });
    const newRefreshToken = generateRefreshToken();
    const newTokenHash = hashToken(newAccessToken);
    const newRefreshTokenHash = hashToken(newRefreshToken);

    // Invalidate old token cache entry
    const oldAccessToken = cookieStore.get("token")?.value;
    if (oldAccessToken) {
      await redis.del(`session:${hashToken(oldAccessToken)}`).catch(() => {});
    }

    // Rotate tokens in DB
    await db.session.update({
      where: { id: session.id },
      data: {
        token: newTokenHash,
        refreshToken: newRefreshTokenHash,
        lastActivityAt: new Date(),
      },
    });

    // Set new cookies
    try {
      cookieStore.set("token", newAccessToken, {
        ...COOKIE_OPTIONS,
        maxAge: ACCESS_TOKEN_MAX_AGE,
      });

      cookieStore.set("refreshToken", newRefreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60, // 7 days (seconds)
      });
    } catch (cookieError) {
      logger.warn(
        "[refreshSession] ⚠️ Could not set cookies (likely called from Server Component). Refresh in middleware instead.",
        cookieError
      );
      // We don't return false here because the DB rotation succeeded.
      // The tokens will be lost if not handled by middleware, but we avoid a crash.
    }

    // The new JWT carries companyId/role straight from the row we just read, so
    // whatever made the old one stale is now resolved. Clear the marker or the
    // proxy would bounce every subsequent request through /api/auth/refresh.
    await clearStaleClaims(session.user.id);

    // Extract current IP and User Agent from headers
    const headerStore = await headers();
    const currentIp = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || session.ipAddress || "127.0.0.1";
    const currentDevice = headerStore.get("user-agent") || session.deviceInfo || "Unknown Device";

    // Log the refresh event
    await logAuditEvent({
      userId: session.user.id,
      action: "TOKEN_REFRESH",
      ipAddress: currentIp,
      deviceInfo: currentDevice,
    });

    return true;
  } catch (error) {
    if ((error as { digest?: string })?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw error;
    }
    logger.error("Session refresh failed:", error);
    return false;
  }
}
