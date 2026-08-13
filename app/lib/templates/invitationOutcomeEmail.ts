/**
 * Invitation Outcome Email Template
 * Sent to the inviter when the person they invited accepts or declines.
 * Supports TR (Turkish) and EN (English).
 *
 * Composes the generic notification shell — see companyWelcomeEmail for the
 * same rationale: identical chrome, different copy.
 */

import { buildNotificationEmail } from "./notificationEmail";

export type InvitationOutcome = "ACCEPTED" | "DECLINED";

interface InvitationOutcomeEmailData {
  inviteeEmail: string;
  inviteeName?: string | undefined;
  companyName: string;
  outcome: InvitationOutcome;
  lang?: "tr" | "en" | undefined;
}

const strings = {
  en: {
    ACCEPTED: {
      subject: "{invitee} accepted your invitation to {companyName}",
      title: "Invitation accepted ✅",
      body:
        "<strong>{invitee}</strong> accepted your invitation and has joined <strong>{companyName}</strong>. " +
        "They now appear in your team list and can be assigned work.",
    },
    DECLINED: {
      subject: "{invitee} declined your invitation to {companyName}",
      title: "Invitation declined",
      body:
        "<strong>{invitee}</strong> declined your invitation to join <strong>{companyName}</strong>. " +
        "No account was linked. You can send a new invitation if this was unexpected.",
    },
  },
  tr: {
    ACCEPTED: {
      subject: "{invitee} davetinizi kabul etti — {companyName}",
      title: "Davet kabul edildi ✅",
      body:
        "<strong>{invitee}</strong> davetinizi kabul etti ve <strong>{companyName}</strong> şirketine katıldı. " +
        "Artık ekip listenizde görünüyor ve kendisine görev atayabilirsiniz.",
    },
    DECLINED: {
      subject: "{invitee} davetinizi reddetti — {companyName}",
      title: "Davet reddedildi",
      body:
        "<strong>{invitee}</strong>, <strong>{companyName}</strong> şirketine katılma davetinizi reddetti. " +
        "Herhangi bir hesap bağlanmadı. Beklenmedik bir durumsa yeni bir davet gönderebilirsiniz.",
    },
  },
} as const;

/**
 * tr-Davetin kabul/red sonucunu davet edene bildiren e-postayı üretir
 * en-Builds the email telling the inviter whether their invitation was accepted or declined
 * input (data: InvitationOutcomeEmailData)
 * output ({ subject: string; html: string; text: string })
 */
export function buildInvitationOutcomeEmail(data: InvitationOutcomeEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const lang: "en" | "tr" = data.lang === "tr" ? "tr" : "en";
  const t = strings[lang][data.outcome];

  // Fall back to the email when no display name is known — the inviter typed
  // that address, so it is the identifier they will recognise.
  const invitee = data.inviteeName?.trim() || data.inviteeEmail;
  const interpolate = (str: string): string =>
    str
      .replace(/{invitee}/g, invitee)
      .replace(/{companyName}/g, data.companyName);

  const built = buildNotificationEmail({
    title: t.title,
    message: interpolate(t.body),
    type: data.outcome === "ACCEPTED" ? "SUCCESS" : "INFO",
    link: "/users",
    lang,
  });

  return { ...built, subject: interpolate(t.subject) };
}
