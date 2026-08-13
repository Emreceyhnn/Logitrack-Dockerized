"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  Stack,
  Typography,
  useTheme,
  Theme,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { ShipmentWithRelations } from "@/app/lib/type/shipment";
import { ShipmentItem } from "@/app/lib/type/enums";
import { StatusChip } from "@/app/components/chips/statusChips";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { Dictionary } from "@/app/lib/language/language";
import { decodeShape } from "@/app/lib/valhalla";
import { DEFAULT_ROUTE_BUFFER_METERS } from "@/app/lib/type/routeDeviation";
import { logger } from "@/app/lib/logger";
import ShipmentOverviewTab from "./sections/ShipmentOverviewTab";
import ShipmentItemsTab from "./sections/ShipmentItemsTab";
import { motion, AnimatePresence } from "framer-motion";
import {
  polylineHelper,
  PolylineHelperResult,
} from "../../valhalla/polylineHelper";
import dynamic from "next/dynamic";
const MapWithPolyline = dynamic(
  () => import("../../valhalla/mapWithPolyline"),
  {
    ssr: false,
  }
);

interface ShipmentDetailDialogProps {
  open: boolean;
  onClose: () => void;
  shipment: ShipmentWithRelations | null;
  /** Opens the status-update flow for this shipment (optional). */
  onUpdateStatus?: (shipment: ShipmentWithRelations) => void;
}

const formatDuration = (minutes: number, dict: Dictionary) => {
  if (minutes <= 0) return "--";
  // tr-`common.timeUnits` her iki sözlükte de tanımlı; cast/fallback gerekmiyor.
  // en-`common.timeUnits` exists in both dictionaries; no cast or fallback needed.
  const units = dict.common.timeUnits;
  
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = Math.floor(minutes % 60);
  
  if (days > 0) {
    let result = `${days} ${units.day}`;
    if (hours > 0) result += ` ${hours} ${units.hour}`;
    return result;
  }
  
  if (hours > 0) {
    let result = `${hours} ${units.hour}`;
    if (mins > 0) result += ` ${mins} ${units.minute}`;
    return result;
  }
  
  return `${mins} ${units.minute}`;
};

/* ── Pill tab button ── */
const PillTab = ({
  id,
  icon,
  label,
  badge,
  active,
  onClick,
  theme,
}: {
  id?: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active: boolean;
  onClick: () => void;
  theme: Theme;
}) => {
  return (
    <Box
      id={id}
      component="button"
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.5,
        py: 0.6,
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        transition: "all 0.18s ease",
        bgcolor: active ? theme.palette.primary._alpha.main_15 : "transparent",
        color: active ? "primary.main" : "text.secondary",
        "&:hover": {
          bgcolor: active
            ? theme.palette.primary._alpha.main_20
            : theme.palette.action.hover,
          color: active ? "primary.main" : "text.primary",
        },
      }}
    >
      <Box sx={{ display: "flex", fontSize: 15, color: "inherit" }}>{icon}</Box>
      <Typography
        variant="caption"
        fontWeight={active ? 700 : 500}
        sx={{ color: "inherit", fontSize: "0.78rem" }}
      >
        {label}
      </Typography>
      {badge != null && badge > 0 && (
        <Box
          sx={{
            px: 0.75,
            lineHeight: "17px",
            borderRadius: "5px",
            fontSize: "0.6rem",
            fontWeight: 800,
            bgcolor: active
              ? theme.palette.primary._alpha.main_25
              : theme.palette.action.selected,
            color: active ? "primary.main" : "text.secondary",
          }}
        >
          {badge}
        </Box>
      )}
    </Box>
  );
};

