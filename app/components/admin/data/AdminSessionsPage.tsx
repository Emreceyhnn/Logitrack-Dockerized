"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Stack,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import { RefreshCw, XCircle } from "lucide-react";
import AdminTableShell, { type AdminTableColumn } from "./AdminTableShell";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import type {
  AdminSessionRow,
  AdminSessionsActions,
  AdminSessionsState,
} from "@/app/lib/type/admin/data";

interface AdminSessionsPageProps {
  title: string;
  subtitle: string;
}

/**
 * tr-Oturum yönetimi sayfası.
 * en-Session management: lists live sessions and allows killing them.
 *    Session tokens are never fetched, so nothing here can be replayed.
 * input (AdminSessionsPageProps)
 * output (JSX.Element)
 */
export default function AdminSessionsPage({
  title,
  subtitle,
}: AdminSessionsPageProps) {
  const theme = useTheme();
  const { dict, lang } = useLanguage();
  const t = dict.admin.data.sessions;

  const [state, setState] = useState<AdminSessionsState>({
    rows: [],
    loading: true,
    error: null,
    pendingId: null,
  });

  const fetchSessions = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/admin/sessions", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { rows: AdminSessionRow[] };
      setState((s) => ({ ...s, rows: data.rows, loading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : dict.admin.common.error,
      }));
    }
  }, [dict.admin.common.error]);

  const revoke = useCallback(
    async (sessionId: string) => {
      if (!window.confirm(t.confirmKill)) return;

      setState((s) => ({ ...s, pendingId: sessionId, error: null }));
      try {
        const res = await fetch("/api/admin/sessions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ sessionId }),
        });
        const json: unknown = await res.json();
        if (!res.ok) {
          throw new Error(
            (json as { error?: string })?.error ?? `Failed (${res.status})`
          );
        }
        setState((s) => ({ ...s, pendingId: null }));
        await fetchSessions();
      } catch (err) {
        setState((s) => ({
          ...s,
          pendingId: null,
          error: err instanceof Error ? err.message : dict.admin.common.error,
        }));
      }
    },
    [fetchSessions, t.confirmKill, dict.admin.common.error]
  );

  const actions = useMemo<AdminSessionsActions>(
    () => ({ fetchSessions, revoke }),
    [fetchSessions, revoke]
  );

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  const columns: AdminTableColumn[] = [
    { id: "user", label: t.user },
    { id: "device", label: t.device },
    { id: "ip", label: t.ip },
    { id: "lastActivity", label: t.lastActivity },
    { id: "state", label: t.state },
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
          startIcon={<RefreshCw size={14} />}
          onClick={() => void actions.fetchSessions()}
          disabled={state.loading}
        >
          {dict.admin.common.refresh}
        </Button>
      </Stack>

      <AdminTableShell
        columns={columns}
        loading={state.loading}
        error={state.error}
        rowCount={state.rows.length}
      >
        {state.rows.map((session) => {
          const stateLabel = session.isRevoked
            ? t.revoked
            : session.isActive
              ? t.active
              : t.expired;
          const stateColor = session.isActive
            ? theme.palette.kpi.emerald
            : session.isRevoked
              ? theme.palette.kpi.error
              : theme.palette.kpi.slateGray;

          return (
            <TableRow
              key={session.id}
              sx={{
                "&:hover": {
                  backgroundColor: theme.palette.background.hoverBg,
                },
              }}
            >
              <TableCell sx={cellSx}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                  {session.userName}
                </Typography>
                <Typography
                  sx={{ fontSize: 11.5, color: theme.palette.text.secondary }}
                >
                  {session.userEmail}
                </Typography>
              </TableCell>

              <TableCell
                sx={{
                  ...cellSx,
                  color: theme.palette.text.secondary,
                  maxWidth: 260,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <Tooltip title={session.deviceInfo ?? t.unknownDevice} arrow>
                  <span>{session.deviceInfo ?? t.unknownDevice}</span>
                </Tooltip>
              </TableCell>

              <TableCell
                sx={{
                  ...cellSx,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  color: theme.palette.text.secondary,
                }}
              >
                {session.ipAddress ?? "—"}
              </TableCell>

              <TableCell
                sx={{
                  ...cellSx,
                  color: theme.palette.text.secondary,
                  whiteSpace: "nowrap",
                }}
              >
                {new Date(session.lastActivityAt).toLocaleString(lang, {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </TableCell>

              <TableCell sx={cellSx}>
                <Chip
                  size="small"
                  label={stateLabel}
                  sx={{
                    height: 21,
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: stateColor,
                    backgroundColor: alpha(stateColor, 0.12),
                  }}
                />
              </TableCell>

              <TableCell align="right" sx={cellSx}>
                <Tooltip title={t.kill} arrow>
                  <Box component="span">
                    <Button
                      size="small"
                      color="error"
                      disabled={!session.isActive || state.pendingId === session.id}
                      onClick={() => void actions.revoke(session.id)}
                      startIcon={<XCircle size={13} />}
                      sx={{
                        textTransform: "none",
                        fontSize: 12,
                        minWidth: 0,
                      }}
                    >
                      {t.kill}
                    </Button>
                  </Box>
                </Tooltip>
              </TableCell>
            </TableRow>
          );
        })}
      </AdminTableShell>
    </Box>
  );
}
