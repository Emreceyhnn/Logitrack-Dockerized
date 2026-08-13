import { Box, Stack, Typography, Avatar, Button } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import StarIcon from "@mui/icons-material/Star";
import EmojiPeopleIcon from "@mui/icons-material/EmojiPeople";

import { Theme } from "@mui/material";
import { Dictionary } from "@/app/lib/language/language";
import { DriverWithUser } from "@/app/lib/type/vehicle";

interface ExtendedPalette {
  primary?: {
    _alpha?: Record<string, string>;
  };
  error?: {
    _alpha?: Record<string, string>;
  };
}

interface CurrentAssignmentSectionProps {
  currentDriver?: DriverWithUser | null | undefined;
  handleUnassign: () => Promise<void>;
  actionLoading: boolean;
  dict: Dictionary;
  theme: Theme;
}

export default function CurrentAssignmentSection({ currentDriver, handleUnassign, actionLoading, dict, theme }: CurrentAssignmentSectionProps) {
  const paletteTheme = theme.palette as unknown as ExtendedPalette;
  return (
    <Box>
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 1.5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>{dict.vehicles.dialogs.currentAssignment}</Typography>
      {currentDriver && currentDriver.user ? (
        <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", border: `1px solid ${theme.palette.divider}`, transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", background: theme.palette.mode === "dark" ? `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%)` : `linear-gradient(135deg, rgba(0,0,0,0.01) 0%, rgba(0,0,0,0.03) 100%)` }}>
          <Stack direction="row" alignItems="center" spacing={2.5}>
            <Box sx={{ position: "relative" }}>
              <Avatar src={currentDriver.user.avatarUrl || ""} sx={{ width: 56, height: 56, border: `2px solid ${paletteTheme.primary?._alpha?.main_30}` }}><PersonIcon /></Avatar>
              <Box sx={{ position: "absolute", bottom: -4, right: -4, bgcolor: theme.palette.success.main, width: 14, height: 14, borderRadius: "50%", border: `2px solid ${theme.palette.background.paper}` }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={800} color="text.primary" noWrap>{currentDriver.user.name} {currentDriver.user.surname}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <StarIcon sx={{ fontSize: 14, color: "#FFB400" }} />
                <Typography variant="caption" color="text.secondary">{currentDriver.rating || dict.common.na}/5 {dict.vehicles.dialogs.rating}</Typography>
              </Stack>
            </Box>
            <Button size="small" color="error" variant="outlined" onClick={handleUnassign} disabled={actionLoading} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, px: 2, borderColor: paletteTheme.error?._alpha?.main_30, "&:hover": { bgcolor: paletteTheme.error?._alpha?.main_10, borderColor: theme.palette.error.main } }}>{dict.vehicles.dialogs.unassign}</Button>
          </Stack>
        </Box>
      ) : (
        <Box sx={{ p: 3, borderRadius: 3, border: (theme) => `1px dashed ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" }}>
          <EmojiPeopleIcon sx={{ color: "text.disabled", fontSize: 32, opacity: 0.5 }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{dict.vehicles.dialogs.noDriverAssigned}</Typography>
        </Box>
      )}
    </Box>
  );
}
