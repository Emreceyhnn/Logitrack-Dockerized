import { Box, Stack, Typography, Divider } from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { BarChart } from "@mui/x-charts/BarChart";
import CustomCard from "../../cards/card";
import AnalyticsSkeleton from "@/app/components/skeletons/AnalyticsSkeleton";

interface DriverPerformanceChartsProps {
  data:
    | {
        name: string;
        rating: number;
        workingHours: number;
        safetyScore?: number;
        efficiencyScore?: number;
        weeklyDelivered?: number;
        weeklyDelayed?: number;
      }[]
    | undefined;
  loading?: boolean;
}

const DriverPerformanceCharts = ({
  data,
  loading = false,
}: DriverPerformanceChartsProps) => {
  /* -------------------------------- variables ------------------------------- */

  const dict = useDictionary();

  if (loading || !data) {
    return (
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} mt={2}>
        <Box flex={1}>
          <AnalyticsSkeleton title={`${dict.drivers.dashboard.ratings} & ${dict.drivers.dashboard.weeklyHours}`} />
        </Box>
      </Stack>
    );
  }

  const driverNames = data?.map((d) => d.name) ?? [];
  const ratings = data?.map((d) => d.rating) ?? [];
  const workingHours = data?.map((d) => d.workingHours) ?? [];
  const safetyScores = data?.map((d) => d.safetyScore ?? 0) ?? [];
  const efficiencyScores = data?.map((d) => d.efficiencyScore ?? 0) ?? [];
  const delivered = data?.map((d) => d.weeklyDelivered ?? 0) ?? [];
  const delayed = data?.map((d) => d.weeklyDelayed ?? 0) ?? [];
  // Only render the score/weekly charts when the backend actually supplied
  // those fields — keeps older payloads (rating + hours only) rendering fine.
  const hasScores = data?.some(
    (d) => d.safetyScore !== undefined || d.efficiencyScore !== undefined
  );
  const hasWeekly = data?.some(
    (d) => d.weeklyDelivered !== undefined || d.weeklyDelayed !== undefined
  );

  const sharedXAxis = [
    {
      scaleType: "band" as const,
      data: driverNames,
      label: dict.sidebar.drivers,
      tickLabelStyle: { fill: "text.secondary" },
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 2,
        mt: 2,
        "& > *": { flex: { xs: "1 1 100%", md: "1 1 calc(50% - 8px)" }, minWidth: 0 },
      }}
    >
      <Box flex={1}>
        <CustomCard sx={{ height: "100%", p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={600} sx={{ p: 1 }}>
              {`${dict.drivers.dashboard.ratings} & ${dict.drivers.dashboard.weeklyHours}`}
            </Typography>
            <Divider />
            <BarChart
              xAxis={sharedXAxis}
              yAxis={[
                {
                  id: "ratingAxis",
                  label: dict.drivers.dashboard.ratingsLabel,
                  labelStyle: { fill: "text.secondary" },
                  min: 0,
                  max: 5,
                },
                {
                  id: "hoursAxis",
                  position: "right",
                  label: dict.drivers.dashboard.hours,
                  labelStyle: { fill: "text.secondary" },
                },
              ]}
              series={[
                {
                  yAxisId: "ratingAxis",
                  data: ratings,
                  color: "#8b5cf6",
                  label: dict.drivers.dashboard.ratingsLabel,
                  highlightScope: { highlight: "item", fade: "global" },
                },
                {
                  yAxisId: "hoursAxis",
                  data: workingHours,
                  color: "#10b981",
                  label: dict.drivers.dashboard.hoursThisWeek,
                  highlightScope: { highlight: "item", fade: "global" },
                },
              ]}
              height={300}
              margin={{ top: 10, bottom: 40, left: 40, right: 40 }}
              borderRadius={8}
              slotProps={{
                legend: {},
              }}
            />
          </Stack>
        </CustomCard>
      </Box>

      {hasScores && (
        <Box>
          <CustomCard sx={{ height: "100%", p: 2 }}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={600} sx={{ p: 1 }}>
                {dict.drivers.dashboard.safetyEfficiency || "Safety & Efficiency"}
              </Typography>
              <Divider />
              <BarChart
                xAxis={sharedXAxis}
                yAxis={[
                  {
                    label: dict.drivers.dashboard.scoreLabel || "Score",
                    labelStyle: { fill: "text.secondary" },
                    min: 0,
                    max: 100,
                  },
                ]}
                series={[
                  {
                    data: safetyScores,
                    color: "#3b82f6",
                    label: dict.drivers.dashboard.safetyScore || "Safety",
                    highlightScope: { highlight: "item", fade: "global" },
                  },
                  {
                    data: efficiencyScores,
                    color: "#f59e0b",
                    label: dict.drivers.dashboard.efficiencyScore || "Efficiency",
                    highlightScope: { highlight: "item", fade: "global" },
                  },
                ]}
                height={300}
                margin={{ top: 10, bottom: 40, left: 40, right: 10 }}
                borderRadius={8}
                slotProps={{ legend: {} }}
              />
            </Stack>
          </CustomCard>
        </Box>
      )}

      {hasWeekly && (
        <Box>
          <CustomCard sx={{ height: "100%", p: 2 }}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={600} sx={{ p: 1 }}>
                {dict.drivers.dashboard.weeklyOutcomes || "This Week's Deliveries"}
              </Typography>
              <Divider />
              <BarChart
                xAxis={sharedXAxis}
                yAxis={[
                  {
                    label: dict.drivers.dashboard.shipmentsLabel || "Shipments",
                    labelStyle: { fill: "text.secondary" },
                  },
                ]}
                series={[
                  {
                    data: delivered,
                    color: "#10b981",
                    label: dict.drivers.dashboard.delivered || "Delivered",
                    highlightScope: { highlight: "item", fade: "global" },
                  },
                  {
                    data: delayed,
                    color: "#ef4444",
                    label: dict.drivers.dashboard.delayed || "Delayed",
                    highlightScope: { highlight: "item", fade: "global" },
                  },
                ]}
                height={300}
                margin={{ top: 10, bottom: 40, left: 40, right: 10 }}
                borderRadius={8}
                slotProps={{ legend: {} }}
              />
            </Stack>
          </CustomCard>
        </Box>
      )}
    </Box>
  );
};

export default DriverPerformanceCharts;
