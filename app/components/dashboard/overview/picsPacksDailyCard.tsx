"use client";

import { Box, Divider, Stack, Typography, useTheme } from "@mui/material";
import CustomCard from "../../cards/card";
import { PicksAndPacksData } from "@/app/lib/type/overview";
import InventoryIcon from "@mui/icons-material/Inventory";
import CategoryIcon from "@mui/icons-material/Category";
import CallMergeIcon from "@mui/icons-material/CallMerge";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface PicksPacksDailyCardProps {
  values: PicksAndPacksData | null;
}

const PicksPacksDailyCard = ({ values }: PicksPacksDailyCardProps) => {
  const dict = useDictionary();
  const theme = useTheme();

  const { picks, packs } = values || { picks: 0, packs: 0 };

  return (
    <CustomCard
      sx={{
        padding: "0 0 6px 0",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography sx={{ fontSize: 18, fontWeight: 600, p: 2 }}>
        {dict.dashboard.overview.warehouseThroughput.title}
      </Typography>
      <Divider />

      <Box
        sx={{
          flexGrow: 1,
          p: 3,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Stack spacing={3}>
          {/* Picks Row */}
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                borderRadius: "12px",
                bgcolor: theme.palette.info._alpha.main_10,
                color: "info.main",
              }}
            >
              <InventoryIcon />
            </Box>
            <Box flexGrow={1}>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={500}
              >
                {dict.dashboard.overview.warehouseThroughput.itemsPicked}
              </Typography>
              <Typography variant="h5" fontWeight={700} color="text.primary">
                {picks.toLocaleString("en-US")}
              </Typography>
            </Box>
          </Stack>

          {/* Connective Line */}
          <Box sx={{ pl: 3, mt: -1, mb: -1 }}>
            <Box
              sx={{
                width: 2,
                height: 24,
                bgcolor: theme.palette.divider_alpha.main_50,
              }}
            />
          </Box>

          {/* Packs Row */}
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                borderRadius: "12px",
                bgcolor: theme.palette.success._alpha.main_10,
                color: "success.main",
              }}
            >
              <CategoryIcon />
            </Box>
            <Box flexGrow={1}>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={500}
              >
                {dict.dashboard.overview.warehouseThroughput.itemsPacked}
              </Typography>
              <Typography variant="h5" fontWeight={700} color="text.primary">
                {packs.toLocaleString("en-US")}
              </Typography>
            </Box>
          </Stack>
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="center"
          spacing={1}
        >
          <CallMergeIcon sx={{ fontSize: 18, color: "text.secondary" }} />
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            {dict.dashboard.overview.warehouseThroughput.netDifference}:{" "}
            <span
              style={{
                color: picks > packs ? theme.palette.warning.main : theme.palette.success.main,
              }}
            >
              {Math.abs(picks - packs)}
            </span>
          </Typography>
        </Stack>
      </Box>
    </CustomCard>
  );
};

export default PicksPacksDailyCard;
