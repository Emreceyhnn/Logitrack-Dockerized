"use server";

import { headers } from "next/headers";
import { db } from "../../db";
import {
  authenticatedAction,
  maybeAuthenticatedAction,
} from "../../auth-middleware";
import { rateLimit } from "../../rate-limiter";
import { generateRefreshToken, hashToken } from "../session/internal";
import { logAuditEvent, invalidateUserSessionCache } from "../session";
import { sendEmailVerificationEmail } from "../../services/email";
import { getBaseUrl } from "../../utils/baseUrl";
import {
  resendVerificationSchema,
  verifyEmailSchema,
} from "../../validation/serverSchemas";
import { logger } from "@/app/lib/logger";

const VERIFICATION_EXPIRY_HOURS = 24;

/**
 * Same shape for every outcome — unknown address, already-verified account, or
 * a link that was really sent. Anything more specific would turn this into an
 * account-enumeration oracle (mirrors requestPasswordReset).
 */
const GENERIC_RESULT = { success: true } as const;

/**
 * tr-Belirtilen kullanıcı için doğrulama jetonu üretir ve e-posta gönderir.
 *    Kayıt akışından çağrılır; gönderim başarısız olsa bile kayıt bozulmaz.
 * en-Issues a verification token for the given user and emails it. Called from the signup flow;
 *    a delivery failure never breaks registration — the caller ignores the return value.
 * input (userId: string, email: string, userName: string, lang: "en" | "tr")
 * output (Promise<boolean>) — true when the email was handed off to Resend
 */
export async function issueEmailVerification(
  userId: string,
  email: string,
  userName: string,
  lang: "en" | "tr"
): Promise<boolean> {
  const rawToken = generateRefreshToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000
  );

  // Supersede any earlier outstanding tokens so only the newest link works.
  await db.emailVerificationToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  await db.emailVerificationToken.create({
    data: { userId, email, tokenHash, expiresAt },
  });

  const verifyUrl = `${getBaseUrl()}/${lang}/auth/verify-email?token=${rawToken}`;

  const delivered = await sendEmailVerificationEmail(
    email,
    verifyUrl,
    userName,
    lang,
    VERIFICATION_EXPIRY_HOURS
  );

  if (!delivered) {
    // The send failed, so this token will never reach anyone. Burn it rather
    // than leaving a live credential in the table that nobody can use, and log
    // loudly — the token row existing while no email was sent is exactly the
    // state that made this failure look like a success.
    await db.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    logger.error(
      `[issueEmailVerification] No verification email was delivered for user ${userId}; ` +
        `the issued token has been invalidated. The user must request a new link.`
    );
  }

  return delivered;
}

/**
 * tr-Doğrulama jetonunu tüketir ve kullanıcının e-postasını doğrulanmış olarak işaretler
 * en-Consumes a verification token and marks the user's email as verified
 * input (_user: AuthenticatedUser | null, token: string)
 * output (Promise<{ success: true; alreadyVerified: boolean } | { error: string }>)
 */
export const verifyEmailToken = maybeAuthenticatedAction(
  async (_user, token: string) => {
    const parsed = verifyEmailSchema.safeParse({ token });
    if (!parsed.success) {
      return { error: "This verification link is invalid or has expired." };
    }

    const headerStore = await headers();
    const ip =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = headerStore.get("user-agent") || "Unknown Device";

    // Caps brute-forcing of the token itself.
    const ipLimit = await rateLimit(ip, 20, 3600, "rate-limit:verify-email-ip:");
    if (!ipLimit.success) {
      return { error: "Too many attempts. Please try again later." };
    }

    try {
      const tokenHash = hashToken(parsed.data.token);
      const record = await db.emailVerificationToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          userId: true,
          email: true,
          expiresAt: true,
          usedAt: true,
          user: { select: { email: true, emailVerifiedAt: true } },
        },
      });

      if (!record || record.expiresAt < new Date()) {
        return { error: "This verification link is invalid or has expired." };
      }

      // Already verified: report success rather than an error so a user who
      // clicks the link twice isn't told something went wrong.
      if (record.user.emailVerifiedAt) {
        return { success: true as const, alreadyVerified: true };
      }

      if (record.usedAt) {
        return { error: "This verification link is invalid or has expired." };
      }

      // The address changed after the token was issued, so this token no longer
      // proves anything about the current address.
      if (record.user.email !== record.email) {
        return { error: "This verification link is invalid or has expired." };
      }

      // Consuming the token and stamping the user happen together: the
      // usedAt: null guard makes the update its own concurrency control, so
      // two simultaneous clicks can't both succeed.
      const consumed = await db.$transaction(async (tx) => {
        const claim = await tx.emailVerificationToken.updateMany({
          where: { id: record.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        if (claim.count === 0) return false;

        await tx.user.update({
          where: { id: record.userId },
          data: { emailVerifiedAt: new Date() },
        });
        return true;
      });

      if (!consumed) {
        return { error: "This verification link is invalid or has expired." };
      }

      // The JWT still carries emailVerified:false until it is re-minted. Drop
      // the cached session so the next request re-reads from the DB and
      // refreshSession bakes in the new claim — no re-login required.
      await invalidateUserSessionCache(record.userId);

      await logAuditEvent({
        userId: record.userId,
        action: "EMAIL_VERIFIED",
        ipAddress: ip,
        deviceInfo: userAgent,
        metadata: { email: record.email },
      });

      return { success: true as const, alreadyVerified: false };
    } catch (error) {
      logger.error("[verifyEmailToken] Failed:", error);
      return { error: "Unable to verify your email right now. Please try again later." };
    }
  }
);

