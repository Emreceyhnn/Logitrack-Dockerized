/**
 * Company Invitation Email Template
 * Supports TR (Turkish) and EN (English).
 * Uses inline CSS for maximum email-client compatibility (Gmail, Outlook, Apple Mail, etc.)
 */

interface DriverInviteEmailData {
  companyName: string;
  inviteUrl: string;
  roleName: string;
  expiryDays?: number;
  lang?: "tr" | "en";
}

interface DriverInviteEmailStrings {
  subject: string;
  previewText: string;
  badgeLabel: string;
  headline: string;
  subheadline: string;
  bodyLine1: string;
  bodyLine2: string;
  ctaButton: string;
  orLabel: string;
  urlLabel: string;
  expiryNote: string;
  ignoreNote: string;
  footerTagline: string;
  footerPoweredBy: string;
  footerPrivacy: string;
  footerTerms: string;
  footerUnsubscribe: string;
}

const strings: Record<"en" | "tr", DriverInviteEmailStrings> = {
  en: {
    subject: "You've been invited to join {companyName} on LogiTrack",
    previewText:
      "Accept your invitation to join {companyName} as a {roleName} on LogiTrack — your link expires in {expiryDays} days.",
    badgeLabel: "{roleName} Invitation",
    headline: "You've been invited!",
    subheadline: "Join {companyName} on LogiTrack",
    bodyLine1:
      "<strong>{companyName}</strong> has invited you to join their fleet as a <strong>{roleName}</strong> on LogiTrack.",
    bodyLine2:
      "Click the button below to accept your invitation and set up your account. This link is valid for <strong>{expiryDays} days</strong>.",
    ctaButton: "Accept Invitation",
    orLabel: "Or copy and paste this URL into your browser:",
    urlLabel: "Invitation Link",
    expiryNote:
      "This invitation link expires in {expiryDays} days. After that, ask your admin to send a new one.",
    ignoreNote:
      "If you weren't expecting this invitation, you can safely ignore this email. No account will be created without your action.",
    footerTagline: "The smart logistics platform for modern fleets.",
    footerPoweredBy: "Powered by LogiTrack",
    footerPrivacy: "Privacy Policy",
    footerTerms: "Terms of Service",
    footerUnsubscribe: "Unsubscribe",
  },
  tr: {
    subject: "{companyName} şirketinin LogiTrack'e davetini aldınız",
    previewText:
      "{companyName} şirketine {roleName} olarak katılmak için daveti kabul edin — bağlantınız {expiryDays} gün içinde sona eriyor.",
    badgeLabel: "{roleName} Daveti",
    headline: "Davet Edildiniz!",
    subheadline: "{companyName} şirketine LogiTrack'te katılın",
    bodyLine1:
      "<strong>{companyName}</strong> şirketi, sizi LogiTrack'teki filolarına <strong>{roleName}</strong> olarak katılmaya davet etti.",
    bodyLine2:
      "Davetinizi kabul etmek ve hesabınızı oluşturmak için aşağıdaki butona tıklayın. Bu bağlantı <strong>{expiryDays} gün</strong> boyunca geçerlidir.",
    ctaButton: "Daveti Kabul Et",
    orLabel: "Veya bu URL'yi tarayıcınıza kopyalayıp yapıştırın:",
    urlLabel: "Davet Bağlantısı",
    expiryNote:
      "Bu davet bağlantısı {expiryDays} gün içinde sona erecektir. Sonrasında yöneticinizden yeni bir davet göndermesini talep edin.",
    ignoreNote:
      "Bu daveti beklemiyorsanız bu e-postayı güvenle yok sayabilirsiniz. Siz işlem yapana kadar herhangi bir hesap oluşturulmayacaktır.",
    footerTagline: "Modern filolar için akıllı lojistik platformu.",
    footerPoweredBy: "LogiTrack tarafından sunulmaktadır",
    footerPrivacy: "Gizlilik Politikası",
    footerTerms: "Hizmet Koşulları",
    footerUnsubscribe: "Aboneliği İptal Et",
  },
};

/**
 * tr-Sürücü davet e-postası için dil desteğiyle birlikte {konu, html, text} döndürür
 * en-Returns {subject, html, text} for the driver invite email with language support
 * input (data: DriverInviteEmailData)
 * output ({ subject: string; html: string; text: string })
 */
