import { VehicleWithRelations } from "@/app/lib/type/vehicle";
import { Stack, Typography, Card, Box, useTheme, Theme } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface SpecsTabProps {
  vehicle?: VehicleWithRelations | undefined;
}

const SpecsTab = ({ vehicle }: SpecsTabProps) => {
  const theme = useTheme();
  const dict = useDictionary();

  if (!vehicle) {
    return <Typography color="text.secondary">{dict.common.noData}</Typography>;
  }

  const cardStyle = {
    p: 3,
    display: "flex",
    flexDirection: "column",
    borderRadius: "8px",
    height: "auto",
    bgcolor: (theme: Theme) =>
      theme.palette.mode === "dark"
        ? "rgba(255,255,255,0.03)"
        : "rgba(0,0,0,0.02)",
    backgroundImage: "none",
    boxShadow: "none",
    border: (theme: Theme) => `1px solid ${theme.palette.divider}`,
  };

  return (
    <Stack spacing={4}>
      {/* Technical Specifications */}
      <Card sx={cardStyle}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <SettingsIcon sx={{ fontSize: 20, color: "text.secondary" }} />
          <Typography
            sx={{
              fontSize: 16,
              color: "text.primary",
              fontWeight: 700,
            }}
          >
            {dict.vehicles.dialogs?.steps?.specs || "Teknik Özellikler"}
          </Typography>
        </Stack>

        <Stack
          direction="row"
          spacing={6}
          sx={{ mb: vehicle?.techNotes ? 3 : 0 }}
        >
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                mb: 0.5,
                fontWeight: 600,
              }}
            >
              {dict.vehicles.specs?.transmission ||
                dict.vehicles.fields?.transmission ||
                "Şanzıman"}
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontWeight: 700, color: "text.primary" }}
            >
              {vehicle?.transmission || dict.common.na}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                mb: 0.5,
                fontWeight: 600,
              }}
            >
              {dict.vehicles.fields?.engineSize ||
                dict.vehicles.specs?.engineSize ||
                "Motor Hacmi"}
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontWeight: 700, color: "text.primary" }}
            >
              {vehicle?.engineSize || dict.common.na}
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            p: 2,
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.03)"
                : "rgba(0,0,0,0.02)",
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            mt: 3,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: "block",
              mb: 1,
              fontWeight: 600,
            }}
          >
            {dict.vehicles.specs?.techNotes || "Teknik Notlar"}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: vehicle?.techNotes ? "text.primary" : "text.secondary", fontWeight: 500, lineHeight: 1.6 }}
          >
            {vehicle?.techNotes || dict.common.na}
          </Typography>
        </Box>
      </Card>
    </Stack>
  );
};

export default SpecsTab;
