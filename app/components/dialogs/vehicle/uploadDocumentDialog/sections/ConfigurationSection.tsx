import { Box, Stack, Typography, FormControl, InputLabel, Select, MenuItem, TextField } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import BadgeIcon from "@mui/icons-material/Badge";
import AssignmentIcon from "@mui/icons-material/Assignment";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import BuildIcon from "@mui/icons-material/Build";
import { Theme } from "@mui/material";
import { Dictionary } from "@/app/lib/language/language";
import { Dayjs } from "dayjs";

export const textFieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: 2, height: 48, "& fieldset": { borderColor: "divider" }, "&:hover fieldset": { borderColor: "primary.main" } },
  "& .MuiInputLabel-root": { fontSize: "0.85rem" }, "& .MuiOutlinedInput-input": { fontSize: "0.9rem" },
};

interface ConfigurationSectionProps {
  dict: Dictionary;
  theme: Theme;
  type: string;
  setType: (type: string) => void;
  name: string;
  setName: (name: string) => void;
  expiryDate: Dayjs | null;
  setExpiryDate: (date: Dayjs | null) => void;
}

export default function ConfigurationSection({ dict, theme, type, setType, name, setName, expiryDate, setExpiryDate }: ConfigurationSectionProps) {
  const DOCUMENT_TYPES = [
    { value: "REGISTRATION", label: dict.vehicles.docTypes.REGISTRATION, icon: <BadgeIcon sx={{ fontSize: 18 }} /> },
    { value: "INSURANCE", label: dict.vehicles.docTypes.INSURANCE, icon: <VerifiedUserIcon sx={{ fontSize: 18 }} /> },
    { value: "LICENSE", label: dict.vehicles.docTypes.LICENSE, icon: <LocalLibraryIcon sx={{ fontSize: 18 }} /> },
    { value: "INSPECTION", label: dict.vehicles.docTypes.INSPECTION, icon: <BadgeIcon sx={{ fontSize: 18 }} /> },
    { value: "MAINTENANCE", label: dict.vehicles.docTypes.MAINTENANCE, icon: <BuildIcon sx={{ fontSize: 18 }} /> },
    { value: "OTHER", label: dict.vehicles.docTypes.OTHER, icon: <AssignmentIcon sx={{ fontSize: 18 }} /> },
  ];

  return (
    <Box>
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 1, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>{dict.vehicles.dialogs.configuration}</Typography>
      <Stack spacing={2.5}>
        <FormControl fullWidth sx={textFieldSx}>
          <InputLabel sx={{ color: "text.secondary" }}>{dict.common.docType}</InputLabel>
          <Select value={type} label={dict.common.docType} onChange={(e) => setType(e.target.value)} MenuProps={{ PaperProps: { sx: { backgroundImage: "none", mt: 1 } } }}>
            {DOCUMENT_TYPES.map((dt) => (
              <MenuItem key={dt.value} value={dt.value} sx={{ py: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ color: theme.palette.primary.main, display: "flex" }}>{dt.icon}</Box>
                  <Typography variant="body2">{dt.label}</Typography>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label={dict.vehicles.dialogs.docName} placeholder={dict.vehicles.dialogs.docNamePlaceholder} value={name} onChange={(e) => setName(e.target.value)} fullWidth sx={textFieldSx} InputLabelProps={{ shrink: true }} />
        <DatePicker label={dict.vehicles.dialogs.expiryDate} value={expiryDate} onChange={(newValue) => setExpiryDate(newValue)} slotProps={{ textField: { fullWidth: true, sx: textFieldSx, InputLabelProps: { shrink: true } } }} />
      </Stack>
    </Box>
  );
}
