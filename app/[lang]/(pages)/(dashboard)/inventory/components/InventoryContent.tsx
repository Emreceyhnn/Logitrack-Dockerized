"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { Box, Divider, Stack, Typography } from "@mui/material";
import CustomCard from "@/app/components/cards/card";
import InventoryHeader from "@/app/components/dashboard/inventory/InventoryHeader";
import InventoryTable from "@/app/components/dashboard/inventory/InventoryTable";
import { InventoryPageActions } from "@/app/lib/type/inventory";
import {
  useInventoryWithDashboard,
  useInventoryMutations,
} from "@/app/hooks/useInventory";
import { useTableParams } from "@/app/hooks/useTableParams";
import { InventoryWithRelations } from "@/app/lib/type/inventory";
import InventoryDetailsDialog from "@/app/components/dialogs/inventory/InventoryDetailsDialog";
import InventoryEditDialog from "@/app/components/dialogs/inventory/InventoryEditDialog";
import DeleteConfirmationDialog from "@/app/components/dialogs/deleteConfirmationDialog";
import AddInventoryDialog from "@/app/components/dialogs/inventory/addInventoryDialog";
import {
  Inventory as InventoryIcon,
  Warning,
  Error as ErrorIcon,
  AttachMoney,
  CheckCircle,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import KpiCards from "@/app/components/cards/KpiCards";
import QueryErrorState from "@/app/components/ui/QueryErrorState";
import { useCurrency } from "@/app/hooks/useCurrency";
import { logger } from "@/app/lib/logger";


export default function InventoryContent() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const theme = useTheme();
  const dict = useDictionary();
  const { format, isLoading: currencyLoading } = useCurrency();

  /* ---------------------------------- STATE --------------------------------- */
  const {
    page,
    pageSize,
    search,
    sortField,
    sortOrder,
    getFilter,
    getArrayFilter,
    setPage,
    setPageSize,
    setSearch,
    setSort,
    setFilter,
  } = useTableParams({ defaultSortField: "name" });

  const warehouseId = getFilter("warehouseId");
  const status = getArrayFilter("status");

  const searchParams = useSearchParams();
  const itemIdFromUrl = searchParams.get("id");

  const [displaySearch, setDisplaySearch] = useState(search);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  /* ---------------------------------- HOOKS --------------------------------- */
  const {
    data: dashboardData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useInventoryWithDashboard(
    page,
    pageSize,
    warehouseId,
    search,
    sortField,
    sortOrder,
    status
  );

  // tr-Bildirimden `?id=` ile gelindiğinde detay dialog'unu açar. `temp-` ile başlayan
  //    iyimser kimlikler sunucuda bulunmadığı için yok sayılır (bkz. CustomerContent).
  // en-Opens the detail dialog when arriving from a notification with `?id=`. Optimistic
  //    `temp-` ids don't exist server-side, so they're ignored (same as CustomerContent).
  useEffect(() => {
    if (itemIdFromUrl && !itemIdFromUrl.startsWith("temp-")) {
      setSelectedItemId(itemIdFromUrl);
      setIsDetailsOpen(true);
    }
  }, [itemIdFromUrl]);

  // Debouncing effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (displaySearch !== search) {
        setSearch(displaySearch);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [displaySearch, search, setSearch]);

  const { deleteItem: deleteMutation, updateItem: updateMutation } =
    useInventoryMutations();

  /* --------------------------------- ACTIONS -------------------------------- */
  const noop = useCallback(async () => {}, []);

  const actions: InventoryPageActions = useMemo(() => ({
    fetchInventory: async () => {},
    fetchLowStock: async () => {},
    refreshAll: noop,

    openDetails: (id) => {
      setSelectedItemId(id);
      setIsDetailsOpen(true);
    },

    closeDetails: () => setIsDetailsOpen(false),

    openEdit: (id) => {
      setSelectedItemId(id);
      setIsEditOpen(true);
    },

    closeEdit: () => setIsEditOpen(false),

    updateItem: async (id, data) => {
      await updateMutation.mutateAsync({ id, data });
    },

    updateFilters: (newFilters) => {
      if (newFilters.warehouseId !== undefined) {
        setFilter("warehouseId", newFilters.warehouseId);
      }
      if (newFilters.status !== undefined) {
        setFilter("status", newFilters.status);
      }
    },
  }), [noop, updateMutation, setFilter]);

  const items = dashboardData?.items || [];
  const stats = dashboardData?.stats;

  const selectedItem =
    (items as InventoryWithRelations[]).find(
      (i: InventoryWithRelations) => i.id === selectedItemId
    ) || null;

  const handleDeleteRequest = (id: string) => {
    setSelectedItemId(id);
    setIsDeleteOpen(true);
  };

  const handleSortRequest = (field: string) => {
    setSort(field);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedItemId) return;
    try {
      await deleteMutation.mutateAsync(selectedItemId);
      setIsDeleteOpen(false);
    } catch (error) {
      logger.error("Delete failed", error);
    }
  };

  /* ----------------------------------- KPI ---------------------------------- */
  const kpiItems = useMemo(
    () => [
      {
        label: dict.inventory.totalItems,
        value: stats?.totalItems ?? 0,
        icon: <InventoryIcon />,
        color: theme.palette.primary.main,
        trend: dashboardData?.statsTrends?.totalItems,
      },
      {
        label: dict.inventory.lowStock,
        value: stats?.lowStockCount ?? 0,
        icon: (stats?.lowStockCount ?? 0) > 0 ? <Warning /> : <CheckCircle />,
        color:
          (stats?.lowStockCount ?? 0) > 0
            ? theme.palette.warning.main
            : theme.palette.success.main,
      },
      {
        label: dict.inventory.outOfStock,
        value: stats?.outOfStockCount ?? 0,
        icon: (stats?.outOfStockCount ?? 0) > 0 ? <ErrorIcon /> : <CheckCircle />,
        color:
          (stats?.outOfStockCount ?? 0) > 0
            ? theme.palette.error.main
            : theme.palette.success.main,
      },
      {
        label: dict.inventory.totalValue,
        value: currencyLoading ? "..." : format(stats?.totalValue || 0),
        icon: <AttachMoney />,
        color: theme.palette.success.main,
      },
    ],
    [stats, dashboardData?.statsTrends, theme, dict, format, currencyLoading]
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <InventoryHeader
        value={displaySearch}
        onSearch={(val) => setDisplaySearch(val)}
        onAddClick={() => setIsAddOpen(true)}
        warehouseId={warehouseId}
        status={status}
        onWarehouseChange={(id) =>
          actions.updateFilters({ warehouseId: id || undefined })
        }
        onStatusChange={(newStatus) => actions.updateFilters({ status: newStatus })}
      />
      <KpiCards kpis={kpiItems} loading={isLoading} />

      <Stack mt={2}>
        <CustomCard sx={{ padding: "0 0 6px 0" }}>
          <Typography sx={{ fontSize: 18, fontWeight: 600, p: 2 }}>
            {dict.inventory.header}
          </Typography>
          <Divider />
          <Box data-tour="inventory-table">
            {isError ? (
              <QueryErrorState onRetry={() => refetch()} dense />
            ) : (
            <InventoryTable
            items={items}
            // `isLoading`, not `isFetching`: the query keeps the previous page's
            // rows via keepPreviousData, so every filter/sort/page change was
            // blanking a table that still had perfectly good data to show.
            // `isLoading` is true only when there is nothing to display yet.
            loading={isLoading}
            refreshing={isFetching}
            onSelect={actions.openDetails}
            onEdit={(item) => actions.openEdit(item.id)}
            onDelete={handleDeleteRequest}
            meta={{
              page: page,
              limit: pageSize,
              total: dashboardData?.totalCount || 0,
            }}
            onPageChange={(p) => setPage(p)}
            onLimitChange={(limit) => setPageSize(limit)}
            sortField={sortField}
            sortOrder={sortOrder}
            onRequestSort={handleSortRequest}
          />
            )}
          </Box>
        </CustomCard>
      </Stack>

      <InventoryDetailsDialog
        isOpen={isDetailsOpen}
        onClose={actions.closeDetails}
        item={selectedItem}
        onEdit={actions.openEdit}
      />

      <InventoryEditDialog
        key={selectedItem?.id}
        isOpen={isEditOpen}
        onClose={actions.closeEdit}
        item={selectedItem}
        onUpdate={actions.updateItem}
      />

      <AddInventoryDialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => setIsAddOpen(false)}
      />

      <DeleteConfirmationDialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={dict.inventory.deleteTitle}
        description={dict.inventory.deleteDesc.replace(
          "{name}",
          selectedItem?.name || ""
        )}
        loading={deleteMutation.isPending}
      />

    </Box>
  );
}
