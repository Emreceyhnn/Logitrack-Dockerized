"use client";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import type { Dictionary } from "@/app/lib/language/language";
import FooterPageLayout from "@/app/components/landing/FooterPageLayout";

export default function TelemetryHubClient({ dict }: { dict: Dictionary }) {
  const d = dict.landing.telemetryHubPage;

  return (
    <FooterPageLayout
      badge={d.hero.badge}
      title={d.hero.title}
      subtitle={d.hero.subtitle}
      cards={[
        {
          icon: <MonitorHeartRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />,
          title: d.sections.vehicleHealth.title,
          description: d.sections.vehicleHealth.description,
        },
        {
          icon: <SensorsRoundedIcon sx={{ fontSize: 40, color: "#a855f7" }} />,
          title: d.sections.coldChain.title,
          description: d.sections.coldChain.description,
        },
        {
          icon: <SpeedRoundedIcon sx={{ fontSize: 40, color: "#22d3ee" }} />,
          title: d.sections.driverSafety.title,
          description: d.sections.driverSafety.description,
        },
      ]}
      detail={{
        overline: d.detail.overline,
        title: d.detail.title,
        description: d.detail.description,
      }}
      ctaTitle={d.cta.title}
      ctaSubtitle={d.cta.subtitle}
      ctaIcon={<SensorsRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />}

    />
  );
}
