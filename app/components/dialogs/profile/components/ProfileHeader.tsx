import { Box, Stack, Typography, IconButton, useTheme } from "@mui/material";
import { Close as CloseIcon, Person as PersonIcon } from "@mui/icons-material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface HeaderProps {
  onClose: () => void;
}

export default function ProfileHeader({ onClose }: HeaderProps) {
  const theme = useTheme();
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
              bgcolor: theme.palette.primary._alpha.main_12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)",
              border: `1px solid ${theme.palette.primary._alpha.main_20}`,
            }}
          >
            <PersonIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} color="white" sx={{ letterSpacing: -0.2 }}>
              {dict.profile.title}
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.common.white_alpha.main_45, fontWeight: 500 }}>
              {dict.profile.subtitle}
            </Typography>
          </Box>
        </Stack>
        <IconButton 
          size="small" 
          onClick={onClose} 
          sx={{ 
            color: theme.palette.common.white_alpha.main_30, 
            transition: "all 0.2s",
            "&:hover": { 
              color: theme.palette.error.main, 
              bgcolor: theme.palette.error._alpha.main_10,
              transform: "rotate(90deg)"
            } 
          }}
         aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}
