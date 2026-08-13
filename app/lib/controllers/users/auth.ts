"use server";

import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { checkPermission } from "../utils/checkPermission";
import { jwtVerify } from "jose";
import { db } from "../../db";
import { INCLUDE_DELETED } from "../../softDelete";
import { exclude } from "@/app/lib/utils/exclude";
import {
  authenticatedAction,
  maybeAuthenticatedAction,
  AuthenticatedUser,
} from "../../auth-middleware";
import {
  createSession,
  revokeSession,
  clearAuthCookies,
  logAuditEvent,
  validateSession,
  toSessionPayload,
} from "../session";
import { headers } from "next/headers";
import { rateLimit } from "../../rate-limiter";
import {
  registerUserSchema,
  loginUserSchema,
} from "../../validation/serverSchemas";
import { logger } from "@/app/lib/logger";
import { grantTrial, verifyDemoSignupToken } from "@/app/lib/entitlement.server";
import { issueEmailVerification } from "./emailVerification";


const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not defined");
  return secret;
};

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

/**
 * tr-JWT jetonundan (token) kullanıcı bilgisini doğrular ve getirir
 * en-verifies and retrieves user information from a JWT token
 * input (user: AuthenticatedUser, token: string)
 * output (Promise<UserWithoutPassword | null>)
 */
export const getUserFromToken = authenticatedAction(
  async (
    user,
    token: string
  ): Promise<Omit<
    import("@prisma/client").User & {
      company: import("@prisma/client").Company | null;
    },
    "password"
  > | null> => {
    const companyId = user?.companyId || "";
    try {
      await checkPermission(user, companyId);

      const secret = new TextEncoder().encode(getJwtSecret());
      const { payload } = await jwtVerify(token, secret);
      const decoded = await toSessionPayload(payload);
      if (!decoded) {
        throw new Error("Invalid token");
      }

      const foundUser = await db.user.findUnique({
        where: { id: decoded.id },
        include: { company: true },
      });

      if (!foundUser) {
        throw new Error("User not found");
      }

      return exclude(foundUser, ["password"]);
    } catch (error) {
      logger.error("Failed to get user from token:", error);
      throw new Error("Authentication failed: Invalid token or user not found");
    }
  }
);

/**
 * tr-yeni bir kullanıcı kaydı oluşturur, rate limit uygular ve (varsa) demo jetonunu doğrular
 * en-creates a new user registration, applies rate limiting, and verifies demo token if present
 * input (user: AuthenticatedUser | null, name: string, surname: string, password: string, email: string, avatarUrl?: string, demoToken?: string)
 * output (Promise<{ user?: User, error?: string, field?: string }>)
 */
