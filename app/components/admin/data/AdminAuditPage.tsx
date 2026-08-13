"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import { ChevronDown, ChevronRight, Info, Lock } from "lucide-react";
import AdminTableShell, { type AdminTableColumn } from "./AdminTableShell";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import type {
  AdminAuditActions,
  AdminAuditFilters,
  AdminAuditRow,
  AdminAuditState,
  Paginated,
} from "@/app/lib/type/admin/data";

interface AdminAuditPageProps {
  title: string;
  subtitle: string;
}

/** Mirrors the AuditAction enum in schema.prisma. */
const AUDIT_ACTIONS = [
  "ALL",
  "LOGIN",
  "LOGOUT",
  "REGISTER",
  "TOKEN_REFRESH",
  "SESSION_REVOKE",
  "PASSWORD_CHANGE",
  "LOGIN_FAILED",
  "SETTINGS_UPDATE",
  "PASSWORD_RESET_REQUEST",
  "PASSWORD_RESET_COMPLETE",
  "EMAIL_VERIFICATION_SENT",
  "EMAIL_VERIFIED",
];

/**
 * tr-Denetim kayıtları sayfası.
 * en-Audit log viewer. Read-only by construction — the API exposes no mutation
 *    route, so nothing here can rewrite history.
 * input (AdminAuditPageProps)
 * output (JSX.Element)
 */
