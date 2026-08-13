"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
  alpha,
  type Theme,
} from "@mui/material";
import { Info, RotateCcw, Send } from "lucide-react";
import JsonViewer from "./JsonViewer";
import KeyValueEditor, { createEmptyRow } from "./KeyValueEditor";
import { groupEndpointPresets } from "@/app/lib/admin/endpoints";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  ApiEndpointPreset,
  ApiResponseResult,
  ApiTesterActions,
  ApiTesterState,
  HttpMethod,
  KeyValueRow,
  SandboxPageProps,
} from "@/app/lib/type/admin/sandbox";

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/**
 * tr-Satırları gönderilecek nesneye çevirir.
 * en-Reduces editor rows to a plain object, dropping disabled and unnamed ones.
 * input (rows: KeyValueRow[])
 * output (Record<string, string>)
 */
function rowsToRecord(rows: KeyValueRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (row.enabled && key) out[key] = row.value;
  }
  return out;
}

/**
 * tr-HTTP durum koduna göre renk seçer.
 * en-Maps an HTTP status class to a palette colour.
 * input (status: number, theme: Theme)
 * output (string)
 */
function statusColor(status: number, theme: Theme): string {
  if (status >= 500) return theme.palette.kpi.error;
  if (status >= 400) return theme.palette.kpi.amber;
  if (status >= 300) return theme.palette.kpi.sky;
  return theme.palette.kpi.emerald;
}

/**
 * tr-API test aracı sayfası.
 * en-API Tester. Owns the single root `ApiTesterState` and exposes mutations
 *    through `ApiTesterActions`; children are controlled and never mutate it.
 * input (SandboxPageProps)
 * output (JSX.Element)
 */
