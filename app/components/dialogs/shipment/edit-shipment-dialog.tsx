"use client";

import { Box, Dialog, DialogContent, DialogActions, Divider, IconButton, Grid, Stack, Typography, useTheme, Button, Stepper, Step, StepLabel } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Formik, Form, useFormikContext } from "formik";
import BasicInfoSection from "./addShipmentDialog/sections/BasicInfoSection";
import LogisticsSection from "./addShipmentDialog/sections/LogisticsSection";
import CargoSection from "./addShipmentDialog/sections/CargoSection";
import InventorySection from "./addShipmentDialog/sections/InventorySection";
import StopsSection from "./addShipmentDialog/sections/StopsSection";

import { useEditShipment } from "@/app/hooks/useEditShipment";
import { ShipmentWithRelations, ShipmentFormValues } from "@/app/lib/type/shipment";

const FormikInventorySync = ({ onWarehouseChange }: { onWarehouseChange: (id: string) => void }) => {
  const { values } = useFormikContext<ShipmentFormValues>();
  const lastFetchedId = useRef<string | null>(null);

  useEffect(() => {
    if (values.originWarehouseId === lastFetchedId.current) return;
    lastFetchedId.current = values.originWarehouseId;
    onWarehouseChange(values.originWarehouseId);
  }, [values.originWarehouseId, onWarehouseChange]);

  return null;
};

interface EditShipmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  shipment: ShipmentWithRelations | null;
}

interface ExtendedPalette {
  primary?: {
    _alpha?: Record<string, string>;
  };
  divider_alpha?: Record<string, string>;
  warning?: {
    _alpha?: Record<string, string>;
  };
}

