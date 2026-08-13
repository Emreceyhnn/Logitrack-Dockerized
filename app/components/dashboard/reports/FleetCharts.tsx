import { Card, Typography, Box, Stack, useTheme, Grid } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { ScatterChart } from "@mui/x-charts/ScatterChart";
import { ReportsFleetItem } from "@/app/lib/type/reports";
import { Dictionary } from "@/app/lib/language/language";
import BuildIcon from "@mui/icons-material/Build";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";

interface FleetChartsProps {
  data: ReportsFleetItem[];
  dict: Dictionary;
}

export default function FleetCharts({ data, dict }: FleetChartsProps) {
  const theme = useTheme();

  if (!data || data.length === 0) {
    return (
      <Box p={3}>
        <Typography color="text.secondary">
          {dict.reports.charts.fleet.noData}
        </Typography>
      </Box>
    );
  }

  // Preparing data for maintenance costs
  const maintenanceData = data
    .map((v) => ({
      plate: v.plate,
      cost: v.maintenanceCost,
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 8); // Top 8 costly vehicles

  // Preparing data for Consumption vs Odometer correlation
  const scatterData = data.map((v, i) => ({
    id: i,
    x: v.odometer,
    y: parseFloat(v.consumption),
    plate: v.plate,
  }));

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
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={cardStyle}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
            <Box
              sx={{
                p: 1,
                borderRadius: "10px",
                bgcolor: "error.main",
                color: "white",
                display: "flex",
              }}
            >
              <BuildIcon fontSize="small" />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: "-0.01em" }}>
              {dict.reports.charts.fleet.highMaintenance}
            </Typography>
          </Stack>
          
          <Box sx={{ width: "100%", height: 320 }}>
            <BarChart
              dataset={maintenanceData}
              xAxis={[{ 
                scaleType: "band", 
                dataKey: "plate",
                tickLabelStyle: { fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 } 
              }]}
              yAxis={[{
                tickLabelStyle: { fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 }
              }]}
              series={[
                {
                  dataKey: "cost",
                  label: dict.reports.charts.fleet.maintenanceCostLabel,
                  color: theme.palette.error.main,
                },
              ]}
              height={300}
              margin={{ top: 20, bottom: 40, left: 50, right: 20 }}
              slotProps={{ bar: { rx: 4, ry: 4 } }}
              grid={{ horizontal: true }}
              sx={{
                "& .MuiChartsLegend-root": {
                  display: "none",
                },
              }}
            />
          </Box>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={cardStyle}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
            <Box
              sx={{
                p: 1,
                borderRadius: "10px",
                bgcolor: "info.main",
                color: "white",
                display: "flex",
              }}
            >
              <LocalGasStationIcon fontSize="small" />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: "-0.01em" }}>
              {dict.reports.charts.fleet.consumptionVsOdometer}
            </Typography>
          </Stack>

          <Box sx={{ width: "100%", height: 320 }}>
            <ScatterChart
              series={[
                {
                  label: dict.reports.charts.fleet.fleetLabel,
                  data: scatterData.map((d) => ({ x: d.x, y: d.y, id: d.id })),
                  color: theme.palette.info.main,
                },
              ]}
              xAxis={[{ 
                label: dict.reports.charts.fleet.odometerLabel,
                tickLabelStyle: { fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 },
                labelStyle: { fill: theme.palette.text.primary, fontSize: 13, fontWeight: 600 }
              }]}
              yAxis={[{ 
                label: dict.reports.charts.fleet.consumptionLabel,
                tickLabelStyle: { fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 },
                labelStyle: { fill: theme.palette.text.primary, fontSize: 13, fontWeight: 600 }
              }]}
              height={300}
              margin={{ top: 20, bottom: 50, left: 60, right: 20 }}
              grid={{ horizontal: true, vertical: true }}
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
