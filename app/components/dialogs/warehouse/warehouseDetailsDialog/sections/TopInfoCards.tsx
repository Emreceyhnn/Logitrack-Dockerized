"use client";

import { Box, Stack, Typography, Grid, useTheme } from "@mui/material";
import { WarehouseWithRelations } from "@/app/lib/type/warehouse";
import { useState, useEffect } from "react";
import { getUserNow } from "@/app/lib/utils/date";
import dayjs from "dayjs";
import MapIcon from "@mui/icons-material/Map";
import InventoryIcon from "@mui/icons-material/Inventory";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import CustomCard from "@/app/components/cards/card";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface TopInfoCardsProps {
  warehouse: WarehouseWithRelations;
}

interface ExtendedPalette {
  kpi?: {
    amber?: string;
    amber_alpha?: Record<string, string>;
    violet?: string;
    violet_alpha?: Record<string, string>;
    sky?: string;
    sky_alpha?: Record<string, string>;
  };
  success?: {
    _alpha?: Record<string, string>;
  };
  error?: {
    _alpha?: Record<string, string>;
  };
}

export default function TopInfoCards({ warehouse }: TopInfoCardsProps) {
  const dict = useDictionary();
  const theme = useTheme();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;
  const t = dict.warehouses.dialogs.details;

  const operatingHoursStr =
    typeof warehouse.operatingHours === "object" && warehouse.operatingHours !== null
      ? (warehouse.operatingHours as { monFri?: string }).monFri || "08:00 - 18:00"
      : typeof warehouse.operatingHours === "string"
        ? warehouse.operatingHours
        : "08:00 - 18:00";

  const [nowInWhTz, setNowInWhTz] = useState(getUserNow(warehouse.timezone || "UTC"));

  useEffect(() => {
    const timer = setInterval(() => {
      setNowInWhTz(getUserNow(warehouse.timezone || "UTC"));
    }, 10000);
    return () => clearInterval(timer);
  }, [warehouse.timezone]);

  const is247 = operatingHoursStr === "24/7";
  let isOpen = is247;
  let statusText = "Open";

  const parseTime = (timeStr: string, tz: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return dayjs().tz(tz).set("hour", h ?? 0).set("minute", m ?? 0).set("second", 0);
  };

  if (!is247 && operatingHoursStr.includes(" - ")) {
    const [opening, closing] = operatingHoursStr.split(" - ");
    const whOpening = parseTime(opening ?? "", warehouse.timezone || "UTC");
    let whClosing = parseTime(closing ?? "", warehouse.timezone || "UTC");

    if (whClosing.isBefore(whOpening)) {
      if (nowInWhTz.isAfter(whOpening) || nowInWhTz.isSame(whOpening)) {
        whClosing = whClosing.add(1, "day");
      } else {
        whOpening.subtract(1, "day");
      }
    }

    isOpen = (nowInWhTz.isAfter(whOpening) || nowInWhTz.isSame(whOpening)) && nowInWhTz.isBefore(whClosing);
  }

  statusText = isOpen ? dict.warehouses.dialogs.status?.open || "OPEN" : dict.warehouses.dialogs.status?.closed || "CLOSED";

  return (
    <>
      <Grid size={{ xs: 12, md: 4 }}>
        <CustomCard sx={{ p: 1.5, height: "100%", display: "flex", flexDirection: "column", bgcolor: paletteTheme.kpi?.amber_alpha?.main_10, borderColor: paletteTheme.kpi?.amber_alpha?.main_20, borderWidth: 1, borderStyle: "solid" }}>
          <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
            <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: paletteTheme.kpi?.amber_alpha?.main_20, color: paletteTheme.kpi?.amber }}>
              <MapIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">{t.locationDetails}</Typography>
          </Stack>
          <Stack spacing={1}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.65rem", lineHeight: 1 }}>{t.address}</Typography>
              <Typography variant="caption" color="text.primary" fontWeight={600} sx={{ display: "block" }}>{warehouse.address}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.65rem", lineHeight: 1 }}>{t.cityCountry}</Typography>
              <Typography variant="caption" color="text.primary" fontWeight={600} sx={{ display: "block" }}>{warehouse.city}, {warehouse.country}</Typography>
            </Box>
          </Stack>
        </CustomCard>
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <CustomCard sx={{ p: 1.5, height: "100%", display: "flex", flexDirection: "column", bgcolor: paletteTheme.kpi?.violet_alpha?.main_10, borderColor: paletteTheme.kpi?.violet_alpha?.main_20, borderWidth: 1, borderStyle: "solid" }}>
          <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
            <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: paletteTheme.kpi?.violet_alpha?.main_20, color: paletteTheme.kpi?.violet }}>
              <InventoryIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">{t.uniqueSkus}</Typography>
          </Stack>
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography variant="h5" fontWeight={800} color="text.primary">{warehouse._count?.inventory || 0}</Typography>
          </Box>
        </CustomCard>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <CustomCard sx={{ p: 1.5, height: "100%", display: "flex", flexDirection: "column", bgcolor: paletteTheme.kpi?.sky_alpha?.main_10, borderColor: paletteTheme.kpi?.sky_alpha?.main_20, borderWidth: 1, borderStyle: "solid" }}>
          <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
            <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: paletteTheme.kpi?.sky_alpha?.main_20, color: paletteTheme.kpi?.sky }}>
              <BusinessCenterIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">{t.operations}</Typography>
          </Stack>
          <Grid container spacing={1.5}>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.65rem" }}>{t.facilityType}</Typography>
              <Typography variant="caption" color="text.primary" fontWeight={700} sx={{ textTransform: "uppercase", fontSize: "0.65rem" }}>
                {dict.warehouses.categories.types[warehouse.type as keyof typeof dict.warehouses.categories.types] || warehouse.type}
              </Typography>
            </Grid>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.65rem" }}>{t.manager}</Typography>
              <Typography variant="caption" color="text.primary" fontWeight={600}>
                {warehouse.manager ? `${warehouse.manager.name} ${warehouse.manager.surname}` : t.notAssigned}
              </Typography>
            </Grid>
            <Grid size={12}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.65rem" }}>{t.operatingHours}</Typography>
                  <Typography variant="caption" color="text.primary" fontWeight={600} sx={{ fontSize: "0.65rem" }}>
                    {operatingHoursStr} (LCL)
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Box sx={{ px: 0.8, py: 0.2, borderRadius: 1, bgcolor: isOpen ? paletteTheme.success?._alpha?.main_10 : paletteTheme.error?._alpha?.main_10, color: isOpen ? theme.palette.success.main : theme.palette.error.main, fontWeight: 700, fontSize: "0.6rem", display: "flex", alignItems: "center", gap: 0.4 }}>
                    <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: isOpen ? theme.palette.success.main : theme.palette.error.main }} />
                    {statusText.toLocaleUpperCase('en-US')}
                  </Box>
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </CustomCard>
      </Grid>
    </>
  );
}
