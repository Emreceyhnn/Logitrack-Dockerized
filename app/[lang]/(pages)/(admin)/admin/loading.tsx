/**
 * Admin Console Loading Skeleton — Server Component
 *
 * Intentionally NO "use client" directive, matching the dashboard's loading
 * file: as a Server Component this streams instantly as static HTML while the
 * async page is still executing, so the console shows structure immediately
 * rather than waiting on client JS.
 *
 * Do NOT add useTheme() or any React hooks here — use static values.
 * Colours are theme-neutral translucent whites/greys that read acceptably on
 * both the light and dark console surfaces.
 */

function Block({
  height,
  width = "100%",
  radius = 12,
}: {
  height: number;
  width?: number | string;
  radius?: number;
}) {
  return (
    <div
      style={{
        height,
        width,
        borderRadius: radius,
        background: "rgba(128,128,128,0.12)",
        animation: "adminPulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

export default function AdminLoading() {
  return (
    <>
      <style>{`
        @keyframes adminPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes adminFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          animation: "adminFadeIn 0.15s ease-in",
          boxSizing: "border-box",
        }}
      >
        {/* Page header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Block height={28} width={200} radius={6} />
            <Block height={16} width={320} radius={6} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Block height={32} width={160} radius={8} />
            <Block height={32} width={92} radius={8} />
          </div>
        </div>

        {/* KPI band */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Block key={i} height={150} radius={24} />
          ))}
        </div>

        {/* Content area */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <Block height={300} radius={20} />
          <Block height={300} radius={20} />
        </div>

        <Block height={240} radius={20} />
      </div>
    </>
  );
}
