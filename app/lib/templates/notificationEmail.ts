/**
 * Generic Notification Email Template
 * Used for SHIPMENT_UPDATE and MAINTENANCE_ALERT emails.
 * Supports TR (Turkish) and EN (English). Inline CSS for email-client compatibility.
 */

export type NotificationEmailKind = "INFO" | "WARNING" | "ERROR" | "SUCCESS";

interface NotificationEmailData {
  title: string;
  message: string;
  type: NotificationEmailKind;
  link?: string | undefined;
  lang?: "tr" | "en" | undefined;
}

const strings: Record<"en" | "tr", { badgeLabel: string; ctaButton: string; footerTagline: string; footerPoweredBy: string; preferencesNote: string }> = {
  en: {
    badgeLabel: "LogiTrack Notification",
    ctaButton: "View Details",
    footerTagline: "The smart logistics platform for modern fleets.",
    footerPoweredBy: "Powered by LogiTrack",
    preferencesNote: "You're receiving this because email notifications are enabled in your profile settings.",
  },
  tr: {
    badgeLabel: "LogiTrack Bildirimi",
    ctaButton: "Detayları Görüntüle",
    footerTagline: "Modern filolar için akıllı lojistik platformu.",
    footerPoweredBy: "LogiTrack tarafından sunulmaktadır",
    preferencesNote: "Bu e-postayı, profil ayarlarınızda e-posta bildirimleri açık olduğu için alıyorsunuz.",
  },
};

const accentByType: Record<NotificationEmailKind, { color: string; bg: string; border: string }> = {
  INFO: { color: "#818cf8", bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.25)" },
  SUCCESS: { color: "#34d399", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)" },
  WARNING: { color: "#fbbf24", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)" },
  ERROR: { color: "#f87171", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)" },
};

/**
 * tr-Sevkiyat/bakım gibi olay tabanlı bildirimler için dil desteğiyle {konu, html, text} döndürür
 * en-Returns {subject, html, text} for event-driven notification emails (shipment/maintenance) with language support
 * input (data: NotificationEmailData)
 * output ({ subject: string; html: string; text: string })
 */
export function buildNotificationEmail(data: NotificationEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const lang: "en" | "tr" = data.lang === "tr" ? "tr" : "en";
  const t = strings[lang];
  const accent = accentByType[data.type];
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://logitrack.emreceyhan.xyz";
  const fullLink = data.link ? (data.link.startsWith("http") ? data.link : `${baseUrl}/${lang}${data.link}`) : undefined;

  const subject = data.title;

  const html = /* html */ `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
</head>
<body style="margin:0;padding:0;background-color:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0f1117;">
    <tr>
      <td align="center" style="padding:40px 16px 60px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background-color:#1a1d27;border-radius:20px;border:1px solid #2a2d3d;box-shadow:0 25px 50px rgba(0,0,0,0.5);">

          <tr>
            <td style="padding:36px 40px 0;">
              <span style="display:inline-block;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.4);border-radius:100px;padding:6px 16px;font-size:12px;font-weight:600;color:#e0e7ff;letter-spacing:0.5px;text-transform:uppercase;">
                🚛 ${t.badgeLabel}
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px 0;">
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#f1f5f9;line-height:1.3;">${data.title}</h1>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td style="background:${accent.bg};border:1px solid ${accent.border};border-radius:12px;padding:18px 20px;">
                    <p style="margin:0;font-size:15px;color:#f1f5f9;line-height:1.7;">${data.message}</p>
                  </td>
                </tr>
              </table>

              ${fullLink ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${fullLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;box-shadow:0 8px 25px rgba(99,102,241,0.4);">
                      ${t.ctaButton}
                    </a>
                  </td>
                </tr>
              </table>` : ""}
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#2a2d3d,transparent);"></div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px 36px;text-align:center;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#94a3b8;">
                Logi<span style="color:#818cf8;">Track</span>
              </p>
              <p style="margin:0 0 14px;font-size:12px;color:#64748b;line-height:1.5;">${t.footerTagline}</p>
              <p style="margin:0;font-size:11px;color:#64748b;line-height:1.5;">${t.preferencesNote}</p>
              <p style="margin:10px 0 0;font-size:11px;color:#64748b;">© ${new Date().getFullYear()} LogiTrack. ${t.footerPoweredBy}.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${data.title}\n\n${data.message}${fullLink ? `\n\n${fullLink}` : ""}\n\n${t.preferencesNote}`;

  return { subject, html, text };
}
