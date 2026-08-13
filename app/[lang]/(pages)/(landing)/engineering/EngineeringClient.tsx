"use client";
import CloudRoundedIcon from "@mui/icons-material/CloudRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import type { Dictionary } from "@/app/lib/language/language";
import FooterPageLayout from "@/app/components/landing/FooterPageLayout";

export default function EngineeringClient({ dict }: { dict: Dictionary }) {
  const d = dict.landing.engineeringPage;

  return (
    <FooterPageLayout
      badge={d.hero.badge}
      title={d.hero.title}
      subtitle={d.hero.subtitle}
      cards={[
        {
          icon: <CloudRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />,
          title: d.sections.architecture.title,
          description: d.sections.architecture.description,
        },
        {
          icon: <StorageRoundedIcon sx={{ fontSize: 40, color: "#a855f7" }} />,
          title: d.sections.data.title,
          description: d.sections.data.description,
        },
        {
          icon: <AutoGraphRoundedIcon sx={{ fontSize: 40, color: "#22d3ee" }} />,
          title: d.sections.ml.title,
          description: d.sections.ml.description,
        },
      ]}
      detail={{
        overline: d.detail.overline,
        title: d.detail.title,
        description: d.detail.description,
      }}
      ctaTitle={d.cta.title}
      ctaSubtitle={d.cta.subtitle}
      ctaIcon={<CloudRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />}

    />
  );
}
