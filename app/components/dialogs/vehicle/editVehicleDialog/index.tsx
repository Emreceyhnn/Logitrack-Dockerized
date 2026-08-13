"use client";

import { Dialog, DialogContent, Box, Typography, IconButton, Stack, Divider, Stepper, Step, StepLabel, useTheme, Button, CircularProgress } from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import FirstStep from "../addVehicleDialog/firstStep";
import TechSpecsStep from "../addVehicleDialog/techSpecsStep";
import { VehicleWithRelations, VehicleFormValues } from "@/app/lib/type/vehicle";
import { Formik } from "formik";
import { useEditVehicle, StepSync } from "@/app/hooks/useEditVehicle";

export interface EditVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  vehicle: VehicleWithRelations;
}

interface ExtendedPalette {
  primary?: {
    _alpha?: Record<string, string>;
  };
  divider_alpha?: Record<string, string>;
  error?: {
    _alpha?: Record<string, string>;
  };
}

const EditVehicleDialog = ({ open, onClose, onSuccess, vehicle }: EditVehicleDialogProps) => {
  const dict = useDictionary();
  const theme = useTheme();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;
  const { initialValues, validationSchema, currentStep, setCurrentStep, error, setError, closeDialog, handleSubmit } = useEditVehicle(vehicle, open, onClose, onSuccess, dict);
  const steps = [dict.vehicles.dialogs.steps.general, dict.vehicles.dialogs.steps.specs];

  return (
    <Formik enableReinitialize initialValues={initialValues} validationSchema={validationSchema ?? undefined} onSubmit={handleSubmit}>
      {({ isSubmitting, submitForm, setFieldValue, validateForm }) => {
        const handleNext = async () => {
          const errors = await validateForm();
          const step1Keys = ["fleetNo", "plate", "type", "brand", "model", "year", "odometerKm", "nextServiceKm", "status"];
          const hasStep1Errors = step1Keys.some((key) => errors[key as keyof VehicleFormValues]);
          if (!hasStep1Errors) { setCurrentStep((prev) => prev + 1); setError(null); } else { setError(dict.validation.genericFormError || "Please fill required fields in General Info correctly."); }
        };

        return (
          <>
            <StepSync currentStep={currentStep} setCurrentStep={setCurrentStep} dict={dict} />
            <Dialog open={open} onClose={closeDialog} maxWidth="md" fullWidth PaperProps={{ sx: { overflow: "hidden" } }}>
              <Box sx={{ p: 3, pb: 0 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography component="div" variant="h6" fontWeight={800} color="text.primary">{dict.vehicles.dialogs.editTitle}: {vehicle?.plate}</Typography>
                  </Stack>
                  <IconButton onClick={closeDialog} size="small" sx={{ color: "text.secondary" }} aria-label="close"><CloseIcon fontSize="small" /></IconButton>
                </Stack>
                {error && (
                  <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: paletteTheme.error?._alpha?.main_10, border: `1px solid ${paletteTheme.error?._alpha?.main_20}` }}>
                    <Typography variant="caption" color="error.light">{error}</Typography>
                  </Box>
                )}
              </Box>

              <DialogContent sx={{ p: 3 }}>
                <Box sx={{ mb: 4, px: 2 }}>
                  <Stepper activeStep={currentStep - 1} sx={{ "& .MuiStepConnector-line": { borderColor: paletteTheme.divider_alpha?.main_10 } }}>
                    {steps.map((label, index) => (
                      <Step key={label}>
                        <StepLabel StepIconProps={{ sx: { "&.Mui-active": { color: theme.palette.primary.main }, "&.Mui-completed": { color: theme.palette.primary.main } } }}>
                          <Typography variant="caption" fontWeight={600} color={currentStep - 1 >= index ? "text.primary" : "text.secondary"}>{label}</Typography>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </Box>
                <Divider sx={{ mb: 4, borderColor: paletteTheme.divider_alpha?.main_05 }} />

                <Box sx={{ minHeight: 400 }}>
                  {currentStep === 1 && <FirstStep onFileSelect={(file) => setFieldValue("photo", file)} />}
                  {currentStep === 2 && <TechSpecsStep />}
                </Box>

                <Box sx={{ mt: 4, pt: 3, borderTop: `1px solid ${paletteTheme.divider_alpha?.main_05}` }}>
                  <Stack direction="row" spacing={2} justifyContent="flex-end">
                    <Button variant="text" onClick={closeDialog} sx={{ color: "text.secondary", textTransform: "none" }}>{dict.common.cancel}</Button>
                    {currentStep > 1 && (
                      <Button variant="outlined" onClick={() => { setCurrentStep((prev) => prev - 1); setError(null); }} startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}>{dict.common.back}</Button>
                    )}
                    <Button variant="contained" onClick={currentStep === 2 ? submitForm : handleNext} disabled={isSubmitting} startIcon={currentStep === 2 && !isSubmitting ? <SaveIcon sx={{ fontSize: 18 }} /> : isSubmitting ? <CircularProgress size={16} color="inherit" /> : null} sx={{ textTransform: "none", px: currentStep === 2 ? 3 : 4, borderRadius: 2, boxShadow: "none", bgcolor: theme.palette.primary.main, "&:hover": { bgcolor: paletteTheme.primary?._alpha?.main_90, boxShadow: "none" } }}>
                      {isSubmitting ? dict.toasts.saving : currentStep === 2 ? dict.common.save : dict.common.next + " →"}
                    </Button>
                  </Stack>
                </Box>
              </DialogContent>
            </Dialog>
          </>
        );
      }}
    </Formik>
  );
};

export default EditVehicleDialog;
