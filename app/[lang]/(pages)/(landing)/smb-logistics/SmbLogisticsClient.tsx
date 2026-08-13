"use client";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import type { Dictionary } from "@/app/lib/language/language";
import FooterPageLayout from "@/app/components/landing/FooterPageLayout";

export default function SmbLogisticsClient({ dict }: { dict: Dictionary }) {
  const d = dict.landing.smbLogisticsPage;

  return (
    <FooterPageLayout
      badge={d.hero.badge}
      title={d.hero.title}
      subtitle={d.hero.subtitle}
      cards={[
        {
          icon: <RocketLaunchRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />,
          title: d.sections.quickStart.title,
          description: d.sections.quickStart.description,
        },
        {
          icon: <SavingsRoundedIcon sx={{ fontSize: 40, color: "#a855f7" }} />,
          title: d.sections.costEffective.title,
          description: d.sections.costEffective.description,
        },
        {
          icon: <AutoFixHighRoundedIcon sx={{ fontSize: 40, color: "#22d3ee" }} />,
          title: d.sections.automation.title,
          description: d.sections.automation.description,
        },
      ]}
      detail={{
        overline: d.detail.overline,
        title: d.detail.title,
        description: d.detail.description,
      }}
      ctaTitle={d.cta.title}
      ctaSubtitle={d.cta.subtitle}
      ctaIcon={<RocketLaunchRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />}

    />
  );
}
