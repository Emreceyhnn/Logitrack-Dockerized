"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Typography } from "@mui/material";
import DataTable from "@/app/components/ui/DataTable";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableRowAction,
} from "@/app/lib/type/dataTable";
import { StatusChip } from "@/app/components/chips/statusChips";
import ShipmentDetailDialog from "@/app/components/dialogs/shipment/shipmentDetailDialog";
import StatusUpdateDialog from "@/app/components/dialogs/shipment/statusUpdateDialog";
import { useShipmentMutations } from "@/app/hooks/useShipments";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import EditIcon from "@mui/icons-material/Edit";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  ShipmentTableProps,
  ShipmentWithRelations,
} from "@/app/lib/type/shipment";
import { ShipmentStatus } from "@/app/lib/type/enums";

import { formatDisplayDate } from "@/app/lib/utils/date";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

// PROCESSING and ASSIGNED are brief system-managed transitions that don't
// appear in seed data and can't be set from the UI — omit them from the filter.
const VISIBLE_SHIPMENT_STATUSES: ShipmentStatus[] = [
  ShipmentStatus.PENDING,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.DELIVERED,
  ShipmentStatus.FAILED,
  ShipmentStatus.RETURNED,
  ShipmentStatus.DELAYED,
  ShipmentStatus.CANCELLED,
];

