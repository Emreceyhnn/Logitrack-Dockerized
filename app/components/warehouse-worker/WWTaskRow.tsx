"use client";

import { useState } from "react";
import { Stack, Box, Typography, LinearProgress, useTheme, Collapse, ButtonBase } from "@mui/material";
import type { Task, WarehouseWorkerDict } from "@/app/lib/type/warehouseWorkerClient";
import WWTaskItemRow from "./WWTaskItemRow";

interface WWTaskRowProps {
  t: Task;
  advanceTask: (id: string, itemId: string, delta?: number) => void;
  ww: WarehouseWorkerDict;
  /** Worker's active zone, if known — flags a mismatch against the task's own zone. */
  currentZone?: string;
}

export default function WWTaskRow({ t, advanceTask, ww, currentZone }: WWTaskRowProps) {
  const theme = useTheme();
  // Multi-SKU tasks start collapsed to a summary row; single-item tasks show
  // their one item inline (no accordion, same as before this row supported
  // more than one SKU per task).
  const [expanded, setExpanded] = useState(t.items.length <= 1);

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
  const pct = Math.round((t.done / t.total) * 100);
  const completedItemCount = t.items.filter((i) => i.done >= i.total).length;
  const multiItem = t.items.length > 1;

  const advanceItem = (itemId: string, delta?: number) => advanceTask(t.id, itemId, delta);

  return (
    <Stack
      key={t.id}
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
      <ButtonBase
        onClick={() => multiItem && setExpanded((e) => !e)}
        disableRipple={!multiItem}
        sx={{ width: "100%", display: "block", cursor: multiItem ? "pointer" : "default", textAlign: "left" }}
      >
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: "1 1 200px", minWidth: 0 }}>
            <Box sx={{ color: km.color, bgcolor: km.bg, px: 1, py: 0.5, borderRadius: 2, fontSize: 10, fontWeight: 800 }}>
              {ww.ui[t.kind] || t.kind}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: theme.palette.text.primary }}>
                {t.name}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                {t.order}
                {multiItem ? ` · ${completedItemCount}/${t.items.length} SKU` : ""}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ flex: { xs: "1 1 100%", md: "0 0 150px" } }}>
            <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 11, fontWeight: 600, color: theme.palette.text.secondary, mb: 0.5 }}>
              <Box>{t.done}/{t.total}</Box>
              <Box sx={{ color: km.color }}>{pct}%</Box>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{ height: 5, borderRadius: 5, bgcolor: "rgba(255,255,255,0.08)", "& .MuiLinearProgress-bar": { bgcolor: km.color } }}
            />
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ flex: "1 1 100px" }}>
            <Box sx={{ color: pm.color, bgcolor: pm.bg, px: 1, py: 0.5, borderRadius: 1.5, fontSize: 9, fontWeight: 700 }}>
              {pm.label}
            </Box>
          </Stack>
        </Stack>
      </ButtonBase>

      <Collapse in={expanded} unmountOnExit>
        <Stack spacing={1.5} sx={{ mt: 2, pl: { md: 1 } }}>
          {t.items.map((item) => (
            <WWTaskItemRow
              key={item.id}
              item={item}
              advanceItem={advanceItem}
              ww={ww}
              kindColor={km.color}
              {...(currentZone !== undefined ? { currentZone } : {})}
            />
          ))}
        </Stack>
      </Collapse>
    </Stack>
  );
}
