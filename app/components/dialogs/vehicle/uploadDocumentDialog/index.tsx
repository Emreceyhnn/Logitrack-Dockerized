import { Box, Dialog, DialogContent, Button, Stack, Alert, CircularProgress, IconButton, Typography, useTheme } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useUploadDocument } from "@/app/hooks/useUploadDocument";
import ConfigurationSection from "./sections/ConfigurationSection";
import FileAttachmentSection from "./sections/FileAttachmentSection";

interface UploadDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  vehicleId: string;
  onSuccess: () => void;
}

interface ExtendedPalette {
  primary?: {
    _alpha?: Record<string, string>;
  };
  error?: {
    _alpha?: Record<string, string>;
  };
}

export default function UploadDocumentDialog({ open, onClose, vehicleId, onSuccess }: UploadDocumentDialogProps) {
  const dict = useDictionary();
  const theme = useTheme();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;
  const { type, setType, name, setName, expiryDate, setExpiryDate, file, filePreview, loading, error, handleFileChange, handleSubmit, handleClose } = useUploadDocument(vehicleId, onSuccess, onClose, dict);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" PaperProps={{ sx: { overflow: "hidden" } }}>
      <Box sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography component="div" variant="h6" fontWeight={800} color="text.primary">{dict.vehicles.dialogs.uploadDocumentTitle}</Typography>
          <IconButton onClick={handleClose} size="small" sx={{ color: "text.secondary" }} aria-label="close"><CloseIcon fontSize="small" /></IconButton>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block", fontWeight: 500 }}>{dict.vehicles.dialogs.uploadDocumentDesc}</Typography>
      </Box>

      <DialogContent sx={{ p: 3, pt: 1 }}>
        <Stack spacing={3} mt={1}>
          {error && <Alert severity="error" variant="filled" sx={{ borderRadius: 2, bgcolor: (theme) => theme.palette.mode === "dark" ? paletteTheme.error?._alpha?.main_10 : paletteTheme.error?._alpha?.main_05, color: "error.light", border: `1px solid ${paletteTheme.error?._alpha?.main_20}` }}>{error}</Alert>}
          <ConfigurationSection dict={dict} theme={theme} type={type} setType={setType} name={name} setName={setName} expiryDate={expiryDate} setExpiryDate={setExpiryDate} />
          <FileAttachmentSection dict={dict} theme={theme} file={file} handleFileChange={handleFileChange} filePreview={filePreview} />
        </Stack>
      </DialogContent>

      <Box sx={{ p: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={handleClose} disabled={loading} sx={{ color: "text.secondary", textTransform: "none", fontWeight: 600 }}>{dict.common.cancel}</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={loading || !file} sx={{ textTransform: "none", borderRadius: 2, px: 4, boxShadow: `0 8px 24px ${paletteTheme.primary?._alpha?.main_20}`, fontWeight: 700, minWidth: 140 }}>
            {loading ? <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={16} color="inherit" /><span>{dict.common.uploading}</span></Stack> : dict.vehicles.dialogs.startUpload}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
