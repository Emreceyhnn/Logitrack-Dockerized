import { Box, Stack, Typography, useTheme } from "@mui/material";
import WWLiveFeed from "@/app/components/warehouse-worker/WWLiveFeed";
import type { WWState } from "@/app/hooks/useWarehouseWorkerState";

export default function WWActivityTab({ state }: { state: WWState }) {
  const theme = useTheme();
  const { ww, dict, feed } = state;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography sx={{ fontSize: { xs: 18, md: 22 }, fontWeight: 800 }}>{ww.ui.liveActivity}</Typography>
        <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary, mt: 1 }}>{ww.ui.liveActivitySubtitle}</Typography>
      </Box>
      <Box data-tour="ww-activity-feed">
        <WWLiveFeed fd={feed} ww={dict.warehouseWorker} />
      </Box>
    </Stack>
  );
}
