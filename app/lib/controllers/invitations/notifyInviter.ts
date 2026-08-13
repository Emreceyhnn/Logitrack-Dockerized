"use server";

import { db } from "../../db";
import { logger } from "../../logger";
import { sendInvitationOutcomeEmail } from "../../services/email";
import { sendNotificationAction } from "../../actions/notifications";

/**
 * tr-Bir davetin kabul veya reddedildiğini, daveti gönderen kişiye hem uygulama içi bildirim
 *    hem de e-posta ile haber verir. Üç kabul/red akışı da (yeni kullanıcı, mevcut kullanıcı
 *    kabul, mevcut kullanıcı red) bu yardımcıyı kullanır.
 *
 *    Bu fonksiyon asla hata fırlatmaz: davetin durumu çağrıldığı noktada zaten güncellenmiştir
 *    ve bildirim gönderilemedi diye kabul işleminin geri alınması kullanıcıyı yarım bir
 *    durumda bırakır. Hatalar yalnızca günlüğe yazılır.
 * en-Tells the inviter that their invitation was accepted or declined, via both an in-app
 *    notification and email. All three outcome flows (new-user accept, existing-user accept,
 *    existing-user decline) route through this helper.
 *
 *    It never throws: by the time it runs the invitation status is already committed, and
 *    failing the whole accept because a notification bounced would strand the invitee in a
 *    half-applied state. Failures are logged instead.
 * input (params: { invitationId: string; outcome: "ACCEPTED" | "DECLINED"; inviteeName?: string })
 * output (Promise<void>)
 */
export async function notifyInviterOfOutcome(params: {
  invitationId: string;
  outcome: "ACCEPTED" | "DECLINED";
  inviteeName?: string | undefined;
}): Promise<void> {
  const { invitationId, outcome, inviteeName } = params;

  try {
    const invitation = await db.invitation.findUnique({
      where: { id: invitationId },
      select: {
        email: true,
        companyId: true,
        invitedBy: {
          select: { id: true, email: true, language: true },
        },
        company: { select: { name: true } },
      },
    });

    if (!invitation?.invitedBy) {
      logger.warn(
        `[notifyInviterOfOutcome] Invitation ${invitationId} has no inviter to notify.`
      );
      return;
    }

    const { invitedBy } = invitation;
    const displayName = inviteeName?.trim() || invitation.email;
    const accepted = outcome === "ACCEPTED";

    const title = accepted ? "Davet Kabul Edildi ✅" : "Davet Reddedildi";
    const message = accepted
      ? `${displayName} davetinizi kabul etti ve ${invitation.company.name} şirketine katıldı.`
      : `${displayName}, ${invitation.company.name} şirketine katılma davetinizi reddetti.`;

    // tr-Uygulama içi bildirim: kategori yok, çünkü bu doğrudan davet edene ait operasyonel
    //    bir olay ve sevkiyat/bakım tercihleriyle susturulmamalı.
    // en-In-app notification: deliberately category-less, since this is an operational event
    //    addressed to the inviter personally and must not be silenced by shipment/maintenance
    //    preferences.
    await sendNotificationAction(
      { userId: invitedBy.id, companyId: invitation.companyId },
      {
        title,
        message,
        type: accepted ? "SUCCESS" : "INFO",
        link: "/users",
      }
    );

    await sendInvitationOutcomeEmail(
      {
        email: invitedBy.email,
        lang: invitedBy.language === "tr" ? "tr" : "en",
      },
      {
        inviteeEmail: invitation.email,
        inviteeName,
        companyName: invitation.company.name,
        outcome,
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(
      `[notifyInviterOfOutcome] Could not notify inviter for invitation ${invitationId} (${outcome}): ${msg}`
    );
  }
}
