import { Box } from "@mui/material";
import LandingNavbar from "@/app/components/landing/LandingNavbar";
import LandingFooter from "@/app/components/landing/LandingFooter";
import LandingThemeProvider from "@/app/lib/theme/LandingThemeProvider";
import JsonLd from "@/app/components/seo/JsonLd";
import { getDictionary } from "@/app/lib/language/language";

export default async function LandingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    ? process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "")
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://logitrack.emreceyhan.xyz";

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "LogiTrack",
    url: baseUrl,
    logo: `${baseUrl}/logo.svg`,
    sameAs: [
      "https://www.linkedin.com/in/emreceyhn/",
    ],
    description: dict.landing.metaDescription,
  };

  // SoftwareApplication schema — lets answer engines (Google AI Overview,
  // ChatGPT/Perplexity search, etc.) answer "what is LogiTrack" directly from
  // structured data instead of guessing from prose. No `offers`/price block:
  // the pricing page has named tiers (Starter/Pro/Enterprise) but no public
  // dollar amounts, and fabricating a price here would violate Google's
  // structured-data guidelines and misinform AI answer engines.
  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "LogiTrack",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: baseUrl,
    description: dict.landing.metaDescription,
  };

  return (
    <LandingThemeProvider>
      <JsonLd data={[organizationSchema, softwareApplicationSchema]} />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          bgcolor: "background.default",
          color: "text.primary",
        }}
      >
        <LandingNavbar />
        <Box component="main" sx={{ flexGrow: 1 }}>
          {children}
        </Box>
        <LandingFooter />
      </Box>
    </LandingThemeProvider>
  );
}
