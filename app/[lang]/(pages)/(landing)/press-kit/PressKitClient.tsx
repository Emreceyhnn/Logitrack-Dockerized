"use client";
import BrushRoundedIcon from "@mui/icons-material/BrushRounded";
import NewspaperRoundedIcon from "@mui/icons-material/NewspaperRounded";
import ContactMailRoundedIcon from "@mui/icons-material/ContactMailRounded";
import type { Dictionary } from "@/app/lib/language/language";
import FooterPageLayout from "@/app/components/landing/FooterPageLayout";

export default function PressKitClient({ dict }: { dict: Dictionary }) {
  const d = dict.landing.pressKitPage;

  return (
    <FooterPageLayout
      badge={d.hero.badge}
      title={d.hero.title}
      subtitle={d.hero.subtitle}
      cards={[
        {
          icon: <BrushRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />,
          title: d.sections.brand.title,
          description: d.sections.brand.description,
        },
        {
          icon: <NewspaperRoundedIcon sx={{ fontSize: 40, color: "#a855f7" }} />,
          title: d.sections.releases.title,
          description: d.sections.releases.description,
        },
        {
          icon: <ContactMailRoundedIcon sx={{ fontSize: 40, color: "#22d3ee" }} />,
          title: d.sections.media.title,
          description: d.sections.media.description,
        },
      ]}
      detail={{
        overline: d.detail.overline,
        title: d.detail.title,
        description: d.detail.description,
      }}
      ctaTitle={d.cta.title}
      ctaSubtitle={d.cta.subtitle}
      ctaIcon={<NewspaperRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />}

    />
  );
}
