"use client";

import {
  Box,
  Stack,
  Typography,
  Card,
  Avatar,
  LinearProgress,
  CircularProgress,
  useTheme,
} from "@mui/material";
import type {
  Zone,
  WarehouseWorkerDict,
} from "@/app/lib/type/warehouseWorkerClient";
import { zoneColor, I } from "@/app/lib/utils/warehouseWorkerUi";
import { Ico } from "./Ico";

interface WWCapacityCardProps {
  ww: WarehouseWorkerDict;
  zones: Zone[];
  currentZone: string;
  capUsed: number;
  capTotal: number;
  capacityPct: number;
  anyCritical: boolean;
}

/** Compact site-capacity card shown in the dashboard sidebar. */
export default function WWCapacityCard({
  ww,
  zones,
  currentZone,
  capUsed,
  capTotal,
  capacityPct,
  anyCritical,
}: WWCapacityCardProps) {
  const theme = useTheme();
  return (
    <Card
      sx={{
        bgcolor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderRadius: 3,
        p: 2.5,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar
            sx={{
              bgcolor: `${theme.palette.primary.main}1f`,
              color: theme.palette.primary.main,
              borderRadius: 2,
            }}
          >
            <Ico d={I.capacity} size={19} />
          </Avatar>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
            {ww.ui.siteCapacity}
          </Typography>
        </Stack>
        {anyCritical && (
          <Box
            sx={{
              color: theme.palette.error.main,
              bgcolor: "rgba(244,67,54,0.12)",
              px: 1,
              py: 0.5,
              borderRadius: 1.5,
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {ww.ui.zoneNearFull}
          </Box>
        )}
      </Stack>
      <Stack direction="row" spacing={2.5} alignItems="center">
        <Box sx={{ position: "relative", display: "inline-flex" }}>
          <CircularProgress
            variant="determinate"
            value={100}
            size={100}
            sx={{ color: "rgba(255,255,255,0.08)" }}
          />
          <CircularProgress
            variant="determinate"
            value={capacityPct}
            size={100}
            sx={{
              color: zoneColor(capacityPct, theme),
              position: "absolute",
              left: 0,
            }}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: "absolute",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            <Typography sx={{ fontSize: 22, fontWeight: 900 }}>
              {capacityPct}%
            </Typography>
          </Box>
        </Box>
        <Box>
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 600,
              color: theme.palette.text.secondary,
            }}
          >
            {ww.ui.palletPositions}
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 800, mt: 1 }}>
            {capUsed.toLocaleString()}{" "}
            <Box
              component="span"
              sx={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}
            >
              / {capTotal.toLocaleString()}
            </Box>
          </Typography>
        </Box>
      </Stack>
      <Stack
        spacing={1.5}
        sx={{
          mt: 2.5,
          pt: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        {zones.map((z) => (
          <Box key={z.name}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 0.5 }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  color:
                    z.name === currentZone
                      ? "#fff"
                      : theme.palette.text.secondary,
                }}
              >
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    bgcolor: zoneColor(z.pct, theme),
                  }}
                />
                <Box>
                  {ww.ui.zone} {z.name}
                </Box>
                {z.name === currentZone && (
                  <Box
                    sx={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: theme.palette.primary.main,
                      bgcolor: "rgba(56,189,248,0.12)",
                      px: 0.5,
                      py: 0.25,
                      borderRadius: 1,
                    }}
                  >
                    {ww.ui.activeLabel}
                  </Box>
                )}
              </Stack>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: zoneColor(z.pct, theme),
                  fontFamily: "monospace",
                }}
              >
                {z.pct}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={z.pct}
              sx={{
                height: 6,
                borderRadius: 6,
                bgcolor: "rgba(255,255,255,0.07)",
                "& .MuiLinearProgress-bar": {
                  bgcolor: zoneColor(z.pct, theme),
                },
              }}
            />
          </Box>
        ))}
      </Stack>
    </Card>
  );
}
