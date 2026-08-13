"use client";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import EnergySavingsLeafRoundedIcon from "@mui/icons-material/EnergySavingsLeafRounded";
import Groups3RoundedIcon from "@mui/icons-material/Groups3Rounded";
import type { Dictionary } from "@/app/lib/language/language";
import FooterPageLayout from "@/app/components/landing/FooterPageLayout";

export default function OurMissionClient({ dict }: { dict: Dictionary }) {
  const d = dict.landing.ourMissionPage;

  return (
    <FooterPageLayout
      badge={d.hero.badge}
      title={d.hero.title}
      subtitle={d.hero.subtitle}
      cards={[
        {
          icon: <FlagRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />,
          title: d.sections.innovation.title,
          description: d.sections.innovation.description,
        },
        {
          icon: <EnergySavingsLeafRoundedIcon sx={{ fontSize: 40, color: "#a855f7" }} />,
          title: d.sections.sustainability.title,
          description: d.sections.sustainability.description,
        },
        {
          icon: <Groups3RoundedIcon sx={{ fontSize: 40, color: "#22d3ee" }} />,
          title: d.sections.community.title,
          description: d.sections.community.description,
        },
      ]}
      detail={{
        overline: d.detail.overline,
        title: d.detail.title,
        description: d.detail.description,
      }}
      ctaTitle={d.cta.title}
      ctaSubtitle={d.cta.subtitle}
      ctaIcon={<FlagRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />}

    />
  );
}
