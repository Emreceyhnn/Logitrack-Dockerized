"use client";

import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  Typography,
  useTheme,
  Button,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useState } from "react";
import {
  AddWarehouseDialogProps,
  AddWarehousePageActions,
  AddWarehousePageState,
} from "@/app/lib/type/add-warehouse";
import { useWarehouseMutations } from "@/app/hooks/useWarehouses";
import { useUser } from "@/app/hooks/useUser";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { logger } from "@/app/lib/logger";

import BasicInfoSection from "../shared/sections/BasicInfoSection";
import LocationSection from "../shared/sections/LocationSection";
import CapacitySection from "../shared/sections/CapacitySection";


const initialBasicInfo = {
  name: "",
  code: "",
  type: "WAREHOUSE" as const,
  openingTime: "08:00",
  closingTime: "18:00",
  is247: false,
  timezone: "UTC",
};

const initialLocation = {
  address: "",
  city: "",
  country: "",
  postalCode: "",
  managerId: "",
};

const initialCapacity = {
  capacityPallets: 5000,
  capacityVolumeM3: 100000,
  specifications: [],
};

const AddWarehouseDialog = ({
  open,
  onClose,
  onSuccess,
}: AddWarehouseDialogProps) => {
  /* -------------------------------- variables ------------------------------- */
  const theme = useTheme();
  const { user } = useUser();
  const dict = useDictionary();
  const { createWarehouse } = useWarehouseMutations();

  /* --------------------------------- states --------------------------------- */
  const [state, setState] = useState<AddWarehousePageState>({
    data: {
      basicInfo: initialBasicInfo,
      location: initialLocation,
      capacity: initialCapacity,
    },
    currentStep: 1,
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  /* ---------------------------------- actions --------------------------------- */
  const actions: AddWarehousePageActions = {
    updateBasicInfo: (data) =>
      setState((prev) => ({
        ...prev,
        data: { ...prev.data, basicInfo: { ...prev.data.basicInfo, ...data } },
      })),
    updateLocation: (data) =>
      setState((prev) => ({
        ...prev,
        data: { ...prev.data, location: { ...prev.data.location, ...data } },
      })),
    updateCapacity: (data) =>
      setState((prev) => ({
        ...prev,
        data: { ...prev.data, capacity: { ...prev.data.capacity, ...data } },
      })),
    setStep: (step) => setState((prev) => ({ ...prev, currentStep: step })),
    handleSubmit: async () => {
      if (!user || !user.companyId) return;

      // Close first: the mutation applies an optimistic cache update and toasts
      // its own success/error, so holding the dialog open until the round-trip
      // finishes only makes the app feel slow. A failure is reported by the
      // toast and the optimistic row rolls back.
      actions.closeDialog();

      try {
        await createWarehouse.mutateAsync({
          name: state.data.basicInfo.name,
          code: state.data.basicInfo.code,
          type: state.data.basicInfo.type,
          address: state.data.location.address,
          city: state.data.location.city,
          country: state.data.location.country,
          lat: state.data.location.lat,
          lng: state.data.location.lng,
          // The "unassigned" menu item carries an empty string; send null so the
          // warehouse is created with no manager instead of an unmatchable id.
          managerId: state.data.location.managerId || null,
          capacityPallets: state.data.capacity.capacityPallets,
          capacityVolumeM3: state.data.capacity.capacityVolumeM3,
          operatingHours: state.data.basicInfo.is247
            ? "24/7"
            : `${state.data.basicInfo.openingTime} - ${state.data.basicInfo.closingTime}`,
          timezone: state.data.basicInfo.timezone,
          specifications: state.data.capacity.specifications,
        });

        onSuccess?.();
      } catch (error) {
        logger.error("Failed to add warehouse:", error);
      }
    },
    closeDialog: () => {
      onClose();
      setTimeout(() => actions.reset(), 300);
    },
    reset: () => {
      setState({
        data: {
          basicInfo: initialBasicInfo,
          location: initialLocation,
          capacity: initialCapacity,
        },
        currentStep: 1,
        isLoading: false,
        error: null,
        isSuccess: false,
      });
    },
  };

  const steps = [
    dict.warehouses.dialogs.steps.basicInfo,
    dict.warehouses.dialogs.steps.location,
    dict.warehouses.dialogs.steps.capacity,
  ];

  return (
    <>
      <Dialog
        open={open}
        onClose={actions.closeDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            overflow: "hidden",
            maxHeight: "90vh",
          },
        }}
      >
        <Box sx={{ p: 3, pb: 0 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 3 }}
          >
            <Stack spacing={0.5}>
              <Typography component="div" variant="h6" fontWeight={800} color="text.primary">
                {state.currentStep === 1
                  ? dict.warehouses.dialogs.addTitle
                  : state.currentStep === 2
                    ? dict.warehouses.dialogs.locationTitle
                    : dict.warehouses.dialogs.capacityTitle}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={500}
              >
                {dict.common.step} {state.currentStep}:{" "}
                {steps[state.currentStep - 1]}
              </Typography>
            </Stack>
            <IconButton
              onClick={actions.closeDialog}
              sx={{
                color: "text.secondary",
                "&:hover": { color: "text.primary", bgcolor: "action.hover" },
              }}
             aria-label="close">
              <CloseIcon />
            </IconButton>
          </Stack>

          <Stepper
            activeStep={state.currentStep - 1}
            sx={{
              mb: 4,
              "& .MuiStepLabel-label": {
                color: "text.secondary",
                fontWeight: 600,
              },
              "& .MuiStepLabel-label.Mui-active": {
                color: "primary.main",
                fontWeight: 700,
              },
              "& .MuiStepLabel-label.Mui-completed": {
                color: "text.primary",
                fontWeight: 700,
              },
              "& .MuiStepIcon-root": {
                color:
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
              },
              "& .MuiStepIcon-root.Mui-active": {
                color: "primary.main",
              },
              "& .MuiStepIcon-root.Mui-completed": {
                color: "primary.main",
              },
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <DialogContent sx={{ pb: 4, minHeight: 400 }}>
          {state.currentStep === 1 && (
            <BasicInfoSection state={state.data.basicInfo} actions={actions} />
          )}
          {state.currentStep === 2 && (
            <LocationSection state={state.data.location} actions={actions} />
          )}
          {state.currentStep === 3 && (
            <CapacitySection state={state.data.capacity} actions={actions} />
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 3,
            pt: 1,
            borderTop: `1px solid ${theme.palette.divider_alpha.main_05}`,
            justifyContent: "space-between",
          }}
        >
          <Button
            onClick={
              state.currentStep === 1
                ? actions.closeDialog
                : () => actions.setStep(state.currentStep - 1)
            }
            sx={{ color: "text.secondary", textTransform: "none" }}
          >
            {state.currentStep === 1 ? dict.common.cancel : dict.common.back}
          </Button>

          <Button
            variant="contained"
            disabled={
              (state.currentStep === 1 && !state.data.basicInfo.name) ||
              (state.currentStep === 2 &&
                (!state.data.location.address || !state.data.location.city))
            }
            onClick={
              state.currentStep < 3
                ? () => actions.setStep(state.currentStep + 1)
                : actions.handleSubmit
            }
            sx={{
              minWidth: 140,
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              boxShadow: `0 8px 16px ${theme.palette.primary._alpha.main_20}`,
            }}
          >
            {state.currentStep < 3
              ? dict.common.next
              : dict.warehouses.dialogs.createButton}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddWarehouseDialog;
