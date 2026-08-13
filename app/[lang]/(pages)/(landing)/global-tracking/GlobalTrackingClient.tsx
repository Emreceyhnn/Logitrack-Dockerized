"use client";

import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import GpsFixedRoundedIcon from "@mui/icons-material/GpsFixedRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Box, Button } from "@mui/material";
import Link from "next/link";
import type { Dictionary } from "@/app/lib/language/language";
import { getLocalizedPath } from "@/app/lib/language/navigation";
import FooterPageLayout from "@/app/components/landing/FooterPageLayout";

export default function GlobalTrackingClient({
  dict,
  lang,
}: {
  dict: Dictionary;
  lang: string;
}) {
  const d = dict.landing.globalTrackingPage;
  const trackHref = `/${lang}${getLocalizedPath("/track", lang)}`;

  return (
    <FooterPageLayout
      badge={d.hero.badge}
      title={d.hero.title}
      subtitle={d.hero.subtitle}
      stats={[
        { value: d.stats.countries, label: d.stats.countriesLabel },
        { value: d.stats.updates, label: d.stats.updatesLabel },
        { value: d.stats.uptime, label: d.stats.uptimeLabel },
        { value: d.stats.events, label: d.stats.eventsLabel },
      ]}
      cards={[
        {
          icon: <PublicRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />,
          title: d.sections.liveMap.title,
          description: d.sections.liveMap.description,
        },
        {
          icon: <GpsFixedRoundedIcon sx={{ fontSize: 40, color: "#a855f7" }} />,
          title: d.sections.multiModal.title,
          description: d.sections.multiModal.description,
        },
        {
          icon: <NotificationsActiveRoundedIcon sx={{ fontSize: 40, color: "#22d3ee" }} />,
          title: d.sections.alerts.title,
          description: d.sections.alerts.description,
        },
      ]}
      ctaTitle={d.cta.title}
      ctaSubtitle={d.cta.subtitle}
      ctaIcon={<PublicRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />}
    >
      {/* Concrete entry point into the actual public tracking flow — the box
          the recipient is looking for, not just more feature copy. */}
      <Box sx={{ textAlign: "center" }}>
        <Button
          component={Link}
          href={trackHref}
          variant="contained"
          size="large"
          startIcon={<SearchRoundedIcon />}
          sx={{
            px: 5,
            py: 1.5,
            fontWeight: 800,
            textTransform: "none",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #22d3ee, #2563eb)",
            "&:hover": {
              background: "linear-gradient(135deg, #0ea5e9, #1d4ed8)",
            },
          }}
        >
          {d.trackCta}
        </Button>
      </Box>
    </FooterPageLayout>
  );
}
