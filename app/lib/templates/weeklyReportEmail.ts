/**
 * Weekly Summary Report Email Template
 * Supports TR (Turkish) and EN (English). Inline CSS for email-client compatibility.
 */

export interface WeeklyReportEmailData {
  companyName: string;
  lang?: "tr" | "en" | undefined;
  weekLabel: string;
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

const strings: Record<"en" | "tr", {
  badgeLabel: string;
  headline: string;
  subheadline: string;
  newShipments: string;
  deliveredShipments: string;
  delayedShipments: string;
  completedRoutes: string;
  fleetUsage: string;
  upcomingMaintenance: string;
  ctaButton: string;
  footerTagline: string;
  footerPoweredBy: string;
  preferencesNote: string;
}> = {
  en: {
    badgeLabel: "Weekly Report",
    headline: "Your weekly summary",
    subheadline: "{companyName} — {weekLabel}",
    newShipments: "New Shipments",
    deliveredShipments: "Delivered",
    delayedShipments: "Delayed",
    completedRoutes: "Completed Routes",
    fleetUsage: "Fleet In Use",
    upcomingMaintenance: "Upcoming Maintenance",
    ctaButton: "Open Dashboard",
    footerTagline: "The smart logistics platform for modern fleets.",
    footerPoweredBy: "Powered by LogiTrack",
    preferencesNote: "You're receiving this because weekly report emails are enabled in your profile settings.",
  },
  tr: {
    badgeLabel: "Haftalık Rapor",
    headline: "Haftalık özetiniz",
    subheadline: "{companyName} — {weekLabel}",
    newShipments: "Yeni Sevkiyat",
    deliveredShipments: "Teslim Edildi",
    delayedShipments: "Gecikti",
    completedRoutes: "Tamamlanan Rota",
    fleetUsage: "Kullanımdaki Filo",
    upcomingMaintenance: "Yaklaşan Bakım",
    ctaButton: "Panele Git",
    footerTagline: "Modern filolar için akıllı lojistik platformu.",
    footerPoweredBy: "LogiTrack tarafından sunulmaktadır",
    preferencesNote: "Bu e-postayı, profil ayarlarınızda haftalık rapor e-postaları açık olduğu için alıyorsunuz.",
  },
};

function statCard(value: number | string, label: string, color: string): string {
  return `
    <td width="50%" style="padding:6px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0f1117;border:1px solid #2a2d3d;border-radius:14px;">
        <tr>
          <td style="padding:18px 20px;">
            <p style="margin:0 0 4px;font-size:26px;font-weight:800;color:${color};">${value}</p>
            <p style="margin:0;font-size:12px;color:#94a3b8;font-weight:500;">${label}</p>
          </td>
        </tr>
      </table>
    </td>`;
}

/**
 * tr-Haftalık özet e-postası için dil desteğiyle {konu, html, text} döndürür
 * en-Returns {subject, html, text} for the weekly summary email with language support
 * input (data: WeeklyReportEmailData)
 * output ({ subject: string; html: string; text: string })
 */
export function buildWeeklyReportEmail(data: WeeklyReportEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const lang: "en" | "tr" = data.lang === "tr" ? "tr" : "en";
  const t = strings[lang];
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://logitrack.emreceyhan.xyz";
  const dashboardUrl = `${baseUrl}/${lang}/dashboard`;
  const { stats } = data;

  const interpolate = (str: string): string =>
    str.replace(/{companyName}/g, data.companyName).replace(/{weekLabel}/g, data.weekLabel);

  const subject = lang === "tr"
    ? `${data.companyName} haftalık raporu — ${data.weekLabel}`
    : `${data.companyName} weekly report — ${data.weekLabel}`;

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
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="580" style="max-width:580px;width:100%;background-color:#1a1d27;border-radius:20px;border:1px solid #2a2d3d;box-shadow:0 25px 50px rgba(0,0,0,0.5);">

          <tr>
            <td style="padding:0;border-radius:20px 20px 0 0;overflow:hidden;">
              <div style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4338ca 70%,#6366f1 100%);padding:40px 40px 32px;text-align:center;">
                <span style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:100px;padding:6px 16px;font-size:12px;font-weight:600;color:#e0e7ff;letter-spacing:0.5px;text-transform:uppercase;">
                  📊 ${t.badgeLabel}
                </span>
                <h1 style="margin:16px 0 4px;font-size:26px;font-weight:800;color:#ffffff;">${t.headline}</h1>
                <p style="margin:0;font-size:15px;color:#c7d2fe;">${interpolate(t.subheadline)}</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 34px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  ${statCard(stats.newShipments, t.newShipments, "#818cf8")}
                  ${statCard(stats.deliveredShipments, t.deliveredShipments, "#34d399")}
                </tr>
                <tr>
                  ${statCard(stats.delayedShipments, t.delayedShipments, stats.delayedShipments > 0 ? "#f87171" : "#94a3b8")}
                  ${statCard(stats.completedRoutes, t.completedRoutes, "#818cf8")}
                </tr>
                <tr>
                  ${statCard(`${stats.activeVehicles}/${stats.totalVehicles}`, t.fleetUsage, "#fbbf24")}
                  ${statCard(stats.upcomingMaintenance, t.upcomingMaintenance, stats.upcomingMaintenance > 0 ? "#fbbf24" : "#94a3b8")}
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 34px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;box-shadow:0 8px 25px rgba(99,102,241,0.4);">
                      ${t.ctaButton}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 34px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#2a2d3d,transparent);"></div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 34px 36px;text-align:center;">
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

  const text = lang === "tr"
    ? `${data.companyName} - ${data.weekLabel} Haftalık Rapor

Yeni Sevkiyat: ${stats.newShipments}
Teslim Edildi: ${stats.deliveredShipments}
Gecikti: ${stats.delayedShipments}
Tamamlanan Rota: ${stats.completedRoutes}
Kullanımdaki Filo: ${stats.activeVehicles}/${stats.totalVehicles}
Yaklaşan Bakım: ${stats.upcomingMaintenance}

Paneli görüntülemek için: ${dashboardUrl}`
    : `${data.companyName} - ${data.weekLabel} Weekly Report

New Shipments: ${stats.newShipments}
Delivered: ${stats.deliveredShipments}
Delayed: ${stats.delayedShipments}
Completed Routes: ${stats.completedRoutes}
Fleet In Use: ${stats.activeVehicles}/${stats.totalVehicles}
Upcoming Maintenance: ${stats.upcomingMaintenance}

View your dashboard: ${dashboardUrl}`;

  return { subject, html, text };
}
