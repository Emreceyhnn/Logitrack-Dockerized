"use client";

import { Box, Stack, Typography, Grid, LinearProgress, useTheme } from "@mui/material";
import { WarehouseWithRelations } from "@/app/lib/type/warehouse";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CustomCard from "@/app/components/cards/card";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface CapacityUtilizationProps {
  warehouse: WarehouseWithRelations;
}

interface ExtendedPalette {
  kpi?: {
    indigo?: string;
    indigo_alpha?: Record<string, string>;
    teal?: string;
    teal_alpha?: Record<string, string>;
  };
  divider_alpha?: Record<string, string>;
}

export default function CapacityUtilization({ warehouse }: CapacityUtilizationProps) {
  const dict = useDictionary();
  const theme = useTheme();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;
  const t = dict.warehouses.dialogs.details;

  // See capacityUtilization: never guess occupancy from SKU count.
  const usedPallets = warehouse.usedPallets ?? 0;
  const totalPallets = warehouse.capacityPallets || 5000;
  const usedVolume =
    warehouse.usedVolume ?? (warehouse._count?.inventory || 0) * 5;
  const totalVolume = warehouse.capacityVolumeM3 || 100000;

  const palletPct = Math.min((usedPallets / totalPallets) * 100, 100);
  const volumePct = Math.min((usedVolume / totalVolume) * 100, 100);

  return (
    <>
      <Grid size={{ xs: 12 }}>
        <Typography variant="subtitle1" fontWeight={800} color="text.primary" mb={1} mt={1}>
          {t.capacityUtilization}
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <CustomCard sx={{ p: 1.5, display: "flex", flexDirection: "column", justifyContent: "center", bgcolor: paletteTheme.kpi?.indigo_alpha?.main_10, borderColor: paletteTheme.kpi?.indigo_alpha?.main_20, borderWidth: 1, borderStyle: "solid" }}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5}>
            <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: paletteTheme.kpi?.indigo_alpha?.main_20, color: paletteTheme.kpi?.indigo }}>
              <BusinessCenterIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box flex={1}>
              <Typography variant="caption" fontWeight={700} color="text.primary" sx={{ display: "block", lineHeight: 1 }}>{t.palletStorage}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>{t.standardEuroPallets}</Typography>
            </Box>
            <Typography variant="body2" fontWeight={800} color="text.primary">{palletPct.toFixed(1)}%</Typography>
          </Stack>
          <Box sx={{ position: "relative", mb: 1 }}>
            <LinearProgress variant="determinate" value={100} sx={{ height: 8, borderRadius: 4, bgcolor: paletteTheme.divider_alpha?.main_10, "& .MuiLinearProgress-bar": { display: "none" } }} />
            <LinearProgress variant="determinate" value={palletPct} sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, borderRadius: 4, bgcolor: "transparent", "& .MuiLinearProgress-bar": { borderRadius: 4, bgcolor: theme.palette.primary.main } }} />
          </Box>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.primary" fontWeight={600} sx={{ fontSize: "0.7rem" }}>{usedPallets.toLocaleString("en-US")} {t.used}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>{totalPallets.toLocaleString("en-US")} {t.totalCapacity}</Typography>
          </Stack>
        </CustomCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <CustomCard sx={{ p: 1.5, display: "flex", flexDirection: "column", justifyContent: "center", bgcolor: paletteTheme.kpi?.teal_alpha?.main_10, borderColor: paletteTheme.kpi?.teal_alpha?.main_20, borderWidth: 1, borderStyle: "solid" }}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5}>
            <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: paletteTheme.kpi?.teal_alpha?.main_20, color: paletteTheme.kpi?.teal }}>
              <LocalShippingIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box flex={1}>
              <Typography variant="caption" fontWeight={700} color="text.primary" sx={{ display: "block", lineHeight: 1 }}>{t.volumeCapacity}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>{t.totalCubicMeters}</Typography>
            </Box>
            <Typography variant="body2" fontWeight={800} color="text.primary">{volumePct.toFixed(1)}%</Typography>
          </Stack>
          <Box sx={{ position: "relative", mb: 1 }}>
            <LinearProgress variant="determinate" value={100} sx={{ height: 8, borderRadius: 4, bgcolor: paletteTheme.divider_alpha?.main_10, "& .MuiLinearProgress-bar": { display: "none" } }} />
            <LinearProgress variant="determinate" value={volumePct} color="success" sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, borderRadius: 4, bgcolor: "transparent", "& .MuiLinearProgress-bar": { borderRadius: 4, bgcolor: theme.palette.success.main } }} />
          </Box>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.primary" fontWeight={600} sx={{ fontSize: "0.7rem" }}>{usedVolume.toLocaleString("en-US")} {t.m3Used}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>{totalVolume.toLocaleString("en-US")} {t.m3TotalCapacity}</Typography>
          </Stack>
        </CustomCard>
      </Grid>
    </>
  );
}
