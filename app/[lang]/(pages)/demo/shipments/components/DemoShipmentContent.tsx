"use client";

import DemoShipmentTable from "./DemoShipmentTable";
import dynamic from "next/dynamic";
import ChartSkeleton from "@/app/components/skeletons/ChartSkeleton";

// @mui/x-charts is ~283 kB per route when imported statically. Loading the
// analytics block lazily keeps it out of this route's First Load JS.
const ShipmentAnalytics = dynamic(
  () => import("@/app/components/dashboard/shipments/ShipmentAnalytics"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
import { Box, Button, Stack, Typography, useTheme } from "@mui/material";
import { useCallback, useState, useMemo } from "react";
import {
  ShipmentPageState,
  ShipmentPageActions,
} from "@/app/lib/type/shipment";
import { useDemoShipmentsWithDashboard } from "@/app/hooks/demo/useDemoShipments";
import AddIcon from "@mui/icons-material/Add";

import {
  LocalShipping,
  AccessTime,
  DirectionsBoat,
  Inventory,
} from "@mui/icons-material";
import KpiCards from "@/app/components/cards/KpiCards";
import QueryErrorState from "@/app/components/ui/QueryErrorState";
import { toast } from "sonner";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

// Stable empty fallbacks. A fresh `[]`/`{}` literal is a new reference every
// render, which defeats the memoisation of `state` below and of every child
// that depends on these fields.
const EMPTY_SHIPMENTS: ShipmentPageState["shipments"] = [];
const EMPTY_VOLUME_HISTORY: ShipmentPageState["volumeHistory"] = [];
const EMPTY_STATUS_DISTRIBUTION: ShipmentPageState["statusDistribution"] = [];
const EMPTY_FILTERS: ShipmentPageState["filters"] = {};

/**
 * Demo-only counterpart to ShipmentContent — same table/KPI/chart layout,
 * backed by the fixed demo dataset. Add/Edit/Delete buttons stay visible for
 * visual fidelity but never open a real dialog or call a real mutation; they
 * just show a "disabled in demo" toast. No AddShipmentDialog,
 * EditShipmentDialog, or DeleteConfirmationDialog are ever mounted.
 */
export default function DemoShipmentContent() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const theme = useTheme();
  const dict = useDictionary();

  /* ---------------------------------- STATES --------------------------------- */
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
  });
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(
    null
  );

  /* ---------------------------------- HOOKS --------------------------------- */
  const {
    data: dashboardData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useDemoShipmentsWithDashboard();

  /* --------------------------------- ACTIONS -------------------------------- */
  const refreshAll = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const notifyDisabled = useCallback(() => {
    toast.info(dict.toasts.demoActionDisabled);
  }, [dict]);

  const actions: ShipmentPageActions = useMemo(
    () => ({
      fetchShipments: async () => {},
      fetchStats: async () => {},
      fetchCharts: async () => {},
      refreshAll,
      selectShipment: (id: string | null) => setSelectedShipmentId(id),
      updateFilters: () => {
        // Filters are inert in the demo — the dataset is fixed. Surface the
        // same "disabled" toast rather than silently no-op-ing.
        notifyDisabled();
      },
    }),
    [refreshAll, notifyDisabled]
  );

  // Spreading `actions` inline in JSX minted a new object on every render,
  // which propagated straight back into the table's memoised callbacks.
  const tableActions = useMemo(
    () => ({ ...actions, onEdit: notifyDisabled, onDelete: notifyDisabled }),
    [actions, notifyDisabled]
  );

  /* -------------------------- COMPATIBILITY LAYER --------------------------- */
  const state: ShipmentPageState = useMemo(
    () => ({
      shipments: dashboardData?.shipments || EMPTY_SHIPMENTS,
      stats: dashboardData?.stats || null,
      totalCount: dashboardData?.totalCount || 0,
      volumeHistory: dashboardData?.volumeHistory || EMPTY_VOLUME_HISTORY,
      statusDistribution:
        dashboardData?.statusDistribution || EMPTY_STATUS_DISTRIBUTION,
      selectedShipmentId,
      filters: EMPTY_FILTERS,
      loading: isLoading,
      refreshing: isFetching,
      error: isError ? "error" : null,
    }),
    [dashboardData, selectedShipmentId, isLoading, isFetching, isError]
  );

  /* --------------------------------- RENDER --------------------------------- */

  const kpiItems = useMemo(() => [
    {
      label: dict.shipments.dashboard.totalShipments,
      value: state.stats?.total || 0,
      icon: <Inventory />,
      color: theme.palette.primary.main,
      trend: dashboardData?.statsTrends?.total,
    },
    {
      label: dict.shipments.dashboard.activeShipments,
      value: state.stats?.active || 0,
      icon: <LocalShipping />,
      color: theme.palette.info.main,
      trend: dashboardData?.statsTrends?.active,
    },
    {
      label: dict.shipments.dashboard.delayedShipments,
      value: state.stats?.delayed || 0,
      icon: <AccessTime />,
      color:
        (state.stats?.delayed || 0) > 0
          ? theme.palette.error.main
          : theme.palette.success.main,
      trend: dashboardData?.statsTrends?.delayed,
    },
    {
      label: dict.shipments.dashboard.inTransit,
      value: state.stats?.inTransit || 0,
      icon: <DirectionsBoat />,
      color: theme.palette.success.main,
      trend: dashboardData?.statsTrends?.inTransit,
    },
  ], [state.stats, dashboardData?.statsTrends, theme, dict]);

  return (
    <div style={{ width: "100%" }}>
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
            {dict.shipments.title}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {dict.shipments.subtitle}
          </Typography>
        </Box>
        <Button
          data-tour="shipment-add"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={notifyDisabled}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          {dict.shipments.addShipment}
        </Button>
      </Stack>

      <KpiCards kpis={kpiItems} loading={isLoading} />

      {isError ? (
        <Box mt={2}>
          <QueryErrorState onRetry={() => refetch()} />
        </Box>
      ) : (
        <>
          <Stack mt={2} data-tour="shipment-table">
            <DemoShipmentTable
              state={state}
              actions={tableActions}
              pagination={{
                page: pagination.page,
                pageSize: pagination.pageSize,
                total: state.totalCount,
              }}
              onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
              onLimitChange={(pageSize) =>
                setPagination({ page: 1, pageSize: pageSize })
              }
            />
          </Stack>

          <ShipmentAnalytics state={state} actions={actions} />
        </>
      )}
      </Box>
    </div>
  );
}
