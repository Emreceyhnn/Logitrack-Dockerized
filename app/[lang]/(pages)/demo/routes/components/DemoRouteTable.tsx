"use client";

import { useState, useMemo, useCallback } from "react";
import { Typography } from "@mui/material";
import DataTable from "@/app/components/ui/DataTable";
import type {
  DataTableColumn,
  DataTableRowAction,
} from "@/app/lib/type/dataTable";
import { StatusChip } from "@/app/components/chips/statusChips";
import { RouteTableProps, RouteWithRelations } from "@/app/lib/type/routes";

import { useDateSettings } from "@/app/hooks/useDateSettings";
import { formatDisplayDateTime } from "@/app/lib/utils/date";

import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { RouteStatus } from "@/app/lib/type/enums";
import { getStatusMeta } from "@/app/lib/priorityColor";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

/**
 * Demo-only fork of RouteTable. The real table imports the updateRouteStatus
 * controller directly; this fork drops it, so no server action is reachable
 * from the table itself. Details is delegated upward via onDetails (the
 * caller mounts the read-only dialog); the mutating row actions (activate,
 * complete, edit, delete) still route through the disabled-toast callbacks.
 */

const VISIBLE_ROUTE_STATUSES: RouteStatus[] = [
  RouteStatus.PLANNED,
  RouteStatus.ACTIVE,
  RouteStatus.COMPLETED,
];

interface DemoRouteTableProps extends RouteTableProps {
  /** Background refetch with rows already on screen — dim, don't blank. */
  refreshing?: boolean | undefined;
  onRefresh?: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAction?: () => void;
  /** Opens the read-only route details dialog. Falls back to onAction. */
  onDetails?: (route: RouteWithRelations) => void;
  filters?:
    | { status?: RouteStatus[] | undefined; search?: string | undefined }
    | undefined;
  onFilterChange?: (filters: { status?: RouteStatus[]; search?: string }) => void;
}

