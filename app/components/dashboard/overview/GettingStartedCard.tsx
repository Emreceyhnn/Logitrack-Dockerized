"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { formatMessage } from "@/app/lib/language/language";
import { buildLocalizedHref } from "@/app/lib/language/navigation";

export interface GettingStartedCardProps {
  /** Whether the company already has at least one vehicle. */
  hasVehicles: boolean;
  /** Whether the company already has at least one (active) driver. */
  hasDrivers: boolean;
  /** Whether the company already has at least one shipment. */
  hasShipments: boolean;
  /** Starts the guided tour of the (still-empty) dashboard. */
  onStartTour: () => void;
}

/**
 * First-run empty-state checklist for the Overview. A brand-new company sees
 * all-zero KPIs and blank charts with no idea what to do first; this replaces
 * that void with three concrete next steps (add vehicle / driver / shipment),
 * each linking straight to the page that performs it. Each item flips to a
 * done state as the underlying data appears, so the card doubles as progress.
 *
 * Rendered only while the company is still empty (see OverviewContent) — once
 * all three exist there's real data to show and this disappears on its own.
 */
export default function GettingStartedCard({
  hasVehicles,
  hasDrivers,
  hasShipments,
  onStartTour,
}: GettingStartedCardProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const params = useParams();
  const lang = (params?.lang as string) || "en";
  const gs = dict.overview.gettingStarted;

  const steps = [
    {
      key: "vehicle",
      done: hasVehicles,
      icon: <LocalShippingOutlinedIcon />,
      title: gs.addVehicleTitle,
      desc: gs.addVehicleDesc,
      cta: gs.addVehicleCta,
      href: buildLocalizedHref("/vehicle", lang),
    },
    {
      key: "driver",
      done: hasDrivers,
      icon: <PersonOutlineIcon />,
      title: gs.addDriverTitle,
      desc: gs.addDriverDesc,
      cta: gs.addDriverCta,
      href: buildLocalizedHref("/drivers", lang),
    },
    {
      key: "shipment",
      done: hasShipments,
      icon: <Inventory2OutlinedIcon />,
      title: gs.addShipmentTitle,
      desc: gs.addShipmentDesc,
      cta: gs.addShipmentCta,
      href: buildLocalizedHref("/shipments", lang),
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const progressPct = (doneCount / steps.length) * 100;

  return (
    <Card
      sx={{
        borderRadius: 4,
        border: `1px solid ${theme.palette.divider}`,
        backgroundImage: "none",
      }}
    >
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h5" fontWeight={800} gutterBottom>
              {gs.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {gs.subtitle}
            </Typography>
          </Box>
          <Button
            variant="text"
            startIcon={<PlayCircleOutlineIcon />}
            onClick={onStartTour}
            sx={{ flexShrink: 0, textTransform: "none", fontWeight: 700 }}
          >
            {gs.takeTour}
          </Button>
        </Stack>

        {/* Progress */}
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {formatMessage(gs.progress, {
              done: doneCount,
              total: steps.length,
            })}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progressPct}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Stack>

        <Stack spacing={2}>
          {steps.map((step) => (
            <Box
              key={step.key}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 2,
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: step.done
                  ? theme.palette.success._alpha?.main_10 ||
                    "rgba(46, 125, 50, 0.08)"
                  : "transparent",
                opacity: step.done ? 0.75 : 1,
                transition: "background-color 0.2s, opacity 0.2s",
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: step.done
                    ? "transparent"
                    : theme.palette.primary._alpha?.main_10 ||
                      "rgba(25, 118, 210, 0.1)",
                  color: step.done
                    ? theme.palette.success.main
                    : theme.palette.primary.main,
                }}
              >
                {step.done ? (
                  <CheckCircleIcon sx={{ fontSize: 32 }} />
                ) : (
                  step.icon
                )}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{
                    textDecoration: step.done ? "line-through" : "none",
                  }}
                >
                  {step.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.desc}
                </Typography>
              </Box>

              {step.done ? (
                <Chip
                  label={gs.done}
                  color="success"
                  size="small"
                  variant="outlined"
                  sx={{ flexShrink: 0, fontWeight: 700 }}
                />
              ) : (
                <Button
                  component={Link}
                  href={step.href}
                  variant="contained"
                  sx={{
                    flexShrink: 0,
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  {step.cta}
                </Button>
              )}
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