const EditShipmentDialog = ({ open, onClose, onSuccess, shipment }: EditShipmentDialogProps) => {
  const theme = useTheme();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;
  const {
    dict, validationSchema, currentStep, setCurrentStep, isLoadingInventory, availableInventory,
    warehouses, customers, trailers, handleFetchInventory, getInitialValues, onSubmit, closeDialog, steps
  } = useEditShipment(open, onClose, onSuccess, shipment);

  if (!shipment) return null;

  return (
    <Formik
      initialValues={getInitialValues()}
      validationSchema={validationSchema}
      validate={(values) => {
        const errors: Partial<Record<keyof ShipmentFormValues, string>> = {};
        const selectedTrailer = trailers.find((t) => t.id === values.trailerId);
        if (selectedTrailer) {
          const tolerance = 0.01;
          const isSameTrailer = selectedTrailer.id === shipment.trailerId;
          const otherLoadWeight = isSameTrailer ? (selectedTrailer.currentWeightKg || 0) - (shipment.weightKg || 0) : selectedTrailer.currentWeightKg || 0;
          const otherLoadVolume = isSameTrailer ? (selectedTrailer.currentVolumeM3 || 0) - (shipment.volumeM3 || 0) : selectedTrailer.currentVolumeM3 || 0;
          const availableWeight = selectedTrailer.maxLoadKg - otherLoadWeight;
          const availableVolume = selectedTrailer.capacityVolumeM3 - otherLoadVolume;
          if (selectedTrailer.maxLoadKg > 0 && Math.round(values.weightKg * 100) / 100 > availableWeight + tolerance) {
            errors.weightKg = dict.shipments.dialogs.fields.exceedsTrailerWeight;
          }
          if (selectedTrailer.capacityVolumeM3 > 0 && Math.round(values.volumeM3 * 100) / 100 > availableVolume + tolerance) {
            errors.volumeM3 = dict.shipments.dialogs.fields.exceedsTrailerVolume;
          }
        }
        return errors;
      }}
      onSubmit={onSubmit}
      enableReinitialize
    >
      {({ handleSubmit, validateForm, setFieldTouched }) => {
        const handleNextStep = async () => {
          const step1Fields = ["referenceNumber", "priority", "type", "slaDeadline", "originWarehouseId", "destination", "customerId", "customerLocationId", "contactEmail"];
          step1Fields.forEach((field) => setFieldTouched(field, true));
          const result = await validateForm();
          const hasErrors = step1Fields.some((field) => result[field as keyof typeof result]);
          if (!hasErrors) { setCurrentStep(2); } else { toast.error(dict.validation.genericFormError); }
        };

        return (
          <>
            <FormikInventorySync onWarehouseChange={handleFetchInventory} />
            <Dialog open={open} onClose={closeDialog} maxWidth="lg" fullWidth PaperProps={{ sx: { overflow: "hidden" } }}>
              <Box sx={{ p: 3, pb: 0 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: paletteTheme.warning?._alpha?.main_10, color: theme.palette.warning.main }}>
                      <EditIcon />
                    </Box>
                    <Stack spacing={0.5}>
                      <Typography component="div" variant="h6" fontWeight={800} color="text.primary">{dict.shipments.dialogs.editTitle}</Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>{dict.shipments.dialogs.editSubtitle} {shipment.trackingId}</Typography>
                    </Stack>
                  </Stack>
                  <IconButton onClick={closeDialog} sx={{ color: "text.secondary" }} aria-label="close"><CloseIcon /></IconButton>
                </Stack>

                <Stepper activeStep={currentStep - 1} sx={{ "& .MuiStepLabel-label": { color: "text.secondary", fontWeight: 600 }, "& .MuiStepLabel-label.Mui-active": { color: theme.palette.primary.main, fontWeight: 700 }, "& .MuiStepLabel-label.Mui-completed": { color: "text.primary", fontWeight: 700 }, "& .MuiStepIcon-root": { color: theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }, "& .MuiStepIcon-root.Mui-active": { color: theme.palette.primary.main }, "& .MuiStepIcon-root.Mui-completed": { color: theme.palette.primary.main } }}>
                  {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
                </Stepper>
              </Box>

              <DialogContent sx={{ mt: 2, pb: 4, minHeight: 400 }}>
                <Form>
                  {currentStep === 1 ? (
                    <Stack spacing={6}>
                      <BasicInfoSection />
                      <Divider sx={{ borderColor: paletteTheme.divider_alpha?.main_05 }} />
                      <StopsSection customers={customers} />
                      <Divider sx={{ borderColor: paletteTheme.divider_alpha?.main_05 }} />
                      <LogisticsSection warehouses={warehouses} trailers={trailers} />
                    </Stack>
                  ) : (
                    <Stack spacing={6}>
                      <Grid container spacing={6}>
                        <Grid size={{ xs: 12, lg: 12 }}>
                           <CargoSection trailers={trailers} />
                        </Grid>
                      </Grid>
                      <Divider sx={{ borderColor: paletteTheme.divider_alpha?.main_05 }} />
                      <InventorySection availableInventory={availableInventory} isLoadingInventory={isLoadingInventory} />
                    </Stack>
                  )}
                </Form>
              </DialogContent>

              <DialogActions sx={{ p: 3, pt: 1, borderTop: `1px solid ${paletteTheme.divider_alpha?.main_05}`, justifyContent: "space-between" }}>
                <Button onClick={currentStep === 1 ? closeDialog : () => setCurrentStep(1)} sx={{ color: "text.secondary", textTransform: "none" }}>{currentStep === 1 ? dict.common.cancel : dict.common.back}</Button>
                <Button variant="contained" onClick={currentStep === 1 ? handleNextStep : () => handleSubmit()} sx={{ minWidth: 140, borderRadius: 2, textTransform: "none", fontWeight: 600, boxShadow: `0 8px 16px ${paletteTheme.primary?._alpha?.main_20}` }}>{currentStep === 1 ? dict.common.next : dict.common.save}</Button>
              </DialogActions>
            </Dialog>
          </>
        );
      }}
    </Formik>
  );
};

export default EditShipmentDialog;
