import { Box, Stack, Typography, Divider } from "@mui/material";
import DriverCard from "../../../cards/driverCard";
import RouteProgress from "../progress";

import { Theme } from "@mui/material";
import { Dictionary } from "@/app/lib/language/language";
import { RouteWithRelations } from "@/app/lib/type/routes";

interface ExtendedPalette {
  divider_alpha?: Record<string, string>;
  common?: {
    white_alpha?: Record<string, string>;
  };
}

interface RouteDialogSidebarProps {
  route: RouteWithRelations;
  dict: Dictionary;
  theme: Theme;
  liveMetrics: { distanceKm: number } | null;
}

export default function RouteDialogSidebar({ route, dict, theme, liveMetrics }: RouteDialogSidebarProps) {
  const paletteTheme = theme.palette as unknown as ExtendedPalette;
  return (
    <Box sx={{ width: { xs: "100%", md: "400px" }, borderRight: `1px solid ${paletteTheme.divider_alpha?.main_05}`, p: 3, bgcolor: paletteTheme.common?.white_alpha?.main_01, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Stack spacing={2}>
          <Typography variant="overline" color="rgba(255,255,255,0.3)" fontWeight={700}>{dict.routes.dialogs.driverAssignment}</Typography>
          {route.driver ? (
            <DriverCard employeeId={route.driver.employeeId || dict.common.na} licenseType={route.driver.licenseType || ""} rating={route.driver.rating || 0} user={{ name: route.driver.user.name, surname: route.driver.user.surname, avatarUrl: route.driver.user.avatarUrl }} currentVehicle={route.vehicle ? { plate: route.vehicle.plate } : null} />
          ) : (
            <Typography variant="body2" color="text.secondary">{dict.common.na}</Typography>
          )}
        </Stack>
        <Divider sx={{ borderColor: paletteTheme.common?.white_alpha?.main_05 }} />
        <RouteProgress route={route} />
        <Divider sx={{ borderColor: paletteTheme.common?.white_alpha?.main_05 }} />
        <Stack direction="row" spacing={2}>
          <Box sx={{ flex: 1, p: 2, borderRadius: "16px", bgcolor: paletteTheme.common?.white_alpha?.main_03, border: `1px solid ${paletteTheme.common?.white_alpha?.main_05}` }}>
            <Typography variant="caption" color="rgba(255,255,255,0.4)" display="block" mb={0.5}>{dict.routes.details.distance}</Typography>
            <Typography component="div" variant="h6" fontWeight={700} color="white">{Number(liveMetrics?.distanceKm || route.metrics?.totalDistanceKm || route.distanceKm || 0).toFixed(1)} km</Typography>
          </Box>
          <Box sx={{ flex: 1, p: 2, borderRadius: "16px", bgcolor: paletteTheme.common?.white_alpha?.main_03, border: `1px solid ${paletteTheme.common?.white_alpha?.main_05}` }}>
            <Typography variant="caption" color="rgba(255,255,255,0.4)" display="block" mb={0.5}>{dict.routes.details.stops}</Typography>
            <Typography component="div" variant="h6" fontWeight={700} color="white">{route.stops?.length || route.shipments?.length ? (route.shipments?.length || 0) + 2 : 0}</Typography>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}
