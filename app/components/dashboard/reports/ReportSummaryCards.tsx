"use client";
import { Card, Stack, Typography, Box, useTheme } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import { ReportsMetrics } from "@/app/lib/type/reports";
import KpiSkeleton from "@/app/components/skeletons/KpiSkeleton";
import { Dictionary } from "@/app/lib/language/language";
import { useCurrency } from "@/app/hooks/useCurrency";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon: React.ReactNode;
  color: string;
}

const MetricCard = ({
  title,
  value,
  change,
  positive = true,
  icon,
  color,
}: MetricCardProps) => {
  const theme = useTheme();

  // Resolve alpha tokens using the centralized theme utility
  const statusAlpha = theme.palette.getColorAlpha(color);
  const changeAlpha = positive
    ? theme.palette.success._alpha
    : theme.palette.error._alpha;

  return (
    <Card
      sx={{
        p: 3,
        height: "100%",
        borderRadius: "28px",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        background: theme.palette.background.paper_alpha.main_80,
        backdropFilter: "blur(20px)",
        border: `1px solid ${statusAlpha.main_15}`,
        boxShadow: `0 10px 40px -10px ${theme.palette.common.black_alpha.main_30}`,
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background: `linear-gradient(90deg, ${color}, ${statusAlpha.main_30})`,
          opacity: 0.8,
        },
        "&:hover": {
          transform: "translateY(-6px)",
          borderColor: statusAlpha.main_40,
          boxShadow: `0 20px 50px -12px ${statusAlpha.main_20}`,
          "&::before": {
            height: "6px",
            opacity: 1,
          },
        },
      }}
    >
      <Stack spacing={2.5}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box
            sx={{
              p: 1.8,
              borderRadius: "20px",
              bgcolor: statusAlpha.main_12,
              color: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `inset 0 0 10px ${statusAlpha.main_10}`,
            }}
          >
            {icon}
          </Box>
          {change && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                color: positive ? "success.main" : "error.main",
                bgcolor: changeAlpha.main_10,
                px: 1.2,
                py: 0.6,
                borderRadius: "10px",
                fontSize: "0.75rem",
                fontWeight: 800,
              }}
            >
              {positive ? "↑" : "↓"} {change}
            </Box>
          )}
        </Stack>

        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              color: "text.primary",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              mb: 1,
            }}
          >
            {value}
          </Typography>
          <Typography
            variant="overline"
            sx={{
              color: "text.primary_alpha.main_40",
              fontWeight: 800,
              letterSpacing: "0.1em",
              fontSize: "0.7rem",
              display: "block",
            }}
          >
            {title}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
};

export default function ReportSummaryCards({
  tabIndex,
  metrics,
  dict,
  loading = false,
}: {
  tabIndex: number;
  metrics?: ReportsMetrics | undefined;
  dict: Dictionary;
  loading?: boolean | undefined;
}) {
  const theme = useTheme();
  const { compact, format } = useCurrency();

  if (loading || !metrics) {
    return (
      <Box sx={{ mb: 4 }}>
        <KpiSkeleton count={4} />
      </Box>
    );
  }

  const getMetrics = () => {
    switch (tabIndex) {
      case 0:
        return [
          {
            title: dict.reports.metrics.totalShipments,
            value: metrics?.totalShipments.toLocaleString("en-US") || "0",
            icon: <LocalShippingIcon />,
            color: theme.palette.kpi.indigo,
          },
          {
            title: dict.reports.metrics.onTimeRate,
            value: `${metrics?.onTimeRate.toFixed(1)}%` || "0%",
            icon: <AccessTimeIcon />,
            color: theme.palette.kpi.emerald,
          },
          {
            title: dict.reports.metrics.avgDeliveryTime,
            value: dict.reports.metrics.daysUnits.replace("{count}", (metrics?.avgDeliveryTime || 0).toString()),
            icon: <TrendingUpIcon />,
            color: theme.palette.kpi.sky,
          },
          {
            title: dict.reports.metrics.pendingOrders,
            value: metrics?.pendingOrders?.toString() || "0",
            icon: <WarningAmberIcon />,
            color: theme.palette.kpi.amber,
          },
        ];
      case 1:
        return [
          {
            title: dict.reports.metrics.activeVehicles,
            value: metrics?.activeVehicles.toString() || "0",
            icon: <DirectionsCarIcon />,
            color: theme.palette.kpi.indigo,
          },
          {
            title: dict.reports.metrics.avgFuelCons,
            value: `${metrics?.avgFuelCons || 0}L/100km`,
            icon: <LocalShippingIcon />,
            color: theme.palette.kpi.emerald,
          },
          {
            title: dict.reports.metrics.maintenanceCost,
            value: format(metrics?.maintenanceCost || 0),
            icon: <AttachMoneyIcon />,
            color: theme.palette.kpi.error,
          },
        ];
      case 2:
        return [
          {
            title: dict.reports.metrics.totalInventoryValue,
            value: compact(metrics?.totalInventoryValue || 0),
            icon: <AttachMoneyIcon />,
            color: theme.palette.kpi.emerald,
          },
          {
            title: dict.reports.metrics.stockTurnover,
            value: metrics?.stockTurnover?.toString() || "0",
            icon: <TrendingUpIcon />,
            color: theme.palette.kpi.sky,
          },
          {
            title: dict.reports.metrics.deadStock,
            value: compact(metrics?.deadStock || 0),
            icon: <WarningAmberIcon />,
            color: theme.palette.kpi.error,
          },
          {
            title: "Warehouse Capacity",
            value: `${metrics?.warehouseCapacity || 0}%`,
            icon: <Inventory2Icon />,
            color: theme.palette.kpi.amber,
          },
        ];
      default:
        return [];
    }
  };

  const currentMetrics = getMetrics();

  return (
    <Box sx={{ mb: 4 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={3}
        alignItems="stretch"
      >
        {currentMetrics.map((metric, index) => (
          <Box key={index} sx={{ flex: 1 }}>
            <MetricCard {...metric} />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
