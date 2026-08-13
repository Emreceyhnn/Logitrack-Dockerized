"use client";

import ActionRequiredCard from "@/app/components/dashboard/overview/actionRequiredCard";
import QueryErrorState from "@/app/components/ui/QueryErrorState";
import {
  Box,
  Divider,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Skeleton,
  useTheme,
} from "@mui/material";
import CustomCard from "@/app/components/cards/card";
import DailyOperationsCard from "@/app/components/dashboard/overview/dailyOperations";
import WarehouseCapacityCard from "@/app/components/dashboard/overview/warehouseCapacityCard";
import AlertInventoryCard from "@/app/components/dashboard/overview/inventoryCard";
import dynamic from "next/dynamic";
import ChartSkeleton from "@/app/components/skeletons/ChartSkeleton";
import PicksPacksDailyCard from "@/app/components/dashboard/overview/picsPacksDailyCard";

// @mui/x-charts is ~283 kB per route when imported statically. Loading the
// chart cards lazily keeps it out of this route's First Load JS.
const ShipmentOnStatusCard = dynamic(
  () => import("@/app/components/dashboard/overview/shipmentsByStatusCard"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const ShipmentVolumeCard = dynamic(
  () => import("@/app/components/dashboard/overview/onTimeTrends"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
import OverviewMapCard from "@/app/components/dashboard/overview/overViewMapCard";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useDictionary, useLanguage } from "@/app/lib/language/DictionaryContext";
import { buildLocalizedHref } from "@/app/lib/language/navigation";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useOverviewData } from "@/app/hooks/useOverview";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { MapData } from "@/app/lib/type/overview";
import LocalShipping from "@mui/icons-material/LocalShipping";
import AccessTime from "@mui/icons-material/AccessTime";
import DirectionsCar from "@mui/icons-material/DirectionsCar";
import Build from "@mui/icons-material/Build";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Person from "@mui/icons-material/Person";
import Warehouse from "@mui/icons-material/Warehouse";
import Inventory from "@mui/icons-material/Inventory";
import KpiCards from "@/app/components/cards/KpiCards";
import { formatDisplayTime } from "@/app/lib/utils/date";
import GettingStartedCard from "@/app/components/dashboard/overview/GettingStartedCard";
import { useGuidedTour } from "@/app/lib/context/GuidedTourContext";
import { getOverviewTourSteps } from "@/app/components/guidedTour/tourSteps";

// localStorage key marking the overview first-run tour as already shown, so it
// auto-starts at most once per browser. Manually re-runnable via the sidebar
// Help button / the checklist's "Take a tour" regardless of this flag.
const OVERVIEW_TOUR_SEEN_KEY = "logitrack-tour-seen:overview";

export default function OverviewContent() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const theme = useTheme();
  const dict = useDictionary();
  const { lang } = useLanguage();

  /* ---------------------------------- HOOKS --------------------------------- */
  const { data, isLoading, isError, refetch } = useOverviewData();
  const dateSettings = useDateSettings();
  const { startTour } = useGuidedTour();
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLastRefreshed(new Date());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = async () => {
    await refetch();
    setLastRefreshed(new Date());
  };

  /* ----------------------------------- KPI ---------------------------------- */
  // Drill-down targets: each tile links to the filtered list that answers
  // "which ones?" — e.g. Delayed → the shipments list pre-filtered to DELAYED.
  const kpiItems = useMemo(() => {
    const shipmentsBase = buildLocalizedHref("/shipments", lang);
    const to = (path: string) => buildLocalizedHref(path, lang);
    return [
      {
        label: dict.overview.activeShipments,
        value: data.stats?.activeShipments || 0,
        icon: <LocalShipping />,
        color: theme.palette.primary.main,
        trend: data.statsTrends?.activeShipments,
        href: `${shipmentsBase}?status=IN_TRANSIT`,
      },
      {
        label: dict.overview.delayedShipments,
        value: data.stats?.delayedShipments || 0,
        icon: <AccessTime />,
        color:
          (data.stats?.delayedShipments || 0) > 0
            ? theme.palette.error.main
            : theme.palette.success.main,
        trend: data.statsTrends?.delayedShipments,
        href: `${shipmentsBase}?status=DELAYED`,
      },
      {
        label: dict.overview.vehiclesOnTrip,
        value: data.stats?.vehiclesOnTrip || 0,
        icon: <DirectionsCar />,
        color: theme.palette.info.main,
        trend: data.statsTrends?.vehiclesOnTrip,
        href: to("/vehicle"),
      },
      {
        label: dict.overview.vehiclesInService,
        value: data.stats?.vehiclesInService || 0,
        color: theme.palette.warning.main,
        icon: <Build />,
        trend: data.statsTrends?.vehiclesInService,
        href: to("/vehicle"),
      },
      {
        label: dict.overview.availableVehicles,
        value: data.stats?.availableVehicles || 0,
        icon: <CheckCircle />,
        color: theme.palette.success.main,
        trend: data.statsTrends?.availableVehicles,
        href: to("/vehicle"),
      },
      {
        label: dict.overview.activeDrivers,
        value: data.stats?.activeDrivers || 0,
        icon: <Person />,
        color: theme.palette.kpi.violet,
        trend: data.statsTrends?.activeDrivers,
        href: to("/drivers"),
      },
      {
        label: dict.overview.warehouses,
        value: data.stats?.warehouses || 0,
        icon: <Warehouse />,
        color: theme.palette.kpi.indigo,
        trend: data.statsTrends?.warehouses,
        href: to("/warehouses"),
      },
      {
        label: dict.overview.inventorySkus,
        value: data.stats?.inventorySkus || 0,
        icon: <Inventory />,
        color: theme.palette.kpi.sky,
        trend: data.statsTrends?.inventorySkus,
        href: to("/inventory"),
      },
    ];
  }, [data.stats, data.statsTrends, theme, dict, lang]);

  const mapData: MapData[] = useMemo(
    () =>
      (data.mapData || []).map((item: MapData) => ({
        ...item,
        type: (["W", "V", "C"].includes(item.type) ? item.type : "W") as
          | "W"
          | "V"
          | "C",
      })),
    [data.mapData]
  );

  /* ----------------------------- EMPTY / ONBOARDING ------------------------- */
  // Per-entity presence, derived from the KPI stats. Total vehicles spans all
  // three vehicle states; drivers uses the active count (the only one exposed).
  const stats = data.stats;
  const hasVehicles =
    !!stats &&
    (stats.vehiclesOnTrip || 0) +
      (stats.vehiclesInService || 0) +
      (stats.availableVehicles || 0) >
      0;
  const hasDrivers = !!stats && (stats.activeDrivers || 0) > 0;
  const hasShipments =
    !!stats &&
    (stats.activeShipments || 0) + (stats.delayedShipments || 0) > 0;

  // "Brand-new company" = no fleet, no drivers, no shipments yet. Only then do
  // we replace the all-zero dashboard with the getting-started checklist.
  const isEmptyCompany =
    !isLoading && !isError && !hasVehicles && !hasDrivers && !hasShipments;

  const runTour = useCallback(() => {
    const steps = getOverviewTourSteps(dict as Record<string, unknown>, {
      isEmpty: isEmptyCompany,
    });
    if (steps.length > 0) {
      // Let any freshly rendered content settle so the [data-tour] targets
      // exist before the overlay measures them.
      setTimeout(() => startTour("overview", steps), 200);
    }
  }, [dict, startTour, isEmptyCompany]);

  // First-visit auto-tour: fire once per browser, after data has loaded so the
  // highlighted elements are mounted. Subsequent visits stay quiet; the tour is
  // still re-runnable from the checklist or the sidebar Help button.
  useEffect(() => {
    if (isLoading || isError) return;
    let seen = false;
    try {
      seen = localStorage.getItem(OVERVIEW_TOUR_SEEN_KEY) === "1";
    } catch {
      // localStorage unavailable (private mode) — skip the auto-tour rather
      // than risk showing it on every load.
      seen = true;
    }
    if (seen) return;
    try {
      localStorage.setItem(OVERVIEW_TOUR_SEEN_KEY, "1");
    } catch {
      /* best-effort persistence */
    }
    runTour();
  }, [isLoading, isError, runTour]);

  return (
    <Box p={4} width={"100%"}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Typography
          data-tour="overview-title"
          component="h1"
          sx={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-2%",
          }}
        >
          {dict.overview.title}
        </Typography>

        <Stack direction="row" alignItems="center" spacing={1}>
          {lastRefreshed && (
            <Typography variant="caption" color="text.secondary">
              {dict.common.lastUpdated}:{" "}
              {formatDisplayTime(lastRefreshed, dateSettings)}
            </Typography>
          )}
          <Tooltip title={dict.common.refreshDashboard}>
            <IconButton
              size="small"
              onClick={handleRefresh}
              disabled={isLoading}
              sx={{
                animation: isLoading ? "spin 1s linear infinite" : "none",
                "@keyframes spin": {
                  "0%": { transform: "rotate(0deg)" },
                  "100%": { transform: "rotate(360deg)" },
                },
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      <Divider sx={{ mb: 3 }} />

      <Box data-tour="kpi-cards">
        <KpiCards kpis={kpiItems} loading={isLoading} />
      </Box>

      {isError && <QueryErrorState onRetry={handleRefresh} />}

      {/* First-run checklist replaces the all-zero charts for a new company. */}
      {isEmptyCompany && (
        <Box sx={{ mt: 3 }} data-tour="getting-started">
          <GettingStartedCard
            hasVehicles={hasVehicles}
            hasDrivers={hasDrivers}
            hasShipments={hasShipments}
            onStartTour={runTour}
          />
        </Box>
      )}

      <Box
        sx={{
          display: isError || isEmptyCompany ? "none" : "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(3, 1fr)",
            lg: "repeat(12, 1fr)",
          },
          gap: 3,
          mt: 3,
        }}
      >
        {isLoading ? (
          <>
            {Array.from(new Array(2)).map((_, i) => (
              <Box
                key={`skel-1-${i}`}
                sx={{
                  gridColumn: { xs: "span 1", md: "span 1", lg: "span 6" },
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CustomCard sx={{ height: 320, p: 2 }}>
                  <Skeleton
                    variant="text"
                    width="60%"
                    height={32}
                    sx={{ mb: 2 }}
                  />
                  <Skeleton
                    variant="rounded"
                    height={180}
                    sx={{ borderRadius: 2 }}
                  />
                </CustomCard>
              </Box>
            ))}

            {Array.from(new Array(3)).map((_, i) => (
              <Box
                key={`skel-2-${i}`}
                sx={{
                  gridColumn: { xs: "span 1", md: "span 1", lg: "span 4" },
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CustomCard sx={{ height: 320, p: 2 }}>
                  <Skeleton
                    variant="text"
                    width="50%"
                    height={32}
                    sx={{ mb: 2 }}
                  />
                  <Skeleton
                    variant="rounded"
                    height="100%"
                    sx={{ borderRadius: 2 }}
                  />
                </CustomCard>
              </Box>
            ))}

            <Box
              sx={{
                gridColumn: { xs: "span 1", md: "span 3", lg: "span 8" },
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CustomCard sx={{ height: 380, p: 2 }}>
                <Skeleton
                  variant="text"
                  width="30%"
                  height={32}
                  sx={{ mb: 2 }}
                />
                <Skeleton
                  variant="rounded"
                  height={280}
                  sx={{ borderRadius: 2 }}
                />
              </CustomCard>
            </Box>
            <Box
              sx={{
                gridColumn: { xs: "span 1", md: "span 3", lg: "span 4" },
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CustomCard sx={{ height: 380, p: 2 }}>
                <Skeleton
                  variant="text"
                  width="40%"
                  height={32}
                  sx={{ mb: 2 }}
                />
                <Skeleton
                  variant="rounded"
                  height={280}
                  sx={{ borderRadius: 2 }}
                />
              </CustomCard>
            </Box>

            <Box
              sx={{
                gridColumn: { xs: "span 1", md: "span 3", lg: "span 12" },
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CustomCard sx={{ height: 400, p: 2 }}>
                <Skeleton
                  variant="rectangular"
                  height="100%"
                  sx={{ borderRadius: 2 }}
                />
              </CustomCard>
            </Box>
          </>
        ) : (
          <>
            <Box
              data-tour="daily-operations"
              sx={{
                gridColumn: { xs: "span 1", md: "span 1", lg: "span 6" },
                display: "flex",
                flexDirection: "column",
              }}
            >
              <DailyOperationsCard values={data.dailyOps} />
            </Box>
            <Box
              data-tour="action-required"
              sx={{
                gridColumn: { xs: "span 1", md: "span 1", lg: "span 6" },
                display: "flex",
                flexDirection: "column",
              }}
            >
              <ActionRequiredCard alerts={data.alerts} />
            </Box>

            <Box
              sx={{
                gridColumn: { xs: "span 1", md: "span 1", lg: "span 4" },
                display: "flex",
                flexDirection: "column",
              }}
            >
              <ShipmentOnStatusCard values={data.shipmentStatus} />
            </Box>
            <Box
              sx={{
                gridColumn: { xs: "span 1", md: "span 1", lg: "span 4" },
                display: "flex",
                flexDirection: "column",
              }}
            >
              <WarehouseCapacityCard values={data.warehouseCapacity} />
            </Box>
            <Box
              sx={{
                gridColumn: { xs: "span 1", md: "span 1", lg: "span 4" },
                display: "flex",
                flexDirection: "column",
              }}
            >
              <PicksPacksDailyCard values={data.picksAndPacks} />
            </Box>

            <Box
              sx={{
                gridColumn: { xs: "span 1", md: "span 3", lg: "span 8" },
                display: "flex",
                flexDirection: "column",
              }}
            >
              <ShipmentVolumeCard values={data.shipmentVolume} />
            </Box>
            <Box
              sx={{
                gridColumn: { xs: "span 1", md: "span 3", lg: "span 4" },
                display: "flex",
                flexDirection: "column",
              }}
            >
              <AlertInventoryCard inventory={data.lowStockItems} />
            </Box>

            <Box
              data-tour="overview-map"
              sx={{
                gridColumn: { xs: "span 1", md: "span 3", lg: "span 12" },
                display: "flex",
                flexDirection: "column",
              }}
            >
              <OverviewMapCard stats={mapData} />
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
