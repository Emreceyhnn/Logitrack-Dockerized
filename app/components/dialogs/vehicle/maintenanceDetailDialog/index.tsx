"use client";

import {
  Dialog,
  DialogContent,
  Button,
  Stack,
  Alert,
  CircularProgress,
  IconButton,
  Typography,
  Box,
  useTheme,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useEffect, useRef } from "react";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { updateMaintenanceRecord } from "@/app/lib/controllers/vehicle";
import dayjs, { Dayjs } from "dayjs";
import { MaintenanceStatus, MaintenanceRecord } from "@/app/lib/type/enums";
import { useCurrency } from "@/app/hooks/useCurrency";
import { uploadImageAction } from "@/app/lib/actions/upload";
import { logger } from "@/app/lib/logger";

import { MaintenanceStatusSection } from "./components/MaintenanceStatusSection";
import { MaintenanceConfigurationSection } from "./components/MaintenanceConfigurationSection";
import { MaintenanceAdditionalInfoSection } from "./components/MaintenanceAdditionalInfoSection";

interface MaintenanceDetailDialogProps {
  open: boolean;
  onClose: () => void;
  record: MaintenanceRecord | null;
  onSuccess: () => void;
}

export default function MaintenanceDetailDialog({
  open,
  onClose,
  record,
  onSuccess,
}: MaintenanceDetailDialogProps) {
  const dict = useDictionary();
  const { convertFrom, symbol, currency: userCurrency } = useCurrency();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* --------------------------------- states --------------------------------- */
  const [formData, setFormData] = useState<{
    type: string;
    date: Dayjs;
    cost: string;
    status: MaintenanceStatus;
    description: string;
    documentUrl: string;
  }>({
    type: "",
    date: dayjs(),
    cost: "",
    status: "COMPLETED",
    description: "",
    documentUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* -------------------------------- handlers -------------------------------- */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // PDF uploads are temporarily disabled service-wide; catch it here too
    // (not just server-side in uploadImageAction) so the user sees why
    // immediately instead of after picking a file and waiting on the upload.
    if (file.type === "application/pdf") {
      setError(dict.vehicles.dialogs.pdfUploadDisabled || "PDF uploads are temporarily unavailable. Please try again later.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const result = await uploadImageAction(
            reader.result as string,
            "documents",
            `maintenance/${record?.vehicleId}`
          );
          if (result.success) {
            setFormData((prev) => ({ ...prev, documentUrl: result.url }));
          }
        } catch (err) {
          logger.error("Upload error:", err);
          setError("Upload failed");
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      logger.error(err);
      setError("Failed to read file");
      setUploading(false);
    }
  };

  useEffect(() => {
    if (record) {
      setFormData({
        type: record.type,
        date: dayjs(record.date),
        cost: convertFrom(record.cost, record.currency || "USD").toFixed(2),
        status: (record.status as MaintenanceStatus) || "COMPLETED",
        description: record.description || "",
        documentUrl: record.documentUrl || "",
      });
    }
  }, [record, convertFrom]);

  /* -------------------------------- handlers -------------------------------- */
  const handleSubmit = async () => {
    if (!record?.id) return;
    if (!formData.type || !formData.date || !formData.cost) {
      setError(dict.common.fillAllFields);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updateMaintenanceRecord(record!.id, {
        type: formData.type as import("@/app/lib/type/enums").MaintenanceType,
        date: formData.date.toDate(),
        cost: parseFloat(formData.cost),
        currency: userCurrency,
        status: formData.status,
        description: formData.description,
        documentUrl: formData.documentUrl,
      });

      onSuccess();
      onClose();
    } catch (err) {
      logger.error(err);
      setError(
        dict.vehicles.dialogs.failedToUpdateRecord ||
          "Failed to update maintenance record"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------- styles --------------------------------- */
  const theme = useTheme();

  const textFieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      height: 48,
      "& fieldset": {
        borderColor: "divider",
      },
      "&:hover fieldset": {
        borderColor: "primary.main",
      },
    },
    "& .MuiInputLabel-root": {
      fontSize: "0.85rem",
    },
    "& .MuiOutlinedInput-input": {
      fontSize: "0.9rem",
    },
  };

  if (!record) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
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
          alignItems="center"
        >
          <Typography component="div" variant="h6" fontWeight={800} color="text.primary">
            {dict.vehicles.dialogs.maintenanceDetails}
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: "text.secondary" }}
           aria-label="close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, display: "block", fontWeight: 500 }}
        >
          {dict.vehicles.dialogs.maintenanceDetailsDesc ||
            "View and manage the status of this maintenance entry."}
        </Typography>
      </Box>

      <DialogContent sx={{ p: 3, pt: 1 }}>
        <Stack spacing={4} mt={1}>
          {error && (
            <Alert
              severity="error"
              variant="filled"
              sx={{
                borderRadius: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "error._alpha.main_10"
                    : "error._alpha.main_05",
                color: "error.light",
                border: (theme) =>
                  `1px solid ${theme.palette.error._alpha.main_20}`,
              }}
            >
              {error}
            </Alert>
          )}

          <MaintenanceStatusSection
            status={formData.status}
            onChange={(status) => setFormData({ ...formData, status })}
            textFieldSx={textFieldSx}
          />

          <Divider sx={{ borderColor: "divider" }} />

          <MaintenanceConfigurationSection
            type={formData.type}
            date={formData.date}
            cost={formData.cost}
            symbol={symbol}
            onChangeType={(type) => setFormData({ ...formData, type })}
            onChangeDate={(date) => setFormData({ ...formData, date })}
            onChangeCost={(cost) => setFormData({ ...formData, cost })}
            textFieldSx={textFieldSx}
          />

          <MaintenanceAdditionalInfoSection
            description={formData.description}
            documentUrl={formData.documentUrl}
            uploading={uploading}
            textFieldSx={textFieldSx}
            fileInputRef={fileInputRef}
            onChangeDescription={(description) => setFormData({ ...formData, description })}
            onFileChange={handleFileChange}
            onRemoveDocument={() => setFormData({ ...formData, documentUrl: "" })}
          />
        </Stack>
      </DialogContent>

      <Box
        sx={{ p: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}
      >
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            onClick={onClose}
            disabled={loading || uploading}
            sx={{
              color: "text.secondary",
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            {dict.common.cancel}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || uploading}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: 4,
              boxShadow: `0 8px 24px ${theme.palette.primary._alpha.main_20}`,
              fontWeight: 700,
              minWidth: 140,
            }}
          >
            {loading ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} color="inherit" />
                <span>{dict.common.updating}</span>
              </Stack>
            ) : (
              dict.vehicles.dialogs.updateRecord
            )}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
