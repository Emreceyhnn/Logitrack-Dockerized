/**
 * Password Reset Email Template
 * Supports TR (Turkish) and EN (English).
 * Uses inline CSS for maximum email-client compatibility (Gmail, Outlook, Apple Mail, etc.)
 */

interface PasswordResetEmailData {
  resetUrl: string;
  userName?: string;
  expiryMinutes?: number;
  lang?: "tr" | "en";
}

interface PasswordResetEmailStrings {
  subject: string;
  previewText: string;
  badgeLabel: string;
  headline: string;
  subheadline: string;
  greeting: string;
  bodyLine1: string;
  bodyLine2: string;
  ctaButton: string;
  orLabel: string;
  urlLabel: string;
  expiryNote: string;
  ignoreNote: string;
  securityNote: string;
  footerTagline: string;
  footerPoweredBy: string;
}

const strings: Record<"en" | "tr", PasswordResetEmailStrings> = {
  en: {
    subject: "Reset your LogiTrack password",
    previewText:
      "Reset your LogiTrack password — this link expires in {expiryMinutes} minutes.",
    badgeLabel: "Password Reset",
    headline: "Reset your password",
    subheadline: "Let's get you back into your account",
    greeting: "Hello{userName},",
    bodyLine1:
      "We received a request to reset the password for your <strong>LogiTrack</strong> account.",
    bodyLine2:
      "Click the button below to choose a new password. This link is valid for <strong>{expiryMinutes} minutes</strong> and can only be used once.",
    ctaButton: "Reset Password",
    orLabel: "Or copy and paste this URL into your browser:",
    urlLabel: "Reset Link",
    expiryNote:
      "This link expires in {expiryMinutes} minutes and can only be used once. After that, request a new one from the sign-in page.",
    ignoreNote:
      "If you didn't request a password reset, you can safely ignore this email — your password will stay exactly as it is.",
    securityNote:
      "For your security, resetting your password will sign you out of all other devices.",
    footerTagline: "The smart logistics platform for modern fleets.",
    footerPoweredBy: "Powered by LogiTrack",
  },
  tr: {
    subject: "LogiTrack şifrenizi sıfırlayın",
    previewText:
      "LogiTrack şifrenizi sıfırlayın — bu bağlantı {expiryMinutes} dakika içinde sona eriyor.",
    badgeLabel: "Şifre Sıfırlama",
    headline: "Şifrenizi sıfırlayın",
    subheadline: "Hesabınıza yeniden erişelim",
    greeting: "Merhaba{userName},",
    bodyLine1:
      "<strong>LogiTrack</strong> hesabınızın şifresini sıfırlama talebi aldık.",
    bodyLine2:
      "Yeni bir şifre belirlemek için aşağıdaki butona tıklayın. Bu bağlantı <strong>{expiryMinutes} dakika</strong> boyunca geçerlidir ve yalnızca bir kez kullanılabilir.",
    ctaButton: "Şifreyi Sıfırla",
    orLabel: "Ya da bu bağlantıyı tarayıcınıza kopyalayıp yapıştırın:",
    urlLabel: "Sıfırlama Bağlantısı",
    expiryNote:
      "Bu bağlantı {expiryMinutes} dakika içinde sona erer ve yalnızca bir kez kullanılabilir. Sonrasında giriş sayfasından yeni bir tane talep edin.",
    ignoreNote:
      "Şifre sıfırlama talebinde bulunmadıysanız bu e-postayı görmezden gelebilirsiniz — şifreniz aynen kalacaktır.",
    securityNote:
      "Güvenliğiniz için, şifrenizi sıfırlamak diğer tüm cihazlardaki oturumlarınızı kapatacaktır.",
    footerTagline: "Modern filolar için akıllı lojistik platformu.",
    footerPoweredBy: "LogiTrack tarafından desteklenmektedir",
  },
};

/**
 * tr-Şifre sıfırlama e-postası için dil desteğiyle birlikte {konu, html, text} döndürür
 * en-Returns {subject, html, text} for the password reset email with language support
 * input (data: PasswordResetEmailData)
 * output ({ subject: string; html: string; text: string })
 */