export default function AdminAuditPage({
  title,
  subtitle,
}: AdminAuditPageProps) {
  const theme = useTheme();
  const { dict, lang } = useLanguage();
  const t = dict.admin.data.audit;

  const [state, setState] = useState<AdminAuditState>({
    data: null,
    filters: { action: "ALL", search: "", page: 1, pageSize: 25 },
    loading: true,
    error: null,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtersRef = useRef<AdminAuditFilters>(state.filters);
  const requestIdRef = useRef(0);

  const fetchAudit = useCallback(
    async (patch?: Partial<AdminAuditFilters>) => {
      const next = { ...filtersRef.current, ...patch };
      filtersRef.current = next;
      const requestId = ++requestIdRef.current;

      setState((s) => ({ ...s, filters: next, loading: true, error: null }));

      try {
        const params = new URLSearchParams({
          action: next.action,
          search: next.search,
          page: String(next.page),
          pageSize: String(next.pageSize),
        });
        const res = await fetch(`/api/admin/audit?${params}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = (await res.json()) as Paginated<AdminAuditRow>;

        if (requestId !== requestIdRef.current) return;
        setState((s) => ({ ...s, data, loading: false }));
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : dict.admin.common.error,
        }));
      }
    },
    [dict.admin.common.error]
  );

  const setFilter = useCallback(
    <K extends keyof AdminAuditFilters>(key: K, value: AdminAuditFilters[K]) => {
      void fetchAudit(
        key === "page" ? { [key]: value } : { [key]: value, page: 1 }
      );
    },
    [fetchAudit]
  );

  const actions = useMemo<AdminAuditActions>(
    () => ({ fetchAudit, setFilter }),
    [fetchAudit, setFilter]
  );

  useEffect(() => {
    void fetchAudit();
  }, [fetchAudit]);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const onSearchChange = useCallback(
    (value: string) => {
      setState((s) => ({ ...s, filters: { ...s.filters, search: value } }));
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        void fetchAudit({ search: value, page: 1 });
      }, 350);
    },
    [fetchAudit]
  );

  useEffect(
    () => () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    },
    []
  );

  /** Failed logins are the signal worth spotting at a glance. */
  const actionColor = (action: string) =>
    action === "LOGIN_FAILED"
      ? theme.palette.kpi.error
      : action.startsWith("PASSWORD") || action === "SESSION_REVOKE"
        ? theme.palette.kpi.amber
        : theme.palette.kpi.sky;

  const columns: AdminTableColumn[] = [
    { id: "expand", label: "", width: 40 },
    { id: "action", label: t.action },
    { id: "actor", label: t.actor },
    { id: "ip", label: t.ip },
    { id: "when", label: t.when },
  ];

  const rows = state.data?.rows ?? [];
  const pageCount = state.data
    ? Math.max(1, Math.ceil(state.data.total / state.data.pageSize))
    : 1;

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

      {/* Immutability is a property worth stating, not just implementing. */}
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
          {t.immutableNotice}
        </Typography>
      </Stack>

      {/* Explains the absence of a separate "Live Logs" page: app/lib/logger.ts
          persists nothing, so this audit trail is the real event record. */}
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
        <Info
          size={13}
          color={theme.palette.text.secondary}
          style={{ marginTop: 2, flexShrink: 0 }}
        />
        <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
          {t.noLiveLogsNotice}
        </Typography>
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <TextField
          size="small"
          value={state.filters.search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.search}
          sx={{ flex: 1, maxWidth: 340 }}
        />
        <Select
          size="small"
          value={state.filters.action}
          onChange={(e) => actions.setFilter("action", e.target.value)}
          sx={{ minWidth: 220 }}
        >
          {AUDIT_ACTIONS.map((action) => (
            <MenuItem key={action} value={action} sx={{ fontSize: 13 }}>
              {action === "ALL" ? t.allActions : action}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      <AdminTableShell
        columns={columns}
        loading={state.loading}
        error={state.error}
        rowCount={rows.length}
      >
        {rows.flatMap((log) => {
          const expanded = expandedId === log.id;

          const mainRow = (
            <TableRow
              key={log.id}
              sx={{
                "&:hover": {
                  backgroundColor: theme.palette.background.hoverBg,
                },
              }}
            >
              <TableCell sx={{ ...cellSx, py: 0.5 }}>
                {log.metadata && (
                  <IconButton
                    size="small"
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                    aria-label={t.metadata}
                  >
                    {expanded ? (
                      <ChevronDown size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                  </IconButton>
                )}
              </TableCell>

              <TableCell sx={cellSx}>
                <Chip
                  size="small"
                  label={log.action}
                  sx={{
                    height: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    color: actionColor(log.action),
                    backgroundColor: alpha(actionColor(log.action), 0.12),
                  }}
                />
              </TableCell>

              <TableCell sx={cellSx}>
                {log.userEmail ?? (
                  <Typography
                    component="span"
                    sx={{
                      fontSize: 12.5,
                      fontStyle: "italic",
                      color: theme.palette.text.secondary,
                    }}
                  >
                    {t.system}
                  </Typography>
                )}
              </TableCell>

              <TableCell
                sx={{
                  ...cellSx,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  color: theme.palette.text.secondary,
                }}
              >
                {log.ipAddress ?? "—"}
              </TableCell>

              <TableCell
                sx={{
                  ...cellSx,
                  color: theme.palette.text.secondary,
                  whiteSpace: "nowrap",
                }}
              >
                {new Date(log.createdAt).toLocaleString(lang, {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </TableCell>
            </TableRow>
          );

          if (!log.metadata) return [mainRow];

          return [
            mainRow,
            <TableRow key={`${log.id}-meta`}>
              <TableCell
                colSpan={columns.length}
                sx={{ py: 0, borderBottom: expanded ? undefined : "none" }}
              >
                <Collapse in={expanded} unmountOnExit>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      my: 1.5,
                      p: 1.5,
                      borderRadius: 1.5,
                      fontSize: 11.5,
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                      backgroundColor:
                        theme.palette.mode === "dark"
                          ? "rgba(0,0,0,0.28)"
                          : "rgba(0,0,0,0.035)",
                      color: theme.palette.text.secondary,
                      overflowX: "auto",
                    }}
                  >
                    {log.metadata}
                  </Box>
                </Collapse>
              </TableCell>
            </TableRow>,
          ];
        })}
      </AdminTableShell>

      {state.data && state.data.total > state.data.pageSize && (
        <Stack alignItems="center" sx={{ mt: 2.5 }}>
          <Pagination
            size="small"
            count={pageCount}
            page={state.data.page}
            onChange={(_, page) => actions.setFilter("page", page)}
          />
        </Stack>
      )}
    </Box>
  );
}
