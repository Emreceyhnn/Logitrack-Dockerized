"use client";

import RoutesMainMap from "@/app/components/dashboard/routes/routesMainMap";
import RouteEfficiency from "@/app/components/dashboard/routes/routeEfficiency";
import RouteTable from "@/app/components/dashboard/routes/routeTable";
import { Box, Button, Stack, Typography, useTheme } from "@mui/material";
import { useCallback, useState, useMemo } from "react";
import AddIcon from "@mui/icons-material/Add";
import {
  RoutesPageActions,
  RouteWithRelations,
  RouteEfficiencyStats,
  MapRouteData,
  RoutesPageState,
} from "@/app/lib/type/routes";
import {
  useRoutesWithDashboard,
  useRouteMutations,
} from "@/app/hooks/useRoutes";
import EditRouteDialog from "@/app/components/dialogs/routes/edit-route-dialog";
import DeleteConfirmationDialog from "@/app/components/dialogs/deleteConfirmationDialog";
import { useUser } from "@/app/hooks/useUser";
import AddRouteDialog from "@/app/components/dialogs/routes/addRouteDialog";
import { AltRoute, Loop, CheckCircle, Warning } from "@mui/icons-material";
import KpiCards from "@/app/components/cards/KpiCards";
import QueryErrorState from "@/app/components/ui/QueryErrorState";
import { toast } from "sonner";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { logger } from "@/app/lib/logger";


export default function RoutesContent() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const dict = useDictionary();
  const { user } = useUser();
  const theme = useTheme();

  /* --------------------------------- STATE --------------------------------- */
  const [filters, setFilters] = useState<RoutesPageState["filters"]>({});
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
  });
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionRoute, setActionRoute] = useState<RouteWithRelations | null>(
    null
  );

  /* ---------------------------------- HOOKS --------------------------------- */
  const {
    data: dashboardData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useRoutesWithDashboard(
    pagination.page,
    pagination.pageSize,
    filters.status
  );

  const { deleteRoute: deleteMutation } = useRouteMutations();

  const routes = useMemo(() => dashboardData?.routes || [], [dashboardData]);
  const stats = dashboardData?.stats;
  const efficiency = dashboardData?.efficiency;
  const mapData = dashboardData?.mapData || [];

  /* --------------------------------- ACTIONS -------------------------------- */
  const noop = useCallback(async () => {}, []);

  const actions: RoutesPageActions = {
    fetchRoutes: async () => {},
    fetchStats: async () => {},
    fetchEfficiency: async () => {},
    fetchMapData: async () => {},
    refreshAll: noop,
    updateFilters: (newFilters: Partial<RoutesPageState["filters"]>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
    changePage: (newPage: number) =>
      setPagination((prev) => ({ ...prev, page: newPage })),
  };

  /* -------------------------------- HANDLERS -------------------------------- */
  const handlePageChange = (newPage: number) => {
    actions.changePage(newPage);
  };

  const handleEdit = (id: string) => {
    const route = (dashboardData?.routes || []).find((r: RouteWithRelations) => r.id === id);
    if (route) {
      setActionRoute(route);
      setEditOpen(true);
    }
  };

  const handleDelete = (id: string) => {
    const route = (dashboardData?.routes || []).find((r: RouteWithRelations) => r.id === id);
    if (route) {
      setActionRoute(route);
      setDeleteOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!actionRoute || !user) return;
    try {
      await deleteMutation.mutateAsync(actionRoute.id);
      setDeleteOpen(false);
    } catch (error) {
      logger.error("Failed to delete route:", error);
      toast.error(dict.common.actionFailed);
    }
  };

  const handleCloseAdd = () => {
    setAddDialogOpen(false);
  };

  /* --------------------------------- KPI --------------------------------- */
  const kpiItems = useMemo(() => [
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
      color: (stats?.delayed || 0) > 0 ? theme.palette.error.main : theme.palette.success.main,
      trend: dashboardData?.statsTrends?.delayed,
    },
  ], [stats, dashboardData?.statsTrends, theme, dict]);

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
          onClick={() => setAddDialogOpen(true)}
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
        <RouteTable
          routes={routes}
          // Previous rows survive a filter/sort change via keepPreviousData;
          // only blank the table when there is genuinely nothing to show.
          loading={isLoading}
          refreshing={isFetching}
          pagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: dashboardData?.totalCount || 0,
          }}
          onPageChange={handlePageChange}
          onSelect={() => {}}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={noop}
          filters={{ status: filters.status, search: filters.search }}
          onFilterChange={actions.updateFilters}
        />
        )}
      </Stack>

      <EditRouteDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        route={actionRoute}
        onSuccess={noop}
      />

      <DeleteConfirmationDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={dict.common.delete}
        description={dict.routes.deleteDesc}
        loading={deleteMutation.isPending}
      />
      <AddRouteDialog open={addDialogOpen} onClose={handleCloseAdd} onSuccess={noop} />
    </Box>
  );
}
