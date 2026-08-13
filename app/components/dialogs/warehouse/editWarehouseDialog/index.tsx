"use client";

import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  StepLabel,
  useTheme,
  Stack,
  Typography,
  IconButton,
  Stepper,
  Step,
  Button,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useState, useEffect, useRef } from "react";
import {
  EditWarehouseDialogProps,
  EditWarehousePageActions,
  EditWarehousePageState,
} from "@/app/lib/type/edit-warehouse";
import { useWarehouseMutations } from "@/app/hooks/useWarehouses";
import { useUser } from "@/app/hooks/useUser";

import BasicInfoSection from "../shared/sections/BasicInfoSection";
import LocationSection from "../shared/sections/LocationSection";
import CapacitySection from "../shared/sections/CapacitySection";
import { WarehouseType } from "@/app/lib/type/enums";


const defaultBasicInfo = {
  name: "",
  code: "",
  type: "WAREHOUSE" as WarehouseType,
  openingTime: "08:00",
  closingTime: "18:00",
  is247: false,
  timezone: "UTC",
};

const defaultLocation = {
  address: "",
  city: "",
  country: "",
  postalCode: "",
  managerId: "",
};

const defaultCapacity = {
  capacityPallets: 5000,
  capacityVolumeM3: 100000,
  specifications: [],
};

const EditWarehouseDialog = ({
  open,
  onClose,
  onSuccess,
  warehouseData,
}: EditWarehouseDialogProps) => {
  const theme = useTheme();
  const { user } = useUser();
  const dict = useDictionary();
  const isInitialized = useRef<string | null>(null);
  const { updateWarehouse } = useWarehouseMutations();

  const [state, setState] = useState<EditWarehousePageState>({
    data: {
      basicInfo: defaultBasicInfo,
      location: defaultLocation,
      capacity: defaultCapacity,
    },
    currentStep: 1,
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  // Populate state when warehouseData is available
  useEffect(() => {
    if (warehouseData && open && isInitialized.current !== warehouseData.id) {
      isInitialized.current = warehouseData.id;
      const opHours = warehouseData.operatingHours;
      let openingTime = "08:00";
      let closingTime = "18:00";
      let is247 = false;

      if (opHours === "24/7") {
        is247 = true;
      } else if (opHours && opHours.includes(" - ")) {
        const parts = opHours.split(" - ");
        if (parts.length === 2) {
          openingTime = parts[0] ?? openingTime;
          closingTime = parts[1] ?? closingTime;
        }
      }

      setState({
        data: {
          basicInfo: {
            name: warehouseData.name || "",
            code: warehouseData.code || "",
            type: warehouseData.type || "WAREHOUSE",
            openingTime,
            closingTime,
            is247,
            timezone: warehouseData.timezone || "UTC",
          },
          location: {
            address: warehouseData.address || "",
            city: warehouseData.city || "",
            country: warehouseData.country || "",
            postalCode: "", // Add if added to schema
            lat: warehouseData.lat || undefined,
            lng: warehouseData.lng || undefined,
            managerId: warehouseData.managerId || "",
          },
          capacity: {
            capacityPallets: warehouseData.capacityPallets || 0,
            capacityVolumeM3: warehouseData.capacityVolumeM3 || 0,
            specifications: warehouseData.specifications || [],
          },
        },
        currentStep: 1,
        isLoading: false,
        error: null,
        isSuccess: false,
      });
    } else if (!open) {
      isInitialized.current = null;
    }
  }, [warehouseData, open]);

  const actions: EditWarehousePageActions = {
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
      if (!user || !user.companyId || !warehouseData) return;

      // Close first: useWarehouseMutations() patches the cache optimistically
      // and toasts success/error itself, so blocking the dialog on the
      // round-trip adds a wait with nothing to show for it. The inline
      // isLoading/error state is therefore no longer set here — a failure
      // surfaces as a toast and the optimistic change is rolled back.
      actions.closeDialog();

      try {
        await updateWarehouse.mutateAsync({
          id: warehouseData.id,
          data: {
            name: state.data.basicInfo.name,
            code: state.data.basicInfo.code,
            type: state.data.basicInfo.type,
            address: state.data.location.address,
            city: state.data.location.city,
            country: state.data.location.country,
            lat: state.data.location.lat ?? null,
            lng: state.data.location.lng ?? null,
            managerId: state.data.location.managerId || null,
            capacityPallets: state.data.capacity.capacityPallets,
            capacityVolumeM3: state.data.capacity.capacityVolumeM3,
            operatingHours: state.data.basicInfo.is247
              ? "24/7"
              : `${state.data.basicInfo.openingTime} - ${state.data.basicInfo.closingTime}`,
            timezone: state.data.basicInfo.timezone,
            specifications: state.data.capacity.specifications,
          },
        });

        onSuccess?.();
      } catch {
        // useWarehouseMutations() already toasted the error and rolled back.
      }
    },
    closeDialog: () => {
      onClose();
    },
    reset: () => {
      // Handled by the effect
    },
  };

  const steps = [
    dict.warehouses.dialogs.steps.basicInfo,
    dict.warehouses.dialogs.steps.location,
    dict.warehouses.dialogs.steps.capacity,
  ];

  if (!warehouseData) return null;

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
                  ? dict.warehouses.dialogs.editTitle
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
              state.isLoading ||
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
            startIcon={
              state.isLoading && <CircularProgress size={16} color="inherit" />
            }
          >
            {state.isLoading
              ? dict.toasts.loading
              : state.currentStep < 3
                ? dict.common.next
                : dict.warehouses.dialogs.updateButton}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditWarehouseDialog;