export default function ApiTesterPage({ title, subtitle }: SandboxPageProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const t = dict.admin.sandbox.api;

  const [state, setState] = useState<ApiTesterState>({
    method: "GET",
    path: "/api/overview/dashboard",
    headers: [createEmptyRow()],
    query: [createEmptyRow()],
    body: "",
    selectedPresetId: null,
    response: null,
    loading: false,
    error: null,
  });

  const [tab, setTab] = useState(0);

  const presetGroups = useMemo(() => [...groupEndpointPresets()], []);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const setMethod = useCallback((method: HttpMethod) => {
    setState((s) => ({ ...s, method }));
  }, []);

  const setPath = useCallback((path: string) => {
    // Typing a path by hand detaches it from the selected preset.
    setState((s) => ({ ...s, path, selectedPresetId: null }));
  }, []);

  const setBody = useCallback((body: string) => {
    setState((s) => ({ ...s, body }));
  }, []);

  const applyPreset = useCallback((preset: ApiEndpointPreset) => {
    setState((s) => ({
      ...s,
      method: preset.method,
      path: preset.path,
      body: preset.sampleBody ?? "",
      selectedPresetId: preset.id,
      error: null,
    }));
  }, []);

  const updateRows = useCallback(
    (kind: "headers" | "query", rows: KeyValueRow[]) => {
      setState((s) => ({ ...s, [kind]: rows }));
    },
    []
  );

  const reset = useCallback(() => {
    setState({
      method: "GET",
      path: "/api/overview/dashboard",
      headers: [createEmptyRow()],
      query: [createEmptyRow()],
      body: "",
      selectedPresetId: null,
      response: null,
      loading: false,
      error: null,
    });
  }, []);

  const send = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));

    // Validate the body client-side too, so an obvious typo does not cost a
    // server round trip.
    const currentBody = state.body.trim();
    const needsBody = state.method !== "GET" && state.method !== "DELETE";
    if (needsBody && currentBody) {
      try {
        JSON.parse(currentBody);
      } catch {
        setState((s) => ({ ...s, loading: false, error: t.bodyInvalid }));
        return;
      }
    }

    try {
      const res = await fetch("/api/admin/sandbox/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          method: state.method,
          path: state.path,
          headers: rowsToRecord(state.headers),
          query: rowsToRecord(state.query),
          ...(needsBody && currentBody ? { body: currentBody } : {}),
        }),
      });

      const json: unknown = await res.json();

      if (!res.ok) {
        const message =
          (json as { error?: string })?.error ?? `Request failed (${res.status})`;
        setState((s) => ({ ...s, loading: false, error: message }));
        return;
      }

      setState((s) => ({
        ...s,
        loading: false,
        response: json as ApiResponseResult,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : dict.admin.common.error,
      }));
    }
  }, [state.method, state.path, state.headers, state.query, state.body, t.bodyInvalid, dict.admin.common.error]);

  const actions = useMemo<ApiTesterActions>(
    () => ({
      setMethod,
      setPath,
      setBody,
      applyPreset,
      updateRows,
      send,
      reset,
    }),
    [setMethod, setPath, setBody, applyPreset, updateRows, send, reset]
  );

  const bodyDisabled = state.method === "GET" || state.method === "DELETE";

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

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "260px 1fr" },
          alignItems: "start",
        }}
      >
        {/* Preset picker */}
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper_alpha.main_70,
            maxHeight: { lg: 620 },
            overflowY: "auto",
          }}
        >
          <Typography
            variant="overline"
            sx={{
              fontSize: 10.5,
              fontWeight: 700,
              color: theme.palette.text.secondary,
            }}
          >
            {t.presets}
          </Typography>

          {presetGroups.map(([group, presets]) => (
            <Box key={group} sx={{ mt: 1.5 }}>
              <Typography
                sx={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  color: theme.palette.text.secondary,
                  opacity: 0.7,
                  mb: 0.5,
                }}
              >
                {group}
              </Typography>
              <Stack spacing={0.5}>
                {presets.map((preset) => {
                  const active = state.selectedPresetId === preset.id;
                  return (
                    <Box
                      key={preset.id}
                      component="button"
                      type="button"
                      onClick={() => actions.applyPreset(preset)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        width: "100%",
                        px: 1,
                        py: 0.6,
                        borderRadius: 1.25,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "inherit",
                        fontSize: 12.5,
                        border: "none",
                        color: active
                          ? theme.palette.primary.main
                          : theme.palette.text.primary,
                        backgroundColor: active
                          ? alpha(theme.palette.primary.main, 0.1)
                          : "transparent",
                        "&:hover": {
                          backgroundColor: theme.palette.background.hoverBg,
                        },
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          fontSize: 9.5,
                          fontWeight: 800,
                          minWidth: 34,
                          color: theme.palette.text.secondary,
                        }}
                      >
                        {preset.method}
                      </Box>
                      <Box component="span" sx={{ flex: 1 }}>
                        {preset.label}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Box>

        {/* Request builder + response */}
        <Box>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper_alpha.main_70,
              mb: 2,
            }}
          >
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Select
                size="small"
                value={state.method}
                onChange={(e) => actions.setMethod(e.target.value as HttpMethod)}
                sx={{ minWidth: 108, fontWeight: 700, fontSize: 13 }}
              >
                {METHODS.map((method) => (
                  <MenuItem key={method} value={method} sx={{ fontSize: 13 }}>
                    {method}
                  </MenuItem>
                ))}
              </Select>
              <TextField
                size="small"
                fullWidth
                value={state.path}
                onChange={(e) => actions.setPath(e.target.value)}
                placeholder="/api/…"
                slotProps={{
                  htmlInput: {
                    style: {
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontSize: 13,
                    },
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={() => void actions.send()}
                disabled={state.loading}
                startIcon={<Send size={15} />}
                sx={{ minWidth: 128, textTransform: "none", fontWeight: 600 }}
              >
                {state.loading ? t.sending : t.send}
              </Button>
              <Button
                variant="outlined"
                onClick={actions.reset}
                disabled={state.loading}
                sx={{ minWidth: 44, px: 1 }}
                aria-label={t.reset}
              >
                <RotateCcw size={15} />
              </Button>
            </Stack>

            <Tabs
              value={tab}
              onChange={(_, v: number) => setTab(v)}
              sx={{
                minHeight: 36,
                mb: 1.5,
                "& .MuiTab-root": {
                  minHeight: 36,
                  textTransform: "none",
                  fontSize: 13,
                  fontWeight: 600,
                },
              }}
            >
              <Tab label={t.headers} />
              <Tab label={t.query} />
              <Tab label={t.body} disabled={bodyDisabled} />
            </Tabs>

            {tab === 0 && (
              <KeyValueEditor
                rows={state.headers}
                onChange={(rows) => actions.updateRows("headers", rows)}
                keyPlaceholder={t.keyPlaceholder}
                valuePlaceholder={t.valuePlaceholder}
              />
            )}
            {tab === 1 && (
              <KeyValueEditor
                rows={state.query}
                onChange={(rows) => actions.updateRows("query", rows)}
                keyPlaceholder={t.queryKeyPlaceholder}
                valuePlaceholder={t.valuePlaceholder}
              />
            )}
            {tab === 2 && (
              <TextField
                multiline
                minRows={8}
                fullWidth
                value={state.body}
                onChange={(e) => actions.setBody(e.target.value)}
                placeholder="{}"
                slotProps={{
                  htmlInput: {
                    style: {
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontSize: 12.5,
                    },
                  },
                }}
              />
            )}

            <Stack
              direction="row"
              spacing={1}
              alignItems="flex-start"
              sx={{ mt: 2 }}
            >
              <Info
                size={13}
                color={theme.palette.text.secondary}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <Typography
                sx={{ fontSize: 11.5, color: theme.palette.text.secondary }}
              >
                {t.scopeNotice}
              </Typography>
            </Stack>
          </Box>

          {/* Response */}
          {state.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.error}
            </Alert>
          )}

          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper_alpha.main_70,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
              flexWrap="wrap"
              gap={1}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                {t.response}
              </Typography>

              {state.response && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    size="small"
                    label={`${state.response.status} ${state.response.statusText}`}
                    sx={{
                      height: 22,
                      fontSize: 11,
                      fontWeight: 700,
                      color: statusColor(state.response.status, theme),
                      backgroundColor: alpha(
                        statusColor(state.response.status, theme),
                        0.12
                      ),
                    }}
                  />
                  <Typography
                    sx={{ fontSize: 11.5, color: theme.palette.text.secondary }}
                  >
                    {t.duration}: {state.response.durationMs} ms
                  </Typography>
                  <Typography
                    sx={{ fontSize: 11.5, color: theme.palette.text.secondary }}
                  >
                    {t.size}: {state.response.sizeBytes} B
                  </Typography>
                </Stack>
              )}
            </Stack>

            {!state.response ? (
              <Typography
                sx={{
                  fontSize: 13,
                  color: theme.palette.text.secondary,
                  py: 4,
                  textAlign: "center",
                }}
              >
                {t.noResponse}
              </Typography>
            ) : (
              <>
                <JsonViewer
                  value={state.response.body}
                  isJson={state.response.isJson}
                />
                <Divider sx={{ my: 2 }} />
                <Typography
                  variant="overline"
                  sx={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: theme.palette.text.secondary,
                  }}
                >
                  {t.headers}
                </Typography>
                <Box
                  sx={{
                    mt: 0.75,
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 11.5,
                    color: theme.palette.text.secondary,
                    maxHeight: 160,
                    overflowY: "auto",
                  }}
                >
                  {Object.entries(state.response.headers).map(([key, value]) => (
                    <Box key={key}>
                      <Box component="span" sx={{ color: theme.palette.kpi.sky }}>
                        {key}
                      </Box>
                      : {value}
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
