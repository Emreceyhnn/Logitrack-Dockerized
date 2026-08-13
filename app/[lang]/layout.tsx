import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "@/app/style/globals.css";
import Providers from "@/app/lib/theme/themeProviders";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getDictionary } from "@/app/lib/language/language";
import { DictionaryProvider } from "@/app/lib/language/DictionaryContext";

// Self-hosted, preloaded, and exposed as the `--font-poppins` CSS variable
// consumed by globals.css. `display: "swap"` keeps text visible during load;
// the weight subset covers the actual usage (regular → black) instead of the
// full 100–900 range the old Google Fonts @import pulled.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-poppins",
});

export async function generateStaticParams() {
  return [{ lang: "tr" }, { lang: "en" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    ? process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "")
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://logitrack.emreceyhan.xyz";

  return {
    title: {
      default:
        dict.landing.metaTitle || "LogiTrack – AI Lojistik Yönetim Platformu",
      template: `%s | LogiTrack`,
    },
    description:
      dict.landing.metaDescription ||
      "Teslimatlarınızı, filonuzu ve operasyonlarınızı tek akıllı panelden yönetin.",
    // NOTE: no `alternates.canonical` here — a layout-level canonical is
    // inherited by every child page, which would canonicalize subpages
    // (e.g. /tr/fiyatlandirma) to the homepage. The landing home page sets
    // its own canonical in its generateMetadata.
    metadataBase: new URL(baseUrl),
    openGraph: {
      type: "website",
      locale: lang === "tr" ? "tr_TR" : "en_US",
      url: `${baseUrl}/${lang}`,
      siteName: "LogiTrack",
      title: dict.landing.metaTitle,
      description: dict.landing.metaDescription,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "LogiTrack AI Logistics",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: dict.landing.metaTitle,
      description: dict.landing.metaDescription,
      images: ["/og-image.png"],
    },
    icons: {
      icon: "/logo.svg",
      apple: "/apple-touch-icon.png",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification: {
      google: "google-site-verification-id", // Add the code obtained from Search Console here
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  // IMPORTANT: no cookies()/headers() reads here. Any dynamic API in this
  // layout forces every route under /[lang] — including the static marketing
  // pages — into per-request SSR. User/session data is fetched in the
  // (dashboard) layout instead; the theme hydrates client-side from
  // localStorage / the non-httpOnly theme cookie.
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <html lang={lang}>
      <body className={poppins.variable}>
        <Providers>
          <DictionaryProvider dict={dict} lang={lang}>{children}</DictionaryProvider>
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
