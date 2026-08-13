"use client";

import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { Dictionary } from "@/app/lib/language/language";

export type TimeRange = "1w" | "2w" | "1m" | "6m";

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  dict: Dictionary;
}

const TimeRangeSelector = ({ value, onChange, dict }: TimeRangeSelectorProps) => {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, val) => val && onChange(val)}
      size="small"
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
          py: 0.5,
          fontSize: "0.75rem",
          fontWeight: 600,
          textTransform: "none",
          borderRadius: "6px !important",
          border: "none",
          color: "text.secondary",
          transition: "all 0.2s ease",
          mx: 0.2,
          "&.Mui-selected": {
            bgcolor: "primary.main",
            color: "primary.contrastText",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            "&:hover": {
              bgcolor: "primary.dark",
            },
          },
          "&:hover": {
            bgcolor: (theme) => 
              theme.palette.mode === "dark" 
                ? "rgba(255,255,255,0.1)" 
                : "rgba(0,0,0,0.08)",
          }
        },
      }}
    >
      <ToggleButton value="1w">{dict.common.ranges["1w"]}</ToggleButton>
      <ToggleButton value="2w">{dict.common.ranges["2w"]}</ToggleButton>
      <ToggleButton value="1m">{dict.common.ranges["1m"]}</ToggleButton>
      <ToggleButton value="6m">{dict.common.ranges["6m"]}</ToggleButton>
    </ToggleButtonGroup>
  );
};

export default TimeRangeSelector;
