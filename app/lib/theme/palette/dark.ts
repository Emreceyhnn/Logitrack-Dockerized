import { type PaletteMode } from "@mui/material";
import { darkKpi } from "./darkKpi";

/* -------------------------------- DARKMODE -------------------------------- */
export const dark = {
  mode: "dark" as PaletteMode,

  primary: {
    main: "#0284c7",
    contrastText: "#161616",
    _alpha: {
      main_03: "#0284c708",
      main_04: "#0284c70A",
      main_05: "#0284c70D",
      main_08: "#0284c714",
      main_10: "#0284c71A",
      main_12: "#0284c71F",
      main_15: "#0284c726",
      main_18: "#0284c72E",
      main_20: "#0284c733",
      main_25: "#0284c740",
      main_30: "#0284c74D",
      main_35: "#0284c759",
      main_40: "#0284c766",
      main_50: "#0284c780",
      main_60: "#0284c799",
      main_80: "#0284c7CC",
    },
  },

  secondary: {
    main: "#BEDBB0",
    _alpha: {
      main_10: "#BEDBB01A",
      main_20: "#BEDBB033",
    },
  },

  background: {
    default: "#0B0F19",
    default_alpha: {
      main_10: "#0B0F191A",
      main_20: "#0B0F1933",
      main_40: "#0B0F1966",
      main_60: "#0B0F1999",
      main_98: "#0B0F19FA",
    },
    dashboardBg: "#0B0F19",
    paper: "#161B26",
    paper_alpha: {
      main_02: "#161B2605",
      main_03: "#161B2608",
      main_05: "#161B260D",
      main_10: "#161B261A",
      main_20: "#161B2633",
      main_30: "#161B264D",
      main_40: "#161B2666",
      main_50: "#161B2680",
      main_60: "#161B2699",
      main_70: "#161B26B3",
      main_80: "#161B26CC",
      main_90: "#161B26E6",
    },
    sidebar: "#0F141F",
    header: "#0F141F",
    hoverBg: "#1F2937",
    midnight: {
      main: "#0B1019",
      _alpha: {
        main_40: "#0B101966",
        main_60: "#0B101999",
        main_80: "#0B1019CC",
        main_85: "#0B1019D9",
        main_95: "#0B1019F2",
      },
    },
    deepNavy: {
      main: "#020617",
      _alpha: {
        main_85: "#020617D9",
      },
    },
    ebony: {
      main: "#0B0F19",
      _alpha: {
        main_80: "#0B0F19CC",
      },
    },
  },

  text: {
    primary: "#FFFFFF",
    primary_alpha: {
      main_02: "#FFFFFF05",
      main_05: "#FFFFFF0D",
      main_10: "#FFFFFF1A",
      main_20: "#FFFFFF33",
      main_30: "#FFFFFF4D",
      main_35: "#FFFFFF59",
      main_40: "#FFFFFF66",
      main_70: "#FFFFFFB3",
      main_80: "#FFFFFFCC",
    },
    secondary: "#FFFFFF80",
    secondary_alpha: {
      main_05: "#FFFFFF0D",
      main_10: "#FFFFFF1A",
      main_20: "#FFFFFF33",
      main_40: "#FFFFFF66",
      main_60: "#FFFFFF99",
      main_70: "#FFFFFFB3",
    },
    greenText: "#BEDBB0",
    sideBarText: "#FFFFFFE6",
    darkBlue: {
      main: "#1A202C",
      _alpha: {
        main_30: "#1A202C4D",
        main_50: "#1A202C80",
        main_60: "#1A202C99",
        main_80: "#1A202CB3",
      },
    },
  },

  divider: "#FFFFFF4D",
  divider_alpha: {
    main_01: "#FFFFFF03",
    main_02: "#FFFFFF05",
    main_05: "#FFFFFF0D",
    main_10: "#FFFFFF1A",
    main_20: "#FFFFFF33",
    main_50: "#FFFFFF80",
  },

  action: {
    active: "#FFFFFF8A",
    hover: "#FFFFFF14",
    hoverOpacity: 0.08,
    selected: "#FFFFFF29",
    selectedOpacity: 0.16,
    disabled: "#FFFFFF4D",
    disabledBackground: "#FFFFFF1F",
    disabledOpacity: 0.38,
    focus: "#FFFFFF1F",
    focusOpacity: 0.12,
    activatedOpacity: 0.24,
  },

  icon: {
    primary: "#BEDBB0",
    secondary: "#FFFFFF80",
  },
  buttonPrimary: {
    buttonBg: "#BEDBB0",
    buttonBgHover: "#9DC888",
    iconColor: "#FFFFFF",
    iconBgColor: "#161616",
    primaryText: "#161616",
  },
  buttonSecondary: {
    buttonBg: "#121212",
    buttonBgHover: "#1212128e",
    iconColor: "#161616",
    iconBg: "#FFFFFF",
    primaryText: "#ffffff",
  },
  logo: {
    color1: "#1F1F1F",
    color2: "#FFFFFF",
    text: "#FFF",
  },
  scroll: {
    color: "#121212",
    hover: "#12121280",
    background: "#2e3234",
  },
  kpi: darkKpi,

  error: {
    main: "#F44336",
    light: "#E57373",
    dark: "#D32F2F",
    _alpha: {
      main_10: "#F443361A",
      main_20: "#F4433633",
      main_30: "#F443364D",
      main_50: "#F4433680",
      main_70: "#F44336B3",
      main_80: "#F44336CC",
    },
  },
  success: {
    main: "#065f46",
    // Light emerald for text on dark surfaces — #065f46 on the dark
    // background is ~2:1 and fails WCAG AA (4.5:1).
    light: "#34D399",
    _alpha: {
      main_02: "#065f4605",
      main_05: "#065f460D",
      main_10: "#065f461A",
      main_20: "#065f4633",
      main_40: "#065f4666",
    },
  },
  warning: {
    main: "#f59e0b",
    light: "#fbbf24",
    _alpha: {
      main_03: "#f59e0b08",
      main_05: "#f59e0b0D",
      main_10: "#f59e0b1A",
      main_20: "#f59e0b33",
    },
  },
  info: {
    main: "#0ea5e9",
    light: "#38bdf8",
    _alpha: {
      main_03: "#0ea5e908",
      main_10: "#0ea5e91A",
      main_20: "#0ea5e933",
    },
  },
  common: {
    black: "#000000",
    black_alpha: {
      main_04: "#0000000A",
      main_10: "#0000001A",
      main_15: "#00000026",
      main_20: "#00000033",
      main_30: "#0000004D",
      main_35: "#00000059",
      main_40: "#00000066",
      main_50: "#00000080",
      main_55: "#0000008C",
      main_60: "#00000099",
      main_75: "#000000BF",
    },
    white: "#FFFFFF",
    white_alpha: {
      main_01: "#FFFFFF03",
      main_015: "#FFFFFF04",
      main_02: "#FFFFFF05",
      main_03: "#FFFFFF08",
      main_04: "#FFFFFF0A",
      main_05: "#FFFFFF0D",
      main_06: "#FFFFFF0F",
      main_08: "#FFFFFF14",
      main_10: "#FFFFFF1A",
      main_15: "#FFFFFF26",
      main_20: "#FFFFFF33",
      main_25: "#FFFFFF40",
      main_30: "#FFFFFF4D",
      main_35: "#FFFFFF59",
      main_40: "#FFFFFF66",
      main_45: "#FFFFFF73",
      main_50: "#FFFFFF80",
      main_60: "#FFFFFF99",
      main_70: "#FFFFFFB3",
    },
  },
};
