"use client";

import { Stack, Typography, Card, Button, Avatar, useTheme } from "@mui/material";
import type {
  Zone,
  WarehouseWorkerDict,
} from "@/app/lib/type/warehouseWorkerClient";
import { Ico } from "./Ico";

interface WWControlPanelProps {
  ww: WarehouseWorkerDict;
  zones: Zone[];
  currentZone: string;
  setCurrentZone: (zone: string) => void;
  onRestock: () => void;
  onReport: () => void;
  onReportDamage: () => void;
  onLogArrival: () => void;
}

/** Active-zone picker plus quick actions (restock / report / log arrival) sidebar card. */
export default function WWControlPanel({
  ww,
  zones,
  currentZone,
  setCurrentZone,
  onRestock,
  onReport,
  onReportDamage,
  onLogArrival,
}: WWControlPanelProps) {
  const theme = useTheme();
  return (
    <Card
      data-tour="ww-control-panel"
      sx={{
        bgcolor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderRadius: 3,
        p: 2.5,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <Avatar
          sx={{
            bgcolor: `${theme.palette.kpi.purple}1f`,
            color: theme.palette.kpi.purple,
            borderRadius: 2,
          }}
        >
          <Ico d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h12M20 18h0" size={19} />
        </Avatar>
        <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
          {ww.ui.controlPanel}
        </Typography>
      </Stack>
      <Typography
        variant="overline"
        sx={{ color: theme.palette.text.secondary, fontWeight: 700, mb: 1 }}
      >
        {ww.ui.activePickZone}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {zones
          .map((z) => z.name)
          .map((z) => {
            const on = z === currentZone;
            return (
              <Button
                key={z}
                onClick={() => setCurrentZone(z)}
                sx={{
                  flex: 1,
                  borderRadius: 3,
                  fontWeight: 700,
                  border: `1px solid ${on ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.1)"}`,
                  bgcolor: on
                    ? "rgba(56,189,248,0.16)"
                    : "rgba(255,255,255,0.03)",
                  color: on
                    ? theme.palette.primary.main
                    : theme.palette.text.secondary,
                }}
              >
                {z}
              </Button>
            );
          })}
      </Stack>
      <Typography
        variant="overline"
        sx={{ color: theme.palette.text.secondary, fontWeight: 700, mb: 1 }}
      >
        {ww.ui.quickActions}
      </Typography>
      <Stack data-tour="ww-quick-actions" spacing={1}>
        <Button
          onClick={onLogArrival}
          startIcon={<Ico d="M3 12h18M3 12l6-6M3 12l6 6" size={17} />}
          sx={{
            justifyContent: "flex-start",
            py: 1.5,
            borderRadius: 3,
            bgcolor: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.22)",
            color: theme.palette.kpi.emerald,
            fontWeight: 700,
            textTransform: "none",
          }}
        >
          {ww.ui.logArrival}
        </Button>
        <Button
          onClick={onRestock}
          startIcon={<Ico d="M12 3v11M8 10l4 4 4-4M4 21h16" size={17} />}
          sx={{
            justifyContent: "flex-start",
            py: 1.5,
            borderRadius: 3,
            bgcolor: "rgba(34,211,238,0.08)",
            border: "1px solid rgba(34,211,238,0.22)",
            color: theme.palette.kpi.cyan,
            fontWeight: 700,
            textTransform: "none",
          }}
        >
          {ww.ui.requestRestockZone} {currentZone}
        </Button>
        <Button
          onClick={onReport}
          startIcon={<Ico d="M12 3 2 20h20L12 3zM12 10v4M12 17h.01" size={17} />}
          sx={{
            justifyContent: "flex-start",
            py: 1.5,
            borderRadius: 3,
            bgcolor: "rgba(244,67,54,0.08)",
            border: "1px solid rgba(244,67,54,0.22)",
            color: theme.palette.error.main,
            fontWeight: 700,
            textTransform: "none",
          }}
        >
          {ww.ui.reportIssue}
        </Button>
        <Button
          onClick={onReportDamage}
          startIcon={
            <Ico d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" size={17} />
          }
          sx={{
            justifyContent: "flex-start",
            py: 1.5,
            borderRadius: 3,
            bgcolor: "rgba(249,115,22,0.08)",
            border: "1px solid rgba(249,115,22,0.22)",
            color: theme.palette.kpi.amber,
            fontWeight: 700,
            textTransform: "none",
          }}
        >
          {ww.ui.reportDamage}
        </Button>
      </Stack>
    </Card>
  );
}
