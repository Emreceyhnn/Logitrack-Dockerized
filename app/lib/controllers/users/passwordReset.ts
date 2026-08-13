"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { db } from "../../db";
import { maybeAuthenticatedAction } from "../../auth-middleware";
import { rateLimit } from "../../rate-limiter";
import { generateRefreshToken, hashToken } from "../session/internal";
import { revokeAllUserSessions, logAuditEvent } from "../session";
import { sendPasswordResetEmail, sendSecurityAlertEmail } from "../../services/email";
import { getBaseUrl } from "../../utils/baseUrl";
import {
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "../../validation/serverSchemas";
import { logger } from "@/app/lib/logger";

const RESET_TOKEN_EXPIRY_MINUTES = 60;

/**
 * Deliberately identical for every outcome — unknown email, OAuth-only account,
 * or a link that was actually sent. Returning anything more specific would turn
 * this endpoint into an account-enumeration oracle.
 */
const GENERIC_RESULT = { success: true } as const;

/**
 * tr-Şifre sıfırlama talebi oluşturur ve kullanıcıya tek kullanımlık bir bağlantı gönderir.
 *    Hesap bulunamasa bile aynı yanıtı döner (hesap sızdırmayı önlemek için).
 * en-Creates a password reset request and emails a single-use link. Always returns the same
 *    response regardless of whether the account exists, to prevent account enumeration.
 * input (_user: AuthenticatedUser | null, email: string)
 * output (Promise<{ success: true } | { error: string }>)
 */
export const requestPasswordReset = maybeAuthenticatedAction(
  async (_user, email: string) => {
    const parsed = requestPasswordResetSchema.safeParse({ email });
    // A malformed address can never belong to an account, so the generic
    // response is truthful and still leaks nothing.
    if (!parsed.success) return GENERIC_RESULT;

    const normalizedEmail = parsed.data.email;

    const headerStore = await headers();
    const ip =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = headerStore.get("user-agent") || "Unknown Device";

    // Two independent limits: by IP (stops one host enumerating many accounts)
    // and by email (stops a mailbox being flooded from rotating IPs).
    const ipLimit = await rateLimit(ip, 5, 3600, "rate-limit:pwreset-ip:");
    if (!ipLimit.success) {
      return { error: "Too many password reset requests. Please try again later." };
    }
    const emailLimit = await rateLimit(
      normalizedEmail,
      3,
      3600,
      "rate-limit:pwreset-email:"
    );
    // Silently stop here rather than surfacing the limit: telling the caller
    // "this address hit its limit" would confirm the address exists.
    if (!emailLimit.success) return GENERIC_RESULT;

    try {
      const user = await db.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, name: true, email: true, language: true, password: true },
      });

      // No account, or a Google-only account with no password to reset. Both
      // return the generic result — sending nothing is correct, and saying so
      // would leak which addresses are registered.
      if (!user || !user.password) return GENERIC_RESULT;

      const rawToken = generateRefreshToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(
        Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000
      );

      // Invalidate any earlier outstanding tokens so only the newest link
      // works — otherwise every past request stays usable until it expires.
      await db.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await db.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      const lang: "en" | "tr" = user.language === "tr" ? "tr" : "en";
      const resetUrl = `${getBaseUrl()}/${lang}/auth/reset-password?token=${rawToken}`;

      // A delivery failure must not change the response. Only a real account
      // ever reaches this line — an unknown address returned above — so
      // surfacing a send error here would tell an attacker "this address is
      // registered". Log it loudly for operators, stay generic to the caller.
      try {
        await sendPasswordResetEmail(
          user.email,
          resetUrl,
          user.name,
          lang,
          RESET_TOKEN_EXPIRY_MINUTES
        );
      } catch (sendError) {
        logger.error(
          "[requestPasswordReset] Reset email could not be delivered. " +
          "The token was created but the user will never receive it:",
          sendError
        );
      }

      await logAuditEvent({
        userId: user.id,
        action: "PASSWORD_RESET_REQUEST",
        ipAddress: ip,
        deviceInfo: userAgent,
        metadata: { email: normalizedEmail },
      });

      return GENERIC_RESULT;
    } catch (error) {
      // Never echo the internal reason to the caller — it would distinguish
      // "no such user" from "send failed" and reintroduce enumeration.
      logger.error("[requestPasswordReset] Failed:", error);
      return { error: "Unable to send the reset email right now. Please try again later." };
    }
  }
);

