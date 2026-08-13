"use server";

import { adminDb } from "@/app/lib/firebase-admin";
import {
  Notification,
  NotificationCategory,
  NotificationTarget,
} from "../type/notification";
import { db } from "../db";
import { Prisma } from "@prisma/client";
import { logger } from "@/app/lib/logger";
import { sendNotificationEmail } from "@/app/lib/services/email";

type UserPreferenceField = Extract<
  keyof Prisma.UserWhereInput,
  | "notifEmailShipment"
  | "notifEmailMaint"
  | "notifEmailAssignment"
  | "notifEmailDelay"
  | "notifPushAssignment"
  | "notifPushDelay"
>;

/**
 * tr-Bir kategorinin kanal başına hangi tercih alanıyla susturulduğunu tanımlar.
 *    `inbox` uygulama içi gelen kutusunu, `email` e-postayı yönetir; ayrı alanlar olmaları
 *    kullanıcının birini kapatıp diğerini açık bırakabilmesini sağlar. `email` tanımsızsa
 *    o kategori hiç e-posta üretmez.
 * en-Declares which preference column silences a category, per channel.
 *    `inbox` governs the in-app inbox and `email` governs email; keeping them as distinct
 *    columns is what lets a user disable one channel without losing the other. A category with
 *    no `email` field never produces email at all.
 */
interface CategoryChannelPolicy {
  inbox?: UserPreferenceField;
  email?: UserPreferenceField;
}

/**
 * tr-Kategorisi olmayan veya burada yer almayan bildirimler (ör. SYSTEM) filtrelenmez ve
 *    e-posta üretmez; operasyonel olarak kritik oldukları için her zaman gelen kutusuna düşer.
 * en-Notifications without a category — or with one absent from this map (e.g. SYSTEM) — are
 *    never filtered and never emailed: they are operationally critical, so they always land in
 *    the inbox regardless of preferences.
 */
const CHANNEL_POLICY_BY_CATEGORY: Partial<
  Record<NotificationCategory, CategoryChannelPolicy>
> = {
  SHIPMENT_UPDATE: { inbox: "notifEmailShipment", email: "notifEmailShipment" },
  MAINTENANCE_ALERT: { inbox: "notifEmailMaint", email: "notifEmailMaint" },
  NEW_ASSIGNMENT: { inbox: "notifPushAssignment", email: "notifEmailAssignment" },
  DELAY_ALERT: { inbox: "notifPushDelay", email: "notifEmailDelay" },
};

type NotificationRecipient = {
  id: string;
  email: string;
  language: string;
} & Record<UserPreferenceField, boolean>;

/**
 * tr-Bir hedefi somut alıcı listesine çevirir. Hedefte userId varsa tek kullanıcı çözülür
 *    (companyId verilmişse kiracı sınırı olarak da uygulanır); yoksa şirket/rol kapsamı sorgulanır.
 *    WHERE koşulunda yalnızca `inbox` tercihi uygulanır: e-posta tercihi ayrı bir kanal olduğu
 *    için burada filtrelenmez, aksi halde gelen kutusunu kapatan kullanıcı e-postayı da kaybederdi.
 * en-Resolves a target into a concrete recipient list. A target carrying userId resolves to that
 *    single user (with companyId additionally enforced as a tenant boundary when present);
 *    otherwise the company/role scope is queried. Only the `inbox` preference is applied in the
 *    WHERE clause — the email preference is a separate channel and is filtered later, so that
 *    muting the in-app inbox does not silently also mute email.
 * input (target: NotificationTarget, category?: NotificationCategory)
 * output (Promise<NotificationRecipient[]>)
 */