const ShipmentTable = ({
  state,
  actions,
  pagination,
  onPageChange,
  onLimitChange,
}: ShipmentTableProps) => {
  const dict = useDictionary();

  const dateSettings = useDateSettings();
  const { shipments, loading = false, refreshing = false, filters } = state;
  const { selectShipment, onEdit, onDelete, updateFilters } = actions;

  // Localized statuses for the filter
  const SHIPMENT_FILTERS: DataTableFilter[] = useMemo(() => {
    return [
      {
        key: "status",
        label: dict.shipments.table.columns.status,
        options: VISIBLE_SHIPMENT_STATUSES.map((s) => ({
          label:
            dict.shipments.statuses[
              s.toLocaleUpperCase('en-US') as keyof typeof dict.shipments.statuses
            ] || s.replace(/_/g, " "),
          value: s as string,
        })),
        multiple: false,
      },
    ];
  }, [dict]);

  /* --------------------------------- dialog state --------------------------------- */
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] =
    useState<ShipmentWithRelations | null>(null);

  /* --------------------------------- status update --------------------------------- */
  const { updateShipmentStatus } = useShipmentMutations();
  const [statusTarget, setStatusTarget] =
    useState<ShipmentWithRelations | null>(null);

  const handleOpenStatus = useCallback((row: ShipmentWithRelations) => {
    setStatusTarget(row);
  }, []);

  const handleStatusSubmit = useCallback(
    async (args: {
      id: string;
      status: ShipmentStatus;
      description?: string;
    }) => {
      await updateShipmentStatus.mutateAsync(args);
      setStatusTarget(null);
    },
    [updateShipmentStatus]
  );

  /* --------------------------------- pagination fallback --------------------------------- */
  const [localPage, setLocalPage] = useState(1);
  const [localLimit, setLocalLimit] = useState(10);

  const meta = useMemo(() => {
    if (pagination) {
      return {
        page: pagination.page,
        limit: pagination.pageSize,
        total: pagination.total,
      };
    }
    return {
      page: localPage,
      limit: localLimit,
      total: shipments.length,
    };
  }, [pagination, localPage, localLimit, shipments.length]);

  const paginatedShipments = useMemo(() => {
    if (pagination) return shipments;
    return shipments.slice(
      (meta.page - 1) * meta.limit,
      meta.page * meta.limit
    );
  }, [shipments, meta.page, meta.limit, pagination]);

  /* --------------------------------- handlers --------------------------------- */
  const handleOpenDetails = useCallback(
    (row: ShipmentWithRelations) => {
      setSelectedShipment(row);
      setDetailOpen(true);
      selectShipment(row.id);
    },
    [selectShipment]
  );

  const handleCloseDetails = useCallback(() => {
    setDetailOpen(false);
    selectShipment(null);
  }, [selectShipment]);

  // Deep-link support: open the dialog when a shipment id arrives via state
  // (e.g. from the ?id= URL param handled by the parent container).
  useEffect(() => {
    if (!state.selectedShipmentId) return;
    const match = shipments.find((s) => s.id === state.selectedShipmentId);
    if (match) {
      setSelectedShipment(match);
      setDetailOpen(true);
    }
  }, [state.selectedShipmentId, shipments]);

  const handleSearchChange = useCallback(
    (value: string) => {
      updateFilters({ search: value });
    },
    [updateFilters]
  );

  const handleFilterChange = useCallback(
    (key: string, values: string[]) => {
      if (key === "status") {
        updateFilters({ status: values[0] as ShipmentStatus | undefined });
      }
    },
    [updateFilters]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      if (onPageChange) onPageChange(page);
      else setLocalPage(page);
    },
    [onPageChange]
  );

  const handleLimitChange = useCallback(
    (limit: number) => {
      if (onLimitChange) onLimitChange(limit);
      else {
        setLocalLimit(limit);
        setLocalPage(1);
      }
    },
    [onLimitChange]
  );

  /* --------------------------------- columns --------------------------------- */
  const columns: DataTableColumn<ShipmentWithRelations>[] = [
    {
      key: "trackingId",
      label: dict.shipments.table.columns.code,
      render: (row) => (
        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 13 }}>
          {row.trackingId}
        </Typography>
      ),
    },
    {
      key: "status",
      label: dict.shipments.table.columns.status,
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      key: "customer",
      label: dict.shipments.table.columns.customer,
      render: (row) => row.customer?.name ?? "-",
    },
    {
      key: "createdAt",
      label: dict.shipments.table.columns.created,
      render: (row) => formatDisplayDate(row.createdAt, dateSettings),
    },
    {
      key: "destination",
      label: dict.shipments.table.columns.destination,
      render: (row) => row.destination,
    },
    {
      key: "driver",
      label: dict.shipments.table.columns.driver,
      render: (row) =>
        row.driver?.user.name
          ? `${row.driver.user.name} ${row.driver.user.surname}`
          : "-",
    },
    {
      key: "route",
      label: dict.shipments.table.columns.route,
      render: (row) => row.route?.name ?? row.routeId ?? "-",
    },
    {
      key: "items",
      label: dict.shipments.table.columns.items,
      align: "right",
      render: (row) => row.itemsCount,
    },
  ];

  /* --------------------------------- row actions --------------------------------- */
  const rowActions: DataTableRowAction<ShipmentWithRelations>[] = [
    {
      label: dict.common.details,
      icon: <ContentPasteIcon fontSize="small" />,
      onClick: handleOpenDetails,
    },
    {
      label: dict.common.edit,
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => onEdit(row.id),
    },
    {
      label: dict.shipments.dialogs.updateStatusTitle || "Update status",
      icon: <SwapHorizIcon fontSize="small" />,
      onClick: handleOpenStatus,
    },
    {
      label: dict.common.delete,
      icon: <DeleteIcon fontSize="small" />,
      onClick: (row) => onDelete(row.id),
      color: "error",
    },
  ];

  const activeFilters: Record<string, string[]> = {};
  if (filters.status) activeFilters["status"] = [filters.status as string];

  return (
    <>
      <DataTable<ShipmentWithRelations>
        rows={paginatedShipments}
        columns={columns}
        loading={loading}
        refreshing={refreshing}
        emptyMessage={dict.shipments.table.noShipments}
        searchValue={filters.search ?? ""}
        searchPlaceholder={dict.shipments.table.searchPlaceholder}
        onSearchChange={handleSearchChange}
        filters={SHIPMENT_FILTERS}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        rowActions={rowActions}
        meta={meta}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        wrapCard={true}
        tableTitle={dict.shipments.table.title}
      />

      <ShipmentDetailDialog
        open={detailOpen}
        onClose={handleCloseDetails}
        shipment={selectedShipment}
        onUpdateStatus={handleOpenStatus}
      />

      <StatusUpdateDialog
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        shipmentId={statusTarget?.id ?? null}
        trackingId={statusTarget?.trackingId}
        currentStatus={statusTarget?.status ?? null}
        onSubmit={handleStatusSubmit}
        submitting={updateShipmentStatus.isPending}
      />
    </>
  );
};

export default ShipmentTable;
