"use client";

import { Box, Stack, Typography, TextField, Button, CircularProgress, Tooltip, IconButton } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import SignedDocThumbnail from "@/app/components/shared/SignedDocThumbnail";
import { openSignedDoc } from "@/app/lib/openSignedDoc";

import { Dictionary } from "@/app/lib/language/language";
import { Dayjs } from "dayjs";
import { MaintenanceStatus } from "@/app/lib/type/enums";
import { Dispatch, SetStateAction } from "react";

interface MaintenanceFormData {
  type: string;
  date: Dayjs;
  cost: string;
  status: MaintenanceStatus;
  description: string;
  documentUrl: string;
}

interface TextFieldSxType {
  "& .MuiOutlinedInput-root"?: Record<string, unknown>;
  "& .MuiInputLabel-root"?: Record<string, unknown>;
  "& .MuiOutlinedInput-input"?: Record<string, unknown>;
}

interface MaintenanceFormDetailsProps {
  dict: Dictionary;
  formData: MaintenanceFormData;
  setFormData: Dispatch<SetStateAction<MaintenanceFormData>>;
  textFieldSx: TextFieldSxType;
  uploading: boolean;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function MaintenanceFormDetails({ dict, formData, setFormData, textFieldSx, uploading, handleFileChange, fileInputRef }: MaintenanceFormDetailsProps) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 1.5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>
        {dict.vehicles.dialogs.additionalInfo}
      </Typography>
      <Stack spacing={2.5}>
        <TextField
          label={dict.vehicles.dialogs.technicianNotes}
          placeholder={dict.vehicles.dialogs.technicianNotesDesc || "Briefly describe the work performed..."}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          fullWidth
          multiline
          rows={3}
          sx={{ ...textFieldSx, "& .MuiOutlinedInput-root": { ...textFieldSx["& .MuiOutlinedInput-root"], height: "auto", padding: "12px 14px" } }}
          InputLabelProps={{ shrink: true }}
        />

        <Box>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, mb: 1, display: "block" }}>
            {dict.vehicles.dialogs.attachDocument}
          </Typography>

          {!formData.documentUrl ? (
            <Button
              component="label"
              variant="outlined"
              fullWidth
              disabled={uploading}
              startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
              sx={{ height: 80, borderStyle: "dashed", borderRadius: 2, textTransform: "none", color: "text.secondary", borderColor: "divider", "&:hover": { borderColor: "primary.main", bgcolor: "primary._alpha.main_05" } }}
            >
              {uploading ? dict.toasts.loading : dict.vehicles.dialogs.newFileUpload}
              <input type="file" hidden accept="image/*" onChange={handleFileChange} ref={fileInputRef} />
            </Button>
          ) : (
            <Box sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", display: "flex", alignItems: "center", gap: 2 }}>
              <SignedDocThumbnail url={formData.documentUrl} />
              <Box sx={{ flexGrow: 1, minWidth: 0, cursor: "pointer" }} onClick={() => openSignedDoc(formData.documentUrl)}>
                <Typography variant="body2" noWrap fontWeight={600}>{dict.vehicles.dialogs.viewDocument}</Typography>
                <Typography variant="caption" color="text.secondary">{dict.vehicles.dialogs.deleteAttachmentNote}</Typography>
              </Box>
              <Tooltip title="Sil">
                <IconButton size="small" color="error" onClick={() => setFormData({ ...formData, documentUrl: "" })}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
