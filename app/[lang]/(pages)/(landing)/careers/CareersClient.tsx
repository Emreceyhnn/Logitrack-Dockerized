"use client";
import WorkRoundedIcon from "@mui/icons-material/WorkRounded";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import type { Dictionary } from "@/app/lib/language/language";
import FooterPageLayout from "@/app/components/landing/FooterPageLayout";

export default function CareersClient({ dict }: { dict: Dictionary }) {
  const d = dict.landing.careersPage;

  return (
    <FooterPageLayout
      badge={d.hero.badge}
      title={d.hero.title}
      subtitle={d.hero.subtitle}
      cards={[
        {
          icon: <WorkRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />,
          title: d.sections.culture.title,
          description: d.sections.culture.description,
        },
        {
          icon: <CardGiftcardRoundedIcon sx={{ fontSize: 40, color: "#a855f7" }} />,
          title: d.sections.benefits.title,
          description: d.sections.benefits.description,
        },
        {
          icon: <TrendingUpRoundedIcon sx={{ fontSize: 40, color: "#22d3ee" }} />,
          title: d.sections.growth.title,
          description: d.sections.growth.description,
        },
      ]}
      detail={{
        overline: d.detail.overline,
        title: d.detail.title,
        description: d.detail.description,
      }}
      ctaTitle={d.cta.title}
      ctaSubtitle={d.cta.subtitle}
      ctaIcon={<WorkRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />}

    />
  );
}
