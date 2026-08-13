"use client";

import { Box, Dialog, DialogContent, DialogActions, Divider, IconButton, Stack, Step, StepLabel, Stepper, Typography, useTheme, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { AddRouteDialogProps } from "@/app/lib/type/add-route";
import { toast } from "sonner";
import { Formik, Form } from "formik";
import FirstRouteDialogStep from "./firstStep";
import SecondRouteDialogStep from "./secondStep";
import ThirdRouteDialogStep from "./thirdStep";
import { useAddRoute, initialValues } from "@/app/hooks/useAddRoute";

interface ExtendedPalette {
  primary?: {
    _alpha?: Record<string, string>;
  };
  divider_alpha?: Record<string, string>;
}

const AddRouteDialog = ({ open, onClose, onSuccess }: AddRouteDialogProps) => {
  const theme = useTheme();
  const { dict, validationSchema, currentStep, setCurrentStep, shipments, onSubmit, closeDialog, steps, handleShipmentSelectLogic } = useAddRoute(open, onClose, onSuccess);
  const paletteTheme = theme.palette as unknown as ExtendedPalette;

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={onSubmit} enableReinitialize>
      {({ handleSubmit, validateForm, setFieldTouched, setFieldValue }) => {
        const handleShipmentSelect = async (shipmentId: string) => { handleShipmentSelectLogic(shipmentId, setFieldValue); };

        const handleNextStep = async () => {
          let fieldsToValidate: string[] = [];
          if (currentStep === 1) { fieldsToValidate = ["name", "startTime", "endTime"]; } else if (currentStep === 2) { fieldsToValidate = ["startAddress", "endAddress"]; }
          fieldsToValidate.forEach((f) => setFieldTouched(f, true));
          const result = await validateForm();
          const hasErrors = fieldsToValidate.some((f) => result[f as keyof typeof result]);
          if (!hasErrors) { setCurrentStep((prev) => prev + 1); } else { toast.error(dict.validation.genericFormError); }
        };

        return (
          <Dialog
            open={open}
            onClose={closeDialog}
            maxWidth="lg"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 4,
                bgcolor: theme.palette.background.paper,
                backgroundImage: "none",
                border: `1px solid ${paletteTheme.divider_alpha?.main_10}`,
                height: "85vh",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
              },
            }}
          >
            <Box sx={{ p: 3, pb: 2, flexShrink: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Stack spacing={0.5}>
                  <Typography component="div" variant="h6" fontWeight={700} color="text.primary">
                    {dict.routes.dialogs.addTitle}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dict.routes.dialogs.addSubtitle}
                  </Typography>
                </Stack>
                <IconButton onClick={closeDialog} size="small" sx={{ color: "text.secondary" }} aria-label="close">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Stepper
                activeStep={currentStep - 1}
                sx={{
                  "& .MuiStepConnector-line": {
                    borderColor: paletteTheme.divider_alpha?.main_10,
                  },
                }}
              >
                {steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel
                      StepIconProps={{
                        sx: {
                          "&.Mui-active": { color: theme.palette.primary.main },
                          "&.Mui-completed": { color: theme.palette.primary.main },
                        },
                      }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        color={currentStep - 1 >= index ? "text.primary" : "text.secondary"}
                      >
                        {label}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            <Divider sx={{ borderColor: paletteTheme.divider_alpha?.main_05 }} />

            <DialogContent sx={{ flex: "1 1 auto", overflowY: currentStep === 2 ? "hidden" : "auto", p: 3, display: "flex", flexDirection: "column" }}>
              <Form style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                {currentStep === 1 && <FirstRouteDialogStep shipments={shipments} onShipmentSelect={handleShipmentSelect} />}
                {currentStep === 2 && <SecondRouteDialogStep />}
                {currentStep === 3 && <ThirdRouteDialogStep />}
              </Form>
            </DialogContent>

            <Divider sx={{ borderColor: paletteTheme.divider_alpha?.main_05 }} />

            <DialogActions sx={{ p: 2.5, px: 3, justifyContent: "space-between", flexShrink: 0 }}>
              <Button
                onClick={currentStep === 1 ? closeDialog : () => setCurrentStep((prev) => prev - 1)}
                sx={{ color: "text.secondary", "&:hover": { bgcolor: paletteTheme.divider_alpha?.main_05 } }}
              >
                {currentStep === 1 ? dict.common.cancel : dict.common.back}
              </Button>
              <Button
                variant="contained"
                onClick={currentStep === steps.length ? () => handleSubmit() : handleNextStep}
                sx={{
                  borderRadius: 2,
                  px: 4,
                  fontWeight: 600,
                  boxShadow: `0 8px 16px ${paletteTheme.primary?._alpha?.main_20}`,
                }}
              >
                {currentStep === steps.length ? dict.common.save : dict.common.next}
              </Button>
            </DialogActions>
          </Dialog>
        );
      }}
    </Formik>
  );
};

export default AddRouteDialog;
