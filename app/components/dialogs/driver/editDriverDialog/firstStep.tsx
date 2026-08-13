"use client";

import {
  Box,
  Divider,
  Grid,
  Stack,
  Typography,
  useTheme,
  IconButton,
} from "@mui/material";
import BadgeIcon from "@mui/icons-material/Badge";
import CategoryIcon from "@mui/icons-material/Category";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import { useRef, ChangeEvent } from "react";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { useFormikContext } from "formik";
import { EditDriverFormValues } from "@/app/lib/type/driver";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

const FirstEditDriverDialogStep = () => {
  /* -------------------------------- variables ------------------------------- */
  const theme = useTheme();
  const dict = useDictionary();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { values, errors, touched, setFieldValue, handleBlur, handleChange } = 
    useFormikContext<EditDriverFormValues>();

  /* -------------------------------- handlers -------------------------------- */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFieldValue("licencePhoto", e.target.files[0]);
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFieldValue("licencePhoto", null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Box>
      <Stack spacing={3}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5}>
              <Typography
                variant="body2"
                fontWeight={500}
                color="text.secondary"
              >
                {dict.drivers.fields.employeeId}
              </Typography>
              <CustomTextArea
                name="employeeId"
                placeholder={dict.drivers.fields.placeholders.employeeId}
                value={values.employeeId}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.employeeId && Boolean(errors.employeeId)}
                helperText={touched.employeeId ? (errors.employeeId as string) : undefined}
              >
                <BadgeOutlinedIcon fontSize="small" />
              </CustomTextArea>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5}>
              <Typography
                variant="body2"
                fontWeight={500}
                color="text.secondary"
              >
                {dict.drivers.fields.phoneNumber}
              </Typography>
              <CustomTextArea
                name="phone"
                placeholder={dict.drivers.fields.placeholders.phone}
                value={values.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.phone && Boolean(errors.phone)}
                helperText={touched.phone ? (errors.phone as string) : undefined}
              >
                <PhoneIcon fontSize="small" />
              </CustomTextArea>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: theme.palette.divider_alpha.main_10 }} />

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5}>
              <Typography
                variant="body2"
                fontWeight={500}
                color="text.secondary"
              >
                {dict.drivers.fields.licenseNumber}
              </Typography>
              <CustomTextArea
                name="licenseNumber"
                placeholder={dict.drivers.fields.placeholders.license}
                value={values.licenseNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.licenseNumber && Boolean(errors.licenseNumber)}
                helperText={touched.licenseNumber ? (errors.licenseNumber as string) : undefined}
              >
                <BadgeIcon fontSize="small" />
              </CustomTextArea>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5}>
              <Typography
                variant="body2"
                fontWeight={500}
                color="text.secondary"
              >
                {dict.drivers.fields.licenseType}
              </Typography>
              <CustomTextArea
                name="licenseType"
                placeholder={dict.common.select}
                value={values.licenseType}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.licenseType && Boolean(errors.licenseType)}
                helperText={touched.licenseType ? (errors.licenseType as string) : undefined}
              >
                <CategoryIcon fontSize="small" />
              </CustomTextArea>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 12 }}>
            <Stack spacing={1.5}>
              <Typography
                variant="body2"
                fontWeight={500}
                color="text.secondary"
              >
                {dict.drivers.fields.licenseExpiry}
              </Typography>
              <DatePicker
                value={values.licenseExpiry ? dayjs(values.licenseExpiry) : null}
                onChange={(val) =>
                  setFieldValue("licenseExpiry", val ? val.toDate() : null)
                }
                slotProps={{
                  textField: {
                    fullWidth: true,
                    placeholder: dict.common.date,
                    error: touched.licenseExpiry && Boolean(errors.licenseExpiry),
                    helperText: touched.licenseExpiry && (errors.licenseExpiry as string),
                    onBlur: handleBlur,
                    name: "licenseExpiry",
                  },
                }}
              />
            </Stack>
          </Grid>
        </Grid>

        <Stack spacing={1.5}>
          <Typography variant="body2" fontWeight={500} color="text.secondary">
            {dict.drivers.labels.physicalLicense} ({dict.common.optional})
          </Typography>
          <input
            type="file"
            hidden
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
          />
          <Box
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = theme.palette.primary.main;
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = theme.palette.divider_alpha.main_20 ?? "";
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = theme.palette.divider_alpha.main_20 ?? "";
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                setFieldValue("licencePhoto", e.dataTransfer.files[0]);
              }
            }}
            sx={{
              height: 160,
              border: `2px dashed ${theme.palette.divider_alpha.main_20}`,
              borderRadius: 3,
              bgcolor: theme.palette.background.paper_alpha.main_30,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: theme.palette.primary._alpha.main_50,
                bgcolor: theme.palette.primary._alpha.main_05,
              },
            }}
          >
            {!values.licencePhoto ? (
              <>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    bgcolor: theme.palette.primary._alpha.main_10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <CloudUploadIcon color="primary" />
                </Box>
                <Typography variant="body2" fontWeight={600} color="white">
                  {dict.drivers.fields.licensePhoto}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {dict.drivers.fields.placeholders.licenseFormat}
                </Typography>
              </>
            ) : (
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{
                  p: 2,
                  width: "80%",
                  bgcolor: theme.palette.text.darkBlue._alpha.main_50,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.primary._alpha.main_20}`,
                }}
              >
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: theme.palette.primary._alpha.main_10,
                    color: theme.palette.primary.main,
                    display: "flex",
                  }}
                >
                  <InsertDriveFileIcon />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="white"
                    noWrap
                  >
                    {values.licencePhoto.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(values.licencePhoto.size / (1024 * 1024)).toFixed(2)} MB
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={removeFile}
                  sx={{ color: "text.secondary" }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            )}
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
          sx={{ pt: 1 }}
        >
          <InfoOutlinedIcon
            sx={{ fontSize: 18, color: theme.palette.primary.main, mt: 0.2 }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ lineHeight: 1.5 }}
          >
            {dict.drivers.labels.ensureVisible}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
};

export default FirstEditDriverDialogStep;
