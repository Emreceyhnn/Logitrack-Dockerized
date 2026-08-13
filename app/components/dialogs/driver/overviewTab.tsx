import { DriverWithRelations } from "@/app/lib/type/driver";
import {
  Stack,
  Typography,
  Card,
  Button,
  Box,
  useTheme,
  Grid,
  Theme,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import StarIcon from "@mui/icons-material/Star";
import HistoryIcon from "@mui/icons-material/History";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import { useState } from "react";
import DriverHistoryDialog from "./DriverHistoryDialog";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useDriverMutations } from "@/app/hooks/useDrivers";
import { MenuItem, Select, FormControl } from "@mui/material";
import { DriverStatus } from "@prisma/client";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { formatDisplayDate } from "@/app/lib/utils/date";


interface OverviewTabProps {
  driver?: DriverWithRelations;
}

const KPICard = ({
  title,
  value,
  icon,
  color,
  theme,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  theme: Theme;
}) => {
  const resolveAlpha = (targetColor: string) => {
    if (targetColor === theme.palette.primary.main)
      return theme.palette.primary._alpha;
    if (targetColor === theme.palette.success.main)
      return theme.palette.success._alpha;
    if (targetColor === theme.palette.error.main)
      return theme.palette.error._alpha;
    if (targetColor === theme.palette.warning.main)
      return theme.palette.warning._alpha;
    if (targetColor === theme.palette.info.main)
      return theme.palette.info._alpha;
    return theme.palette.primary._alpha;
  };

  const statusAlpha = resolveAlpha(color);

  return (
    <Card
      sx={{
        p: 2.5,
        borderRadius: 3,
        bgcolor: theme.palette.background.paper_alpha.main_30,
        border: `1px solid ${theme.palette.divider_alpha.main_10}`,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        flexGrow: 1,
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: statusAlpha.main_30,
          bgcolor: statusAlpha.main_05,
          transform: "translateY(-2px)",
        },
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          {title}
        </Typography>
        <Box
          sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: statusAlpha.main_10,
            color: color,
            display: "flex",
          }}
        >
          {icon}
        </Box>
      </Stack>
      <Typography variant="h4" fontWeight={800} color="text.primary">
        {value}
      </Typography>
    </Card>
  );
};

const OverviewTab = ({ driver }: OverviewTabProps) => {
  const theme = useTheme();
  const dict = useDictionary();
  const dateSettings = useDateSettings();
  const [historyOpen, setHistoryOpen] = useState(false);
  const { updateDriverStatus } = useDriverMutations();

  const handleStatusChange = (newStatus: DriverStatus) => {
    if (!driver) return;
    updateDriverStatus.mutate({ id: driver.id, status: newStatus });
  };

  if (!driver) {
    return (
      <Typography color="text.secondary">
        {dict.drivers.noDriverSelected}
      </Typography>
    );
  }

  return (
    <Stack
      spacing={3}
      sx={{
        overflowY: "auto",
        maxHeight: 450,
        pr: 1,
        "&::-webkit-scrollbar": {
          width: 6,
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: theme.palette.background.paper_alpha.main_10,
          borderRadius: 4,
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: theme.palette.text.secondary_alpha.main_20,
          borderRadius: 4,
          "&:hover": {
            backgroundColor: theme.palette.text.secondary_alpha.main_40,
          },
        },
      }}
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KPICard
            title={dict.drivers.labels.rating}
            value={`${driver.rating != null ? driver.rating : "-"} / 5`}
            icon={<StarIcon fontSize="small" />}
            color={theme.palette.warning.main}
            theme={theme}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KPICard
            title={dict.drivers.labels.efficiency}
            value={
              driver.efficiencyScore != null
                ? `${driver.efficiencyScore}%`
                : "-"
            }
            icon={<AccessTimeIcon fontSize="small" />}
            color={theme.palette.info.main}
            theme={theme}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KPICard
            title={dict.drivers.labels.safety}
            value={driver.safetyScore != null ? `${driver.safetyScore}%` : "-"}
            icon={<MedicalServicesIcon fontSize="small" />}
            color={theme.palette.success.main}
            theme={theme}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: theme.palette.background.paper_alpha.main_30,
              border: `1px solid ${theme.palette.divider_alpha.main_10}`,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              height: "100%",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <EventAvailableIcon
                fontSize="small"
                sx={{ color: "text.secondary" }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.drivers.fields.licenseExpiry}
              </Typography>
            </Stack>
            <Typography
              component="div"
              variant="h6"
              fontWeight={700}
              color="text.primary"
            >
              {driver.licenseExpiry
                ? formatDisplayDate(driver.licenseExpiry, dateSettings)
                : dict.common.na}
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: theme.palette.background.paper_alpha.main_30,
              border: `1px solid ${theme.palette.divider_alpha.main_10}`,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              height: "100%",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.drivers.fields.status}
              </Typography>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor:
                    driver.status === "ON_JOB"
                      ? "success.main"
                      : driver.status === "OFF_DUTY"
                        ? "info.main"
                        : "warning.main",
                }}
              />
            </Stack>
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <Select
                value={driver.status}
                onChange={(e) =>
                  handleStatusChange(e.target.value as DriverStatus)
                }
                disabled={updateDriverStatus.isPending}
                sx={{
                  color: "text.primary",
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  "& .MuiSelect-select": { paddingLeft: 0 },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundImage: "none",
                    },
                  },
                }}
              >
                <MenuItem value="ON_JOB">🚛 {dict.drivers.onDuty}</MenuItem>
                <MenuItem value="OFF_DUTY">😴 {dict.drivers.offDuty}</MenuItem>
                <MenuItem value="ON_LEAVE">🏖️ {dict.drivers.onLeave}</MenuItem>
              </Select>
            </FormControl>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 200,
                color: "text.secondary",
                mt: 0.5,
              }}
            >
              {dict.drivers.labels.manageAvailability}
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: theme.palette.background.paper_alpha.main_30,
              border: `1px solid ${theme.palette.divider_alpha.main_10}`,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              height: "100%",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <HomeWorkIcon fontSize="small" sx={{ color: "text.secondary" }} />
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.drivers.labels.base}
              </Typography>
            </Stack>
            <Typography
              component="div"
              variant="h6"
              fontWeight={700}
              color="text.primary"
              noWrap
            >
              {driver.homeBaseWarehouse?.name || dict.common.noData}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {driver.homeBaseWarehouse?.code || dict.common.na}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={2} pt={2}>
        <Button
          variant="outlined"
          startIcon={<HistoryIcon />}
          onClick={() => setHistoryOpen(true)}
          sx={{
            flex: 1,
            borderRadius: 2,
            py: 1.5,
            fontWeight: 600,
            textTransform: "none",
            borderColor: theme.palette.divider_alpha.main_20,
            color: "text.primary",
            "&:hover": {
              borderColor: theme.palette.divider_alpha.main_50,
              bgcolor: theme.palette.background.paper_alpha.main_50,
            },
          }}
        >
          {dict.drivers.labels.viewHistory}
        </Button>
      </Stack>

      <DriverHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        driverId={driver.id}
        driverName={`${driver.user.name} ${driver.user.surname}`}
      />
    </Stack>
  );
};

export default OverviewTab;
