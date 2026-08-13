import {
  Dialog,
  DialogContent,
  Button,
  Typography,
  Box,
  Stack,
  IconButton,
  useTheme,
} from "@mui/material";
import {
  Logout as LogoutIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface LogoutConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function LogoutConfirmationDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
}: LogoutConfirmationDialogProps) {
  const dict = useDictionary();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          overflow: "hidden",
          borderRadius: 3,
          bgcolor: theme.palette.background.paper,
          backdropFilter: "blur(20px)",
        },
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                bgcolor: theme.palette.error._alpha.main_10,
                color: theme.palette.error.main,
                p: 1.25,
                borderRadius: 2.5,
                display: "flex",
              }}
            >
              <LogoutIcon />
            </Box>
            <Box>
              <Typography component="div" variant="h6" fontWeight={800} color="text.primary">
                {dict.common.logout}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  mt: 0.5,
                  display: "block",
                }}
              >
                {dict.common.confirmLogoutDescription}
              </Typography>
            </Box>
          </Stack>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: "text.secondary",
              transition: "all 0.2s",
              "&:hover": { 
                color: "error.main",
                bgcolor: "error._alpha.main_10"
              },
            }}
            disabled={loading}
           aria-label="close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <DialogContent sx={{ p: 3, pt: 1 }}>
        <Typography
          variant="body2"
          sx={{ 
            color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
            lineHeight: 1.6, 
            fontSize: "0.875rem" 
          }}
        >
          {dict.common.logoutWarning}
        </Typography>
      </DialogContent>

      <Box
        sx={{
          p: 3,
          pt: 2,
          bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            onClick={onClose}
            disabled={loading}
            sx={{
              color: "text.secondary",
              textTransform: "none",
              fontWeight: 600,
              px: 2,
              borderRadius: 2,
              "&:hover": {
                color: "text.primary",
                bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
              },
            }}
          >
            {dict.common.cancel}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={onConfirm}
            disabled={loading}
            sx={{
              textTransform: "none",
              borderRadius: 2.5,
              px: 3,
              fontWeight: 700,
              minWidth: 100,
              boxShadow: `0 8px 24px ${theme.palette.error._alpha.main_20}`,
              "&:hover": {
                bgcolor: theme.palette.error.dark,
                boxShadow: `0 12px 32px ${theme.palette.error._alpha.main_30}`,
              },
            }}
          >
            {loading ? "..." : dict.common.logout}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
