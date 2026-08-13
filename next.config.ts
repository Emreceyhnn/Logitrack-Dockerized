import type { NextConfig } from "next";
import createBundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Required by `npm start`, which runs `.next/standalone/server.js`.
  output: "standalone",

  // ── Security & Transport ────────────────────────────────────────────────
  poweredByHeader: false, // Remove X-Powered-By header (security)
  compress: true, // Enable gzip/brotli compression for all responses

  // ── React ───────────────────────────────────────────────────────────────
  reactStrictMode: true, // Catches hydration bugs in development early

  // ── Bundle Optimisations ────────────────────────────────────────────────
  // Next.js will only import the specific modules used from these packages
  // instead of bundling the entire barrel export. Saves 200-400KB on MUI alone.
  experimental: {
    optimizePackageImports: [
      "@mui/material",
      "@mui/icons-material",
      "@mui/x-charts",
      "@mui/x-date-pickers",
      "dayjs",
      "framer-motion",
    ],
    serverActions: {
      // Must stay in sync with MAX_FILE_SIZE_BYTES in app/lib/actions/upload.ts:
      // file uploads travel through server actions as base64 payloads. If
      // uploads ever move to a dedicated route handler, drop this back to the
      // 1mb default — it currently applies to EVERY server action.
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/:lang/login",
        destination: "/:lang/auth/sign-in",
        permanent: true,
      },
      {
        source: "/login",
        destination: "/en/auth/sign-in",
        permanent: true,
      },
    ];
  },

  // ── Security headers ──────────────────────────────────────────────────────
  // Applied to every response. Content-Security-Policy is NOT set here: it
  // needs a per-request nonce (for a strict script-src on dashboard routes)
  // and a path-dependent value, neither of which this static headers() config
  // can produce, so proxy.ts sets it per-request instead. style-src stays
  // unconstrained everywhere to avoid breaking MUI/emotion inline styles.
  async headers() {
    const securityHeaders = [
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self), payment=()",
      },
    ];

    return [{ source: "/:path*", headers: securityHeaders }];
  },

};

export default withBundleAnalyzer(nextConfig);