export const RegisterUser = maybeAuthenticatedAction(
  async (
    user: AuthenticatedUser | null,
    name: string,
    surname: string,
    password: string,
    email: string,
    avatarUrl?: string,
    demoToken?: string
  ) => {
    try {
      // Server actions are directly callable from the network, so input must
      // be validated here — the client-side yup schema is not a boundary.
      const parsed = registerUserSchema.safeParse({
        name,
        surname,
        password,
        email,
        avatarUrl,
      });
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        return {
          error: first?.message ?? "Invalid registration data",
          field: String(first?.path[0] ?? "general"),
        };
      }
      const input = parsed.data;

      // IP and device info come exclusively from trusted request headers —
      // never from client-supplied arguments, which would let a caller pick
      // its own rate-limit key and poison the audit trail.
      const headerStore = await headers();
      const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "127.0.0.1";
      const userAgent = headerStore.get("user-agent") || "Unknown Device";

      // Rate limit registration by IP: Max 5 attempts per hour
      const ipLimit = await rateLimit(ip, 5, 3600, "rate-limit:register-ip:");
      if (!ipLimit.success) {
        return { error: "Too many registration attempts from this IP. Please try again in an hour." };
      }

      // If user exists, they must be an admin to register others
      if (user) {
        await checkPermission(user, user.companyId, ["role_admin"]);
      }

      // INCLUDE_DELETED makes this check see soft-deleted accounts too.
      // `email` stays `@unique` at the database level regardless of deletion,
      // so without the opt-out a deleted user's address would look available
      // here and `user.create` below would violate the constraint — surfacing
      // as an opaque P2002 crash instead of this message.
      const isExist = await db.user.findFirst({
        where: { email: input.email, ...INCLUDE_DELETED },
      });

      if (isExist) {
        return { error: "Email already exists", field: "email" };
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      const newUser = await db.user.create({
        data: {
          name: input.name,
          surname: input.surname,
          password: hashedPassword,
          email: input.email,
          avatarUrl: input.avatarUrl ?? null,
          currency: "USD",
          companyId: user?.companyId || null, // Guest registration has no company initially
        },
      });

      // Only a guest self-registration signs this browser in as the new user.
      // An admin registering someone else keeps their own session cookies, and
      // that user inherits the company's plan rather than a self-serve trial.
      if (!user) {
        // Self-serve trial is a demo-request perk, not a default: only a
        // signup that arrives with a valid demoToken (minted by
        // submitDemoRequest for this exact email) gets one. A direct/organic
        // signup gets no trial and lands on pending-access with accessStatus
        // NONE — they can't create a company until approved. Grant it BEFORE
        // minting the session so the access token already carries
        // accessStatus=TRIAL — instant dashboard access with no token-refresh
        // wait. A failure here is non-fatal: registration still succeeds and
        // the user lands on the pending-access screen, which polls until
        // entitlement resolves.
        if (await verifyDemoSignupToken(demoToken, input.email)) {
          try {
            await grantTrial(newUser.id);
          } catch (trialErr) {
            logger.error(
              "Trial grant failed at signup; user will see pending-access:",
              trialErr
            );
          }
        }
        await createSession(newUser, userAgent, ip);
      }

      // Prove the address belongs to whoever signed up. Non-fatal by design:
      // the account already exists, and failing registration over a mail
      // outage would be worse than an unverified address. The user can request
      // a new link from the verify-email page at any time.
      //
      // issueEmailVerification reports a delivery failure by RETURNING false
      // rather than throwing (only the token write throws), so the return value
      // must be inspected — ignoring it made a non-delivering signup look
      // identical to a successful one, with the token sitting in the DB and no
      // email ever sent.
      try {
        const delivered = await issueEmailVerification(
          newUser.id,
          newUser.email,
          newUser.name,
          newUser.language === "tr" ? "tr" : "en"
        );
        if (!delivered) {
          logger.error(
            `[RegisterUser] Verification email was NOT delivered for user ${newUser.id}. ` +
              `The token exists but the send failed — see the preceding ` +
              `[email] sendEmailVerificationEmail error for the provider reason.`
          );
        }
      } catch (verifyErr) {
        logger.error(
          "Verification email could not be issued at signup:",
          verifyErr
        );
      }

      // Audit log
      await logAuditEvent({
        userId: newUser.id,
        action: "REGISTER",
        ipAddress: ip,
        deviceInfo: userAgent,
        metadata: { email: input.email, avatarUrl: input.avatarUrl },
      });

      return {
        user: {
          id: newUser.id,
          name: newUser.name,
          surname: newUser.surname,
          email: newUser.email,
          avatarUrl: newUser.avatarUrl,
          companyId: newUser.companyId,
        },
      };
    } catch (error) {
      logger.error("Failed to create user:", error);
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return { error: message, field: "general" };
    }
  }
);

// ─── Login ──────────────────────────────────────────────────────────────────

/**
 * tr-kullanıcı girişi yapar, rate limit denetimleri uygular ve başarılı olursa oturum başlatır
 * en-logs in a user, applies rate limit checks, and starts a session upon success
 * input (_user: AuthenticatedUser | null, email: string, password: string)
 * output (Promise<{ user?: User, error?: string }>)
 */
export const LoginUser = maybeAuthenticatedAction(
  async (
    _user: AuthenticatedUser | null,
    email: string,
    password: string
  ) => {
    try {
      // Reject malformed input before touching the rate limiter or the DB.
      // A malformed email can never belong to an account, so the generic
      // credentials error is accurate and leaks nothing.
      const parsed = loginUserSchema.safeParse({ email, password });
      if (!parsed.success) {
        return { error: "Invalid credentials" };
      }
      const input = parsed.data;

      // IP and device info come exclusively from trusted request headers —
      // never from client-supplied arguments, which would let a caller pick
      // its own rate-limit key and poison the audit trail.
      const headerStore = await headers();
      const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "127.0.0.1";
      const userAgent = headerStore.get("user-agent") || "Unknown Device";

      // 1. IP Rate Limiting: Max 5 login attempts per minute
      const ipLimit = await rateLimit(ip, 5, 60, "rate-limit:login-ip:");
      if (!ipLimit.success) {
        return { error: "Too many login attempts. Please try again later." };
      }

      // 2. Email Rate Limiting: Max 5 login attempts per minute per email (prevent distributed brute force on single account)
      const emailLimit = await rateLimit(input.email.toLocaleLowerCase('en-US'), 5, 60, "rate-limit:login-email:");
      if (!emailLimit.success) {
        return { error: "Too many login attempts for this account. Please try again later." };
      }

      // Note: Login typically doesn't check companyId since they might not be in one yet
      // But authenticatedAction already verifies the user.

      const foundUser = await db.user.findUnique({
        where: { email: input.email },
      });

      if (!foundUser) {
        await logAuditEvent({
          action: "LOGIN_FAILED",
          ipAddress: ip,
          deviceInfo: userAgent,
          metadata: { email: input.email, reason: "User not found" },
        });
        return { error: "Invalid credentials" };
      }

      const isPasswordValid = await bcrypt.compare(
        input.password,
        foundUser.password || ""
      );
      if (!isPasswordValid) {
        await logAuditEvent({
          userId: foundUser.id,
          action: "LOGIN_FAILED",
          ipAddress: ip,
          deviceInfo: userAgent,
          metadata: { email: input.email, reason: "Invalid password" },
        });
        return { error: "Invalid credentials" };
      }

      // Update lastLoginAt
      await db.user.update({
        where: { id: foundUser.id },
        data: { lastLoginAt: new Date() },
      });

      // Create server-side session
      await createSession(foundUser, userAgent, ip);

      // Log successful login
      await logAuditEvent({
        userId: foundUser.id,
        action: "LOGIN",
        ipAddress: ip,
        deviceInfo: userAgent,
      });

      return {
        user: {
          id: foundUser.id,
          name: foundUser.name,
          surname: foundUser.surname,
          email: foundUser.email,
          companyId: foundUser.companyId,
          timezone: foundUser.timezone,
          dateFormat: foundUser.dateFormat,
          timeFormat: foundUser.timeFormat,
          currency: foundUser.currency || "USD",
          language: foundUser.language || "en",
        },
      };
    } catch (error) {
      logger.error("Critical Login Error:", error);
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return { error: message };
    }
  }
);

