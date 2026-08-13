import { Box, Stack, Typography, LinearProgress, useTheme } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CustomCard from "@/app/components/cards/card";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface VolumeCapacityCardProps {
  mockUsedVolume: number;
  totalVolume: number;
  volumePct: number;
}

export const VolumeCapacityCard = ({
  mockUsedVolume,
  totalVolume,
  volumePct,
}: VolumeCapacityCardProps) => {
  const theme = useTheme();
  const dict = useDictionary();
  const t = dict.warehouses.dialogs.details;

  return (
    <CustomCard
      sx={{
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        bgcolor: theme.palette.kpi.teal_alpha.main_10,
        borderColor: theme.palette.kpi.teal_alpha.main_20,
        borderWidth: 1,
        borderStyle: "solid",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5}>
        <Box
          sx={{
            p: 0.8,
            borderRadius: 1.5,
            bgcolor: theme.palette.kpi.teal_alpha.main_20,
            color: theme.palette.kpi.teal,
          }}
        >
          <LocalShippingIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box flex={1}>
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.primary"
            sx={{ display: "block", lineHeight: 1 }}
          >
            {t.volumeCapacity}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.6rem" }}
          >
            {t.totalCubicMeters}
          </Typography>
        </Box>
        <Typography variant="body2" fontWeight={800} color="text.primary">
          {volumePct.toFixed(1)}%
        </Typography>
      </Stack>

      <Box sx={{ position: "relative", mb: 1 }}>
        <LinearProgress
          variant="determinate"
          value={100}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: theme.palette.divider_alpha.main_10,
            "& .MuiLinearProgress-bar": { display: "none" },
          }}
        />
        <LinearProgress
          variant="determinate"
          value={volumePct}
          color="success"
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            borderRadius: 4,
            bgcolor: "transparent",
            "& .MuiLinearProgress-bar": {
              borderRadius: 4,
              bgcolor: theme.palette.success.main,
            },
          }}
        />
      </Box>

      <Stack direction="row" justifyContent="space-between">
        <Typography
          variant="caption"
          color="text.primary"
          fontWeight={600}
          sx={{ fontSize: "0.7rem" }}
        >
          {mockUsedVolume.toLocaleString("en-US")} {t.m3Used}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: "0.7rem" }}
        >
          {totalVolume.toLocaleString("en-US")} {t.m3TotalCapacity}
        </Typography>
      </Stack>
    </CustomCard>
  );
};
