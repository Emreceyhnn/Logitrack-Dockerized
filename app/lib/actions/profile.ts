"use server";

import { cookies, headers } from "next/headers";
import { db } from "../db";
import { sendSecurityAlertEmail } from "../services/email";
// Imported from the leaf module rather than the ./session barrel: the barrel
// also re-exports session/manage, pulling extra modules into every consumer.
import { logAuditEvent } from "../controllers/session/audit";
import { authenticatedAction } from "../auth-middleware";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import {
  generateAccessToken,
  hashToken,
  ACCESS_TOKEN_MAX_AGE,
  COOKIE_OPTIONS,
} from "../controllers/session/internal";
import { redis } from "../redis";

// ─── Get Current User Profile ─────────────────────────────────────────────
/**
 * tr-mevcut kullanıcının profil bilgilerini getirir
 * en-retrieves the profile information of the current user
 * input ()
 * output (Promise<User>)
 */
export const getMyProfile = authenticatedAction(async (user) => {
  const found = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      surname: true,
      email: true,

      avatarUrl: true,
      roleId: true,
      companyId: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  if (!found) throw new Error("User not found");
  return found;
});

/**
 * tr-mevcut kullanıcının profil bilgilerini günceller
 * en-updates the profile information of the current user
 * input (data: { name: string; surname: string; avatarUrl?: string | null })
 * output (Promise<{ user?: User; error?: string }>)
 */
export const updateMyProfile = authenticatedAction(
  async (
    user,
    data: {
      name: string;
      surname: string;
      avatarUrl?: string | null;
    }
  ) => {
    if (!data.name || !data.name.trim()) return { error: "Name is required" };
    if (!data.surname || !data.surname.trim()) return { error: "Surname is required" };

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        surname: data.surname,
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
      },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        avatarUrl: true,
      },
    });

    // The access token is a signed JWT carrying a snapshot of the user's
    // profile fields (see generateAccessToken). Updating the DB row alone
    // leaves the still-valid cookie showing the stale name/surname/avatar
    // until it naturally expires or a refresh happens. Re-sign and swap the
    // cookie now so the change is visible immediately, and repoint the
    // existing session row + cache at the new token hash so it isn't
    // treated as revoked.
    const cookieStore = await cookies();
    const oldToken = cookieStore.get("token")?.value;

    const newAccessToken = await generateAccessToken({
      ...user,
      name: updated.name,
      surname: updated.surname,
      avatarUrl: updated.avatarUrl,
    });

    if (oldToken) {
      const oldHash = hashToken(oldToken);
      const newHash = hashToken(newAccessToken);
      await db.session
        .updateMany({
          where: { id: user.sessionId, token: oldHash },
          data: { token: newHash },
        })
        .catch(() => {});
      await redis.del(`session:${oldHash}`).catch(() => {});
    }

    cookieStore.set("token", newAccessToken, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    revalidatePath("/", "layout");

    return { user: updated };
  }
);

// ─── Change Password ──────────────────────────────────────────────────────
/**
 * tr-mevcut kullanıcının şifresini değiştirir
 * en-changes the password of the current user
 * input (data: { currentPassword: string; newPassword: string })
 * output (Promise<{ success?: boolean; error?: string }>)
 */
export const changeMyPassword = authenticatedAction(
  async (
    user,
    data: {
      currentPassword: string;
      newPassword: string;
    }
  ) => {
    if (!data.currentPassword || !data.currentPassword.trim()) return { error: "Current password is required" };
    if (!data.newPassword || !data.newPassword.trim()) return { error: "New password is required" };

    const found = await db.user.findUnique({
      where: { id: user.id },
      select: { password: true, email: true, name: true, language: true },
    });

    if (!found) return { error: "User not found" };

    const isValid = await bcrypt.compare(
      data.currentPassword,
      found.password || ""
    );
    if (!isValid) return { error: "Current password is incorrect" };

    const hashed = await bcrypt.hash(data.newPassword, 10);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    const headerStore = await headers();
    const ip =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = headerStore.get("user-agent") || "Unknown Device";

    // tr-Şifre değişikliği hesabın ele geçirilmesinin ilk adımı olabilir. Kullanıcıya
    //    bant dışı haber vermek, saldırıyı fark edebileceği tek yoldur; bu yüzden
    //    gönderim hatası şifre değişikliğini geri almaz, yalnızca günlüğe alınır.
    // en-A password change is the first move in an account takeover. An out-of-band notice is
    //    the only way the real owner finds out, so this always sends. A delivery failure must
    //    not roll back the change the user explicitly asked for — it is logged instead.
    await sendSecurityAlertEmail(
      { email: found.email, lang: found.language === "tr" ? "tr" : "en" },
      {
        kind: "PASSWORD_CHANGED",
        userName: found.name,
        ipAddress: ip,
        deviceInfo: userAgent,
      }
    );

    await logAuditEvent({
      userId: user.id,
      action: "PASSWORD_CHANGE",
      ipAddress: ip,
      deviceInfo: userAgent,
    });

    return { success: true };
  }
);
