"use client";

import {
  Box,
  Grid,
  Stack,
  Typography,
  TextField,
  IconButton,
  MenuItem,
  useTheme,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Inventory as InventoryIcon,
} from "@mui/icons-material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import DeleteIcon from "@mui/icons-material/Delete";
import type { FormikProps } from "formik";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useWarehouseZones } from "@/app/hooks/useWarehouses";
import {
  InventoryFormData,
  HandleNumChange,
  inventoryTextFieldSx,
} from "./inventoryFormTypes";

type FormikBag = Pick<
  FormikProps<InventoryFormData>,
  "values" | "errors" | "touched" | "handleChange" | "handleBlur" | "setFieldValue"
>;

interface InventoryProductInfoSectionProps extends FormikBag {
  warehouses: Array<{ id: string; name: string; code: string }> | undefined;
  localQuantity: string;
  setLocalQuantity: (v: string) => void;
  localMinStock: string;
  setLocalMinStock: (v: string) => void;
  handleNumChange: HandleNumChange;
}

/** Product info + stock levels section of the inventory edit form. */
export default function InventoryProductInfoSection({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue,
  warehouses,
  localQuantity,
  setLocalQuantity,
  localMinStock,
  setLocalMinStock,
  handleNumChange,
}: InventoryProductInfoSectionProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const textFieldSx = inventoryTextFieldSx(theme);
  const { data: zones } = useWarehouseZones(values.warehouseId || undefined);

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <InventoryIcon
          sx={{ color: theme.palette.primary.main, fontSize: "1.2rem" }}
        />
        <Typography
          variant="caption"
          fontWeight={700}
          color="text.secondary"
          sx={{ letterSpacing: "1px", textTransform: "uppercase" }}
        >
          {dict.inventory.dialogs.productInfo}
        </Typography>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <TextField
            name="name"
            label={dict.inventory.fields?.name || "Product Name"}
            placeholder="Enter product name"
            fullWidth
            value={values.name}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.name && !!errors.name}
            helperText={touched.name && errors.name}
            sx={textFieldSx}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={700}
            sx={{ display: "block", mb: 1.5 }}
          >
            {dict.inventory.dialogs.productImage}
          </Typography>
          <Box
            sx={{
              width: "100%",
              height: 140,
              borderRadius: 3,
              border: `2px dashed ${theme.palette.divider_alpha.main_10}`,
              bgcolor: theme.palette.background.paper_alpha.main_05,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              transition: "all 0.2s ease",
              overflow: "hidden",
              mb: 3,
              "&:hover": {
                borderColor: theme.palette.primary.main,
                bgcolor: theme.palette.primary._alpha.main_02,
              },
            }}
          >
            {values.imageUrl ? (
              <Box
                sx={{ position: "relative", width: "100%", height: "100%" }}
              >
                <Box
                  component="img"
                  src={values.imageUrl}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    p: 1,
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => setFieldValue("imageUrl", "")}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    bgcolor: theme.palette.error._alpha.main_80,
                    color: "white",
                    "&:hover": { bgcolor: theme.palette.error.main },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : (
              <>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  id="edit-product-image-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setFieldValue(
                          "imageUrl",
                          event.target?.result as string
                        );
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label
                  htmlFor="edit-product-image-upload"
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <AddPhotoAlternateIcon
                    sx={{
                      fontSize: 32,
                      color: theme.palette.common.white_alpha.main_20,
                      mb: 1,
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {dict.inventory.dialogs.clickToChange}
                  </Typography>
                </label>
              </>
            )}
          </Box>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            name="sku"
            label={dict.inventory.fields.sku}
            placeholder={dict.inventory.dialogs.skuPlaceholder}
            fullWidth
            value={values.sku}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.sku && !!errors.sku}
            helperText={touched.sku && errors.sku}
            sx={textFieldSx}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            name="warehouseId"
            select
            label={dict.inventory.filters?.warehouse || "Warehouse"}
            fullWidth
            value={values.warehouseId}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.warehouseId && !!errors.warehouseId}
            helperText={touched.warehouseId && errors.warehouseId}
            sx={textFieldSx}
          >
            {warehouses?.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name} ({w.code})
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            name="zone"
            select
            label={dict.warehouses.dialogs.zones.code}
            fullWidth
            value={values.zone || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            sx={textFieldSx}
          >
            <MenuItem value="">{dict.warehouses.dialogs.fields.unassigned}</MenuItem>
            {(zones || []).map((z) => (
              <MenuItem key={z.id} value={z.code}>
                {z.code}
                {z.name ? ` · ${z.name}` : ""}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField
            name="quantity"
            label={dict.inventory.fields.quantity}
            type="number"
            fullWidth
            value={localQuantity}
            onChange={(e) =>
              handleNumChange(
                e.target.value,
                setLocalQuantity,
                setFieldValue,
                "quantity"
              )
            }
            onBlur={handleBlur}
            error={touched.quantity && !!errors.quantity}
            helperText={touched.quantity && errors.quantity}
            sx={textFieldSx}
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField
            name="minStock"
            label={dict.inventory.dialogs.safetyThreshold}
            type="number"
            fullWidth
            value={localMinStock}
            onChange={(e) =>
              handleNumChange(
                e.target.value,
                setLocalMinStock,
                setFieldValue,
                "minStock"
              )
            }
            onBlur={handleBlur}
            error={touched.minStock && !!errors.minStock}
            helperText={touched.minStock && errors.minStock}
            sx={textFieldSx}
          />
        </Grid>
      </Grid>

      <Box
        sx={{
          mt: 3,
          p: 2,
          borderRadius: 2.5,
          bgcolor: theme.palette.warning._alpha.main_05,
          border: `1px solid ${theme.palette.warning._alpha.main_10}`,
          display: "flex",
          gap: 1.5,
          alignItems: "center",
        }}
      >
        <WarningIcon color="warning" sx={{ fontSize: "1.1rem" }} />
        <Typography
          variant="caption"
          color="warning.light"
          sx={{ fontWeight: 600, lineHeight: 1.4 }}
        >
          {dict.inventory.dialogs.auditWarning}
        </Typography>
      </Box>
    </Box>
  );
}
