/**
 * Subscription Lifecycle Email Template
 * Sent for trial and entitlement transitions.
 * Supports TR (Turkish) and EN (English).
 */

import { buildNotificationEmail } from "./notificationEmail";

export type SubscriptionEmailKind =
  | "TRIAL_ENDING"
  | "TRIAL_ENDED"
  | "PLAN_ACTIVATED";

interface SubscriptionEmailData {
  kind: SubscriptionEmailKind;
  userName?: string | undefined;
  daysRemaining?: number | undefined;
  planName?: string | undefined;
  lang?: "tr" | "en" | undefined;
}

const strings = {
  en: {
    TRIAL_ENDING: {
      subject: "Your LogiTrack trial ends in {days} day(s)",
      title: "Your trial ends soon ⏳",
      body:
        "Your LogiTrack trial ends in <strong>{days} day(s)</strong>. " +
        "Upgrade before then to keep access to your fleet data, routes, and reports without interruption.",
      cta: "/dashboard/settings",
    },
    TRIAL_ENDED: {
      subject: "Your LogiTrack trial has ended",
      title: "Your trial has ended",
      body:
        "Your LogiTrack trial has ended and your workspace is now read-limited. " +
        "Your data is safe — upgrading restores full access immediately.",
      cta: "/dashboard/settings",
    },
    PLAN_ACTIVATED: {
      subject: "Your LogiTrack plan is active",
      title: "You're all set ✅",
      body:
        "Your <strong>{planName}</strong> plan is now active. " +
        "Full access to your fleet, routes, and reporting has been restored.",
      cta: "/dashboard",
    },
  },
  tr: {
    TRIAL_ENDING: {
      subject: "LogiTrack denemeniz {days} gün içinde bitiyor",
      title: "Deneme süreniz yakında bitiyor ⏳",
      body:
        "LogiTrack deneme süreniz <strong>{days} gün</strong> içinde sona eriyor. " +
        "Filo verilerinize, rotalarınıza ve raporlarınıza kesintisiz erişim için süre bitmeden yükseltin.",
      cta: "/dashboard/settings",
    },
    TRIAL_ENDED: {
      subject: "LogiTrack deneme süreniz sona erdi",
      title: "Deneme süreniz sona erdi",
      body:
        "LogiTrack deneme süreniz sona erdi ve çalışma alanınız kısıtlandı. " +
        "Verileriniz güvende — yükselttiğinizde tam erişim anında geri gelir.",
      cta: "/dashboard/settings",
    },
    PLAN_ACTIVATED: {
      subject: "LogiTrack planınız aktif",
      title: "Her şey hazır ✅",
      body:
        "<strong>{planName}</strong> planınız artık aktif. " +
        "Filonuza, rotalarınıza ve raporlarınıza tam erişim geri yüklendi.",
      cta: "/dashboard",
    },
  },
} as const;

/**
 * tr-Abonelik yaşam döngüsü (deneme bitişi, plan aktivasyonu) e-postasını üretir
 * en-Builds the subscription lifecycle email (trial expiry, plan activation)
 * input (data: SubscriptionEmailData)
 * output ({ subject: string; html: string; text: string })
 */
export function buildSubscriptionEmail(data: SubscriptionEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const lang: "en" | "tr" = data.lang === "tr" ? "tr" : "en";
  const variant = strings[lang][data.kind];

  const interpolate = (str: string): string =>
    str
      .replace(/{days}/g, String(data.daysRemaining ?? 0))
      .replace(/{planName}/g, data.planName ?? "Pro");

  const built = buildNotificationEmail({
    title: variant.title,
    message: interpolate(variant.body),
    type:
      data.kind === "PLAN_ACTIVATED"
        ? "SUCCESS"
        : data.kind === "TRIAL_ENDED"
          ? "WARNING"
          : "INFO",
    link: variant.cta,
    lang,
  });

  return {
    subject: interpolate(variant.subject),
    html: built.html,
    text: `${variant.title}\n\n${interpolate(variant.body).replace(/<[^>]+>/g, "")}`,
  };
}
