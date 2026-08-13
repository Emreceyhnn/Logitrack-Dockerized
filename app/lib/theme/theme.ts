import { createTheme, type PaletteOptions } from "@mui/material/styles";
import "./augmentation";
import { palettes } from "./palette";
import { getThemeComponents, type ThemeMode } from "./components";

export type { ThemeMode };

/**
 * tr-Verilen tema moduna (light/dark) uygun MUI tema nesnesi oluşturur.
 * en-Creates an MUI theme object for the given theme mode (light/dark).
 * input (mode: ThemeMode)
 * output (Theme)
 */
export const getTheme = (mode: ThemeMode) => {
  const basePalette = palettes[mode];

  return createTheme({
    palette: {
      ...basePalette,
      getColorAlpha: (targetColor: string) => {
        const color = targetColor.toLocaleLowerCase("en-US");
        if (!basePalette || !basePalette.kpi)
          return basePalette?.primary?._alpha || {};
        const kpi = basePalette.kpi;

        // Dynamic KPI mapping: Check if targetColor matches any hex in kpi object
        const kpiEntries = Object.entries(kpi);
        for (const [key, value] of kpiEntries) {
          if (
            typeof value === "string" &&
            value.toLocaleLowerCase("en-US") === color
          ) {
            const alphaKey = `${key}_alpha`;
            if (alphaKey in kpi) {
              const alphaValue = kpi[alphaKey as keyof typeof kpi];
              if (typeof alphaValue !== "string") return alphaValue;
            }
          }
        }

        // Specific mappings for complex keys / fallbacks
        if (color === "#38bdf8") return kpi.cyan_alpha;
        if (color === "#6366f1") return kpi.indigo_alpha;
        if (color === "#10b981") return kpi.emerald_alpha;
        if (color === "#f59e0b") return kpi.amber_alpha;
        if (color === "#0ea5e9") return kpi.sky_alpha;
        if (color === "#a855f7") return kpi.purple_alpha;
        if (color === "#cbd5f5") return kpi.slateLight_alpha;
        if (color === "#1e293b") return kpi.slateDark_alpha;
        if (color === "#0f172a") return kpi.slateDeep_alpha;
        if (color === "#0b1120") return kpi.slateDeepest_alpha;
        if (color === "#94a3b8") return kpi.slateGray_alpha;
        if (color === "#e2e8f0") return kpi.lavender_alpha;

        // Core Palette Matches
        if (
          basePalette.primary &&
          color === basePalette.primary.main.toLocaleLowerCase("en-US")
        )
          return basePalette.primary._alpha;
        if (
          basePalette.secondary &&
          color === basePalette.secondary.main.toLocaleLowerCase("en-US")
        )
          return basePalette.secondary._alpha;
        if (
          basePalette.success &&
          color === basePalette.success.main.toLocaleLowerCase("en-US")
        )
          return basePalette.success._alpha;
        if (
          basePalette.error &&
          color === basePalette.error.main.toLocaleLowerCase("en-US")
        )
          return basePalette.error._alpha;
        if (
          basePalette.warning &&
          color === basePalette.warning.main.toLocaleLowerCase("en-US")
        )
          return basePalette.warning._alpha;
        if (
          basePalette.info &&
          color === basePalette.info.main.toLocaleLowerCase("en-US")
        )
          return basePalette.info._alpha;

        return basePalette.primary?._alpha || {};
      },
    } as PaletteOptions,

    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1280,
        xl: 1920,
        mobile: 650,
        xxl: 1600,
      },
    },
    typography: {
      fontFamily: "Poppins, Arial, sans-serif",

      h1: { fontWeight: 700 },
      h2: { fontWeight: 600 },
      h3: { fontWeight: 600 },
      body1: { fontWeight: 400 },
      body2: { fontWeight: 400 },
      button: {
        fontWeight: 500,
        textTransform: "none",
      },
    },
    components: getThemeComponents(mode),
  });
};
