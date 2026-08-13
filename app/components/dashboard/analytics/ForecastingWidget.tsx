import {
  LineChart,
  lineElementClasses,
  markElementClasses,
} from "@mui/x-charts/LineChart";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { Stack, Typography, Chip, Box, useTheme } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useState, useMemo } from "react";
import TimeRangeSelector, { TimeRange } from "../../charts/TimeRangeSelector";
import { AnalyticsForecast } from "@/app/lib/type/analytics";

interface ForecastingWidgetProps {
  state?: AnalyticsForecast | null;
}

export default function ForecastingWidget({ state }: ForecastingWidgetProps) {
  const dict = useDictionary();
  const theme = useTheme();
  const [range, setRange] = useState<TimeRange>("6m");

  const weekPrefix = dict.analytics.forecasting.weekPrefix;
  const weeks = useMemo(() => {
    const generateWeeks = () =>
      Array.from({ length: 13 }, (_, i) => `${weekPrefix}${i + 1}`);
    return (
      state?.weeks?.map((w) => w.replace("W", weekPrefix)) || generateWeeks()
    );
  }, [state?.weeks, weekPrefix]);

  const actualsSeries = useMemo(
    () => state?.actuals || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [state?.actuals]
  );

  const predictedSeries = useMemo(
    () => state?.predicted || Array(12).fill(null),
    [state?.predicted]
  );

  const displayCount = useMemo(() => {
    if (range === "1w") return 4;
    if (range === "2w") return 8;
    return weeks.length;
  }, [range, weeks]);

  const filteredWeeks = useMemo(
    () => weeks.slice(-displayCount),
    [weeks, displayCount]
  );
  const filteredActuals = useMemo(
    () => actualsSeries.slice(-displayCount),
    [actualsSeries, displayCount]
  );
  const filteredPredicted = useMemo(
    () => predictedSeries.slice(-displayCount),
    [predictedSeries, displayCount]
  );

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: "16px",
        bgcolor:
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.02)"
            : "rgba(0,0,0,0.01)",
        border: `1px solid ${theme.palette.divider}`,
        transition: "box-shadow 0.2s ease-in-out",
        "&:hover": {
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 8px 24px rgba(0,0,0,0.4)"
              : "0 8px 24px rgba(0,0,0,0.05)",
        },
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                p: 1,
                borderRadius: "10px",
                bgcolor: "secondary.main",
                color: "white",
                display: "flex",
                opacity: 0.9,
              }}
            >
              <TrendingUpIcon fontSize="small" />
            </Box>
            <Typography
              variant="h6"
              fontWeight={800}
              color="text.primary"
              sx={{ letterSpacing: "-0.01em" }}
            >
              {dict.analytics.forecasting.title}
            </Typography>
            <Chip
              label={dict.analytics.forecasting.aiPowered}
              size="small"
              sx={{
                height: 22,
                fontWeight: 700,
                fontSize: "0.7rem",
                bgcolor:
                  theme.palette.mode === "dark"
                    ? "secondary._alpha.main_20"
                    : "secondary._alpha.main_10",
                color: "secondary.main",
              }}
            />
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, fontWeight: 500 }}
          >
            {dict.analytics.forecasting.subtitle}
          </Typography>
        </Box>
        <TimeRangeSelector value={range} onChange={setRange} dict={dict} />
      </Stack>

      <Box sx={{ width: "100%", height: 350 }}>
        <LineChart
          xAxis={[
            {
              data: filteredWeeks,
              scaleType: "point",
              tickLabelStyle: {
                fill: theme.palette.text.secondary,
                fontSize: 12,
                fontWeight: 600,
              },
            },
          ]}
          yAxis={[
            {
              tickLabelStyle: {
                fill: theme.palette.text.secondary,
                fontSize: 12,
                fontWeight: 600,
              },
            },
          ]}
          series={[
            {
              data: filteredActuals,
              label: dict.analytics.forecasting.actualVolume,
              color: theme.palette.primary.main,
              showMark: true,
              area: true,
            },
            {
              data: filteredPredicted,
              label: dict.analytics.forecasting.predicted,
              color: theme.palette.success.main,
              showMark: true,
            },
          ]}
          margin={{ top: 20, right: 20, bottom: 30, left: 40 }}
          grid={{ vertical: true, horizontal: true }}
          sx={{
            [`.${lineElementClasses.root}`]: {
              strokeWidth: 3,
            },
            [`.${markElementClasses.root}`]: {
              strokeWidth: 2,
              fill: theme.palette.background.paper,
            },
            "& .MuiChartsLegend-root": {
              display: "none",
            },
            "& .MuiAreaElement-root": {
              fillOpacity: 0.15,
            },
          }}
        />
      </Box>
    </Box>
  );
}
