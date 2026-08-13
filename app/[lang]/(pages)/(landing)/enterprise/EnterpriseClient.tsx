"use client";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import IntegrationInstructionsRoundedIcon from "@mui/icons-material/IntegrationInstructionsRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import type { Dictionary } from "@/app/lib/language/language";
import FooterPageLayout from "@/app/components/landing/FooterPageLayout";

export default function EnterpriseClient({ dict }: { dict: Dictionary }) {
  const d = dict.landing.enterprisePage;

  return (
    <FooterPageLayout
      badge={d.hero.badge}
      title={d.hero.title}
      subtitle={d.hero.subtitle}
      cards={[
        {
          icon: <BusinessRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />,
          title: d.sections.dedicated.title,
          description: d.sections.dedicated.description,
        },
        {
          icon: <IntegrationInstructionsRoundedIcon sx={{ fontSize: 40, color: "#a855f7" }} />,
          title: d.sections.integration.title,
          description: d.sections.integration.description,
        },
        {
          icon: <SupportAgentRoundedIcon sx={{ fontSize: 40, color: "#22d3ee" }} />,
          title: d.sections.support.title,
          description: d.sections.support.description,
        },
      ]}
      detail={{
        overline: d.detail.overline,
        title: d.detail.title,
        description: d.detail.description,
      }}
      ctaTitle={d.cta.title}
      ctaSubtitle={d.cta.subtitle}
      ctaIcon={<BusinessRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />}

    />
  );
}
