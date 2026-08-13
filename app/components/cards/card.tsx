import { Card, useTheme } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";

interface CustomCardProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

export default function CustomCard({ children, sx }: CustomCardProps) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        backgroundColor: theme.palette.background.paper,
        backgroundImage: "none",
        backdropFilter: "blur(12px)",
        borderRadius: "20px",
        p: "20px 24px",
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.palette.mode === "dark" 
          ? "0 4px 20px 0 rgba(0, 0, 0, 0.5)"
          : "0 4px 20px 0 rgba(0, 0, 0, 0.05)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        ...sx,
      }}
    >
      {children}
    </Card>
  );
}
