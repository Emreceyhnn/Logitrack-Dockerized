"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Box, Button, Stack, Typography } from "@mui/material";
import WarehouseListTable from "@/app/components/dashboard/warehouse/warehouseList";
import RecentStockMovements from "@/app/components/dashboard/warehouse/recentStockMovements";
import AddIcon from "@mui/icons-material/Add";
import { toast } from "sonner";
import {
  WarehousePageActions,
  WarehouseWithRelations,
} from "@/app/lib/type/warehouse";
import {
  useWarehousesWithDashboard,
  useWarehouseMutations,
  useWarehouse,
} from "@/app/hooks/useWarehouses";
import AddWarehouseDialog from "@/app/components/dialogs/warehouse/addWarehouseDialog";
import WarehouseDetailsDialog from "@/app/components/dialogs/warehouse/warehouseDetailsDialog";
import EditWarehouseDialog from "@/app/components/dialogs/warehouse/editWarehouseDialog";
import DeleteConfirmationDialog from "@/app/components/dialogs/deleteConfirmationDialog";
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
import { logger } from "@/app/lib/logger";


export default function WarehouseContent() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const theme = useTheme();
  const dict = useDictionary();

  /* --------------------------------- STATES --------------------------------- */

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
  });
  const searchParams = useSearchParams();
  const warehouseIdFromUrl = searchParams.get("id");

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(
    null
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [warehouseToEditId, setWarehouseToEditId] = useState<string | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [warehouseToDeleteId, setWarehouseToDeleteId] = useState<string | null>(
    null
  );

  /* ---------------------------------- HOOKS --------------------------------- */
  const {
    data: dashboardData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useWarehousesWithDashboard(pagination.page, pagination.pageSize);

  const { deleteWarehouse: deleteMutation } = useWarehouseMutations();

  // Auto-open details dialog when navigating from overview map with ?id=
  useEffect(() => {
    if (warehouseIdFromUrl && !isLoading) {
      setSelectedWarehouseId(warehouseIdFromUrl);
      setDetailsDialogOpen(true);
    }
  }, [warehouseIdFromUrl, isLoading]);

  /* --------------------------------- ACTIONS -------------------------------- */
  const noop = useCallback(async () => {}, []);

  const actions: WarehousePageActions = useMemo(
    () => ({
      fetchWarehouses: async () => {},
      fetchStats: async () => {},
      fetchRecentMovements: async () => {},
      refreshAll: noop,
      selectWarehouse: (id: string | null) => {
        setSelectedWarehouseId(id);
        if (id) {
          setDetailsDialogOpen(true);
        }
      },
      editWarehouse: (id: string) => {
        setWarehouseToEditId(id);
        setEditDialogOpen(true);
      },
      deleteWarehouse: async (id: string) => {
        setWarehouseToDeleteId(id);
        setDeleteDialogOpen(true);
      },
    }),
    [noop]
  );

  /* -------------------------------- HANDLERS -------------------------------- */
  const handleDeleteConfirm = async () => {
    if (!warehouseToDeleteId) return;
    try {
      await deleteMutation.mutateAsync(warehouseToDeleteId);
      toast.success(
        dict.toasts.successDelete || "Warehouse deleted successfully"
      );
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error(dict.toasts.errorGeneric || "Failed to delete warehouse");
      logger.error(error);
    } finally {
      setWarehouseToDeleteId(null);
    }
  };

  const warehouses = dashboardData?.warehouses || [];
  const stats = dashboardData?.stats || null;
  const recentMovements = dashboardData?.recentMovements || [];

  const { data: individualWarehouse } = useWarehouse(
    selectedWarehouseId && !warehouses.find((w: WarehouseWithRelations) => w.id === selectedWarehouseId)
      ? selectedWarehouseId
      : null
  );

  const warehouseToDelete = warehouses.find(
    (w: WarehouseWithRelations) => w.id === warehouseToDeleteId
  );

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
          onClick={() => setAddDialogOpen(true)}
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
          // Previous rows survive a filter/sort change via keepPreviousData;
          // only blank the table when there is genuinely nothing to show.
          loading={isLoading}
          refreshing={isFetching}
          onSelect={actions.selectWarehouse}
          onEdit={actions.editWarehouse}
          onDelete={actions.deleteWarehouse}
          onDetails={actions.selectWarehouse}
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

      <AddWarehouseDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
      />

      <WarehouseDetailsDialog
        open={detailsDialogOpen}
        onClose={() => {
          setDetailsDialogOpen(false);
          actions.selectWarehouse(null);
        }}
        warehouseData={
          selectedWarehouseId
            ? warehouses.find((w: WarehouseWithRelations) => w.id === selectedWarehouseId) || individualWarehouse || undefined
            : undefined
        }
      />

      <EditWarehouseDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setWarehouseToEditId(null);
        }}
        onSuccess={() => {
          setEditDialogOpen(false);
          setWarehouseToEditId(null);
        }}
        warehouseData={
          warehouses.find(
            (w: WarehouseWithRelations) => w.id === warehouseToEditId
          ) || undefined
        }
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={dict.warehouses.deleteTitle}
        description={dict.warehouses.deleteDesc.replace(
          "{name}",
          warehouseToDelete?.name || ""
        )}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}