// ─── Google OAuth ───────────────────────────────────────────────────────────

// Minimal shape we read off either verification path — the id_token JWT
// payload and Google's tokeninfo/userinfo response both carry these fields
// under the same names.
interface GoogleIdentity {
  email: string;
  emailVerified: boolean;
  sub: string;
  givenName?: string;
  familyName?: string;
  name?: string;
  picture?: string;
}

/**
 * The button hands us either a real `id_token` (a signed JWT — verified
 * offline against Google's public keys) or an implicit-flow `access_token`
 * (an opaque string — must be verified by asking Google's own endpoint who
 * it belongs to, since we can't check its signature ourselves).
 */
async function resolveGoogleIdentity(
  credential: string
): Promise<GoogleIdentity | null> {
  const looksLikeJwt = credential.split(".").length === 3;

  if (looksLikeJwt && googleClient && GOOGLE_CLIENT_ID) {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.email || !payload.sub) return null;
      return {
        email: payload.email,
        emailVerified: Boolean(payload.email_verified),
        sub: payload.sub,
        ...(payload.given_name && { givenName: payload.given_name }),
        ...(payload.family_name && { familyName: payload.family_name }),
        ...(payload.name && { name: payload.name }),
        ...(payload.picture && { picture: payload.picture }),
      };
    } catch (verifyError) {
      logger.error("Google ID token verification failed:", verifyError);
      return null;
    }
  }

  // Opaque access_token: ask Google's tokeninfo endpoint to resolve it. This
  // call is itself the verification — a forged/expired token gets rejected
  // by Google, not by us.
  try {
    const resp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(credential)}`
    );
    if (!resp.ok) return null;
    const info = (await resp.json()) as {
      email?: string;
      email_verified?: string | boolean;
      user_id?: string;
      aud?: string;
      error?: string;
    };
    if (info.error || !info.email || !info.user_id) return null;
    // tokeninfo doesn't return name/picture — fetch userinfo for those.
    let profile: { given_name?: string; family_name?: string; name?: string; picture?: string } = {};
    try {
      const profileResp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${credential}` },
      });
      if (profileResp.ok) profile = await profileResp.json();
    } catch {
      // Non-fatal — we still have email/sub from tokeninfo.
    }
    return {
      email: info.email,
      emailVerified: info.email_verified === true || info.email_verified === "true",
      sub: info.user_id,
      ...(profile.given_name && { givenName: profile.given_name }),
      ...(profile.family_name && { familyName: profile.family_name }),
      ...(profile.name && { name: profile.name }),
      ...(profile.picture && { picture: profile.picture }),
    };
  } catch (fetchError) {
    logger.error("Google access_token verification failed:", fetchError);
    return null;
  }
}

/**
 * tr-Google hesabıyla giriş yapar veya yeni bir hesap oluşturup oturum başlatır
 * en-logs in with a Google account or creates a new one and starts a session
 * input (_user: AuthenticatedUser | null, credential: string, demoToken?: string)
 * output (Promise<{ user?: User, error?: string }>)
 */
