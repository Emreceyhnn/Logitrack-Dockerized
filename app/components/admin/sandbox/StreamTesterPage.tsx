"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import { Info, Play, Square, Trash2 } from "lucide-react";
import StatusBadge from "@/app/components/admin/shell/StatusBadge";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  SandboxPageProps,
  StreamEvent,
  StreamStatus,
  StreamTesterActions,
  StreamTesterState,
} from "@/app/lib/type/admin/sandbox";
import type { ServiceStatus } from "@/app/lib/type/admin/shell";

const DEFAULT_URL = "/api/admin/sandbox/stream";
/** Cap retained events so a long session cannot grow the DOM without bound. */
const MAX_EVENTS = 200;

/**
 * tr-Akış durumunu rozet durumuna eşler.
 * en-Maps stream status onto the shared StatusBadge vocabulary.
 * input (status: StreamStatus)
 * output (ServiceStatus)
 */
function toBadgeStatus(status: StreamStatus): ServiceStatus {
  if (status === "open") return "up";
  if (status === "error") return "down";
  if (status === "connecting") return "degraded";
  return "unknown";
}

/**
 * tr-Olay akışı test aracı.
 * en-Event stream tester. Connects to a real SSE endpoint and timelines the
 *    frames as they arrive.
 * input (SandboxPageProps)
 * output (JSX.Element)
 */
export default function StreamTesterPage({
  title,
  subtitle,
}: SandboxPageProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const t = dict.admin.sandbox.stream;

  const [state, setState] = useState<StreamTesterState>({
    url: DEFAULT_URL,
    status: "idle",
    events: [],
    error: null,
  });

  const sourceRef = useRef<EventSource | null>(null);

  const disconnect = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setState((s) => (s.status === "idle" ? s : { ...s, status: "closed" }));
  }, []);

  const connect = useCallback(() => {
    // Tear down any previous connection first, or the old one keeps streaming
    // into the same timeline.
    sourceRef.current?.close();
    setState((s) => ({ ...s, status: "connecting", error: null }));

    try {
      const source = new EventSource(state.url);
      sourceRef.current = source;

      const push = (type: string, data: string) => {
        setState((s) => {
          const event: StreamEvent = {
            id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            receivedAt: new Date().toISOString(),
            type,
            data,
          };
          // Newest first, oldest trimmed.
          return { ...s, events: [event, ...s.events].slice(0, MAX_EVENTS) };
        });
      };

      source.onopen = () => {
        setState((s) => ({ ...s, status: "open" }));
      };

      // Default (unnamed) events.
      source.onmessage = (e: MessageEvent<string>) => push("message", e.data);

      for (const name of ["open", "heartbeat", "close"]) {
        source.addEventListener(name, (e) =>
          push(name, (e as MessageEvent<string>).data)
        );
      }

      source.onerror = () => {
        // EventSource reports both a failed connect and a server-side close
        // through onerror; readyState disambiguates them.
        const closed = source.readyState === EventSource.CLOSED;
        setState((s) => ({
          ...s,
          status: closed ? "closed" : "error",
          error: closed ? null : "Stream connection failed",
        }));
        if (closed) {
          source.close();
          sourceRef.current = null;
        }
      };
    } catch (err) {
      setState((s) => ({
        ...s,
        status: "error",
        error: err instanceof Error ? err.message : dict.admin.common.error,
      }));
    }
  }, [state.url, dict.admin.common.error]);

  const setUrl = useCallback((url: string) => {
    setState((s) => ({ ...s, url }));
  }, []);

  const clear = useCallback(() => {
    setState((s) => ({ ...s, events: [] }));
  }, []);

  const actions = useMemo<StreamTesterActions>(
    () => ({ setUrl, connect, disconnect, clear }),
    [setUrl, connect, disconnect, clear]
  );

  // Always close the stream on unmount — an orphaned EventSource keeps
  // reconnecting in the background.
  useEffect(() => {
    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, []);

  const connected = state.status === "open" || state.status === "connecting";

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
          {t.wsNotice}
        </Typography>
      </Stack>

      <Box
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper_alpha.main_70,
          mb: 2,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            value={state.url}
            onChange={(e) => actions.setUrl(e.target.value)}
            disabled={connected}
            sx={{ flex: 1, minWidth: 240 }}
            slotProps={{
              htmlInput: {
                style: {
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 13,
                },
              },
            }}
          />
          {connected ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Square size={14} />}
              onClick={actions.disconnect}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {t.disconnect}
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<Play size={14} />}
              onClick={actions.connect}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {t.connect}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Trash2 size={14} />}
            onClick={actions.clear}
            disabled={state.events.length === 0}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {t.clear}
          </Button>
        </Stack>

        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ mt: 1.75 }}
        >
          <StatusBadge
            status={toBadgeStatus(state.status)}
            label={t.statuses[state.status]}
          />
          <Typography
            sx={{ fontSize: 12, color: theme.palette.text.secondary }}
          >
            {t.events}: {state.events.length}
          </Typography>
        </Stack>
      </Box>

      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}

      {/* Event timeline */}
      <Box
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper_alpha.main_70,
          maxHeight: 460,
          overflowY: "auto",
        }}
      >
        {state.events.length === 0 ? (
          <Typography
            sx={{
              fontSize: 13,
              color: theme.palette.text.secondary,
              py: 5,
              textAlign: "center",
            }}
          >
            {t.noEvents}
          </Typography>
        ) : (
          state.events.map((event) => (
            <Box
              key={event.id}
              sx={{
                px: 2,
                py: 1.25,
                borderBottom: `1px solid ${theme.palette.divider}`,
                "&:last-of-type": { borderBottom: "none" },
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  component="span"
                  sx={{
                    fontSize: 10,
                    fontWeight: 700,
                    px: 0.75,
                    py: 0.2,
                    borderRadius: 0.75,
                    color: theme.palette.kpi.violet,
                    backgroundColor: alpha(theme.palette.kpi.violet, 0.12),
                  }}
                >
                  {event.type}
                </Box>
                <Typography
                  sx={{ fontSize: 11, color: theme.palette.text.secondary }}
                >
                  {new Date(event.receivedAt).toLocaleTimeString()}
                </Typography>
              </Stack>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  mt: 0.75,
                  fontSize: 11.5,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  color: theme.palette.text.secondary,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {event.data}
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
