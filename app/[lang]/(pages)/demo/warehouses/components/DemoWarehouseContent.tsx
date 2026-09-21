"use client";

import { useCallback, useState, useMemo } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import WarehouseListTable from "@/app/components/dashboard/warehouse/warehouseList";
import RecentStockMovements from "@/app/components/dashboard/warehouse/recentStockMovements";
import AddIcon from "@mui/icons-material/Add";
import { toast } from "sonner";
import { useDemoWarehousesWithDashboard } from "@/app/hooks/demo/useDemoWarehouses";
import { useTheme } from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

import {
  Warehouse as WarehouseIcon,
  Inventory2,
  ListAlt,
  Storage,
  Category,
} from "@mui/icons-material";
import KpiCards from "@/app/components/cards/KpiCards";
import QueryErrorState from "@/app/components/ui/QueryErrorState";

/**
 * Demo-only counterpart to WarehouseContent — same table/KPI/movements layout,
 * backed by the fixed demo dataset. Add/Edit/Delete/details all just show a
 * "disabled in demo" toast; no dialog is ever mounted.
 */
export default function DemoWarehouseContent() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const theme = useTheme();
  const dict = useDictionary();

  /* --------------------------------- STATES --------------------------------- */
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });

  /* ---------------------------------- HOOKS --------------------------------- */
  const {
    data: dashboardData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useDemoWarehousesWithDashboard();

  /* --------------------------------- ACTIONS -------------------------------- */
  const notifyDisabled = useCallback(() => {
    toast.info(dict.toasts.demoActionDisabled);
  }, [dict]);

  // Memoised so it keeps a stable identity across renders (react-hooks
  // exhaustive-deps).
  const warehouses = useMemo(
    () => dashboardData?.warehouses || [],
    [dashboardData?.warehouses]
  );
  const stats = dashboardData?.stats || null;
  const recentMovements = dashboardData?.recentMovements || [];

  /* --------------------------------- KPI --------------------------------- */
  const kpiItems = useMemo(
    () => [
      {
        label: dict.warehouses.kpi.totalWarehouses,
        value: stats?.totalWarehouses || 0,
        icon: <WarehouseIcon />,
        color: theme.palette.primary.main,
        trend: dashboardData?.statsTrends?.totalWarehouses,
      },
      {
        label: dict.warehouses.kpi.inventorySkus,
        value: stats?.totalSkus?.toLocaleString("en-US") || 0,
        icon: <Inventory2 />,
        color: theme.palette.info.main,
      },
      {
        label: dict.warehouses.kpi.totalItems,
        value: stats?.totalItems?.toLocaleString("en-US") || 0,
        icon: <ListAlt />,
        color: theme.palette.secondary.main,
      },
      {
        label: dict.warehouses.kpi.palletCapacity,
        value: stats?.totalCapacityPallets?.toLocaleString("en-US") || 0,
        icon: <Category />,
        color: theme.palette.warning.main,
      },
      {
        label: dict.warehouses.kpi.stockedVolume,
        value: `${stats?.totalCapacityVolume?.toLocaleString("en-US") || 0} M³`,
        icon: <Storage />,
        color: theme.palette.success.main,
      },
    ],
    [stats, dashboardData?.statsTrends, theme, dict]
  );

  return (
    <Box position={"relative"} p={4} width={"100%"}>
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
            {dict.warehouses.title}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {dict.warehouses.subtitle}
          </Typography>
        </Box>
        <Button
          data-tour="warehouse-add"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={notifyDisabled}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          {dict.warehouses.addWarehouse}
        </Button>
      </Stack>

      <Box mb={2}>
        <KpiCards kpis={kpiItems} loading={isLoading} />
      </Box>

      <Stack mt={2} data-tour="warehouse-table">
        {isError ? (
          <QueryErrorState onRetry={() => refetch()} />
        ) : (
          <WarehouseListTable
            warehouses={warehouses}
            loading={isLoading}
            refreshing={isFetching}
            onSelect={notifyDisabled}
            onEdit={notifyDisabled}
            onDelete={notifyDisabled}
            onDetails={notifyDisabled}
            meta={{
              page: pagination.page,
              limit: pagination.pageSize,
              total: dashboardData?.totalCount || 0,
            }}
            onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            onLimitChange={(pageSize) =>
              setPagination({ page: 1, pageSize: pageSize })
            }
          />
        )}
      </Stack>

      <Stack direction={{ xs: "column", xl: "row" }} spacing={4} sx={{ mt: 2 }}>
        <RecentStockMovements movements={recentMovements} loading={isLoading} />
      </Stack>
    </Box>
  );
}
