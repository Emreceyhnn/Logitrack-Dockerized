import { logger } from "@/app/lib/logger";
import { withEmailRetry } from "./emailRetry";

const EMAIL_SERVICE_URL =
  process.env.EMAIL_SERVICE_URL || "http://localhost:3030";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

interface DispatchPayload {
  to: string | string[];
  subject?: string | undefined;
  html?: string | undefined;
  text?: string | undefined;
  from?: string | undefined;
  template?: string | undefined;
  lang?: "en" | "tr" | undefined;
  data?: Record<string, unknown> | undefined;
}

export type SecurityAlertKind =
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET"
  | "EMAIL_CHANGED";

export type SubscriptionEmailKind =
  | "TRIAL_ENDING"
  | "TRIAL_ENDED"
  | "PLAN_ACTIVATED";

export type NotificationEmailKind = "INFO" | "WARNING" | "SUCCESS" | "ERROR";

export interface WeeklyReportEmailData {
  companyName: string;
  weekLabel: string;
  lang?: "en" | "tr" | undefined;
  stats: {
    newShipments: number;
    deliveredShipments: number;
    delayedShipments: number;
    completedRoutes: number;
    activeVehicles: number;
    totalVehicles: number;
    upcomingMaintenance: number;
  };
}

/**
 * tr-Tüm giden e-postaların tek geçiş noktası. LogiTrack Email Service'in `/send` uç noktasına
 *    POST atar. Servis hatayı HTTP durum koduyla bildirir; bu hata yeniden deneme döngüsünün
 *    görebilmesi için fırlatılır. Geçici hatalarda (429/5xx/ağ) üstel bekleme ile yeniden denenir,
 *    kalıcı hatalarda (400 — geçersiz adres/parametre) ilk denemede vazgeçilir.
 * en-The single choke point for every outbound email. POSTs to the LogiTrack Email Service's
 *    `/send` endpoint. The service reports failures via HTTP status; that error is rethrown here
 *    for the retry loop to see. Transient failures (429/5xx/network) are retried with exponential
 *    backoff; permanent ones (400 — invalid address/params) fail on the first attempt.
 * input (payload: DispatchPayload, context: string)
 * output (Promise<string | undefined>) — the provider's message id when available
 */
