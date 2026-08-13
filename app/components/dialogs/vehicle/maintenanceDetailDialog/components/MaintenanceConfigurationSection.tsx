import { Box, Typography, Stack, FormControl, InputLabel, Select, MenuItem, TextField, InputAdornment, useTheme } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import BuildIcon from "@mui/icons-material/Build";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import TireRepairIcon from "@mui/icons-material/TireRepair";
import OpacityIcon from "@mui/icons-material/Opacity";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface MaintenanceConfigurationSectionProps {
  type: string;
  date: Dayjs;
  cost: string;
  symbol: string;
  onChangeType: (val: string) => void;
  onChangeDate: (val: Dayjs) => void;
  onChangeCost: (val: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  textFieldSx: Record<string, any>;
}

export const MaintenanceConfigurationSection = ({
  type,
  date,
  cost,
  symbol,
  onChangeType,
  onChangeDate,
  onChangeCost,
  textFieldSx,
}: MaintenanceConfigurationSectionProps) => {
  const theme = useTheme();
  const dict = useDictionary();

  const SERVICE_TYPES = [
    {
      value: "ROUTINE_MAINTENANCE",
      label: dict.vehicles.serviceTypes.ROUTINE_MAINTENANCE,
      icon: <SettingsIcon sx={{ fontSize: 18 }} />,
    },
    {
      value: "REPAIR",
      label: dict.vehicles.serviceTypes.REPAIR,
      icon: <BuildIcon sx={{ fontSize: 18 }} />,
    },
    {
      value: "INSPECTION",
      label: dict.vehicles.serviceTypes.INSPECTION,
      icon: <SearchIcon sx={{ fontSize: 18 }} />,
    },
    {
      value: "TIRE_CHANGE",
      label: dict.vehicles.serviceTypes.TIRE_CHANGE,
      icon: <TireRepairIcon sx={{ fontSize: 18 }} />,
    },
    {
      value: "OIL_CHANGE",
      label: dict.vehicles.serviceTypes.OIL_CHANGE,
      icon: <OpacityIcon sx={{ fontSize: 18 }} />,
    },
    {
      value: "OTHER",
      label: dict.vehicles.serviceTypes.OTHER,
      icon: <AssignmentIcon sx={{ fontSize: 18 }} />,
    },
  ];

  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontWeight: 700,
          mb: 1.5,
          display: "block",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {dict.vehicles.dialogs.configuration}
      </Typography>
      <Stack spacing={2.5}>
        <FormControl fullWidth sx={textFieldSx}>
          <InputLabel sx={{ color: "text.secondary" }}>
            {dict.vehicles.fields.serviceType}
          </InputLabel>
          <Select
            value={type}
            label={dict.vehicles.fields.serviceType}
            onChange={(e) => onChangeType(e.target.value)}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundImage: "none",
                  mt: 1,
                },
              },
            }}
          >
            {SERVICE_TYPES.map((st) => (
              <MenuItem key={st.value} value={st.value} sx={{ py: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      color: theme.palette.primary.main,
                      display: "flex",
                    }}
                  >
                    {st.icon}
                  </Box>
                  <Typography variant="body2">{st.label}</Typography>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <DatePicker
          label={dict.vehicles.dialogs.servicedOn}
          value={date}
          onChange={(newValue) => onChangeDate(newValue || dayjs())}
          slotProps={{
            textField: {
              fullWidth: true,
              sx: textFieldSx,
              InputLabelProps: { shrink: true },
            },
          }}
        />

        <TextField
          label={dict.vehicles.fields.cost}
          type="number"
          placeholder="0.00"
          value={cost}
          onChange={(e) => onChangeCost(e.target.value)}
          fullWidth
          sx={textFieldSx}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Typography
                  sx={{ color: "text.secondary", fontSize: "0.9rem" }}
                >
                  {symbol}
                </Typography>
              </InputAdornment>
            ),
          }}
        />
      </Stack>
    </Box>
  );
};
