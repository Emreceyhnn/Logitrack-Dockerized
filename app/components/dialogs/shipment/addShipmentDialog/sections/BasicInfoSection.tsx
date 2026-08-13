"use client";

import {
  Box,
  Button,
  Grid,
  Stack,
  Typography,
  useTheme,
  MenuItem,
  ButtonGroup,
} from "@mui/material";
import { useFormikContext } from "formik";
import { ShipmentFormValues } from "@/app/lib/type/shipment";
import { ShipmentPriority } from "@/app/lib/type/enums";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import { DateTimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

const BasicInfoSection = () => {
  /* -------------------------------- variables ------------------------------- */
  const dict = useDictionary();
  const theme = useTheme();
  const { values, setFieldValue, handleBlur, touched, errors } =
    useFormikContext<ShipmentFormValues>();

  const priorities: {
    label: string;
    value: ShipmentPriority;
    color: string;
  }[] = [
    {
      label: dict.vehicles.priorities.LOW,
      value: "LOW",
      color: theme.palette.success.main,
    },
    {
      label: dict.vehicles.priorities.MEDIUM,
      value: "MEDIUM",
      color: theme.palette.warning.main,
    },
    {
      label: dict.vehicles.priorities.HIGH,
      value: "HIGH",
      color: theme.palette.error.main,
    },
    {
      label: dict.vehicles.priorities.CRITICAL,
      value: "CRITICAL",
      color: theme.palette.error.dark,
    },
  ];

  return (
    <Box>
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: theme.palette.primary.main,
            }}
          />
          <Typography variant="subtitle2" fontWeight={700} color="white">
            {dict.shipments.dialogs.sections.basicInfo}
          </Typography>
        </Stack>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.shipments.dialogs.fields.shipmentIdRef}
              </Typography>
              <CustomTextArea
                name="trackingId"
                placeholder={
                  dict.shipments.dialogs.fields.shipmentIdPlaceholder
                }
                value={values.trackingId}
                onChange={(e) =>
                  setFieldValue("trackingId", e.target.value)
                }
                onBlur={handleBlur}
                error={
                  touched.trackingId && Boolean(errors.trackingId)
                }
                helperText={
                  touched.trackingId
                    ? (errors.trackingId as string)
                    : undefined
                }
              />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.shipments.dialogs.fields.referenceNumber}
              </Typography>
              <CustomTextArea
                name="referenceNumber"
                placeholder="PO-9821"
                value={values.referenceNumber}
                onChange={(e) =>
                  setFieldValue("referenceNumber", e.target.value)
                }
                onBlur={handleBlur}
                error={
                  touched.referenceNumber && Boolean(errors.referenceNumber)
                }
                helperText={
                  touched.referenceNumber
                    ? (errors.referenceNumber as string)
                    : undefined
                }
              />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }} data-field="priority">
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.shipments.dialogs.fields.priorityLevel}
              </Typography>
              <ButtonGroup
                fullWidth
                sx={{ borderRadius: 2, overflow: "hidden", height: "56px" }}
              >
                {priorities.map((p) => (
                  <Button
                    key={p.value}
                    onClick={() => setFieldValue("priority", p.value)}
                    sx={{
                      height: "100%",
                      bgcolor:
                        values.priority === p.value
                          ? theme.palette[
                              p.value === "LOW"
                                ? "success"
                                : p.value === "MEDIUM"
                                  ? "warning"
                                  : "error"
                            ]._alpha.main_10
                          : theme.palette.text.darkBlue._alpha.main_50,
                      color:
                        values.priority === p.value
                          ? p.color
                          : "text.secondary",
                      borderColor: theme.palette.divider_alpha.main_10,
                      borderWidth: "1px !important",
                      fontWeight: 600,
                      "&:hover": {
                        bgcolor:
                          values.priority === p.value
                            ? theme.palette[
                                p.value === "LOW"
                                  ? "success"
                                  : p.value === "MEDIUM"
                                    ? "warning"
                                    : "error"
                              ]._alpha.main_20
                            : theme.palette.text.darkBlue._alpha.main_60,
                      },
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </ButtonGroup>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }} data-field="type">
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.shipments.dialogs.fields.type}
              </Typography>
              <CustomTextArea
                name="type"
                select
                value={values.type}
                onChange={(e) => setFieldValue("type", e.target.value)}
                onBlur={handleBlur}
                error={touched.type && Boolean(errors.type)}
                helperText={touched.type ? (errors.type as string) : undefined}
              >
                <MenuItem value="STANDARD_FREIGHT">
                  {dict.shipments.dialogs.types.standardFreight}
                </MenuItem>
                <MenuItem value="EXPRESS">
                  {dict.shipments.dialogs.types.express}
                </MenuItem>
                <MenuItem value="HAZARDOUS">
                  {dict.shipments.dialogs.types.hazardous}
                </MenuItem>
              </CustomTextArea>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }} data-field="slaDeadline">
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.shipments.dialogs.fields.slaDeadline}
              </Typography>
              <DateTimePicker
                sx={{ width: "100%" }}
                value={values.slaDeadline ? dayjs(values.slaDeadline) : null}
                onChange={(val) =>
                  setFieldValue("slaDeadline", val ? val.toDate() : null)
                }
                slotProps={{
                  textField: {
                    fullWidth: true,
                    placeholder: dict.shipments.dialogs.fields.slaPlaceholder,
                    error: touched.slaDeadline && Boolean(errors.slaDeadline),
                    helperText: touched.slaDeadline
                      ? (errors.slaDeadline as string)
                      : undefined,
                    sx: {
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: theme.palette.text.darkBlue._alpha.main_50,
                        borderRadius: 2,
                        "& fieldset": {
                          borderColor: theme.palette.divider_alpha.main_10,
                        },
                        "&:hover fieldset": {
                          borderColor: theme.palette.primary._alpha.main_30,
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "primary.main",
                        },
                      },
                      "& .MuiInputLabel-root": {
                        color: "text.secondary",
                        fontSize: "0.85rem",
                        "&.Mui-focused": {
                          color: "primary.main",
                        },
                      },
                      "& .MuiOutlinedInput-input": {
                        color: "text.primary",
                      },
                    },
                  },
                }}
              />
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};

export default BasicInfoSection;
