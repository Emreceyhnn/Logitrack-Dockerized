import { Box, Stack, Typography, Button } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

import { Theme } from "@mui/material";
import { Dictionary } from "@/app/lib/language/language";

interface ExtendedPalette {
  primary?: {
    _alpha?: Record<string, string>;
  };
}

interface FileAttachmentSectionProps {
  dict: Dictionary;
  theme: Theme;
  file: File | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  filePreview: string | null;
}

export default function FileAttachmentSection({ dict, theme, file, handleFileChange, filePreview }: FileAttachmentSectionProps) {
  return (
    <>
      <Box>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 1.5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>{dict.vehicles.dialogs.fileAttachment}</Typography>
        <Button component="label" fullWidth variant="outlined" startIcon={<CloudUploadIcon />} sx={{ height: 100, borderRadius: 3, borderStyle: "dashed", borderWidth: 2, borderColor: (theme) => theme.palette.mode === "dark" ? (theme.palette as unknown as ExtendedPalette).primary?._alpha?.main_30 : (theme.palette as unknown as ExtendedPalette).primary?._alpha?.main_40, bgcolor: (theme) => theme.palette.mode === "dark" ? (theme.palette as unknown as ExtendedPalette).primary?._alpha?.main_02 : "rgba(0,0,0,0.02)", flexDirection: "column", gap: 1, textTransform: "none", "&:hover": { bgcolor: (theme) => theme.palette.mode === "dark" ? (theme.palette as unknown as ExtendedPalette).primary?._alpha?.main_05 : "rgba(0,0,0,0.04)", borderColor: theme.palette.primary.main } }}>
          <Stack spacing={0.5} alignItems="center">
            <Typography variant="body2" fontWeight={700} color="text.primary">{file ? file.name : dict.vehicles.dialogs.selectOrDragFile}</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>{dict.vehicles.dialogs.fileFormats}</Typography>
          </Stack>
          <input type="file" hidden onChange={handleFileChange} accept=".jpg,.jpeg,.png" />
        </Button>
      </Box>

      {filePreview && (
        <Box>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 1, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>{dict.vehicles.dialogs.preview}</Typography>
          <Box sx={{ width: "100%", height: 160, borderRadius: 3, overflow: "hidden", border: `1px solid ${theme.palette.divider}`, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", position: "relative" }}>
            <Box component="img" src={filePreview} alt="File preview" sx={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
          </Box>
        </Box>
      )}
    </>
  );
}
