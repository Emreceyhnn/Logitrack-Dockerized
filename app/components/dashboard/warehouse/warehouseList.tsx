"use client";

import { useMemo, useState } from "react";
import { Typography, Stack, LinearProgress, useTheme } from "@mui/material";
import DataTable from "@/app/components/ui/DataTable";
import type {
  DataTableColumn,
  DataTableRowAction,
} from "@/app/lib/type/dataTable";
import {
  WarehouseTableProps,
  WarehouseWithRelations,
} from "@/app/lib/type/warehouse";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import dayjs from "dayjs";

const WarehouseListTable = ({
  warehouses,
  loading,
  refreshing = false,
  onSelect,
  onEdit,
  onDelete,
  onDetails,
  meta,
  onPageChange,
  onLimitChange,
}: WarehouseTableProps) => {
  const theme = useTheme();
  const dict = useDictionary();
  const dateSettings = useDateSettings();

  // Local pagination if API meta isn't provided
  const [localPage, setLocalPage] = useState(1);
  const [localLimit, setLocalLimit] = useState(10);

  const currentMeta = meta || {
    page: localPage,
    limit: localLimit,
    total: warehouses.length,
  };

  const paginatedWarehouses = meta
    ? warehouses
    : warehouses.slice(
        (currentMeta.page - 1) * currentMeta.limit,
        currentMeta.page * currentMeta.limit
      );

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

  const columns: DataTableColumn<WarehouseWithRelations>[] = useMemo(
    () => [
      {
        key: "code",
        label: dict.dashboard.warehouse.code,
        sortable: true,
        render: (row) => (
          <Typography variant="body2" fontWeight={800} color="primary.main">
            {row.code}
          </Typography>
        ),
      },
      {
        key: "name",
        label: dict.dashboard.warehouse.name,
        sortable: true,
        render: (row) => (
          <>
            <Typography variant="body2" fontWeight={700}>
              {row.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ opacity: 0.7 }}
            >
              {row.address?.split(",")[0]}
            </Typography>
          </>
        ),
      },
      {
        key: "type",
        label: dict.dashboard.warehouse.typeCity,
        sortable: true,
        render: (row) => (
          <Stack direction="column" alignItems="flex-start" gap={0.8}>
            <Typography variant="body2" fontWeight={600} color="text.secondary">
              {row.city}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                px: 1,
                py: 0.2,
                borderRadius: 1,
                bgcolor: theme.palette.primary._alpha.main_10,
                color: theme.palette.primary.main,
                fontWeight: 800,
                fontSize: "0.6rem",
                textTransform: "uppercase",
                display: "flex",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              {dict.warehouses.categories.types[
                row.type as keyof typeof dict.warehouses.categories.types
              ] || row.type}
            </Typography>
          </Stack>
        ),
      },
      {
        key: "capacityPallet",
        label: dict.dashboard.warehouse.capacityPallets,
        width: "20%",
        render: (row) => {
          // See capacityUtilization: never guess occupancy from SKU count.
          const usedPallets = row.usedPallets ?? 0;
          const totalPallets = row.capacityPallets || 5000;
          const palletPct = Math.min(
            100,
            Math.round((usedPallets / totalPallets) * 100)
          );
          return (
            <Stack spacing={1}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                >
                  {dict.dashboard.warehouse.utilized.replace(
                    "{percent}",
                    palletPct.toFixed(0)
                  )}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontFamily: "monospace", opacity: 0.6 }}
                >
                  {usedPallets.toLocaleString("en-US")} /{" "}
                  {totalPallets.toLocaleString("en-US")}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={palletPct}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: theme.palette.divider_alpha.main_05,
                  "& .MuiLinearProgress-bar": {
                    bgcolor: palletPct > 85 ? "error.main" : "primary.main",
                    borderRadius: 3,
                    boxShadow: `0 0 8px ${palletPct > 85 ? theme.palette.error._alpha.main_30 : theme.palette.primary._alpha.main_40}`,
                  },
                }}
              />
            </Stack>
          );
        },
      },
      {
        key: "capacityVolume",
        label: dict.dashboard.warehouse.capacityVolume,
        width: "20%",
        render: (row) => {
          const usedVolume =
            row.usedVolume ?? (row._count?.inventory || 0) * 5;
          const totalVolume = row.capacityVolumeM3 || 100000;
          const volumePct = Math.min(
            100,
            Math.round((usedVolume / totalVolume) * 100)
          );
          return (
            <Stack spacing={1}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                >
                  {dict.dashboard.warehouse.space.replace(
                    "{percent}",
                    volumePct.toFixed(0)
                  )}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontFamily: "monospace", opacity: 0.6 }}
                >
                  {usedVolume.toLocaleString("en-US")} /{" "}
                  {totalVolume.toLocaleString("en-US")} m³
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={volumePct}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: theme.palette.divider_alpha.main_05,
                  "& .MuiLinearProgress-bar": {
                    bgcolor: "success.main",
                    borderRadius: 3,
                    boxShadow: `0 0 8px ${theme.palette.success._alpha.main_40}`,
                  },
                }}
              />
            </Stack>
          );
        },
      },
      {
        key: "operatingHours",
        label: dict.dashboard.warehouse.operatingHours,
        align: "right",
        render: (row) => {
          const oh = row.operatingHours || "24/7";
          const rawTxt =
            typeof oh === "object" && oh !== null && "monFri" in oh
              ? (oh as { monFri: string }).monFri
              : String(oh);

          if (rawTxt === "24/7" || !rawTxt.includes(" - ")) {
            return (
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ fontFamily: "monospace" }}
              >
                {rawTxt}
              </Typography>
            );
          }

          const [opening, closing] = rawTxt.split(" - ");
          if (!opening || !closing) {
            return (
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ fontFamily: "monospace" }}
              >
                {rawTxt}
              </Typography>
            );
          }
          const whTz = row.timezone || "UTC";
          const userTz = dateSettings.timezone;

          const whOpening = dayjs()
            .tz(whTz)
            .set("hour", parseInt(opening.split(":")[0] ?? "0"))
            .set("minute", parseInt(opening.split(":")[1] ?? "0"))
            .set("second", 0);
          let whClosing = dayjs()
            .tz(whTz)
            .set("hour", parseInt(closing.split(":")[0] ?? "0"))
            .set("minute", parseInt(closing.split(":")[1] ?? "0"))
            .set("second", 0);

          if (whClosing.isBefore(whOpening)) {
            whClosing = whClosing.add(1, "day");
          }

          const userOpening = whOpening.tz(userTz).format("HH:mm");
          const userClosing = whClosing.tz(userTz).format("HH:mm");

          const isSameTz = whTz === userTz;

          return (
            <Stack alignItems="flex-end">
              <Typography
                variant="body2"
                fontWeight={800}
                sx={{ fontFamily: "monospace" }}
              >
                {userOpening} - {userClosing}
              </Typography>
              {!isSameTz && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: "0.6rem", opacity: 0.7, fontWeight: 600 }}
                >
                  {rawTxt} (LCL)
                </Typography>
              )}
            </Stack>
          );
        },
      },
    ],
    [theme, dict, dateSettings]
  );

  const rowActions: DataTableRowAction<WarehouseWithRelations>[] = useMemo(
    () => [
      {
        label: dict.dashboard.warehouse.viewDetails,
        icon: <VisibilityIcon fontSize="small" />,
        onClick: (row) => {
          if (onDetails) onDetails(row.id);
          else onSelect(row.id);
        },
      },
      {
        label: dict.dashboard.warehouse.editWarehouse,
        icon: <EditIcon fontSize="small" />,
        onClick: (row) => {
          if (onEdit) onEdit(row.id);
        },
      },
      {
        label: dict.dashboard.warehouse.deleteFactory,
        icon: <DeleteIcon fontSize="small" />,
        onClick: (row) => {
          if (onDelete) onDelete(row.id);
        },
        color: "error",
      },
    ],
    [onDetails, onSelect, onEdit, onDelete, dict]
  );

  return (
    <DataTable<WarehouseWithRelations>
      rows={paginatedWarehouses}
      columns={columns}
      loading={loading}
      refreshing={refreshing}
      emptyMessage={dict.dashboard.warehouse.noWarehouses}
      meta={currentMeta}
      onPageChange={handlePageChange}
      onLimitChange={handleLimitChange}
      rowActions={rowActions}
      wrapCard={true}
      tableTitle={dict.dashboard.warehouse.listTitle}
    />
  );
};

export default WarehouseListTable;
