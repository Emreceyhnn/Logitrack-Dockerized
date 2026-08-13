// MUI theme type augmentations for the custom palette/KPI tokens. Imported for
// its side effects by ./theme. Extracted to keep theme.ts focused.
import type {} from "@mui/x-date-pickers/themeAugmentation";

declare module "@mui/material/styles" {
  interface PaletteColor {
    _alpha: Record<string, string>;
  }
  interface SimplePaletteColorOptions {
    _alpha?: Record<string, string>;
  }

  interface TypeText {
    primary_alpha: Record<string, string>;
    secondary_alpha: Record<string, string>;
    greenText: string;
    sideBarText: string;
    darkBlue: { main: string; _alpha: Record<string, string> };
  }

  interface TypeBackground {
    default_alpha: Record<string, string>;
    paper_alpha: Record<string, string>;
    dashboardBg: string;
    sidebar: string;
    header: string;
    hoverBg: string;
    midnight: { main: string; _alpha: Record<string, string> };
    deepNavy: { main: string; _alpha: Record<string, string> };
    ebony: { main: string; _alpha: Record<string, string> };
  }

  interface CommonColors {
    black_alpha: Record<string, string>;
    white_alpha: Record<string, string>;
  }

  interface Palette {
    divider_alpha: Record<string, string>;
    icon: {
      primary: string;
      secondary: string;
    };
    buttonPrimary: {
      buttonBg: string;
      buttonBgHover: string;
      iconColor: string;
      iconBgColor: string;
      primaryText: string;
    };
    buttonSecondary: {
      buttonBg: string;
      buttonBgHover: string;
      iconColor: string;
      iconBg: string;
      primaryText: string;
    };
    logo: {
      color1: string;
      color2: string;
      text: string;
    };
    kpi: {
      indigo: string;
      indigo_alpha: Record<string, string>;
      sky: string;
      sky_alpha: Record<string, string>;
      emerald: string;
      emerald_alpha: Record<string, string>;
      amber: string;
      amber_alpha: Record<string, string>;
      pink: string;
      pink_alpha: Record<string, string>;
      violet: string;
      violet_alpha: Record<string, string>;
      cyan: string;
      cyan_alpha: Record<string, string>;
      purple: string;
      purple_alpha: Record<string, string>;
      slateLight: string;
      slateLight_alpha: Record<string, string>;
      slateDark: string;
      slateDark_alpha: Record<string, string>;
      slateDeep: string;
      slateDeep_alpha: Record<string, string>;
      slateDeepest: string;
      slateDeepest_alpha: Record<string, string>;
      slateGray: string;
      slateGray_alpha: Record<string, string>;
      lavender: string;
      lavender_alpha: Record<string, string>;
      teal: string;
      teal_alpha: Record<string, string>;
      deepPurple: string;
      deepPurple_alpha: Record<string, string>;
      error: string;
      error_alpha: Record<string, string>;
    };
    getColorAlpha: (targetColor: string) => Record<string, string>;
  }

  interface PaletteOptions {
    divider_alpha?: Record<string, string>;
    icon?: {
      primary?: string;
      secondary?: string;
    };
    buttonPrimary?: {
      buttonBg?: string;
      buttonBgHover?: string;
      iconColor?: string;
      iconBgColor?: string;
      primaryText?: string;
    };
    buttonSecondary?: {
      buttonBg?: string;
      buttonBgHover?: string;
      iconColor?: string;
      iconBg?: string;
      primaryText?: string;
    };
    logo?: {
      color1?: string;
      color2?: string;
      text?: string;
    };
    kpi?: {
      indigo?: string;
      indigo_alpha?: Record<string, string>;
      sky?: string;
      sky_alpha?: Record<string, string>;
      emerald?: string;
      emerald_alpha?: Record<string, string>;
      amber?: string;
      amber_alpha?: Record<string, string>;
      pink?: string;
      pink_alpha?: Record<string, string>;
      violet?: string;
      violet_alpha?: Record<string, string>;
      cyan?: string;
      cyan_alpha?: Record<string, string>;
      purple?: string;
      purple_alpha?: Record<string, string>;
      slateLight?: string;
      slateLight_alpha?: Record<string, string>;
      slateDark?: string;
      slateDark_alpha?: Record<string, string>;
      slateDeep?: string;
      slateDeep_alpha?: Record<string, string>;
      slateDeepest?: string;
      slateDeepest_alpha?: Record<string, string>;
      slateGray?: string;
      slateGray_alpha?: Record<string, string>;
      lavender?: string;
      lavender_alpha?: Record<string, string>;
      teal?: string;
      teal_alpha?: Record<string, string>;
      deepPurple?: string;
      deepPurple_alpha?: Record<string, string>;
    };
    getColorAlpha?: (targetColor: string) => Record<string, string>;
  }

  interface BreakpointOverrides {
    mobile: true;
    xxl: true;
  }
}

export {};
