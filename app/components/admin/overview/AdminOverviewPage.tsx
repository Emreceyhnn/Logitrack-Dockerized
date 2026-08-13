"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { Info, RefreshCw } from "lucide-react";
import AdminKpiGrid from "./AdminKpiGrid";
import AdminRangeSelector from "./AdminRangeSelector";
import AdminActivityChart from "./AdminActivityChart";
import AdminSubscriptionChart from "./AdminSubscriptionChart";
import AdminTenantTable from "./AdminTenantTable";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import type {
  AdminOverviewActions,
  AdminOverviewData,
  AdminOverviewPageProps,
  AdminOverviewState,
  AdminTimeRange,
} from "@/app/lib/type/admin/overview";

/**
 * tr-Yönetim konsolu genel bakış sayfası.
 * en-Platform overview page. Owns the single root `AdminOverviewState` and
 *    exposes every mutation via `AdminOverviewActions`; children receive state
 *    and callbacks as props and never mutate state themselves.
 * input (AdminOverviewPageProps)
 * output (JSX.Element)
 */
export default function AdminOverviewPage({
  title,
  subtitle,
}: AdminOverviewPageProps) {
  const theme = useTheme();
  const { dict, lang } = useLanguage();

  // ─── Single root state ────────────────────────────────────────────────────
  const [state, setState] = useState<AdminOverviewState>({
    data: null,
    range: "24h",
    loading: true,
    refreshing: false,
    error: null,
  });

  // Guards against a slow response for an abandoned range overwriting a newer
  // one: only the most recent request is allowed to commit.
  const requestIdRef = useRef(0);
  // Mirrors the committed range so `fetchOverview` can read it without taking
  // a dependency on state (which would rebuild the callback on every load and
  // risk firing with a stale value).
  const rangeRef = useRef<AdminTimeRange>("24h");

  // ─── Actions ──────────────────────────────────────────────────────────────
  const fetchOverview = useCallback(
    async (range?: AdminTimeRange) => {
      const requestId = ++requestIdRef.current;
      const effectiveRange = range ?? rangeRef.current;
      rangeRef.current = effectiveRange;

      setState((s) => ({
        ...s,
        range: effectiveRange,
        // Keep prior data on screen while a range switch is in flight, so
        // the dashboard does not flash empty.
        loading: s.data === null,
        refreshing: s.data !== null,
        error: null,
      }));

      try {
        const res = await fetch(
          `/api/admin/overview?range=${encodeURIComponent(effectiveRange)}`,
          { cache: "no-store", headers: { accept: "application/json" } }
        );
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }
        const data = (await res.json()) as AdminOverviewData;

        if (requestId !== requestIdRef.current) return;

        setState((s) => ({
          ...s,
          data,
          range: data.range,
          loading: false,
          refreshing: false,
        }));
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setState((s) => ({
          ...s,
          loading: false,
          refreshing: false,
          error: err instanceof Error ? err.message : dict.admin.common.error,
        }));
      }
    },
    [dict.admin.common.error]
  );

  const setRange = useCallback(
    (range: AdminTimeRange) => {
      void fetchOverview(range);
    },
    [fetchOverview]
  );

  const actions = useMemo<AdminOverviewActions>(
    () => ({ fetchOverview, setRange }),
    [fetchOverview, setRange]
  );

  // Initial load; range changes go through setRange. `fetchOverview` is
  // stable (it reads the range from a ref), so this runs once.
  useEffect(() => {
    void fetchOverview("24h");
  }, [fetchOverview]);

  const busy = state.loading || state.refreshing;

  return (
    <Box>
      {/* Page header */}
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

        <Stack direction="row" alignItems="center" gap={1.5}>
          {state.data && (
            <Typography
              sx={{
                fontSize: 11.5,
                color: theme.palette.text.secondary,
                display: { xs: "none", md: "block" },
              }}
            >
              {dict.admin.overview.generatedAt}:{" "}
              {new Date(state.data.generatedAt).toLocaleTimeString(lang)}
            </Typography>
          )}
          <AdminRangeSelector
            value={state.range}
            onChange={actions.setRange}
            disabled={busy}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshCw size={14} />}
            onClick={() => void actions.fetchOverview()}
            disabled={busy}
          >
            {dict.admin.common.refresh}
          </Button>
        </Stack>
      </Stack>

      {state.error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => void actions.fetchOverview()}
            >
              {dict.admin.common.retry}
            </Button>
          }
        >
          {state.error}
        </Alert>
      )}

      {/* KPI band */}
      <Box sx={{ mb: 3 }}>
        <AdminKpiGrid kpis={state.data?.kpis ?? []} loading={state.loading} />
      </Box>

      {/* Charts */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
          mb: 3,
        }}
      >
        <AdminActivityChart
          series={state.data?.authActivity ?? []}
          signups={state.data?.signups ?? []}
          range={state.range}
          loading={state.loading}
        />
        <AdminSubscriptionChart
          slices={state.data?.subscriptions ?? []}
          loading={state.loading}
        />
      </Box>

      {/* Tenant leaderboard */}
      <Box sx={{ mb: 2 }}>
        <AdminTenantTable
          tenants={state.data?.topTenants ?? []}
          loading={state.loading}
          locale={lang}
        />
      </Box>

      {/* Honest disclosure about what this dashboard does NOT measure. */}
      <Stack
        direction="row"
        alignItems="flex-start"
        gap={1}
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: 2,
          border: `1px dashed ${theme.palette.divider}`,
        }}
      >
        <Tooltip title="" arrow>
          <Box component="span" sx={{ display: "flex", mt: "1px" }}>
            <Info size={14} color={theme.palette.text.secondary} />
          </Box>
        </Tooltip>
        <Typography
          sx={{ fontSize: 12, color: theme.palette.text.secondary }}
        >
          {dict.admin.overview.telemetryNotice}
        </Typography>
      </Stack>
    </Box>
  );
}
