"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Select,
  Stack,
  TableCell,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import { RotateCcw, Undo2, Trash2 } from "lucide-react";
import AdminTableShell, { type AdminTableColumn } from "./AdminTableShell";
import HardDeleteUserDialog from "./HardDeleteUserDialog";
import { useAdminDeletion } from "@/app/hooks/useAdminDeletion";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import type {
  DeletableEntity,
  DeletedRecord,
  RestorePageState,
} from "@/app/lib/type/admin/deletion";

interface AdminRestorePageProps {
  title: string;
  subtitle: string;
}

const ENTITIES: DeletableEntity[] = [
  "user",
  "company",
  "vehicle",
  "trailer",
  "shipment",
  "route",
  "warehouse",
  "customer",
  "driver",
  "inventory",
];

/**
 * tr-Silinmiş kayıtlar ve geri yükleme sayfası.
 * en-Restore view: lists soft-deleted records per entity and puts them back.
 *
 *    This is the counterpart that makes deletion honest — a delete the operator
 *    cannot inspect or undo is a hard delete with extra steps.
 * input (AdminRestorePageProps)
 * output (JSX.Element)
 */
export default function AdminRestorePage({
  title,
  subtitle,
}: AdminRestorePageProps) {
  const theme = useTheme();
  const { dict, lang } = useLanguage();
  const t = dict.admin.data.deletion;

  const [state, setState] = useState<RestorePageState>({
    entity: "user",
    rows: [],
    loading: true,
    error: null,
    pendingId: null,
  });

  const fetchDeleted = useCallback(
    async (entity: DeletableEntity) => {
      setState((s) => ({ ...s, entity, loading: true, error: null }));
      try {
        const res = await fetch(
          `/api/admin/deletion?entity=${encodeURIComponent(entity)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = (await res.json()) as { rows: DeletedRecord[] };
        setState((s) => ({ ...s, rows: data.rows, loading: false }));
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : dict.admin.common.error,
        }));
      }
    },
    [dict.admin.common.error]
  );

  // The hook refreshes the list after a restore; it reads the entity from
  // state so the correct list is reloaded.
  const deletion = useAdminDeletion(() => fetchDeleted(state.entity));

  const [hardDeleteTarget, setHardDeleteTarget] =
    useState<DeletedRecord | null>(null);

  useEffect(() => {
    void fetchDeleted("user");
  }, [fetchDeleted]);

  const columns: AdminTableColumn[] = [
    { id: "record", label: t.record },
    { id: "deletedAt", label: t.deletedAt },
    { id: "actions", label: "", align: "right" },
  ];

  const cellSx = {
    fontSize: 12.5,
    borderBottomColor: theme.palette.divider,
  };

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        flexWrap="wrap"
        gap={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            {title}
          </Typography>
          <Typography
            sx={{ color: theme.palette.text.secondary, fontSize: 14 }}
          >
            {subtitle}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RotateCcw size={14} />}
          onClick={() => void fetchDeleted(state.entity)}
          disabled={state.loading}
        >
          {dict.admin.common.refresh}
        </Button>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <Select
          size="small"
          value={state.entity}
          onChange={(e) =>
            void fetchDeleted(e.target.value as DeletableEntity)
          }
          sx={{ minWidth: 200 }}
        >
          {ENTITIES.map((entity) => (
            <MenuItem key={entity} value={entity} sx={{ fontSize: 13.5 }}>
              {t.entities[entity]}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      <AdminTableShell
        columns={columns}
        loading={state.loading}
        error={state.error}
        rowCount={state.rows.length}
        emptyMessage={t.noDeleted}
      >
        {state.rows.map((row) => (
          <TableRow
            key={row.id}
            sx={{
              "&:hover": { backgroundColor: theme.palette.background.hoverBg },
            }}
          >
            <TableCell sx={{ ...cellSx, fontWeight: 600 }}>
              {row.label}
              <Typography
                sx={{
                  fontSize: 11,
                  color: theme.palette.text.secondary,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                {row.id}
              </Typography>
            </TableCell>

            <TableCell
              sx={{ ...cellSx, color: theme.palette.text.secondary }}
            >
              {new Date(row.deletedAt).toLocaleString(lang, {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </TableCell>

            <TableCell align="right" sx={cellSx}>
              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                <Button
                  size="small"
                  startIcon={<Undo2 size={13} />}
                  disabled={deletion.state.busy}
                  onClick={() =>
                    void deletion.actions.restore(state.entity, row.id)
                  }
                  sx={{ textTransform: "none", fontSize: 12 }}
                >
                  {t.restore}
                </Button>
                {state.entity === "user" && (
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Trash2 size={13} />}
                    disabled={deletion.state.busy}
                    onClick={() => setHardDeleteTarget(row)}
                    sx={{ textTransform: "none", fontSize: 12 }}
                  >
                    {t.hardDelete}
                  </Button>
                )}
              </Stack>
            </TableCell>
          </TableRow>
        ))}
      </AdminTableShell>

      <HardDeleteUserDialog
        open={hardDeleteTarget !== null}
        label={hardDeleteTarget?.label ?? ""}
        busy={deletion.state.busy}
        onCancel={() => setHardDeleteTarget(null)}
        onConfirm={() => {
          if (!hardDeleteTarget) return;
          const id = hardDeleteTarget.id;
          setHardDeleteTarget(null);
          void deletion.actions.hardDeleteUser(id);
        }}
      />
    </Box>
  );
}
