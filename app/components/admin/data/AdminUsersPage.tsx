"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import { LogOut, ShieldBan, ShieldCheck, Trash2, UserMinus } from "lucide-react";
import AdminTableShell, { type AdminTableColumn } from "./AdminTableShell";
import MasqueradeNotice from "./MasqueradeNotice";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import { useAdminDeletion } from "@/app/hooks/useAdminDeletion";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import type {
  AdminUserFilters,
  AdminUserRow,
  AdminUserStatus,
  AdminUsersActions,
  AdminUsersState,
  Paginated,
} from "@/app/lib/type/admin/data";

interface AdminUsersPageProps {
  title: string;
  subtitle: string;
  /** The signed-in admin, so the UI can disable self-targeting actions. */
  currentAdminId: string;
}

const STATUS_OPTIONS: (AdminUserStatus | "ALL")[] = [
  "ALL",
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
];

/**
 * tr-Kullanıcı yönetimi sayfası.
 * en-User management. Owns the single root `AdminUsersState` and exposes every
 *    mutation through `AdminUsersActions`.
 * input (AdminUsersPageProps)
 * output (JSX.Element)
 */
export default function AdminUsersPage({
  title,
  subtitle,
  currentAdminId,
}: AdminUsersPageProps) {
  const theme = useTheme();
  const { dict, lang } = useLanguage();
  const t = dict.admin.data.users;

  const [state, setState] = useState<AdminUsersState>({
    data: null,
    filters: {
      search: "",
      status: "ALL",
      companyId: "ALL",
      page: 1,
      pageSize: 25,
    },
    loading: true,
    error: null,
    pendingId: null,
  });

  // Filters live in a ref as well, so fetchUsers stays stable and can read the
  // latest values without being rebuilt on every keystroke.
  const filtersRef = useRef<AdminUserFilters>(state.filters);
  const requestIdRef = useRef(0);

  const fetchUsers = useCallback(
    async (patch?: Partial<AdminUserFilters>) => {
      const next = { ...filtersRef.current, ...patch };
      filtersRef.current = next;
      const requestId = ++requestIdRef.current;

      setState((s) => ({ ...s, filters: next, loading: true, error: null }));

      try {
        const params = new URLSearchParams({
          search: next.search,
          status: next.status,
          companyId: next.companyId,
          page: String(next.page),
          pageSize: String(next.pageSize),
        });

        const res = await fetch(`/api/admin/users?${params}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = (await res.json()) as Paginated<AdminUserRow>;

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
    <K extends keyof AdminUserFilters>(key: K, value: AdminUserFilters[K]) => {
      // Any filter change resets to page 1; staying on page 7 of a narrower
      // result set would show an empty table.
      void fetchUsers(
        key === "page" ? { [key]: value } : { [key]: value, page: 1 }
      );
    },
    [fetchUsers]
  );

  const mutate = useCallback(
    async (userId: string, body: Record<string, unknown>) => {
      setState((s) => ({ ...s, pendingId: userId, error: null }));
      try {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ ...body, userId }),
        });
        const json: unknown = await res.json();
        if (!res.ok) {
          throw new Error(
            (json as { error?: string })?.error ?? `Failed (${res.status})`
          );
        }
        setState((s) => ({ ...s, pendingId: null }));
        await fetchUsers();
      } catch (err) {
        setState((s) => ({
          ...s,
          pendingId: null,
          error: err instanceof Error ? err.message : dict.admin.common.error,
        }));
      }
    },
    [fetchUsers, dict.admin.common.error]
  );

  const setStatus = useCallback(
    async (userId: string, status: AdminUserStatus) => {
      if (status !== "ACTIVE" && !window.confirm(t.confirmSuspend)) return;
      await mutate(userId, { action: "setStatus", status });
    },
    [mutate, t.confirmSuspend]
  );

  const revokeUserSessions = useCallback(
    async (userId: string) => {
      if (!window.confirm(t.confirmRevoke)) return;
      await mutate(userId, { action: "revokeSessions" });
    },
    [mutate, t.confirmRevoke]
  );

  const actions = useMemo<AdminUsersActions>(
    () => ({ fetchUsers, setFilter, setStatus, revokeUserSessions }),
    [fetchUsers, setFilter, setStatus, revokeUserSessions]
  );

  const deletion = useAdminDeletion(fetchUsers);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // Debounce the search box so typing does not fire a request per character.
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const onSearchChange = useCallback(
    (value: string) => {
      setState((s) => ({ ...s, filters: { ...s.filters, search: value } }));
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        void fetchUsers({ search: value, page: 1 });
      }, 350);
    },
    [fetchUsers]
  );

  useEffect(
    () => () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    },
    []
  );

  const statusColors: Record<AdminUserStatus, string> = {
    ACTIVE: theme.palette.kpi.emerald,
    INACTIVE: theme.palette.kpi.slateGray,
    SUSPENDED: theme.palette.kpi.error,
  };

  const columns: AdminTableColumn[] = [
    { id: "user", label: t.user },
    { id: "tenant", label: t.tenant },
    { id: "role", label: t.role },
    { id: "status", label: t.status },
    { id: "sessions", label: t.sessions, align: "right" },
    { id: "lastLogin", label: t.lastLogin },
    { id: "actions", label: t.actions, align: "right" },
  ];

  const rows = state.data?.rows ?? [];
  const pageCount = state.data
    ? Math.max(1, Math.ceil(state.data.total / state.data.pageSize))
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

      {/* Filters */}
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
          value={state.filters.status}
          onChange={(e) =>
            actions.setFilter(
              "status",
              e.target.value as AdminUserFilters["status"]
            )
          }
          sx={{ minWidth: 170 }}
        >
          {STATUS_OPTIONS.map((option) => (
            <MenuItem key={option} value={option} sx={{ fontSize: 13.5 }}>
              {option === "ALL" ? t.allStatuses : t.statuses[option]}
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
        {rows.map((user) => {
          const isSelf = user.id === currentAdminId;
          const busy = state.pendingId === user.id;

          return (
            <TableRow
              key={user.id}
              sx={{
                "&:hover": {
                  backgroundColor: theme.palette.background.hoverBg,
                },
              }}
            >
              <TableCell sx={{ borderBottomColor: theme.palette.divider }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                  {user.name} {user.surname}
                </Typography>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Typography
                    sx={{ fontSize: 11.5, color: theme.palette.text.secondary }}
                  >
                    {user.email}
                  </Typography>
                  {!user.emailVerified && (
                    <Tooltip title={t.unverified} arrow>
                      <Box
                        component="span"
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          backgroundColor: theme.palette.kpi.amber,
                        }}
                      />
                    </Tooltip>
                  )}
                </Stack>
              </TableCell>

              <TableCell
                sx={{
                  fontSize: 12.5,
                  borderBottomColor: theme.palette.divider,
                }}
              >
                {user.companyName ?? "—"}
              </TableCell>

              <TableCell
                sx={{
                  fontSize: 12.5,
                  borderBottomColor: theme.palette.divider,
                }}
              >
                {user.roleName ?? "—"}
              </TableCell>

              <TableCell sx={{ borderBottomColor: theme.palette.divider }}>
                <Chip
                  size="small"
                  label={t.statuses[user.status]}
                  sx={{
                    height: 21,
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: statusColors[user.status],
                    backgroundColor: alpha(statusColors[user.status], 0.12),
                  }}
                />
              </TableCell>

              <TableCell
                align="right"
                sx={{
                  fontSize: 12.5,
                  borderBottomColor: theme.palette.divider,
                }}
              >
                {user.activeSessionCount}
              </TableCell>

              <TableCell
                sx={{
                  fontSize: 12,
                  color: theme.palette.text.secondary,
                  borderBottomColor: theme.palette.divider,
                  whiteSpace: "nowrap",
                }}
              >
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleDateString(lang, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : t.never}
              </TableCell>

              <TableCell
                align="right"
                sx={{ borderBottomColor: theme.palette.divider }}
              >
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  {user.status === "ACTIVE" ? (
                    <>
                      <Tooltip title={isSelf ? t.selfActionBlocked : t.deactivate} arrow>
                        <Box component="span">
                          <IconButton
                            size="small"
                            disabled={isSelf || busy}
                            onClick={() =>
                              void actions.setStatus(user.id, "INACTIVE")
                            }
                          >
                            <UserMinus size={14} />
                          </IconButton>
                        </Box>
                      </Tooltip>
                      <Tooltip title={isSelf ? t.selfActionBlocked : t.suspend} arrow>
                        <Box component="span">
                          <IconButton
                            size="small"
                            disabled={isSelf || busy}
                            onClick={() =>
                              void actions.setStatus(user.id, "SUSPENDED")
                            }
                            sx={{ color: theme.palette.kpi.error }}
                          >
                            <ShieldBan size={14} />
                          </IconButton>
                        </Box>
                      </Tooltip>
                    </>
                  ) : (
                    <Tooltip title={isSelf ? t.selfActionBlocked : t.activate} arrow>
                      <Box component="span">
                        <IconButton
                          size="small"
                          disabled={isSelf || busy}
                          onClick={() =>
                            void actions.setStatus(user.id, "ACTIVE")
                          }
                          sx={{ color: theme.palette.kpi.emerald }}
                        >
                          <ShieldCheck size={14} />
                        </IconButton>
                      </Box>
                    </Tooltip>
                  )}

                  <Tooltip title={t.revokeSessions} arrow>
                    <Box component="span">
                      <IconButton
                        size="small"
                        disabled={busy || user.activeSessionCount === 0}
                        onClick={() =>
                          void actions.revokeUserSessions(user.id)
                        }
                      >
                        <LogOut size={14} />
                      </IconButton>
                    </Box>
                  </Tooltip>

                  <Tooltip
                    title={
                      isSelf
                        ? dict.admin.data.deletion.cannotDeleteSelf
                        : dict.admin.data.deletion.delete
                    }
                    arrow
                  >
                    <Box component="span">
                      <IconButton
                        size="small"
                        disabled={isSelf || busy}
                        onClick={() =>
                          deletion.actions.requestDelete({
                            entity: "user",
                            id: user.id,
                            label: user.email,
                          })
                        }
                        sx={{ color: theme.palette.kpi.error }}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </Box>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          );
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

      <MasqueradeNotice />

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
