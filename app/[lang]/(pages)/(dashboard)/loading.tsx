/**
 * Dashboard Loading Skeleton — Server Component
 *
 * This file intentionally has NO "use client" directive.
 * Keeping it as a Server Component allows Next.js to stream it
 * instantly as static HTML while the async Server Component page
 * is still executing its data fetches — giving users instant visual
 * feedback without waiting for client JS hydration.
 *
 * Do NOT add useTheme() or any React hooks here.
 * Use CSS custom properties or static color values instead.
 */

/* -------------------------------------------------------------------------- */
/*  Reusable skeleton primitives (no hooks, pure JSX)                          */
/* -------------------------------------------------------------------------- */

function CardSkeleton({ height = 110 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: 16,
        background: "rgba(255,255,255,0.06)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

function TextSkeleton({ width, height = 18 }: { width: number; height?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 6,
        background: "rgba(255,255,255,0.06)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Dashboard Loading                                                           */
/*                                                                              */
/*  Next.js shows this file while the Server Component page is still streaming.*/
/*  It renders inside the existing Layout (sidebar + header already visible),  */
/*  so only the main content area is skeleton-replaced.                        */
/* -------------------------------------------------------------------------- */

export default function DashboardLoading() {
  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <div
        style={{
          padding: "24px 32px",
          width: "100%",
          minHeight: "calc(100vh - 64px)",
          animation: "fadeIn 0.15s ease-in",
          boxSizing: "border-box",
        }}
      >
        {/* ── Page header ──────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <TextSkeleton width={220} height={34} />
            <TextSkeleton width={340} height={20} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                width: 110,
                height: 36,
                borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* ── KPI metric cards ─────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} height={110} />
          ))}
        </div>

        {/* ── Main content area (chart + side panel) ───────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <CardSkeleton height={320} />
          <CardSkeleton height={320} />
        </div>

        {/* ── Secondary table area ─────────────────────────────────────── */}
        <div
          style={{
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.07)",
            overflow: "hidden",
          }}
        >
          {/* Table header */}
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(255,255,255,0.03)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              gap: 32,
            }}
          >
            {[160, 100, 80, 90, 70].map((w, i) => (
              <TextSkeleton key={i} width={w} height={18} />
            ))}
          </div>
          {/* Table rows */}
          {[0, 1, 2, 3, 4, 5].map((rowIdx) => (
            <div
              key={rowIdx}
              style={{
                padding: "14px 16px",
                display: "flex",
                gap: 32,
                alignItems: "center",
                borderBottom:
                  rowIdx < 5 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
            >
              {[160, 100, 80, 90, 70].map((w, colIdx) => (
                <TextSkeleton key={colIdx} width={Math.round(w * 0.75)} height={16} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
