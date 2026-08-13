import { MetadataRoute } from "next";
import { getBaseUrl } from "@/app/lib/utils/baseUrl";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  // Marketing/landing content is meant to be crawled and cited by both
  // traditional search engines and AI answer engines/agents (ChatGPT,
  // Perplexity, Claude, Google AI Overview). Only login-gated app surfaces
  // are off-limits — same disallow list for every bot. All app routes live
  // under a /{lang}/ prefix (e.g. /en/dashboard, /tr/giris), so every gated
  // segment needs a `/*/` wildcard variant in addition to the bare path.
  const gatedSegments = [
    "dashboard",
    "auth",
    "giris",
    "demo",
    "onboarding",
    "pending-access",
    "playground",
    "driver-console",
    "warehouse-worker",
  ];
  const disallow = [
    "/api",
    "/_next",
    "/static",
    ...gatedSegments.flatMap((segment) => [
      `/${segment}`,
      `/*/${segment}`,
    ]),
  ];
  const aiCrawlers = [
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "ClaudeBot",
    "anthropic-ai",
    "Claude-User",
    "Claude-SearchBot",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "CCBot",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      ...aiCrawlers.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow,
      })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
