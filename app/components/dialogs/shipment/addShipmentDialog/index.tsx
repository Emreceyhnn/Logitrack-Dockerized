"use client";

import { Box, Dialog, DialogContent, DialogActions, Divider, IconButton, Grid, Stack, Typography, useTheme, Button, Stepper, Step, StepLabel } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect } from "react";
import { AddShipmentDialogProps } from "@/app/lib/type/add-shipment";
import { toast } from "sonner";
import { Formik, Form, useFormikContext } from "formik";
import { ShipmentFormValues } from "@/app/lib/type/shipment";
import { formatMessage } from "@/app/lib/language/language";
import BasicInfoSection from "./sections/BasicInfoSection";
import LogisticsSection from "./sections/LogisticsSection";
import CargoSection from "./sections/CargoSection";
import InventorySection from "./sections/InventorySection";
import StopsSection from "./sections/StopsSection";
import DialogErrorBoundary from "@/app/components/ui/DialogErrorBoundary";
import { useAddShipment, initialValues } from "@/app/hooks/useAddShipment";

const FormikInventorySync = ({ onWarehouseChange }: { onWarehouseChange: (id: string) => void }) => {
  const { values } = useFormikContext<ShipmentFormValues>();
  useEffect(() => { onWarehouseChange(values.originWarehouseId); }, [values.originWarehouseId, onWarehouseChange]);
  return null;
};

interface ExtendedPalette {
  primary?: {
    _alpha?: Record<string, string>;
  };
  divider_alpha?: Record<string, string>;
}