async function resolveRecipients(
  target: NotificationTarget,
  category?: NotificationCategory
): Promise<NotificationRecipient[]> {
  const whereClause: Prisma.UserWhereInput = target.userId
    ? {
        id: target.userId,
        // tr-userId ile birlikte companyId gelirse kiracı sınırı olarak uygulanır
        // en-when companyId accompanies userId, enforce it as a tenant boundary
        ...(target.companyId ? { companyId: target.companyId } : {}),
      }
    : {
        ...(target.companyId ? { companyId: target.companyId } : {}),
        ...(target.roleId ? { roleId: target.roleId } : {}),
      };

  const policy = category ? CHANNEL_POLICY_BY_CATEGORY[category] : undefined;

  // tr-Kullanıcı, kanallardan en az birine abone olduğu sürece alıcı listesine girer. Tek bir
  //    alan üzerinden filtrelemek, gelen kutusunu kapatan kullanıcının e-postayı da (ya da tam
  //    tersini) kaybetmesine yol açardı; kanal başına eleme aşağıda ayrıca yapılır.
  // en-A user qualifies as a recipient if they subscribe to at least one channel. Filtering on a
  //    single column would mean muting the inbox also silently kills email (and vice versa), so
  //    the query ORs the channels and each one is filtered separately below.
  if (policy) {
    const channelFields = [
      ...new Set([policy.inbox, policy.email].filter(Boolean)),
    ] as UserPreferenceField[];

    if (channelFields.length === 1) {
      whereClause[channelFields[0]!] = true;
    } else if (channelFields.length > 1) {
      whereClause.OR = channelFields.map((field) => ({ [field]: true }));
    }
  }

  return db.user.findMany({
    where: whereClause,
    select: {
      id: true,
      email: true,
      language: true,
      notifEmailShipment: true,
      notifEmailMaint: true,
      notifEmailAssignment: true,
      notifEmailDelay: true,
      notifPushAssignment: true,
      notifPushDelay: true,
    },
  });
}

/**
 * tr-Bir alıcının, verilen kategori için e-posta almayı kabul edip etmediğini döndürür.
 *    Politikada `email` alanı yoksa kategori hiç e-posta üretmez.
 * en-Reports whether a recipient has opted in to email for the given category.
 *    A category whose policy declares no `email` field never produces email.
 * input (recipient: NotificationRecipient, category?: NotificationCategory)
 * output (boolean)
 */
function acceptsEmail(
  recipient: NotificationRecipient,
  category?: NotificationCategory
): boolean {
  const emailField = category
    ? CHANNEL_POLICY_BY_CATEGORY[category]?.email
    : undefined;
  if (!emailField) return false;

  return recipient[emailField] === true;
}

/**
 * tr-Bir alıcının gelen kutusuna yazılıp yazılmayacağını döndürür. Sorgu kanalları OR'ladığı
 *    için, yalnızca e-postaya abone olan bir kullanıcı da listeye girebilir; bu yüzden gelen
 *    kutusu tercihi burada tekrar doğrulanır.
 * en-Reports whether a recipient should receive the in-app inbox entry. Because the query ORs the
 *    channels, a user subscribed only to email can appear in the list, so the inbox preference is
 *    re-checked here rather than assumed from the query.
 * input (recipient: NotificationRecipient, category?: NotificationCategory)
 * output (boolean)
 */
function acceptsInbox(
  recipient: NotificationRecipient,
  category?: NotificationCategory
): boolean {
  const inboxField = category
    ? CHANNEL_POLICY_BY_CATEGORY[category]?.inbox
    : undefined;
  // tr-Politikası olmayan kategoriler (ör. SYSTEM) her zaman gelen kutusuna düşer
  // en-Categories without a policy (e.g. SYSTEM) always reach the inbox
  if (!inboxField) return true;

  return recipient[inboxField] === true;
}

/**
 * tr-belirtilen hedefe yeni bir bildirim gönderir
 * en-sends a new notification to the specified target
 * input (target: NotificationTarget, notification: Omit<Notification, "id" | "createdAt" | "isRead">)
 * output (Promise<{ success: boolean; error?: string; id?: string }>)
 */
