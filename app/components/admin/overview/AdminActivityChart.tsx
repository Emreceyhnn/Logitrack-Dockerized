"use client";

import { useMemo } from "react";
import { Box, Skeleton, Stack, Typography, useTheme } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  AdminActivityChartProps,
  AdminTimeRange,
} from "@/app/lib/type/admin/overview";

/**
 * tr-Kova zaman damgasını aralığa uygun etikete çevirir.
 * en-Formats a bucket timestamp for the x-axis. Short ranges need a clock,
 *    multi-day ranges need a date — showing "14:00" across 30 days would
 *    repeat meaninglessly.
 * input (iso: string, range: AdminTimeRange, locale: string)
 * output (string)
 */
function formatBucket(
  iso: string,
  range: AdminTimeRange,
  locale: string
): string {
  const date = new Date(iso);
  if (range === "1h" || range === "24h") {
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString(locale, { day: "2-digit", month: "short" });
}

/**
 * tr-Platform aktivite grafiği: girişler ve yeni kullanıcılar.
 * en-Activity chart plotting sign-ins and new signups over the selected range.
 * input (AdminActivityChartProps)
 * output (JSX.Element)
 */
export default function AdminActivityChart({
  series,
  signups,
  range,
  loading,
}: AdminActivityChartProps) {
  const theme = useTheme();
  const dict = useDictionary();

  const signIns = useMemo(
    () => series.find((s) => s.key === "signIns")?.points ?? [],
    [series]
  );

  // Both series share the bucket grid produced by the controller, so either
  // one can supply the axis labels.
  const labels = useMemo(() => {
    const source = signIns.length > 0 ? signIns : signups;
    return source.map((p) => formatBucket(p.bucket, range, "en-GB"));
  }, [signIns, signups, range]);

  const hasData = signIns.length > 0 || signups.length > 0;

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 3,
        height: "100%",
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper_alpha.main_70,
        backdropFilter: "blur(20px)",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
            {dict.admin.overview.charts.activityTitle}
          </Typography>
          <Typography
            sx={{ fontSize: 12.5, color: theme.palette.text.secondary }}
          >
            {dict.admin.overview.charts.activitySubtitle}
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ width: "100%", height: 300 }}>
        {loading && !hasData ? (
          <Skeleton variant="rounded" height={300} />
        ) : !hasData ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ height: "100%" }}
          >
            <Typography
              sx={{ fontSize: 13, color: theme.palette.text.secondary }}
            >
              {dict.admin.common.noData}
            </Typography>
          </Stack>
        ) : (
          <LineChart
            xAxis={[
              {
                data: labels,
                scaleType: "point",
                tickLabelStyle: {
                  fill: theme.palette.text.secondary,
                  fontSize: 11,
                },
              },
            ]}
            yAxis={[
              {
                // Counts are integers; a fractional tick would be nonsense.
                min: 0,
                tickMinStep: 1,
                tickLabelStyle: {
                  fill: theme.palette.text.secondary,
                  fontSize: 11,
                },
              },
            ]}
            series={[
              {
                data: signIns.map((p) => p.value),
                label: dict.admin.overview.charts.signIns,
                color: theme.palette.kpi.violet,
                area: true,
                showMark: false,
                curve: "monotoneX",
              },
              {
                data: signups.map((p) => p.value),
                label: dict.admin.overview.charts.signups,
                color: theme.palette.kpi.emerald,
                showMark: false,
                curve: "monotoneX",
              },
            ]}
            margin={{ top: 16, right: 16, bottom: 24, left: 40 }}
            grid={{ horizontal: true }}
            sx={{
              "& .MuiAreaElement-root": { fillOpacity: 0.12 },
            }}
          />
        )}
      </Box>
    </Box>
  );
}
