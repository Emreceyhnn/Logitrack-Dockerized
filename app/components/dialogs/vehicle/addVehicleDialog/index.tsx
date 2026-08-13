"use client";

import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Stack,
  Divider,
  Stepper,
  Step,
  StepLabel,
  useTheme,
  Button,
  CircularProgress,
} from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { Dictionary } from "@/app/lib/language/language";
import { useMemo, useState, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import FirstStep from "./firstStep";
import TechSpecsStep from "./techSpecsStep";
import DocumentsStep from "./documentsStep";
import { AddVehiclePageProps, VehicleFormValues } from "@/app/lib/type/vehicle";
import { VehicleType } from "@/app/lib/type/enums";
import { uploadVehicleDocument } from "@/app/lib/controllers/vehicle";
import { useVehicleMutations } from "@/app/hooks/useVehicles";
import { uploadImageAction } from "@/app/lib/actions/upload";
import { fileToBase64 } from "@/app/lib/utils/fileUtils";
import { toast } from "sonner";
import { Formik, FormikHelpers, useFormikContext } from "formik";
import { addVehicleValidationSchema } from "@/app/lib/validationSchema";
import { stripUndefined } from "@/app/lib/utils/stripUndefined";

interface VehicleCreateInput {
  plate: string;
  fleetNo?: string;
  brand: string;
  model: string;
  type: VehicleType;
  year: number;
  odometerKm?: number;
  photo?: string;
  maxLoadKg: number;
  fuelType: string;
  avgFuelConsumption?: number;
  fuelLevel?: number;
  fuelCapacity?: number;
  engineSize?: string;
  transmission?: string;
  techNotes?: string;
  registrationExpiry?: Date;
  inspectionExpiry?: Date;
  nextServiceKm?: number;
  enableAlerts?: boolean;
}

const initialValues: VehicleFormValues = {
  fleetNo: "",
  plate: "",
  type: "",
  brand: "",
  model: "",
  year: "",
  odometerKm: "",
  nextServiceKm: "",
  maxLoadKg: "",
  fuelType: "",
  fuelLevel: 50,
  status: "AVAILABLE",
  avgFuelConsumption: "",
  fuelCapacity: "",
  engineSize: "",
  transmission: "",
  techNotes: "",
  registrationExpiry: null,
  inspectionExpiry: null,
  nextServiceDueKm: "",
  enableExpiryAlerts: true,
  documents: [],
};

const AddVehicleDialog = ({
  open,
  onClose,
  onSuccess,
}: AddVehiclePageProps) => {
  /* ---------------------------------- State --------------------------------- */
  const dict = useDictionary();
  const theme = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const { createVehicle } = useVehicleMutations();

  const closeDialog = () => {
    onClose();
    setTimeout(() => {
      setCurrentStep(1);
    }, 300);
  };

  const handleSubmit = async (
    values: VehicleFormValues,
    { resetForm }: FormikHelpers<VehicleFormValues>
  ) => {
    // Validate documents before closing
    const requiredTypes = ["REGISTRATION", "INSPECTION", "INSURANCE"];
    const uploadedTypes = values.documents.map((d) => d.type);
    const missingTypes = requiredTypes.filter((t) => !uploadedTypes.includes(t));

    if (missingTypes.length > 0) {
      toast.error(dict.toasts.errorGeneric);
      return;
    }

    // 1. Close dialog immediately
    closeDialog();
    resetForm();

    // 2. Run the full create+upload flow. The create step itself is optimistic
    // and toasts via useVehicleMutations(); only document-upload failures need
    // their own toast here.
    const loadingToastId = toast.loading(dict.toasts.loading);
    let vehicleCreated = false;
    try {
      let photoUrl = values.photo;
      if (values.photo instanceof File) {
        const base64 = await fileToBase64(values.photo);
        const uploadResult = await uploadImageAction(base64, "vehicles");
        photoUrl = uploadResult.url;
      }

      const payload: VehicleCreateInput = stripUndefined({
        fleetNo: values.fleetNo || undefined,
        plate: values.plate,
        type: values.type as VehicleType,
        brand: values.brand,
        model: values.model,
        year: Number(values.year),
        odometerKm: Number(values.odometerKm),
        photo: (photoUrl as string) || undefined,
        maxLoadKg: Number(values.maxLoadKg),
        fuelType: values.fuelType,
        avgFuelConsumption: Number(values.avgFuelConsumption),
        fuelLevel: Number(values.fuelLevel),
        fuelCapacity: Number(values.fuelCapacity),
        engineSize: values.engineSize,
        transmission: values.transmission,
        techNotes: values.techNotes,
        registrationExpiry: values.registrationExpiry
          ? values.registrationExpiry.toDate()
          : undefined,
        inspectionExpiry: values.inspectionExpiry
          ? values.inspectionExpiry.toDate()
          : undefined,
        nextServiceKm:
          Number(values.nextServiceKm) || Number(values.nextServiceDueKm),
        enableAlerts: values.enableExpiryAlerts,
      });

      const createdVehicle = await createVehicle.mutateAsync(payload);
      vehicleCreated = true;

      const docPromises = values.documents
        .filter((doc) => doc.file)
        .map(async (doc) => {
          const base64 = await fileToBase64(doc.file!);
          const uploadResult = await uploadImageAction(
            base64,
            "documents",
            `vehicles/${createdVehicle.id}`
          );
          return uploadVehicleDocument(createdVehicle.id, {
            type: (doc.type || "OTHER") as import("@/app/lib/type/enums").DocumentType,
            name: doc.name,
            url: uploadResult.url,
            status: "ACTIVE",
            expiryDate: values.registrationExpiry
              ? values.registrationExpiry.toDate()
              : undefined,
          });
        });

      if (docPromises.length > 0) {
        await Promise.all(docPromises);
      }

      onSuccess?.();
    } catch (err) {
      // The create step already toasts its own error via useVehicleMutations();
      // only surface a toast here for failures after a successful create (doc uploads).
      if (vehicleCreated) {
        toast.error(err instanceof Error ? err.message : dict.toasts.errorGeneric);
      }
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const steps = [
    dict.vehicles.dialogs.steps.general,
    dict.vehicles.dialogs.steps.specs,
    dict.vehicles.dialogs.steps.docs,
  ];

  const StepSync = ({
    currentStep,
    setCurrentStep,
    dict,
  }: {
    currentStep: number;
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
    dict: Dictionary;
  }) => {
    const { errors, submitCount } = useFormikContext<VehicleFormValues>();

    useEffect(() => {
      if (submitCount > 0 && Object.keys(errors).length > 0) {
        const getStepForField = (fieldName: string): number => {
          const step1Fields = [
            "plate",
            "fleetNo",
            "brand",
            "model",
            "type",
            "year",
            "odometerKm",
            "photo",
          ];
          const step2Fields = [
            "maxLoadKg",
            "fuelType",
            "avgFuelConsumption",
            "fuelLevel",
            "engineSize",
            "transmission",
            "techNotes",
          ];
          if (step1Fields.includes(fieldName)) return 1;
          if (step2Fields.includes(fieldName)) return 2;
          return 3;
        };

        const firstErrorField = Object.keys(errors)[0] ?? "";
        const targetStep = getStepForField(firstErrorField);
        if (targetStep !== currentStep) {
          setCurrentStep(targetStep);
          toast.error(
            dict.validation.genericFormError ||
              "Please check errors in the highlighted step."
          );
        }
      }
    }, [submitCount, errors, currentStep, setCurrentStep, dict]);

    return null;
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={useMemo(() => addVehicleValidationSchema(dict), [dict])}
      onSubmit={handleSubmit}
    >
      {({ isSubmitting, submitForm, setFieldValue }) => (
        <>
          <StepSync
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            dict={dict}
          />
          <Dialog
            open={open}
            onClose={closeDialog}
            maxWidth="md"
            fullWidth
            PaperProps={{
              sx: {
                overflow: "hidden",
              },
            }}
          >
            <Box sx={{ p: 3, pb: 0 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography component="div" variant="h6" fontWeight={800} color="text.primary">
                  {dict.vehicles.dialogs.addTitle}
                </Typography>
                <IconButton
                  onClick={closeDialog}
                  size="small"
                  sx={{ color: "text.secondary" }}
                 aria-label="close">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>

            <DialogContent sx={{ p: 3 }}>
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
                          fontWeight={700}
                          color={
                            currentStep - 1 >= index
                              ? "text.primary"
                              : "text.disabled"
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
                sx={{ mb: 4, borderColor: theme.palette.divider_alpha.main_05 }}
              />

              <Box sx={{ minHeight: 400 }}>
                {currentStep === 1 && (
                  <FirstStep
                    onFileSelect={(file) => setFieldValue("photo", file)}
                  />
                )}
                {currentStep === 2 && <TechSpecsStep />}
                {currentStep === 3 && <DocumentsStep />}
              </Box>

              <Box
                sx={{
                  mt: 4,
                  pt: 3,
                  borderTop: `1px solid ${theme.palette.divider_alpha.main_05}`,
                }}
              >
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="text"
                    onClick={closeDialog}
                    sx={{
                      color: "text.secondary",
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    {dict.common.cancel}
                  </Button>
                  {currentStep > 1 && (
                    <Button
                      variant="outlined"
                      onClick={() => setCurrentStep((prev) => prev - 1)}
                      sx={{
                        textTransform: "none",
                        borderRadius: 2,
                        fontWeight: 700,
                      }}
                    >
                      {dict.common.back}
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    onClick={
                      currentStep === 3
                        ? submitForm
                        : () => setCurrentStep((prev) => prev + 1)
                    }
                    disabled={isSubmitting}
                    endIcon={
                      isSubmitting ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : null
                    }
                    sx={{
                      textTransform: "none",
                      px: currentStep === 3 ? 3 : 4,
                      borderRadius: 2,
                      boxShadow: `0 8px 24px ${theme.palette.primary._alpha.main_20}`,
                      fontWeight: 700,
                      minWidth: 140,
                    }}
                  >
                    {isSubmitting
                      ? dict.toasts.loading
                      : currentStep === 3
                        ? dict.common.save
                        : dict.common.next}
                  </Button>
                </Stack>
              </Box>
            </DialogContent>
          </Dialog>
        </>
      )}
    </Formik>
  );
};

export default AddVehicleDialog;
