import { Box, Stack, Typography, Card, Avatar, Button, useTheme } from "@mui/material";
import { Ico } from "@/app/components/warehouse-worker/Ico";
import { formatDuration } from "@/app/lib/utils/driverConsoleUi";
import type { DriverConsoleState } from "@/app/hooks/useDriverConsoleState";
import type { ClientRouteStop } from "@/app/lib/type/driverConsoleClient";

/** Normalize a set of lat/lng stops into a 0–100 SVG viewport for a lightweight,
 * dependency-free corridor visualization (mirrors the approved mockup). */
function projectStops(stops: ClientRouteStop[]) {
  const withCoords = stops.filter((s) => s.lat != null && s.lng != null);
  if (withCoords.length === 0) return new Map<string, { x: number; y: number }>();
  const lats = withCoords.map((s) => s.lat as number);
  const lngs = withCoords.map((s) => s.lng as number);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1;
  const spanLng = maxLng - minLng || 1;
  const map = new Map<string, { x: number; y: number }>();
  for (const s of withCoords) {
    const x = 8 + (((s.lng as number) - minLng) / spanLng) * 84;
    const y = 8 + (1 - ((s.lat as number) - minLat) / spanLat) * 84;
    map.set(s.id, { x, y });
  }
  return map;
}

export default function DCRouteView({ state }: { state: DriverConsoleState }) {
  const theme = useTheme();
  const { dc, activeRoute, markStopArrived } = state;

  if (!activeRoute) {
    return (
      <Card sx={{ bgcolor: theme.palette.background.paper, borderRadius: 3, p: 6, textAlign: "center" }}>
        <Typography sx={{ color: theme.palette.text.secondary, fontWeight: 700 }}>
          {dc.dashboard.noRouteToday}
        </Typography>
      </Card>
    );
  }

  const positions = projectStops(activeRoute.stops);
  const activeIdx = activeRoute.stops.findIndex((s) => !s.isDone);
  const donePts = activeRoute.stops
    .slice(0, activeIdx === -1 ? activeRoute.stops.length : activeIdx + 1)
    .map((s) => positions.get(s.id))
    .filter(Boolean)
    .map((p) => `${p!.x},${p!.y}`)
    .join(" L ");
  const todoPts = activeRoute.stops
    .slice(activeIdx === -1 ? activeRoute.stops.length - 1 : activeIdx)
    .map((s) => positions.get(s.id))
    .filter(Boolean)
    .map((p) => `${p!.x},${p!.y}`)
    .join(" L ");

  const shapeFailed = !activeRoute.shape;
  const deviation = activeRoute.deviation;
  const showDeviationBanner = deviation && (deviation.status === "anomaly" || deviation.status === "muted");

  return (
    // On mobile the whole view scrolls in the page container, so the inner
    // stop-list scroller is dropped in favour of one natural scroll.
    <Stack spacing={2} sx={{ height: { xs: "auto", md: "100%" } }}>
      {shapeFailed && (
        <Box
          sx={{
            bgcolor: "rgba(244,67,54,0.1)",
            border: "1px solid rgba(244,67,54,0.3)",
            borderRadius: 3,
            px: 2,
            py: 1.5,
            fontSize: 13,
            fontWeight: 600,
            color: "#F44336",
          }}
        >
          {dc.route.shapeUnavailable}
        </Box>
      )}
      {showDeviationBanner && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{
            bgcolor: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.35)",
            borderRadius: 3,
            px: 2,
            py: 1.5,
            fontSize: 13,
            fontWeight: 700,
            color: "#f59e0b",
          }}
        >
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#f59e0b", flexShrink: 0 }} />
          <Box>{dc.route.deviationWarning.replace("{buffer}", String(activeRoute.bufferMeters ?? "—"))}</Box>
        </Stack>
      )}

      <Card
        sx={{
          // Shorter on a phone: the fixed header and bottom nav already claim
          // vertical space, and the stop list below is the primary control.
          height: { xs: "38vh", sm: "55vh" },
          minHeight: { xs: 240, sm: 320 },
          bgcolor: theme.palette.background.paper,
          borderRadius: 3,
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.035) 1px,transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        {/* Two pills side by side do not fit a phone's width — they wrap into a
            column, so neither overlaps the route corridor beneath. */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          gap={1}
          sx={{
            position: "absolute",
            top: { xs: 10, sm: 16 },
            left: { xs: 10, sm: 16 },
            right: { xs: 10, sm: 16 },
            zIndex: 3,
          }}
        >
          <Box
            sx={{
              maxWidth: "100%",
              fontSize: { xs: 11, sm: 12 },
              fontWeight: 800,
              color: "rgba(255,255,255,0.55)",
              bgcolor: "rgba(11,15,25,0.7)",
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
            }}
          >
            {new Date(activeRoute.date).toLocaleDateString("tr-TR")} · {activeRoute.distanceKm?.toFixed(1) ?? "—"} km ·{" "}
            {formatDuration(activeRoute.durationMin)}
          </Box>
          <Box
            sx={{
              // A disabled "coming soon" teaser is the first thing to drop when
              // the overlay competes with the map itself.
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              gap: 0.75,
              fontSize: 12,
              fontWeight: 800,
              color: "#a855f7",
              bgcolor: "rgba(168,85,247,0.14)",
              border: "1px solid rgba(168,85,247,0.3)",
              px: 1.75,
              py: 1,
              borderRadius: 2,
              opacity: 0.6,
              cursor: "not-allowed",
            }}
          >
            <Ico d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" size={14} />
            {dc.route.optimizeRoute} · {dc.route.comingSoon}
          </Box>
        </Stack>

        <Box component="svg" viewBox="0 0 100 100" preserveAspectRatio="none" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {donePts && (
            <path d={`M ${donePts}`} fill="none" stroke="#38bdf8" strokeWidth={0.8} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          )}
          {todoPts && (
            <path
              d={`M ${todoPts}`}
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth={0.7}
              strokeDasharray="2,2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </Box>

        {activeRoute.stops.map((s) => {
          const pos = positions.get(s.id);
          if (!pos) return null;
          const isNext = !s.isDone && s.id === activeRoute.nextStop?.id;
          return (
            <Box
              key={s.id}
              sx={{
                position: "absolute",
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%,-50%)",
                zIndex: 2,
              }}
            >
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 900,
                  color: s.isDone ? "#0B0F19" : "#fff",
                  bgcolor: s.isDone ? "#34D399" : isNext ? "#38bdf8" : "#1e293b",
                  border: `2px solid ${isNext ? "#38bdf8" : "#0B0F19"}`,
                }}
              >
                {s.sequence}
              </Box>
            </Box>
          );
        })}
      </Card>

      <Stack
        sx={{
          flex: 1,
          overflowY: { xs: "visible", md: "auto" },
          gap: 1.25,
          pb: 1,
        }}
      >
        {activeRoute.stops.map((s) => (
          <Card
            key={s.id}
            sx={{
              bgcolor: theme.palette.background.paper,
              borderRadius: 3,
              p: 2,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: { xs: 1.25, sm: 2 },
              border: `1px solid ${!s.isDone && s.id === activeRoute.nextStop?.id ? "rgba(56,189,248,0.4)" : "transparent"}`,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={{ xs: 1.25, sm: 1.75 }}
              sx={{ minWidth: 0 }}
            >
              <Avatar
                sx={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  fontSize: 12,
                  fontWeight: 900,
                  color: s.isDone ? "#0B0F19" : "rgba(255,255,255,0.5)",
                  bgcolor: s.isDone ? "#34D399" : "rgba(255,255,255,0.08)",
                }}
              >
                {s.isDone ? <Ico d="M20 6 9 17l-5-5" size={16} sw={3} /> : null}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 700,
                    // Two lines on a phone rather than a hard truncation that
                    // could hide the street number.
                    display: "-webkit-box",
                    WebkitLineClamp: { xs: 2, sm: 1 },
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    wordBreak: "break-word",
                  }}
                >
                  {s.address}
                </Typography>
                <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, mt: 0.25 }}>
                  {dc.route.stop} {s.sequence}
                </Typography>
              </Box>
            </Stack>
            {s.isDone ? (
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#34D399", flexShrink: 0 }}>
                {dc.route.done}
              </Typography>
            ) : (
              <Button
                onClick={() => markStopArrived(s.id, true)}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2.5,
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "none",
                  color: "#0B0F19",
                  bgcolor: theme.palette.primary.main,
                  flexShrink: 0,
                }}
              >
                {dc.route.arrivedBtn}
              </Button>
            )}
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