export async function sendNotificationAction(
  target: NotificationTarget,
  notification: Omit<Notification, "id" | "createdAt" | "isRead">
) {
  try {
    if (!adminDb) {
      logger.warn(
        "⚠️ Firebase Admin SDK not initialized. Skipping notification."
      );
      return { success: false, error: "Firebase not initialized" };
    }
    // tr-Global yayın tek bir paylaşılan düğüme yazılır: somut bir alıcı listesi yoktur,
    //    dolayısıyla kişiselleştirilmiş e-posta da üretilemez.
    // en-A global broadcast writes to one shared node: there is no concrete recipient list,
    //    so no per-user email can be produced for it.
    if (target.isGlobal) {
      const broadcastRef = adminDb.ref("notifications/broadcast").push();
      const broadcast: Notification = {
        ...notification,
        id: broadcastRef.key!,
        createdAt: Date.now(),
        isRead: false,
      };
      await broadcastRef.set(broadcast);
      return { success: true, id: broadcastRef.key };
    }

    if (!target.userId && !target.companyId) {
      throw new Error("Invalid notification target");
    }

    // tr-Hedef şekli ne olursa olsun (tek kullanıcı, şirket ya da rol kapsamı) aynı yolu izler:
    //    alıcıları çöz, her birinin kişisel gelen kutusuna yaz, ardından e-postayı gönder.
    //    Bireysel bildirimlerin e-posta üretmemesine yol açan ayrık dal bu sayede ortadan kalkar.
    // en-Every target shape — single user, company, or role scope — now follows one path:
    //    resolve recipients, write each personal inbox, then dispatch email. This removes the
    //    separate branch that let individually-addressed notifications skip email entirely.
    const recipients = await resolveRecipients(target, notification.category);

    if (recipients.length === 0) {
      logger.info(
        `[notifications] No recipients matched target for "${notification.title}" — nothing delivered.`
      );
      return { success: true };
    }

    const inboxRecipients = recipients.filter((recipient) =>
      acceptsInbox(recipient, notification.category)
    );

    const writtenIds = await Promise.all(
      inboxRecipients.map(async (recipient) => {
        if (!adminDb) return null;
        const ref = adminDb.ref(`notifications/inbox/${recipient.id}`).push();
        await ref.set({
          ...notification,
          id: ref.key!,
          createdAt: Date.now(),
          isRead: false,
        });
        return ref.key;
      })
    );

    // tr-E-posta alıcıları gelen kutusundan bağımsız olarak süzülür: kategorinin e-posta
    //    tercihi yoksa hiç gönderilmez, varsa yalnızca o tercihi açık olanlara gider.
    // en-Email recipients are filtered independently of the inbox: a category with no email
    //    preference sends nothing, otherwise it reaches exactly those who opted in.
    const emailRecipients = recipients.filter((recipient) =>
      acceptsEmail(recipient, notification.category)
    );

    if (emailRecipients.length > 0) {
      await sendNotificationEmail(
        emailRecipients.map((recipient) => ({
          email: recipient.email,
          lang: recipient.language === "tr" ? "tr" : "en",
        })),
        {
          title: notification.title,
          message: notification.message,
          type: notification.type,
          link: notification.link,
        }
      );
    }

    // tr-Tek alıcılı hedeflerde çağıranların beklediği id sözleşmesi korunur
    // en-Preserve the id contract callers expect for single-recipient targets
    return inboxRecipients.length === 1 && writtenIds[0]
      ? { success: true, id: writtenIds[0] }
      : { success: true };
  } catch (error) {
    logger.error("Failed to send notification via Admin SDK:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * tr-belirtilen bildirimi okundu olarak işaretler
 * en-marks the specified notification as read
 * input (path: string, notificationId: string)
 * output (Promise<{ success: boolean; error?: string }>)
 */
export async function markAsReadAction(path: string, notificationId: string) {
  try {
    if (!adminDb) throw new Error("Firebase not initialized");
    await adminDb.ref(`${path}/${notificationId}`).update({ isRead: true });
    return { success: true };
  } catch (error) {
    logger.error("Failed to mark notification as read:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * tr-belirtilen bildirimi siler
 * en-deletes the specified notification
 * input (path: string, notificationId: string)
 * output (Promise<{ success: boolean; error?: string }>)
 */
export async function deleteNotificationAction(
  path: string,
  notificationId: string
) {
  try {
    if (!adminDb) throw new Error("Firebase not initialized");
    await adminDb.ref(`${path}/${notificationId}`).remove();
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete notification:", error);
    return { success: false, error: String(error) };
  }
}
