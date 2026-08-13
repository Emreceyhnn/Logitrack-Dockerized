"use client";

import { useMemo, useState } from "react";
import DataTable from "@/app/components/ui/DataTable";
import type { DataTableColumn, DataTableRowAction, DataTableFilter } from "@/app/lib/type/dataTable";
import { StatusChip } from "@/app/components/chips/statusChips";
import { DriverTableProps, DriverWithRelations } from "@/app/lib/type/driver";
import { DriverStatus } from "@/app/lib/type/enums";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Typography } from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

const DriverTable = ({
  drivers,
  loading = false,
  refreshing = false,
  meta: apiMeta,
  onDriverSelect,
  onEdit,
  onDelete,
  onPageChange,
  onLimitChange,
  sortField,
  sortOrder,
  onRequestSort,
  filters,
  onFilterChange,
}: DriverTableProps) => {
  const dict = useDictionary();
  const [localPage, setLocalPage] = useState(1);
  const [localLimit, setLocalLimit] = useState(10);

  const meta = useMemo(() => apiMeta || {
    page: localPage,
    limit: localLimit,
    total: drivers.length,
  }, [apiMeta, localPage, localLimit, drivers.length]);

  const paginatedDrivers = apiMeta
    ? drivers
    : drivers.slice((meta.page - 1) * meta.limit, meta.page * meta.limit);

  const handlePageChange = (newPage: number) => {
    if (onPageChange) onPageChange(newPage);
    else setLocalPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    if (onLimitChange) onLimitChange(newLimit);
    else {
      setLocalLimit(newLimit);
      setLocalPage(1);
    }
  };

  const columns: DataTableColumn<DriverWithRelations>[] = useMemo(() => [
    {
      key: "id",
      label: dict.drivers.table.columns.idx,
      width: 50,
      render: (row) => {
        const idx = drivers.findIndex((d) => d.id === row.id);
        const base = meta ? (meta.page - 1) * meta.limit : 0;
        return base + idx + 1;
      },
    },
    {
      key: "name",
      label: dict.drivers.table.columns.name,
      sortable: true,
      render: (row) => (
        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 13 }}>
          {row.user.name} {row.user.surname}
        </Typography>
      ),
    },
    {
      key: "status",
      label: dict.drivers.table.columns.status,
      sortable: true,
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      key: "phone",
      label: dict.drivers.table.columns.phone,
      sortable: true,
      render: (row) => row.phone,
    },
    {
      key: "vehicle",
      label: dict.drivers.table.columns.vehicle,
      sortable: true,
      render: (row) => row.currentVehicle ? row.currentVehicle.plate : dict.drivers.table.noVehicle,
    },
    {
      key: "homeBaseWarehouse",
      label: dict.drivers.table.columns.homebase,
      sortable: true,
      render: (row) => row.homeBaseWarehouse ? row.homeBaseWarehouse.name : dict.drivers.table.notAssigned,
    },
    {
      key: "licenseType",
      label: dict.drivers.table.columns.license,
      sortable: true,
      render: (row) => row.licenseType,
    },
    {
      key: "safetyScore",
      label: dict.drivers.table.columns.safetyScore,
      align: "right",
      sortable: true,
      render: (row) => row.safetyScore,
    },
  ], [drivers, meta, dict]);

  const rowActions: DataTableRowAction<DriverWithRelations>[] = useMemo(() => [
    {
      label: dict.drivers.actions.details,
      icon: <ContentPasteIcon fontSize="small" />,
      onClick: (row) => onDriverSelect(row.id),
    },
    {
      label: dict.drivers.actions.edit,
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => onEdit(row),
    },
    {
      label: dict.drivers.actions.delete,
      icon: <DeleteIcon fontSize="small" />,
      onClick: (row) => onDelete(row.id),
      color: "error",
    },
  ], [onDriverSelect, onEdit, onDelete, dict]);

  const activeFilters: Record<string, string[]> = {};
  if (filters?.status && filters.status.length > 0) activeFilters["status"] = filters.status;
  if (filters?.hasVehicle === true) activeFilters["hasVehicle"] = ["assigned"];
  else if (filters?.hasVehicle === false) activeFilters["hasVehicle"] = ["unassigned"];

  const handleFilterChange = (key: string, values: string[]) => {
    if (!onFilterChange) return;
    if (key === "status") onFilterChange({ status: values as DriverStatus[] });
    if (key === "hasVehicle") {
      if (values[0] === "assigned") onFilterChange({ hasVehicle: true });
      else if (values[0] === "unassigned") onFilterChange({ hasVehicle: false });
      else onFilterChange({ hasVehicle: undefined });
    }
  };

  const DRIVER_FILTERS: DataTableFilter[] = useMemo(() => [
    {
      key: "status",
      label: dict.drivers.filters.status,
      options: Object.values(DriverStatus).map((s) => ({
        label:
          s === "ON_JOB"
            ? dict.drivers.onDuty
            : s === "OFF_DUTY"
            ? dict.drivers.offDuty
            : s === "ON_LEAVE"
            ? dict.drivers.onLeave
            : (s as string).replace(/_/g, " "),
        value: s,
      })),
      multiple: true,
    },
    {
      key: "hasVehicle",
      label: dict.drivers.filters.vehicle,
      options: [
        { label: dict.drivers.filters.assigned, value: "assigned" },
        { label: dict.drivers.filters.unassigned, value: "unassigned" }
      ],
      multiple: false,
    }
  ], [dict]);

  return (
    <DataTable<DriverWithRelations>
      rows={paginatedDrivers}
      columns={columns}
      loading={loading}
      refreshing={refreshing}
      emptyMessage={dict.drivers.table.noDrivers}
      meta={meta}
      onPageChange={handlePageChange}
      onLimitChange={handleLimitChange}
      rowActions={rowActions}
      sortField={sortField}
      sortOrder={sortOrder}
      onRequestSort={onRequestSort}
      wrapCard={true}
      tableTitle={dict.drivers.table.title}
      searchValue={filters?.search || ""}
      searchPlaceholder={dict.drivers.table.searchPlaceholder}
      onSearchChange={(search) => onFilterChange && onFilterChange({ search })}
      filters={DRIVER_FILTERS}
      activeFilters={activeFilters}
      onFilterChange={handleFilterChange}
    />
  );
};

export default DriverTable;
