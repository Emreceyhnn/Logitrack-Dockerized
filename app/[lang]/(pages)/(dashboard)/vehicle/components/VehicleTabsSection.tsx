"use client";

import { Box, Button, useTheme } from "@mui/material";
import { Dictionary } from "@/app/lib/language/language";

interface ExtendedPalette {
  primary?: {
    _alpha?: Record<string, string>;
  };
}

export default function VehicleTabsSection({ dict, activeTab, setActiveTab }: { dict: Dictionary, activeTab: number, setActiveTab: (tab: number) => void }) {
  const theme = useTheme();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;

  return (
    <Box data-tour="vehicle-tabs" sx={{ display: "inline-flex", p: 0.5, bgcolor: "background.paper", borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
      <Button
        onClick={() => setActiveTab(0)}
        sx={{
          px: 3, textTransform: "none", borderRadius: 1.5,
          bgcolor: activeTab === 0 ? paletteTheme.primary?._alpha?.main_15 : "transparent",
          color: activeTab === 0 ? "primary.main" : "text.secondary",
          fontWeight: activeTab === 0 ? 700 : 500, fontSize: 15, transition: "all 0.2s ease-in-out",
          "&:hover": { bgcolor: activeTab === 0 ? paletteTheme.primary?._alpha?.main_20 : theme.palette.action.hover },
          ...(activeTab === 0 && { boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: `1px solid ${paletteTheme.primary?._alpha?.main_20}` }),
        }}
      >
        {dict.vehicles.tabs.vehicles}
      </Button>
      <Button
        onClick={() => setActiveTab(1)}
        sx={{
          px: 3, textTransform: "none", borderRadius: 1.5,
          bgcolor: activeTab === 1 ? paletteTheme.primary?._alpha?.main_15 : "transparent",
          color: activeTab === 1 ? "primary.main" : "text.secondary",
          fontWeight: activeTab === 1 ? 700 : 500, fontSize: 15, transition: "all 0.2s ease-in-out",
          "&:hover": { bgcolor: activeTab === 1 ? paletteTheme.primary?._alpha?.main_20 : theme.palette.action.hover },
          ...(activeTab === 1 && { boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: `1px solid ${paletteTheme.primary?._alpha?.main_20}` }),
        }}
      >
        {dict.vehicles.tabs.trailers}
      </Button>
    </Box>
  );
}
