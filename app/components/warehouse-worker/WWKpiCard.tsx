"use client";

import React from "react";
import {
  Box,
  Stack,
  Typography,
  Card,
  Avatar,
  LinearProgress,
  useTheme,
} from "@mui/material";
import { Ico } from "./Ico";

interface WWKpiCardProps {
  label: string;
  color: string;
  icon: string;
  /** The main value node (usually a number + unit). */
  children: React.ReactNode;
  sub?: React.ReactNode;
  pct?: number;
}

/**
 * Single KPI tile used across the warehouse-worker dashboard. Extracted from
 * the former inline `renderKpi` helper in WarehouseWorkerClient.
 */
export default function WWKpiCard({
  label,
  color,
  icon,
  children,
  sub,
  pct,
}: WWKpiCardProps) {
  const theme = useTheme();
  return (
    <Card
      sx={{
        bgcolor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        flex: 1,
        p: 2.5,
        borderRadius: 3,
        position: "relative",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg,${color},transparent)`,
        }}
      />
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Typography
          variant="overline"
          sx={{ color: theme.palette.text.secondary, fontWeight: 800 }}
        >
          {label}
        </Typography>
        <Avatar
          sx={{
            bgcolor: `${color}1f`,
            color,
            width: 38,
            height: 38,
            borderRadius: 2,
          }}
        >
          <Ico d={icon} size={19} />
        </Avatar>
      </Stack>
      <Box sx={{ mt: 1 }}>{children}</Box>
      {pct != null && (
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            mt: 2,
            height: 5,
            borderRadius: 5,
            bgcolor: "rgba(255,255,255,0.07)",
            "& .MuiLinearProgress-bar": { bgcolor: color },
          }}
        />
      )}
      {sub && (
        <Typography
          sx={{
            mt: 2,
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          {sub}
        </Typography>
      )}
    </Card>
  );
}