/**
 * tr-Sıfırlama jetonunun hâlâ geçerli olup olmadığını kontrol eder (formu göstermeden önce)
 * en-Checks whether a reset token is still valid (before rendering the form)
 * input (rawToken: string)
 * output (Promise<{ valid: boolean }>)
 */
export async function verifyPasswordResetToken(
  rawToken: string
): Promise<{ valid: boolean }> {
  if (!rawToken) return { valid: false };

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: { expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { valid: false };
  }
  return { valid: true };
}

/**
 * tr-Geçerli bir jetonla kullanıcının şifresini değiştirir ve tüm oturumlarını sonlandırır
 * en-Sets a new password using a valid token and terminates every existing session
 * input (_user: AuthenticatedUser | null, token: string, password: string)
 * output (Promise<{ success: true } | { error: string, field?: string }>)
 */
export const resetPassword = maybeAuthenticatedAction(
  async (_user, token: string, password: string) => {
    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return {
        error: first?.message ?? "Invalid data",
        field: String(first?.path[0] ?? "general"),
      };
    }

    const headerStore = await headers();
    const ip =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = headerStore.get("user-agent") || "Unknown Device";

    // Caps brute-forcing of the token itself.
    const ipLimit = await rateLimit(ip, 10, 3600, "rate-limit:pwreset-confirm-ip:");
    if (!ipLimit.success) {
      return { error: "Too many attempts. Please try again later." };
    }

    try {
      const tokenHash = hashToken(parsed.data.token);
      const record = await db.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, expiresAt: true, usedAt: true },
      });

      if (!record || record.usedAt || record.expiresAt < new Date()) {
        return { error: "This reset link is invalid or has expired." };
      }

      const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

      // Marking the token used and writing the password in one transaction
      // means a token can never survive a partially-applied reset. The
      // usedAt: null guard makes the update itself the concurrency control:
      // two simultaneous submissions, only one wins.
      const consumed = await db.$transaction(async (tx) => {
        const claim = await tx.passwordResetToken.updateMany({
          where: { id: record.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        if (claim.count === 0) return false;

        await tx.user.update({
          where: { id: record.userId },
          data: { password: hashedPassword },
        });
        return true;
      });

      if (!consumed) {
        return { error: "This reset link is invalid or has expired." };
      }

      // A reset is the remedy for a suspected compromise, so every existing
      // session must die — including any the attacker still holds.
      await revokeAllUserSessions(record.userId);

      await logAuditEvent({
        userId: record.userId,
        action: "PASSWORD_RESET_COMPLETE",
        ipAddress: ip,
        deviceInfo: userAgent,
      });

      // tr-Sıfırlamayı hesabın gerçek sahibi başlatmamış olabilir. Bant dışı uyarı,
      //    ele geçirme girişimini fark etmesinin tek yolu — bu yüzden her zaman gönderilir.
      // en-The real owner may not be the one who initiated this reset. The out-of-band alert is
      //    their only chance to notice a takeover, so it always sends.
      const resetUser = await db.user.findUnique({
        where: { id: record.userId },
        select: { email: true, name: true, language: true },
      });

      if (resetUser) {
        await sendSecurityAlertEmail(
          {
            email: resetUser.email,
            lang: resetUser.language === "tr" ? "tr" : "en",
          },
          {
            kind: "PASSWORD_RESET",
            userName: resetUser.name,
            ipAddress: ip,
            deviceInfo: userAgent,
          }
        );
      }

      return { success: true as const };
    } catch (error) {
      logger.error("[resetPassword] Failed:", error);
      return { error: "Unable to reset your password right now. Please try again later." };
    }
  }
);
