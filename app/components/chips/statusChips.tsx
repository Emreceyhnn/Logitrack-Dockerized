"use client";

import {
  Chip,
  useTheme,
  Tooltip,
  type Palette,
  type PaletteColor,
} from "@mui/material";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import { getStatusMeta } from "@/app/lib/priorityColor";

export const StatusChip = ({ status }: { status: string }) => {
  const { lang, dict } = useLanguage();
  const theme = useTheme();
  const meta = getStatusMeta(status, dict);
  const paletteKey = meta.paletteKey as
    | "info"
    | "success"
    | "warning"
    | "error"
    | "secondary";

  // Determine colors based on paletteKey and mode
  const isLight = theme.palette.mode === "light";

  const colorObj = theme.palette[paletteKey as keyof Palette] as PaletteColor;

  // Use custom alpha tokens for background in light mode, or default to meta.color with alpha
  const backgroundColor = isLight
    ? colorObj?._alpha?.main_10 || `${meta.color}1A`
    : colorObj?._alpha?.main_20 || `${meta.color}33`;

  // Dark surfaces need the light variant — palette mains like success
  // (#065f46) sit below 4.5:1 against the dark background.
  const textColor = isLight
    ? colorObj?.main || meta.color
    : colorObj?.light || colorObj?.main || meta.color;

  const borderColor = isLight
    ? colorObj?._alpha?.main_20 || `${meta.color}33`
    : colorObj?._alpha?.main_40 || `${meta.color}66`;

  const displayLabel = meta.label
    ? meta.label.toLocaleUpperCase(lang === "tr" ? "tr-TR" : "en-US")
    : "";

  return (
    <Tooltip title={meta.label} arrow>
      <Chip
        variant="filled"
        size="small"
        label={displayLabel}
        sx={{
          borderRadius: "8px",
          height: "28px",
          fontSize: "0.75rem",
          fontWeight: 800,
          backgroundColor: backgroundColor,
          color: textColor,
          border: `1px solid ${borderColor}`,
          letterSpacing: "0.05em",
          "& .MuiChip-label": {
            px: 2.5,
          },
        }}
      />
    </Tooltip>
  );
};
