"use client";

import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  AdminRangeSelectorProps,
  AdminTimeRange,
} from "@/app/lib/type/admin/overview";

const RANGES: AdminTimeRange[] = ["1h", "24h", "7d", "30d"];

/**
 * tr-Genel bakış zaman aralığı seçici.
 * en-Time-range selector for the overview dashboard.
 *    Separate from the dashboard's `TimeRangeSelector`, which offers
 *    operational windows (1w–6m); the console needs short diagnostic windows
 *    (1h–30d) instead.
 * input (AdminRangeSelectorProps)
 * output (JSX.Element)
 */
export default function AdminRangeSelector({
  value,
  onChange,
  disabled = false,
}: AdminRangeSelectorProps) {
  const dict = useDictionary();

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      size="small"
      disabled={disabled}
      onChange={(_, next: AdminTimeRange | null) => next && onChange(next)}
      aria-label={dict.admin.overview.charts.activityTitle}
      sx={{
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.03)",
        p: 0.5,
        borderRadius: "8px",
        border: "none",
        "& .MuiToggleButton-root": {
          px: 1.5,
          py: 0.4,
          fontSize: "0.72rem",
          fontWeight: 700,
          textTransform: "none",
          borderRadius: "6px !important",
          border: "none",
          color: "text.secondary",
          mx: 0.2,
          transition: "all 0.2s ease",
          "&.Mui-selected": {
            bgcolor: "primary.main",
            color: "primary.contrastText",
            "&:hover": { bgcolor: "primary.dark" },
          },
        },
      }}
    >
      {RANGES.map((range) => (
        <ToggleButton key={range} value={range}>
          {dict.admin.overview.ranges[range]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
