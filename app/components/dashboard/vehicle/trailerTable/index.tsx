import { useCallback, useMemo } from "react";
import DataTable from "@/app/components/ui/DataTable";
import { DataTableColumn, DataTableRowAction, PaginationMeta } from "@/app/lib/type/dataTable";
import { TrailerWithRelations, TrailerFilters } from "@/app/lib/type/trailer";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import {
  Box,
  Typography,
  Chip,
  Tooltip,
  Stack,
} from "@mui/material";
import {
  Edit,
  Delete,
  Link,
  LinkOff,
  AcUnit,
  LocalShipping,
} from "@mui/icons-material";
import { TrailerStatus, TrailerType } from "@/app/lib/type/enums";

interface TrailerTableProps {
  trailers: TrailerWithRelations[];
  loading: boolean;
  /** Background refetch with rows already on screen — dim, don't blank. */
  refreshing?: boolean | undefined;
  onEdit: (trailer: TrailerWithRelations) => void;
  onDelete: (trailer: TrailerWithRelations) => void;
  onAssign: (trailer: TrailerWithRelations) => void;
  onDetach: (trailer: TrailerWithRelations) => void;
  filters?: TrailerFilters | undefined;
  meta?: PaginationMeta | undefined;
  actions?: {
    updateFilters: (filters: Partial<TrailerFilters>) => void;
    setPage: (page: number) => void;
    setLimit: (limit: number) => void;
  } | undefined;
}

export default function TrailerTable({
  trailers,
  loading,
  refreshing = false,
  onEdit,
  onDelete,
  onAssign,
  onDetach,
  filters = {},
  meta,
  actions,
}: TrailerTableProps) {
  const dict = useDictionary();

  const handleSearchChange = useCallback(
    (value: string) => {
      actions?.updateFilters({ search: value });
    },
    [actions]
  );

  const handleFilterChange = useCallback(
    (key: string, values: string | string[]) => {
      actions?.updateFilters({ [key]: values });
    },
    [actions]
  );

  const TRAILER_FILTERS = useMemo(
    () => [
      {
        key: "status",
        label: dict.trailers.status,
        options: Object.values(TrailerStatus).map((s) => ({
          label: dict.trailers.statuses[s as keyof typeof dict.trailers.statuses] || s,
          value: s,
        })),
        multiple: true,
      },
      {
        key: "type",
        label: dict.trailers.type,
        options: Object.values(TrailerType).map((t) => ({
          label: dict.trailers.types[t as keyof typeof dict.trailers.types] || t,
          value: t,
        })),
        multiple: true,
      },
      {
        key: "isColdChain",
        label: dict.trailers.coldChain,
        options: [
          { label: dict.common.yes, value: "true" },
          { label: dict.common.no, value: "false" },
        ],
      },
    ],
    [dict]
  );

  const activeFilters = useMemo(
    () => ({
      ...(filters.status?.length ? { status: filters.status } : {}),
      ...(filters.type?.length ? { type: filters.type } : {}),
      ...(filters.isColdChain !== undefined ? { isColdChain: [String(filters.isColdChain)] } : {}),
    }),
    [filters]
  );

  const columns: DataTableColumn<TrailerWithRelations>[] = [
    {
      key: "plate",
      label: dict.trailers.plate,
      render: (row) => (
        <Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: 13 }}>
            {row.plate}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.fleetNo}
          </Typography>
        </Box>
      ),
      sortable: true,
    },
    {
      key: "type",
      label: dict.trailers.type,
      render: (row) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            {dict.trailers.types[row.type as keyof typeof dict.trailers.types]}
          </Typography>
          {row.isColdChain && (
            <Tooltip title={dict.trailers.coldChain}>
              <AcUnit sx={{ fontSize: 16, color: "info.main" }} />
            </Tooltip>
          )}
        </Stack>
      ),
    },
    {
      key: "capacity",
      label: dict.trailers.capacity,
      render: (row) => (
        <Typography variant="body2" sx={{ fontSize: 13 }}>
          {row.capacityVolumeM3} m³
        </Typography>
      ),
      align: "right",
    },
    {
      key: "status",
      label: dict.trailers.status,
      render: (row) => {
        const colors: Record<string, "success" | "warning" | "error" | "default" | "primary"> = {
          AVAILABLE: "success",
          IN_USE: "primary",
          MAINTENANCE: "warning",
          RETIRED: "default",
        };
        return (
          <Chip
            label={dict.trailers.statuses[row.status as keyof typeof dict.trailers.statuses]}
            color={colors[row.status] || "default"}
            size="small"
            variant="outlined"
            sx={{ fontSize: "11px", fontWeight: 600 }}
          />
        );
      },
    },
    {
      key: "currentVehicle",
      label: dict.trailers.currentVehicle,
      render: (row) => (
        row.currentVehicle ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LocalShipping sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              {row.currentVehicle.plate}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
            {dict.trailers.notAssigned}
          </Typography>
        )
      ),
    },
  ];

  const rowActions: DataTableRowAction<TrailerWithRelations>[] = [
    {
      label: dict.common.edit,
      icon: <Edit fontSize="small" />,
      onClick: onEdit,
    },
    {
      label: dict.trailers.assignToVehicle,
      icon: <Link fontSize="small" />,
      onClick: (row) => onAssign(row),
      hidden: (row) => !!row.currentVehicle,
    },
    {
      label: dict.trailers.detach,
      icon: <LinkOff fontSize="small" />,
      onClick: (row) => onDetach(row),
      hidden: (row) => !row.currentVehicle,
    },
    {
      label: dict.common.delete,
      icon: <Delete fontSize="small" />,
      onClick: onDelete,
      color: "error",
    },
  ];

  return (
    <DataTable
      rows={trailers}
      columns={columns}
      loading={loading}
      refreshing={refreshing}
      rowActions={rowActions}
      tableTitle={dict.trailers.title}
      emptyMessage={dict.trailers.emptyMessage || "No trailers found"}
      searchValue={filters.search || ""}
      onSearchChange={handleSearchChange}
      filters={TRAILER_FILTERS}
      activeFilters={activeFilters}
      onFilterChange={handleFilterChange}
      meta={meta}
      onPageChange={actions?.setPage}
      onLimitChange={actions?.setLimit}
      wrapCard
    />
  );
}
