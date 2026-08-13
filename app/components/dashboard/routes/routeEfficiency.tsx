import {
  Divider,
  LinearProgress,
  Stack,
  Typography,
  Skeleton,
} from "@mui/material";
import CustomCard from "../../cards/card";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { RouteNotification, RouteEfficiencyStats } from "@/app/lib/type/routes";
import { useDictionary, useLanguage } from "@/app/lib/language/DictionaryContext";
import { getLocalizedNotification } from "@/app/lib/language/notificationTranslator";


interface RouteEfficiencyProps {
  data: RouteEfficiencyStats | null;
  loading?: boolean;
}

const RouteEfficiency = ({ data, loading }: RouteEfficiencyProps) => {
  const dict = useDictionary();
  const { lang } = useLanguage();

  if (loading || !data) {
    return (
      <CustomCard
        sx={{ display: "flex", flexDirection: "column", gap: 3, flexGrow: 1 }}
      >
        <Typography
          sx={{ fontSize: 16, fontWeight: 600, color: "text.secondary" }}
        >
          {dict.routes.dashboard.routeEfficiency.toLocaleUpperCase('en-US')}
        </Typography>
        <Stack spacing={3}>
          {[1, 2, 3].map((i) => (
            <Stack key={i} spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Skeleton width="40%" />
                <Skeleton width="20%" />
              </Stack>
              <Skeleton variant="rounded" height={8} />
            </Stack>
          ))}
          <Divider />
          <Skeleton width="50%" height={24} />
          <Stack spacing={2}>
            {[1, 2].map((i) => (
              <Stack key={i} direction="row" spacing={2} alignItems="center">
                <Skeleton variant="circular" width={24} height={24} />
                <Stack flexGrow={1}>
                  <Skeleton width="60%" />
                  <Skeleton width="40%" height={14} />
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </CustomCard>
    );
  }

  return (
    <CustomCard
      sx={{ display: "flex", flexDirection: "column", gap: 3, flexGrow: 1 }}
    >
      <Typography
        sx={{ fontSize: 16, fontWeight: 600, color: "text.secondary" }}
      >
        {dict.routes.dashboard.routeEfficiency.toLocaleUpperCase('en-US')}
      </Typography>
      <Stack spacing={1}>
        <Stack direction={"row"} justifyContent={"space-between"}>
          <Typography sx={{ fontSize: 14 }}>
            {dict.routes.dashboard.fuelConsumption}
          </Typography>
          <Typography
            sx={{ fontSize: 14, fontWeight: 700, color: "info.main" }}
          >
            {dict.routes.dashboard.avg.replace(
              "{count}",
              data.fuelConsumption.toFixed(2)
            )}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={Math.min(data.fuelConsumption * 4, 100)} // Rough scaling
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
      <Stack spacing={1}>
        <Stack direction={"row"} justifyContent={"space-between"}>
          <Typography sx={{ fontSize: 14 }}>
            {dict.routes.dashboard.onTimePerformance}
          </Typography>
          <Typography
            sx={{ fontSize: 14, fontWeight: 700, color: "success.main" }}
          >
            {data.onTimePerformance} %
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={data.onTimePerformance}
          sx={{
            bgcolor: "background.dashboardBg",
            borderRadius: "8px",
            "& .MuiLinearProgress-bar": {
              borderRadius: "8px",
              backgroundColor: `success.main`,
            },
          }}
        />
      </Stack>
      <Stack spacing={1}>
        <Stack direction={"row"} justifyContent={"space-between"}>
          <Typography sx={{ fontSize: 14 }}>
            {dict.routes.dashboard.vehicleUtilization}
          </Typography>
          <Typography
            sx={{ fontSize: 14, fontWeight: 700, color: "warning.main" }}
          >
            {data.vehicleUtilization.toFixed(1)} %
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={data.vehicleUtilization}
          sx={{
            bgcolor: "background.dashboardBg",
            borderRadius: "8px",
            "& .MuiLinearProgress-bar": {
              borderRadius: "8px",
              backgroundColor: `warning.main`,
            },
          }}
        />
      </Stack>
      <Divider />
      <Stack spacing={2}>
        <Typography
          sx={{ fontSize: 16, fontWeight: 600, color: "text.secondary" }}
        >
          {dict.routes.dashboard.recentNotifications.toLocaleUpperCase('en-US')}
        </Typography>
        <Stack spacing={1} maxHeight={104} overflow={"auto"}>
          {data.recentNotifications.length > 0 ? (
            data.recentNotifications.map(
              (notif: RouteNotification, index: number) => {
                const { title, message } = getLocalizedNotification(
                  notif.title || "",
                  notif.message || "",
                  lang
                );
                
                return (
                  <Stack
                    key={index}
                    direction={"row"}
                    alignItems={"center"}
                    spacing={2}
                  >
                    <WarningIcon sx={{ color: "error.main" }} />
                    <Stack>
                      <Typography sx={{ fontSize: 18, fontWeight: 400 }}>
                        {title || dict.routes.dashboard.notification}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 14,
                          fontWeight: 200,
                          color: "text.secondary",
                        }}
                      >
                        {message}
                      </Typography>
                    </Stack>
                  </Stack>
                );
              }
            )
          ) : (
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(16, 185, 129, 0.05)"
                    : "rgba(16, 185, 129, 0.02)",
                border: (theme) =>
                  `1px dashed ${theme.palette.success._alpha.main_30}`,
              }}
            >
              <CheckCircleOutlineIcon
                sx={{ color: "success.main", fontSize: 20 }}
              />
              <Typography
                sx={{
                  fontSize: 14,
                  color: "success.main",
                  fontWeight: 500,
                }}
              >
                {dict.routes.dashboard.noNotifications}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Stack>
    </CustomCard>
  );
};

export default RouteEfficiency;
