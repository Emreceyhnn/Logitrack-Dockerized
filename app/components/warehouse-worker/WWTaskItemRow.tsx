"use client";

import { useState } from "react";
import { Stack, Box, Typography, Button, IconButton, LinearProgress, useTheme } from "@mui/material";
import type { TaskItem, WarehouseWorkerDict } from "@/app/lib/type/warehouseWorkerClient";

interface WWTaskItemRowProps {
  item: TaskItem;
  advanceItem: (itemId: string, delta?: number) => void;
  ww: WarehouseWorkerDict;
  kindColor: string;
  /** Worker's active zone, if known — flags a mismatch against this item's zone. */
  currentZone?: string;
}

// Glove-friendly touch target for the in-row unit stepper.
const STEP_SIZE = 48;

/**
 * One SKU line within a task's stepper/progress UI. Extracted so a
 * multi-item (multi-SKU) task can render one of these per item while a
 * single-item task renders exactly one — same control, no duplication.
 */
export default function WWTaskItemRow({ item, advanceItem, ww, kindColor, currentZone }: WWTaskItemRowProps) {
  const theme = useTheme();
  const zoneMismatch = !!currentZone && currentZone !== item.zone;

  const complete = item.done >= item.total;
  const started = item.done > 0 && !complete;

  const [count, setCount] = useState(item.done);
  const [seenDone, setSeenDone] = useState(item.done);
  if (seenDone !== item.done) {
    setSeenDone(item.done);
    if (item.done > count) setCount(item.done);
  }

  const displayed = started ? count : item.done;
  const pct = Math.round((displayed / item.total) * 100);

  const dec = () => setCount((c) => Math.max(item.done, c - 1));
  const inc = () => setCount((c) => Math.min(item.total, c + 1));

  return (
    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ width: "100%" }}>
      <Box sx={{ flex: "1 1 160px", minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>
          {item.sku}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: zoneMismatch ? theme.palette.kpi.amber : theme.palette.text.secondary, fontWeight: zoneMismatch ? 700 : 400 }}
        >
          {ww.ui.zone} {item.zone}
          {zoneMismatch ? ` · ${ww.ui.taskZoneMismatch}` : ""}
        </Typography>
      </Box>

      <Box sx={{ flex: { xs: "1 1 100%", md: "0 0 150px" } }}>
        <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 11, fontWeight: 600, color: theme.palette.text.secondary, mb: 0.5 }}>
          <Box>{displayed}/{item.total}</Box>
          <Box sx={{ color: kindColor }}>{pct}%</Box>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{ height: 5, borderRadius: 5, bgcolor: "rgba(255,255,255,0.08)", "& .MuiLinearProgress-bar": { bgcolor: kindColor } }}
        />
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ flex: "1 1 220px" }}>
        {complete ? (
          <Box sx={{ px: 2, py: 1, borderRadius: 2, fontSize: 13, fontWeight: 700, color: theme.palette.kpi.emerald, bgcolor: "rgba(52,211,153,0.12)" }}>
            {ww.ui.doneBtn}
          </Box>
        ) : started ? (
          <>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ bgcolor: "rgba(0,0,0,0.25)", p: 0.5, borderRadius: 3 }}>
              <IconButton aria-label={ww.ui.decreaseQty} onClick={dec} disabled={count <= item.done} sx={{ width: STEP_SIZE, height: STEP_SIZE, fontSize: 24, color: "#fff" }}>
                −
              </IconButton>
              <Typography sx={{ fontSize: 20, fontWeight: 800, minWidth: 32, textAlign: "center", color: "#fff" }}>
                {count}
              </Typography>
              <IconButton aria-label={ww.ui.increaseQty} onClick={inc} disabled={count >= item.total} sx={{ width: STEP_SIZE, height: STEP_SIZE, fontSize: 24, color: "#fff" }}>
                +
              </IconButton>
            </Stack>
            <Button
              onClick={() => advanceItem(item.id, count - item.done)}
              disabled={count <= item.done}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                minHeight: STEP_SIZE,
                px: 2,
                color: "#0b1019",
                bgcolor: kindColor,
                "&:hover": { bgcolor: kindColor, filter: "brightness(1.08)" },
                "&.Mui-disabled": { bgcolor: "rgba(255,255,255,0.08)", color: theme.palette.text.secondary },
              }}
            >
              {count >= item.total ? ww.ui.completeBtn : ww.ui.advanceBtn}
            </Button>
          </>
        ) : (
          <Button
            onClick={() => advanceItem(item.id, 1)}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, minHeight: STEP_SIZE, px: 3, color: kindColor, bgcolor: `${kindColor}24` }}
          >
            {ww.ui.startBtn}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
