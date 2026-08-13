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
  Warning as WarningIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  loading?: boolean;
}

export default function DeleteConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  loading = false,
}: DeleteConfirmationDialogProps) {
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
                borderRadius: 2,
                display: "flex",
              }}
            >
              <WarningIcon />
            </Box>
            <Box>
              <Typography component="div" variant="h6" fontWeight={800} color="text.primary">
                {title}
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
                {dict.common.thisActionCannotBeUndone}
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
          {description}
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
              borderRadius: 2,
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
            {loading ? dict.common.deleting : dict.common.confirmDelete}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
