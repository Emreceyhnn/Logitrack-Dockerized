"use client";

import {
  Box,
  Grid,
  Stack,
  Typography,
  TextField,
  InputAdornment,
  MenuItem,
  useTheme,
} from "@mui/material";
import { SettingsSuggest as SettingsIcon } from "@mui/icons-material";
import type { FormikProps } from "formik";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import {
  InventoryFormData,
  HandleNumChange,
  inventoryTextFieldSx,
} from "./inventoryFormTypes";

type FormikBag = Pick<
  FormikProps<InventoryFormData>,
  "values" | "handleChange" | "handleBlur" | "setFieldValue"
>;

interface InventoryLoadParamsSectionProps extends FormikBag {
  symbol: string;
  localWeight: string;
  setLocalWeight: (v: string) => void;
  localVolume: string;
  setLocalVolume: (v: string) => void;
  localPalletCount: string;
  setLocalPalletCount: (v: string) => void;
  localUnitValue: string;
  setLocalUnitValue: (v: string) => void;
  handleNumChange: HandleNumChange;
}

/** Physical attributes / load parameters section of the inventory edit form. */
export default function InventoryLoadParamsSection({
  values,
  handleChange,
  handleBlur,
  setFieldValue,
  symbol,
  localWeight,
  setLocalWeight,
  localVolume,
  setLocalVolume,
  localPalletCount,
  setLocalPalletCount,
  localUnitValue,
  setLocalUnitValue,
  handleNumChange,
}: InventoryLoadParamsSectionProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const textFieldSx = inventoryTextFieldSx(theme);

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <SettingsIcon
          sx={{ color: theme.palette.secondary.main, fontSize: "1.2rem" }}
        />
        <Typography
          variant="caption"
          fontWeight={700}
          color="text.secondary"
          sx={{ letterSpacing: "1px", textTransform: "uppercase" }}
        >
          {dict.inventory.dialogs.loadParams}
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 4 }}>
          <TextField
            name="weightKg"
            label={dict.inventory.dialogs.unitWeight}
            type="number"
            fullWidth
            value={localWeight}
            onChange={(e) =>
              handleNumChange(
                e.target.value,
                setLocalWeight,
                setFieldValue,
                "weightKg",
                true
              )
            }
            onBlur={handleBlur}
            InputProps={{
              endAdornment: <InputAdornment position="end">Kg</InputAdornment>,
            }}
            sx={textFieldSx}
          />
        </Grid>
        <Grid size={{ xs: 4 }}>
          <TextField
            name="volumeM3"
            label={dict.inventory.dialogs.totalVolume}
            type="number"
            fullWidth
            value={localVolume}
            onChange={(e) =>
              handleNumChange(
                e.target.value,
                setLocalVolume,
                setFieldValue,
                "volumeM3",
                true
              )
            }
            onBlur={handleBlur}
            InputProps={{
              endAdornment: <InputAdornment position="end">M³</InputAdornment>,
            }}
            sx={textFieldSx}
          />
        </Grid>
        <Grid size={{ xs: 4 }}>
          <TextField
            name="palletCount"
            label={dict.inventory.dialogs.palletSpots}
            type="number"
            fullWidth
            value={localPalletCount}
            onChange={(e) =>
              handleNumChange(
                e.target.value,
                setLocalPalletCount,
                setFieldValue,
                "palletCount"
              )
            }
            onBlur={handleBlur}
            sx={textFieldSx}
          />
        </Grid>

        <Grid size={{ xs: 6 }}>
          <TextField
            name="cargoType"
            select
            label={dict.inventory.table?.cargoType || "Cargo Type"}
            fullWidth
            value={values.cargoType || "General Cargo"}
            onChange={handleChange}
            onBlur={handleBlur}
            sx={textFieldSx}
          >
            <MenuItem value="General Cargo">
              {dict.inventory?.dialogs?.cargoTypes?.["General Cargo"] ||
                "General Cargo"}
            </MenuItem>
            <MenuItem value="Perishable Goods">
              {dict.inventory?.dialogs?.cargoTypes?.["Perishable Goods"] ||
                "Perishable Goods"}
            </MenuItem>
            <MenuItem value="Hazardous Materials">
              {dict.inventory?.dialogs?.cargoTypes?.["Hazardous Materials"] ||
                "Hazardous Materials"}
            </MenuItem>
            <MenuItem value="Fragile Goods">
              {dict.inventory?.dialogs?.cargoTypes?.["Fragile Goods"] ||
                "Fragile Goods"}
            </MenuItem>
            <MenuItem value="Liquid Cargo">
              {dict.inventory?.dialogs?.cargoTypes?.["Liquid Cargo"] ||
                "Liquid Cargo"}
            </MenuItem>
            <MenuItem value="Oversized Cargo">
              {dict.inventory?.dialogs?.cargoTypes?.["Oversized Cargo"] ||
                "Oversized Cargo"}
            </MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 6 }}>
          <TextField
            name="unitValue"
            label={dict.inventory.table?.unitPrice || "Unit Value"}
            type="number"
            fullWidth
            value={localUnitValue}
            onChange={(e) =>
              handleNumChange(
                e.target.value,
                setLocalUnitValue,
                setFieldValue,
                "unitValue",
                true
              )
            }
            onBlur={handleBlur}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">{symbol}</InputAdornment>
              ),
            }}
            sx={textFieldSx}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
