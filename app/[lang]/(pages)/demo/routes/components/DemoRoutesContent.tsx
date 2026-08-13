"use client";

import RoutesMainMap from "@/app/components/dashboard/routes/routesMainMap";
import RouteEfficiency from "@/app/components/dashboard/routes/routeEfficiency";
import DemoRouteTable from "./DemoRouteTable";
import { Box, Button, Stack, Typography, useTheme } from "@mui/material";
import { useCallback, useState, useMemo } from "react";
import AddIcon from "@mui/icons-material/Add";
import {
  RouteEfficiencyStats,
  MapRouteData,
  RoutesPageState,
  RouteWithRelations,
} from "@/app/lib/type/routes";
import RouteDialog from "@/app/components/dialogs/routes";
import { useDemoRoutesWithDashboard } from "@/app/hooks/demo/useDemoRoutes";
import { AltRoute, Loop, CheckCircle, Warning } from "@mui/icons-material";
import KpiCards from "@/app/components/cards/KpiCards";
import QueryErrorState from "@/app/components/ui/QueryErrorState";
import { toast } from "sonner";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

/**
 * Demo-only counterpart to RoutesContent — same map/efficiency/table/KPI
 * layout, backed by the fixed demo dataset. Add/Edit/Delete and row status
 * actions never open a real dialog or call a real mutation; the table is the
 * DemoRouteTable fork (no updateRouteStatus, no details dialog) and every
 * action routes through the disabled-toast.
 */
export default function DemoRoutesContent() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const dict = useDictionary();
  const theme = useTheme();

  /* --------------------------------- STATE --------------------------------- */
  const [filters, setFilters] = useState<RoutesPageState["filters"]>({});
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [selectedRoute, setSelectedRoute] = useState<RouteWithRelations | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);

  /* ---------------------------------- HOOKS --------------------------------- */
  const {
    data: dashboardData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useDemoRoutesWithDashboard();

  const routes = useMemo(() => dashboardData?.routes || [], [dashboardData]);
  const stats = dashboardData?.stats;
  const efficiency = dashboardData?.efficiency;
  const mapData = dashboardData?.mapData || [];

  /* --------------------------------- ACTIONS -------------------------------- */
  const refreshAll = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const notifyDisabled = useCallback(() => {
    toast.info(dict.toasts.demoActionDisabled);
  }, [dict]);

  const handleOpenDetails = useCallback((route: RouteWithRelations) => {
    setSelectedRoute(route);
    setDetailOpen(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailOpen(false);
    setSelectedRoute(null);
  }, []);

  const updateFilters = useCallback(
    (newFilters: Partial<RoutesPageState["filters"]>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
    []
  );

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  /* --------------------------------- KPI --------------------------------- */
  const kpiItems = useMemo(
    () => [
      {
        label: dict.routes.active,
        value: stats?.active || 0,
        icon: <AltRoute />,
        color: theme.palette.primary.main,
        trend: dashboardData?.statsTrends?.active,
      },
      {
        label: dict.routes.inProgress,
        value: stats?.inProgress || 0,
        icon: <Loop />,
        color: theme.palette.info.main,
      },
      {
        label: dict.routes.completedToday,
        value: stats?.completedToday || 0,
        icon: <CheckCircle />,
        color: theme.palette.success.main,
        trend: dashboardData?.statsTrends?.completedToday,
      },
      {
        label: dict.routes.delayed,
        value: stats?.delayed || 0,
        icon: <Warning />,
        color:
          (stats?.delayed || 0) > 0
            ? theme.palette.error.main
            : theme.palette.success.main,
        trend: dashboardData?.statsTrends?.delayed,
      },
    ],
    [stats, dashboardData?.statsTrends, theme, dict]
  );

  return (
    <Box position={"relative"} p={{ xs: 2, md: 4 }} width={"100%"}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box>
          <Typography
            variant="h4" component="h1"
            sx={{ fontWeight: 800, color: "text.primary", letterSpacing: -0.5 }}
          >
            {dict.routes.title}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {dict.routes.subtitle}
          </Typography>
        </Box>
        <Button
          data-tour="route-add"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={notifyDisabled}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          {dict.routes.addRoute}
        </Button>
      </Stack>
      <KpiCards kpis={kpiItems} loading={isLoading} />

      <Stack mt={2} direction={"row"} spacing={3}>
        <RoutesMainMap mapData={mapData as MapRouteData[]} loading={isLoading} />
        <RouteEfficiency
          data={efficiency as RouteEfficiencyStats}
          loading={isLoading}
        />
      </Stack>
      <Stack mt={2} data-tour="route-table">
        {isError ? (
          <QueryErrorState onRetry={() => refetch()} />
        ) : (
          <DemoRouteTable
            routes={routes}
            loading={isLoading}
            refreshing={isFetching}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: dashboardData?.totalCount || 0,
            }}
            onPageChange={handlePageChange}
            onSelect={() => {}}
            onEdit={notifyDisabled}
            onDelete={notifyDisabled}
            onAction={notifyDisabled}
            onDetails={handleOpenDetails}
            onRefresh={refreshAll}
            filters={{ status: filters.status, search: filters.search }}
            onFilterChange={updateFilters}
          />
        )}
      </Stack>

      <RouteDialog
        key={selectedRoute?.id}
        open={detailOpen}
        onClose={handleCloseDetails}
        route={selectedRoute}
      />
    </Box>
  );
}
