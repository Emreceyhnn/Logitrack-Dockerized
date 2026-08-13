"use client";

import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
  useTheme,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouteMutations } from "@/app/hooks/useRoutes";
import { useUser } from "@/app/hooks/useUser";
import FirstRouteDialogStep from "./addRouteDialog/firstStep";
import SecondRouteDialogStep from "./addRouteDialog/secondStep";
import ThirdRouteDialogStep from "./addRouteDialog/thirdStep";
import { RouteWithRelations, RouteFormValues } from "@/app/lib/type/routes";

import { Formik, Form } from "formik";
import { editRouteValidationSchema } from "@/app/lib/validationSchema";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { toUTC, utcToUserTz } from "@/app/lib/utils/date";
import { logger } from "@/app/lib/logger";


interface EditRouteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  route: RouteWithRelations | null;
}

const EditRouteDialog = ({
  open,
  onClose,
  onSuccess,
  route,
}: EditRouteDialogProps) => {
  const theme = useTheme();
  const { user } = useUser();
  const dict = useDictionary();
  const { updateRoute } = useRouteMutations();

  /* --------------------------------- states --------------------------------- */
  const [currentStep, setCurrentStep] = useState(1);

  /* -------------------------------- handlers --------------------------------- */
  const getInitialValues = (): RouteFormValues => {
    const userTz = user?.timezone || "UTC";
    if (!route) {
      return {
        name: "",
        startTime: null,
        endTime: null,
        startType: "WAREHOUSE",
        startId: "",
        startAddress: "",
        startLat: 0,
        startLng: 0,
        endType: "CUSTOMER",
        endId: "",
        endAddress: "",
        distanceKm: 0,
        durationMin: 0,
        driverId: "",
        vehicleId: "",
        stops: [],
        shape: "",
        bufferMeters: undefined,
      };
    }

    // Convert UTC dates from DB to the user's local timezone for the picker
    const startInUserTz = utcToUserTz(route.startTime, userTz);
    const endInUserTz = utcToUserTz(route.endTime, userTz);

    // Derive start/end from stops array
    type RouteStop = { address: string; lat?: number; lng?: number };
    const routeStops = Array.isArray(route.stops) ? route.stops as RouteStop[] : [];
    const firstStop = routeStops.length > 0 ? routeStops[0] : null;
    const lastStop = routeStops.length > 1 ? routeStops[routeStops.length - 1] : null;

    const filteredStops = routeStops.filter((stop: RouteStop, index) => {
      // Keep true first and true last
      if (index === 0) return true;
      if (index === routeStops.length - 1 && routeStops.length > 1) return true;

      // Filter middle duplicates
      if (firstStop && stop.address === firstStop.address) return false;
      if (lastStop && stop.address === lastStop.address) return false;

      return true;
    });

    return {
      name: route.name || "",
      startTime: startInUserTz ? startInUserTz.toDate() : null,
      endTime: endInUserTz ? endInUserTz.toDate() : null,
      startType: "WAREHOUSE",
      startId: "",
      startAddress: firstStop?.address || "",
      startLat: firstStop?.lat || 0,
      startLng: firstStop?.lng || 0,
      endType: "CUSTOMER",
      endId: "",
      endAddress: lastStop?.address || "",
      endLat: lastStop?.lat || 0,
      endLng: lastStop?.lng || 0,
      distanceKm: route.distanceKm || 0,
      durationMin: route.durationMin || 0,
      driverId: route.driverId || "",
      vehicleId: route.vehicleId || "",
      stops: filteredStops as { address: string; lat?: number; lng?: number }[],
      shape: route.shape || "",
      bufferMeters: route.bufferMeters ?? undefined,
    };
  };

  const onSubmit = async (values: RouteFormValues) => {
    if (!user || !route) return;

    const userTz = user.timezone || "UTC";
    const startUTC = values.startTime
      ? toUTC(values.startTime, userTz)
      : undefined;
    const endUTC = values.endTime ? toUTC(values.endTime, userTz) : undefined;

    // Close first, then submit: useRouteMutations() already toasts success/error
    // and applies the optimistic cache update, so there is nothing on screen
    // that needs the dialog to stay open for the round-trip.
    closeDialog();

    try {
      await updateRoute.mutateAsync({
        id: route.id,
        data: {
          name: values.name,
          startTime: startUTC,
          endTime: endUTC,
          distanceKm: values.distanceKm,
          durationMin: values.durationMin,
          stops: values.stops,
          driverId: values.driverId || null,
          vehicleId: values.vehicleId || null,
          shape: values.shape || null,
          // null clears the override, restoring the default corridor.
          bufferMeters: values.bufferMeters ?? null,
        },
      });

      onSuccess?.();
    } catch (error) {
      logger.error(error);
    }
  };

  const closeDialog = () => {
    onClose();
    setCurrentStep(1);
  };

  const steps = [
    dict.routes.dialogs.steps.schedule,
    dict.routes.dialogs.steps.locations,
    dict.routes.dialogs.steps.assignments,
  ];

  const validationSchema = useMemo(
    () => editRouteValidationSchema(dict),
    [dict]
  );
  if (!route) return null;

  return (
    <>
      <Formik
        initialValues={getInitialValues()}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
        enableReinitialize
      >
        {({ handleSubmit, validateForm, setFieldTouched }) => {
          const handleNextStep = async () => {
            let fieldsToValidate: string[] = [];
            if (currentStep === 1) {
              fieldsToValidate = ["name", "startTime", "endTime"];
            } else if (currentStep === 2) {
              fieldsToValidate = ["startAddress", "endAddress"];
            }

            fieldsToValidate.forEach((f) => setFieldTouched(f, true));
            const result = await validateForm();
            const hasErrors = fieldsToValidate.some(
              (f) => result[f as keyof typeof result]
            );

            if (!hasErrors) {
              setCurrentStep((prev) => prev + 1);
            } else {
              toast.error(dict.validation.genericFormError);
            }
          };

          return (
            <Dialog
              open={open}
              onClose={closeDialog}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  backgroundImage: "none",
                  borderRadius: 4,
                  border: `1px solid ${theme.palette.divider_alpha.main_10}`,
                  overflow: "hidden",
                  height: "85vh",
                  maxHeight: "90vh",
                  display: "flex",
                  flexDirection: "column",
                },
              }}
            >
              <Box sx={{ p: 3, pb: 0 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Stack spacing={0.5}>
                    <Typography component="div" variant="h6" fontWeight={600} color="white">
                      {dict.routes.dialogs.editTitle}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dict.routes.dialogs.editSubtitle}
                    </Typography>
                  </Stack>
                  <IconButton
                    onClick={closeDialog}
                    size="small"
                    sx={{ color: "text.secondary" }}
                   aria-label="close">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
              <DialogContent sx={{ flex: "1 1 auto", overflowY: currentStep === 2 ? "hidden" : "auto", p: 3, pt: 0, display: "flex", flexDirection: "column" }}>
                <Box sx={{ mb: 4, px: 2 }}>
                  <Stepper
                    activeStep={currentStep - 1}
                    sx={{
                      "& .MuiStepConnector-line": {
                        borderColor: theme.palette.divider_alpha.main_10,
                      },
                    }}
                  >
                    {steps.map((label, index) => (
                      <Step key={label}>
                        <StepLabel
                          StepIconProps={{
                            sx: {
                              "&.Mui-active": {
                                color: theme.palette.primary.main,
                              },
                              "&.Mui-completed": {
                                color: theme.palette.primary.main,
                              },
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={600}
                            color={
                              currentStep - 1 >= index
                                ? "text.primary"
                                : "text.secondary"
                            }
                          >
                            {label}
                          </Typography>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </Box>
                <Divider
                  sx={{
                    mb: 4,
                    borderColor: theme.palette.divider_alpha.main_05,
                  }}
                />

                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <Form style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                    {currentStep === 1 && <FirstRouteDialogStep />}
                    {currentStep === 2 && <SecondRouteDialogStep />}
                    {currentStep === 3 && <ThirdRouteDialogStep />}
                  </Form>
                </Box>
              </DialogContent>
              <DialogActions
                sx={{ p: 3, pt: 0, justifyContent: "space-between" }}
              >
                <Button
                  onClick={
                    currentStep === 1
                      ? closeDialog
                      : () => setCurrentStep((prev) => prev - 1)
                  }
                  sx={{
                    color: "text.secondary",
                    "&:hover": { bgcolor: theme.palette.divider_alpha.main_05 },
                  }}
                >
                  {currentStep === 1 ? dict.common.cancel : dict.common.back}
                </Button>
                <Button
                  variant="contained"
                  onClick={
                    currentStep === steps.length
                      ? () => handleSubmit()
                      : handleNextStep
                  }
                  sx={{
                    borderRadius: 2,
                    px: 4,
                    fontWeight: 600,
                    boxShadow: `0 8px 16px ${theme.palette.primary._alpha.main_20}`,
                  }}
                >
                  {currentStep === steps.length
                    ? dict.common.save
                    : dict.common.next}
                </Button>
              </DialogActions>
            </Dialog>
          );
        }}
      </Formik>
    </>
  );
};

export default EditRouteDialog;
