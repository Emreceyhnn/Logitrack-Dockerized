"use client";

import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useCurrency } from "@/app/hooks/useCurrency";
import { useMemo, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  useTheme,
  MenuItem,
  Grid,
  IconButton,
} from "@mui/material";
import { AddInventoryItemDetails } from "@/app/lib/type/add-inventory";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import DeleteIcon from "@mui/icons-material/Delete";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";

interface ItemDetailsSectionProps {
  state: AddInventoryItemDetails;
  updateItemDetails: (data: Partial<AddInventoryItemDetails>) => void;
}

const ItemDetailsSection = ({
  state,
  updateItemDetails,
}: ItemDetailsSectionProps) => {
  /* -------------------------------- variables ------------------------------- */
  const dict = useDictionary();
  const theme = useTheme();
  const { symbol } = useCurrency();

  const CATEGORIES = useMemo(
    () => [
      { value: "Electronics", label: dict.inventory.categories.electronics },
      { value: "Machinery", label: dict.inventory.categories.machinery },
      { value: "Spare Parts", label: dict.inventory.categories.spareParts },
      { value: "Raw Materials", label: dict.inventory.categories.rawMaterials },
      {
        value: "Finished Goods",
        label: dict.inventory.categories.finishedGoods,
      },
      { value: "Packaging", label: dict.inventory.categories.packaging },
      {
        value: "Office Supplies",
        label: dict.inventory.categories.officeSupplies,
      },
      { value: "Others", label: dict.inventory.categories.others },
    ],
    [dict]
  );

  /* ---------------------------------- state --------------------------------- */
  const [localUnitValue, setLocalUnitValue] = useState(
    state.unitValue === 0 ? "" : state.unitValue?.toString() || ""
  );
  const [localWeight, setLocalWeight] = useState(
    state.weightKg === 0 ? "" : state.weightKg?.toString() || ""
  );
  const [localVolume, setLocalVolume] = useState(
    state.volumeM3 === 0 ? "" : state.volumeM3?.toString() || ""
  );
  const [localPalletCount, setLocalPalletCount] = useState(
    state.palletCount === 0 ? "" : state.palletCount?.toString() || ""
  );

  const handleNumChange = (
    field: keyof AddInventoryItemDetails,
    val: string,
    setLocal: (v: string) => void
  ) => {
    setLocal(val);
    const parsed = parseFloat(val);
    updateItemDetails({ [field]: isNaN(parsed) ? 0 : parsed });
  };

  return (
    <Box>
      <Stack spacing={4}>
        <Stack spacing={0.5}>
          <Typography variant="subtitle1" fontWeight={700} color="white">
            {dict.inventory.header}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {dict.inventory.dialogs.detailsDesc}
          </Typography>
        </Stack>

        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              {dict.inventory.fields.sku}
            </Typography>
            <CustomTextArea
              name="sku"
              placeholder="e.g. PJ-2024-X100"
              value={state.sku}
              onChange={(e) => updateItemDetails({ sku: e.target.value })}
            />
          </Stack>

          <Stack spacing={1}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              {dict.inventory.fields.name} *
            </Typography>
            <CustomTextArea
              name="name"
              placeholder="e.g. Heavy Duty Pallet Jack"
              value={state.name}
              onChange={(e) => updateItemDetails({ name: e.target.value })}
            />
          </Stack>

          <Stack spacing={1}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              {dict.inventory.dialogs.categoryLabel}
            </Typography>
            <CustomTextArea
              name="category"
              select
              value={state.category}
              placeholder={dict.common.noData}
              onChange={(e) => updateItemDetails({ category: e.target.value })}
            >
              <MenuItem value="" disabled>
                {dict.common.search}
              </MenuItem>
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </CustomTextArea>
          </Stack>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  {dict.inventory.fields.unitValue} *
                </Typography>
                <CustomTextArea
                  name="unitValue"
                  type="number"
                  placeholder="0.00"
                  value={localUnitValue}
                  onChange={(e) =>
                    handleNumChange(
                      "unitValue",
                      e.target.value,
                      setLocalUnitValue
                    )
                  }
                >
                  <Typography
                    sx={{ color: "text.secondary", fontSize: "0.9rem", ml: 1 }}
                  >
                    {symbol}
                  </Typography>
                </CustomTextArea>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  {dict.inventory.fields.weight} (KG)
                </Typography>
                <CustomTextArea
                  name="weightKg"
                  type="number"
                  placeholder="0.00"
                  value={localWeight}
                  onChange={(e) =>
                    handleNumChange("weightKg", e.target.value, setLocalWeight)
                  }
                />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  {dict.inventory.fields.volume} (M³)
                </Typography>
                <CustomTextArea
                  name="volumeM3"
                  type="number"
                  placeholder="0.000"
                  value={localVolume}
                  onChange={(e) =>
                    handleNumChange("volumeM3", e.target.value, setLocalVolume)
                  }
                />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  {dict.inventory.fields.pallets}
                </Typography>
                <CustomTextArea
                  name="palletCount"
                  type="number"
                  placeholder="0.0"
                  value={localPalletCount}
                  onChange={(e) =>
                    handleNumChange(
                      "palletCount",
                      e.target.value,
                      setLocalPalletCount
                    )
                  }
                />
              </Stack>
            </Grid>
          </Grid>

          <Stack spacing={1.5}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              {dict.inventory.dialogs.productImage}
            </Typography>
            <Box
              sx={{
                width: "100%",
                height: 160,
                borderRadius: 2,
                border: `2px dashed ${theme.palette.divider_alpha.main_10}`,
                bgcolor: theme.palette.background.paper_alpha.main_05,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                transition: "all 0.2s ease",
                overflow: "hidden",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  bgcolor: theme.palette.primary._alpha.main_02,
                },
              }}
            >
              {state.imageUrl ? (
                <Box
                  sx={{ position: "relative", width: "100%", height: "100%" }}
                >
                  <Box
                    component="img"
                    src={state.imageUrl}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      p: 1,
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => updateItemDetails({ imageUrl: "" })}
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
                    id="product-image-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          updateItemDetails({
                            imageUrl: event.target?.result as string,
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="product-image-upload"
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
                        fontSize: 40,
                        color: theme.palette.common.white_alpha.main_20,
                        mb: 1,
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {dict.inventory.dialogs.clickToUpload}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      PNG, JPG, WebP (Max 10MB)
                    </Typography>
                  </label>
                </>
              )}
            </Box>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ItemDetailsSection;
