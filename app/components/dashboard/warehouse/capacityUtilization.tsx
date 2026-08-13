"use client";

import {
  Box,
  CircularProgress,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import CustomCard from "../../cards/card";
import { WarehouseWithRelations } from "@/app/lib/type/warehouse";
import AnalyticsSkeleton from "@/app/components/skeletons/AnalyticsSkeleton";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface CapacityUtilizationProps {
  warehouses: WarehouseWithRelations[];
  loading?: boolean;
}

const CapacityUtilization = ({
  warehouses,
  loading = false,
}: CapacityUtilizationProps) => {
  const dict = useDictionary();
  const theme = useTheme();

  if (loading) {
    return (
      <AnalyticsSkeleton
        title={dict.dashboard.warehouse.capacityUtilization}
        height={300}
      />
    );
  }

  return (
    <CustomCard sx={{ flex: 2 }}>
      <Typography
        variant="h6"
        fontWeight={800}
        sx={{ mb: 4, letterSpacing: "-0.02em" }}
      >
        {dict.dashboard.warehouse.capacityUtilization}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(auto-fit, minmax(200px, 1fr))",
          },
          gap: 4,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {warehouses.map((warehouse) => {
          // No invented fallback: the server derives occupancy from
          // quantity ÷ units-per-pallet, and multiplying the SKU count by a
          // magic 10 reported a number unrelated to real rack usage.
          const usedPallets = warehouse.usedPallets ?? 0;
          const totalPallets = warehouse.capacityPallets || 5000;
          const capacityPct = Math.min(
            100,
            Math.round((usedPallets / totalPallets) * 100)
          );

          const isCritical = capacityPct > 85;
          const mainColor = isCritical ? theme.palette.error.main : theme.palette.primary.main;

          return (
            <Stack key={warehouse.id} alignItems="center" spacing={3}>
              <Box position="relative" display="inline-flex">
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={140}
                  thickness={3}
                  sx={{
                    color: theme.palette.divider_alpha.main_05,
                  }}
                />
                <CircularProgress
                  variant="determinate"
                  value={capacityPct}
                  size={140}
                  thickness={3}
                  sx={{
                    color: mainColor,
                    position: "absolute",
                    left: 0,
                    filter: `drop-shadow(0 0 8px ${
                      isCritical
                        ? theme.palette.error._alpha.main_30
                        : theme.palette.primary._alpha.main_40
                    })`,
                    [`& .MuiCircularProgress-circle`]: {
                      strokeLinecap: "round",
                    },
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: "absolute",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                  }}
                >
                  <Typography
                    variant="h4"
                    component="div"
                    fontWeight={900}
                    sx={{ letterSpacing: "-0.04em" }}
                  >
                    {capacityPct}%
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: theme.palette.text.primary_alpha.main_40,
                      letterSpacing: "0.1em",
                      fontSize: "0.65rem",
                    }}
                  >
                    {warehouse.city}
                  </Typography>
                </Box>
              </Box>
              <Stack alignItems="center" spacing={0.5}>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  color="text.primary"
                >
                  {warehouse.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {usedPallets.toLocaleString("en-US")} /{" "}
                  {totalPallets.toLocaleString("en-US")}{" "}
                  {dict.dashboard.warehouse.pallets}
                </Typography>
              </Stack>
            </Stack>
          );
        })}
      </Box>
    </CustomCard>
  );
};

export default CapacityUtilization;
