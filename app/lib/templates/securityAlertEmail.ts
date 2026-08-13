/**
 * Security Alert Email Template
 * Sent when a credential-affecting change happens on an account.
 * Supports TR (Turkish) and EN (English).
 *
 * These emails are the user's only out-of-band signal that their account may
 * have been taken over, so they always send — there is deliberately no
 * notification preference that can switch them off.
 */

import { buildNotificationEmail } from "./notificationEmail";

export type SecurityAlertKind = "PASSWORD_CHANGED" | "PASSWORD_RESET";

interface SecurityAlertEmailData {
  kind: SecurityAlertKind;
  userName?: string | undefined;
  ipAddress?: string | undefined;
  deviceInfo?: string | undefined;
  occurredAt?: Date | undefined;
  lang?: "tr" | "en" | undefined;
}

const strings = {
  en: {
    PASSWORD_CHANGED: {
      subject: "Your LogiTrack password was changed",
      title: "Your password was changed 🔐",
      body: "The password on your LogiTrack account was just changed.",
    },
    PASSWORD_RESET: {
      subject: "Your LogiTrack password was reset",
      title: "Your password was reset 🔐",
      body:
        "Your LogiTrack password was reset using a password-reset link, and " +
        "every active session was signed out.",
    },
    detailsLabel: "Details",
    whenLabel: "When",
    ipLabel: "IP address",
    deviceLabel: "Device",
    reassurance: "If you made this change, no further action is needed.",
    warning:
      "<strong>If this wasn't you</strong>, your account may be compromised. " +
      "Reset your password immediately and contact your fleet administrator.",
  },
  tr: {
    PASSWORD_CHANGED: {
      subject: "LogiTrack şifreniz değiştirildi",
      title: "Şifreniz değiştirildi 🔐",
      body: "LogiTrack hesabınızın şifresi az önce değiştirildi.",
    },
    PASSWORD_RESET: {
      subject: "LogiTrack şifreniz sıfırlandı",
      title: "Şifreniz sıfırlandı 🔐",
      body:
        "LogiTrack şifreniz bir şifre sıfırlama bağlantısıyla sıfırlandı ve " +
        "tüm aktif oturumlarınız kapatıldı.",
    },
    detailsLabel: "Ayrıntılar",
    whenLabel: "Zaman",
    ipLabel: "IP adresi",
    deviceLabel: "Cihaz",
    reassurance: "Bu değişikliği siz yaptıysanız yapmanız gereken bir şey yok.",
    warning:
      "<strong>Bu işlemi siz yapmadıysanız</strong> hesabınız ele geçirilmiş olabilir. " +
      "Hemen şifrenizi sıfırlayın ve filo yöneticinizle iletişime geçin.",
  },
} as const;

/**
 * tr-Kimlik bilgisi değişikliklerinde gönderilen güvenlik uyarısı e-postasını üretir
 * en-Builds the security alert email sent on credential-affecting changes
 * input (data: SecurityAlertEmailData)
 * output ({ subject: string; html: string; text: string })
 */
export function buildSecurityAlertEmail(data: SecurityAlertEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const lang: "en" | "tr" = data.lang === "tr" ? "tr" : "en";
  const t = strings[lang];
  const variant = t[data.kind];

  const occurredAt = data.occurredAt ?? new Date();
  const formattedDate = occurredAt.toLocaleString(lang === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  // Each known detail becomes a row; unknown ones are omitted rather than
  // rendered as "unknown", which would only add noise.
  const details: string[] = [`${t.whenLabel}: ${formattedDate} UTC`];
  if (data.ipAddress) details.push(`${t.ipLabel}: ${data.ipAddress}`);
  if (data.deviceInfo) details.push(`${t.deviceLabel}: ${data.deviceInfo}`);

  const detailsHtml = details
    .map(
      (line) =>
        `<span style="display:block;color:#94a3b8;font-size:13px;line-height:1.8;">${line}</span>`
    )
    .join("");

  const message =
    `${variant.body}<br /><br />` +
    `<strong style="color:#f1f5f9;font-size:13px;">${t.detailsLabel}</strong><br />` +
    `${detailsHtml}<br />` +
    `<span style="color:#94a3b8;font-size:13px;">${t.reassurance}</span><br /><br />` +
    `<span style="color:#fbbf24;font-size:13px;">${t.warning}</span>`;

  const built = buildNotificationEmail({
    title: variant.title,
    message,
    // WARNING rather than ERROR: the change itself may well be legitimate, and
    // an alarming red banner on a routine password change trains users to
    // ignore exactly the mail they must not ignore.
    type: "WARNING",
    lang,
  });

  const text =
    `${variant.title}\n\n${variant.body}\n\n` +
    `${t.detailsLabel}:\n${details.join("\n")}\n\n` +
    `${t.reassurance}\n\n${t.warning.replace(/<[^>]+>/g, "")}`;

  return { subject: variant.subject, html: built.html, text };
}
