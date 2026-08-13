"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Select,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { RotateCcw, Check, X, RotateCw } from "lucide-react";
import { toast } from "sonner";
import AdminTableShell, { type AdminTableColumn } from "./AdminTableShell";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import type {
  DemoRequestRow,
  DemoRequestStatusFilter,
} from "@/app/lib/type/admin/demoRequests";

interface AdminDemoRequestsPageProps {
  title: string;
  subtitle: string;
}

const STATUS_FILTERS: DemoRequestStatusFilter[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "ALL",
];

/** Offered trial lengths. The field stays free-text so any value in range works. */
const TRIAL_PRESETS = [7, 14, 30, 90];
const DEFAULT_TRIAL_DAYS = 7;

/**
 * tr-Demo talepleri kuyruğu: talebi onaylar ve süresi seçilen deneme hakkını verir.
 * en-Demo request queue: approve a request and grant a trial of a chosen length.
 *
 *    Exists because the self-serve trial is only redeemable at SIGN-UP. Someone
 *    who requests a demo while already signed in can never redeem their token,
 *    so without this screen their entitlement stays NONE forever and they keep
 *    re-filing requests.
 * input (AdminDemoRequestsPageProps)
 * output (JSX.Element)
 */
export default function AdminDemoRequestsPage({
  title,
  subtitle,
}: AdminDemoRequestsPageProps) {
  const theme = useTheme();
  const { dict, lang } = useLanguage();
  const t = dict.admin.data.demoRequests;

  const [rows, setRows] = useState<DemoRequestRow[]>([]);
  const [statusFilter, setStatusFilter] =
    useState<DemoRequestStatusFilter>("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Per-row trial length, so reviewing several requests doesn't make one
  // shared input jump between them.
  const [trialDays, setTrialDays] = useState<Record<string, string>>({});

  const fetchRows = useCallback(
    async (filter: DemoRequestStatusFilter) => {
      setLoading(true);
      setError(null);
      try {
        const query =
          filter === "ALL" ? "" : `?status=${encodeURIComponent(filter)}`;
        const res = await fetch(`/api/admin/demo-requests${query}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = (await res.json()) as { rows: DemoRequestRow[] };
        setRows(data.rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : dict.admin.common.error);
      } finally {
        setLoading(false);
      }
    },
    [dict.admin.common.error]
  );

  useEffect(() => {
    void fetchRows(statusFilter);
  }, [fetchRows, statusFilter]);

  const decide = async (
    row: DemoRequestRow,
    status: "APPROVED" | "REJECTED" | "PENDING"
  ) => {
    const raw = trialDays[row.id] ?? String(DEFAULT_TRIAL_DAYS);
    const days = Number(raw);

    if (status === "APPROVED") {
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        toast.error(t.invalidDays);
        return;
      }
    }

    setPendingId(row.id);
    try {
      const res = await fetch("/api/admin/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          status,
          ...(status === "APPROVED" ? { trialDays: days } : {}),
        }),
      });

      const body = (await res.json().catch(() => null)) as {
        result?: {
          trialEndsAt: string | null;
          accountMissing: boolean;
        };
        error?: string;
      } | null;

      if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);

      if (status === "APPROVED") {
        // An approval that granted nothing is not a success worth a green
        // toast — the operator needs to know the person has no account yet.
        if (body?.result?.accountMissing) {
          toast.warning(t.approvedNoAccount);
        } else {
          toast.success(t.approvedWithTrial.replace("{days}", String(days)));
        }
      } else {
        toast.success(t.statusUpdated);
      }

      await fetchRows(statusFilter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.admin.common.error);
    } finally {
      setPendingId(null);
    }
  };

  const columns: AdminTableColumn[] = [
    { id: "requester", label: t.requester },
    { id: "type", label: t.type },
    { id: "account", label: t.account },
    { id: "status", label: t.status },
    { id: "createdAt", label: t.received },
    { id: "actions", label: "", align: "right" },
  ];

  const cellSx = {
    fontSize: 12.5,
    borderBottomColor: theme.palette.divider,
    verticalAlign: "top" as const,
  };

  const statusColor = (status: string) =>
    status === "APPROVED"
      ? "success"
      : status === "REJECTED"
        ? "error"
        : "warning";

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
          <Typography sx={{ color: theme.palette.text.secondary, fontSize: 14 }}>
            {subtitle}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RotateCcw size={14} />}
          onClick={() => void fetchRows(statusFilter)}
          disabled={loading}
        >
          {dict.admin.common.refresh}
        </Button>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <Select
          size="small"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as DemoRequestStatusFilter)
          }
          sx={{ minWidth: 200 }}
        >
          {STATUS_FILTERS.map((value) => (
            <MenuItem key={value} value={value} sx={{ fontSize: 13.5 }}>
              {t.filters[value]}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      <AdminTableShell
        columns={columns}
        loading={loading}
        error={error}
        rowCount={rows.length}
        emptyMessage={t.noRequests}
      >
        {rows.map((row) => {
          const busy = pendingId === row.id;
          const days = trialDays[row.id] ?? String(DEFAULT_TRIAL_DAYS);

          return (
            <TableRow
              key={row.id}
              sx={{
                "&:hover": { backgroundColor: theme.palette.background.hoverBg },
              }}
            >
              <TableCell sx={{ ...cellSx, fontWeight: 600 }}>
                {row.fullName}
                <Typography
                  sx={{ fontSize: 11.5, color: theme.palette.text.secondary }}
                >
                  {row.email}
                </Typography>
                {row.company && (
                  <Typography
                    sx={{ fontSize: 11.5, color: theme.palette.text.secondary }}
                  >
                    {row.company}
                  </Typography>
                )}
                {row.message && (
                  <Tooltip title={row.message}>
                    <Typography
                      sx={{
                        fontSize: 11.5,
                        color: theme.palette.text.secondary,
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontStyle: "italic",
                        mt: 0.5,
                      }}
                    >
                      {row.message}
                    </Typography>
                  </Tooltip>
                )}
              </TableCell>

              <TableCell sx={cellSx}>
                <Chip
                  size="small"
                  label={row.type}
                  variant="outlined"
                  color={row.type === "DEMO" ? "info" : "default"}
                  sx={{ fontSize: 11, height: 22 }}
                />
              </TableCell>

              <TableCell sx={cellSx}>
                {row.hasAccount ? (
                  <Stack spacing={0.5}>
                    <Chip
                      size="small"
                      label={row.accessStatus}
                      color={
                        row.accessStatus === "TRIAL" ||
                        row.accessStatus === "ACTIVE"
                          ? "success"
                          : "default"
                      }
                      variant="outlined"
                      sx={{ fontSize: 11, height: 22, width: "fit-content" }}
                    />
                    {row.trialEndsAt && (
                      <Typography
                        sx={{
                          fontSize: 11,
                          color: theme.palette.text.secondary,
                        }}
                      >
                        {t.until}{" "}
                        {new Date(row.trialEndsAt).toLocaleDateString(lang, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </Typography>
                    )}
                  </Stack>
                ) : (
                  <Tooltip title={t.noAccountHint}>
                    <Typography
                      sx={{ fontSize: 11.5, color: theme.palette.warning.main }}
                    >
                      {t.noAccount}
                    </Typography>
                  </Tooltip>
                )}
              </TableCell>

              <TableCell sx={cellSx}>
                <Chip
                  size="small"
                  label={t.statuses[row.status]}
                  color={statusColor(row.status)}
                  variant="outlined"
                  sx={{ fontSize: 11, height: 22 }}
                />
              </TableCell>

              <TableCell sx={{ ...cellSx, color: theme.palette.text.secondary }}>
                {new Date(row.createdAt).toLocaleString(lang, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </TableCell>

              <TableCell align="right" sx={cellSx}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="flex-end"
                >
                  <TextField
                    size="small"
                    select
                    value={days}
                    disabled={busy}
                    onChange={(e) =>
                      setTrialDays((prev) => ({
                        ...prev,
                        [row.id]: e.target.value,
                      }))
                    }
                    label={t.trialDays}
                    sx={{ width: 120 }}
                    slotProps={{ inputLabel: { sx: { fontSize: 12 } } }}
                  >
                    {TRIAL_PRESETS.map((preset) => (
                      <MenuItem
                        key={preset}
                        value={String(preset)}
                        sx={{ fontSize: 13 }}
                      >
                        {t.days.replace("{days}", String(preset))}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    disabled={busy}
                    startIcon={<Check size={13} />}
                    onClick={() => void decide(row, "APPROVED")}
                    sx={{ textTransform: "none", fontSize: 12 }}
                  >
                    {row.status === "APPROVED" ? t.regrant : t.approve}
                  </Button>

                  {row.status === "PENDING" ? (
                    <Button
                      size="small"
                      color="error"
                      disabled={busy}
                      startIcon={<X size={13} />}
                      onClick={() => void decide(row, "REJECTED")}
                      sx={{ textTransform: "none", fontSize: 12 }}
                    >
                      {t.reject}
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      disabled={busy}
                      startIcon={<RotateCw size={13} />}
                      onClick={() => void decide(row, "PENDING")}
                      sx={{ textTransform: "none", fontSize: 12 }}
                    >
                      {t.reopen}
                    </Button>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          );
        })}
      </AdminTableShell>
    </Box>
  );
}
