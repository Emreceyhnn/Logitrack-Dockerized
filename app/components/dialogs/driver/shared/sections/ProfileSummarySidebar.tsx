import { Box, Button, Card, Divider, Stack, Typography, useTheme } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import BadgeIcon from "@mui/icons-material/Badge";
import { useFormikContext } from "formik";
import { DriverFormValues, EditDriverFormValues } from "@/app/lib/type/driver";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { formatDisplayDate } from "@/app/lib/utils/date";
import { useDateSettings } from "@/app/hooks/useDateSettings";

interface ProfileSummarySidebarProps {
  setStep: (step: number) => void;
  userSummary: {
    name: string;
    surname: string;
    email: string;
  } | null;
}

export const ProfileSummarySidebar = ({
  setStep,
  userSummary,
}: ProfileSummarySidebarProps) => {
  const theme = useTheme();
  const dict = useDictionary();
  const dateSettings = useDateSettings();
  const { values } = useFormikContext<DriverFormValues | EditDriverFormValues>();

  return (
    <Card
      sx={{
        p: 3,
        bgcolor: "#0F172A",
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider_alpha.main_10}`,
        position: "sticky",
        top: 0,
      }}
    >
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2" fontWeight={700} color="white">
            {dict.drivers.labels.profileSummary}
          </Typography>
          <Button
            size="small"
            onClick={() => setStep(1)}
            sx={{ opacity: 0.7, textTransform: "none" }}
          >
            {dict.common.edit}
          </Button>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: theme.palette.primary._alpha.main_10,
              color: theme.palette.primary.main,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              fontWeight: 800,
            }}
          >
            {userSummary
              ? `${userSummary.name[0] || ""}${userSummary.surname[0] || ""}`
              : "??"}
          </Box>
          <Stack spacing={0.5}>
            <Typography variant="body1" fontWeight={700} color="white">
              {userSummary
                ? `${userSummary.name} ${userSummary.surname}`
                : dict.common.noData}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {values.licenseType || dict.common.noData}
            </Typography>
          </Stack>
        </Stack>

        <Divider sx={{ borderColor: theme.palette.divider_alpha.main_05 }} />

        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <LocalShippingIcon
              fontSize="small"
              sx={{ color: "text.secondary", mt: 0.3 }}
            />
            <Box>
              <Typography variant="caption" color="text.secondary">
                {dict.drivers.fields.phoneNumber}
              </Typography>
              <Typography variant="body2" color="white">
                {values.phone || dict.common.noData}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={2}>
            <InsertDriveFileIcon
              fontSize="small"
              sx={{ color: "text.secondary", mt: 0.3 }}
            />
            <Box>
              <Typography variant="caption" color="text.secondary">
                {dict.auth.email}
              </Typography>
              <Typography variant="body2" color="white" noWrap>
                {userSummary?.email || dict.common.noData}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={2}>
            <BadgeIcon
              fontSize="small"
              sx={{ color: "text.secondary", mt: 0.3 }}
            />
            <Box>
              <Typography variant="caption" color="text.secondary">
                {dict.drivers.fields.licenseNumber}
              </Typography>
              <Typography variant="body2" color="white">
                {dict.drivers.fields.licenseNumber}:{" "}
                {values.licenseNumber || dict.common.na}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dict.drivers.fields.licenseExpiry}:{" "}
                {values.licenseExpiry
                  ? formatDisplayDate(values.licenseExpiry, dateSettings)
                  : dict.drivers.labels.noExpiry}
              </Typography>
            </Box>
          </Stack>
        </Stack>

        <Divider sx={{ borderColor: theme.palette.divider_alpha.main_05 }} />

        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              {dict.drivers.fields.languageProficiency}
            </Typography>
            <Typography variant="caption" color="white" fontWeight={600}>
              {values.languages.length > 0
                ? values.languages.join(", ")
                : dict.common.noData}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              {dict.drivers.fields.hazmat}
            </Typography>
            <Typography
              variant="caption"
              color={values.hazmatCertified ? "success.main" : "text.secondary"}
              fontWeight={600}
            >
              {values.hazmatCertified
                ? dict.common.success
                : dict.common.noData}
            </Typography>
          </Stack>
        </Stack>

        <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            bgcolor: theme.palette.info._alpha.main_05,
            border: `1px solid ${theme.palette.info._alpha.main_10}`,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, display: "block", mb: 0.5 }}
          >
            {dict.drivers.labels.information}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ lineHeight: 1.4, display: "block" }}
          >
            {dict.drivers.labels.verificationDesc}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
};
