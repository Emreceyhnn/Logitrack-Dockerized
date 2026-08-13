import { ChangeEvent } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Stack,
  InputAdornment,
  IconButton,
} from "@mui/material";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import CloseIcon from "@mui/icons-material/Close";
import TagIcon from "@mui/icons-material/Tag";
import PinIcon from "@mui/icons-material/Pin";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useFormikContext } from "formik";
import { VehicleFormValues } from "@/app/lib/type/vehicle";

const FirstStep = ({
  onFileSelect,
}: {
  onFileSelect?: (file: File) => void;
}) => {
  /* -------------------------------- variables ------------------------------- */
  const dict = useDictionary();

  const {
    values,
    errors,
    touched,
    setFieldValue,
    handleBlur,
    handleChange: formikHandleChange,
  } = useFormikContext<VehicleFormValues>();

  /* --------------------------------- styles --------------------------------- */
  const textFieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
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

  /* -------------------------------- handlers -------------------------------- */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFieldValue("photo", file);
    onFileSelect?.(file);
  };

  const handleRemove = () => {
    setFieldValue("photo", undefined);
  };

  const photoPreview =
    values.photo instanceof File
      ? URL.createObjectURL(values.photo)
      : values.photo;

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 4 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
          {dict.vehicles.dialogs.photo}
        </Typography>
        <Box
          sx={{
            width: "100%",
            aspectRatio: "1/1",
            border: (theme) => `2px dashed ${photoPreview ? "transparent" : theme.palette.divider_alpha.main_10}`,
            borderRadius: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: photoPreview ? "default" : "pointer",
            transition: "all 0.2s",
            position: "relative",
            overflow: "hidden",
            "&:hover": {
              borderColor: (theme) => photoPreview
                ? "none"
                : theme.palette.primary._alpha.main_30,
              bgcolor: (theme) => photoPreview
                ? "none"
                : theme.palette.primary._alpha.main_02,
            },
          }}
        >
          {photoPreview ? (
            <>
              <Box
                component="img"
                src={photoPreview}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              <IconButton
                size="small"
                onClick={handleRemove}
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  bgcolor: "error.main",
                  color: "common.white",
                  "&:hover": {
                    bgcolor: "error.dark",
                  },
                }}
               aria-label="close">
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          ) : (
            <Box
              component="label"
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <input
                type="file"
                hidden
                accept="image/svg+xml,image/png,image/jpeg,image/gif"
                onChange={handleFileChange}
              />

              <Box
                sx={{
                  p: 2,
                  borderRadius: "50%",
                  bgcolor: "primary._alpha.main_05",
                  color: "primary.main",
                  mb: 1.5,
                }}
              >
                <AddAPhotoIcon fontSize="large" />
              </Box>

              <Typography variant="body2" fontWeight={700} color="text.primary">
                {dict.vehicles.dialogs.clickToUpload}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dict.vehicles.dialogs.uploadNotes}
              </Typography>
            </Box>
          )}
        </Box>

        <Stack direction="row" spacing={1}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 1,
              bgcolor: (theme) => theme.palette.divider_alpha.main_10,
              overflow: "hidden",
              border: (theme) => photoPreview
                ? `2px solid ${theme.palette.primary.main}`
                : `1px solid ${theme.palette.divider_alpha.main_10}`,
            }}
          >
            {photoPreview ? (
              <Box
                component="img"
                src={photoPreview}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <Box
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "text.secondary",
                }}
              >
                <AddAPhotoIcon fontSize="small" />
              </Box>
            )}
          </Box>
        </Stack>
      </Stack>

      <Stack spacing={3}>
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            name="fleetNo"
            label={
              dict.vehicles.fields.fleetNo + " (" + dict.common.optional + ")"
            }
            placeholder="e.g. V-001"
            value={values.fleetNo}
            onChange={formikHandleChange}
            onBlur={handleBlur}
            error={touched.fleetNo && Boolean(errors.fleetNo)}
            helperText={touched.fleetNo && (errors.fleetNo as string)}
            sx={textFieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <TagIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            fullWidth
            name="plate"
            label={dict.vehicles.fields.plate}
            placeholder="ABC-1234"
            value={values.plate}
            onChange={formikHandleChange}
            onBlur={handleBlur}
            error={touched.plate && Boolean(errors.plate)}
            helperText={touched.plate && (errors.plate as string)}
            sx={textFieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PinIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>

        <TextField
          fullWidth
          select
          name="type"
          label={dict.vehicles.fields.type}
          value={values.type}
          onChange={formikHandleChange}
          onBlur={handleBlur}
          error={touched.type && Boolean(errors.type)}
          helperText={touched.type && (errors.type as string)}
          sx={textFieldSx}
        >
          <MenuItem value="TRUCK">{dict.vehicles.types.TRUCK}</MenuItem>
          <MenuItem value="VAN">{dict.vehicles.types.VAN}</MenuItem>
        </TextField>

        <TextField
          fullWidth
          select
          name="status"
          label={dict.vehicles.fields.status}
          value={values.status}
          onChange={formikHandleChange}
          onBlur={handleBlur}
          error={touched.status && Boolean(errors.status)}
          helperText={touched.status && (errors.status as string)}
          sx={textFieldSx}
        >
          <MenuItem value="AVAILABLE">
            {dict.vehicles.statuses?.AVAILABLE || "Available"}
          </MenuItem>
          <MenuItem value="ON_TRIP">
            {dict.vehicles.statuses?.ON_TRIP || "On Trip"}
          </MenuItem>
          <MenuItem value="MAINTENANCE">
            {dict.vehicles.statuses?.MAINTENANCE || "Maintenance"}
          </MenuItem>
        </TextField>

        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            name="brand"
            label={dict.vehicles.fields.brand || "Brand"}
            placeholder="e.g. Volvo"
            value={values.brand}
            onChange={formikHandleChange}
            onBlur={handleBlur}
            error={touched.brand && Boolean(errors.brand)}
            helperText={touched.brand && (errors.brand as string)}
            sx={textFieldSx}
          />
          <TextField
            fullWidth
            name="model"
            label={dict.vehicles.fields.model}
            placeholder="e.g. FH16"
            value={values.model}
            onChange={formikHandleChange}
            onBlur={handleBlur}
            error={touched.model && Boolean(errors.model)}
            helperText={touched.model && (errors.model as string)}
            sx={textFieldSx}
          />
        </Stack>

        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            name="year"
            label={dict.vehicles.fields.year}
            type="number"
            placeholder="e.g. 2023"
            value={values.year}
            onChange={formikHandleChange}
            onBlur={handleBlur}
            error={touched.year && Boolean(errors.year)}
            helperText={touched.year && (errors.year as string)}
            sx={textFieldSx}
          />
          <TextField
            fullWidth
            name="nextServiceKm"
            label={dict.vehicles.fields.service}
            type="number"
            placeholder="e.g. 50000"
            value={values.nextServiceKm}
            onChange={formikHandleChange}
            onBlur={handleBlur}
            error={touched.nextServiceKm && Boolean(errors.nextServiceKm)}
            helperText={
              touched.nextServiceKm && (errors.nextServiceKm as string)
            }
            sx={textFieldSx}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="body2" color="text.secondary">
                    km
                  </Typography>
                </InputAdornment>
              ),
            }}
          />
        </Stack>

        <TextField
          fullWidth
          name="odometerKm"
          label={dict.vehicles.fields.odometer}
          type="number"
          value={values.odometerKm}
          onChange={formikHandleChange}
          onBlur={handleBlur}
          error={touched.odometerKm && Boolean(errors.odometerKm)}
          helperText={touched.odometerKm && (errors.odometerKm as string)}
          sx={textFieldSx}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Typography variant="body2" color="text.secondary">
                  km
                </Typography>
              </InputAdornment>
            ),
          }}
        />
      </Stack>
    </Box>
  );
};

export default FirstStep;
