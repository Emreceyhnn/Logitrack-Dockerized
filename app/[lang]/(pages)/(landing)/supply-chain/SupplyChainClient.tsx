"use client";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import InventoryRoundedIcon from "@mui/icons-material/InventoryRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import type { Dictionary } from "@/app/lib/language/language";
import FooterPageLayout from "@/app/components/landing/FooterPageLayout";

export default function SupplyChainClient({ dict }: { dict: Dictionary }) {
  const d = dict.landing.supplyChainPage;

  return (
    <FooterPageLayout
      badge={d.hero.badge}
      title={d.hero.title}
      subtitle={d.hero.subtitle}
      cards={[
        {
          icon: <LocalShippingRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />,
          title: d.sections.visibility.title,
          description: d.sections.visibility.description,
        },
        {
          icon: <InventoryRoundedIcon sx={{ fontSize: 40, color: "#a855f7" }} />,
          title: d.sections.vendor.title,
          description: d.sections.vendor.description,
        },
        {
          icon: <HubRoundedIcon sx={{ fontSize: 40, color: "#22d3ee" }} />,
          title: d.sections.multiModal.title,
          description: d.sections.multiModal.description,
        },
      ]}
      detail={{
        overline: d.detail.overline,
        title: d.detail.title,
        description: d.detail.description,
      }}
      ctaTitle={d.cta.title}
      ctaSubtitle={d.cta.subtitle}
      ctaIcon={<LocalShippingRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />}

    />
  );
}
