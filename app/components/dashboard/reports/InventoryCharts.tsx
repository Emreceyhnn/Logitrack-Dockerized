import { PieChart, pieArcLabelClasses } from "@mui/x-charts/PieChart";
import { Card, Stack, Typography, Box, useTheme, Grid } from "@mui/material";
import { ReportsInventoryCategory } from "@/app/lib/type/reports";
import { Dictionary } from "@/app/lib/language/language";
import CategoryIcon from "@mui/icons-material/Category";
import InventoryIcon from "@mui/icons-material/Inventory";

interface InventoryChartsProps {
  data: Record<string, ReportsInventoryCategory>;
  dict: Dictionary;
}

export default function InventoryCharts({ data, dict }: InventoryChartsProps) {
  const theme = useTheme();

  if (!data) return null;

  // Convert Record to Array for charts
  const categories = Object.keys(data);
  const inventoryDict = dict.reports.charts.inventoryCategories as Record<string, string>;

  const chartData = categories.map((cat) => {
    const dictKey = Object.keys(inventoryDict).find(
      (k) => k.toLowerCase() === cat.toLowerCase()
    );
    
    return {
      category: dictKey ? inventoryDict[dictKey] : cat.replace(/_/g, " "),
      value: data[cat]?.value ?? 0,
      count: data[cat]?.count ?? 0,
    };
  });

  const valuePieData = chartData.map((item, index) => ({
    id: index,
    value: item.value,
    label: item.category ?? "",
  }));

  const countPieData = chartData.map((item, index) => ({
    id: index,
    value: item.count,
    label: item.category ?? "",
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
                bgcolor: "success.main",
                color: "white",
                display: "flex",
              }}
            >
              <InventoryIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: "-0.01em" }}>
                {dict.reports.charts.inventory.valueTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {dict.reports.charts.inventory.valueSubtitle}
              </Typography>
            </Box>
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
                    valuePieData.length > 0
                      ? valuePieData
                      : [
                          {
                            id: 0,
                            value: 1,
                            label: dict.common.noData,
                            color: "#ccc",
                          },
                        ],
                  highlightScope: { fade: "global", highlight: "item" },
                  faded: {
                    innerRadius: 50,
                    additionalRadius: -20,
                    color: "gray",
                  },
                  innerRadius: 60,
                  outerRadius: 110,
                  paddingAngle: 3,
                  cornerRadius: 8,
                },
              ]}
              height={300}
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
                bgcolor: "primary.main",
                color: "white",
                display: "flex",
              }}
            >
              <CategoryIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: "-0.01em" }}>
                {dict.reports.charts.inventory.countTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {dict.reports.charts.inventory.countSubtitle}
              </Typography>
            </Box>
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
                    countPieData.length > 0
                      ? countPieData
                      : [
                          {
                            id: 0,
                            value: 1,
                            label: dict.common.noData,
                            color: "#ccc",
                          },
                        ],
                  highlightScope: { fade: "global", highlight: "item" },
                  faded: {
                    innerRadius: 50,
                    additionalRadius: -20,
                    color: "gray",
                  },
                  innerRadius: 60,
                  outerRadius: 110,
                  paddingAngle: 3,
                  cornerRadius: 8,
                },
              ]}
              height={300}
              colors={[
                theme.palette.primary.main, 
                theme.palette.success.main, 
                theme.palette.warning.main, 
                theme.palette.error.main,
                theme.palette.info.main
              ]}
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
          </Box>
        </Card>
      </Grid>
    </Grid>
  );
}
