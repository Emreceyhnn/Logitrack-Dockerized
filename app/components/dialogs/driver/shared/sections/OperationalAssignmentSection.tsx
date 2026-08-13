import { Box, Grid, MenuItem, Stack, Typography, useTheme } from "@mui/material";
import WarehouseIcon from "@mui/icons-material/HomeRepairService";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import { Warehouse } from "@/app/lib/type/enums";
import { VehicleWithRelations } from "@/app/lib/type/vehicle";
import { useFormikContext } from "formik";
import { DriverFormValues, EditDriverFormValues } from "@/app/lib/type/driver";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface OperationalAssignmentSectionProps {
  warehouses: Warehouse[];
  vehicles: VehicleWithRelations[];
}

export const OperationalAssignmentSection = ({
  warehouses,
  vehicles,
}: OperationalAssignmentSectionProps) => {
  const theme = useTheme();
  const dict = useDictionary();
  const { values, errors, touched, handleBlur, handleChange } =
    useFormikContext<DriverFormValues | EditDriverFormValues>();

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          sx={{
            p: 0.8,
            borderRadius: 1,
            bgcolor: theme.palette.primary._alpha.main_10,
            color: theme.palette.primary.main,
            display: "flex",
          }}
        >
          <WarehouseIcon fontSize="small" />
        </Box>
        <Typography variant="subtitle1" fontWeight={700} color="white">
          {dict.drivers.labels.operationalAssignment}
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, display: "block", fontWeight: 500 }}
          >
            {dict.drivers.fields.homeWarehouse}
          </Typography>
          <CustomTextArea
            name="homeWareHouseId"
            placeholder={dict.drivers.fields.homeWarehouse}
            value={values.homeWareHouseId}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.homeWareHouseId && Boolean(errors.homeWareHouseId)}
            helperText={
              touched.homeWareHouseId
                ? (errors.homeWareHouseId as string)
                : undefined
            }
            select
          >
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name}
              </MenuItem>
            ))}
          </CustomTextArea>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, display: "block", fontWeight: 500 }}
          >
            {dict.drivers.labels.vehicleAssignment}
          </Typography>
          <CustomTextArea
            name="currentVehicleId"
            placeholder={dict.common.noData}
            value={values.currentVehicleId}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.currentVehicleId && Boolean(errors.currentVehicleId)}
            helperText={
              touched.currentVehicleId
                ? (errors.currentVehicleId as string)
                : undefined
            }
            select
          >
            <MenuItem value="">{dict.common.noData}</MenuItem>
            {vehicles.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                {v.plate} ({v.brand} {v.model})
              </MenuItem>
            ))}
          </CustomTextArea>
        </Grid>
      </Grid>
    </Stack>
  );
};