const DemoRouteTable = ({
  routes,
  loading = false,
  refreshing = false,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  onAction,
  onDetails,
  filters,
  onFilterChange,
}: DemoRouteTableProps) => {
  const dict = useDictionary();
  const dateSettings = useDateSettings();

  const [localPage, setLocalPage] = useState(1);
  const [localLimit, setLocalLimit] = useState(10);

  const meta = useMemo(() => {
    if (pagination)
      return {
        page: pagination.page,
        limit: pagination.pageSize,
        total: pagination.total,
      };
    return { page: localPage, limit: localLimit, total: routes.length };
  }, [pagination, localPage, localLimit, routes.length]);

  const paginatedRoutes = pagination
    ? routes
    : routes.slice((meta.page - 1) * meta.limit, meta.page * meta.limit);

  const handleChangePage = useCallback(
    (newPage: number) => {
      if (onPageChange) onPageChange(newPage);
      else setLocalPage(newPage);
    },
    [onPageChange]
  );

  const handleLimitChange = useCallback(
    (newLimit: number) => {
      setLocalLimit(newLimit);
      if (!onPageChange) setLocalPage(1);
    },
    [onPageChange]
  );

  const STATUS_OPTIONS = useMemo(
    () =>
      VISIBLE_ROUTE_STATUSES.map((s) => ({
        label: getStatusMeta(s, dict).label || s.replace(/_/g, " "),
        value: s,
      })),
    [dict]
  );

  const ROUTE_FILTERS = useMemo(
    () => [
      {
        key: "status",
        label: dict.routes.table.columns.status || "Status",
        options: STATUS_OPTIONS,
        multiple: true,
      },
    ],
    [dict, STATUS_OPTIONS]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      onFilterChange?.({ search: value });
    },
    [onFilterChange]
  );

  const handleFilterChange = useCallback(
    (key: string, values: string[]) => {
      if (key === "status") {
        onFilterChange?.({ status: values as RouteStatus[] });
      }
    },
    [onFilterChange]
  );

  const activeFilters: Record<string, string[]> = useMemo(
    () => ({
      ...(filters?.status && filters.status.length > 0
        ? { status: filters.status as string[] }
        : {}),
    }),
    [filters]
  );

  const columns: DataTableColumn<RouteWithRelations>[] = useMemo(
    () => [
      {
        key: "routeId",
        label: dict.routes.table.columns.routeId,
        render: (row) => (
          <Typography variant="body2" fontWeight={600}>
            {row.name || row.id}
          </Typography>
        ),
      },
      {
        key: "vehiclePlate",
        label: dict.routes.table.columns.vehiclePlate,
        render: (row) => row.vehicle?.plate || dict.common.unassigned,
      },
      {
        key: "origin",
        label: dict.routes.table.columns.origin,
        render: (row) => {
          const firstStop = Array.isArray(row.stops)
            ? (row.stops[0] as { address?: string })
            : null;
          return firstStop?.address || dict.common.na;
        },
      },
      {
        key: "destination",
        label: dict.routes.table.columns.destination,
        render: (row) => {
          const lastStop =
            Array.isArray(row.stops) && row.stops.length > 0
              ? (row.stops[row.stops.length - 1] as { address?: string })
              : null;
          return lastStop?.address || dict.common.na;
        },
      },
      {
        key: "eta",
        label: dict.routes.table.columns.eta,
        render: (row) =>
          row.endTime
            ? formatDisplayDateTime(row.endTime, dateSettings)
            : dict.common.na,
      },
      {
        key: "status",
        label: dict.routes.table.columns.status,
        render: (row) => <StatusChip status={row.status} />,
      },
    ],
    [dict, dateSettings]
  );

  // Stable identity so the rowActions useMemo below doesn't recompute every
  // render (react-hooks exhaustive-deps).
  const notify = useCallback(() => {
    onAction?.();
  }, [onAction]);

  const rowActions: DataTableRowAction<RouteWithRelations>[] = useMemo(() => {
    const actions: DataTableRowAction<RouteWithRelations>[] = [
      {
        label: dict.common.details,
        icon: <ContentPasteIcon fontSize="small" />,
        onClick: (row) => (onDetails ? onDetails(row) : notify()),
      },
      {
        label: dict.routes.table.actions.activate,
        icon: <PlayArrowIcon fontSize="small" />,
        onClick: () => notify(),
        hidden: (row) => row.status !== "PLANNED",
      },
      {
        label: dict.routes.table.actions.complete,
        icon: <CheckCircleIcon fontSize="small" />,
        onClick: () => notify(),
        hidden: (row) => row.status !== "ACTIVE",
      },
    ];

    if (onEdit) {
      actions.push({
        label: dict.common.edit,
        icon: <EditIcon fontSize="small" />,
        onClick: (row) => onEdit(row.id),
      });
    }

    if (onDelete) {
      actions.push({
        label: dict.common.delete,
        icon: <DeleteIcon fontSize="small" />,
        onClick: (row) => onDelete(row.id),
        color: "error",
      });
    }

    return actions;
  }, [notify, onDetails, onEdit, onDelete, dict]);

  return (
    <DataTable<RouteWithRelations>
      rows={paginatedRoutes}
      columns={columns}
      rowActions={rowActions}
      loading={loading}
      refreshing={refreshing}
      emptyMessage={dict.routes.table.noRoutes}
      searchValue={filters?.search ?? ""}
      searchPlaceholder={
        dict.routes.table.searchPlaceholder || dict.common.search
      }
      onSearchChange={handleSearchChange}
      filters={ROUTE_FILTERS}
      activeFilters={activeFilters}
      onFilterChange={handleFilterChange}
      meta={meta}
      onPageChange={handleChangePage}
      onLimitChange={handleLimitChange}
      wrapCard={true}
      tableTitle={dict.routes.table.title}
    />
  );
};

export default DemoRouteTable;
