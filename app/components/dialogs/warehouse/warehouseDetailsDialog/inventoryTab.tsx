"use client";

import { useState, useMemo } from "react";
import { Box, useTheme } from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { WarehouseWithRelations } from "@/app/lib/type/warehouse";
import { InventoryWithRelations } from "@/app/lib/type/inventory";
import {
  useInventoryWithDashboard,
  useInventoryMutations,
} from "@/app/hooks/useInventory";
import InventoryHeader from "@/app/components/dashboard/inventory/InventoryHeader";
import InventoryTable from "@/app/components/dashboard/inventory/InventoryTable";
import InventoryDetailsDialog from "../../inventory/InventoryDetailsDialog";
import InventoryEditDialog from "../../inventory/InventoryEditDialog";
import AddInventoryDialog from "@/app/components/dialogs/inventory/addInventoryDialog";
import DeleteConfirmationDialog from "@/app/components/dialogs/deleteConfirmationDialog";
import KpiCards from "@/app/components/cards/KpiCards";
import {
  Inventory as InventoryIcon,
  Warning,
  Error as ErrorIcon,
  AttachMoney,
} from "@mui/icons-material";
import { useCurrency } from "@/app/hooks/useCurrency";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { logger } from "@/app/lib/logger";


interface InventoryTabProps {
  warehouse: WarehouseWithRelations;
}

const InventoryTab = ({ warehouse }: InventoryTabProps) => {
  /* -------------------------------- VARIABLES ------------------------------- */
  const theme = useTheme();
  const dict = useDictionary();
  const { format, isLoading: currencyLoading } = useCurrency();
  const pathname = usePathname();
  const isDemo = pathname?.includes("/demo");

  const notifyDisabled = () => {
    toast.info(dict.toasts.demoActionDisabled);
  };

  /* ---------------------------------- STATE --------------------------------- */
  const [filters, setFilters] = useState({
    search: "",
    status: [] as string[],
  });
  const [sort, setSort] = useState<{ field?: string; order: "asc" | "desc" }>({
    field: "name",
    order: "asc",
  });
  const [displaySearch, setDisplaySearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
  });
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  /* ---------------------------------- HOOKS --------------------------------- */
  const {
    data: dashboardData,
    isLoading,
  } = useInventoryWithDashboard(
    pagination.page,
    pagination.pageSize,
    warehouse.id,
    filters.search,
    sort.field,
    sort.order,
    filters.status
  );

  // Debouncing effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: displaySearch }));
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500);

    return () => clearTimeout(timer);
  }, [displaySearch]);

  const { deleteItem: deleteMutation, updateItem: updateMutation } =
    useInventoryMutations();

  const loading = isLoading;

  const items = dashboardData?.items || [];
  const stats = dashboardData?.stats;

  const selectedItem =
    (items as InventoryWithRelations[]).find(
      (i: InventoryWithRelations) => i.id === selectedItemId
    ) || null;

  /* -------------------------------- HANDLERS -------------------------------- */
  const handleOpenDetails = (id: string) => {
    setSelectedItemId(id);
    setIsDetailsOpen(true);
  };

  // Browsing inventory is allowed in the demo; mutating is not — every
  // mutation below runs through an authenticated action that would redirect
  // an anonymous visitor to sign-in.
  const handleOpenEdit = (id: string) => {
    if (isDemo) return notifyDisabled();
    setSelectedItemId(id);
    setIsEditOpen(true);
  };

  const handleDeleteRequest = (id: string) => {
    if (isDemo) return notifyDisabled();
    setSelectedItemId(id);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedItemId) return;
    if (isDemo) {
      setIsDeleteOpen(false);
      return notifyDisabled();
    }
    // Close first; the mutation toasts its own outcome and rolls back the
    // optimistic removal if it fails.
    const id = selectedItemId;
    setIsDeleteOpen(false);

    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      logger.error("Delete failed", error);
    }
  };

  const handleSortRequest = (field: string) => {
    setSort((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
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
        icon: <Warning />,
        color:
          (stats?.lowStockCount ?? 0) > 0
            ? theme.palette.warning.main
            : theme.palette.success.main,
        trend: dashboardData?.statsTrends?.lowStock,
      },
      {
        label: dict.inventory.outOfStock,
        value: stats?.outOfStockCount ?? 0,
        icon: <ErrorIcon />,
        color:
          (stats?.outOfStockCount ?? 0) > 0
            ? theme.palette.error.main
            : theme.palette.success.main,
        trend: dashboardData?.statsTrends?.outOfStock,
      },
      {
        label: dict.inventory.totalValue,
        // `stats.totalValue` is summed in USD server-side (each line converted
        // with its own rate, since one warehouse can hold items priced in
        // different currencies). `useCurrency().format` converts that USD
        // figure into the user's own currency and labels it accordingly.
        //
        // It previously formatted the raw USD number with a currency chosen
        // from the UI LANGUAGE — so a Turkish UI printed "₺" on a dollar
        // amount, showing a total ~47x smaller than reality. This is also what
        // the main inventory page already does, so the same warehouse no longer
        // reports two different totals depending on where you look at it.
        value: currencyLoading ? "..." : format(stats?.totalValue ?? 0),
        icon: <AttachMoney />,
        color: theme.palette.success.main,
      },
    ],
    [
      stats,
      theme,
      dict,
      format,
      currencyLoading,
      dashboardData?.statsTrends?.totalItems,
      dashboardData?.statsTrends?.lowStock,
      dashboardData?.statsTrends?.outOfStock,
    ]
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", flex: 1 }}>
      <InventoryHeader
        value={displaySearch}
        onSearch={(val) => setDisplaySearch(val)}
        onAddClick={() => {
          if (isDemo) return notifyDisabled();
          setIsAddOpen(true);
        }}
        status={filters.status}
        onStatusChange={(status) => {
          setFilters((prev) => ({ ...prev, status }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        hideWarehouseFilter
      />

      <Box mb={2}>
        <KpiCards kpis={kpiItems} loading={loading} />
      </Box>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <InventoryTable
          items={items}
          loading={loading}
          onSelect={handleOpenDetails}
          onEdit={(item) => handleOpenEdit(item.id)}
          onDelete={handleDeleteRequest}
          meta={{
            page: pagination.page,
            limit: pagination.pageSize,
            total: dashboardData?.totalCount || 0,
          }}
          onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
          onLimitChange={(pageSize) =>
            setPagination({ page: 1, pageSize: pageSize })
          }
          sortField={sort.field}
          sortOrder={sort.order}
          onRequestSort={handleSortRequest}
        />
      </Box>

      {/* Dialogs */}
      {isDetailsOpen && (
        <InventoryDetailsDialog
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          item={selectedItem}
          onEdit={handleOpenEdit}
        />
      )}

      {isEditOpen && (
        <InventoryEditDialog
          key={selectedItem?.id}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          item={selectedItem}
          onUpdate={async (id, data) => {
            // Close first; the mutation reports its own outcome.
            setIsEditOpen(false);
            await updateMutation.mutateAsync({ id, data });
          }}
        />
      )}

      {isAddOpen && (
        <AddInventoryDialog
          open={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onSuccess={() => setIsAddOpen(false)}
          initialWarehouseId={warehouse.id}
        />
      )}

      {isDeleteOpen && (
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
      )}
    </Box>
  );
};

export default InventoryTab;
