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
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useState } from "react";
import {
  AddInventoryDialogProps,
  AddInventoryItemDetails,
  AddInventoryStorageLevels,
} from "@/app/lib/type/add-inventory";
import { toast } from "sonner";
import { useInventoryMutations } from "@/app/hooks/useInventory";
import { useUser } from "@/app/hooks/useUser";
import { uploadImageAction } from "@/app/lib/actions/upload";
import ItemDetailsSection from "./sections/ItemDetailsSection";
import StorageLevelsSection from "./sections/StorageLevelsSection";
import ReviewSection from "./sections/ReviewSection";

const generateSKU = () => `SKU-${Math.random().toString(36).substring(2, 7).toLocaleUpperCase('en-US')}`;

const getInitialItemDetails = (): AddInventoryItemDetails => ({
  sku: generateSKU(),
  name: "",
  category: "",
  unitValue: 0,
});

const initialStorageLevels: AddInventoryStorageLevels = {
  warehouseId: "",
  initialQuantity: 0,
  minStockLevel: 10,
};

const AddInventoryDialog = ({
  open,
  onClose,
  onSuccess,
  initialWarehouseId,
}: AddInventoryDialogProps) => {
  const theme = useTheme();
  const { user } = useUser();
  const dict = useDictionary();
  const { addWarehouseItem } = useInventoryMutations();

  /* --------------------------------- states --------------------------------- */
  const [itemDetails, setItemDetails] =
    useState<AddInventoryItemDetails>(getInitialItemDetails);
  const [storageLevels, setStorageLevels] = useState<AddInventoryStorageLevels>(
    () => ({
      ...initialStorageLevels,
      warehouseId: initialWarehouseId || "",
    })
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [formKey, setFormKey] = useState(0);

  /* --------------------------------- effects --------------------------------- */
  // We handle initialWarehouseId via useState initializer and resetForm

  /* ---------------------------------- handlers --------------------------------- */
  const updateItemDetails = (data: Partial<AddInventoryItemDetails>) =>
    setItemDetails((prev) => ({ ...prev, ...data }));

  const updateStorageLevels = (data: Partial<AddInventoryStorageLevels>) =>
    setStorageLevels((prev) => ({ ...prev, ...data }));

  const handleSubmit = async () => {
    if (!user) return;

    // 1. Close dialog immediately
    closeDialog();

    // 2. Upload image (if needed), then add the item optimistically via
    // useInventoryMutations() — it toasts success/error itself.
    const loadingToastId = toast.loading(dict.toasts?.loading || "Adding item...");
    try {
      let finalImageUrl = itemDetails.imageUrl || "";

      // If it's a base64 string (starts with data:), upload it first
      if (finalImageUrl.startsWith("data:")) {
        const uploadResult = await uploadImageAction(finalImageUrl, "general");
        finalImageUrl = uploadResult.url;
      }

      try {
        await addWarehouseItem.mutateAsync({
          warehouseId: storageLevels.warehouseId,
          sku: itemDetails.sku,
          name: itemDetails.name,
          zone: storageLevels.zone || undefined,
          quantity: storageLevels.initialQuantity,
          minStock: storageLevels.minStockLevel,
          weightKg: itemDetails.weightKg || 0,
          volumeM3: itemDetails.volumeM3 || 0,
          palletCount: itemDetails.palletCount || 0,
          // The category the user picked in step 1 is what `cargoType` stores —
          // there is no separate `category` column on Inventory. Without this
          // the selection was silently dropped and every item was filed as
          // "General Cargo" no matter what was chosen.
          cargoType:
            itemDetails.category || itemDetails.cargoType || "General Cargo",
          imageUrl: finalImageUrl,
          unitValue: itemDetails.unitValue || 0,
          currency: user.currency || "USD",
        });
        onSuccess?.();
      } catch {
        // useInventoryMutations() already toasts the error
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.errorOccurred);
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const resetForm = () => {
    setItemDetails(getInitialItemDetails());
    setStorageLevels({
      ...initialStorageLevels,
      warehouseId: initialWarehouseId || "",
    });
    setCurrentStep(1);
    setFormKey((prev) => prev + 1);
  };

  const closeDialog = () => {
    onClose();
    setTimeout(() => resetForm(), 300);
  };

  const steps = [
    dict.inventory.dialogs.steps.details,
    dict.inventory.dialogs.steps.storage,
    dict.inventory.dialogs.steps.review,
  ];

  return (
    <Dialog
      open={open}
      onClose={closeDialog}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: theme.palette.background.paper,
          backgroundImage: "none",
          borderRadius: 4,
          border: `1px solid ${theme.palette.divider_alpha.main_10}`,
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
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: theme.palette.primary._alpha.main_10,
                color: theme.palette.primary.main,
              }}
            >
              <Typography component="div" variant="h6" sx={{ lineHeight: 1 }}>
                📦
              </Typography>
            </Box>
            <Stack spacing={0.5}>
              <Typography component="div" variant="h6" fontWeight={700} color="white">
                {dict.inventory.dialogs.addTitle}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dict.inventory.dialogs.addSubtitle}
              </Typography>
            </Stack>
          </Stack>
          <IconButton onClick={closeDialog} sx={{ color: "text.secondary" }} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Stepper
          activeStep={currentStep - 1}
          sx={{
            mb: 4,
            "& .MuiStepLabel-label": {
              color: theme.palette.common.white_alpha.main_30,
              fontWeight: 600,
              fontSize: "0.65rem",
              textTransform: "uppercase",
            },
            "& .MuiStepLabel-label.Mui-active": {
              color: theme.palette.primary.main,
            },
            "& .MuiStepLabel-label.Mui-completed": {
              color: theme.palette.common.white_alpha.main_50,
            },
            "& .MuiStepIcon-root": {
              color: theme.palette.divider_alpha.main_10,
            },
            "& .MuiStepIcon-root.Mui-active": {
              color: theme.palette.primary.main,
            },
            "& .MuiStepIcon-root.Mui-completed": {
              color: theme.palette.primary.main,
            },
            "& .MuiStepConnector-line": {
              borderColor: theme.palette.divider_alpha.main_10,
            },
            "& .MuiStepConnector-root.Mui-active .MuiStepConnector-line": {
              borderColor: theme.palette.primary.main,
            },
            "& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line": {
              borderColor: theme.palette.primary.main,
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

      <DialogContent sx={{ pb: 4, minHeight: 450 }}>
        {currentStep === 1 && (
          <ItemDetailsSection
            key={`item-details-${formKey}`}
            state={itemDetails}
            updateItemDetails={updateItemDetails}
          />
        )}
        {currentStep === 2 && (
          <StorageLevelsSection
            key={`storage-levels-${formKey}`}
            state={storageLevels}
            updateStorageLevels={updateStorageLevels}
            lockedWarehouseId={initialWarehouseId}
          />
        )}
        {currentStep === 3 && (
          <ReviewSection
            itemDetails={itemDetails}
            storageLevels={storageLevels}
          />
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
            currentStep === 1
              ? closeDialog
              : () => setCurrentStep(currentStep - 1)
          }
          sx={{
            color: "text.secondary",
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          {currentStep === 1 ? dict.common.cancel : dict.common.back}
        </Button>

        <Button
          variant="contained"
          disabled={
            (currentStep === 1 &&
              (!itemDetails.name ||
                !itemDetails.sku ||
                !itemDetails.category ||
                itemDetails.unitValue === undefined)) ||
            (currentStep === 2 && !storageLevels.warehouseId)
          }
          onClick={
            currentStep === 1
              ? () => setCurrentStep(2)
              : currentStep === 2
                ? () => setCurrentStep(3)
                : handleSubmit
          }
          sx={{
            minWidth: 160,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
            boxShadow: `0 8px 24px ${theme.palette.primary._alpha.main_20}`,
            py: 1.2,
          }}
        >
          {currentStep === 1
            ? `${dict.common.next} →`
            : currentStep === 2
              ? `${dict.common.next} →`
              : dict.common.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddInventoryDialog;
