import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Stack } from "@mui/material";
import { MaintenanceStatus } from "@/app/lib/type/enums";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface MaintenanceStatusSectionProps {
  status: MaintenanceStatus;
  onChange: (status: MaintenanceStatus) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  textFieldSx: Record<string, any>;
}

export const MaintenanceStatusSection = ({ status, onChange, textFieldSx }: MaintenanceStatusSectionProps) => {
  const dict = useDictionary();

  const MAINTENANCE_STATUSES = [
    {
      value: "SCHEDULED",
      label: dict.vehicles.statuses.SCHEDULED,
      color: "#F6AD55",
    },
    {
      value: "IN_PROGRESS",
      label: dict.vehicles.statuses.IN_PROGRESS,
      color: "#4299E1",
    },
    {
      value: "COMPLETED",
      label: dict.vehicles.statuses.COMPLETED,
      color: "#48BB78",
    },
    {
      value: "CANCELLED",
      label: dict.vehicles.statuses.CANCELLED,
      color: "#F56565",
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
        {dict.vehicles.dialogs.maintenanceStatus}
      </Typography>
      <FormControl fullWidth sx={textFieldSx}>
        <InputLabel sx={{ color: "text.secondary" }}>
          {dict.vehicles.fields.status}
        </InputLabel>
        <Select
          value={status}
          label={dict.vehicles.fields.status}
          onChange={(e) => onChange(e.target.value as MaintenanceStatus)}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundImage: "none",
                mt: 1,
              },
            },
          }}
        >
          {MAINTENANCE_STATUSES.map((st) => (
            <MenuItem
              key={st.value}
              value={st.value}
              sx={{ py: 1.5 }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: st.color,
                  }}
                />
                <Typography variant="body2">{st.label}</Typography>
              </Stack>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
