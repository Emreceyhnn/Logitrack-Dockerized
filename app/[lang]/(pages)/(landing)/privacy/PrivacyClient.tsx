"use client";
import PrivacyTipRoundedIcon from "@mui/icons-material/PrivacyTipRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import type { Dictionary } from "@/app/lib/language/language";
import FooterPageLayout from "@/app/components/landing/FooterPageLayout";

export default function PrivacyClient({ dict }: { dict: Dictionary }) {
  const d = dict.landing.privacyPage;

  return (
    <FooterPageLayout
      badge={d.hero.badge}
      title={d.hero.title}
      subtitle={d.hero.subtitle}
      cards={[
        {
          icon: <PrivacyTipRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />,
          title: d.sections.collection.title,
          description: d.sections.collection.description,
        },
        {
          icon: <GavelRoundedIcon sx={{ fontSize: 40, color: "#a855f7" }} />,
          title: d.sections.rights.title,
          description: d.sections.rights.description,
        },
        {
          icon: <SecurityRoundedIcon sx={{ fontSize: 40, color: "#22d3ee" }} />,
          title: d.sections.security.title,
          description: d.sections.security.description,
        },
      ]}
      detail={{
        overline: d.detail.overline,
        title: d.detail.title,
        description: d.detail.description,
      }}
      ctaTitle={d.cta.title}
      ctaSubtitle={d.cta.subtitle}
      ctaIcon={<PrivacyTipRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />}

    />
  );
}
