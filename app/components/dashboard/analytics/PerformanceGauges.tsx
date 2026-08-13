import { Gauge, gaugeClasses } from "@mui/x-charts/Gauge";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { Stack, Typography, Grid, Box, useTheme } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SpeedIcon from "@mui/icons-material/Speed";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import { AnalyticsPerformance } from "@/app/lib/type/analytics";

interface PerformanceGaugesProps {
  state?: AnalyticsPerformance | null;
}

export default function PerformanceGauges({ state }: PerformanceGaugesProps) {
  const dict = useDictionary();
  const theme = useTheme();

  const onTimeRate = state?.onTimeRate ?? 0;
  const fleetUtilization = state?.fleetUtilization ?? 0;
  const satisfaction = state?.satisfaction ?? 0;
  const satisfactionCount = state?.satisfactionCount ?? 0;

  const cardStyle = {
    p: 3,
    borderRadius: "16px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    bgcolor:
      theme.palette.mode === "dark"
        ? "rgba(255,255,255,0.02)"
        : "rgba(0,0,0,0.01)",
    border: `1px solid ${theme.palette.divider}`,
    transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow:
        theme.palette.mode === "dark"
          ? "0 8px 24px rgba(0,0,0,0.4)"
          : "0 8px 24px rgba(0,0,0,0.05)",
    },
  };

  return (
    <Grid container spacing={3}>
      {/* On-Time Delivery */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Box sx={cardStyle}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ alignSelf: "flex-start", mb: 2 }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: "10px",
                bgcolor: "success.main",
                color: "white",
                display: "flex",
                opacity: 0.9,
              }}
            >
              <CheckCircleIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                {dict.analytics.performance.onTimeDelivery}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ width: "100%", height: 180, position: "relative" }}>
            <Gauge
              value={onTimeRate}
              startAngle={-110}
              endAngle={110}
              sx={{
                [`& .${gaugeClasses.valueText}`]: {
                  fontSize: 36,
                  fontWeight: 800,
                  fill: theme.palette.text.primary,
                  fontFamily: "Inter, sans-serif",
                },
                [`& .${gaugeClasses.valueArc}`]: {
                  fill: theme.palette.success.main,
                },
                [`& .${gaugeClasses.referenceArc}`]: {
                  fill:
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.05)",
                },
              }}
              text={({ value }) => `${value}%`}
            />
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ fontWeight: 500 }}
          >
            {dict.analytics.performance.target.replace("{value}", "95")}{" "}
            {onTimeRate < 95 && (
              <Typography component="span" color="error.main" fontWeight="bold">
                ({(onTimeRate - 95).toFixed(1)}%)
              </Typography>
            )}
          </Typography>
        </Box>
      </Grid>

      {/* Fleet Utilization */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Box sx={cardStyle}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ alignSelf: "flex-start", mb: 2 }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: "10px",
                bgcolor: "primary.main",
                color: "white",
                display: "flex",
                opacity: 0.9,
              }}
            >
              <SpeedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                {dict.analytics.performance.fleetUtilization}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ width: "100%", height: 180 }}>
            <Gauge
              value={fleetUtilization}
              startAngle={-110}
              endAngle={110}
              sx={{
                [`& .${gaugeClasses.valueText}`]: {
                  fontSize: 36,
                  fontWeight: 800,
                  fill: theme.palette.text.primary,
                  fontFamily: "Inter, sans-serif",
                },
                [`& .${gaugeClasses.valueArc}`]: {
                  fill: theme.palette.primary.main,
                },
                [`& .${gaugeClasses.referenceArc}`]: {
                  fill:
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.05)",
                },
              }}
              text={({ value }) => `${value}%`}
            />
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ fontWeight: 500 }}
          >
            {dict.analytics.performance.realTime}
          </Typography>
        </Box>
      </Grid>

      {/* Customer Satisfaction */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Box sx={cardStyle}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ alignSelf: "flex-start", mb: 2 }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: "10px",
                bgcolor: "warning.main",
                color: "white",
                display: "flex",
                opacity: 0.9,
              }}
            >
              <SentimentSatisfiedAltIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                {dict.analytics.performance.customerSatisfaction}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ width: "100%", height: 180 }}>
            <Gauge
              value={satisfaction}
              valueMax={5}
              startAngle={-110}
              endAngle={110}
              sx={{
                [`& .${gaugeClasses.valueText}`]: {
                  fontSize: 36,
                  fontWeight: 800,
                  fill: theme.palette.text.primary,
                  fontFamily: "Inter, sans-serif",
                },
                [`& .${gaugeClasses.valueArc}`]: {
                  fill: theme.palette.warning.main,
                },
                [`& .${gaugeClasses.referenceArc}`]: {
                  fill:
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.05)",
                },
              }}
              text={({ value }) => `${value}`}
            />
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ fontWeight: 500 }}
          >
            {dict.analytics.performance.reviews.replace(
              "{count}",
              satisfactionCount.toString()
            )}
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );
}
