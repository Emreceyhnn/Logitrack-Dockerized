import { PieChart, pieArcLabelClasses } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { Stack, Typography, Grid, Box, useTheme } from "@mui/material";
import { useState, useMemo } from "react";
import TimeRangeSelector, { TimeRange } from "../../charts/TimeRangeSelector";
import { AnalyticsCosts } from "@/app/lib/type/analytics";
import DonutSmallIcon from "@mui/icons-material/DonutSmall";
import BarChartIcon from "@mui/icons-material/BarChart";

interface CostAnalysisChartsProps {
  state?: AnalyticsCosts | null;
}

export default function CostAnalysisCharts({ state }: CostAnalysisChartsProps) {
  const dict = useDictionary();
  const theme = useTheme();
  const [range, setRange] = useState<TimeRange>("6m");

  const displayCount = range === "6m" ? 6 : 1;

  const currentMonthIndex = new Date().getMonth();
  const months = useMemo(() => {
    const monthsArray = [
      dict.common.months.jan,
      dict.common.months.feb,
      dict.common.months.mar,
      dict.common.months.apr,
      dict.common.months.may,
      dict.common.months.jun,
      dict.common.months.jul,
      dict.common.months.aug,
      dict.common.months.sep,
      dict.common.months.oct,
      dict.common.months.nov,
      dict.common.months.dec,
    ];
    const result = [];
    for (let i = displayCount - 1; i >= 0; i--) {
      const idx = (currentMonthIndex - i + 12) % 12;
      result.push(monthsArray[idx]);
    }
    return result;
  }, [displayCount, currentMonthIndex, dict.common.months]);

  const fuelCosts = useMemo(
    () => (state?.fuel || [0, 0, 0, 0, 0, 0]).slice(-displayCount),
    [state, displayCount]
  );
  const maintenanceCosts = useMemo(
    () => (state?.maintenance || [0, 0, 0, 0, 0, 0]).slice(-displayCount),
    [state, displayCount]
  );
  const overheadCosts = useMemo(
    () => (state?.overhead || [0, 0, 0, 0, 0, 0]).slice(-displayCount),
    [state, displayCount]
  );

  const defaultCostDistribution = [
    {
      id: 0,
      value: 35,
      label: dict.analytics.costs.categories.fuel,
      color: theme.palette.error.main,
    },
    {
      id: 1,
      value: 25,
      label: dict.analytics.costs.categories.maintenance,
      color: theme.palette.warning.main,
    },
    {
      id: 2,
      value: 30,
      label: dict.analytics.costs.categories.salaries,
      color: theme.palette.info.main,
    },
    {
      id: 3,
      value: 10,
      label: dict.analytics.costs.categories.insuranceOps,
      color: theme.palette.success.main,
    },
  ];

  const translateLabel = (label: string) => {
    const key = label.toLocaleLowerCase('en-US');
    if (key === "fuel") return dict.analytics.costs.categories.fuel;
    if (key === "maintenance")
      return dict.analytics.costs.categories.maintenance;
    if (key === "driver salaries")
      return dict.analytics.costs.categories.salaries;
    if (key === "insurance/ops")
      return dict.analytics.costs.categories.insuranceOps;
    return label;
  };

  const costDistribution =
    state?.distribution.map((d, i) => ({
      ...d,
      color: defaultCostDistribution[i % 4]?.color ?? theme.palette.primary.main,
      label: translateLabel(d.label),
    })) || defaultCostDistribution;

  const cardStyle = {
    p: 3,
    borderRadius: "16px",
    height: "100%",
    bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
    border: `1px solid ${theme.palette.divider}`,
    transition: "box-shadow 0.2s ease-in-out",
    "&:hover": {
      boxShadow: theme.palette.mode === "dark" 
        ? "0 8px 24px rgba(0,0,0,0.4)" 
        : "0 8px 24px rgba(0,0,0,0.05)",
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Box sx={cardStyle}>
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
                    bgcolor: "error.main",
                    color: "white",
                    display: "flex",
                    opacity: 0.9,
                  }}
                >
                  <BarChartIcon fontSize="small" />
                </Box>
                <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ letterSpacing: "-0.01em" }}>
                  {dict.analytics.costs.title}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 500 }}>
                {dict.analytics.costs.subtitle}
              </Typography>
            </Box>
            <TimeRangeSelector value={range} onChange={setRange} dict={dict} />
          </Stack>

          <Box sx={{ width: "100%", height: 320 }}>
            <BarChart
              xAxis={[{ 
                data: months, 
                scaleType: "band",
                tickLabelStyle: { fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 } 
              }]}
              yAxis={[{
                tickLabelStyle: { fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 }
              }]}
              series={[
                {
                  data: fuelCosts,
                  label: dict.analytics.costs.categories.fuel,
                  stack: "total",
                  color: theme.palette.error.main,
                },
                {
                  data: maintenanceCosts,
                  label: dict.analytics.costs.categories.maintenance,
                  stack: "total",
                  color: theme.palette.warning.main,
                },
                {
                  data: overheadCosts,
                  label: dict.analytics.costs.categories.overhead,
                  stack: "total",
                  color: theme.palette.info.main,
                },
              ]}
              margin={{ top: 20, right: 20, bottom: 30, left: 40 }}
              grid={{ horizontal: true }}
              slotProps={{ bar: { rx: 4, ry: 4 } }}
              sx={{
                "& .MuiChartsLegend-root": {
                  display: "none",
                },
              }}
            />
          </Box>
        </Box>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Box sx={cardStyle}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={4}>
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
              <DonutSmallIcon fontSize="small" />
            </Box>
            <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ letterSpacing: "-0.01em" }}>
              {dict.analytics.costs.breakdown}
            </Typography>
          </Stack>
          
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              height: "100%",
              alignItems: "center",
              minHeight: 320,
            }}
          >
            <PieChart
              series={[
                {
                  data: costDistribution,
                  innerRadius: 80,
                  outerRadius: 120,
                  paddingAngle: 3,
                  cornerRadius: 8,
                  highlightScope: { fade: "global", highlight: "item" },
                  faded: {
                    innerRadius: 60,
                    additionalRadius: -20,
                    color: "gray",
                  },
                },
              ]}
              height={300}
              width={300}
              sx={{
                [`& .${pieArcLabelClasses.root}`]: {
                  fill: "white",
                  fontWeight: "bold",
                },
              }}
              slotProps={{
                legend: {
                  position: { vertical: "bottom", horizontal: "center" },
                },
              }}
            />
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
}
