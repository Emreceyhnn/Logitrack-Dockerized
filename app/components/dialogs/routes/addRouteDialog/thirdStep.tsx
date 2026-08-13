"use client";

import {
  
  Box,
  Grid,
  Stack,
  Typography,
  useTheme,
  MenuItem,
  Avatar,
  Card,
  CircularProgress,
} from "@mui/material";
import { useFormikContext } from "formik";
import { RouteFormValues } from "@/app/lib/type/routes";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import BuildIcon from "@mui/icons-material/Build";
import GppGoodIcon from "@mui/icons-material/GppGood";
import { DriverWithRelations } from "@/app/lib/type/driver";
import { VehicleWithRelations } from "@/app/lib/type/vehicle";
import { useEffect, useState } from "react";
import { getDrivers } from "@/app/lib/controllers/driver";
import { getVehicles } from "@/app/lib/controllers/vehicle";
import { VehicleStatus } from "@/app/lib/type/enums";

import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { logger } from "@/app/lib/logger";


const ThirdRouteDialogStep = () => {
  /* -------------------------------- variables ------------------------------- */
  const theme = useTheme();
  const dict = useDictionary();
  const { values, setFieldValue, handleBlur, touched, errors } = useFormikContext<RouteFormValues>();

  /* --------------------------------- states --------------------------------- */
  const [drivers, setDrivers] = useState<DriverWithRelations[]>([]);
  const [vehicles, setVehicles] = useState<VehicleWithRelations[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  /* ------------------------------- lifecycle ------------------------------- */
  useEffect(() => {
    const fetchData = async () => {
      setLoadingItems(true);
      try {
        const [driversRes, vehiclesRes] = await Promise.all([
          getDrivers(1, 100),
          getVehicles({ status: [VehicleStatus.AVAILABLE] }),
        ]);
        setDrivers(driversRes.data);
        setVehicles(vehiclesRes);
      } catch (error) {
        logger.error("Failed to fetch assignments data", error);
      } finally {
        setLoadingItems(false);
      }
    };
    fetchData();
  }, []);

  const selectedDriver = drivers.find((d) => d.id === values.driverId);
  const selectedVehicle = vehicles.find((v) => v.id === values.vehicleId);

  const filteredDrivers = drivers.filter(d => {
    if (selectedVehicle?.driver?.id) {
      return d.id === selectedVehicle.driver.id;
    }
    if (selectedVehicle && !selectedVehicle.driver) {
      return !d.currentVehicle?.id || d.id === values.driverId;
    }
    return true;
  });

  const filteredVehicles = vehicles.filter(v => {
    if (selectedDriver?.currentVehicle?.id) {
      return v.id === selectedDriver.currentVehicle.id;
    }
    if (selectedDriver && !selectedDriver.currentVehicle) {
      return !v.driver?.id || v.id === values.vehicleId;
    }
    return true;
  });

  const handleDriverChange = (driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    setFieldValue("driverId", driverId);
    
    // Auto-fill vehicle if the driver has one assigned and current vehicle is empty
    if (driver?.currentVehicle?.id && !values.vehicleId) {
      setFieldValue("vehicleId", driver.currentVehicle.id);
    }
  };

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    setFieldValue("vehicleId", vehicleId);
    
    // Auto-fill driver if the vehicle has one assigned and current driver is empty
    if (vehicle?.driver?.id && !values.driverId) {
      setFieldValue("driverId", vehicle.driver.id);
    }
  };

  return (
    <Box>
      <Stack spacing={4}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: theme.palette.primary._alpha.main_10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AssignmentIndIcon color="primary" />
          </Box>
          <Stack spacing={0.5}>
            <Typography variant="subtitle1" fontWeight={700} color="white">
              {dict.routes.dialogs.assignmentsTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {dict.routes.dialogs.assignmentsDesc}
            </Typography>
          </Stack>
        </Stack>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5}>
              <Typography
                variant="body2"
                fontWeight={600}
                color="text.secondary"
              >
                {dict.routes.dialogs.driverAssignment}
              </Typography>
              <CustomTextArea
                name="driverId"
                select
                value={values.driverId}
                onBlur={handleBlur}
                onChange={(e) => handleDriverChange(e.target.value)}
                error={touched.driverId && Boolean(errors.driverId)}
                helperText={touched.driverId ? (errors.driverId as string) : undefined}
                sx={{
                  "& .MuiSelect-select": {
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  },
                }}
              >
                {loadingItems ? (
                  <MenuItem disabled>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    {dict.routes.dialogs.loadingDrivers}
                  </MenuItem>
                ) : (
                  [
                    <MenuItem key="none" value="">{dict.routes.dialogs.unassigned}</MenuItem>,
                    ...filteredDrivers.map((driver) => (
                      <MenuItem key={driver.id} value={driver.id}>
                        <Avatar
                          src={driver.user.avatarUrl || undefined}
                          sx={{ width: 24, height: 24 }}
                        />
                        <Typography variant="body2">
                          {driver.user.name} {driver.user.surname}
                        </Typography>
                      </MenuItem>
                    ))
                  ]
                )}
              </CustomTextArea>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5}>
              <Typography
                variant="body2"
                fontWeight={600}
                color="text.secondary"
              >
                {dict.routes.dialogs.vehicleAssignment}
              </Typography>
              <CustomTextArea
                name="vehicleId"
                select
                value={values.vehicleId}
                onBlur={handleBlur}
                onChange={(e) => handleVehicleChange(e.target.value)}
                error={touched.vehicleId && Boolean(errors.vehicleId)}
                helperText={touched.vehicleId ? (errors.vehicleId as string) : undefined}
                sx={{
                  "& .MuiSelect-select": {
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  },
                }}
              >
                {loadingItems ? (
                  <MenuItem disabled>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    {dict.routes.dialogs.loadingVehicles}
                  </MenuItem>
                ) : (
                   [
                    <MenuItem key="none" value="">{dict.routes.dialogs.unassigned}</MenuItem>,
                    ...filteredVehicles.map((vehicle) => (
                      <MenuItem key={vehicle.id} value={vehicle.id}>
                        <LocalShippingIcon
                          sx={{ fontSize: 18, color: "text.secondary" }}
                        />
                        <Typography variant="body2">
                          {vehicle.plate} ({vehicle.brand} {vehicle.model})
                        </Typography>
                      </MenuItem>
                    ))
                   ]
                )}
              </CustomTextArea>
            </Stack>
          </Grid>
        </Grid>

        <Card
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: theme.palette.text.darkBlue._alpha.main_50,
            border: `1px solid ${theme.palette.divider_alpha.main_10}`,
            backgroundImage: "none",
          }}
        >
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontWeight: 700, mb: 2, display: "block" }}
          >
            {dict.routes.dialogs.assignmentSummary}
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EventAvailableIcon fontSize="small" color="primary" />
                  <Typography variant="caption" fontWeight={600} color="white">
                    {dict.routes.dialogs.driverAssignment}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {selectedDriver
                    ? selectedDriver.user.name + " " + selectedDriver.user.surname
                    : dict.routes.dialogs.noDriverSelected}
                </Typography>
                {selectedDriver && (
                  <Typography
                    variant="caption"
                    color="success.main"
                    fontWeight={600}
                  >
                    {dict.routes.dialogs.statusOnDuty}
                  </Typography>
                )}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <BuildIcon fontSize="small" color="primary" />
                  <Typography variant="caption" fontWeight={600} color="white">
                    {dict.routes.dialogs.vehicleMaintenance}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {selectedVehicle
                    ? `${dict.routes.dialogs.nextService}: ${dict.routes.dialogs.in} ${selectedVehicle.nextServiceKm || 0} km`
                    : dict.routes.dialogs.noVehicleSelected}
                </Typography>
                {selectedVehicle && (
                  <Typography
                    variant="caption"
                    color="success.main"
                    fontWeight={600}
                  >
                    {dict.routes.dialogs.healthGood}
                  </Typography>
                )}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <GppGoodIcon fontSize="small" color="primary" />
                  <Typography variant="caption" fontWeight={600} color="white">
                    {dict.routes.dialogs.compliance}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {dict.routes.dialogs.hazmatCertified}
                </Typography>
                <Typography
                  variant="caption"
                  color="success.main"
                  fontWeight={600}
                >
                  {dict.routes.dialogs.statusAllClear}
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Card>
      </Stack>
    </Box>
  );
};

export default ThirdRouteDialogStep;