/**
 * tr-Oturum açmış kullanıcının kendi adresine doğrulama e-postası gönderir ve adresi geri döner.
 *    Adres oturumdan çözülür; çağıranın e-postayı bilmesi (veya göndermesi) gerekmez.
 * en-Sends a verification email to the signed-in user's own address, and returns that address.
 *    The address is resolved from the session, so the caller never has to know or supply it —
 *    which matters because the session token doesn't carry `email`.
 *
 *    Unlike resendEmailVerification this can be specific about the outcome: the caller has already
 *    proven who they are, so "already verified" or "no address on file" leaks nothing. It is still
 *    rate-limited per user to keep it from becoming a mail relay.
 * input (user: AuthenticatedUser)
 * output (Promise<{ success: true; email: string } | { error: string }>)
 */
export const sendMyEmailVerification = authenticatedAction(async (user) => {
  const limit = await rateLimit(user.id, 3, 3600, "rate-limit:verify-self:");
  if (!limit.success) {
    return { error: "Too many requests. Please try again later." };
  }

  try {
    const record = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        language: true,
        emailVerifiedAt: true,
      },
    });

    if (!record?.email) return { error: "No email address on file." };
    if (record.emailVerifiedAt) {
      return { success: true as const, email: record.email };
    }

    const lang: "en" | "tr" = record.language === "tr" ? "tr" : "en";
    await issueEmailVerification(record.id, record.email, record.name, lang);

    const headerStore = await headers();
    await logAuditEvent({
      userId: record.id,
      action: "EMAIL_VERIFICATION_SENT",
      ipAddress:
        headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headerStore.get("x-real-ip") ||
        "127.0.0.1",
      deviceInfo: headerStore.get("user-agent") || "Unknown Device",
      metadata: { email: record.email, self: true },
    });

    return { success: true as const, email: record.email };
  } catch (error) {
    logger.error("[sendMyEmailVerification] Failed:", error);
    return { error: "Could not send the verification email." };
  }
});

/**
 * tr-Doğrulama e-postasını yeniden gönderir. Hesabın var olup olmadığını sızdırmamak için
 *    her durumda aynı yanıtı döner.
 * en-Resends the verification email. Always returns the same response so it cannot be used to
 *    discover which addresses are registered.
 * input (_user: AuthenticatedUser | null, email: string)
 * output (Promise<{ success: true } | { error: string }>)
 */
export const resendEmailVerification = maybeAuthenticatedAction(
  async (_user, email: string) => {
    const parsed = resendVerificationSchema.safeParse({ email });
    if (!parsed.success) return GENERIC_RESULT;

    const normalizedEmail = parsed.data.email;

    const headerStore = await headers();
    const ip =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = headerStore.get("user-agent") || "Unknown Device";

    const ipLimit = await rateLimit(ip, 5, 3600, "rate-limit:verify-resend-ip:");
    if (!ipLimit.success) {
      return { error: "Too many requests. Please try again later." };
    }
    const emailLimit = await rateLimit(
      normalizedEmail,
      3,
      3600,
      "rate-limit:verify-resend-email:"
    );
    // Stop silently — saying "this address hit its limit" would confirm it exists.
    if (!emailLimit.success) return GENERIC_RESULT;

    try {
      const user = await db.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          name: true,
          email: true,
          language: true,
          emailVerifiedAt: true,
        },
      });

      // No account, or nothing left to verify. Both return the generic result.
      if (!user || user.emailVerifiedAt) return GENERIC_RESULT;

      const lang: "en" | "tr" = user.language === "tr" ? "tr" : "en";
      await issueEmailVerification(user.id, user.email, user.name, lang);

      await logAuditEvent({
        userId: user.id,
        action: "EMAIL_VERIFICATION_SENT",
        ipAddress: ip,
        deviceInfo: userAgent,
        metadata: { email: normalizedEmail },
      });

      return GENERIC_RESULT;
    } catch (error) {
      // Only real accounts reach this line, so a distinct error here would leak
      // existence. Log loudly for operators, stay generic to the caller.
      logger.error("[resendEmailVerification] Failed:", error);
      return GENERIC_RESULT;
    }
  }
);
