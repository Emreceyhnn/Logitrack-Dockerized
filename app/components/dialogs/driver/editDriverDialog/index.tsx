"use client";

import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  IconButton,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useMemo, useState } from "react";
import { Formik } from "formik";
import {
  EditDriverDialogProps,
  EditDriverFormValues,
  AddDriverDocument,
} from "@/app/lib/type/driver";
import { DriverStatus } from "@/app/lib/type/enums";
import { toast } from "sonner";
import { useDriverMutations } from "@/app/hooks/useDrivers";
import { uploadImageAction } from "@/app/lib/actions/upload";
import { editDriverValidationSchema } from "@/app/lib/validationSchema";
import FirstEditDriverDialogStep from "./firstStep";
import SecondEditDriverDialogStep from "./secondStep";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { formatDisplayDate } from "@/app/lib/utils/date";

const EditDriverDialog = ({
  open,
  onClose,
  onSuccess,
  driver,
}: EditDriverDialogProps) => {
  /* -------------------------------- variables ------------------------------- */
  const theme = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const dict = useDictionary();
  const dateSettings = useDateSettings();
  const { updateDriver } = useDriverMutations();

  const validationSchema = useMemo(
    () => editDriverValidationSchema(dict),
    [dict]
  );
  if (!driver) return null;

  const initialValues: EditDriverFormValues = {
    phone: driver.phone || "",
    employeeId: driver.employeeId || "",
    licenseNumber: driver.licenseNumber || "",
    licenseExpiry: driver.licenseExpiry ? new Date(driver.licenseExpiry) : null,
    licenseType: driver.licenseType || "",
    licencePhoto: null,
    homeWareHouseId: driver.homeBaseWarehouseId || "",
    currentVehicleId: driver.currentVehicle?.id || "",
    status: driver.status,
    languages: driver.languages || [],
    hazmatCertified: driver.hazmatCertified || false,
    documents: driver.documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : null,
      file: null,
      url: doc.url,
      uploadedAt: formatDisplayDate(doc.createdAt, dateSettings),
    })) as AddDriverDocument[],
  };

  /* -------------------------------- handlers --------------------------------- */
  const handleSubmit = async (values: EditDriverFormValues) => {
    // 1. Close immediately
    onClose();
    setCurrentStep(1);

    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
    };

    // 2. Upload documents, then update (optimistic + toasts via useDriverMutations())
    const loadingToastId = toast.loading(dict.toasts?.loading || "Saving...");
    try {
      let licensePhotoUrl = "";
      if (values.licencePhoto) {
        const base64 = await fileToBase64(values.licencePhoto);
        const uploadResult = await uploadImageAction(
          base64,
          "documents",
          `drivers/${driver.user.id}/license`
        );
        licensePhotoUrl = uploadResult.url;
      }

      const uploadedDocs = await Promise.all(
        values.documents.map(async (doc) => {
          if (doc.file) {
            const base64 = await fileToBase64(doc.file);
            const uploadResult = await uploadImageAction(
              base64,
              "documents",
              `drivers/${driver.user.id}/docs`
            );
            return {
              name: doc.name,
              type: doc.type,
              url: uploadResult.url,
              expiryDate: doc.expiryDate || undefined,
            };
          }
          return null;
        })
      );

      const payload = {
        phone: values.phone,
        employeeId: values.employeeId,
        licenseNumber: values.licenseNumber,
        licenseExpiry: values.licenseExpiry,
        licenseType: values.licenseType,
        status: values.status as DriverStatus,
        currentVehicleId: values.currentVehicleId || null,
        homeBaseWarehouseId: values.homeWareHouseId || null,
        languages: values.languages,
        hazmatCertified: values.hazmatCertified,
        ...(licensePhotoUrl && { licensePhotoUrl }),
        ...(uploadedDocs.length > 0 && {
          documents: uploadedDocs.filter((d) => d !== null) as {
            name: string;
            type: string;
            url: string;
            expiryDate?: Date;
          }[],
        }),
      };

      try {
        await updateDriver.mutateAsync({ id: driver.id, data: payload });
        onSuccess?.();
      } catch {
        // useDriverMutations() already toasts the error
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.errorOccurred);
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const steps = [
    dict.drivers.tabs.personalInfo,
    dict.drivers.tabs.operationalInfo,
  ];

  return (
    <Dialog
      open={open}
      onClose={() => !onSuccess && onClose()}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          bgcolor: theme.palette.background.midnight.main,
          backgroundImage: "none",
          border: `1px solid ${theme.palette.divider_alpha.main_10}`,
        },
      }}
    >
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ handleSubmit: formikSubmit, validateForm, setFieldTouched }) => {
          const handleNext = async () => {
            const errors = await validateForm();
            const step1Fields = [
              "phone",
              "employeeId",
              "licenseNumber",
              "licenseType",
              "licenseExpiry",
            ];

            const hasStep1Errors = step1Fields.some(
              (field) => !!(errors as Record<string, string>)[field]
            );

            if (hasStep1Errors) {
              step1Fields.forEach((field) => setFieldTouched(field, true));
              toast.error(dict.validation.genericFormError);
              return;
            }
            setCurrentStep(2);
          };

          return (
            <>
              <Box sx={{ p: 3, pb: 0 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Stack spacing={0.5}>
                    <Typography component="div" variant="h6" fontWeight={600} color="white">
                      {dict.drivers.dialogs.editTitle}: {driver.user.name}{" "}
                      {driver.user.surname}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dict.drivers.dialogs.editSubtitle}
                    </Typography>
                  </Stack>
                  <IconButton
                    onClick={() => onClose()}
                    aria-label="close"
                    size="small"
                    sx={{ color: "text.secondary" }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
              <DialogContent>
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

                <Box sx={{ minHeight: 400 }}>
                  {currentStep === 1 && <FirstEditDriverDialogStep />}
                  {currentStep === 2 && (
                    <SecondEditDriverDialogStep
                      setStep={setCurrentStep}
                      driver={driver}
                    />
                  )}
                </Box>
              </DialogContent>
              <DialogActions
                sx={{ p: 3, pt: 0, justifyContent: "space-between" }}
              >
                <Button
                  onClick={
                    currentStep === 1
                      ? () => onClose()
                      : () => setCurrentStep(1)
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
                    currentStep === 1 ? handleNext : () => formikSubmit()
                  }
                  sx={{
                    borderRadius: 2,
                    px: 4,
                    fontWeight: 600,
                    boxShadow: `0 8px 16px ${theme.palette.primary._alpha.main_20}`,
                  }}
                >
                  {currentStep === 1 ? dict.common.next : dict.common.save}
                </Button>
              </DialogActions>
            </>
          );
        }}
      </Formik>
    </Dialog>
  );
};

export default EditDriverDialog;
