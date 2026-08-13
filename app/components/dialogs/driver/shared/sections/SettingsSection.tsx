import { Box, Stack, Typography, useTheme, Switch } from "@mui/material";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import { DriverStatus } from "@/app/lib/type/enums";
import { useFormikContext } from "formik";
import { DriverFormValues, EditDriverFormValues } from "@/app/lib/type/driver";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

export const SettingsSection = () => {
  const theme = useTheme();
  const dict = useDictionary();
  const { values, setFieldValue, handleBlur } =
    useFormikContext<DriverFormValues | EditDriverFormValues>();

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          sx={{
            p: 0.8,
            borderRadius: 1,
            bgcolor: theme.palette.primary._alpha.main_10,
            color: theme.palette.primary.main,
            display: "flex",
          }}
        >
          <FlashOnIcon fontSize="small" />
        </Box>
        <Typography variant="subtitle1" fontWeight={700} color="white">
          {dict.common.settings}
        </Typography>
      </Stack>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 1, display: "block", fontWeight: 500 }}
      >
        {dict.drivers.labels.initialStatus}
      </Typography>

      <Stack direction="row" spacing={2}>
        {[
          {
            id: "OFF_DUTY",
            label: dict.drivers.offDuty,
            icon: <PowerSettingsNewIcon />,
          },
          {
            id: "ON_JOB",
            label: dict.drivers.onDuty,
            icon: <FlashOnIcon />,
          },
        ].map((status) => (
          <Box
            key={status.id}
            onClick={() => setFieldValue("status", status.id as DriverStatus)}
            sx={{
              flex: 1,
              p: 2,
              borderRadius: 3,
              border: `1px solid ${
                values.status === status.id
                  ? theme.palette.primary.main
                  : theme.palette.divider_alpha.main_10
              }`,
              bgcolor:
                values.status === status.id
                  ? theme.palette.primary._alpha.main_05
                  : "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 2,
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: theme.palette.primary.main,
              },
            }}
          >
            <Box
              sx={{
                color:
                  values.status === status.id
                    ? theme.palette.primary.main
                    : "text.secondary",
              }}
            >
              {status.icon}
            </Box>
            <Typography
              variant="body2"
              fontWeight={600}
              color={values.status === status.id ? "white" : "text.secondary"}
            >
              {status.label}
            </Typography>
          </Box>
        ))}
      </Stack>

      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: theme.palette.primary._alpha.main_05,
          display: "flex",
          gap: 2,
        }}
      >
        <InfoOutlinedIcon
          fontSize="small"
          sx={{ color: theme.palette.primary.main, mt: 0.3 }}
        />
        <Typography variant="caption" color="text.secondary">
          {dict.drivers.labels.reviewAssignment}
        </Typography>
      </Box>

      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="body2" fontWeight={500} color="text.secondary">
          {dict.drivers.fields.hazmat}
        </Typography>
        <Switch
          checked={values.hazmatCertified}
          onChange={(e) => setFieldValue("hazmatCertified", e.target.checked)}
          color="primary"
        />
      </Stack>

      <Stack spacing={1}>
        <Typography variant="body2" fontWeight={500} color="text.secondary">
          {dict.drivers.fields.languageProficiency}
        </Typography>
        <CustomTextArea
          name="languages"
          placeholder="e.g. EN, TR"
          value={values.languages.join(", ")}
          onChange={(e) =>
            setFieldValue(
              "languages",
              e.target.value
                .split(",")
                .map((lang) => lang.trim())
                .filter(Boolean)
            )
          }
          onBlur={handleBlur}
        />
      </Stack>
    </Stack>
  );
};
