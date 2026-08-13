import type { Theme } from "@mui/material/styles";

/** Shape of the inventory edit form values (shared by the dialog + sections). */
export type InventoryFormData = {
  name: string;
  sku?: string;
  warehouseId: string;
  zone?: string | null;
  imageUrl?: string | null;
  quantity: number;
  minStock: number;
  weightKg: number | null;
  volumeM3: number | null;
  palletCount: number | null;
  cargoType?: string | null;
  unitValue?: number | null;
};

/** Smooth numeric-input handler shared by the edit form sections. */
export type HandleNumChange = (
  val: string,
  setLocal: (v: string) => void,
  setFieldValue: (field: string, value: number | null) => void,
  fieldName: string,
  isFloat?: boolean
) => void;

/** Outlined TextField styling used across the inventory edit form. */
export const inventoryTextFieldSx = (theme: Theme) => ({
  "& .MuiOutlinedInput-root": {
    bgcolor: theme.palette.background.paper_alpha.main_05,
    borderRadius: 2,
    color: "white",
    "& fieldset": { borderColor: theme.palette.divider_alpha.main_10 },
    "&:hover fieldset": { borderColor: theme.palette.primary._alpha.main_30 },
    "&.Mui-focused fieldset": { borderColor: theme.palette.primary.main },
  },
  "& .MuiInputLabel-root": {
    color: theme.palette.common.white_alpha.main_50,
  },
  "& .MuiInputLabel-root.Mui-focused": { color: theme.palette.primary.main },
  "& .MuiInputAdornment-root .MuiTypography-root": {
    color: theme.palette.common.white_alpha.main_30,
  },
});
