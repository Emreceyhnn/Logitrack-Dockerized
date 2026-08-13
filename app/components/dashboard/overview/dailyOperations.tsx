import {
  Box,
  Divider,
  List,
  ListItem,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import CustomCard from "../../cards/card";
import RouteIcon from "@mui/icons-material/Route";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import TimerIcon from "@mui/icons-material/Timer";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import { DailyOperationsData } from "@/app/lib/type/overview";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useMemo } from "react";

interface DailyOperationsCardProps {
  values: DailyOperationsData | null;
}

const DailyOperationsCard = ({ values }: DailyOperationsCardProps) => {
  const dict = useDictionary();
  const theme = useTheme();

  const items = useMemo(() => {
    if (!values) return [];
    return [
      {
        label: dict.dashboard.overview.dailyOperations.plannedRoutes,
        value: values.plannedRoutes,
        icon: <RouteIcon sx={{ fontSize: 20 }} />,
        color: theme.palette.kpi.indigo,
        bgColor: theme.palette.kpi.indigo_alpha.main_10,
      },
      {
        label: dict.dashboard.overview.dailyOperations.completedDeliveries,
        value: values.completedDeliveries,
        icon: <CheckCircleIcon sx={{ fontSize: 20 }} />,
        color: theme.palette.kpi.emerald,
        bgColor: theme.palette.kpi.emerald_alpha.main_10,
      },
      {
        label: dict.dashboard.overview.dailyOperations.failedDeliveries,
        value: values.failedDeliveries,
        icon: <ErrorIcon sx={{ fontSize: 20 }} />,
        color: theme.palette.kpi.error,
        bgColor: theme.palette.kpi.error_alpha.main_10,
      },
      {
        label: dict.dashboard.overview.dailyOperations.avgDuration,
        value: values.avgDeliveryTimeMin || "--",
        icon: <TimerIcon sx={{ fontSize: 20 }} />,
        color: theme.palette.kpi.amber,
        bgColor: theme.palette.kpi.amber_alpha.main_10,
      },
      {
        label: dict.dashboard.overview.dailyOperations.fuelConsumed,
        value: values.fuelConsumedLiters,
        icon: <LocalGasStationIcon sx={{ fontSize: 20 }} />,
        color: theme.palette.kpi.sky,
        bgColor: theme.palette.kpi.sky_alpha.main_10,
      },
    ];
  }, [values, dict, theme]);

  if (!values) return null;

  return (
    <CustomCard
      sx={{
        padding: "0 0 6px 0",
        height: 420,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography sx={{ fontSize: 18, fontWeight: 600, p: 2 }}>
        {dict.dashboard.overview.dailyOperations.title}
      </Typography>
      <Divider />

      <Box sx={{ flexGrow: 1, p: 2 }}>
        <List sx={{ p: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {items.map((item, index) => (
            <ListItem
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 1.2,
                borderRadius: "16px",
                bgcolor: theme.palette.background.paper_alpha.main_40,
                border: `1px solid ${theme.palette.divider_alpha.main_08}`,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "translateX(4px)",
                  bgcolor: theme.palette.background.paper_alpha.main_60,
                  borderColor: theme.palette.divider_alpha.main_20,
                  boxShadow: `0 4px 12px ${theme.palette.common.black_alpha.main_08}`,
                },
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    bgcolor: item.bgColor,
                    color: item.color,
                    boxShadow: `inset 0 0 10px ${theme.palette.getColorAlpha(item.color).main_10}`,
                    transition: "all 0.3s ease",
                  }}
                >
                  {item.icon}
                </Box>
                <Typography
                  variant="body2"
                  fontWeight={500}
                  color="text.secondary"
                >
                  {item.label}
                </Typography>
              </Stack>
              <Typography
                variant="subtitle1"
                fontWeight={800}
                color="text.primary"
                sx={{ letterSpacing: "-0.02em" }}
              >
                {item.value}
              </Typography>
            </ListItem>
          ))}
        </List>
      </Box>
    </CustomCard>
  );
};

export default DailyOperationsCard;
