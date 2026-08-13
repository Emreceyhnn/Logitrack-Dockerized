"use client";

import { useTheme } from "@mui/material/styles";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from "@mui/icons-material/Error";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useTheme();

  return (
    <Sonner
      theme={theme.palette.mode as "light" | "dark" | "system"}
      className="toaster group"
      icons={{
        success: (
          <CheckCircleIcon
            sx={{ color: theme.palette.success.main, fontSize: 20 }}
          />
        ),
        info: (
          <InfoIcon sx={{ color: theme.palette.info.main, fontSize: 20 }} />
        ),
        warning: (
          <WarningAmberIcon
            sx={{ color: theme.palette.warning.main, fontSize: 20 }}
          />
        ),
        error: (
          <ErrorIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
        ),
      }}
      toastOptions={{
        style: {
          background: theme.palette.background.paper,
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: "8px",
          boxShadow: theme.shadows[3],
          fontFamily: theme.typography.fontFamily,
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
