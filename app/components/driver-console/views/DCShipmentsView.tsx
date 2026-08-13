import { Box, Stack, Typography, Card, useTheme } from "@mui/material";
import type { DriverConsoleState } from "@/app/hooks/useDriverConsoleState";

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  PENDING: { color: "#94a3b8", bg: "rgba(148,163,184,0.14)" },
  IN_TRANSIT: { color: "#38bdf8", bg: "rgba(56,189,248,0.14)" },
  DELIVERED: { color: "#34D399", bg: "rgba(52,211,153,0.14)" },
  DELAYED: { color: "#F44336", bg: "rgba(244,67,54,0.14)" },
};

const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  LOW: { color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  MEDIUM: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  HIGH: { color: "#F44336", bg: "rgba(244,67,54,0.12)" },
  CRITICAL: { color: "#F44336", bg: "rgba(244,67,54,0.12)" },
};

const FILTERS = ["ALL", "PENDING", "IN_TRANSIT", "DELIVERED", "DELAYED"] as const;

export default function DCShipmentsView({ state }: { state: DriverConsoleState }) {
  const theme = useTheme();
  const { dc, shipments, shipmentFilter, setShipmentFilter } = state;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {FILTERS.map((f) => {
          const active = shipmentFilter === f;
          return (
            <Box
              key={f}
              component="button"
              type="button"
              onClick={() => setShipmentFilter(f)}
              sx={{
                px: { xs: 1.5, sm: 2 },
                py: 1.1,
                borderRadius: 2.5,
                fontSize: 12,
                fontWeight: 800,
                whiteSpace: "nowrap",
                cursor: "pointer",
                border: "none",
                font: "inherit",
                color: active ? "#0B0F19" : "rgba(255,255,255,0.55)",
                bgcolor: active ? theme.palette.primary.main : "rgba(255,255,255,0.05)",
              }}
            >
              {f === "ALL" ? dc.shipmentsView.all : dc.shipmentsView[f as keyof typeof dc.shipmentsView]}
            </Box>
          );
        })}
      </Stack>

      <Stack spacing={1.5}>
        {shipments.map((sh) => {
          const status = STATUS_COLORS[sh.status] ?? STATUS_COLORS.PENDING!;
          const priority = PRIORITY_COLORS[sh.priority] ?? PRIORITY_COLORS.MEDIUM!;
          return (
            <Card
              key={sh.id}
              sx={{
                bgcolor: theme.palette.background.paper,
                borderRadius: 3,
                p: { xs: 2, sm: 2.25 },
                borderLeft: `3px solid ${priority.color}`,
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                spacing={{ xs: 1, sm: 2 }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{sh.trackingId}</Typography>
                    <Box
                      sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: status.color,
                        bgcolor: status.bg,
                        px: 1,
                        py: 0.35,
                        borderRadius: 1.5,
                        textTransform: "uppercase",
                      }}
                    >
                      {dc.shipmentsView[sh.status as keyof typeof dc.shipmentsView] ?? sh.status}
                    </Box>
                    {sh.slaBreach && (
                      <Box
                        sx={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: "#F44336",
                          bgcolor: "rgba(244,67,54,0.14)",
                          px: 1,
                          py: 0.35,
                          borderRadius: 1.5,
                        }}
                      >
                        {dc.shipmentsView.slaRisk}
                      </Box>
                    )}
                  </Stack>
                  <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary, mt: 0.75 }}>
                    {sh.destination}
                    {sh.cargoType ? ` · ${sh.cargoType}` : ""}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.4)", mt: 0.5 }}>
                    {sh.stopsDone}/{sh.stopsTotal} {dc.shipmentsView.stopsComplete}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 800,
                    color: priority.color,
                    bgcolor: priority.bg,
                    px: 1.25,
                    py: 0.6,
                    borderRadius: 2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {sh.priority}
                </Box>
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}
