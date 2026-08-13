import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart, pieArcLabelClasses } from "@mui/x-charts/PieChart";
import { Card, Stack, Typography, Box, useTheme, Grid } from "@mui/material";
import AnalyticsSkeleton from "@/app/components/skeletons/AnalyticsSkeleton";
import { Dictionary } from "@/app/lib/language/language";
import { ReportsShipments } from "@/app/lib/type/reports";
import RouteIcon from "@mui/icons-material/Route";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

interface ShipmentChartsProps {
  data?: ReportsShipments | null;
  loading?: boolean;
  dict: Dictionary;
}

export default function ShipmentCharts({
  data,
  loading = false,
  dict,
}: ShipmentChartsProps) {
  const theme = useTheme();

  if (loading || !data) {
    return (
      <AnalyticsSkeleton title={dict.reports.charts.shipment.analyticsTitle} />
    );
  }

  const routeShipmentCounts = data?.routeCounts || [];
  
  // Prepare status data for PieChart
  const statusColors: Record<string, string> = {
    DELIVERED: theme.palette.success.main,
    IN_TRANSIT: theme.palette.primary.main,
    DELAYED: theme.palette.warning.main,
    PENDING: theme.palette.info.main,
    CANCELLED: theme.palette.error.main,
  };

  const statusPieData = (data?.statusCounts || []).map((s, index) => {
    const statusKey = s.status.toLocaleUpperCase('en-US');
    const localizedStatus = dict.routes.statuses[statusKey as keyof typeof dict.routes.statuses] || s.status.replace("_", " ");
    
    return {
      id: index,
      value: s.count,
      label: localizedStatus,
      color: statusColors[s.status] || theme.palette.secondary.main,
    };
  });

  const cardStyle = {
    p: 3,
    borderRadius: "20px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
    border: `1px solid ${theme.palette.divider}`,
    transition: "box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: theme.palette.mode === "dark" 
        ? "0 12px 30px rgba(0,0,0,0.4)" 
        : "0 12px 30px rgba(0,0,0,0.06)",
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={cardStyle}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            mb={3}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: "10px",
                bgcolor: "success.main",
                color: "white",
                display: "flex",
              }}
            >
              <AssignmentTurnedInIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: "-0.01em" }}>
                {dict.reports.charts.shipment.statusDistribution}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
            {statusPieData.length > 0 ? (
              <PieChart
                series={[
                  {
                    data: statusPieData,
                    innerRadius: 60,
                    outerRadius: 110,
                    paddingAngle: 3,
                    cornerRadius: 8,
                    highlightScope: { fade: "global", highlight: "item" },
                    faded: { innerRadius: 50, additionalRadius: -20, color: "gray" },
                  },
                ]}
                height={280}
                sx={{
                  [`& .${pieArcLabelClasses.root}`]: {
                    fill: "white",
                    fontWeight: "bold",
                  },
                }}
                slotProps={{
                  legend: {
                    position: { vertical: "bottom", horizontal: "center" }
                  },
                }}
              />
            ) : (
              <Typography color="text.secondary">No status data available</Typography>
            )}
          </Box>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Card sx={cardStyle}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            mb={3}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: "10px",
                bgcolor: "primary.main",
                color: "white",
                display: "flex",
              }}
            >
              <RouteIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: "-0.01em" }}>
                {dict.reports.charts.shipment.volumeByRoute}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {dict.reports.charts.shipment.volumeByRouteSubtitle}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ flex: 1, minHeight: 300, width: "100%" }}>
            <BarChart
              dataset={routeShipmentCounts}
              layout="horizontal"
              yAxis={[{ 
                scaleType: "band", 
                dataKey: "route",
                tickLabelStyle: { fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 }
              }]}
              xAxis={[{
                tickLabelStyle: { fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 }
              }]}
              series={[
                {
                  dataKey: "count",
                  label: dict.shipments.dashboard.totalShipments,
                  color: theme.palette.primary.main,
                },
              ]}
              height={320}
              margin={{ left: 100, right: 20, top: 20, bottom: 30 }}
              slotProps={{ bar: { rx: 4, ry: 4 } }}
              grid={{ vertical: true }}
              sx={{
                "& .MuiChartsLegend-root": {
                  display: "none",
                },
              }}
            />
          </Box>
        </Card>
      </Grid>
    </Grid>
  );
}
