"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { keyframes } from "@mui/system";
import dynamic from "next/dynamic";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import RadioButtonCheckedRoundedIcon from "@mui/icons-material/RadioButtonCheckedRounded";
import type { Dictionary } from "@/app/lib/language/language";
import {
  trackShipment,
  type PublicTrackingResult,
} from "@/app/lib/actions/publicTracking";
import type { ShipmentStatus } from "@prisma/client";

// Leaflet touches window/document, so the map is client-only. Lazy-loading it
// also keeps leaflet out of this route's initial bundle until a result renders.
const MapWithMarkers = dynamic(
  () => import("@/app/components/valhalla/mapWithMarker"),
  { ssr: false }
);

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

type ErrorKey = "invalid" | "notFound" | "rateLimited" | "internal";

const ERROR_MAP: Record<
  "INVALID" | "NOT_FOUND" | "RATE_LIMITED" | "INTERNAL",
  ErrorKey
> = {
  INVALID: "invalid",
  NOT_FOUND: "notFound",
  RATE_LIMITED: "rateLimited",
  INTERNAL: "internal",
};

export default function TrackClient({
  dict,
  lang,
  initialTrackingId,
}: {
  dict: Dictionary;
  lang: string;
  initialTrackingId: string;
}) {
  const t = dict.landing.trackingPage;

  const [value, setValue] = useState(initialTrackingId);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicTrackingResult | null>(null);
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);

  const formatDateTime = useCallback(
    (iso: string) =>
      new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso)),
    [lang]
  );

  const statusLabel = useCallback(
    (status: ShipmentStatus) => t.status[status] ?? status,
    [t]
  );

  // Map markers: coarse last-known area (vehicle icon) + destination (pin).
  // `len` mirrors the map component's marker shape (it uses `len` for lng).
  const mapMarkers = useMemo(() => {
    if (!result) return [];
    const markers: {
      id: string;
      type: string;
      lat: number;
      len: number;
      name: string;
    }[] = [];
    if (result.lastKnownArea) {
      markers.push({
        id: "last-known",
        type: "V",
        lat: result.lastKnownArea.lat,
        len: result.lastKnownArea.lng,
        name: t.mapLastReported,
      });
    }
    if (result.destinationCoord) {
      markers.push({
        id: "destination",
        type: "C",
        lat: result.destinationCoord.lat,
        len: result.destinationCoord.lng,
        name: t.mapDestination,
      });
    }
    return markers;
  }, [result, t]);

  const runLookup = useCallback(
    async (id: string) => {
      const trimmed = id.trim();
      if (!trimmed) {
        setErrorKey("invalid");
        setResult(null);
        return;
      }
      setLoading(true);
      setErrorKey(null);
      try {
        const res = await trackShipment(trimmed);
        if (res.ok) {
          setResult(res.data);
        } else {
          setResult(null);
          setErrorKey(ERROR_MAP[res.error]);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Deep-link support: if the page loaded with ?trackingId=, look it up once.
  useEffect(() => {
    if (initialTrackingId.trim()) {
      runLookup(initialTrackingId);
    }
  }, [initialTrackingId, runLookup]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runLookup(value);
  };

  const reset = () => {
    setResult(null);
    setErrorKey(null);
    setValue("");
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      bgcolor: "rgba(255,255,255,0.03)",
      color: "#f1f5f9",
      "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
      "&:hover fieldset": { borderColor: "rgba(56,189,248,0.4)" },
      "&.Mui-focused fieldset": { borderColor: "#38bdf8" },
    },
    "& .MuiInputLabel-root": { color: "rgba(241,245,249,0.6)" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#38bdf8" },
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#0f172a",
        color: "#f1f5f9",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 20%, #3b82f626 0%, transparent 40%)," +
            "radial-gradient(circle at 80% 80%, #6366f11a 0%, transparent 50%)",
          zIndex: 0,
        }}
      />

      <Container
        maxWidth="sm"
        sx={{
          position: "relative",
          zIndex: 1,
          pt: { xs: 14, md: 20 },
          pb: { xs: 10, md: 16 },
        }}
      >
        <Stack
          spacing={3}
          alignItems="center"
          textAlign="center"
          mb={6}
          sx={{ animation: `${fadeIn} 0.8s ease-out` }}
        >
          <Chip
            label={t.badge}
            sx={{
              borderRadius: "999px",
              px: 2,
              py: 0.5,
              bgcolor: "rgba(56,189,248,0.1)",
              border: "1px solid rgba(56,189,248,0.3)",
              color: "#38bdf8",
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              fontSize: "0.75rem",
            }}
          />
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 800,
              lineHeight: 1.1,
              background:
                "linear-gradient(120deg, #f8fafc 0%, #38bdf8 55%, #a855f7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {t.title}
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: "rgba(241,245,249,0.7)", maxWidth: 520, lineHeight: 1.6 }}
          >
            {t.subtitle}
          </Typography>
        </Stack>

        {/* Input */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            background: "rgba(15,23,42,0.5)",
            border: "1px solid rgba(56,189,248,0.1)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              name="trackingId"
              label={t.inputLabel}
              placeholder={t.inputPlaceholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              fullWidth
              autoComplete="off"
              sx={inputSx}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={<SearchRoundedIcon />}
              sx={{
                px: 4,
                fontWeight: 800,
                textTransform: "none",
                borderRadius: "12px",
                whiteSpace: "nowrap",
                background: "linear-gradient(135deg, #22d3ee, #2563eb)",
                "&:hover": {
                  background: "linear-gradient(135deg, #0ea5e9, #1d4ed8)",
                },
              }}
            >
              {loading ? t.tracking : t.trackButton}
            </Button>
          </Stack>
        </Box>

        {/* Error */}
        {errorKey && !loading && (
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{
              mt: 3,
              p: 2.5,
              borderRadius: 3,
              bgcolor: "rgba(248, 113, 113, 0.08)",
              border: "1px solid rgba(248, 113, 113, 0.3)",
              animation: `${fadeIn} 0.4s ease-out`,
            }}
          >
            <ErrorOutlineRoundedIcon sx={{ color: "#f87171" }} />
            <Typography variant="body2" sx={{ color: "#fecaca" }}>
              {t.errors[errorKey]}
            </Typography>
          </Stack>
        )}

        {/* Result */}
        {result && !loading && (
          <Box
            sx={{
              mt: 4,
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              background: "linear-gradient(135deg, #38bdf81a 0%, #6366f10d 100%)",
              border: "1px solid rgba(56,189,248,0.2)",
              animation: `${fadeIn} 0.5s ease-out`,
            }}
          >
            {/* Status headline */}
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ mb: 1 }}
            >
              {result.isComplete ? (
                <CheckCircleRoundedIcon
                  sx={{ fontSize: 32, color: "#34d399" }}
                />
              ) : (
                <RadioButtonCheckedRoundedIcon
                  sx={{ fontSize: 32, color: "#38bdf8" }}
                />
              )}
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {statusLabel(result.status)}
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              sx={{ color: "rgba(241,245,249,0.5)" }}
            >
              {t.resultTitle.replace("{id}", result.trackingId)}
            </Typography>

            {/* Destination + ETA */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mt: 3 }}
            >
              {result.destination && (
                <InfoTile
                  icon={<PlaceRoundedIcon sx={{ fontSize: 20 }} />}
                  label={t.destinationLabel}
                  value={result.destination}
                />
              )}
              <InfoTile
                icon={<ScheduleRoundedIcon sx={{ fontSize: 20 }} />}
                label={t.etaLabel}
                value={
                  result.isComplete
                    ? t.etaComplete
                    : result.estimatedArrival
                      ? formatDateTime(result.estimatedArrival)
                      : t.etaUnknown
                }
              />
            </Stack>

            {/* Map — coarse last-known area + destination. Shown only when we
                have at least one coordinate to place. */}
            {mapMarkers.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "rgba(241,245,249,0.6)",
                    fontSize: "0.7rem",
                    mb: 2,
                  }}
                >
                  {t.mapTitle}
                </Typography>
                <Box
                  sx={{
                    height: 280,
                    borderRadius: 3,
                    overflow: "hidden",
                    border: "1px solid rgba(56,189,248,0.15)",
                  }}
                >
                  <MapWithMarkers
                    markers={mapMarkers}
                    zoom={result.lastKnownArea ? 8 : 9}
                    tileErrorText={t.mapUnavailable}
                  />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    mt: 1,
                    color: "rgba(241,245,249,0.45)",
                    fontStyle: "italic",
                  }}
                >
                  {t.mapApproxNote}
                </Typography>
              </Box>
            )}

            {/* Timeline */}
            <Box sx={{ mt: 4 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: "rgba(241,245,249,0.6)",
                  fontSize: "0.7rem",
                  mb: 2,
                }}
              >
                {t.timelineTitle}
              </Typography>
              {result.events.length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(241,245,249,0.5)" }}
                >
                  {t.noHistory}
                </Typography>
              ) : (
                <Stack spacing={0}>
                  {[...result.events].reverse().map((ev, i, arr) => (
                    <Stack
                      key={i}
                      direction="row"
                      spacing={2}
                      sx={{ position: "relative" }}
                    >
                      {/* Dot + connector */}
                      <Stack alignItems="center" sx={{ width: 24 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            mt: 0.5,
                            bgcolor: i === 0 ? "#38bdf8" : "rgba(56,189,248,0.4)",
                            border: "2px solid rgba(56,189,248,0.5)",
                          }}
                        />
                        {i < arr.length - 1 && (
                          <Box
                            sx={{
                              width: 2,
                              flex: 1,
                              minHeight: 28,
                              bgcolor: "rgba(56,189,248,0.2)",
                            }}
                          />
                        )}
                      </Stack>
                      <Box sx={{ pb: 3 }}>
                        <Typography sx={{ fontWeight: 700 }}>
                          {statusLabel(ev.status)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "rgba(241,245,249,0.6)" }}
                        >
                          {formatDateTime(ev.at)}
                          {ev.location ? ` · ${ev.location}` : ""}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>

            <Button
              onClick={reset}
              variant="text"
              sx={{
                mt: 1,
                px: 0,
                textTransform: "none",
                fontWeight: 700,
                color: "#38bdf8",
              }}
            >
              {t.searchAnother}
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        p: 2.5,
        borderRadius: 3,
        background: "rgba(15,23,42,0.4)",
        border: "1px solid rgba(56,189,248,0.1)",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ color: "rgba(241,245,249,0.6)", mb: 0.5 }}
      >
        {icon}
        <Typography
          variant="caption"
          sx={{ textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}
        >
          {label}
        </Typography>
      </Stack>
      <Typography sx={{ fontWeight: 700 }}>{value}</Typography>
    </Box>
  );
}
