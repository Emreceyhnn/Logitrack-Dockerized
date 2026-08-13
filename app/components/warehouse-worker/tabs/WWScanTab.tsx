import { Box, Stack, Typography, Card, Avatar, useTheme } from "@mui/material";
import { Ico } from "@/app/components/warehouse-worker/Ico";
import WWScanSection from "@/app/components/warehouse-worker/WWScanSection";
import WWLiveFeed from "@/app/components/warehouse-worker/WWLiveFeed";
import { I } from "@/app/lib/utils/warehouseWorkerUi";
import type { WWState } from "@/app/hooks/useWarehouseWorkerState";

export default function WWScanTab({ state }: { state: WWState }) {
  const theme = useTheme();
  const { ww, dict, feed, scanResult, scanInput, setScanInput, doScan, simScan, scanQty, setScanQty, log, adjust, setScanResult } = state;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography sx={{ fontSize: { xs: 18, md: 22 }, fontWeight: 800 }}>{ww.ui.scanLogMovements}</Typography>
        <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary, mt: 1 }}>{ww.ui.scanSubtitle}</Typography>
      </Box>
      {/* Stacked on phones: side-by-side would leave the scan input and the feed
          table both too narrow to use. Splits into two columns from md up. */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems={{ xs: "stretch", md: "flex-start" }}>
        <Card data-tour="ww-scan-section" sx={{ bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, borderRadius: 3, flex: { md: 1.4 }, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: { xs: 2, md: 2.5 } }}>
            <Avatar sx={{ bgcolor: `${theme.palette.primary.main}1f`, color: theme.palette.primary.main, borderRadius: 2 }}>
              <Ico d={I.scan} size={19} />
            </Avatar>
            <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{ww.ui.scanAnItem}</Typography>
          </Stack>
          <Box sx={{ borderTop: `1px solid ${theme.palette.divider}` }}>
            <WWScanSection scanResult={scanResult} scanInput={scanInput} setScanInput={setScanInput} doScan={doScan} simScan={simScan} scanQty={scanQty} setScanQty={setScanQty} log={log} adjust={adjust} setScanResult={setScanResult} ww={ww} />
          </Box>
        </Card>
        <Box sx={{ flex: { md: 1 }, minWidth: 0 }}>
          <WWLiveFeed fd={feed} ww={dict.warehouseWorker} />
        </Box>
      </Stack>
    </Stack>
  );
}
