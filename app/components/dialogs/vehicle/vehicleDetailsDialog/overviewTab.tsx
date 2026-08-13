import { VehicleWithRelations } from "@/app/lib/type/vehicle";
import {
  Stack,
  Typography,
  LinearProgress,
  Card,
  Button,
  Box,
  useTheme,
  Grid,
  Theme,
} from "@mui/material";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import SpeedIcon from "@mui/icons-material/Speed";
import ConstructionIcon from "@mui/icons-material/Construction";
import OilBarrelIcon from "@mui/icons-material/OilBarrel";

import dynamic from "next/dynamic";
import { Skeleton } from "@mui/material";

// ./map statically imports useVehicleTracking → lib/firebase (~237 kB).
// Lazy-loading the card keeps the firebase SDK out of the vehicle route's
// First Load JS — it only downloads when this dialog tab actually renders.
const MapVehicleOverviewCard = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => (
    <Skeleton variant="rectangular" width="100%" height={300} sx={{ borderRadius: 2 }} />
  ),
});
import { useState } from "react";
import AssignDriverDialog from "../assignDriverDialog";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface OverviewTabProps {
  vehicle?: VehicleWithRelations | undefined;
  onUpdate?: (() => void) | undefined;
}

const OverviewTab = ({ vehicle, onUpdate }: OverviewTabProps) => {
  const theme = useTheme();
  const dict = useDictionary();
  /* --------------------------------- states --------------------------------- */
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  if (!vehicle) {
    return (
      <Typography color="text.secondary">
        {dict.common.noData || "No vehicle selected"}
      </Typography>
    );
  }

  /* -------------------------------- handlers -------------------------------- */
  const handleAssignSuccess = () => {
    if (onUpdate) {
      onUpdate();
    }
  };

  const cardStyle = {
    p: 2,
    display: "flex",
    flexDirection: "column",
    borderRadius: "8px",
    height: "100%",
    bgcolor: (theme: Theme) =>
      theme.palette.mode === "dark"
        ? "rgba(255,255,255,0.03)"
        : "rgba(0,0,0,0.02)",
    backgroundImage: "none",
    boxShadow: "none",
    border: (theme: Theme) => `1px solid ${theme.palette.divider}`,
  };

  return (
    <>
      <Stack spacing={4}>
        <Stack
          spacing={2}
          direction={{ xs: "column", md: "row" }}
          justifyContent={"space-between"}
          alignItems="stretch"
        >
          <Stack
            justifyContent={"space-between"}
            width={{ xs: "100%", md: "48%" }}
          >
            {vehicle.photo && (
              <Card
                sx={{
                  borderRadius: "12px",
                  overflow: "hidden",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(0,0,0,0.01)",
                  backgroundImage: "none",
                  boxShadow: "none",
                  border: `1px solid ${theme.palette.divider}`,
                  position: "relative",
                  mb: 3,
                }}
              >
                <Box
                  component="img"
                  src={vehicle.photo}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  sx={{
                    width: "100%",
                    height: 160,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: 1.5,
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: "white", fontWeight: 600, opacity: 0.8 }}
                  >
                    {dict.vehicles.dialogs.preview}
                  </Typography>
                </Box>
              </Card>
            )}

            <Grid container spacing={4}>
              {/* Fuel Level */}
              <Grid size={{ xs: 6, md: 6 }}>
                <Card sx={cardStyle}>
                  <Typography
                    sx={{
                      fontSize: 14,
                      color: "text.secondary",
                      fontWeight: 600,
                      mb: 1,
                    }}
                  >
                    {dict.vehicles.fields.fuelLevel}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                    <Typography
                      sx={{
                        fontSize: 22,
                        color: "text.primary",
                        fontWeight: 800,
                      }}
                    >
                      %{vehicle.fuelLevel}
                    </Typography>
                    {vehicle.fuelCapacity && vehicle.fuelCapacity > 0 && (
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", fontWeight: 600 }}
                      >
                        (
                        {Math.round(
                          ((vehicle.fuelLevel || 0) / 100) *
                            vehicle.fuelCapacity
                        )}
                        L / {vehicle.fuelCapacity}L)
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ mt: 1, mb: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={vehicle.fuelLevel ?? 0}
                      sx={{
                        width: "100%",
                        height: 6,
                        borderRadius: 3,
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.1)",
                      }}
                    />
                  </Box>
                  <LocalGasStationIcon
                    sx={{
                      fontSize: 20,
                      marginTop: "auto",
                      color: "text.secondary",
                      opacity: 0.5,
                    }}
                  />
                </Card>
              </Grid>

              {/* Odometer */}
              <Grid size={{ xs: 6, md: 6 }}>
                <Card sx={cardStyle}>
                  <Typography
                    sx={{
                      fontSize: 14,
                      color: "text.secondary",
                      fontWeight: 600,
                      mb: 1,
                    }}
                  >
                    {dict.vehicles.fields.odometer}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 22,
                      color: "text.primary",
                      fontWeight: 800,
                    }}
                  >
                    {vehicle.odometerKm?.toLocaleString("en-US")} km
                  </Typography>
                  <SpeedIcon
                    sx={{
                      fontSize: 20,
                      marginTop: "auto",
                      color: "text.secondary",
                      opacity: 0.5,
                    }}
                  />
                </Card>
              </Grid>

              {/* Service */}
              <Grid size={{ xs: 6, md: 6 }}>
                <Card sx={cardStyle}>
                  <Typography
                    sx={{
                      fontSize: 14,
                      color: "text.secondary",
                      fontWeight: 600,
                      mb: 1,
                    }}
                  >
                    {dict.vehicles.fields.service}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 22,
                      color: "text.primary",
                      fontWeight: 800,
                    }}
                  >
                    {vehicle?.nextServiceKm && vehicle?.odometerKm
                      ? (
                          vehicle.nextServiceKm - vehicle.odometerKm
                        ).toLocaleString("en-US")
                      : dict.common.na}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", fontWeight: 500 }}
                  >
                    {dict.vehicles.dialogs.kmLeft}
                  </Typography>
                  <ConstructionIcon
                    sx={{
                      fontSize: 20,
                      marginTop: "auto",
                      color: "text.secondary",
                      opacity: 0.5,
                    }}
                  />
                </Card>
              </Grid>

              {/* Avg Fuel Consumption */}
              <Grid size={{ xs: 6, md: 6 }}>
                <Card sx={cardStyle}>
                  <Typography
                    sx={{
                      fontSize: 14,
                      color: "text.secondary",
                      fontWeight: 600,
                      mb: 1,
                    }}
                  >
                    {dict.vehicles.fields.avgFuelConsumption}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 22,
                      color: "text.primary",
                      fontWeight: 800,
                    }}
                  >
                    {vehicle?.avgFuelConsumption?.toLocaleString("en-US")}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", fontWeight: 500 }}
                  >
                    L/100km
                  </Typography>
                  <OilBarrelIcon
                    sx={{
                      fontSize: 20,
                      marginTop: "auto",
                      color: "text.secondary",
                      opacity: 0.5,
                    }}
                  />
                </Card>
              </Grid>


            </Grid>

            <Button
              variant="contained"
              fullWidth
              sx={{
                mt: 3,
                borderRadius: "8px",
                py: 1.5,
                bgcolor: theme.palette.primary.main,
                textTransform: "none",
                fontWeight: 700,
                fontSize: 15,
                "&:hover": { bgcolor: theme.palette.primary._alpha.main_90 },
              }}
              onClick={() => setAssignDialogOpen(true)}
            >
              {vehicle.driver
                ? dict.drivers.dialogs.editTitle
                : dict.vehicles.dialogs.assignDriver}
            </Button>
          </Stack>

          <Stack
            width={{ xs: "100%", md: "50%" }}
            sx={{ minHeight: { xs: 320, md: 0 } }}
          >
            <MapVehicleOverviewCard
              id={vehicle.id}
              name={vehicle.plate}
              dbLocation={
                vehicle.currentLat && vehicle.currentLng
                  ? { lat: vehicle.currentLat, lng: vehicle.currentLng }
                  : null
              }
            />
          </Stack>
        </Stack>
      </Stack>

      <AssignDriverDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        vehicleId={vehicle.id}
        vehiclePlate={vehicle.plate}
        currentDriver={vehicle.driver}
        onSuccess={handleAssignSuccess}
      />
    </>
  );
};

export default OverviewTab;
