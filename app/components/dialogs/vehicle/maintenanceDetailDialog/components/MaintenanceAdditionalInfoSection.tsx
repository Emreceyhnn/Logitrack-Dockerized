import { Box, Typography, Stack, TextField, Button, CircularProgress, IconButton, Tooltip } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import SignedDocThumbnail from "@/app/components/shared/SignedDocThumbnail";
import { openSignedDoc } from "@/app/lib/openSignedDoc";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { ChangeEvent, RefObject } from "react";

interface MaintenanceAdditionalInfoSectionProps {
  description: string;
  documentUrl: string;
  uploading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  textFieldSx: Record<string, any>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onChangeDescription: (val: string) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveDocument: () => void;
}

export const MaintenanceAdditionalInfoSection = ({
  description,
  documentUrl,
  uploading,
  textFieldSx,
  fileInputRef,
  onChangeDescription,
  onFileChange,
  onRemoveDocument,
}: MaintenanceAdditionalInfoSectionProps) => {
  const dict = useDictionary();

  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontWeight: 700,
          mb: 1.5,
          display: "block",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {dict.vehicles.dialogs.additionalInfo}
      </Typography>
      <Stack spacing={2.5}>
        <TextField
          label={dict.vehicles.dialogs.technicianNotes}
          placeholder={
            dict.vehicles.dialogs.technicianNotesDesc ||
            "Briefly describe the work performed..."
          }
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          fullWidth
          multiline
          rows={3}
          sx={{
            ...textFieldSx,
            "& .MuiOutlinedInput-root": {
              ...textFieldSx["& .MuiOutlinedInput-root"],
              height: "auto",
              padding: "12px 14px",
            },
          }}
          InputLabelProps={{ shrink: true }}
        />

        {/* Document Upload Section */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              mb: 1,
              display: "block",
            }}
          >
            {dict.vehicles.dialogs.attachDocument}
          </Typography>

          {!documentUrl ? (
            <Button
              component="label"
              variant="outlined"
              fullWidth
              disabled={uploading}
              startIcon={
                uploading ? (
                  <CircularProgress size={20} />
                ) : (
                  <CloudUploadIcon />
                )
              }
              sx={{
                height: 80,
                borderStyle: "dashed",
                borderRadius: 2,
                textTransform: "none",
                color: "text.secondary",
                borderColor: "divider",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "primary._alpha.main_05",
                },
              }}
            >
              {uploading
                ? dict.toasts.loading
                : dict.vehicles.dialogs.newFileUpload}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={onFileChange}
                ref={fileInputRef}
              />
            </Button>
          ) : (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <SignedDocThumbnail url={documentUrl} />
              <Box
                sx={{ flexGrow: 1, minWidth: 0, cursor: "pointer" }}
                onClick={() => openSignedDoc(documentUrl)}
              >
                <Typography variant="body2" noWrap fontWeight={600}>
                  {dict.vehicles.dialogs.viewDocument}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {dict.vehicles.dialogs.deleteAttachmentNote}
                </Typography>
              </Box>
              <Tooltip title="Sil">
                <IconButton
                  size="small"
                  color="error"
                  onClick={onRemoveDocument}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
};
