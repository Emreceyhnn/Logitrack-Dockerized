/**
 * Company Welcome Email Template
 * Sent when an admin adds an existing user to their company.
 * Supports TR (Turkish) and EN (English).
 *
 * Rather than duplicating ~300 lines of table markup, this composes the generic
 * notification shell: the visual design is identical across transactional mails,
 * so only the copy differs.
 */

import { buildNotificationEmail } from "./notificationEmail";

interface CompanyWelcomeEmailData {
  companyName: string;
  roleName: string;
  addedByName?: string | undefined;
  lang?: "tr" | "en" | undefined;
}

const strings = {
  en: {
    subject: "You've been added to {companyName} on LogiTrack",
    title: "Welcome to {companyName}! 🎉",
    bodyWithActor:
      "<strong>{addedByName}</strong> added you to <strong>{companyName}</strong> on LogiTrack as <strong>{roleName}</strong>. " +
      "Your account is now linked to their fleet, and your dashboard will reflect this the next time you sign in.",
    bodyWithoutActor:
      "You have been added to <strong>{companyName}</strong> on LogiTrack as <strong>{roleName}</strong>. " +
      "Your account is now linked to their fleet, and your dashboard will reflect this the next time you sign in.",
    footer:
      "If you weren't expecting this, contact your fleet administrator — they can remove your account from the company.",
  },
  tr: {
    subject: "{companyName} şirketine eklendiniz",
    title: "{companyName} şirketine hoş geldiniz! 🎉",
    bodyWithActor:
      "<strong>{addedByName}</strong> sizi LogiTrack üzerinde <strong>{companyName}</strong> şirketine <strong>{roleName}</strong> olarak ekledi. " +
      "Hesabınız artık bu filoya bağlı ve bir sonraki girişinizde panonuz buna göre güncellenecek.",
    bodyWithoutActor:
      "LogiTrack üzerinde <strong>{companyName}</strong> şirketine <strong>{roleName}</strong> olarak eklendiniz. " +
      "Hesabınız artık bu filoya bağlı ve bir sonraki girişinizde panonuz buna göre güncellenecek.",
    footer:
      "Bunu beklemiyorduysanız filo yöneticinizle iletişime geçin — hesabınızı şirketten çıkarabilirler.",
  },
} as const;

/**
 * tr-Bir kullanıcı şirkete eklendiğinde gönderilecek karşılama e-postasını üretir
 * en-Builds the welcome email sent when a user is added to a company
 * input (data: CompanyWelcomeEmailData)
 * output ({ subject: string; html: string; text: string })
 */
export function buildCompanyWelcomeEmail(data: CompanyWelcomeEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const lang: "en" | "tr" = data.lang === "tr" ? "tr" : "en";
  const t = strings[lang];

  const actor = data.addedByName?.trim();
  const interpolate = (str: string): string =>
    str
      .replace(/{companyName}/g, data.companyName)
      .replace(/{roleName}/g, data.roleName)
      .replace(/{addedByName}/g, actor ?? "");

  const built = buildNotificationEmail({
    title: interpolate(t.title),
    message: `${interpolate(actor ? t.bodyWithActor : t.bodyWithoutActor)}<br /><br />` +
      `<span style="color:#94a3b8;font-size:13px;">${t.footer}</span>`,
    type: "SUCCESS",
    link: "/dashboard",
    lang,
  });

  // The generic shell titles the mail with `title`; this one needs its own subject line.
  return { ...built, subject: interpolate(t.subject) };
}
