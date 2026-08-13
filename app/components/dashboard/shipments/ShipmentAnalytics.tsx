"use client";
import { Card, Stack, Typography, useTheme, Box } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { useMemo } from "react";
import { ShipmentAnalyticsProps } from "@/app/lib/type/shipment";
import AnalyticsSkeleton from "@/app/components/skeletons/AnalyticsSkeleton";
import { useDictionary, useLanguage } from "@/app/lib/language/DictionaryContext";

export default function ShipmentAnalytics({
  state,
}: ShipmentAnalyticsProps) {
  const dict = useDictionary();
  const { volumeHistory, statusDistribution, loading } = state;
  const theme = useTheme();

  const pieData = useMemo(() => {
    return statusDistribution.map((item, index) => {
      // Localize status if possible, otherwise fallback to formatting
      const statusKey = item.status.toLocaleUpperCase('en-US');
      const localizedStatus = dict.routes.statuses[statusKey as keyof typeof dict.routes.statuses] || item.status.replace("_", " ");

      return {
        id: index,
        value: item.count,
        label: localizedStatus,
        color:
          item.status === "DELIVERED"
            ? theme.palette.success.main
            : item.status === "IN_TRANSIT"
              ? theme.palette.info.main
              : item.status === "DELAYED"
                ? theme.palette.error.main
                : theme.palette.warning.main,
      };
    });
  }, [statusDistribution, theme, dict]);

  const { lang } = useLanguage();
  const safeLang = ["en", "tr"].includes(lang) ? lang : "en";

  const translateDayToTr = (day: string) => {
    switch (day) {
      case "Sun": return "Paz";
      case "Mon": return "Pzt";
      case "Tue": return "Sal";
      case "Wed": return "Çar";
      case "Thu": return "Per";
      case "Fri": return "Cum";
      case "Sat": return "Cmt";
      default: return day;
    }
  };

  const barData = useMemo(() => {
    return volumeHistory.map((item) => ({
      day: safeLang === "tr" ? translateDayToTr(item.day) : item.day,
      volume: item.volume,
    }));
  }, [volumeHistory, safeLang]);

  if (loading) {
    return (
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} mt={2}>
        <Box sx={{ flex: 1 }}>
          <AnalyticsSkeleton title={dict.shipments.dashboard.statusOverview} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <AnalyticsSkeleton title={dict.shipments.dashboard.volumeTrend} />
        </Box>
      </Stack>
    );
  }

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={3}
      mt={2}
      sx={{ alignItems: "stretch" }}
    >
      <Box sx={{ flex: 1, display: "flex" }}>
        <Card
          sx={{
            width: "100%",
            p: 2.5,
            borderRadius: "16px",
            boxShadow: theme.shadows[2],
            display: "flex",
            flexDirection: "column",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            background: `${theme.palette.background.paper}`,
            "&:hover": {
              transform: "translateY(-4px)",
              boxShadow: theme.shadows[8],
            },
          }}
        >
          <Stack spacing={0.5} sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={700}>
              {dict.shipments.dashboard.statusOverview}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dict.shipments.dashboard.liveBreakdown}
            </Typography>
          </Stack>

          <Box
            sx={{
              flex: 1,
              minHeight: 300,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <PieChart
              series={[
                {
                  data:
                    pieData.length > 0
                      ? pieData
                      : [{ id: 0, value: 1, label: dict.shipments.dashboard.noData, color: "#ccc" }],
                  innerRadius: 60,
                  outerRadius: 100,
                  paddingAngle: 5,
                  cornerRadius: 8,
                  highlightScope: { fade: "global", highlight: "item" },
                  faded: {
                    innerRadius: 30,
                    additionalRadius: -30,
                    color: "gray",
                  },
                },
              ]}
              height={300}
              margin={{ right: 150 }}
              hideLegend
            />
          </Box>
        </Card>
      </Box>

      <Box sx={{ flex: 1, display: "flex" }}>
        <Card
          sx={{
            width: "100%",
            p: 2.5,
            borderRadius: "16px",
            boxShadow: theme.shadows[2],
            display: "flex",
            flexDirection: "column",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            background: `${theme.palette.background.paper}`,
            "&:hover": {
              transform: "translateY(-4px)",
              boxShadow: theme.shadows[8],
            },
          }}
        >
          <Stack spacing={0.5} sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={700}>
              {dict.shipments.dashboard.volumeTrend}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dict.shipments.dashboard.dailyVolume}
            </Typography>
          </Stack>

          <Box
            sx={{
              flex: 1,
              minHeight: 300,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <BarChart
              dataset={barData}
              xAxis={[{ scaleType: "band", dataKey: "day" }]}
              series={[
                {
                  dataKey: "volume",
                  label: dict.shipments.dashboard.shipments,
                  color: theme.palette.primary.main,
                  valueFormatter: (v) => dict.shipments.dashboard.units.replace("{count}", String(v)),
                },
              ]}
              height={300}
              borderRadius={8}
            />
          </Box>
        </Card>
      </Box>
    </Stack>
  );
}
