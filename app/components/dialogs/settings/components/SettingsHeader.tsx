import { Box, Stack, Typography, IconButton } from "@mui/material";
import {
  Close as CloseIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface HeaderProps {
  onClose: () => void;
}

export default function SettingsHeader({ onClose }: HeaderProps) {
  const dict = useDictionary();

  return (
    <Box sx={{ px: 3, pt: 3, pb: 0 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2.5,
              bgcolor: "primary._alpha.main_12",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)",
              border: "1px solid theme.palette.primary._alpha.main_20",
            }}
          >
            <SettingsIcon sx={{ fontSize: 20, color: "primary.main" }} />
          </Box>
          <Box>
            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={{ letterSpacing: -0.2, color: "text.primary" }}
            >
              {dict.settings.dialogs.systemConfiguration}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
              }}
            >
              {dict.settings.dialogs.adjustRegional}
            </Typography>
          </Box>
        </Stack>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            color: "text.secondary",
            transition: "all 0.2s",
            "&:hover": {
              color: "error.main",
              bgcolor: "error._alpha.main_10",
              transform: "rotate(90deg)",
            },
          }}
         aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}
