"use client";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import HeadsetMicRoundedIcon from "@mui/icons-material/HeadsetMicRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import type { Dictionary } from "@/app/lib/language/language";
import FooterPageLayout from "@/app/components/landing/FooterPageLayout";

export default function HelpCenterClient({ dict }: { dict: Dictionary }) {
  const d = dict.landing.helpCenterPage;

  return (
    <FooterPageLayout
      badge={d.hero.badge}
      title={d.hero.title}
      subtitle={d.hero.subtitle}
      cards={[
        {
          icon: <MenuBookRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />,
          title: d.sections.knowledgeBase.title,
          description: d.sections.knowledgeBase.description,
        },
        {
          icon: <HeadsetMicRoundedIcon sx={{ fontSize: 40, color: "#a855f7" }} />,
          title: d.sections.support.title,
          description: d.sections.support.description,
        },
        {
          icon: <ForumRoundedIcon sx={{ fontSize: 40, color: "#22d3ee" }} />,
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
      ctaIcon={<HeadsetMicRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />}

    />
  );
}
