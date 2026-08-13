"use client";

import { Box, Stack, Typography, FormControl, InputLabel, Select, MenuItem, TextField, InputAdornment, useTheme } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import BuildIcon from "@mui/icons-material/Build";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import TireRepairIcon from "@mui/icons-material/TireRepair";
import OpacityIcon from "@mui/icons-material/Opacity";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { Dictionary } from "@/app/lib/language/language";
import dayjs, { Dayjs } from "dayjs";
import { MaintenanceStatus } from "@/app/lib/type/enums";
import { SxProps, Theme } from "@mui/material";
import { Dispatch, SetStateAction } from "react";

interface MaintenanceFormData {
  type: string;
  date: Dayjs;
  cost: string;
  status: MaintenanceStatus;
  description: string;
  documentUrl: string;
}

interface MaintenanceFormConfigurationProps {
  dict: Dictionary;
  userCurrency: string;
  formData: MaintenanceFormData;
  setFormData: Dispatch<SetStateAction<MaintenanceFormData>>;
  textFieldSx: SxProps<Theme>;
}

export default function MaintenanceFormConfiguration({ dict, userCurrency, formData, setFormData, textFieldSx }: MaintenanceFormConfigurationProps) {
  const theme = useTheme();

  const SERVICE_TYPES = [
    { value: "ROUTINE_MAINTENANCE", label: dict.vehicles.serviceTypes.ROUTINE_MAINTENANCE, icon: <SettingsIcon sx={{ fontSize: 18 }} /> },
    { value: "REPAIR", label: dict.vehicles.serviceTypes.REPAIR, icon: <BuildIcon sx={{ fontSize: 18 }} /> },
    { value: "INSPECTION", label: dict.vehicles.serviceTypes.INSPECTION, icon: <SearchIcon sx={{ fontSize: 18 }} /> },
    { value: "TIRE_CHANGE", label: dict.vehicles.serviceTypes.TIRE_CHANGE, icon: <TireRepairIcon sx={{ fontSize: 18 }} /> },
    { value: "OIL_CHANGE", label: dict.vehicles.serviceTypes.OIL_CHANGE, icon: <OpacityIcon sx={{ fontSize: 18 }} /> },
    { value: "OTHER", label: dict.vehicles.serviceTypes.OTHER, icon: <AssignmentIcon sx={{ fontSize: 18 }} /> },
  ];

  const MAINTENANCE_STATUSES = [
    { value: "SCHEDULED", label: dict.vehicles.statuses.SCHEDULED, color: "#F6AD55" },
    { value: "IN_PROGRESS", label: dict.vehicles.statuses.IN_PROGRESS, color: "#4299E1" },
    { value: "COMPLETED", label: dict.vehicles.statuses.COMPLETED, color: "#48BB78" },
    { value: "CANCELLED", label: dict.vehicles.statuses.CANCELLED, color: "#F56565" },
  ];

  return (
    <Box>
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 1.5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>
        {dict.vehicles.dialogs.configuration}
      </Typography>
      <Stack spacing={2.5}>
        <FormControl fullWidth sx={textFieldSx}>
          <InputLabel sx={{ color: "text.secondary" }}>{dict.vehicles.dialogs.maintenanceStatus}</InputLabel>
          <Select value={formData.status} label={dict.vehicles.dialogs.maintenanceStatus} onChange={(e) => setFormData({ ...formData, status: e.target.value })} MenuProps={{ PaperProps: { sx: { backgroundImage: "none", mt: 1 } } }}>
            {MAINTENANCE_STATUSES.map((status) => (
              <MenuItem key={status.value} value={status.value} sx={{ py: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: status.color }} />
                  <Typography variant="body2">{status.label}</Typography>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={textFieldSx}>
          <InputLabel sx={{ color: "text.secondary" }}>{dict.vehicles.fields.serviceType}</InputLabel>
          <Select value={formData.type} label={dict.vehicles.fields.serviceType} onChange={(e) => setFormData({ ...formData, type: e.target.value })} MenuProps={{ PaperProps: { sx: { backgroundImage: "none", mt: 1 } } }}>
            {SERVICE_TYPES.map((st) => (
              <MenuItem key={st.value} value={st.value} sx={{ py: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ color: theme.palette.primary.main, display: "flex" }}>{st.icon}</Box>
                  <Typography variant="body2">{st.label}</Typography>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <DatePicker
          label={dict.vehicles.dialogs.servicedOn}
          value={formData.date}
          onChange={(newValue) => setFormData({ ...formData, date: newValue || dayjs() })}
          slotProps={{ textField: { fullWidth: true, sx: textFieldSx, InputLabelProps: { shrink: true } } }}
        />

        <TextField
          label={dict.vehicles.fields.cost}
          type="number"
          placeholder="0.00"
          value={formData.cost}
          onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
          fullWidth
          sx={textFieldSx}
          InputLabelProps={{ shrink: true }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Typography sx={{ color: "text.secondary", fontSize: "0.9rem" }}>{userCurrency}</Typography></InputAdornment> }}
        />
      </Stack>
    </Box>
  );
}
