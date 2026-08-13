"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  IconButton,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { Lock, Trash2 } from "lucide-react";
import AdminTableShell, { type AdminTableColumn } from "./AdminTableShell";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import { useAdminDeletion } from "@/app/hooks/useAdminDeletion";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  BrowsableModel,
  DbTableSnapshot,
} from "@/app/lib/type/admin/data";
import type { DeletableEntity } from "@/app/lib/type/admin/deletion";

/**
 * Maps a browsable model to its deletion entity key. Every browsable model is
 * soft-deletable, so the mapping is total — but it is written out explicitly
 * rather than lower-casing the name, so a future model without delete support
 * is a compile error instead of a runtime 400.
 */
const DELETE_ENTITY: Record<BrowsableModel, DeletableEntity> = {
  Company: "company",
  Vehicle: "vehicle",
  Shipment: "shipment",
  Route: "route",
  Warehouse: "warehouse",
  Customer: "customer",
  Driver: "driver",
  Inventory: "inventory",
};

/** Column preferred as the human-readable label per model. */
const LABEL_COLUMN: Record<BrowsableModel, string> = {
  Company: "name",
  Vehicle: "plate",
  Shipment: "trackingId",
  Route: "name",
  Warehouse: "name",
  Customer: "name",
  Driver: "id",
  Inventory: "sku",
};

interface AdminDatabasePageProps {
  title: string;
  subtitle: string;
}

const MODELS: BrowsableModel[] = [
  "Company",
  "Vehicle",
  "Shipment",
  "Route",
  "Warehouse",
  "Customer",
  "Driver",
  "Inventory",
];

/**
 * tr-Salt okunur veritabanı tarayıcı.
 * en-Read-only database browser. There is no edit affordance anywhere on this
 *    page, and the API backing it exposes no write route.
 * input (AdminDatabasePageProps)
 * output (JSX.Element)
 */
export default function AdminDatabasePage({
  title,
  subtitle,
}: AdminDatabasePageProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const t = dict.admin.data.database;

  const [model, setModel] = useState<BrowsableModel>("Company");
  const [page, setPage] = useState(1);
  const [snapshot, setSnapshot] = useState<DbTableSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTable = useCallback(
    async (targetModel: BrowsableModel, targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          model: targetModel,
          page: String(targetPage),
          pageSize: "25",
        });
        const res = await fetch(`/api/admin/database?${params}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = (await res.json()) as { snapshot: DbTableSnapshot };
        setSnapshot(data.snapshot);
      } catch (err) {
        setError(err instanceof Error ? err.message : dict.admin.common.error);
      } finally {
        setLoading(false);
      }
    },
    [dict.admin.common.error]
  );

  const deletion = useAdminDeletion(() => fetchTable(model, page));

  useEffect(() => {
    void fetchTable(model, page);
  }, [fetchTable, model, page]);

  const columns: AdminTableColumn[] = snapshot
    ? [
        ...snapshot.columns.map((column) => ({ id: column, label: column })),
        { id: "__actions", label: "", align: "right" as const },
      ]
    : [];

  const pageCount = snapshot
    ? Math.max(1, Math.ceil(snapshot.total / snapshot.pageSize))
    : 1;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          {title}
        </Typography>
        <Typography sx={{ color: theme.palette.text.secondary, fontSize: 14 }}>
          {subtitle}
        </Typography>
      </Box>

      <Stack
        direction="row"
        spacing={1}
        alignItems="flex-start"
        sx={{
          px: 2,
          py: 1.25,
          mb: 2.5,
          borderRadius: 2,
          border: `1px dashed ${theme.palette.divider}`,
        }}
      >
        <Lock
          size={13}
          color={theme.palette.text.secondary}
          style={{ marginTop: 2, flexShrink: 0 }}
        />
        <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
          {t.readOnlyNotice}
        </Typography>
      </Stack>

      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 2 }}
        flexWrap="wrap"
      >
        <Select
          size="small"
          value={model}
          onChange={(e) => {
            setModel(e.target.value as BrowsableModel);
            // Reset paging: page 7 of Company is meaningless for Vehicle.
            setPage(1);
          }}
          sx={{ minWidth: 200 }}
        >
          {MODELS.map((name) => (
            <MenuItem key={name} value={name} sx={{ fontSize: 13.5 }}>
              {name}
            </MenuItem>
          ))}
        </Select>

        {snapshot && (
          <Typography
            sx={{ fontSize: 12.5, color: theme.palette.text.secondary }}
          >
            {snapshot.total.toLocaleString()} {t.rows}
          </Typography>
        )}
      </Stack>

      <AdminTableShell
        columns={columns.length > 0 ? columns : [{ id: "x", label: "" }]}
        loading={loading}
        error={error}
        rowCount={snapshot?.rows.length ?? 0}
      >
        {(snapshot?.rows ?? []).map((row, index) => (
          <TableRow
            key={`${row.id ?? index}`}
            sx={{
              "&:hover": { backgroundColor: theme.palette.background.hoverBg },
            }}
          >
            {snapshot?.columns.map((column) => (
              <TableCell
                key={column}
                sx={{
                  fontSize: 12,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  borderBottomColor: theme.palette.divider,
                  maxWidth: 260,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={row[column]}
              >
                {row[column]}
              </TableCell>
            ))}
            <TableCell
              align="right"
              sx={{ borderBottomColor: theme.palette.divider }}
            >
              <Tooltip title={dict.admin.data.deletion.delete} arrow>
                <IconButton
                  size="small"
                  onClick={() =>
                    deletion.actions.requestDelete({
                      entity: DELETE_ENTITY[model],
                      id: row.id ?? "",
                      label: row[LABEL_COLUMN[model]] || row.id || "",
                    })
                  }
                  sx={{ color: theme.palette.kpi.error }}
                >
                  <Trash2 size={14} />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
      </AdminTableShell>

      {deletion.state.target && (
        <DeleteConfirmDialog
          open
          entity={deletion.state.target.entity}
          label={deletion.state.target.label}
          busy={deletion.state.busy}
          error={deletion.state.error}
          onCancel={deletion.actions.cancelDelete}
          onConfirm={(confirmLabel) =>
            void deletion.actions.confirmDelete(confirmLabel)
          }
        />
      )}

      {snapshot && snapshot.total > snapshot.pageSize && (
        <Stack alignItems="center" sx={{ mt: 2.5 }}>
          <Pagination
            size="small"
            count={pageCount}
            page={snapshot.page}
            onChange={(_, next) => setPage(next)}
          />
        </Stack>
      )}
    </Box>
  );
}
