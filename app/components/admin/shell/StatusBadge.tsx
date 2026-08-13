"use client";

import { Box, Chip, useTheme } from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  ServiceStatus,
  StatusBadgeProps,
} from "@/app/lib/type/admin/shell";

/**
 * tr-Servis durumunu renk ve etikete çevirir.
 * en-Maps a service status to its palette colour.
 *    Uses the theme's KPI tokens so the badge tracks light/dark automatically.
 * input (status: ServiceStatus, palette)
 * output (string)
 */
function useStatusColor(status: ServiceStatus): string {
  const theme = useTheme();
  switch (status) {
    case "up":
      return theme.palette.kpi.emerald;
    case "degraded":
      return theme.palette.kpi.amber;
    case "down":
      return theme.palette.kpi.error;
    default:
      return theme.palette.kpi.slateGray;
  }
}

/**
 * tr-Servis durumunu gösteren rozet veya kompakt nokta.
 * en-Status pill (or compact dot) for a service's health.
 *    Colour alone never carries the meaning — the pill always pairs it with a
 *    text label, and the dot exposes one via `title` + `aria-label`.
 * input (StatusBadgeProps)
 * output (JSX.Element)
 */
export default function StatusBadge({
  status,
  label,
  dense = false,
}: StatusBadgeProps) {
  const dict = useDictionary();
  const color = useStatusColor(status);
  const text = label ?? dict.admin.status[status];

  if (dense) {
    return (
      <Box
        component="span"
        role="img"
        aria-label={text}
        title={text}
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: color,
          display: "inline-block",
          flexShrink: 0,
          // Soft halo so the dot stays visible against both surfaces.
          boxShadow: `0 0 0 3px ${color}22`,
        }}
      />
    );
  }

  return (
    <Chip
      size="small"
      label={text}
      sx={{
        height: 22,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.2,
        color,
        backgroundColor: `${color}1A`,
        border: `1px solid ${color}33`,
        "& .MuiChip-label": { px: 1 },
      }}
    />
  );
}
