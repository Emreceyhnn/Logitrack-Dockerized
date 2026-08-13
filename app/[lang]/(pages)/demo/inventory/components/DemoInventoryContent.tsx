"use client";

import { useCallback, useState, useMemo } from "react";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { Box, Divider, Stack, Typography } from "@mui/material";
import CustomCard from "@/app/components/cards/card";
import DemoInventoryHeader from "./DemoInventoryHeader";
import InventoryTable from "@/app/components/dashboard/inventory/InventoryTable";
import { useDemoInventoryWithDashboard } from "@/app/hooks/demo/useDemoInventory";
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
import InventoryDetailsDialog from "@/app/components/dialogs/inventory/InventoryDetailsDialog";
import type { InventoryWithRelations } from "@/app/lib/type/inventory";
import { toast } from "sonner";

/**
 * Demo-only counterpart to InventoryContent — same header/KPI/table layout,
 * backed by the fixed demo dataset. Selecting a row opens the real
 * InventoryDetailsDialog, which is demo-aware: it serves mock movements and
 * refuses stock adjustments rather than calling an authenticated action. The
 * header is DemoInventoryHeader (no useWarehouses fetch). Add/Edit/Delete
 * still only show a "disabled in demo" toast.
 */
export default function DemoInventoryContent() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const theme = useTheme();
  const dict = useDictionary();
  const { format, isLoading: currencyLoading } = useCurrency();

  /* ---------------------------------- STATE --------------------------------- */
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [displaySearch, setDisplaySearch] = useState("");
  const [warehouseId, setWarehouseId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string[]>([]);
  const [sort, setSort] = useState<{ field: string; order: "asc" | "desc" }>({
    field: "name",
    order: "asc",
  });
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  /* ---------------------------------- HOOKS --------------------------------- */
  const {
    data: dashboardData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useDemoInventoryWithDashboard();

  /* --------------------------------- ACTIONS -------------------------------- */
  const notifyDisabled = useCallback(() => {
    toast.info(dict.toasts.demoActionDisabled);
  }, [dict]);

  // Memoised so the array identity is stable across renders — otherwise the
  // warehouseOptions useMemo below would recompute every render (react-hooks
  // exhaustive-deps).
  const items = useMemo(() => dashboardData?.items || [], [dashboardData?.items]);
  const stats = dashboardData?.stats;

  const handleOpenDetails = useCallback((id: string) => {
    if (!id) return;
    setSelectedItemId(id);
    setDetailOpen(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailOpen(false);
    setSelectedItemId(null);
  }, []);

  const selectedItem = useMemo(
    () =>
      (items as InventoryWithRelations[]).find((i) => i.id === selectedItemId) ??
      null,
    [items, selectedItemId]
  );

  const warehouseOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of items) {
      if (!seen.has(item.warehouseId)) {
        seen.set(item.warehouseId, item.warehouse.name);
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [items]);

  const handleSortRequest = (field: string) => {
    setSort((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
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
      <DemoInventoryHeader
        value={displaySearch}
        onSearch={(val) => setDisplaySearch(val)}
        onAddClick={notifyDisabled}
        warehouseId={warehouseId}
        status={status}
        warehouseOptions={warehouseOptions}
        onWarehouseChange={(id) => setWarehouseId(id || undefined)}
        onStatusChange={(newStatus) => setStatus(newStatus)}
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
                loading={isLoading}
                refreshing={isFetching}
                onSelect={handleOpenDetails}
                onEdit={notifyDisabled}
                onDelete={notifyDisabled}
                meta={{
                  page: pagination.page,
                  limit: pagination.pageSize,
                  total: dashboardData?.totalCount || 0,
                }}
                onPageChange={(p) =>
                  setPagination((prev) => ({ ...prev, page: p }))
                }
                onLimitChange={(limit) =>
                  setPagination({ page: 1, pageSize: limit })
                }
                sortField={sort.field}
                sortOrder={sort.order}
                onRequestSort={handleSortRequest}
              />
            )}
          </Box>
        </CustomCard>
      </Stack>

      {detailOpen && (
        <InventoryDetailsDialog
          isOpen={detailOpen}
          onClose={handleCloseDetails}
          item={selectedItem}
          onEdit={notifyDisabled}
        />
      )}
    </Box>
  );
}
