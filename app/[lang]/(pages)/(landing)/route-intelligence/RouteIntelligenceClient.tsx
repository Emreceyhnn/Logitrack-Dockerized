"use client";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import NatureRoundedIcon from "@mui/icons-material/NatureRounded";
import type { Dictionary } from "@/app/lib/language/language";
import FooterPageLayout from "@/app/components/landing/FooterPageLayout";

export default function RouteIntelligenceClient({ dict }: { dict: Dictionary }) {
  const d = dict.landing.routeIntelligencePage;

  return (
    <FooterPageLayout
      badge={d.hero.badge}
      title={d.hero.title}
      subtitle={d.hero.subtitle}
      cards={[
        {
          icon: <PsychologyRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />,
          title: d.sections.predictive.title,
          description: d.sections.predictive.description,
        },
        {
          icon: <RouteRoundedIcon sx={{ fontSize: 40, color: "#a855f7" }} />,
          title: d.sections.dynamic.title,
          description: d.sections.dynamic.description,
        },
        {
          icon: <NatureRoundedIcon sx={{ fontSize: 40, color: "#22d3ee" }} />,
          title: d.sections.carbon.title,
          description: d.sections.carbon.description,
        },
      ]}
      detail={{
        overline: d.detail.overline,
        title: d.detail.title,
        description: d.detail.description,
      }}
      ctaTitle={d.cta.title}
      ctaSubtitle={d.cta.subtitle}
      ctaIcon={<RouteRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />}

    />
  );
}
