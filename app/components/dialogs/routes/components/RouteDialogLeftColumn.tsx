import { Box, Stack, Typography, Divider, useTheme } from "@mui/material";
import DriverCard from "../../../cards/driverCard";
import RouteProgress from "../progress";
import { RouteWithRelations } from "@/app/lib/type/routes";
import { Dictionary } from "@/app/lib/language/language";

interface RouteDialogLeftColumnProps {
  route: RouteWithRelations;
  dict: Dictionary;
  liveMetrics: { distanceKm: number; durationMin: number } | null;
}

export const RouteDialogLeftColumn = ({
  route,
  dict,
  liveMetrics,
}: RouteDialogLeftColumnProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: { xs: "100%", md: "400px" },
        borderRight: `1px solid ${theme.palette.divider_alpha.main_05}`,
        p: 3,
        bgcolor: theme.palette.common.white_alpha.main_01,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        {/* Driver Section */}
        <Stack spacing={2}>
          <Typography
            variant="overline"
            color="rgba(255,255,255,0.3)"
            fontWeight={700}
          >
            {dict.routes.dialogs.driverAssignment}
          </Typography>
          {route.driver ? (
            <DriverCard
              employeeId={route.driver.employeeId || dict.common.na}
              licenseType={route.driver.licenseType || ""}
              rating={route.driver.rating || 0}
              user={{
                name: route.driver.user.name,
                surname: route.driver.user.surname,
                avatarUrl: route.driver.user.avatarUrl,
              }}
              currentVehicle={
                route.vehicle ? { plate: route.vehicle.plate } : null
              }
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              {dict.common.na}
            </Typography>
          )}
        </Stack>

        <Divider
          sx={{ borderColor: theme.palette.common.white_alpha.main_05 }}
        />

        {/* Progress Section */}
        <RouteProgress route={route} />

        <Divider
          sx={{ borderColor: theme.palette.common.white_alpha.main_05 }}
        />

        {/* Stats Grid */}
        <Stack direction="row" spacing={2}>
          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: "16px",
              bgcolor: theme.palette.common.white_alpha.main_03,
              border: `1px solid ${theme.palette.common.white_alpha.main_05}`,
            }}
          >
            <Typography
              variant="caption"
              color="rgba(255,255,255,0.4)"
              display="block"
              mb={0.5}
            >
              {dict.routes.details.distance}
            </Typography>
            <Typography
              component="div"
              variant="h6"
              fontWeight={700}
              color="white"
            >
              {Number(
                liveMetrics?.distanceKm ||
                  route.metrics?.totalDistanceKm ||
                  route.distanceKm ||
                  0
              ).toFixed(1)}{" "}
              km
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: "16px",
              bgcolor: theme.palette.common.white_alpha.main_03,
              border: `1px solid ${theme.palette.common.white_alpha.main_05}`,
            }}
          >
            <Typography
              variant="caption"
              color="rgba(255,255,255,0.4)"
              display="block"
              mb={0.5}
            >
              {dict.routes.details.stops}
            </Typography>
            <Typography
              component="div"
              variant="h6"
              fontWeight={700}
              color="white"
            >
              {route.stops?.length || route.shipments?.length
                ? (route.shipments?.length || 0) + 2
                : 0}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
};
