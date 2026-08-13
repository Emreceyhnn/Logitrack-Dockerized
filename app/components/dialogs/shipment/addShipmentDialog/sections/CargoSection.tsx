import { Box, Grid, Stack, Typography, MenuItem } from "@mui/material";
import { useFormikContext } from "formik";
import { ShipmentFormValues } from "@/app/lib/type/shipment";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import MonitorWeightIcon from "@mui/icons-material/MonitorWeight";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import InventoryIcon from "@mui/icons-material/Inventory";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { TrailerWithRelations } from "@/app/lib/type/trailer";

interface CargoSectionProps {
  trailers: TrailerWithRelations[];
}

const CargoSection = ({ trailers }: CargoSectionProps) => {
  /* -------------------------------- variables ------------------------------- */
  const dict = useDictionary();

  const { values, setFieldValue, handleBlur, touched, errors } =
    useFormikContext<ShipmentFormValues>();

  const selectedTrailer = trailers.find((t) => t.id === values.trailerId);
  
  // Calculate available capacity
  // Note: For editing, this component needs to know the original shipment load to correctly show "Available" 
  // but since we are focusing on providing immediate feedback, we'll use the current trailer's stated load.
  const currentOccupancyWeight = selectedTrailer?.currentWeightKg || 0;
  const currentOccupancyVolume = selectedTrailer?.currentVolumeM3 || 0;
  
  const availableWeight = selectedTrailer ? selectedTrailer.maxLoadKg - currentOccupancyWeight : 0;
  const availableVolume = selectedTrailer ? selectedTrailer.capacityVolumeM3 - currentOccupancyVolume : 0;

  // Use a small epsilon for floating point comparisons and ensure capacity is defined
  const tolerance = 0.01;
  const isWeightOver =
    selectedTrailer &&
    selectedTrailer.maxLoadKg > 0 &&
    Math.round(values.weightKg * 100) / 100 > availableWeight + tolerance;
    
  const isVolumeOver =
    selectedTrailer &&
    selectedTrailer.capacityVolumeM3 > 0 &&
    Math.round(values.volumeM3 * 100) / 100 > availableVolume + tolerance;

  return (
    <Box>
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: "primary.main",
            }}
          />
          <Typography variant="subtitle2" fontWeight={700} color="white">
            {dict.shipments.dialogs.sections.cargoDetails}
          </Typography>
        </Stack>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.shipments.dialogs.fields.weight}
              </Typography>
              <CustomTextArea
                name="weightKg"
                type="number"
                placeholder="0.00"
                value={values.weightKg.toString()}
                onBlur={handleBlur}
                error={Boolean(errors.weightKg)}
                helperText={
                  (errors.weightKg as string) || undefined
                }
                onChange={(e) =>
                  setFieldValue("weightKg", parseFloat(e.target.value) || 0)
                }
              >
                <MonitorWeightIcon
                  sx={{ fontSize: 18, color: "text.secondary" }}
                />
              </CustomTextArea>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.shipments.dialogs.fields.volume}
              </Typography>
              <CustomTextArea
                name="volumeM3"
                type="number"
                placeholder="0.00"
                value={values.volumeM3.toString()}
                onBlur={handleBlur}
                error={Boolean(errors.volumeM3)}
                helperText={
                  (errors.volumeM3 as string) || undefined
                }
                onChange={(e) =>
                  setFieldValue("volumeM3", parseFloat(e.target.value) || 0)
                }
              >
                <ViewInArIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              </CustomTextArea>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.shipments.dialogs.fields.palletCount}
              </Typography>
              <CustomTextArea
                name="palletCount"
                type="number"
                placeholder="Qty"
                value={values.palletCount.toString()}
                onBlur={handleBlur}
                error={touched.palletCount && Boolean(errors.palletCount)}
                helperText={
                  touched.palletCount
                    ? (errors.palletCount as string)
                    : undefined
                }
                onChange={(e) =>
                  setFieldValue("palletCount", parseInt(e.target.value) || 0)
                }
              >
                <InventoryIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              </CustomTextArea>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.shipments.dialogs.fields.cargoType}
              </Typography>
              <CustomTextArea
                name="cargoType"
                select
                value={values.cargoType}
                onBlur={handleBlur}
                error={touched.cargoType && Boolean(errors.cargoType)}
                helperText={
                  touched.cargoType ? (errors.cargoType as string) : undefined
                }
                onChange={(e) => setFieldValue("cargoType", e.target.value)}
              >
                <MenuItem value="General Cargo">{dict.inventory?.dialogs?.cargoTypes?.["General Cargo"] || "General Cargo"}</MenuItem>
                <MenuItem value="Perishable Goods">{dict.inventory?.dialogs?.cargoTypes?.["Perishable Goods"] || "Perishable Goods"}</MenuItem>
                <MenuItem value="Hazardous Materials">{dict.inventory?.dialogs?.cargoTypes?.["Hazardous Materials"] || "Hazardous Materials"}</MenuItem>
                <MenuItem value="Fragile Goods">{dict.inventory?.dialogs?.cargoTypes?.["Fragile Goods"] || "Fragile Goods"}</MenuItem>
                <MenuItem value="Liquid Cargo">{dict.inventory?.dialogs?.cargoTypes?.["Liquid Cargo"] || "Liquid Cargo"}</MenuItem>
                <MenuItem value="Oversized Cargo">{dict.inventory?.dialogs?.cargoTypes?.["Oversized Cargo"] || "Oversized Cargo"}</MenuItem>
              </CustomTextArea>
            </Stack>
          </Grid>
        </Grid>

        {/* Trailer Capacity Alerts */}
        {(isWeightOver || isVolumeOver) && (
          <Stack spacing={1} sx={{ mt: 1 }}>
            {isWeightOver && (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  color: "error.main",
                  bgcolor: (theme) => theme.palette.error._alpha.main_10,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  border: (theme) =>
                    `1px solid ${theme.palette.error._alpha.main_20}`,
                }}
              >
                <MonitorWeightIcon sx={{ fontSize: 18 }} />
                <Typography variant="caption" fontWeight={700}>
                  {dict.shipments.dialogs.fields.exceedsTrailerWeight}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {dict.shipments.dialogs.fields.availableKg || "Available:"} <b>{availableWeight.toFixed(2)} kg</b> (Max: {selectedTrailer?.maxLoadKg})
                </Typography>
              </Stack>
            )}
            {isVolumeOver && (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  color: "error.main",
                  bgcolor: (theme) => theme.palette.error._alpha.main_10,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  border: (theme) =>
                    `1px solid ${theme.palette.error._alpha.main_20}`,
                }}
              >
                <ViewInArIcon sx={{ fontSize: 18 }} />
                <Typography variant="caption" fontWeight={700}>
                  {dict.shipments.dialogs.fields.exceedsTrailerVolume}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {dict.shipments.dialogs.fields.availableVol || "Available:"} <b>{availableVolume.toFixed(2)} m³</b> (Max: {selectedTrailer?.capacityVolumeM3})
                </Typography>
              </Stack>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default CargoSection;
