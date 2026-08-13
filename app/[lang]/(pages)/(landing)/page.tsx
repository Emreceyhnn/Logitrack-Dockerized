import type { Metadata } from "next";
import { Box } from "@mui/material";
import HeroSection from "@/app/components/landing/HeroSection";
import DeferredSections from "@/app/components/landing/DeferredSections";
import { getDictionary } from "@/app/lib/language/language";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: { absolute: dict.landing.metaTitle },
    description: dict.landing.metaDescription,
    alternates: {
      canonical: `/${lang}`,
      languages: {
        en: "/en",
        tr: "/tr",
        "x-default": "/en",
      },
    },
  };
}

// Server Component: the hero streams as server-rendered HTML for fast LCP and
// SEO; the below-the-fold sections hydrate client-side via DeferredSections.
export default function LandingPage() {
  return (
    <Box>
      <HeroSection />
      <DeferredSections />
    </Box>
  );
}
