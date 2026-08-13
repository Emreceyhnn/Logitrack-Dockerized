"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  IconButton,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { Trash2 } from "lucide-react";
import AdminTableShell, { type AdminTableColumn } from "./AdminTableShell";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import { useAdminDeletion } from "@/app/hooks/useAdminDeletion";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import type { AdminTenantRow } from "@/app/lib/type/admin/data";

interface AdminTenantsPageProps {
  title: string;
  subtitle: string;
}

/**
 * tr-Kiracı yönetimi sayfası.
 * en-Tenant list. Read-only: creating or deleting a company is an operational
 *    action with cascading effects, so it is deliberately not exposed here.
 * input (AdminTenantsPageProps)
 * output (JSX.Element)
 */
export default function AdminTenantsPage({
  title,
  subtitle,
}: AdminTenantsPageProps) {
  const theme = useTheme();
  const { dict, lang } = useLanguage();
  const t = dict.admin.data.tenants;

  const [rows, setRows] = useState<AdminTenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tenants", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { rows: AdminTenantRow[] };
      setRows(data.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.admin.common.error);
    } finally {
      setLoading(false);
    }
  }, [dict.admin.common.error]);

  const deletion = useAdminDeletion(fetchTenants);

  useEffect(() => {
    void fetchTenants();
  }, [fetchTenants]);

  const columns: AdminTableColumn[] = [
    { id: "name", label: t.name },
    { id: "domain", label: t.domain },
    { id: "users", label: t.users, align: "right" },
    { id: "vehicles", label: t.vehicles, align: "right" },
    { id: "shipments", label: t.shipments, align: "right" },
    { id: "created", label: t.created },
    { id: "actions", label: "", align: "right" },
  ];

  const cellSx = {
    fontSize: 12.5,
    borderBottomColor: theme.palette.divider,
  };

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

      <AdminTableShell
        columns={columns}
        loading={loading}
        error={error}
        rowCount={rows.length}
      >
        {rows.map((tenant) => (
          <TableRow
            key={tenant.id}
            sx={{
              "&:hover": { backgroundColor: theme.palette.background.hoverBg },
            }}
          >
            <TableCell sx={{ ...cellSx, fontWeight: 600 }}>
              {tenant.name}
            </TableCell>
            <TableCell
              sx={{ ...cellSx, color: theme.palette.text.secondary }}
            >
              {tenant.domain ?? "—"}
            </TableCell>
            <TableCell align="right" sx={cellSx}>
              {tenant.userCount.toLocaleString()}
            </TableCell>
            <TableCell align="right" sx={cellSx}>
              {tenant.vehicleCount.toLocaleString()}
            </TableCell>
            <TableCell align="right" sx={cellSx}>
              {tenant.shipmentCount.toLocaleString()}
            </TableCell>
            <TableCell
              sx={{ ...cellSx, color: theme.palette.text.secondary }}
            >
              {new Date(tenant.createdAt).toLocaleDateString(lang, {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </TableCell>
            <TableCell align="right" sx={cellSx}>
              <Tooltip title={dict.admin.data.deletion.delete} arrow>
                <IconButton
                  size="small"
                  onClick={() =>
                    deletion.actions.requestDelete({
                      entity: "company",
                      id: tenant.id,
                      label: tenant.name,
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
    </Box>
  );
}
