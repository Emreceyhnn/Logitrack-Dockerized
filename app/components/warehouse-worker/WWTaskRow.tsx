"use client";

import { useState } from "react";
import {
  Stack,
  Box,
  Typography,
  Button,
  IconButton,
  LinearProgress,
  useTheme,
} from "@mui/material";
import type {
  Task,
  WarehouseWorkerDict,
} from "@/app/lib/type/warehouseWorkerClient";

interface WWTaskRowProps {
  t: Task;
  advanceTask: (id: string, delta?: number) => void;
  ww: WarehouseWorkerDict;
  /** Worker's active zone, if known — flags a mismatch against the task's own zone. */
  currentZone?: string;
}

// Glove-friendly touch target for the in-row unit stepper.
const STEP_SIZE = 48;

export default function WWTaskRow({ t, advanceTask, ww, currentZone }: WWTaskRowProps) {
  const theme = useTheme();
  const zoneMismatch = !!currentZone && currentZone !== t.zone;

  const kindMeta: Record<string, { color: string; bg: string }> = {
    PICK: { color: theme.palette.kpi.amber, bg: "rgba(245,158,11,0.14)" },
    PACK: { color: theme.palette.kpi.emerald, bg: "rgba(52,211,153,0.14)" },
    PUT: { color: theme.palette.kpi.cyan, bg: "rgba(56,189,248,0.14)" },
  };

  const km = kindMeta[t.kind] ?? {
    color: theme.palette.text.secondary,
    bg: "rgba(255,255,255,0.06)",
  };
  const pm =
    t.priority === "high"
      ? { color: "#fca5a5", bg: "rgba(244,67,54,0.14)", label: ww.high }
      : t.priority === "med"
        ? { color: "#fcd34d", bg: "rgba(245,158,11,0.12)", label: ww.med }
        : {
            color: "rgba(255,255,255,0.55)",
            bg: "rgba(255,255,255,0.06)",
            label: ww.low,
          };

  const complete = t.done >= t.total;
  const started = t.done > 0 && !complete;

  // Local counter for the in-progress state: seeded at the server's committed
  // `done` and only ever moves forward (you can't un-pick committed units). We
  // commit the difference on Complete, so the whole "start → count → done"
  // loop lives on this one row.
  const [count, setCount] = useState(t.done);
  // Keep the local counter in step with server refreshes without resetting a
  // higher local count the worker is mid-way through entering.
  const [seenDone, setSeenDone] = useState(t.done);
  if (seenDone !== t.done) {
    setSeenDone(t.done);
    if (t.done > count) setCount(t.done);
  }

  const displayed = started ? count : t.done;
  const pct = Math.round((displayed / t.total) * 100);

  const dec = () => setCount((c) => Math.max(t.done, c - 1));
  const inc = () => setCount((c) => Math.min(t.total, c + 1));

  return (
    <Stack
      key={t.id}
      direction="row"
      spacing={2}
      alignItems="center"
      flexWrap="wrap"
      sx={{
        p: { xs: 1.75, md: 2.5 },
        bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#ffffff",
        borderRadius: "16px",
        border: `1px solid ${theme.palette.divider}`,
        borderLeft: `4px solid ${km.color}`,
        position: "relative",
        overflow: "hidden",
        opacity: complete ? 0.6 : 1,
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          transform: complete ? "none" : "translateY(-2px)",
          boxShadow: complete ? "none" : theme.palette.mode === "dark" ? "0 8px 24px rgba(0,0,0,0.2)" : "0 8px 24px rgba(0,0,0,0.08)",
          borderColor: complete ? theme.palette.divider : km.color,
        },
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ flex: "1 1 200px", minWidth: 0 }}
      >
        <Box
          sx={{
            color: km.color,
            bgcolor: km.bg,
            px: 1,
            py: 0.5,
            borderRadius: 2,
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          {ww.ui[t.kind] || t.kind}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            noWrap
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            {t.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: zoneMismatch ? theme.palette.kpi.amber : theme.palette.text.secondary, fontWeight: zoneMismatch ? 700 : 400 }}
          >
            {t.order} · {ww.ui.zone} {t.zone}
            {zoneMismatch ? ` · ${ww.ui.taskZoneMismatch}` : ""}
          </Typography>
        </Box>
      </Stack>
      {/* Fixed 150px on desktop keeps the bars aligned down the list; on a
          wrapped mobile row that rigid basis would leave an awkward gap, so it
          takes the full width of its own line instead. */}
      <Box sx={{ flex: { xs: "1 1 100%", md: "0 0 150px" } }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          sx={{
            fontSize: 11,
            fontWeight: 600,
            color: theme.palette.text.secondary,
            mb: 0.5,
          }}
        >
          <Box>
            {displayed}/{t.total}
          </Box>
          <Box sx={{ color: km.color }}>{pct}%</Box>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 5,
            borderRadius: 5,
            bgcolor: "rgba(255,255,255,0.08)",
            "& .MuiLinearProgress-bar": { bgcolor: km.color },
          }}
        />
      </Box>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="flex-end"
        sx={{ flex: "1 1 220px" }}
      >
        <Box
          sx={{
            color: pm.color,
            bgcolor: pm.bg,
            px: 1,
            py: 0.5,
            borderRadius: 1.5,
            fontSize: 9,
            fontWeight: 700,
          }}
        >
          {pm.label}
        </Box>

        {complete ? (
          <Box
            sx={{
              px: 2,
              py: 1,
              borderRadius: 2,
              fontSize: 13,
              fontWeight: 700,
              color: theme.palette.kpi.emerald,
              bgcolor: "rgba(52,211,153,0.12)",
            }}
          >
            {ww.ui.doneBtn}
          </Box>
        ) : started ? (
          <>
            {/* Count the units right here, big enough for gloved thumbs. */}
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ bgcolor: "rgba(0,0,0,0.25)", p: 0.5, borderRadius: 3 }}
            >
              <IconButton
                aria-label={ww.ui.decreaseQty}
                onClick={dec}
                disabled={count <= t.done}
                sx={{
                  width: STEP_SIZE,
                  height: STEP_SIZE,
                  fontSize: 24,
                  color: "#fff",
                }}
              >
                −
              </IconButton>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 800,
                  minWidth: 32,
                  textAlign: "center",
                  color: "#fff",
                }}
              >
                {count}
              </Typography>
              <IconButton
                aria-label={ww.ui.increaseQty}
                onClick={inc}
                disabled={count >= t.total}
                sx={{
                  width: STEP_SIZE,
                  height: STEP_SIZE,
                  fontSize: 24,
                  color: "#fff",
                }}
              >
                +
              </IconButton>
            </Stack>
            <Button
              onClick={() => advanceTask(t.id, count - t.done)}
              disabled={count <= t.done}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                minHeight: STEP_SIZE,
                px: 2,
                color: "#0b1019",
                bgcolor: km.color,
                "&:hover": { bgcolor: km.color, filter: "brightness(1.08)" },
                "&.Mui-disabled": {
                  bgcolor: "rgba(255,255,255,0.08)",
                  color: theme.palette.text.secondary,
                },
              }}
            >
              {/* Commits the counted units; reads "Complete" when the count
                  will finish the task, "Advance" for a partial commit. */}
              {count >= t.total ? ww.ui.completeBtn : ww.ui.advanceBtn}
            </Button>
          </>
        ) : (
          // OPEN: one tap moves the task into progress and seeds the counter.
          <Button
            onClick={() => advanceTask(t.id, 1)}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              minHeight: STEP_SIZE,
              px: 3,
              color: km.color,
              bgcolor: km.bg,
            }}
          >
            {ww.ui.startBtn}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