async function dispatchEmail(
  payload: DispatchPayload,
  context: string
): Promise<string | undefined> {
  return withEmailRetry(async () => {
    const response = await fetch(`${EMAIL_SERVICE_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      messageId?: string;
      error?: string;
    };

    if (!response.ok || body.success === false) {
      // Preserve the HTTP status so isRetryableEmailError can classify this
      // correctly instead of falling back to string matching.
      throw Object.assign(
        new Error(body.error || `Email service responded with ${response.status}`),
        { statusCode: response.status }
      );
    }

    return body.messageId;
  }, context);
}

/**
 * tr-LogiTrack Email Service üzerinden genel bir e-posta gönderir. EMAIL_SERVICE_URL yapılandırılmamışsa
 *    e-postayı göndermek yerine günlüğe kaydeder.
 * en-Sends a generic email via the LogiTrack Email Service. If EMAIL_SERVICE_URL isn't configured,
 *    logs the email instead of sending it.
 * input (options: SendEmailOptions)
 * output (Promise<void>)
 *
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!process.env.EMAIL_SERVICE_URL) {
    logger.warn(
      `[email] EMAIL_SERVICE_URL not set — email to ${options.to}: ${options.subject}`
    );
    return;
  }
  try {
    await dispatchEmail(
      {
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        from: options.from,
      },
      "sendEmail"
    );
  } catch (error) {
    logger.error("[email] Failed to send email:", error);
    throw new Error("Failed to send email");
  }
}

/**
 * tr-Belirtilen dile uygun güzel HTML şablonuyla sürücüye davet e-postası gönderir.
 *    EMAIL_SERVICE_URL tanımlı değilse (yerel/dev ortam) e-posta göndermez, sadece günlüğe kaydeder.
 * en-Sends a driver invite email using the "driverInvite" template (TR/EN).
 *    If EMAIL_SERVICE_URL is not set (local/dev), logs the invite URL instead of sending.
 * input (to: string, inviteUrl: string, companyName: string, lang?: "en" | "tr", expiryDays?: number)
 * output (Promise<void>)
 *
 */
export async function sendCompanyInviteEmail(
  to: string,
  inviteUrl: string,
  companyName: string,
  roleName: string,
  lang: "en" | "tr" = "en",
  expiryDays: number = 7
): Promise<void> {
  if (!process.env.EMAIL_SERVICE_URL) {
    logger.warn(
      `[email] EMAIL_SERVICE_URL not set — invite URL for ${to} (lang:${lang}): ${inviteUrl}`
    );
    return;
  }
  try {
    const id = await dispatchEmail(
      {
        to,
        template: "driverInvite",
        lang,
        data: { companyName, inviteUrl, roleName, expiryDays },
      },
      "sendCompanyInviteEmail"
    );

    logger.info(`[email] Company invite sent → ${to} (id: ${id})`);
  } catch (error) {
    // Re-throw with the original message so callers can see the real cause
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("[email] sendCompanyInviteEmail failed:", msg);
    throw new Error(msg);
  }
}

/**
 * tr-Şifre sıfırlama bağlantısını gönderir. Diğer gönderim fonksiyonlarının aksine, EMAIL_SERVICE_URL
 *    tanımlı değilse sessizce geçmez — hata fırlatır. Sessiz bir başarısızlık, kullanıcının
 *    "bağlantı gönderildi" mesajını görüp hiçbir zaman e-posta almaması demektir.
 * en-Sends the password reset link. Unlike the other senders, this one THROWS when EMAIL_SERVICE_URL
 *    is missing instead of silently logging: a silent no-op here means the user is told "link sent"
 *    and is permanently locked out of their account. A hard failure is the safer outcome.
 * input (to: string, resetUrl: string, userName?: string, lang?: "en" | "tr", expiryMinutes?: number)
 * output (Promise<void>)
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  userName?: string,
  lang: "en" | "tr" = "en",
  expiryMinutes: number = 60
): Promise<void> {
  if (!process.env.EMAIL_SERVICE_URL) {
    logger.error(
      "[email] EMAIL_SERVICE_URL is not set — password reset email cannot be delivered. " +
        "Refusing to report success for an email that was never sent."
    );
    throw new Error("Email delivery is not configured");
  }

  // Never log resetUrl — it is a bearer credential until it is used.
  const id = await dispatchEmail(
    {
      to,
      template: "passwordReset",
      lang,
      data: { resetUrl, userName, expiryMinutes },
    },
    "sendPasswordResetEmail"
  );

  logger.info(`[email] Password reset sent → ${to} (id: ${id})`);
}

/**
 * tr-E-posta doğrulama bağlantısını gönderir. Şifre sıfırlamanın aksine hata FIRLATMAZ:
 *    doğrulama maili kaydın yan etkisidir, kaydın kendisi değil. Gönderim başarısız olursa
 *    hesap yine de oluşmalı ve kullanıcı yeniden gönderim isteyebilmelidir.
 * en-Sends the email verification link. Unlike the password reset sender this one does NOT throw:
 *    verification is a side effect of signup, not the signup itself. If delivery fails the account
 *    must still exist and the user can request a new link — failing registration over a mail
 *    outage would be far worse than an unverified account.
 * input (to: string, verifyUrl: string, userName?: string, lang?: "en" | "tr", expiryHours?: number)
 * output (Promise<boolean>) — true when handed off to the email service, false otherwise
 */
export async function sendEmailVerificationEmail(
  to: string,
  verifyUrl: string,
  userName?: string,
  lang: "en" | "tr" = "en",
  expiryHours: number = 24
): Promise<boolean> {
  if (!process.env.EMAIL_SERVICE_URL) {
    logger.error(
      `[email] EMAIL_SERVICE_URL not set — verification email for ${to} was not sent.`
    );
    return false;
  }

  try {
    // Never log verifyUrl — it is a bearer credential until it is used.
    const id = await dispatchEmail(
      {
        to,
        template: "emailVerification",
        lang,
        data: { verifyUrl, userName, expiryHours },
      },
      "sendEmailVerificationEmail"
    );

    logger.info(`[email] Verification email sent → ${to} (id: ${id})`);
    return true;
  } catch (error) {
    // Log the service's own fields, not just `message`. The email service
    // distinguishes an unreachable SMTP host (5xx) from bad request params
    // (400) via `statusCode`; collapsing them to a bare string threw away
    // the only information that identifies which one occurred.
    const e = error as { statusCode?: number; message?: string };
    logger.error(
      `[email] sendEmailVerificationEmail failed for ${to} — ` +
        `statusCode=${e.statusCode ?? "n/a"} message=${e.message ?? String(error)}`
    );
    return false;
  }
}

/**
 * tr-Bir kullanıcı şirkete eklendiğinde karşılama e-postası gönderir. Üyelik zaten veritabanına
 *    yazıldığı için gönderim hatası sessizce günlüğe alınır ve çağıranı bloklamaz.
 * en-Sends the welcome email when a user is added to a company. The membership is already
 *    persisted by the time this runs, so a delivery failure is logged rather than thrown.
 * input (recipient: { email: string; lang?: "en" | "tr" }, data: { companyName: string; roleName: string; addedByName?: string })
 * output (Promise<void>)
 */
export async function sendCompanyWelcomeEmail(
  recipient: { email: string; lang?: "en" | "tr" | undefined },
  data: {
    companyName: string;
    roleName: string;
    addedByName?: string | undefined;
  }
): Promise<void> {
  if (!process.env.EMAIL_SERVICE_URL) {
    logger.warn(
      `[email] EMAIL_SERVICE_URL not set — welcome email for ${recipient.email} (${data.companyName}) not sent`
    );
    return;
  }

  try {
    await dispatchEmail(
      {
        to: recipient.email,
        template: "companyWelcome",
        lang: recipient.lang,
        data: {
          companyName: data.companyName,
          roleName: data.roleName,
          addedByName: data.addedByName,
        },
      },
      "sendCompanyWelcomeEmail"
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(
      `[email] sendCompanyWelcomeEmail failed for ${recipient.email}:`,
      msg
    );
  }
}

/**
 * tr-Davetin kabul veya reddedildiğini davet eden kişiye bildirir. Davetin durumu zaten
 *    güncellendiği için gönderim hatası akışı bozmaz, yalnızca günlüğe alınır.
 * en-Tells the inviter that their invitation was accepted or declined. The invitation status is
 *    already updated by this point, so a delivery failure is logged rather than thrown.
 * input (recipient: { email: string; lang?: "en" | "tr" }, data: { inviteeEmail: string; inviteeName?: string; companyName: string; outcome: "ACCEPTED" | "DECLINED" })
 * output (Promise<void>)
 */
export async function sendInvitationOutcomeEmail(
  recipient: { email: string; lang?: "en" | "tr" | undefined },
  data: {
    inviteeEmail: string;
    inviteeName?: string | undefined;
    companyName: string;
    outcome: "ACCEPTED" | "DECLINED";
  }
): Promise<void> {
  if (!process.env.EMAIL_SERVICE_URL) {
    logger.warn(
      `[email] EMAIL_SERVICE_URL not set — invitation ${data.outcome} notice for ${recipient.email} not sent`
    );
    return;
  }

  try {
    await dispatchEmail(
      {
        to: recipient.email,
        template: "invitationOutcome",
        lang: recipient.lang,
        data: {
          inviteeEmail: data.inviteeEmail,
          inviteeName: data.inviteeName,
          companyName: data.companyName,
          outcome: data.outcome,
        },
      },
      "sendInvitationOutcomeEmail"
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(
      `[email] sendInvitationOutcomeEmail failed for ${recipient.email}:`,
      msg
    );
  }
}

/**
 * tr-Kimlik bilgisi değişikliklerinde güvenlik uyarısı gönderir. Bu e-posta hiçbir bildirim
 *    tercihiyle kapatılamaz: kullanıcının hesabının ele geçirildiğini öğrenebileceği tek
 *    bant dışı sinyal budur. Değişiklik zaten uygulandığı için hata fırlatılmaz, günlüğe alınır.
 * en-Sends a security alert on credential-affecting changes. This mail is intentionally not
 *    gated by any notification preference — it is the user's only out-of-band signal that their
 *    account may have been taken over. The change is already applied, so failures are logged,
 *    never thrown.
 * input (recipient: { email: string; lang?: "en" | "tr" }, data: { kind: SecurityAlertKind; userName?: string; ipAddress?: string; deviceInfo?: string })
 * output (Promise<void>)
 */
export async function sendSecurityAlertEmail(
  recipient: { email: string; lang?: "en" | "tr" | undefined },
  data: {
    kind: SecurityAlertKind;
    userName?: string | undefined;
    ipAddress?: string | undefined;
    deviceInfo?: string | undefined;
  }
): Promise<void> {
  if (!process.env.EMAIL_SERVICE_URL) {
    logger.error(
      `[email] EMAIL_SERVICE_URL not set — SECURITY ALERT (${data.kind}) for ${recipient.email} was not delivered.`
    );
    return;
  }

  try {
    await dispatchEmail(
      {
        to: recipient.email,
        template: "securityAlert",
        lang: recipient.lang,
        data: {
          kind: data.kind,
          userName: data.userName,
          ipAddress: data.ipAddress,
          deviceInfo: data.deviceInfo,
        },
      },
      "sendSecurityAlertEmail"
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Logged at error level: a missed security alert is a real safety gap, not noise.
    logger.error(
      `[email] sendSecurityAlertEmail (${data.kind}) failed for ${recipient.email}:`,
      msg
    );
  }
}

/**
 * tr-Abonelik yaşam döngüsü e-postası gönderir (deneme bitişi, plan aktivasyonu).
 * en-Sends a subscription lifecycle email (trial expiry, plan activation).
 * input (recipient: { email: string; lang?: "en" | "tr" }, data: { kind: SubscriptionEmailKind; daysRemaining?: number; planName?: string })
 * output (Promise<boolean>) — true when handed off to the email service
 */
export async function sendSubscriptionEmail(
  recipient: { email: string; lang?: "en" | "tr" | undefined },
  data: {
    kind: SubscriptionEmailKind;
    userName?: string | undefined;
    daysRemaining?: number | undefined;
    planName?: string | undefined;
  }
): Promise<boolean> {
  if (!process.env.EMAIL_SERVICE_URL) {
    logger.warn(
      `[email] EMAIL_SERVICE_URL not set — subscription email (${data.kind}) for ${recipient.email} not sent`
    );
    return false;
  }

  try {
    await dispatchEmail(
      {
        to: recipient.email,
        template: "subscription",
        lang: recipient.lang,
        data: {
          kind: data.kind,
          userName: data.userName,
          daysRemaining: data.daysRemaining,
          planName: data.planName,
        },
      },
      "sendSubscriptionEmail"
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(
      `[email] sendSubscriptionEmail (${data.kind}) failed for ${recipient.email}:`,
      msg
    );
    return false;
  }
}

/**
 * tr-Sevkiyat/bakım gibi olay tabanlı bildirimler için toplu e-posta gönderir. Her alıcı e-postası ayrı bir gönderim
 *    olarak işlenir; bir alıcının başarısız olması diğerlerini etkilemez. EMAIL_SERVICE_URL tanımlı değilse günlüğe kaydeder.
 * en-Sends event-driven notification emails (shipment/maintenance) to a batch of recipients. Each recipient is sent
 *    independently so one failure doesn't block the rest. If EMAIL_SERVICE_URL is not set, logs instead of sending.
 * input (recipients: { email: string; lang?: "en" | "tr" }[], notification: { title: string; message: string; type: NotificationEmailKind; link?: string })
 * output (Promise<void>)
 */
export async function sendNotificationEmail(
  recipients: { email: string; lang?: "en" | "tr" | undefined }[],
  notification: {
    title: string;
    message: string;
    type: NotificationEmailKind;
    link?: string | undefined;
  }
): Promise<void> {
  if (recipients.length === 0) return;

  if (!process.env.EMAIL_SERVICE_URL) {
    logger.warn(
      `[email] EMAIL_SERVICE_URL not set — notification email "${notification.title}" not sent to ${recipients.length} recipient(s)`
    );
    return;
  }

  await Promise.all(
    recipients.map(async (recipient) => {
      try {
        await dispatchEmail(
          {
            to: recipient.email,
            template: "notification",
            lang: recipient.lang,
            data: {
              title: notification.title,
              message: notification.message,
              type: notification.type,
              link: notification.link,
            },
          },
          "sendNotificationEmail"
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(
          `[email] sendNotificationEmail failed for ${recipient.email}:`,
          msg
        );
      }
    })
  );
}

/**
 * tr-Haftalık özet raporunu bir alıcı grubuna gönderir. Her alıcı e-postası ayrı bir gönderim olarak işlenir;
 *    bir alıcının başarısız olması diğerlerini etkilemez. EMAIL_SERVICE_URL tanımlı değilse günlüğe kaydeder.
 * en-Sends the weekly summary report to a batch of recipients. Each recipient is sent independently so one
 *    failure doesn't block the rest. If EMAIL_SERVICE_URL is not set, logs instead of sending.
 * input (recipients: { email: string; lang?: "en" | "tr" }[], report: Omit<WeeklyReportEmailData, "lang">)
 * output (Promise<void>)
 */
export async function sendWeeklyReportEmail(
  recipients: { email: string; lang?: "en" | "tr" | undefined }[],
  report: Omit<WeeklyReportEmailData, "lang">
): Promise<void> {
  if (recipients.length === 0) return;

  if (!process.env.EMAIL_SERVICE_URL) {
    logger.warn(
      `[email] EMAIL_SERVICE_URL not set — weekly report for "${report.companyName}" not sent to ${recipients.length} recipient(s)`
    );
    return;
  }

  await Promise.all(
    recipients.map(async (recipient) => {
      try {
        await dispatchEmail(
          {
            to: recipient.email,
            template: "weeklyReport",
            lang: recipient.lang,
            data: {
              companyName: report.companyName,
              weekLabel: report.weekLabel,
              stats: report.stats,
            },
          },
          "sendWeeklyReportEmail"
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(
          `[email] sendWeeklyReportEmail failed for ${recipient.email}:`,
          msg
        );
      }
    })
  );
}
