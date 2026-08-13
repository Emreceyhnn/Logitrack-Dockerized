"use client";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import type { Dictionary } from "@/app/lib/language/language";
import { getLocalizedPath } from "@/app/lib/language/navigation";
import FooterPageLayout from "@/app/components/landing/FooterPageLayout";
import SecurityTrustSection from "./SecurityTrustSection";

export default function SecurityCenterClient({
  dict,
  lang,
  lastReviewed,
}: {
  dict: Dictionary;
  lang: string;
  /** Stable "last manually reviewed" date, formatted on the server. */
  lastReviewed: string;
}) {
  const d = dict.landing.securityCenterPage;
  // Security doc requests / issue reports funnel to the contact form.
  const contactHref = `/${lang}${getLocalizedPath("/contact", lang)}`;

  return (
    <FooterPageLayout
      badge={d.hero.badge}
      title={d.hero.title}
      subtitle={d.hero.subtitle}
      cards={[
        {
          icon: <LockRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />,
          title: d.sections.encryption.title,
          description: d.sections.encryption.description,
        },
        {
          icon: <ShieldRoundedIcon sx={{ fontSize: 40, color: "#a855f7" }} />,
          title: d.sections.accessControl.title,
          description: d.sections.accessControl.description,
        },
        {
          icon: <VerifiedUserRoundedIcon sx={{ fontSize: 40, color: "#22d3ee" }} />,
          title: d.sections.compliance.title,
          description: d.sections.compliance.description,
        },
      ]}
      detail={{
        overline: d.detail.overline,
        title: d.detail.title,
        description: d.detail.description,
      }}
      ctaTitle={d.cta.title}
      ctaSubtitle={d.cta.subtitle}
      ctaIcon={<ShieldRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />}
    >
      <SecurityTrustSection
        dict={dict}
        contactHref={contactHref}
        lastReviewed={lastReviewed}
      />
    </FooterPageLayout>
  );
}
