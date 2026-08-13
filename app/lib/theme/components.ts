import { alpha, type ThemeOptions } from "@mui/material/styles";
import { palettes } from "./palette";
import { getScrollbarStyles } from "@/app/components/scrollbar";

export type ThemeMode = "light" | "dark";

/**
 * tr-MUI bileşen stilleri, her dosyanın yaklaşık 400 satır tutması için ./theme'den çıkarıldı. Tüm renkler mod-spesifik paletten çözülür.
 * en-MUI component styleOverrides, extracted from ./theme to keep each file under ~400 lines. All colours are resolved from the mode-specific palette.
 * input (mode: ThemeMode)
 * output (ThemeOptions["components"])
 */
export const getThemeComponents = (
  mode: ThemeMode
): ThemeOptions["components"] => ({
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: "none",
        border:
          mode === "dark" ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
        boxShadow:
          mode === "dark"
            ? "0 10px 30px -10px rgba(0, 0, 0, 0.5)"
            : "0 10px 30px -10px rgba(0, 0, 0, 0.05)",
        "&.MuiPaper-elevation1": {
          boxShadow:
            mode === "dark"
              ? "0 4px 20px rgba(0,0,0,0.4)"
              : "0 4px 20px rgba(0,0,0,0.05)",
          border: `1px solid ${mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        backgroundImage: "none",
        borderRadius: "16px",
        border:
          mode === "dark" ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
        boxShadow:
          mode === "dark"
            ? "0 4px 24px rgba(0,0,0,0.4)"
            : "0 4px 24px rgba(0,0,0,0.05)",
      },
    },
  },
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        ...getScrollbarStyles({ palette: palettes[mode] }),
      },
      "*": {
        ...getScrollbarStyles({ palette: palettes[mode] }),
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: mode === "dark" ? "#161B26" : "#0F172A",
        color: "#FFF",
        fontSize: "0.75rem",
        fontWeight: 500,
        borderRadius: "8px",
        padding: "8px 12px",
        boxShadow:
          mode === "dark"
            ? "0 4px 20px rgba(0,0,0,0.5)"
            : "0 4px 20px rgba(0,0,0,0.1)",
        border: `1px solid ${mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
        backdropFilter: "blur(8px)",
      },
      arrow: {
        color: mode === "dark" ? "#161B26" : "#0F172A",
      },
    },
  },
  // Date Picker Premium Styling
  MuiPickerPopper: {
    styleOverrides: {
      paper: {
        backgroundColor: palettes[mode].background.paper,
        backgroundImage: "none",
        border: `1px solid ${palettes[mode].divider}`,
        borderRadius: 16,
        boxShadow:
          mode === "dark"
            ? "0 20px 40px rgba(0,0,0,0.6)"
            : "0 20px 40px rgba(0,0,0,0.1)",
      },
    },
  },
  MuiPickersDay: {
    styleOverrides: {
      root: {
        fontSize: "0.875rem",
        color: palettes[mode].text.secondary,
        "&.Mui-selected": {
          backgroundColor: palettes[mode].primary.main,
          color: palettes[mode].primary.contrastText,
          fontWeight: 700,
          "&:hover": {
            backgroundColor: palettes[mode].primary.main,
          },
        },
        "&:hover": {
          backgroundColor: palettes[mode].action.hover,
        },
        "&.MuiPickersDay-today": {
          border: `1px solid ${palettes[mode].primary.main}`,
        },
      },
    },
  },
  MuiDateTimePickerToolbar: {
    styleOverrides: {
      root: {
        backgroundColor: palettes[mode].background.paper,
        "& .MuiTypography-root": {
          color: palettes[mode].text.primary,
        },
      },
    },
  },
  MuiDateTimePickerTabs: {
    styleOverrides: {
      root: {
        backgroundColor: palettes[mode].background.paper,
        "& .MuiTab-root": {
          color: palettes[mode].text.secondary,
          "&.Mui-selected": {
            color: palettes[mode].primary.main,
          },
        },
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      variant: "outlined",
      fullWidth: true,
    },
    styleOverrides: {
      root: {
        marginBottom: "20px",
      },
    },
  },
  MuiInputLabel: {
    styleOverrides: {
      root: {
        fontSize: "0.95rem",
        color: palettes[mode].text.secondary,
        "&.Mui-focused": {
          color: palettes[mode].primary.main,
          fontWeight: 600,
        },
      },
      outlined: {
        transform: "translate(14px, 16px) scale(1)",
        "&.MuiInputLabel-sizeSmall": {
          transform: "translate(14px, 9px) scale(1)",
          "&.MuiInputLabel-shrink": {
            transform: "translate(14px, -9px) scale(0.75)",
          },
        },
        "&.MuiInputLabel-shrink": {
          transform: "translate(14px, -9px) scale(0.75)",
        },
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        minHeight: "52px",
        borderRadius: 12,
        "&.MuiInputBase-sizeSmall": {
          minHeight: "40px",
        },
        backgroundColor:
          mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.01)",
        transition: "all 0.2s ease-in-out",
        "& fieldset": {
          borderColor: palettes[mode].divider,
          borderWidth: "1px",
          transition:
            "border-color 0.2s ease-in-out, border-width 0.2s ease-in-out",
        },
        "&:hover fieldset": {
          borderColor:
            mode === "dark"
              ? "rgba(255, 255, 255, 0.25)"
              : "rgba(0, 0, 0, 0.2)",
        },
        "&.Mui-focused fieldset": {
          borderColor: palettes[mode].primary.main,
          borderWidth: "2px",
        },
        "&.Mui-focused": {
          boxShadow:
            mode === "dark"
              ? `0 0 0 3px ${alpha(palettes[mode].primary.main, 0.2)}`
              : `0 0 0 3px ${alpha(palettes[mode].primary.main, 0.1)}`,
        },
        "&.Mui-error fieldset": {
          borderColor: palettes[mode].error.main,
        },
      },
      input: {
        fontSize: "0.95rem",
        fontWeight: 500,
        color: palettes[mode].text.primary,
      },
    },
  },
  MuiSelect: {
    styleOverrides: {
      select: {
        display: "flex",
        alignItems: "center",
      },
    },
  },
  MuiAutocomplete: {
    styleOverrides: {
      inputRoot: {
        paddingTop: "6px !important",
        paddingBottom: "6px !important",
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        transition: "all 0.2s ease-in-out",
        "&.MuiTableRow-hover:hover": {
          backgroundColor:
            mode === "dark"
              ? alpha(palettes[mode].primary.main, 0.12)
              : alpha(palettes[mode].primary.main, 0.06),
        },
        "&.Mui-selected": {
          backgroundColor: alpha(palettes[mode].primary.main, 0.16),
          "&:hover": {
            backgroundColor: alpha(palettes[mode].primary.main, 0.2),
          },
        },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderColor:
          palettes[mode].divider_alpha?.main_10 || palettes[mode].divider,
        padding: "12px 16px",
      },
      head: {
        fontWeight: 700,
        textTransform: "uppercase",
        fontSize: "0.75rem",
        letterSpacing: "0.05em",
        color: palettes[mode].text.secondary,
        backgroundColor:
          mode === "dark"
            ? alpha(palettes[mode].primary.main, 0.05)
            : alpha(palettes[mode].primary.main, 0.02),
      },
    },
  },
  MuiFormHelperText: {
    styleOverrides: {
      root: {
        position: "absolute",
        bottom: "-18px",
        marginLeft: "2px",
        fontSize: "0.75rem",
        fontWeight: 400,
        lineHeight: 1,
        whiteSpace: "nowrap",
        "&.Mui-error": {
          color: palettes[mode].error.main,
        },
      },
    },
  },
  // Global Premium Menu Styling
  MuiMenu: {
    styleOverrides: {
      paper: {
        minWidth: 160,
        borderRadius: "12px",
        boxShadow:
          mode === "dark"
            ? "0 8px 32px rgba(0,0,0,0.6)"
            : "0 8px 32px rgba(0,0,0,0.1)",
        border: `1px solid ${palettes[mode].divider}`,
        backgroundColor: palettes[mode].background.paper,
        backdropFilter: "blur(12px)",
        marginTop: "8px",
      },
      list: {
        padding: "8px",
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        borderRadius: "8px",
        marginBottom: "4px",
        padding: "8px 12px",
        transition: "all 0.2s",
        "&:hover": {
          backgroundColor:
            palettes[mode].primary._alpha.main_10 ||
            "rgba(255, 255, 255, 0.05)",
        },
        "&.Mui-selected": {
          backgroundColor:
            palettes[mode].primary._alpha.main_15 || "rgba(255, 255, 255, 0.1)",
          "&:hover": {
            backgroundColor:
              palettes[mode].primary._alpha.main_20 ||
              "rgba(255, 255, 255, 0.15)",
          },
        },
        "&:last-child": {
          marginBottom: 0,
        },
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 20,
        backgroundImage: "none",
        backgroundColor:
          mode === "dark"
            ? "rgba(11, 15, 25, 0.85)"
            : "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(24px) saturate(180%)",
        border: `1px solid ${mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        boxShadow:
          mode === "dark"
            ? "0 24px 64px rgba(0,0,0,0.7)"
            : "0 24px 64px rgba(0,0,0,0.1)",
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        padding: "24px 24px 16px",
        "& .MuiTypography-root": {
          fontWeight: 800,
          fontSize: "1.25rem",
          color: palettes[mode].text.primary,
        },
      },
    },
  },
  MuiDialogContent: {
    styleOverrides: {
      root: {
        padding: "16px 24px 24px",
        color: palettes[mode].text.secondary,
      },
    },
  },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: "16px 24px 24px",
        gap: "12px",
      },
    },
  },
});
