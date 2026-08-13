"use client";

import { Box, Stack, Typography, TextField, useTheme } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { DriverStateData } from "@/app/lib/type/add-company-member";
import { Dictionary } from "@/app/lib/language/language";

interface ExtendedPalette {
  warning?: {
    _alpha?: Record<string, string>;
  };
}

interface DriverDetailsFormProps {
  driverData: DriverStateData;
  handleDriverDataChange: (field: keyof DriverStateData, value: string) => void;
  validationErrors: Record<string, string>;
  dict: Dictionary;
}

export default function DriverDetailsForm({ driverData, handleDriverDataChange, validationErrors, dict }: DriverDetailsFormProps) {
  const theme = useTheme();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;

  return (
    <Box sx={{ p: 2, borderRadius: 3, bgcolor: paletteTheme.warning?._alpha?.main_05, border: `1px solid ${paletteTheme.warning?._alpha?.main_20}` }}>
      <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 700, mb: 2, display: "block" }}>
        {dict.company.dialogs.driverDetailsRequired}
      </Typography>
      <Stack spacing={5}>
        <TextField
          fullWidth size="small" label={dict.drivers.fields.employeeId + " *"} placeholder="e.g. EMP-10023"
          value={driverData.employeeId} onChange={(e) => handleDriverDataChange("employeeId", e.target.value)}
          error={!!validationErrors.employeeId} helperText={validationErrors.employeeId || dict.company.dialogs.employeeIdHelper} required
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth size="small" label={dict.drivers.fields.phone + " *"} placeholder="e.g. +90 555 123 4567"
          value={driverData.phone} onChange={(e) => handleDriverDataChange("phone", e.target.value)}
          error={!!validationErrors.phone} helperText={validationErrors.phone || dict.company.dialogs.phoneHelper} required
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth size="small" label={dict.drivers.fields.licenseType} placeholder="e.g. B, C, CE, CDL-A"
          value={driverData.licenseType} onChange={(e) => handleDriverDataChange("licenseType", e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth size="small" label={dict.drivers.fields.licenseNumber} placeholder="e.g. 123456789"
          value={driverData.licenseNumber} onChange={(e) => handleDriverDataChange("licenseNumber", e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <DatePicker
          label={dict.drivers.fields.licenseExpiry}
          value={driverData.licenseExpiry ? dayjs(driverData.licenseExpiry) : null}
          onChange={(val) => handleDriverDataChange("licenseExpiry", val ? val.toISOString().split("T")[0] ?? "" : "")}
          format="DD/MM/YYYY"
          slotProps={{ textField: { fullWidth: true, size: "small", error: !!validationErrors.licenseExpiry, helperText: validationErrors.licenseExpiry, InputLabelProps: { shrink: true } } }}
        />
      </Stack>
    </Box>
  );
}
