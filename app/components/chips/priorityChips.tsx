import { Chip, type Palette, type PaletteColor } from "@mui/material";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import { getStatusMeta } from "@/app/lib/priorityColor";

export const PriorityChip = ({ status }: { status: string }) => {
  const { lang, dict } = useLanguage();
  const meta = getStatusMeta(status, dict);
  const paletteKey = meta.paletteKey || "secondary";

  const displayLabel = meta.label
    ? meta.label.toLocaleUpperCase(lang === "tr" ? "tr-TR" : "en-US")
    : "";

  return (
    <Chip
      variant="filled"
      size="small"
      label={displayLabel}
      sx={{
        borderRadius: "6px",
        height: "24px",
        fontSize: "0.7rem",
        fontWeight: 800,
        backgroundColor: `${paletteKey}.main`,
        color: "white",
        border: "none",
        letterSpacing: "0.02em",
        boxShadow: (theme) => {
          const colorObj = theme.palette[paletteKey as keyof Palette] as PaletteColor;
          return `0 2px 8px ${colorObj?._alpha?.main_30 || "rgba(0,0,0,0.1)"}`;
        },
        "& .MuiChip-label": {
          px: 1,
        },
      }}
    />
  );
};
