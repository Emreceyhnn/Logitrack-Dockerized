"use client";

import { ChangeEvent, useMemo } from "react";
import {
  Box,
  Typography,
  Stack,
  
  useTheme,
  InputAdornment,
  Switch,
  IconButton,
  Chip,
  MenuItem,
  Select,
  FormControl,
} from "@mui/material";
import { toast } from "sonner";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SecurityIcon from "@mui/icons-material/Security";
import BuildIcon from "@mui/icons-material/Build";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import BadgeIcon from "@mui/icons-material/Badge";
import AssignmentIcon from "@mui/icons-material/Assignment";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useFormikContext } from "formik";
import { VehicleFormValues } from "@/app/lib/type/vehicle";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { formatDisplayDate } from "@/app/lib/utils/date";

const DocumentsStep = () => {
  /* -------------------------------- variables ------------------------------- */
  const dict = useDictionary();
  const theme = useTheme();
  const { values, setFieldValue } = useFormikContext<VehicleFormValues>();
  const dateSettings = useDateSettings();

  const DOCUMENT_TYPES = useMemo(() => [
    { value: "REGISTRATION", label: dict.vehicles.docTypes.REGISTRATION, icon: <BadgeIcon />, required: true },
    { value: "INSURANCE", label: dict.vehicles.docTypes.INSURANCE, icon: <VerifiedUserIcon />, required: true },
    { value: "LICENSE", label: dict.vehicles.docTypes.LICENSE, icon: <LocalLibraryIcon /> },
    { value: "INSPECTION", label: dict.vehicles.docTypes.INSPECTION, icon: <SecurityIcon />, required: true },
    { value: "MAINTENANCE", label: dict.vehicles.docTypes.MAINTENANCE, icon: <BuildIcon /> },
    { value: "OTHER", label: dict.vehicles.docTypes.OTHER, icon: <AssignmentIcon /> },
  ], [dict]);

  /* --------------------------------- styles --------------------------------- */
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
      display: "none",
    },
    "& .MuiOutlinedInput-input": {
      fontSize: "0.9rem",
    },
  };

  const labelSx = {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "text.secondary",
    mb: 1,
    display: "block",
  };

  /* -------------------------------- handlers -------------------------------- */
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // PDF uploads are temporarily disabled service-wide; the actual
      // upload happens later via uploadImageAction (which also rejects
      // PDFs), but filtering here surfaces the reason immediately.
      const selectedFiles = Array.from(e.target.files);
      const pdfCount = selectedFiles.filter((f) => f.type === "application/pdf").length;
      const acceptedFiles = selectedFiles.filter((f) => f.type !== "application/pdf");
      if (pdfCount > 0) {
        toast.error(dict.vehicles.dialogs.pdfUploadDisabled || "PDF uploads are temporarily unavailable. Please try again later.");
      }
      if (acceptedFiles.length === 0) {
        e.target.value = "";
        return;
      }
      const newFiles = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        type: "OTHER",
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(1) + " MB",
        uploadedAt: formatDisplayDate(new Date(), dateSettings),
        file: file,
      }));
      setFieldValue("documents", [...values.documents, ...newFiles]);
    }
  };

  const updateFileType = (id: string, type: string) => {
    setFieldValue(
      "documents",
      values.documents.map((d) => (d.id === id ? { ...d, type } : d))
    );
  };

  const removeFile = (id: string) => {
    setFieldValue(
      "documents",
      values.documents.filter((d) => d.id !== id)
    );
  };

  return (
    <Box sx={{ display: "flex", gap: 6, minHeight: 400 }}>
      <Box sx={{ flex: 1 }}>
        <Typography component="div"
          variant="h6"
          sx={{ color: "text.primary", mb: 3, fontWeight: 800 }}
        >
          {dict.vehicles.dialogs.complianceDates}
        </Typography>

        <Stack spacing={3}>
          <Box>
            <Typography sx={labelSx}>{dict.vehicles.dialogs.registrationExpiry}</Typography>
            <DatePicker
              value={values.registrationExpiry}
              onChange={(val) => setFieldValue("registrationExpiry", val)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  sx: textFieldSx,
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarTodayIcon
                          sx={{ fontSize: 18, color: "text.secondary" }}
                        />
                      </InputAdornment>
                    ),
                  },
                },
              }}
            />
          </Box>

          <Box>
            <Typography sx={labelSx}>{dict.vehicles.dialogs.inspectionExpiry}</Typography>
            <DatePicker
              value={values.inspectionExpiry}
              onChange={(val) => setFieldValue("inspectionExpiry", val)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  sx: textFieldSx,
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SecurityIcon
                          sx={{ fontSize: 18, color: "text.secondary" }}
                        />
                      </InputAdornment>
                    ),
                  },
                },
              }}
            />
          </Box>

          <Box
            sx={{
              p: 2,
              mt: 2,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
              display: "flex",
              alignItems: "flex-start",
              gap: 2,
            }}
          >
            <Switch
              checked={values.enableExpiryAlerts}
              onChange={(e) =>
                setFieldValue("enableExpiryAlerts", e.target.checked)
              }
              color="primary"
              size="small"
              sx={{ mt: 0.5 }}
            />
            <Box>
              <Typography
                variant="body2"
                sx={{ color: "text.primary", fontWeight: 700 }}
              >
                {dict.vehicles.dialogs.enableAlerts}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", display: "block", mt: 0.5 }}
              >
                {dict.vehicles.dialogs.alertsDesc}
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ flex: 1.2 }}>
        <Typography component="div"
          variant="h6"
          sx={{ color: "text.primary", mb: 3, fontWeight: 800 }}
        >
          {dict.common.documents}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", mb: 1.5, display: "block", fontWeight: 700, textTransform: "uppercase" }}>
            {dict.vehicles.dialogs.requiredDocs}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {DOCUMENT_TYPES.filter(t => t.required).map(t => {
              const isUploaded = values.documents.some((d) => d.type === t.value);
              return (
                <Chip
                  key={t.value}
                  label={t.label}
                  size="small"
                  icon={isUploaded ? <CheckCircleIcon sx={{ fontSize: '14px !important' }} /> : undefined}
                  sx={{
                    bgcolor: isUploaded ? theme.palette.success._alpha.main_10 : theme.palette.error._alpha.main_10,
                    color: isUploaded ? theme.palette.success.light : theme.palette.error.light,
                    border: `1px solid ${isUploaded ? theme.palette.success._alpha.main_20 : theme.palette.error._alpha.main_20}`,
                    fontWeight: 600,
                    px: 0.5,
                  }}
                />
              );
            })}
          </Stack>
        </Box>

        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ color: "text.primary", mb: 2, fontWeight: 700 }}
          >
            {dict.vehicles.dialogs.uploadFiles}
          </Typography>

          <Box
            component="label"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              p: 4,
              borderRadius: 2,
              border: `2px dashed ${theme.palette.primary._alpha.main_30}`,
              bgcolor: theme.palette.primary._alpha.main_02,
              cursor: "pointer",
              transition: "all 0.2s",
              "&:hover": {
                bgcolor: theme.palette.primary._alpha.main_05,
                borderColor: theme.palette.primary.main,
              },
            }}
          >
            <input type="file" hidden multiple onChange={handleFileUpload} />
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: theme.palette.primary._alpha.main_10,
                color: theme.palette.primary.main,
                mb: 2,
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 28 }} />
            </Box>
            <Typography
              variant="body2"
              sx={{ color: "text.primary", fontWeight: 700, mb: 0.5 }}
            >
              <span style={{ color: theme.palette.primary.main }}>
                {dict.common.upload}
              </span>{" "}
              {dict.vehicles.dialogs.dragAndDrop}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {dict.vehicles.dialogs.fileFormats}
            </Typography>
          </Box>

          <Stack spacing={2} sx={{ mt: 3 }}>
            {values.documents.map((doc) => {
              const typeInfo =
                DOCUMENT_TYPES.find((t) => t.value === doc.type) ||
                DOCUMENT_TYPES[5];
              return (
                <Box
                  key={doc.id}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    border: `1px solid ${theme.palette.divider}`,
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    },
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        p: 1.2,
                        borderRadius: 2,
                        bgcolor: theme.palette.primary._alpha.main_10,
                        color: theme.palette.primary.main,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {typeInfo?.icon}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "text.primary",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {doc.name}
                        </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary" }}
                      >
                        {doc.size} • {doc.uploadedAt}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => removeFile(doc.id)}
                      sx={{
                        color: "text.disabled",
                        "&:hover": {
                          color: "error.main",
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255,0,0,0.1)" : "rgba(255,0,0,0.05)",
                        },
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>

                  <Box sx={{ mt: 2 }}>
                    <FormControl fullWidth size="small">
                      <Select
                        value={doc.type}
                        onChange={(e) => updateFileType(doc.id, e.target.value)}
                        sx={{
                          height: 36,
                          borderRadius: 1.5,
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                          fontSize: "0.8rem",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "divider",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "primary.main",
                          },
                        }}
                      >
                        {DOCUMENT_TYPES.map((type) => (
                          <MenuItem
                            key={type.value}
                            value={type.value}
                            sx={{ fontSize: "0.85rem" }}
                          >
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <Box sx={{ display: "flex", opacity: 0.8 }}>
                                {type.icon}
                              </Box>
                              <span>{type.label}</span>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default DocumentsStep;
