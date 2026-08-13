import { LinearProgress, Stack, Typography, Box } from "@mui/material";
import { RouteWithRelations } from "@/app/lib/type/routes";

interface Params {
  routeId: string;
  route?: RouteWithRelations | undefined;
  liveDistanceKm?: number | undefined;
  traveledKm?: number | undefined;
  remainingKm?: number | undefined;
  durationMin?: number | undefined;
}

import { useDictionary } from "@/app/lib/language/DictionaryContext";

const RoutesTelemetryCards = (params: Params) => {
  const dict = useDictionary();
  const { route, liveDistanceKm, traveledKm, remainingKm, durationMin } = params;
  if (!route) return null;

  const totalJourneyKm = liveDistanceKm || route.distanceKm || 0;
  const remainingDistance = remainingKm ?? totalJourneyKm;
  const completedDistance = Math.max(0, totalJourneyKm - remainingDistance);
  
  const progressPct =
    totalJourneyKm > 0 ? Math.min(100, (completedDistance / totalJourneyKm) * 100) : 0;
  const fuelLevel = route.vehicle?.fuelLevel || 0;

  return (
    <Stack spacing={2} px={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" fontWeight={700} color="white">
          {dict.routes.details.liveTelemetry}
        </Typography>
        {traveledKm != null && (
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
            {progressPct.toFixed(0)}%
          </Typography>
        )}
      </Stack>

      {traveledKm != null && (
        <LinearProgress
          variant="determinate"
          value={progressPct}
          sx={{
            height: 6,
            borderRadius: "8px",
            bgcolor: (theme) => theme.palette.divider_alpha.main_10,
            "& .MuiLinearProgress-bar": {
              borderRadius: "8px",
              background: "linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)",
            },
          }}
        />
      )}

      <Stack direction={"row"} spacing={2}>
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: (theme) => theme.palette.divider_alpha.main_05,
            border: (theme) =>
              `1px solid ${theme.palette.divider_alpha.main_10}`,
            flex: 1,
          }}
        >
          <Stack spacing={1}>
            <Typography
              sx={{ fontSize: 14, fontWeight: 600, color: "text.secondary" }}
            >
              {dict.routes.details.distTravelled}
            </Typography>
            <Stack direction={"row"} spacing={1} alignItems={"center"}>
              <Typography variant="h5" fontWeight={600} color="white">
                {completedDistance.toFixed(1)}
              </Typography>
              <Typography
                sx={{ fontSize: 12, fontWeight: 300, color: "text.secondary" }}
              >
                km
              </Typography>
            </Stack>
          </Stack>
        </Box>
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: (theme) => theme.palette.divider_alpha.main_05,
            border: (theme) =>
              `1px solid ${theme.palette.divider_alpha.main_10}`,
            flex: 1,
          }}
        >
          <Stack spacing={1}>
            <Typography
              sx={{ fontSize: 14, fontWeight: 600, color: "text.secondary" }}
            >
              {dict.routes.details.remaining}
            </Typography>
            <Stack direction={"row"} spacing={1} alignItems={"center"}>
              <Typography variant="h5" fontWeight={600} color="white">
                {remainingDistance.toFixed(1)}
              </Typography>
              <Typography
                sx={{ fontSize: 12, fontWeight: 300, color: "text.secondary" }}
              >
                km
              </Typography>
            </Stack>
          </Stack>
        </Box>
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: (theme) => theme.palette.divider_alpha.main_05,
            border: (theme) =>
              `1px solid ${theme.palette.divider_alpha.main_10}`,
            flex: 1,
          }}
        >
          <Stack spacing={1}>
            <Typography
              sx={{ fontSize: 14, fontWeight: 600, color: "text.secondary" }}
            >
              {dict.routes.details.etaLabel || "ETA"}
            </Typography>
            <Stack direction={"row"} spacing={1} alignItems={"center"}>
              <Typography variant="h5" fontWeight={600} color="white">
                {durationMin != null ? durationMin : "—"}
              </Typography>
              <Typography
                sx={{ fontSize: 12, fontWeight: 300, color: "text.secondary" }}
              >
                min
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Stack>
      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          bgcolor: (theme) => theme.palette.divider_alpha.main_05,
          border: (theme) => `1px solid ${theme.palette.divider_alpha.main_10}`,
        }}
      >
        <Stack spacing={1}>
          <Stack direction={"row"} justifyContent={"space-between"}>
            <Typography
              sx={{ fontSize: 14, fontWeight: 600, color: "text.secondary" }}
            >
              {dict.routes.details.fuelLevel}
            </Typography>
            <Typography
              sx={{ fontSize: 14, fontWeight: 600, color: "info.main" }}
            >
              {fuelLevel}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={fuelLevel}
            sx={{
              bgcolor: "background.dashboardBg",
              borderRadius: "8px",
              "& .MuiLinearProgress-bar": {
                borderRadius: "8px",
                backgroundColor: `info.main`,
              },
            }}
          />
        </Stack>
      </Box>
    </Stack>
  );
};

export default RoutesTelemetryCards;
