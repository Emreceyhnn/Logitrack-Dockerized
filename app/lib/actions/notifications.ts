"use server";

import {
  Notification,
  NotificationCategory,
  NotificationTarget,
} from "../type/notification";
import { db } from "../db";
import { Prisma } from "@prisma/client";
import { logger } from "@/app/lib/logger";
import { sendNotificationEmail } from "@/app/lib/services/email";
import { getAuthenticatedUser } from "@/app/lib/auth-middleware";
import { notificationBus, type NotificationEvent } from "@/app/lib/notificationBus";

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
 * Shapes a freshly written row into the wire event the SSE stream (and thus
 * every connected client) receives. `isGlobal` is derived here rather than
 * stored, so the stream's matching logic (app/api/notifications/stream) has
 * a single boolean to check instead of re-deriving it from two nullable
 * columns on every event.
 */
function toEvent(row: {
  id: string;
  title: string;
  message: string;
  type: Notification["type"];
  category: NotificationCategory | null;
  link: string | null;
  metadata: Prisma.JsonValue;
  isRead: boolean;
  createdAt: Date;
  userId: string | null;
  companyId: string | null;
  roleId: string | null;
}): NotificationEvent {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    category: row.category,
    link: row.link,
    metadata: row.metadata as Record<string, unknown> | null,
    isRead: row.isRead,
    createdAt: row.createdAt.getTime(),
    userId: row.userId,
    companyId: row.companyId,
    roleId: row.roleId,
    isGlobal: !row.userId && !row.companyId,
  };
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
    const baseData = {
      title: notification.title,
      message: notification.message,
      type: notification.type,
      category: notification.category ?? null,
      link: notification.link ?? null,
      metadata: (notification.metadata ?? null) as Prisma.InputJsonValue,
    };

    // tr-Global yayın: tek bir satır, hem userId hem companyId null. SSE tarafı bunu
    //    `isGlobal` ile tanıyıp her bağlı istemciye iletir. Somut bir alıcı listesi
    //    yoktur, dolayısıyla kişiselleştirilmiş e-posta da üretilemez.
    // en-Global broadcast: a single row with both userId and companyId null. The SSE
    //    side recognises it via `isGlobal` and fans it out to every connected client.
    //    There is no concrete recipient list, so no per-user email can be produced.
    if (target.isGlobal) {
      const row = await db.notification.create({
        data: { ...baseData, userId: null, companyId: null, roleId: null },
      });
      notificationBus.publish(toEvent(row));
      return { success: true, id: row.id };
    }

    if (!target.userId && !target.companyId) {
      throw new Error("Invalid notification target");
    }

    // tr-Hedef şekli ne olursa olsun (tek kullanıcı, şirket ya da rol kapsamı) aynı yolu izler:
    //    alıcıları çöz (e-posta tercihi ve gelen kutusu tercihi için), ardından hedefin
    //    şekline göre TEK bir satır yaz. Şirket/rol geneli hedeflerde alıcı sayısı kadar
    //    satır YAZILMAZ — bir tek paylaşılan satır yazılır ve SSE tarafı onu companyId/roleId
    //    eşleşen her bağlı istemciye ayrı ayrı iletir. Bu, "okundu" durumunun şirket/rol geneli
    //    bildirimlerde kullanıcılar arası paylaşılmasına yol açar (bilinçli bir sadeleştirme).
    // en-Every target shape — single user, company, or role scope — follows one path:
    //    resolve recipients (for email + inbox opt-in), then write exactly ONE row shaped by
    //    the target. Company/role-wide targets do NOT get one row per recipient — a single
    //    shared row is written and the SSE side fans it out to every connected client whose
    //    companyId/roleId matches. This means "read" is shared across users on company/role-wide
    //    notifications (a deliberate simplification).
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

    let writtenId: string | null = null;

    if (target.userId) {
      // tr-Tek kullanıcı hedefi: inboxRecipients tam olarak 0 veya 1 eleman içerir.
      // en-Single-user target: inboxRecipients holds exactly 0 or 1 element.
      if (inboxRecipients.length === 1) {
        const row = await db.notification.create({
          data: {
            ...baseData,
            userId: target.userId,
            companyId: target.companyId ?? null,
            roleId: null,
          },
        });
        writtenId = row.id;
        notificationBus.publish(toEvent(row));
      }
    } else if (inboxRecipients.length > 0) {
      const row = await db.notification.create({
        data: {
          ...baseData,
          userId: null,
          companyId: target.companyId ?? null,
          roleId: target.roleId ?? null,
        },
      });
      writtenId = row.id;
      notificationBus.publish(toEvent(row));
    }

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

    return writtenId ? { success: true, id: writtenId } : { success: true };
  } catch (error) {
    logger.error("Failed to send notification:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * tr-Çağıranın bu bildirimin gerçek sahibi olup olmadığını doğrular. Kişisel bildirimlerde
 *    userId eşleşmesi yeterli; şirket/rol geneli ve global bildirimlerde ise çağıranın o
 *    şirkete/kapsam içinde olması yeterlidir (bu satırlarda userId hep null'dur).
 * en-Verifies the caller genuinely owns this notification. A personal notification matches by
 *    userId; a company/role-wide or global one only requires the caller to be within that scope
 *    (userId is always null on those rows).
 * input (userId: string, companyId: string | null)
 * output (Prisma.NotificationWhereInput["OR"])
 */
function ownershipClause(
  userId: string,
  companyId: string | null
): Prisma.NotificationWhereInput[] {
  return [
    { userId },
    { userId: null, companyId: null },
    ...(companyId ? [{ userId: null, companyId }] : []),
  ];
}

/**
 * tr-belirtilen bildirimi okundu olarak işaretler
 * en-marks the specified notification as read
 * input (notificationId: string)
 * output (Promise<{ success: boolean; error?: string }>)
 */
export async function markAsReadAction(notificationId: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthenticated");

    const result = await db.notification.updateMany({
      where: { id: notificationId, OR: ownershipClause(user.id, user.companyId) },
      data: { isRead: true },
    });
    if (result.count === 0) throw new Error("Not found or not owned");
    return { success: true };
  } catch (error) {
    logger.error("Failed to mark notification as read:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * tr-belirtilen bildirimi siler
 * en-deletes the specified notification
 * input (notificationId: string)
 * output (Promise<{ success: boolean; error?: string }>)
 */
export async function deleteNotificationAction(notificationId: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthenticated");

    const result = await db.notification.deleteMany({
      where: { id: notificationId, OR: ownershipClause(user.id, user.companyId) },
    });
    if (result.count === 0) throw new Error("Not found or not owned");
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete notification:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * tr-oturum açmış kullanıcının görebileceği bildirimleri getirir (kişisel + şirket/rol geneli
 *    + global broadcast). Sayfa açılışında geçmişi doldurmak için kullanılır — SSE akışı
 *    yalnızca bundan sonra oluşan yeni bildirimleri taşır.
 * en-Fetches the notifications the signed-in user can see (personal + company/role-wide +
 *    global broadcast). Used to backfill history on page load — the SSE stream only carries
 *    notifications created after the connection opens.
 * input (void)
 * output (Promise<{ success: true; notifications: Notification[] } | { success: false; error: string }>)
 */
export async function getNotificationsAction() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false as const, error: "Unauthenticated" };

    const or: Prisma.NotificationWhereInput[] = [
      { userId: user.id },
      { userId: null, companyId: null },
    ];
    if (user.companyId) {
      or.push({ userId: null, companyId: user.companyId, roleId: null });
      if (user.roleId) {
        or.push({ userId: null, companyId: user.companyId, roleId: user.roleId });
      }
    }

    const rows = await db.notification.findMany({
      where: { OR: or },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return {
      success: true as const,
      notifications: rows.map((row) => ({
        id: row.id,
        title: row.title,
        message: row.message,
        type: row.type,
        category: row.category ?? undefined,
        link: row.link ?? undefined,
        metadata: row.metadata as Record<string, unknown> | undefined,
        isRead: row.isRead,
        createdAt: row.createdAt.getTime(),
      })),
    };
  } catch (error) {
    logger.error("Failed to load notifications:", error);
    return { success: false as const, error: String(error) };
  }
}