export function buildPasswordResetEmail(data: PasswordResetEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const lang: "en" | "tr" = data.lang === "tr" ? "tr" : "en";
  const t = strings[lang];
  const expiryMinutes = data.expiryMinutes ?? 60;

  // The name is interpolated into HTML, so it must be escaped — a display name
  // is user-controlled data and could otherwise inject markup into the email.
  const escapeHtml = (str: string): string =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const safeName = data.userName ? ` ${escapeHtml(data.userName)}` : "";

  const interpolate = (str: string): string =>
    str
      .replace(/{expiryMinutes}/g, String(expiryMinutes))
      .replace(/{userName}/g, safeName)
      .replace(/{lang}/g, lang);

  const subject = interpolate(t.subject);
  const previewText = interpolate(t.previewText);

  // ─── Palette ───────────────────────────────────────────────────────────────
  const palette = {
    bg: "#0f1117",
    card: "#1a1d27",
    border: "#2a2d3d",
    accentPrimary: "#6366f1",
    textPrimary: "#f1f5f9",
    textSecondary: "#94a3b8",
    textMuted: "#64748b",
    badgeBg: "rgba(99,102,241,0.15)",
    badgeBorder: "rgba(99,102,241,0.4)",
    ctaBg: "#6366f1",
    divider: "#2a2d3d",
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

          <!-- ─── HEADER ─── -->
          <tr>
            <td style="padding:0;border-radius:20px 20px 0 0;overflow:hidden;">
              <div style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4338ca 70%,#6366f1 100%);padding:48px 48px 40px;text-align:center;">
                <div style="display:inline-block;padding:6px 16px;background-color:${palette.badgeBg};border:1px solid ${palette.badgeBorder};border-radius:999px;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#c7d2fe;margin-bottom:24px;">
                  ${t.badgeLabel}
                </div>
                <h1 style="margin:0 0 12px;font-size:30px;line-height:1.25;font-weight:800;color:#ffffff;">
                  ${t.headline}
                </h1>
                <p style="margin:0;font-size:16px;line-height:1.5;color:#c7d2fe;">
                  ${t.subheadline}
                </p>
              </div>
            </td>
          </tr>

          <!-- ─── BODY ─── -->
          <tr>
            <td style="padding:40px 48px 8px;">
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:${palette.textPrimary};font-weight:600;">
                ${interpolate(t.greeting)}
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${palette.textSecondary};">
                ${t.bodyLine1}
              </p>
              <p style="margin:0 0 32px;font-size:15px;line-height:1.7;color:${palette.textSecondary};">
                ${interpolate(t.bodyLine2)}
              </p>
            </td>
          </tr>

          <!-- ─── CTA ─── -->
          <tr>
            <td align="center" style="padding:0 48px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:12px;background-color:${palette.ctaBg};box-shadow:0 8px 24px rgba(99,102,241,0.35);">
                    <a href="${data.resetUrl}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:16px 44px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">
                      ${t.ctaButton}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ─── Raw URL fallback ─── -->
          <tr>
            <td style="padding:0 48px 32px;">
              <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${palette.textMuted};">
                ${t.orLabel}
              </p>
              <div style="padding:14px 16px;background-color:${palette.notesBg};border:1px solid ${palette.notesBorder};border-radius:10px;">
                <p style="margin:0;font-size:13px;line-height:1.5;word-break:break-all;color:#a5b4fc;">
                  ${data.resetUrl}
                </p>
              </div>
            </td>
          </tr>

          <!-- ─── Security notes ─── -->
          <tr>
            <td style="padding:0 48px 40px;">
              <div style="padding:16px 18px;background-color:${palette.warnBg};border:1px solid ${palette.warnBorder};border-radius:10px;margin-bottom:16px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:${palette.warnText};">
                  ${interpolate(t.expiryNote)}
                </p>
              </div>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:${palette.textMuted};">
                ${t.securityNote}
              </p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:${palette.textMuted};">
                ${t.ignoreNote}
              </p>
            </td>
          </tr>

          <!-- ─── FOOTER ─── -->
          <tr>
            <td style="padding:28px 48px 36px;border-top:1px solid ${palette.divider};text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:${palette.textMuted};">
                ${t.footerTagline}
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:${palette.textMuted};">
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
  const plainName = data.userName ? ` ${data.userName}` : "";
  const text = lang === "tr"
    ? `Merhaba${plainName},

LogiTrack hesabınızın şifresini sıfırlama talebi aldık.

Yeni bir şifre belirlemek için aşağıdaki bağlantıya tıklayın:
${data.resetUrl}

Bu bağlantı ${expiryMinutes} dakika boyunca geçerlidir ve yalnızca bir kez kullanılabilir.

Güvenliğiniz için, şifrenizi sıfırlamak diğer tüm cihazlardaki oturumlarınızı kapatacaktır.

Şifre sıfırlama talebinde bulunmadıysanız bu e-postayı görmezden gelebilirsiniz.

Teşekkürler,
LogiTrack Ekibi`
    : `Hello${plainName},

We received a request to reset the password for your LogiTrack account.

Click the link below to choose a new password:
${data.resetUrl}

This link is valid for ${expiryMinutes} minutes and can only be used once.

For your security, resetting your password will sign you out of all other devices.

If you didn't request a password reset, you can safely ignore this email.

Thanks,
The LogiTrack Team`;

  return { subject, html, text };
}