export const LoginWithGoogle = maybeAuthenticatedAction(
  async (_user: AuthenticatedUser | null, credential: string, demoToken?: string) => {
    try {
      if (!GOOGLE_CLIENT_ID) {
        return { error: "Google sign-in is not configured on this server." };
      }
      if (!credential || typeof credential !== "string") {
        return { error: "Invalid Google credential." };
      }

      const headerStore = await headers();
      const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "127.0.0.1";
      const userAgent = headerStore.get("user-agent") || "Unknown Device";

      // Rate limit by IP: Max 10 attempts per minute — Google sign-in can't be
      // brute-forced (the token is verified against Google's public keys), but
      // this still caps abuse of our own DB lookups/creates.
      const ipLimit = await rateLimit(ip, 10, 60, "rate-limit:google-auth-ip:");
      if (!ipLimit.success) {
        return { error: "Too many attempts. Please try again later." };
      }

      const identity = await resolveGoogleIdentity(credential);
      if (!identity) {
        return { error: "Invalid Google credential." };
      }
      if (!identity.emailVerified) {
        return { error: "Google email is not verified." };
      }

      const email = identity.email.toLowerCase();
      let foundUser = await db.user.findUnique({ where: { email } });

      if (foundUser) {
        // Existing local account signing in with Google for the first time:
        // link the googleId so future Google sign-ins resolve immediately.
        if (!foundUser.googleId) {
          foundUser = await db.user.update({
            where: { id: foundUser.id },
            data: {
              googleId: identity.sub,
              provider: foundUser.provider === "local" ? "google" : foundUser.provider,
              // Signing in through Google proves the address belongs to them,
              // so a previously unverified local account is verified now.
              ...(foundUser.emailVerifiedAt ? {} : { emailVerifiedAt: new Date() }),
            },
          });
        }
      } else {
        const ipLimitRegister = await rateLimit(ip, 5, 3600, "rate-limit:register-ip:");
        if (!ipLimitRegister.success) {
          return { error: "Too many registration attempts from this IP. Please try again in an hour." };
        }

        foundUser = await db.user.create({
          data: {
            name: identity.givenName || identity.name || "Google",
            surname: identity.familyName || "",
            email,
            password: null,
            provider: "google",
            googleId: identity.sub,
            avatarUrl: identity.picture ?? null,
            currency: "USD",
            // Google already asserted email_verified (checked above), so there
            // is nothing left for us to prove — no verification mail needed.
            emailVerifiedAt: new Date(),
          },
        });

        // Same rule as the password signup path: only a valid demoToken for
        // this exact email unlocks the self-serve trial (and with it, company
        // creation). A direct "Continue with Google" click carries none.
        if (await verifyDemoSignupToken(demoToken, email)) {
          try {
            await grantTrial(foundUser.id);
          } catch (trialErr) {
            logger.error(
              "Trial grant failed at Google signup; user will see pending-access:",
              trialErr
            );
          }
        }

        await logAuditEvent({
          userId: foundUser.id,
          action: "REGISTER",
          ipAddress: ip,
          deviceInfo: userAgent,
          metadata: { email, provider: "google" },
        });
      }

      if (foundUser.status !== "ACTIVE") {
        return { error: "This account is not active." };
      }

      await db.user.update({
        where: { id: foundUser.id },
        data: { lastLoginAt: new Date() },
      });

      await createSession(foundUser, userAgent, ip);

      await logAuditEvent({
        userId: foundUser.id,
        action: "LOGIN",
        ipAddress: ip,
        deviceInfo: userAgent,
        metadata: { provider: "google" },
      });

      return {
        user: {
          id: foundUser.id,
          name: foundUser.name,
          surname: foundUser.surname,
          email: foundUser.email,
          companyId: foundUser.companyId,
          timezone: foundUser.timezone,
          dateFormat: foundUser.dateFormat,
          timeFormat: foundUser.timeFormat,
          currency: foundUser.currency || "USD",
          language: foundUser.language || "en",
        },
      };
    } catch (error) {
      logger.error("Critical Google Login Error:", error);
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return { error: message };
    }
  }
);

// ─── Logout ─────────────────────────────────────────────────────────────────

/**
 * tr-kullanıcının mevcut oturumunu kapatır ve çerezleri temizler
 * en-logs out the user from the current session and clears cookies
 * input ()
 * output (Promise<{ success: boolean }>)
 */
export const LogoutUser = authenticatedAction(async () => {
  try {
    // Get current session
    const sessionUser = await validateSession();

    if (sessionUser?.sessionId) {
      // Revoke the session in DB
      await revokeSession(sessionUser.sessionId);

      const headerStore = await headers();
      const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "127.0.0.1";
      const userAgent = headerStore.get("user-agent") || "Unknown Device";

      // Log logout
      await logAuditEvent({
        userId: sessionUser.id,
        action: "LOGOUT",
        ipAddress: ip,
        deviceInfo: userAgent,
      });
    }

    // Clear cookies regardless
    await clearAuthCookies();

    return { success: true };
  } catch (error) {
    logger.error("Failed to logout:", error);
    // Even if something fails, clear cookies
    await clearAuthCookies();
    return { success: true };
  }
});
