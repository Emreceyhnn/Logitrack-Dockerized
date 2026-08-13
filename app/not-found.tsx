"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Root-level 404. Renders OUTSIDE the [lang] layout, so there is no
 * DictionaryProvider or MUI theme here — strings and colors are inlined.
 * Locale is detected from the URL prefix (falls back to Turkish, the
 * default locale) so /tr/* visitors don't get an English error page.
 */
const STRINGS = {
  tr: {
    title: "Sayfa Bulunamadı",
    description: "Aradığınız sayfa mevcut değil ya da taşınmış olabilir.",
    cta: "Ana Sayfaya Dön",
  },
  en: {
    title: "Page Not Found",
    description: "The page you are looking for doesn't exist or has been moved.",
    cta: "Return Home",
  },
} as const;

export default function NotFound() {
  // Lazy initializer: on the server this prerenders as "tr" (the default
  // locale); the client picks the real locale from the URL on hydration.
  const [lang] = useState<"tr" | "en">(() =>
    typeof window !== "undefined" && window.location.pathname.startsWith("/en")
      ? "en"
      : "tr"
  );

  const t = STRINGS[lang];

  return (
    <div
      suppressHydrationWarning
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 24,
        background: "#0f121a",
        color: "#f5f7fa",
        fontFamily:
          "var(--font-poppins), system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}
    >
      <div
        aria-hidden="true"
        style={{ fontSize: 64, lineHeight: 1, marginBottom: 16 }}
      >
        ⚠️
      </div>
      <h1 style={{ fontSize: "4rem", fontWeight: 800, margin: "0 0 8px" }}>
        404
      </h1>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 12px" }}>
        {t.title}
      </h2>
      <p style={{ color: "#9aa4b2", maxWidth: 420, margin: "0 0 32px" }}>
        {t.description}
      </p>
      <Link
        href={`/${lang}`}
        style={{
          background: "#1976d2",
          color: "#fff",
          padding: "12px 32px",
          borderRadius: 8,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        {t.cta}
      </Link>
    </div>
  );
}
