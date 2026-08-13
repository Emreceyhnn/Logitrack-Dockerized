"use client";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import WebhookRoundedIcon from "@mui/icons-material/WebhookRounded";
import type { Dictionary } from "@/app/lib/language/language";
import FooterPageLayout from "@/app/components/landing/FooterPageLayout";

export default function DeveloperDocsClient({ dict }: { dict: Dictionary }) {
  const d = dict.landing.developerDocsPage;

  return (
    <FooterPageLayout
      badge={d.hero.badge}
      title={d.hero.title}
      subtitle={d.hero.subtitle}
      cards={[
        {
          icon: <TerminalRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />,
          title: d.sections.restApi.title,
          description: d.sections.restApi.description,
        },
        {
          icon: <CodeRoundedIcon sx={{ fontSize: 40, color: "#a855f7" }} />,
          title: d.sections.sdks.title,
          description: d.sections.sdks.description,
        },
        {
          icon: <WebhookRoundedIcon sx={{ fontSize: 40, color: "#22d3ee" }} />,
          title: d.sections.webhooks.title,
          description: d.sections.webhooks.description,
        },
      ]}
      detail={{
        overline: d.detail.overline,
        title: d.detail.title,
        description: d.detail.description,
      }}
      ctaTitle={d.cta.title}
      ctaSubtitle={d.cta.subtitle}
      ctaIcon={<TerminalRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />}

    />
  );
}
