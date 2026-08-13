"use client";

import {
  Box,
  Stack,
  Typography,
  Button,
  LinearProgress,
  Avatar,
  useTheme,
} from "@mui/material";
import type {
  Task,
  WarehouseWorkerDict,
} from "@/app/lib/type/warehouseWorkerClient";
import { Ico } from "./Ico";
import { I } from "@/app/lib/utils/warehouseWorkerUi";

interface WWNextTaskCardProps {
  /** Highest-priority open task, or null when the queue is clear. */
  nextTask: Task | null;
  advanceTask: (id: string) => void;
  ww: WarehouseWorkerDict;
}

/**
 * Single-card "do this next" directive shown at the top of the dashboard. The
 * queue below is already priority-sorted; this pulls its top open task out into
 * a prominent card with one action, so the worker is told what to do rather
 * than left to scan the list and decide.
 */
export default function WWNextTaskCard({
  nextTask,
  advanceTask,
  ww,
}: WWNextTaskCardProps) {
  const theme = useTheme();

  // Empty state: nothing open. Kept low-key so it doesn't compete with the KPIs.
  if (!nextTask) {
    return (
      <Box
        data-tour="ww-next-task"
        sx={{
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          p: 2.5,
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Avatar
          sx={{
            bgcolor: `${theme.palette.kpi.emerald}1f`,
            color: theme.palette.kpi.emerald,
            borderRadius: 2,
          }}
        >
          <Ico d="M20 6 9 17l-5-5" size={19} />
        </Avatar>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
            {ww.ui.nextTaskAllClear}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary }}
          >
            {ww.ui.nextTaskAllClearSub}
          </Typography>
        </Box>
      </Box>
    );
  }

  const kindMeta: Record<string, { color: string; bg: string }> = {
    PICK: { color: theme.palette.kpi.amber, bg: "rgba(245,158,11,0.14)" },
    PACK: { color: theme.palette.kpi.emerald, bg: "rgba(52,211,153,0.14)" },
    PUT: { color: theme.palette.kpi.cyan, bg: "rgba(56,189,248,0.14)" },
  };
  const km = kindMeta[nextTask.kind] ?? {
    color: theme.palette.primary.main,
    bg: "rgba(56,189,248,0.14)",
  };
  const pm =
    nextTask.priority === "high"
      ? { color: "#fca5a5", bg: "rgba(244,67,54,0.18)", label: ww.high }
      : nextTask.priority === "med"
        ? { color: "#fcd34d", bg: "rgba(245,158,11,0.16)", label: ww.med }
        : {
            color: "rgba(255,255,255,0.6)",
            bg: "rgba(255,255,255,0.08)",
            label: ww.low,
          };
  const pct = Math.round((nextTask.done / nextTask.total) * 100);

  return (
    <Box
      data-tour="ww-next-task"
      sx={{
        position: "relative",
        borderRadius: 3,
        p: 2.75,
        overflow: "hidden",
        color: theme.palette.text.primary,
        bgcolor: theme.palette.background.paper,
        border: `1px solid ${km.color}55`,
        boxShadow: `0 0 0 1px ${km.color}22, 0 8px 28px rgba(0,0,0,0.25)`,
      }}
    >
      {/* Accent bar keys the card to the task kind. */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: 4,
          background: km.color,
        }}
      />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <Stack
          direction="row"
          spacing={1.75}
          alignItems="center"
          sx={{ flex: 1, minWidth: 0 }}
        >
          <Avatar
            sx={{
              bgcolor: km.bg,
              color: km.color,
              borderRadius: 2,
              width: 44,
              height: 44,
            }}
          >
            <Ico d={I.tasks} size={20} />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{
                color: km.color,
                fontWeight: 800,
                letterSpacing: 1,
                lineHeight: 1,
              }}
            >
              {ww.ui.nextTask}
            </Typography>
            <Typography noWrap sx={{ fontWeight: 700, fontSize: 16, mt: 0.25 }}>
              {nextTask.name}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 0.5, color: theme.palette.text.secondary }}
            >
              <Box
                sx={{
                  color: km.color,
                  bgcolor: km.bg,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                {ww.ui[nextTask.kind] || nextTask.kind}
              </Box>
              <Box
                sx={{
                  color: pm.color,
                  bgcolor: pm.bg,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                {pm.label}
              </Box>
              <Typography variant="caption" noWrap>
                {nextTask.order} · {ww.ui.zone} {nextTask.zone} · {nextTask.done}
                /{nextTask.total}
              </Typography>
            </Stack>
          </Box>
        </Stack>

        <Button
          onClick={() => advanceTask(nextTask.id)}
          variant="contained"
          sx={{
            flexShrink: 0,
            textTransform: "none",
            fontWeight: 800,
            borderRadius: 2.5,
            px: 3,
            py: 1.25,
            bgcolor: km.color,
            color: "#0b1019",
            "&:hover": { bgcolor: km.color, filter: "brightness(1.08)" },
          }}
        >
          {ww.ui.nextTaskStart}
        </Button>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          mt: 2,
          height: 6,
          borderRadius: 6,
          bgcolor: "rgba(255,255,255,0.08)",
          "& .MuiLinearProgress-bar": { bgcolor: km.color },
        }}
      />
    </Box>
  );
}
