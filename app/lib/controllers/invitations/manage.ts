"use server";

import { db } from "../../db";
import { checkPermission } from "../utils/checkPermission";
import { requireVerifiedEmail } from "../utils/requireVerifiedEmail";
import { authenticatedAction } from "../../auth-middleware";
import { controllerGuard } from "../utils/controllerGuard";
import { rateLimit } from "../../rate-limiter";
import { generateRefreshToken, hashToken } from "../session/internal";
import { sendCompanyInviteEmail } from "../../services/email";
import { getBaseUrl } from "../../utils/baseUrl";
import { getRoleLabel } from "../company/roleLabels";
import { NotFoundError, RateLimitError, ValidationError } from "../../errors";

const INVITE_EXPIRY_DAYS = 7;

/**
 * tr-şirketin gönderdiği davetiyeleri yönetim için listeler
 * en-lists the invitations sent by the company, for administration
 * input (user: AuthenticatedUser, status?: InvitationStatus | "ALL")
 * output (Promise<Invitation[]>)
 */
export const getCompanyInvitations = authenticatedAction(
  async (
    user,
    status?: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED" | "ALL"
  ) => {
    const companyId = user?.companyId || "";

    return controllerGuard("getCompanyInvitations", async () => {
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const invitations = await db.invitation.findMany({
        where: {
          companyId,
          // tr-"ALL" bir enum değeri değil, "filtre yok" anlamına gelen bir işaret
          // en-"ALL" is a sentinel meaning "no filter", not an InvitationStatus enum value
          ...(status && status !== "ALL" ? { status } : {}),
        },
        select: {
          id: true,
          email: true,
          status: true,
          expiresAt: true,
          acceptedAt: true,
          createdAt: true,
          updatedAt: true,
          role: { select: { id: true, name: true } },
          invitedBy: { select: { id: true, name: true, surname: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // tr-PENDING ama süresi geçmiş kayıtlar veritabanında hâlâ PENDING görünür;
      //    arayüzün "süresi doldu" gösterebilmesi için türetilmiş bir alan eklenir.
      // en-Rows that are PENDING but past expiresAt still read as PENDING in the database;
      //    surface a derived flag so the UI can distinguish "expired" without a sweep job.
      const now = new Date();
      return invitations.map((invitation) => ({
        ...invitation,
        isExpired: invitation.status === "PENDING" && invitation.expiresAt < now,
      }));
    });
  }
);

/**
 * tr-Bekleyen bir daveti yeniden gönderir. Token'ın kendisi saklanmadığı (yalnızca hash'i
 *    tutulduğu) için eski bağlantı geri getirilemez: yeni bir token üretilir, süre sıfırlanır
 *    ve eski bağlantı böylece geçersiz kalır.
 * en-Resends a pending invitation. The raw token is never stored — only its hash — so the old
 *    link cannot be recovered: a fresh token is minted and the expiry reset, which also
 *    invalidates the previous link.
 * input (user: AuthenticatedUser, invitationId: string)
 * output (Promise<{ id: string; email: string; expiresAt: Date }>)
 */
export const resendInvitation = authenticatedAction(
  async (user, invitationId: string) => {
    const companyId = user?.companyId || "";

    return controllerGuard("resendInvitation", async () => {
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      // Sends mail on the user's behalf — same guard as createCompanyInvitation,
      // so an unverified account cannot use us as a mail relay.
      await requireVerifiedEmail(user);

      const limit = await rateLimit(user.id, 20, 3600, "rate-limit:send-invite:");
      if (!limit.success) throw new RateLimitError();

      const invitation = await db.invitation.findFirst({
        where: { id: invitationId, companyId },
        include: { company: { select: { name: true } }, role: { select: { id: true } } },
      });
      if (!invitation) throw new NotFoundError("Invitation not found");

      if (invitation.status === "ACCEPTED") {
        throw new ValidationError("This invitation has already been accepted");
      }
      if (invitation.status === "REVOKED") {
        throw new ValidationError("This invitation was revoked. Send a new one instead.");
      }

      // tr-Alıcı bu arada başka bir şirkete katılmış olabilir; daveti yeniden göndermek anlamsız
      // en-The recipient may have joined another company since; resending would be pointless
      const existingUser = await db.user.findFirst({
        where: { email: invitation.email },
        select: { companyId: true },
      });
      if (existingUser?.companyId && existingUser.companyId !== companyId) {
        throw new ValidationError("This email is already associated with another company");
      }

      const rawToken = generateRefreshToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      const updated = await db.invitation.update({
        where: { id: invitation.id },
        data: {
          tokenHash,
          expiresAt,
          // tr-Süresi dolmuş bir davet yeniden gönderildiğinde tekrar geçerli hale gelir
          // en-Resending an expired invitation makes it valid again
          status: "PENDING",
          invitedById: user.id,
        },
      });

      const lang: "en" | "tr" = user.language === "tr" ? "tr" : "en";
      const inviteUrl = `${getBaseUrl()}/${lang}/auth/accept-invite?token=${rawToken}`;

      // tr-Yeniden gönderimde e-posta hatası sessizce yutulmamalı: kullanıcının tek amacı
      //    e-postanın gitmesiydi, "başarılı" demek yanıltıcı olur.
      // en-Unlike creation, a failure here must surface: sending the mail IS the entire point of
      //    the action, so reporting success when it failed would be a lie.
      await sendCompanyInviteEmail(
        invitation.email,
        inviteUrl,
        invitation.company.name,
        getRoleLabel(invitation.role.id, lang),
        lang,
        INVITE_EXPIRY_DAYS
      );

      return { id: updated.id, email: updated.email, expiresAt: updated.expiresAt };
    });
  }
);

/**
 * tr-Bekleyen bir daveti iptal eder. Token hash'i döndürülemez hale getirilmez ama durum
 *    REVOKED olduğu için kabul akışları daveti reddeder.
 * en-Revokes a pending invitation. Accept flows all check for status PENDING, so flipping the
 *    status is what actually kills the outstanding link.
 * input (user: AuthenticatedUser, invitationId: string)
 * output (Promise<{ success: boolean }>)
 */
export const revokeInvitation = authenticatedAction(
  async (user, invitationId: string) => {
    const companyId = user?.companyId || "";

    return controllerGuard("revokeInvitation", async () => {
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const invitation = await db.invitation.findFirst({
        where: { id: invitationId, companyId },
        select: { id: true, status: true },
      });
      if (!invitation) throw new NotFoundError("Invitation not found");

      if (invitation.status === "ACCEPTED") {
        throw new ValidationError(
          "This invitation was already accepted. Remove the user from the company instead."
        );
      }
      if (invitation.status === "REVOKED") {
        return { success: true };
      }

      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: "REVOKED" },
      });

      return { success: true };
    });
  }
);
