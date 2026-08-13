import {
  Box,
  Card,
  Stack,
  Typography,
  Divider,
  MenuItem,
  Select,
  FormControl,
  useTheme,
} from "@mui/material";
import { VehicleStatus } from "@/app/lib/type/enums";
import { VehicleWithRelations } from "@/app/lib/type/vehicle";
import { getStatusMeta } from "@/app/lib/priorityColor";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface VehicleStatusCardProps {
  vehicle: VehicleWithRelations;
  handleVehicleStatusChange: (newStatus: VehicleStatus) => void;
}

export const VehicleStatusCard = ({
  vehicle,
  handleVehicleStatusChange,
}: VehicleStatusCardProps) => {
  const dict = useDictionary();
  const theme = useTheme();

  return (
    <Card
      sx={{
        p: 2,
        flex: 1,
        gap: 1,
        display: "flex",
        flexDirection: "column",
        borderRadius: "8px",
        justifyContent: "space-evenly",
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.03)"
            : "rgba(0,0,0,0.02)",
        backgroundImage: "none",
        boxShadow: "none",
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Stack
        direction={"row"}
        alignItems={"center"}
        justifyContent={"space-between"}
      >
        <Typography
          sx={{ fontSize: 16, fontWeight: 300, color: "text.secondary" }}
        >
          {dict.vehicles.dialogs.vehicleStatus}
        </Typography>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: getStatusMeta(vehicle.status, dict).color,
          }}
        />
      </Stack>
      <FormControl fullWidth size="small" sx={{ mt: 1 }}>
        <Select
          value={vehicle.status}
          onChange={(e) =>
            handleVehicleStatusChange(e.target.value as VehicleStatus)
          }
          sx={{
            color: "text.primary",
            fontSize: "1.1rem",
            fontWeight: 800,
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            "& .MuiSelect-select": { paddingLeft: "8px" },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundImage: "none",
              },
            },
          }}
        >
          <MenuItem value={VehicleStatus.AVAILABLE}>
            {dict.vehicles.statuses.AVAILABLE}
          </MenuItem>
          <MenuItem value={VehicleStatus.ON_TRIP}>
            {dict.vehicles.statuses.ON_TRIP}
          </MenuItem>
          <MenuItem value={VehicleStatus.MAINTENANCE}>
            {dict.vehicles.statuses.MAINTENANCE}
          </MenuItem>
          <MenuItem value={VehicleStatus.OUT_OF_ORDER}>
            {dict.vehicles.statuses.OUT_OF_ORDER}
          </MenuItem>
        </Select>
      </FormControl>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 200,
          color: "text.secondary",
          mt: 0.5,
        }}
      >
        {dict.vehicles.dialogs.manageAvailability}
      </Typography>
      <Divider sx={{ mt: 1, color: "text.disabled" }} />
      <Stack
        direction={"row"}
        alignItems={"center"}
        justifyContent={"space-between"}
        mt={1}
      >
        <Typography
          sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary" }}
        >
          {dict.vehicles.fields.service}
        </Typography>
        <Typography
          sx={{ fontSize: 13, fontWeight: 300, color: "info.main" }}
        >
          {vehicle.nextServiceKm && vehicle.odometerKm
            ? `${(
                vehicle.nextServiceKm - vehicle.odometerKm
              ).toLocaleString("en-US")} ${dict.vehicles.dialogs.kmLeft}`
            : dict.common.na}
        </Typography>
      </Stack>
    </Card>
  );
};
