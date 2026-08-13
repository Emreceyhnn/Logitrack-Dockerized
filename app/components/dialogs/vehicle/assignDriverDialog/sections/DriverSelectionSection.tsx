import { Box, Stack, Typography, Avatar, FormControl, InputLabel, Select, MenuItem, CircularProgress } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import StarIcon from "@mui/icons-material/Star";

import { Theme } from "@mui/material";
import { Dictionary } from "@/app/lib/language/language";
import { DriverWithUser } from "@/app/lib/type/vehicle";

interface DriverSelectionSectionProps {
  loading: boolean;
  drivers: DriverWithUser[];
  selectedDriverId: string;
  setSelectedDriverId: (id: string) => void;
  dict: Dictionary;
  theme: Theme;
}

export default function DriverSelectionSection({ loading, drivers, selectedDriverId, setSelectedDriverId, dict, theme }: DriverSelectionSectionProps) {
  const textFieldSx = { "& .MuiOutlinedInput-root": { borderRadius: 2, height: 48, "& fieldset": { borderColor: "divider" }, "&:hover fieldset": { borderColor: "primary.main" } }, "& .MuiInputLabel-root": { fontSize: "0.85rem" }, "& .MuiOutlinedInput-input": { fontSize: "0.9rem" } };
  return (
    <Box>
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 1.5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>{dict.vehicles.dialogs.assignNewDriver}</Typography>
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}><CircularProgress size={28} /></Box>
      ) : (
        <FormControl fullWidth sx={textFieldSx}>
          <InputLabel sx={{ color: "text.secondary" }}>{dict.vehicles.dialogs.selectDriver}</InputLabel>
          <Select value={selectedDriverId} label={dict.vehicles.dialogs.selectDriver} onChange={(e) => setSelectedDriverId(e.target.value)} MenuProps={{ PaperProps: { sx: { backgroundImage: "none", mt: 1, "& .MuiMenuItem-root": { py: 1.5 } } } }}>
            {drivers.length === 0 ? (
              <MenuItem disabled value="" sx={{ color: "text.secondary" }}>{dict.vehicles.dialogs.noDriversFound}</MenuItem>
            ) : (
              drivers.map((driver: DriverWithUser) => (
                <MenuItem key={driver.id} value={driver.id}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ width: "100%" }}>
                    <Avatar src={driver.user?.avatarUrl || ""} sx={{ width: 32, height: 32, border: `1px solid ${theme.palette.divider}` }}><PersonIcon /></Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={700} color="text.primary">{driver.user?.name} {driver.user?.surname}</Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <StarIcon sx={{ fontSize: 10, color: "#FFB400" }} />
                        <Typography variant="caption" color="text.secondary">{driver.rating}/{dict.vehicles.dialogs.rating}</Typography>
                      </Stack>
                    </Box>
                  </Stack>
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      )}
    </Box>
  );
}
