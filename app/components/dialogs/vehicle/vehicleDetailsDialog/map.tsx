"use client";

import { useMemo } from "react";
import CustomCard from "../../../cards/card";
import { Box, Stack, Typography, Skeleton, useTheme } from "@mui/material";
import SatelliteAltIcon from "@mui/icons-material/SatelliteAlt";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import dynamic from "next/dynamic";
const MapWithMarkers = dynamic(
  () => import("../../../valhalla/mapWithMarker"),
  {
    ssr: false,
  }
);

interface MapVehicleOverviewCardProps {
  /** Vehicle ID — used as the marker key */
  id: string;
  /** Vehicle plate number — shown as the marker label */
  name: string;
  /** Last known location from Postgres (Vehicle.currentLat/currentLng).
   *  Populated by whichever GPS/telematics provider the company integrates —
   *  live tracking itself is out of scope here. */
  dbLocation?: { lat: number; lng: number } | null;
  loading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const MapVehicleOverviewCard = ({
  id,
  name,
  dbLocation,
  loading = false,
}: MapVehicleOverviewCardProps) => {
  const theme = useTheme();
  const dict = useDictionary();

  const markers = useMemo(
    () =>
      dbLocation
        ? [
            {
              id,
              lat: dbLocation.lat,
              len: dbLocation.lng,
              name,
              type: "V" as const,
            },
          ]
        : [],
    [dbLocation, name, id]
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <CustomCard
      sx={{ flexGrow: 1, padding: 0, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}
    >
      {/* ── Map ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          sx={{
            flexGrow: 1,
            minHeight: 320,
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.04)",
          }}
        />
      ) : dbLocation ? (
        <Box sx={{ width: "100%", flexGrow: 1, minHeight: 320, position: "relative", zIndex: 1 }}>
          <MapWithMarkers
            markers={markers}
            tileErrorText={dict.vehicles.dialogs.mapLoadError}
          />
        </Box>
      ) : (
        // ── No Location State ──
        <Stack
          alignItems="center"
          justifyContent="center"
          spacing={1.5}
          sx={{
            flexGrow: 1,
            minHeight: 320,
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.03)"
                : "rgba(0,0,0,0.02)",
            borderRadius: 2,
          }}
        >
          <SatelliteAltIcon sx={{ fontSize: 48, color: "text.disabled" }} />
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontWeight: 700 }}
          >
            {dict.vehicles.dialogs.noGpsData}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "text.disabled", textAlign: "center", px: 2 }}
          >
            {dict.vehicles.dialogs.noGpsDesc}
          </Typography>
        </Stack>
      )}

      {/* Last-known-location label — this card no longer holds a live feed */}
      {dbLocation && !loading && (
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            px: 2,
            py: 1,
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(11, 16, 25, 0.85)"
                : "rgba(255, 255, 255, 0.85)",
            zIndex: 10,
            pointerEvents: "none",
            backdropFilter: "blur(4px)",
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.65rem",
              fontWeight: 700,
            }}
          >
            {dict.vehicles.dialogs.dbFallback}
          </Typography>
        </Box>
      )}
    </CustomCard>
  );
};

export default MapVehicleOverviewCard;