export function buildDriverInviteEmail(data: DriverInviteEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const lang: "en" | "tr" = data.lang === "tr" ? "tr" : "en";
  const t = strings[lang];
  const expiryDays = data.expiryDays ?? 7;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://logitrack.emreceyhan.xyz";

  const interpolate = (str: string): string =>
    str
      .replace(/{companyName}/g, data.companyName)
      .replace(/{roleName}/g, data.roleName)
      .replace(/{expiryDays}/g, String(expiryDays))
      .replace(/{lang}/g, lang);

  const subject = interpolate(t.subject);
  const previewText = interpolate(t.previewText);

  // ─── Palette ───────────────────────────────────────────────────────────────
  const palette = {
    bg: "#0f1117",
    card: "#1a1d27",
    border: "#2a2d3d",
    accentPrimary: "#6366f1",       // indigo-500
    accentSecondary: "#818cf8",     // indigo-400
    accentGlow: "#4f46e5",          // indigo-600
    textPrimary: "#f1f5f9",         // slate-100
    textSecondary: "#94a3b8",       // slate-400
    textMuted: "#64748b",           // slate-500
    badgeBg: "rgba(99,102,241,0.15)",
    badgeBorder: "rgba(99,102,241,0.4)",
    ctaBg: "#6366f1",
    ctaHover: "#4f46e5",
    divider: "#2a2d3d",
    success: "#10b981",
    notesBg: "rgba(99,102,241,0.08)",
    notesBorder: "rgba(99,102,241,0.25)",
    warnBg: "rgba(245,158,11,0.08)",
    warnBorder: "rgba(245,158,11,0.25)",
    warnText: "#fbbf24",
  };

  const html = /* html */ `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${subject}</title>
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${palette.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Preview text (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:${palette.bg};line-height:1px;">
    ${previewText}
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <!-- Main wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${palette.bg};min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px 60px;">

        <!-- Email card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${palette.card};border-radius:20px;border:1px solid ${palette.border};box-shadow:0 25px 50px rgba(0,0,0,0.5);">

          <!-- ─── HEADER with gradient ─── -->
          <tr>
            <td style="padding:0;border-radius:20px 20px 0 0;overflow:hidden;">
              <div style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4338ca 70%,#6366f1 100%);padding:48px 48px 40px;text-align:center;position:relative;">

                <!-- Decorative circles (supported clients) -->
                <div style="position:absolute;top:-60px;right:-60px;width:200px;height:200px;background:rgba(99,102,241,0.15);border-radius:50%;pointer-events:none;"></div>
                <div style="position:absolute;bottom:-40px;left:-40px;width:150px;height:150px;background:rgba(129,140,248,0.1);border-radius:50%;pointer-events:none;"></div>

                <!-- Logo + Wordmark -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                  <tr>
                    <td align="center">
                      <!-- Icon Box -->
                      <div style="display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:16px;padding:14px;margin-bottom:16px;backdrop-filter:blur(10px);">
                        <!-- Truck SVG icon -->
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 3h15v13H1z" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
                          <path d="M16 8h4l3 3v5h-7V8z" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
                          <circle cx="5.5" cy="18.5" r="2.5" stroke="white" stroke-width="1.5"/>
                          <circle cx="18.5" cy="18.5" r="2.5" stroke="white" stroke-width="1.5"/>
                        </svg>
                      </div>
                      <br />
                      <!-- Wordmark -->
                      <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Logi<span style="color:#a5b4fc;">Track</span></span>
                    </td>
                  </tr>
                </table>

                <!-- Badge -->
                <div style="margin-top:20px;">
                  <span style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:100px;padding:6px 16px;font-size:12px;font-weight:600;color:#e0e7ff;letter-spacing:0.5px;text-transform:uppercase;">
                    🚛 ${interpolate(t.badgeLabel)}
                  </span>
                </div>

              </div>
            </td>
          </tr>

          <!-- ─── BODY ─── -->
          <tr>
            <td style="padding:48px 48px 0;">

              <!-- Headline -->
              <h1 style="margin:0 0 8px;font-size:32px;font-weight:800;color:${palette.textPrimary};line-height:1.2;letter-spacing:-0.5px;">
                ${t.headline}
              </h1>
              <p style="margin:0 0 28px;font-size:18px;font-weight:500;color:${palette.accentSecondary};line-height:1.4;">
                ${interpolate(t.subheadline)}
              </p>

              <!-- Divider -->
              <div style="height:1px;background:linear-gradient(90deg,transparent,${palette.border},transparent);margin-bottom:28px;"></div>

              <!-- Body copy -->
              <p style="margin:0 0 16px;font-size:16px;color:${palette.textSecondary};line-height:1.75;">
                ${interpolate(t.bodyLine1)}
              </p>
              <p style="margin:0 0 36px;font-size:16px;color:${palette.textSecondary};line-height:1.75;">
                ${interpolate(t.bodyLine2)}
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${data.inviteUrl}" 
                       target="_blank"
                       style="display:inline-block;background:linear-gradient(135deg,${palette.ctaBg} 0%,${palette.ctaHover} 100%);color:#ffffff;font-size:17px;font-weight:700;text-decoration:none;padding:18px 48px;border-radius:14px;letter-spacing:0.2px;box-shadow:0 8px 25px rgba(99,102,241,0.4);border:1px solid rgba(129,140,248,0.3);">
                      ✓ &nbsp;${t.ctaButton}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- URL fallback -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 10px;font-size:13px;color:${palette.textMuted};text-align:center;">
                      ${t.orLabel}
                    </p>
                    <div style="background:#0f1117;border:1px solid ${palette.border};border-radius:10px;padding:14px 20px;word-break:break-all;text-align:left;">
                      <span style="font-size:12px;color:${palette.textMuted};display:block;margin-bottom:4px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">${t.urlLabel}</span>
                      <a href="${data.inviteUrl}" style="font-size:13px;color:${palette.accentSecondary};text-decoration:none;word-break:break-all;font-family:'Courier New',Courier,monospace;">
                        ${data.inviteUrl}
                      </a>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiry note box -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px;">
                <tr>
                  <td style="background:${palette.warnBg};border:1px solid ${palette.warnBorder};border-radius:12px;padding:16px 20px;">
                    <p style="margin:0;font-size:14px;color:${palette.warnText};line-height:1.6;">
                      ⏳ &nbsp;${interpolate(t.expiryNote)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Ignore note box -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:0;">
                <tr>
                  <td style="background:${palette.notesBg};border:1px solid ${palette.notesBorder};border-radius:12px;padding:16px 20px;">
                    <p style="margin:0;font-size:14px;color:${palette.textMuted};line-height:1.6;">
                      🔒 &nbsp;${t.ignoreNote}
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ─── DIVIDER ─── -->
          <tr>
            <td style="padding:40px 48px 0;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,${palette.border},transparent);"></div>
            </td>
          </tr>

          <!-- ─── FOOTER ─── -->
          <tr>
            <td style="padding:28px 48px 40px;text-align:center;">

              <!-- LogiTrack branding -->
              <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${palette.textSecondary};">
                Logi<span style="color:${palette.accentSecondary};">Track</span>
              </p>
              <p style="margin:0 0 20px;font-size:13px;color:${palette.textMuted};line-height:1.5;">
                ${t.footerTagline}
              </p>

              <!-- Footer links -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:20px;">
                <tr>
                  <td style="padding:0 10px;">
                    <a href="${baseUrl}/${lang}/privacy" style="font-size:12px;color:${palette.textMuted};text-decoration:none;">${t.footerPrivacy}</a>
                  </td>
                  <td style="color:${palette.textMuted};font-size:12px;">·</td>
                  <td style="padding:0 10px;">
                    <a href="${baseUrl}/${lang}/sla" style="font-size:12px;color:${palette.textMuted};text-decoration:none;">${t.footerTerms}</a>
                  </td>
                </tr>
              </table>

              <!-- Copyright -->
              <p style="margin:0;font-size:12px;color:${palette.textMuted};">
                © ${new Date().getFullYear()} LogiTrack. ${t.footerPoweredBy}.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

  // ─── Plain text fallback ──────────────────────────────────────────────────
  const text = lang === "tr"
    ? `Merhaba,

${data.companyName} şirketi, sizi LogiTrack'teki filolarına ${data.roleName} olarak katılmaya davet etti.

Daveti kabul etmek için aşağıdaki bağlantıya tıklayın:
${data.inviteUrl}

Bu bağlantı ${expiryDays} gün boyunca geçerlidir.

Bu daveti beklemiyorsanız bu e-postayı görmezden gelebilirsiniz.

Teşekkürler,
LogiTrack Ekibi`
    : `Hello,

${data.companyName} has invited you to join their fleet on LogiTrack as a ${data.roleName}.

Click the link below to accept your invitation:
${data.inviteUrl}

This link is valid for ${expiryDays} days.

If you weren't expecting this invitation, you can safely ignore this email.

Thanks,
The LogiTrack Team`;

  return { subject, html, text };
}
