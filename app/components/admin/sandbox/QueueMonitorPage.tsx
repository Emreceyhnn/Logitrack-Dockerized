"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  LinearProgress,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import { Info, RefreshCw } from "lucide-react";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  QueueMonitorActions,
  QueueMonitorState,
  QueueSnapshot,
  SandboxPageProps,
} from "@/app/lib/type/admin/sandbox";

const LIVE_INTERVAL_MS = 5_000;

/**
 * tr-Kuyruk ve önbellek izleyici sayfası.
 * en-Queue & cache monitor. Reports the REAL Redis keyspace — this app has no
 *    BullMQ, so no job board is invented; see the notice rendered at the top.
 * input (SandboxPageProps)
 * output (JSX.Element)
 */
export default function QueueMonitorPage({
  title,
  subtitle,
}: SandboxPageProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const t = dict.admin.sandbox.queue;

  const [state, setState] = useState<QueueMonitorState>({
    snapshot: null,
    loading: true,
    error: null,
    live: false,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/admin/sandbox/queue", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const snapshot = (await res.json()) as QueueSnapshot;
      setState((s) => ({ ...s, snapshot, loading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : dict.admin.common.error,
      }));
    }
  }, [dict.admin.common.error]);

  const setLive = useCallback((live: boolean) => {
    setState((s) => ({ ...s, live }));
  }, []);

  const actions = useMemo<QueueMonitorActions>(
    () => ({ refresh, setLive }),
    [refresh, setLive]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Auto-refresh only while the toggle is on; the interval is torn down as
  // soon as it flips off or the page unmounts.
  useEffect(() => {
    if (!state.live) return;
    const id = setInterval(() => void refresh(), LIVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [state.live, refresh]);

  const snapshot = state.snapshot;
  const maxCount = snapshot?.namespaces[0]?.keyCount ?? 1;

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

        <Stack direction="row" alignItems="center" gap={1.5}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={state.live}
                onChange={(e) => actions.setLive(e.target.checked)}
              />
            }
            label={
              <Typography sx={{ fontSize: 12.5 }}>{t.live}</Typography>
            }
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshCw size={14} />}
            onClick={() => void actions.refresh()}
            disabled={state.loading}
          >
            {dict.admin.common.refresh}
          </Button>
        </Stack>
      </Stack>

      {/* Honest disclosure about the absence of a job queue. */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="flex-start"
        sx={{
          px: 2,
          py: 1.5,
          mb: 2.5,
          borderRadius: 2,
          border: `1px dashed ${theme.palette.divider}`,
        }}
      >
        <Info
          size={14}
          color={theme.palette.text.secondary}
          style={{ marginTop: 2, flexShrink: 0 }}
        />
        <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
          {t.noBullmq}
        </Typography>
      </Stack>

      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}

      {snapshot && !snapshot.reachable && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t.unreachable}
        </Alert>
      )}

      {/* Summary tiles */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          mb: 3,
        }}
      >
        {[
          { label: t.totalKeys, value: snapshot?.totalKeys ?? 0 },
          { label: t.namespaces, value: snapshot?.namespaces.length ?? 0 },
          { label: t.rateLimitKeys, value: snapshot?.rateLimitKeys ?? 0 },
          {
            label: t.latency,
            value: snapshot ? `${snapshot.latencyMs} ms` : "—",
          },
        ].map((tile) => (
          <Box
            key={tile.label}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper_alpha.main_70,
            }}
          >
            <Typography
              variant="overline"
              sx={{
                fontSize: 10,
                fontWeight: 700,
                color: theme.palette.text.secondary,
              }}
            >
              {tile.label}
            </Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
              {typeof tile.value === "number"
                ? tile.value.toLocaleString()
                : tile.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {snapshot?.truncated && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t.truncated}
        </Alert>
      )}

      {/* Namespace breakdown */}
      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper_alpha.main_70,
        }}
      >
        {state.loading && !snapshot ? (
          <LinearProgress />
        ) : !snapshot || snapshot.namespaces.length === 0 ? (
          <Typography
            sx={{
              fontSize: 13,
              color: theme.palette.text.secondary,
              py: 3,
              textAlign: "center",
            }}
          >
            {dict.admin.common.noData}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: theme.palette.text.secondary,
                  }}
                >
                  {t.namespace}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: theme.palette.text.secondary,
                    width: 100,
                  }}
                >
                  {t.keyCount}
                </TableCell>
                <TableCell sx={{ width: "40%" }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {snapshot.namespaces.map((ns) => (
                <TableRow key={ns.name}>
                  <TableCell
                    sx={{
                      fontSize: 12.5,
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                    }}
                  >
                    {ns.name}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: 12.5 }}>
                    {ns.keyCount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (ns.keyCount / maxCount) * 100)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>
    </Box>
  );
}
