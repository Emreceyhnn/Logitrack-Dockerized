"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { logAuditEvent, refreshSession } from "../session";
import { invalidateUserSessionCache } from "../session/manage";
import { headers } from "next/headers";
import { controllerGuard } from "../utils/controllerGuard";

/**
 * tr-kullanıcının bölgesel ayarlarını (saat dilimi, dil, formatlar vb.) günceller
 * en-updates user's regional settings (timezone, language, formats, etc.)
 * input (user: AuthenticatedUser, settings: object)
 * output (Promise<{ success: boolean, user: User }>)
 */
export const updateUserRegionalSettings = authenticatedAction(
  async (
    user,
    settings: {
      timezone: string;
      dateFormat: string;
      timeFormat: string;
      language?: string;
      currency?: string;
    }
  ) => {
    return controllerGuard("updateUserRegionalSettings", async () => {
      const updatedUser = await db.user.update({
        where: { id: user.id },
        data: {
          timezone: settings.timezone,
          dateFormat: settings.dateFormat,
          timeFormat: settings.timeFormat,
          language: settings.language || "en",
          ...(settings.currency ? { currency: settings.currency } : {}),
        },
      });

      const headerStore = await headers();
      const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "127.0.0.1";
      const userAgent = headerStore.get("user-agent") || "Unknown Device";

      // Log audit event
      await logAuditEvent({
        userId: user.id,
        action: "SETTINGS_UPDATE",
        ipAddress: ip,
        deviceInfo: userAgent,
        metadata: { ...settings, type: "regional_settings_update" },
      });

      // tr-Saat dilimi ve tarih/saat formatları imzalı JWT'nin içinde taşınıyor:
      //    getAuthenticatedUser bunları doğrudan token'dan okuyor, veritabanından
      //    değil. Bu yüzden kayıttan sonra çerez hâlâ eski değerleri söyler.
      //
      //    Token'ı BURADA, bu Server Action içinde yeniden basıyoruz. Bayat-talep
      //    bayrağına güvenip proxy'nin yönlendirmesini beklemek yetmiyordu: proxy
      //    307 döndürüyor, ama router.refresh()'in gönderdiği RSC isteği bu
      //    yönlendirmeyi sayfa gezinmesi gibi izleyemiyor — dolayısıyla ekran
      //    token yenilenmeden render oluyordu. Server Action çerez yazabildiği
      //    için yeniden basma işlemi güvenle burada yapılır ve yanıt döndüğünde
      //    çerez zaten güncel olur.
      //
      //    Bayrak yine de set ediliyor: kullanıcının DİĞER cihazlarındaki
      //    oturumlar bu isteğin çerezini almaz, onları proxy yoluyla yakalarız.
      // en-Timezone and the date/time formats travel INSIDE the signed JWT, so
      //    after saving, this browser's cookie still carries the old values.
      //
      //    Re-mint the token HERE, inside the Server Action. Relying on the
      //    stale-claims flag alone was not enough: the proxy answers with a 307,
      //    but the RSC request issued by router.refresh() cannot follow that
      //    redirect the way a page navigation does, so the UI re-rendered with
      //    the old token still in place. A Server Action may write cookies, so
      //    doing it here means the cookie is already current when the call
      //    returns.
      //
      //    The flag is still set, for the user's OTHER devices: those sessions
      //    never receive this response's cookie and are caught via the proxy.
      await invalidateUserSessionCache(user.id);
      await refreshSession();

      return { success: true, user: updatedUser };
    });
  }
);

/**
 * tr-kullanıcının bildirim tercihlerini (e-posta, anlık bildirim vb.) günceller
 * en-updates user's notification preferences (email, push, etc.)
 * input (user: AuthenticatedUser, settings: object)
 * output (Promise<{ success: boolean, user: User }>)
 */
export const updateUserNotificationSettings = authenticatedAction(
  async (
    user,
    settings: {
      emailShipmentUpdates: boolean;
      emailMaintenanceAlerts: boolean;
      emailWeeklyReports: boolean;
      emailNewAssignments: boolean;
      emailDelayAlerts: boolean;
      pushNewAssignments: boolean;
      pushDelayAlerts: boolean;
    }
  ) => {
    return controllerGuard("updateUserNotificationSettings", async () => {
      const updatedUser = await db.user.update({
        where: { id: user.id },
        data: {
          notifEmailShipment: settings.emailShipmentUpdates,
          notifEmailMaint: settings.emailMaintenanceAlerts,
          notifEmailWeekly: settings.emailWeeklyReports,
          notifEmailAssignment: settings.emailNewAssignments,
          notifEmailDelay: settings.emailDelayAlerts,
          notifPushAssignment: settings.pushNewAssignments,
          notifPushDelay: settings.pushDelayAlerts,
        },
      });

      const headerStore = await headers();
      const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "127.0.0.1";
      const userAgent = headerStore.get("user-agent") || "Unknown Device";

      // Log audit event
      await logAuditEvent({
        userId: user.id,
        action: "SETTINGS_UPDATE",
        ipAddress: ip,
        deviceInfo: userAgent,
        metadata: { ...settings, type: "notification_settings_update" },
      });

      return { success: true, user: updatedUser };
    });
  }
);
