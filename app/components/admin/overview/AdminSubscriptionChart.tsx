"use client";

import { useMemo } from "react";
import { Box, Skeleton, Stack, Typography, useTheme } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type { AdminSubscriptionChartProps } from "@/app/lib/type/admin/overview";

/**
 * tr-Abonelik durumu dağılımı (donut).
 * en-Subscription mix as a donut. Status→colour is fixed so the same status
 *    always reads the same way across the console, and the legend carries the
 *    labels so colour is never the sole channel.
 * input (AdminSubscriptionChartProps)
 * output (JSX.Element)
 */
export default function AdminSubscriptionChart({
  slices,
  loading,
}: AdminSubscriptionChartProps) {
  const theme = useTheme();
  const dict = useDictionary();

  const statusColors = useMemo<Record<string, string>>(
    () => ({
      ACTIVE: theme.palette.kpi.emerald,
      TRIAL: theme.palette.kpi.sky,
      EXPIRED: theme.palette.kpi.amber,
      CANCELED: theme.palette.kpi.error,
      NONE: theme.palette.kpi.slateGray,
    }),
    [theme]
  );

  const data = useMemo(
    () =>
      slices.map((slice, index) => ({
        id: index,
        value: slice.count,
        label: slice.status,
        color: statusColors[slice.status] ?? theme.palette.kpi.slateGray,
      })),
    [slices, statusColors, theme]
  );

  const total = useMemo(
    () => slices.reduce((sum, s) => sum + s.count, 0),
    [slices]
  );

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
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
          {dict.admin.overview.charts.subscriptionsTitle}
        </Typography>
        <Typography
          sx={{ fontSize: 12.5, color: theme.palette.text.secondary }}
        >
          {dict.admin.overview.charts.subscriptionsSubtitle}
        </Typography>
      </Box>

      <Box sx={{ width: "100%", height: 300 }}>
        {loading && slices.length === 0 ? (
          <Skeleton variant="rounded" height={300} />
        ) : total === 0 ? (
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
          <PieChart
            series={[
              {
                data,
                innerRadius: 58,
                outerRadius: 104,
                paddingAngle: 2,
                cornerRadius: 4,
                highlightScope: { fade: "global", highlight: "item" },
              },
            ]}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
            slotProps={{
              legend: {
                direction: "horizontal",
                position: { vertical: "bottom", horizontal: "center" },
                sx: { fontSize: 11.5 },
              },
            }}
          />
        )}
      </Box>
    </Box>
  );
}
