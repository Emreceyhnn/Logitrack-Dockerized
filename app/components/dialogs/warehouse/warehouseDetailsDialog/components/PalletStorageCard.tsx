import { Box, Stack, Typography, LinearProgress, useTheme } from "@mui/material";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import CustomCard from "@/app/components/cards/card";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface PalletStorageCardProps {
  usedPallets: number;
  totalPallets: number;
  palletPct: number;
}

export const PalletStorageCard = ({
  usedPallets,
  totalPallets,
  palletPct,
}: PalletStorageCardProps) => {
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
        bgcolor: theme.palette.kpi.indigo_alpha.main_10,
        borderColor: theme.palette.kpi.indigo_alpha.main_20,
        borderWidth: 1,
        borderStyle: "solid",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5}>
        <Box
          sx={{
            p: 0.8,
            borderRadius: 1.5,
            bgcolor: theme.palette.kpi.indigo_alpha.main_20,
            color: theme.palette.kpi.indigo,
          }}
        >
          <BusinessCenterIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box flex={1}>
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.primary"
            sx={{ display: "block", lineHeight: 1 }}
          >
            {t.palletStorage}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.6rem" }}
          >
            {t.standardEuroPallets}
          </Typography>
        </Box>
        <Typography variant="body2" fontWeight={800} color="text.primary">
          {palletPct.toFixed(1)}%
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
          value={palletPct}
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
              bgcolor: theme.palette.primary.main,
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
          {usedPallets.toLocaleString("en-US")} {t.used}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: "0.7rem" }}
        >
          {totalPallets.toLocaleString("en-US")} {t.totalCapacity}
        </Typography>
      </Stack>
    </CustomCard>
  );
};