const AddShipmentDialog = ({ open, onClose, onSuccess }: AddShipmentDialogProps) => {
  const theme = useTheme();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;
  const {
    dict, validationSchema, currentStep, setCurrentStep, isLoadingInventory, availableInventory,
    warehouses, customers, trailers, drivers, handleFetchInventory, onSubmit, closeDialog, steps
  } = useAddShipment(open, onClose, onSuccess);

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      validate={(values) => {
        const errors: Partial<Record<keyof ShipmentFormValues, string>> = {};
        const selectedTrailer = trailers.find((t) => t.id === values.trailerId);
        if (selectedTrailer) {
          const tolerance = 0.01;
          const availableWeight = selectedTrailer.maxLoadKg - (selectedTrailer.currentWeightKg || 0);
          const availableVolume = selectedTrailer.capacityVolumeM3 - (selectedTrailer.currentVolumeM3 || 0);
          if (selectedTrailer.maxLoadKg > 0 && Math.round(values.weightKg * 100) / 100 > availableWeight + tolerance) { errors.weightKg = dict.shipments.dialogs.fields.exceedsTrailerWeight; }
          if (selectedTrailer.capacityVolumeM3 > 0 && Math.round(values.volumeM3 * 100) / 100 > availableVolume + tolerance) { errors.volumeM3 = dict.shipments.dialogs.fields.exceedsTrailerVolume; }
        }
        return errors;
      }}
      onSubmit={onSubmit}
      enableReinitialize
    >
      {({ handleSubmit, validateForm, setFieldTouched, isSubmitting }) => {
        // Ordered top-to-bottom as the fields appear in step 1, each mapped to a
        // [data-field] anchor and a human label — so we can name the first bad
        // field and scroll straight to it instead of a blind "check the form".
        const fieldLabels = dict.shipments?.fields;
        const step1Fields: { field: keyof ShipmentFormValues; label: string }[] = [
          { field: "priority", label: fieldLabels?.priority || "Priority" },
          { field: "type", label: fieldLabels?.shipmentType || "Shipment Type" },
          { field: "slaDeadline", label: fieldLabels?.slaDeadline || "SLA Deadline" },
          { field: "destination", label: fieldLabels?.destination || "Destination" },
          { field: "originWarehouseId", label: fieldLabels?.originWarehouse || "Origin Warehouse" },
        ];

        const handleNextStep = async () => {
          step1Fields.forEach(({ field }) => setFieldTouched(field, true));
          const result = await validateForm();
          const firstBad = step1Fields.find(({ field }) => result[field]);
          if (!firstBad) {
            setCurrentStep(2);
            return;
          }
          // Scroll the first offending field into view and focus it, then name
          // it in the toast so the fix is unambiguous.
          const anchor = document.querySelector(
            `[data-field="${firstBad.field}"]`
          );
          if (anchor) {
            anchor.scrollIntoView({ behavior: "smooth", block: "center" });
            const focusable = anchor.querySelector<HTMLElement>(
              "input, textarea, [tabindex], button"
            );
            focusable?.focus({ preventScroll: true });
          }
          toast.error(
            formatMessage(dict.validation.firstErrorField, {
              field: firstBad.label,
            })
          );
        };

        return (
          <>
            <FormikInventorySync onWarehouseChange={handleFetchInventory} />
            <Dialog open={open} onClose={closeDialog} maxWidth="lg" fullWidth PaperProps={{ sx: { overflow: "hidden" } }}>
              <Box sx={{ p: 3, pb: 0 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Stack spacing={0.5}>
                    <Typography component="div" variant="h6" fontWeight={800} color="text.primary">{currentStep === 1 ? dict.shipments.dialogs.addTitle : dict.shipments.dialogs.cargoTitle}</Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>{dict.shipments.dialogs.addSubtitle}</Typography>
                  </Stack>
                  <IconButton onClick={closeDialog} sx={{ color: "text.secondary" }} aria-label="close"><CloseIcon /></IconButton>
                </Stack>
                <Stepper activeStep={currentStep - 1} sx={{ "& .MuiStepLabel-label": { color: "text.secondary", fontWeight: 600 }, "& .MuiStepLabel-label.Mui-active": { color: "primary.main", fontWeight: 700 }, "& .MuiStepLabel-label.Mui-completed": { color: "text.primary", fontWeight: 700 }, "& .MuiStepIcon-root": { color: theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }, "& .MuiStepIcon-root.Mui-active": { color: "primary.main" }, "& .MuiStepIcon-root.Mui-completed": { color: "primary.main" } }}>
                  {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
                </Stepper>
              </Box>

              <DialogContent sx={{ mt: 2, pb: 4, height: "75vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <Form style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <DialogErrorBoundary>
                    {currentStep === 1 ? (
                      <Stack spacing={3} sx={{ flex: 1, minHeight: 0, overflowY: "auto", pr: 1 }}>
                        <Box sx={{ flexShrink: 0 }}><BasicInfoSection /></Box>
                        <Divider sx={{ borderColor: paletteTheme.divider_alpha?.main_05, flexShrink: 0 }} />
                        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}><StopsSection customers={customers} /></Box>
                        <Divider sx={{ borderColor: paletteTheme.divider_alpha?.main_05, flexShrink: 0 }} />
                        <Box sx={{ flexShrink: 0 }}><LogisticsSection warehouses={warehouses} trailers={trailers} drivers={drivers} /></Box>
                      </Stack>
                    ) : (
                      <Stack spacing={6} sx={{ flex: 1, overflowY: "auto", pr: 1, minHeight: 0 }}>
                        <Grid container spacing={6}><Grid size={{ xs: 12, lg: 12 }}><CargoSection trailers={trailers} /></Grid></Grid>
                        <Divider sx={{ borderColor: paletteTheme.divider_alpha?.main_05 }} />
                        <InventorySection availableInventory={availableInventory} isLoadingInventory={isLoadingInventory} />
                      </Stack>
                    )}
                  </DialogErrorBoundary>
                </Form>
              </DialogContent>

              <DialogActions sx={{ p: 3, pt: 1, borderTop: `1px solid ${paletteTheme.divider_alpha?.main_05}`, justifyContent: "space-between" }}>
                <Button onClick={currentStep === 1 ? closeDialog : () => setCurrentStep(1)} sx={{ color: "text.secondary", textTransform: "none", fontWeight: 600, px: 2, "&:hover": { color: "text.primary", bgcolor: theme.palette.action.hover } }}>{currentStep === 1 ? dict.common.cancel : dict.common.back}</Button>
                <Stack direction="row" spacing={2}>
                  <Button disabled={isSubmitting} variant="contained" onClick={currentStep === 1 ? handleNextStep : () => handleSubmit()} sx={{ minWidth: 140, borderRadius: 2, textTransform: "none", fontWeight: 700, letterSpacing: "0.5px", boxShadow: `0 8px 24px ${paletteTheme.primary?._alpha?.main_20}`, "&:hover": { boxShadow: `0 12px 32px ${paletteTheme.primary?._alpha?.main_40}`, transform: "translateY(-1px)" }, "&:active": { transform: "translateY(0)" } }}>{currentStep === 1 ? dict.common.next : dict.common.save}</Button>
                </Stack>
              </DialogActions>
            </Dialog>
          </>
        );
      }}
    </Formik>
  );
};

export default AddShipmentDialog;
