"use client";

import { Box, Dialog, DialogContent, Stack, useTheme } from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { lookupTranslation } from "@/app/lib/priorityColor";
import { RouteWithRelations } from "@/app/lib/type/routes";
import MapRoutesDialogCard from "./map";
import RoutesTelemetryCards from "./telemetry";
import { resolvePaletteColor, resolvePaletteAlpha } from "@/app/lib/utils/paletteUtils";
import { useRouteDialog } from "@/app/hooks/useRouteDialog";
import RouteDialogHeader from "./sections/RouteDialogHeader";
import RouteDialogSidebar from "./sections/RouteDialogSidebar";
import { Dictionary } from "@/app/lib/language/language";

interface RouteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (() => void) | undefined;
  route: RouteWithRelations | null;
}

const getStatusMeta = (status?: string, dict?: Dictionary) => {
  const s = status?.toLocaleUpperCase('en-US');
  const label = (s && lookupTranslation(dict?.routes?.statuses, s)) || status || "-";
  switch (s) {
    case "ACTIVE": return { color: "success.main", label };
    case "COMPLETED": return { color: "info.main", label };
    case "PENDING":
    case "PLANNED": return { color: "warning.main", label };
    case "CANCELED": return { color: "error.main", label };
    default: return { color: "text.primary", label };
  }
};

interface ExtendedPalette {
  primary?: {
    _alpha?: Record<string, string>;
  };
  divider_alpha?: Record<string, string>;
  background?: {
    midnight?: {
      _alpha?: Record<string, string>;
    };
  };
}

export default function RouteDialog({ open, onClose, onSuccess, route }: RouteDialogProps) {
  const dict = useDictionary();
  const theme = useTheme();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;

  const { liveMetrics, setLiveMetrics, vehicleToDestMetrics, vehicleTraveledMetrics, statusLoading, mapOrigin, mapDestination, intermediateStops, handleStatusChange } = useRouteDialog(open, route, onSuccess, dict.toasts.demoActionDisabled);

  if (!route) return null;

  const statusMeta = getStatusMeta(route.status || "PENDING", dict);
  const statusColor = statusMeta.color.includes(".") ? (resolvePaletteColor(theme.palette, statusMeta.color) || theme.palette.text.primary) : statusMeta.color;
  const paletteKey = statusMeta.color.split(".")[0] ?? "";
  const statusAlpha = resolvePaletteAlpha(theme.palette, paletteKey) ?? paletteTheme.primary?._alpha ?? { main_05: "", main_10: "", main_20: "" };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 4, backgroundImage: "none", border: `1px solid ${paletteTheme.divider_alpha?.main_10}`, overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", display: "flex", flexDirection: "column", height: { md: "85vh" }, maxHeight: "90vh" } }}>
      <RouteDialogHeader route={route} dict={dict} theme={theme} handleStatusChange={handleStatusChange} statusLoading={statusLoading} onClose={onClose} statusMeta={statusMeta} statusColor={statusColor} statusAlpha={statusAlpha} />
      <DialogContent sx={{ p: 0, overflow: { xs: "auto", md: "hidden" }, flex: 1, minHeight: 0 }}>
        <Stack direction={{ xs: "column", md: "row" }} sx={{ height: { md: "100%" }, minHeight: 0 }}>
          <RouteDialogSidebar route={route} dict={dict} theme={theme} liveMetrics={liveMetrics} />
          
          <Box sx={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Box sx={{ height: { xs: 300, md: "auto" }, flex: { md: 1 }, minHeight: { md: 0 }, width: "100%" }}>
              <MapRoutesDialogCard origin={mapOrigin} destination={mapDestination} stops={intermediateStops} onRouteInfoUpdate={setLiveMetrics} shape={route.shape} bufferMeters={route.bufferMeters} vehicleLocation={route.vehicle && route.vehicle.currentLat && route.vehicle.currentLng ? { lat: route.vehicle.currentLat, lng: route.vehicle.currentLng, name: route.vehicle.plate, id: route.vehicle.id } : null} />
            </Box>
            <Box sx={{ p: 2, background: `linear-gradient(to top, #0B1019 0%, ${paletteTheme.background?.midnight?._alpha?.main_80} 100%)`, backdropFilter: "blur(8px)", borderTop: `1px solid ${paletteTheme.divider_alpha?.main_10}` }}>
              <RoutesTelemetryCards routeId={route.id} route={route} liveDistanceKm={liveMetrics?.distanceKm} traveledKm={vehicleTraveledMetrics?.distanceKm} remainingKm={vehicleToDestMetrics?.distanceKm} durationMin={vehicleToDestMetrics?.durationMin} />
            </Box>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