export default function ShipmentDetailDialog({
  open,
  onClose,
  shipment,
  onUpdateStatus,
}: ShipmentDetailDialogProps) {
  /* -------------------------------------------------------------------------- */
  const waypoints = useMemo(() => {
    if (!shipment) return [];
    const pts: { name: string; lat: number; lon: number }[] = [];

    if (shipment.originLat && shipment.originLng)
      pts.push({ name: shipment.origin || "Origin", lat: shipment.originLat, lon: shipment.originLng });

    const intermediateSorted = [...(shipment.stops || [])]
      .filter((s) => s.lat && s.lng)
      .filter((s) => !(s.lat === shipment.originLat && s.lng === shipment.originLng))
      .filter((s) => !(s.lat === shipment.destinationLat && s.lng === shipment.destinationLng))
      .sort((a, b) => a.sequence - b.sequence);
      
    for (const s of intermediateSorted)
      pts.push({ name: s.address, lat: Number(s.lat), lon: Number(s.lng) });

    if (shipment.destinationLat && shipment.destinationLng)
      pts.push({ name: shipment.destination || "Destination", lat: shipment.destinationLat, lon: shipment.destinationLng });

    return pts;
  }, [shipment]);

  const [data, setData] = useState<PolylineHelperResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // A shipment has no corridor of its own — it inherits the one from the route
  // it is assigned to. Unassigned shipments therefore show no band.
  const corridor = useMemo(() => {
    const shape = shipment?.route?.shape;
    if (!shape) return null;
    try {
      const points = decodeShape(shape);
      return points.length > 0 ? points : null;
    } catch (error) {
      logger.error("Failed to decode stored route shape:", error);
      return null;
    }
  }, [shipment?.route?.shape]);

  // The effect below must not depend on `waypoints`/`shipment` by reference:
  // a parent re-render (e.g. a background refetch) hands this dialog a new
  // `shipment` object with identical contents, which recomputes `waypoints`,
  // refires the effect, sets state, and re-renders — an endless loop that also
  // exhausted the demo routing rate limit so no line was ever drawn. Keying on
  // the serialised coordinates makes the request fire only when the geometry
  // genuinely changes.
  const waypointsKey = useMemo(
    () => waypoints.map((p) => `${p.lat},${p.lon}`).join("|"),
    [waypoints]
  );

  useEffect(() => {
    // Skip the request until data has arrived and there are at least 2 points.
    if (!open || waypoints.length < 2) {
      setIsLoading(false);
      return;
    }

    // Set in the same commit that starts the request: the map must not show
    // bare while a fetch is already in flight.
    setIsLoading(true);

    // Guards against an earlier, slower response overwriting a later one when
    // the dialog reopens on a different shipment.
    let cancelled = false;

    (async () => {
      try {
        const response = await polylineHelper({
          locations: waypoints,
          costing: "truck",
        });
        if (cancelled) return;
        setData(response ?? null);
      } catch (error) {
        if (!cancelled) logger.error("Valhalla API Error:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // `waypoints` is intentionally read but not depended on — `waypointsKey` is
    // its content-addressed stand-in. See the note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypointsKey, open]);

  /* -------------------------------------------------------------------------- */

  const dict = useDictionary();
  const theme = useTheme();
  const [tab, setTab] = useState<"overview" | "items">("overview");

  const items: ShipmentItem[] = shipment?.items ?? [];

  const stops = shipment?.stops;
  const stopsSorted = useMemo(() => {
    return stops ? [...stops]
      .filter((s) => !(s.lat === shipment.originLat && s.lng === shipment.originLng))
      .filter((s) => !(s.lat === shipment.destinationLat && s.lng === shipment.destinationLng))
      .sort((a, b) => a.sequence - b.sequence) : [];
  }, [stops, shipment]);

  const hasStops = stopsSorted.length > 0;

  if (!shipment) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          overflow: "hidden",
          maxHeight: "90vh",
        },
      }}
    >
      {/* ─── Header ─────────────────────────────────────────── */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          background:
            theme.palette.mode === "dark"
              ? `linear-gradient(135deg, ${theme.palette.primary._alpha.main_10} 0%, transparent 60%)`
              : `linear-gradient(135deg, ${theme.palette.primary._alpha.main_05} 0%, transparent 100%)`,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          {/* Left: title + status */}
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography
                variant="h5"
                fontWeight={800}
                color="text.primary"
                letterSpacing="-0.02em"
              >
                {shipment.trackingId}
              </Typography>
              <StatusChip status={shipment.status} />
              {onUpdateStatus && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SwapHorizIcon sx={{ fontSize: "16px !important" }} />}
                  onClick={() => onUpdateStatus(shipment)}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: 2,
                    py: 0.25,
                  }}
                >
                  {dict.shipments.dialogs.updateStatusTitle || "Update status"}
                </Button>
              )}
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              letterSpacing="0.04em"
            >
              {dict.shipments.details.systemConsignmentId}:{" "}
              {shipment.id.substring(0, 8).toLocaleUpperCase('en-US')}
            </Typography>
          </Stack>

          {/* Right: tab switcher + close */}
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Pill switcher container */}
            <Box
              sx={{
                display: "flex",
                gap: 0.5,
                p: 0.5,
                borderRadius: "10px",
                bgcolor: theme.palette.action.hover,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <PillTab
                id="overview"
                active={tab === "overview"}
                onClick={() => setTab("overview")}
                theme={theme}
                icon={<InfoOutlinedIcon sx={{ fontSize: 15 }} />}
                label={dict.shipments.details.tabs.overview}
              />
              <PillTab
                id="items"
                active={tab === "items"}
                onClick={() => setTab("items")}
                theme={theme}
                icon={<Inventory2OutlinedIcon sx={{ fontSize: 15 }} />}
                label={dict.shipments.details.tabs.items}
                badge={items.length}
              />
            </Box>

            <IconButton
              onClick={onClose}
              sx={{
                color: "text.secondary",
                "&:hover": {
                  color: "text.primary",
                  bgcolor: theme.palette.action.hover,
                },
              }}
             aria-label="close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      {/* ─── Body ────────────────────────────────────────────── */}
      <DialogContent sx={{ p: 0, overflow: "hidden" }}>
        <Stack direction={{ xs: "column", md: "row" }}>
          {/* ── LEFT PANEL (400px, switches content by tab) ── */}
          <Box
            sx={{
              width: { xs: "100%", md: "400px" },
              borderRight: `1px solid ${theme.palette.divider}`,
              bgcolor: "background.default",
              overflow: "hidden", // Parent never scrolls; inner sections handle it
              height: { xs: "auto", md: "calc(90vh - 88px)" },
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <AnimatePresence mode="wait">
              {/* ══ TAB: Overview ════════════════════════════════ */}
              {tab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  style={{
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                  }}
                >
                  <ShipmentOverviewTab
                    shipment={shipment}
                    hasStops={hasStops}
                    stopsSorted={stopsSorted}
                  />
                </motion.div>
              )}

              {/* ══ TAB: Items ═══════════════════════════════════ */}
              {tab === "items" && (
                <motion.div
                  key="items"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    minHeight: 0,
                  }}
                >
                  <ShipmentItemsTab items={items} />
                </motion.div>
              )}
            </AnimatePresence>
          </Box>

          {/* ── RIGHT: Map + telemetry overlay ── */}
          <Box
            sx={{
              flex: 1,
              position: "relative",
              minHeight: { xs: 360, md: 400 },
              height: { md: "calc(90vh - 88px)" },
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: 0, // Isolate Leaflet's internal panes so the overlay sits on top
              }}
            >
              {/* Faded rather than unmounted so the map is handed over
                  smoothly once the route lands; `visibility`/`pointer-events`
                  keep the hidden overlay from intercepting map gestures. */}
              <Box
                aria-hidden={!isLoading}
                aria-busy={isLoading}
                sx={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "rgba(11, 15, 25, 0.7)",
                  backdropFilter: "blur(2px)",
                  opacity: isLoading ? 1 : 0,
                  visibility: isLoading ? "visible" : "hidden",
                  pointerEvents: isLoading ? "auto" : "none",
                  transition: "opacity 220ms ease, visibility 220ms ease",
                }}
              >
                <Stack alignItems="center" spacing={2}>
                  <CircularProgress size={40} color="primary" />
                  <Typography variant="body2" color="white" fontWeight={500}>
                    {dict.common?.loading || "Rota Yükleniyor..."}
                  </Typography>
                </Stack>
              </Box>
              <MapWithPolyline
                Polylines={data?.mapPoints || []}
                routePolyline={data?.polyline ?? null}
                bufferPolyline={corridor}
                bufferMeters={
                  corridor
                    ? (shipment?.route?.bufferMeters || DEFAULT_ROUTE_BUFFER_METERS)
                    : undefined
                }
              />
            </Box>

            <Box
              sx={{
                position: "absolute",
                bottom: 24,
                left: 24,
                right: 24,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(11,16,25,0.82)"
                    : theme.palette.background.paper_alpha.main_90,
                backdropFilter: "blur(12px)",
                borderRadius: 3,
                p: 2,
                border: `1px solid ${theme.palette.divider}`,
                display: "flex",
                justifyContent: "space-around",
                zIndex: 2,
              }}
            >
              <Stack alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  {dict.shipments.details.mileage}
                </Typography>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  color="text.primary"
                >
                  {(() => {
                    const dist = shipment.route?.distanceKm ?? data?.summary?.length;
                    return dist ? `${dist.toFixed(1)} km` : dict.shipments.details.tbd;
                  })()}
                </Typography>
              </Stack>
              <Divider
                orientation="vertical"
                flexItem
                sx={{ borderColor: theme.palette.common.white_alpha.main_08 }}
              />
              <Stack alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  {dict.shipments.details.duration}
                </Typography>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  color="text.primary"
                >
                  {(() => {
                    const dur = shipment.route?.durationMin ?? (data?.summary?.time ? Math.round(data.summary.time / 60) : undefined);
                    return dur ? formatDuration(dur, dict) : dict.shipments.details.tbd;
                  })()}
                </Typography>
              </Stack>
              <Divider
                orientation="vertical"
                flexItem
                sx={{ borderColor: theme.palette.common.white_alpha.main_08 }}
              />
              <Stack alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  CO₂
                </Typography>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  color="error.main"
                >
                  {(() => {
                    const dist = shipment.route?.distanceKm ?? data?.summary?.length;
                    return dist ? `${(dist * 0.9).toFixed(1)} kg` : dict.shipments.details.tbd;
                  })()}
                </Typography>
              </Stack>
            </Box>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
