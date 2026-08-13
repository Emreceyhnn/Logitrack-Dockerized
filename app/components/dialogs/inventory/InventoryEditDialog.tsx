"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  Button,
  Typography,
  Box,
  IconButton,
  Stack,
  useTheme,
  Divider,
} from "@mui/material";
import { Close as CloseIcon, Edit as EditIcon } from "@mui/icons-material";
import { Formik } from "formik";
import * as yup from "yup";
import { useWarehouses } from "@/app/hooks/useWarehouses";
import { InventoryEditProps } from "@/app/lib/type/inventory";
import { uploadImageAction } from "@/app/lib/actions/upload";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { toast } from "sonner";
import { useCurrency } from "@/app/hooks/useCurrency";
import { InventoryFormData } from "./edit/inventoryFormTypes";
import InventoryProductInfoSection from "./edit/InventoryProductInfoSection";
import InventoryLoadParamsSection from "./edit/InventoryLoadParamsSection";

export default function InventoryEditDialog({
  isOpen,
  onClose,
  item,
  onUpdate,
}: InventoryEditProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const { data: warehouses } = useWarehouses();
  const { convertFrom, symbol, currency: userCurrency } = useCurrency();

  const validationSchema = useMemo(
    () =>
      yup.object({
        name: yup.string().required(dict.common.noData),
        sku: yup.string().required(dict.common.noData),
        warehouseId: yup.string().required(dict.common.noData),
        imageUrl: yup.string().optional().nullable(),
        quantity: yup
          .number()
          .typeError(dict.common.noData)
          .required(dict.common.noData)
          .min(0, dict.common.noData),
        minStock: yup
          .number()
          .typeError(dict.common.noData)
          .required(dict.common.noData)
          .min(0, dict.common.noData),
        weightKg: yup
          .number()
          .nullable()
          .transform((v) => (v === "" || isNaN(v) ? null : v)),
        volumeM3: yup
          .number()
          .nullable()
          .transform((v) => (v === "" || isNaN(v) ? null : v)),
        palletCount: yup
          .number()
          .nullable()
          .transform((v) => (v === "" || isNaN(v) ? null : v)),
        unitValue: yup
          .number()
          .nullable()
          .transform((v) => (v === "" || isNaN(v) ? null : v)),
        cargoType: yup.string().optional().nullable(),
      }),
    [dict]
  );

  const initialValues = useMemo(() => {
    return {
      name: item?.name || "",
      sku: item?.sku || "",
      warehouseId: item?.warehouseId || "",
      zone: item?.zone || "",
      imageUrl: item?.imageUrl || "",
      quantity: item?.quantity || 0,
      minStock: item?.minStock || 0,
      weightKg: item?.weightKg || 0,
      volumeM3: item?.volumeM3 || 0,
      palletCount: item?.palletCount || 0,
      unitValue: item
        ? parseFloat(
            convertFrom(item.unitValue || 0, item.currency || "USD").toFixed(2)
          )
        : 0,
      cargoType: item?.cargoType || "General Cargo",
    };
  }, [item, convertFrom]);

  /* ---------------------------------- state --------------------------------- */
  // Local string state for smooth numeric input
  const [localQuantity, setLocalQuantity] = useState(
    () => item?.quantity?.toString() || "0"
  );
  const [localMinStock, setLocalMinStock] = useState(
    () => item?.minStock?.toString() || "0"
  );
  const [localWeight, setLocalWeight] = useState(() =>
    item?.weightKg ? item.weightKg.toString() : "0"
  );
  const [localVolume, setLocalVolume] = useState(() =>
    item?.volumeM3 ? item.volumeM3.toString() : "0"
  );
  const [localPalletCount, setLocalPalletCount] = useState(() =>
    item?.palletCount ? item.palletCount.toString() : "0"
  );
  const [localUnitValue, setLocalUnitValue] = useState(() => {
    if (!item) return "0";
    const converted = parseFloat(
      convertFrom(item.unitValue || 0, item.currency || "USD").toFixed(2)
    );
    return converted ? converted.toString() : "0";
  });

  const handleNumChange = (
    val: string,
    setLocal: (v: string) => void,
    setFieldValue: (field: string, value: number | null) => void,
    fieldName: string,
    isFloat: boolean = false
  ) => {
    setLocal(val);
    if (val === "") {
      setFieldValue(fieldName, 0);
      return;
    }
    const parsed = isFloat ? parseFloat(val) : parseInt(val);
    if (!isNaN(parsed)) {
      setFieldValue(fieldName, parsed);
    }
  };

  const onSubmit = async (data: InventoryFormData) => {
    if (!item) return;

    // 1. Close dialog immediately
    onClose();

    // 2. Run update behind a loading toast
    await toast.promise(
      (async () => {
        let finalImageUrl = data.imageUrl || "";

        if (finalImageUrl.startsWith("data:")) {
          const uploadResult = await uploadImageAction(finalImageUrl, "general");
          finalImageUrl = uploadResult.url;
        }

        await onUpdate(item.id, {
          ...data,
          imageUrl: finalImageUrl,
          currency: userCurrency,
        });
      })(),
      {
        loading: dict.toasts?.loading || "Updating...",
        success: dict.common.saveSuccess || "Inventory updated successfully",
        error: (error: unknown) =>
          (error as Error).message || "Failed to update inventory",
      }
    );
  };

  if (!item) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 4,
          backgroundImage: "none",
          border: `1px solid ${theme.palette.divider_alpha.main_10}`,
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
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
                bgcolor: theme.palette.secondary._alpha.main_10,
                color: theme.palette.secondary.main,
              }}
            >
              <EditIcon />
            </Box>
            <Box>
              <Typography
                component="div"
                variant="h6"
                fontWeight={700}
                color="white"
              >
                {dict.inventory.dialogs.editItem}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: -0.5 }}
              >
                {item.name} • {item.warehouse.name}
              </Typography>
            </Box>
          </Stack>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: "text.secondary" }}
            aria-label="close"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: theme.palette.divider_alpha.main_10 }} />

      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          handleBlur,
          setFieldValue,
          isSubmitting,
          handleSubmit,
        }) => (
          <form onSubmit={handleSubmit}>
            <DialogContent
              sx={{
                p: 4,
                maxHeight: "calc(90vh - 160px)",
                overflowY: "auto",
                "&::-webkit-scrollbar": { width: "8px" },
                "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                "&::-webkit-scrollbar-thumb": {
                  bgcolor: theme.palette.divider_alpha.main_10,
                  borderRadius: "4px",
                  "&:hover": { bgcolor: theme.palette.divider_alpha.main_20 },
                },
              }}
            >
              <Stack spacing={4}>
                <InventoryProductInfoSection
                  values={values}
                  errors={errors}
                  touched={touched}
                  handleChange={handleChange}
                  handleBlur={handleBlur}
                  setFieldValue={setFieldValue}
                  warehouses={warehouses}
                  localQuantity={localQuantity}
                  setLocalQuantity={setLocalQuantity}
                  localMinStock={localMinStock}
                  setLocalMinStock={setLocalMinStock}
                  handleNumChange={handleNumChange}
                />

                <InventoryLoadParamsSection
                  values={values}
                  handleChange={handleChange}
                  handleBlur={handleBlur}
                  setFieldValue={setFieldValue}
                  symbol={symbol}
                  localWeight={localWeight}
                  setLocalWeight={setLocalWeight}
                  localVolume={localVolume}
                  setLocalVolume={setLocalVolume}
                  localPalletCount={localPalletCount}
                  setLocalPalletCount={setLocalPalletCount}
                  localUnitValue={localUnitValue}
                  setLocalUnitValue={setLocalUnitValue}
                  handleNumChange={handleNumChange}
                />
              </Stack>
            </DialogContent>

            <Divider sx={{ borderColor: theme.palette.divider_alpha.main_10 }} />

            <Box
              sx={{
                p: 3,
                px: 4,
                bgcolor: theme.palette.background.default_alpha.main_10,
              }}
            >
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  onClick={onClose}
                  sx={{
                    px: 3,
                    fontWeight: 600,
                    color: "text.secondary",
                    textTransform: "none",
                    "&:hover": { color: "text.primary" },
                  }}
                >
                  {dict.inventory.dialogs.discardChanges}
                </Button>
                {Object.keys(errors).length > 0 && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ alignSelf: "center", fontWeight: 600 }}
                  >
                    {dict.common.fillRequired ||
                      "Lütfen formdaki hataları kontrol edin"}
                  </Typography>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{
                    minWidth: 160,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: "none",
                    boxShadow: `0 8px 24px ${theme.palette.primary._alpha.main_20}`,
                    py: 1.2,
                  }}
                >
                  {dict.inventory.dialogs.commitUpdate}
                </Button>
              </Stack>
            </Box>
          </form>
        )}
      </Formik>
    </Dialog>
  );
}
