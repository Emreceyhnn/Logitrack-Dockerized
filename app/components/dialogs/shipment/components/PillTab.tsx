import { Box, Typography, Theme } from "@mui/material";

export const PillTab = ({
  id,
  icon,
  label,
  badge,
  active,
  onClick,
  theme,
}: {
  id?: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active: boolean;
  onClick: () => void;
  theme: Theme;
}) => {
  return (
    <Box
      id={id}
      component="button"
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.5,
        py: 0.6,
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        transition: "all 0.18s ease",
        bgcolor: active ? theme.palette.primary._alpha.main_15 : "transparent",
        color: active ? "primary.main" : "text.secondary",
        "&:hover": {
          bgcolor: active
            ? theme.palette.primary._alpha.main_20
            : theme.palette.action.hover,
          color: active ? "primary.main" : "text.primary",
        },
      }}
    >
      <Box sx={{ display: "flex", fontSize: 15, color: "inherit" }}>{icon}</Box>
      <Typography
        variant="caption"
        fontWeight={active ? 700 : 500}
        sx={{ color: "inherit", fontSize: "0.78rem" }}
      >
        {label}
      </Typography>
      {badge != null && badge > 0 && (
        <Box
          sx={{
            px: 0.75,
            lineHeight: "17px",
            borderRadius: "5px",
            fontSize: "0.6rem",
            fontWeight: 800,
            bgcolor: active
              ? theme.palette.primary._alpha.main_25
              : theme.palette.action.selected,
            color: active ? "primary.main" : "text.secondary",
          }}
        >
          {badge}
        </Box>
      )}
    </Box>
  );
};
