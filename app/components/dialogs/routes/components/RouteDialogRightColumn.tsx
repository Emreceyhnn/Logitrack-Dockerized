import React from "react";
import { Box, useTheme } from "@mui/material";
import MapRoutesDialogCard from "../map";
import RoutesTelemetryCards from "../telemetry";
import { RouteWithRelations } from "@/app/lib/type/routes";

interface RouteDialogRightColumnProps {
  route: RouteWithRelations;
  mapOrigin: { lat: number; lng: number; address?: string } | undefined;
  mapDestination: { lat: number; lng: number; address?: string } | undefined;
  intermediateStops: { location: { lat: number; lng: number }; stopover: boolean }[];
  liveMetrics: { distanceKm: number; durationMin: number } | null;
  setLiveMetrics: React.Dispatch<React.SetStateAction<{ distanceKm: number; durationMin: number } | null>>;
  vehicleTraveledMetrics: { distanceKm: number } | null;
  vehicleToDestMetrics: { distanceKm: number; durationMin: number } | null;
}

export const RouteDialogRightColumn = ({
  route,
  mapOrigin,
  mapDestination,
  intermediateStops,
  liveMetrics,
  setLiveMetrics,
  vehicleTraveledMetrics,
  vehicleToDestMetrics,
}: RouteDialogRightColumnProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        flex: 1,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          height: { xs: 300, md: "auto" },
          flex: { md: 1 },
          minHeight: { md: 0 },
          width: "100%",
        }}
      >
        <MapRoutesDialogCard
          origin={mapOrigin}
          destination={mapDestination}
          stops={intermediateStops}
          onRouteInfoUpdate={setLiveMetrics}
          vehicleLocation={
            route.vehicle &&
            route.vehicle.currentLat &&
            route.vehicle.currentLng
              ? {
                  lat: route.vehicle.currentLat,
                  lng: route.vehicle.currentLng,
                  name: route.vehicle.plate,
                  id: route.vehicle.id,
                }
              : null
          }
        />
      </Box>

      {/* Overlay Telemetry */}
      <Box
        sx={{
          p: 2,
          background: `linear-gradient(to top, #0B1019 0%, ${theme.palette.background.midnight._alpha.main_80} 100%)`,
          backdropFilter: "blur(8px)",
          borderTop: `1px solid ${theme.palette.divider_alpha.main_10}`,
        }}
      >
        <RoutesTelemetryCards
          routeId={route.id}
          route={route}
          liveDistanceKm={liveMetrics?.distanceKm}
          traveledKm={vehicleTraveledMetrics?.distanceKm}
          remainingKm={vehicleToDestMetrics?.distanceKm}
          durationMin={vehicleToDestMetrics?.durationMin}
        />
      </Box>
    </Box>
  );
};
