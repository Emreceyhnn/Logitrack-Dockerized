/**
 * Email Verification Template
 * Supports TR (Turkish) and EN (English).
 * Uses inline CSS for maximum email-client compatibility (Gmail, Outlook, Apple Mail, etc.)
 */

interface EmailVerificationEmailData {
  verifyUrl: string;
  userName?: string;
  expiryHours?: number;
  lang?: "tr" | "en";
}

interface EmailVerificationStrings {
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
  expiryNote: string;
  ignoreNote: string;
  footerTagline: string;
  footerPoweredBy: string;
}

const strings: Record<"en" | "tr", EmailVerificationStrings> = {
  en: {
    subject: "Verify your LogiTrack email address",
    previewText:
      "Confirm your email address to finish setting up your LogiTrack account — this link expires in {expiryHours} hours.",
    badgeLabel: "Email Verification",
    headline: "Verify your email",
    subheadline: "One quick step to secure your account",
    greeting: "Welcome{userName},",
    bodyLine1:
      "Thanks for signing up for <strong>LogiTrack</strong>. Please confirm that this email address belongs to you.",
    bodyLine2:
      "Click the button below to verify your address. This link is valid for <strong>{expiryHours} hours</strong> and can only be used once.",
    ctaButton: "Verify Email Address",
    orLabel: "Or copy and paste this URL into your browser:",
    expiryNote:
      "This link expires in {expiryHours} hours and can only be used once. You can request a new one from your account at any time.",
    ignoreNote:
      "If you didn't create a LogiTrack account, you can safely ignore this email — no account will be confirmed without this step.",
    footerTagline: "The smart logistics platform for modern fleets.",
    footerPoweredBy: "Powered by LogiTrack",
  },
  tr: {
    subject: "LogiTrack e-posta adresinizi doğrulayın",
    previewText:
      "LogiTrack hesabınızı tamamlamak için e-posta adresinizi onaylayın — bu bağlantı {expiryHours} saat içinde sona eriyor.",
    badgeLabel: "E-posta Doğrulama",
    headline: "E-postanızı doğrulayın",
    subheadline: "Hesabınızı güvence altına almak için tek bir adım",
    greeting: "Hoş geldiniz{userName},",
    bodyLine1:
      "<strong>LogiTrack</strong>'e kaydolduğunuz için teşekkürler. Lütfen bu e-posta adresinin size ait olduğunu onaylayın.",
    bodyLine2:
      "Adresinizi doğrulamak için aşağıdaki butona tıklayın. Bu bağlantı <strong>{expiryHours} saat</strong> boyunca geçerlidir ve yalnızca bir kez kullanılabilir.",
    ctaButton: "E-postayı Doğrula",
    orLabel: "Ya da bu bağlantıyı tarayıcınıza kopyalayıp yapıştırın:",
    expiryNote:
      "Bu bağlantı {expiryHours} saat içinde sona erer ve yalnızca bir kez kullanılabilir. Dilediğiniz zaman hesabınızdan yenisini talep edebilirsiniz.",
    ignoreNote:
      "LogiTrack hesabı oluşturmadıysanız bu e-postayı görmezden gelebilirsiniz — bu adım olmadan hiçbir hesap onaylanmaz.",
    footerTagline: "Modern filolar için akıllı lojistik platformu.",
    footerPoweredBy: "LogiTrack tarafından desteklenmektedir",
  },
};

/**
 * tr-E-posta doğrulama e-postası için dil desteğiyle birlikte {konu, html, text} döndürür
 * en-Returns {subject, html, text} for the email verification email with language support
 * input (data: EmailVerificationEmailData)
 * output ({ subject: string; html: string; text: string })
 */
export function buildEmailVerificationEmail(data: EmailVerificationEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const lang: "en" | "tr" = data.lang === "tr" ? "tr" : "en";
  const t = strings[lang];
  const expiryHours = data.expiryHours ?? 24;

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
      .replace(/{expiryHours}/g, String(expiryHours))
      .replace(/{userName}/g, safeName)
      .replace(/{lang}/g, lang);

  const subject = interpolate(t.subject);
  const previewText = interpolate(t.previewText);

  // ─── Palette ───────────────────────────────────────────────────────────────
  const palette = {
    bg: "#0f1117",
    card: "#1a1d27",
    border: "#2a2d3d",
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
                    <a href="${data.verifyUrl}" target="_blank" rel="noopener noreferrer"
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
                  ${data.verifyUrl}
                </p>
              </div>
            </td>
          </tr>

          <!-- ─── Notes ─── -->
          <tr>
            <td style="padding:0 48px 40px;">
              <div style="padding:16px 18px;background-color:${palette.warnBg};border:1px solid ${palette.warnBorder};border-radius:10px;margin-bottom:16px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:${palette.warnText};">
                  ${interpolate(t.expiryNote)}
                </p>
              </div>
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
    ? `Hoş geldiniz${plainName},

LogiTrack'e kaydolduğunuz için teşekkürler. Lütfen bu e-posta adresinin size ait olduğunu onaylayın.

Adresinizi doğrulamak için aşağıdaki bağlantıya tıklayın:
${data.verifyUrl}

Bu bağlantı ${expiryHours} saat boyunca geçerlidir ve yalnızca bir kez kullanılabilir.

LogiTrack hesabı oluşturmadıysanız bu e-postayı görmezden gelebilirsiniz.

Teşekkürler,
LogiTrack Ekibi`
    : `Welcome${plainName},

Thanks for signing up for LogiTrack. Please confirm that this email address belongs to you.

Click the link below to verify your address:
${data.verifyUrl}

This link is valid for ${expiryHours} hours and can only be used once.

If you didn't create a LogiTrack account, you can safely ignore this email.

Thanks,
The LogiTrack Team`;

  return { subject, html, text };
}
