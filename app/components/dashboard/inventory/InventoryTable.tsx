"use client";

import { useMemo, useCallback } from "react";
import {
  Typography,
  Avatar,
  Stack,
  Chip,
  Box,
  useTheme,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import EditIcon from "@mui/icons-material/Edit";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

import DataTable from "@/app/components/ui/DataTable";
import type {
  DataTableColumn,
  DataTableRowAction,
} from "@/app/lib/type/dataTable";
import { InventoryWithRelations } from "@/app/lib/type/inventory";
import { InventoryTableProps } from "@/app/lib/type/inventory";

import { useCurrency } from "@/app/hooks/useCurrency";

// Helper to derive status for UI
const getStatus = (quantity: number, minStock: number) => {
  if (quantity === 0) return "OUT_OF_STOCK";
  if (quantity <= minStock) return "LOW_STOCK";
  return "IN_STOCK";
};

const getStockColor = (status: string) => {
  if (status === "IN_STOCK") return "success";
  if (status === "LOW_STOCK") return "warning";
  return "error";
};

const InventoryTable = ({
  items,
  loading = false,
  refreshing = false,
  onSelect,
  onEdit,
  onDelete,
  meta,
  onPageChange,
  onLimitChange,
  sortField,
  sortOrder,
  onRequestSort,
}: InventoryTableProps) => {
  const theme = useTheme();
  const dict = useDictionary();

  const { formatFrom, isLoading: currencyLoading } = useCurrency();

  const getCategoryStyles = useCallback(
    (cargoType: string | null | undefined) => {
      const type = cargoType?.toLocaleUpperCase('en-US') || "";
      // Using theme.palette.kpi colors
      if (type.includes("FROZEN") || type.includes("COLD"))
        return {
          main: theme.palette.kpi.sky,
          alpha: theme.palette.kpi.sky_alpha.main_10,
          alphaHover: theme.palette.kpi.sky_alpha.main_20,
        };
      if (type.includes("BATTERY") || type.includes("ELECTRO"))
        return {
          main: theme.palette.kpi.purple,
          alpha: theme.palette.kpi.purple_alpha.main_10,
          alphaHover: theme.palette.kpi.purple_alpha.main_20,
        };
      if (type.includes("HAZMAT") || type.includes("HAZARD"))
        return {
          main: theme.palette.kpi.amber,
          alpha: theme.palette.kpi.amber_alpha.main_10,
          alphaHover: theme.palette.kpi.amber_alpha.main_20,
        };
      if (type.includes("FOOD") || type.includes("PERISH"))
        return {
          main: theme.palette.kpi.emerald,
          alpha: theme.palette.kpi.emerald_alpha.main_10,
          alphaHover: theme.palette.kpi.emerald_alpha.main_20,
        };
      if (type.includes("LIQUID") || type.includes("OIL"))
        return {
          main: theme.palette.kpi.indigo,
          alpha: theme.palette.kpi.indigo_alpha.main_10,
          alphaHover: theme.palette.kpi.indigo_alpha.main_20,
        };

      // Default: Indigo/Primary
      return {
        main: theme.palette.primary.main,
        alpha: theme.palette.primary._alpha.main_10,
        alphaHover: theme.palette.primary._alpha.main_20,
      };
    },
    [theme]
  );

  const currentMeta = meta || {
    page: 1,
    limit: 10,
    total: items.length,
  };

  const paginatedItems = meta
    ? items
    : items.slice(
        (currentMeta.page - 1) * currentMeta.limit,
        currentMeta.page * currentMeta.limit
      );

  const handlePageChange = (newPage: number) => {
    if (onPageChange) onPageChange(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    if (onLimitChange) onLimitChange(newLimit);
  };

  const columns: DataTableColumn<InventoryWithRelations>[] = useMemo(
    () => [
      {
        key: "productName",
        label: dict.inventory.table.productName,
        sortable: true,
        sortKey: "name",
        render: (row) => {
          const styles = getCategoryStyles(row.cargoType);
          return (
            <Stack direction="row" spacing={2} alignItems="center">
              <Tooltip title={row.name} arrow>
                <Avatar
                  variant="rounded"
                  src={row.imageUrl || undefined}
                  sx={{
                    bgcolor: styles.alpha,
                    color: styles.main,
                    width: 40,
                    height: 40,
                    fontSize: "1rem",
                    fontWeight: 800,
                    border: `1px solid ${styles.alpha}`,
                    "& img": { objectFit: "cover" },
                  }}
                >
                  {!row.imageUrl && row.name.charAt(0)}
                </Avatar>
              </Tooltip>
              <Typography variant="body2" fontWeight={600}>
                {row.name}
              </Typography>
            </Stack>
          );
        },
      },
      {
        key: "sku",
        label: dict.inventory.table.sku,
        sortable: true,
        render: (row) => row.sku,
      },
      {
        key: "category",
        label: dict.inventory.table.category,
        render: (row) => {
          const styles = getCategoryStyles(row.cargoType);
          return (
            <Chip
              label={dict.inventory?.dialogs?.cargoTypes?.[(row.cargoType || "General Cargo") as keyof typeof dict.inventory.dialogs.cargoTypes] || row.cargoType || dict.inventory.category.general}
              size="small"
              sx={{
                fontWeight: 800,
                fontSize: "0.65rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                bgcolor: styles.alpha,
                color: styles.main,
                border: `1px solid ${styles.alpha}`,
                borderRadius: "6px",
                height: 24,
                "& .MuiChip-label": { px: 1.5 },
              }}
            />
          );
        },
      },
      {
        key: "stockLevel",
        label: dict.inventory.table.stockLevel,
        sortable: true,
        sortKey: "quantity",
        render: (row) => {
          const status = getStatus(row.quantity, row.minStock);
          return (
            <Tooltip title={dict.inventory.table.stockLevel} arrow>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: `${getStockColor(status)}.main`,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: `${getStockColor(status)}.main`,
                    fontWeight: 500,
                  }}
                >
                  {row.quantity - (row.allocatedQuantity || 0)}{" "}
                  {row.allocatedQuantity > 0 && (
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ color: "warning.main", ml: 0.5 }}
                    >
                      ({row.allocatedQuantity}{" "}
                      {dict.inventory.status.blocked || "Blokeli"})
                    </Typography>
                  )}
                  {status === "LOW_STOCK" && ` (${dict.inventory.status.low})`}
                  {status === "OUT_OF_STOCK" &&
                    ` (${dict.inventory.status.out})`}
                </Typography>
              </Stack>
            </Tooltip>
          );
        },
      },
      {
        key: "unitPrice",
        label: dict.inventory.table.unitPrice,
        sortable: true,
        sortKey: "unitValue",
        render: (row) =>
          currencyLoading
            ? "..."
            : formatFrom(row.unitValue || 0, row.currency || "USD", 2),
      },
      {
        key: "warehouse",
        label: dict.inventory.table.warehouses,
        render: (row) => (
          <Stack direction="row" spacing={0.5}>
            <Chip
              label={row.warehouse.code}
              size="small"
              sx={{ fontSize: "0.7rem", height: 20 }}
            />
          </Stack>
        ),
      },
    ],
    [dict, formatFrom, currencyLoading, getCategoryStyles]
  );

  const rowActions: DataTableRowAction<InventoryWithRelations>[] = useMemo(
    () => [
      {
        label: dict.inventory.actions.details,
        icon: <InfoIcon fontSize="small" color="info" />,
        onClick: (row) => onSelect(row.id),
      },
      {
        label: dict.inventory.actions.edit,
        icon: <EditIcon fontSize="small" />,
        onClick: (row) => {
          if (onEdit) onEdit(row);
        },
      },

      {
        label: dict.inventory.actions.delete,
        icon: <DeleteIcon fontSize="small" />,
        onClick: (row) => {
          if (onDelete) onDelete(row.id);
        },
        color: "error",
      },
    ],
    [onSelect, onDelete, onEdit, dict]
  );

  return (
    <DataTable<InventoryWithRelations>
      rows={paginatedItems}
      columns={columns}
      loading={loading}
      refreshing={refreshing}
      emptyMessage={dict.inventory.noItems}
      meta={currentMeta}
      onPageChange={handlePageChange}
      onLimitChange={handleLimitChange}
      rowActions={rowActions}
      sortField={sortField}
      sortOrder={sortOrder}
      onRequestSort={onRequestSort}
    />
  );
};

export default InventoryTable;
