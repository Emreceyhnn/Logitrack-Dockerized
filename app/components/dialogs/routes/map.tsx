import { useEffect, useMemo, useState } from "react";
import { Box, Typography, Stack, CircularProgress } from "@mui/material";
import dynamic from "next/dynamic";
import {
  polylineHelper,
  PolylineHelperResult,
} from "../../valhalla/polylineHelper";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { formatMessage } from "@/app/lib/language/language";
import { logger } from "@/app/lib/logger";
import { decodeShape } from "@/app/lib/valhalla";
import { DEFAULT_ROUTE_BUFFER_METERS } from "@/app/lib/type/routeDeviation";


const MapWithPolyline = dynamic(
  () => import("../../valhalla/mapWithPolyline"),
  { ssr: false }
);

interface MapRoutesDialogCardProps {
  origin?: string | { lat: number; lng: number; address?: string } | undefined;
  destination?: string | { lat: number; lng: number; address?: string } | undefined;
  stops?: Array<{
    location: string | { lat: number; lng: number };
    stopover?: boolean;
  }>;
  addrA?: string;
  addrB?: string;
  vehicleLocation?: {
    lat: number;
    lng: number;
    name: string;
    id: string;
  } | null;
  onMapClick?: (e: unknown) => void;
  onRouteInfoUpdate?: (data: {
    distanceKm: number;
    durationMin: number;
  }) => void;
  /**
   * The saved route's corridor geometry. `shape` is preferred over the freshly
   * fetched polyline for drawing the band: deviation alerts are measured
   * against the *stored* shape, so showing anything else would misrepresent
   * where the vehicle actually has to stay.
   */
  shape?: string | null | undefined;
  bufferMeters?: number | null | undefined;
}

const MapRoutesDialogCard = ({
  origin,
  destination,
  stops,
  addrA,
  addrB,
  vehicleLocation,
  onRouteInfoUpdate,
  shape,
  bufferMeters,
}: MapRoutesDialogCardProps) => {
  const dict = useDictionary();
  const isRoute = !!((origin || addrA) && (destination || addrB));

  const [data, setData] = useState<PolylineHelperResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // The corridor is drawn from the persisted shape — the same geometry the
  // server measures deviations against. Routes saved before the shape column
  // existed have none, so no band is drawn rather than a misleading one built
  // from a re-fetched polyline.
  const corridor = useMemo(() => {
    if (!shape) return null;
    try {
      const points = decodeShape(shape);
      return points.length > 0 ? points : null;
    } catch (error) {
      logger.error("Failed to decode stored route shape:", error);
      return null;
    }
  }, [shape]);

  const waypoints = useMemo(() => {
    const points = [];
    if (origin && typeof origin === "object" && "lat" in origin) {
      points.push({
        name: (origin as { address?: string }).address || "Origin",
        lat: origin.lat,
        lon: origin.lng,
      });
    }

    if (stops) {
      stops.forEach((s) => {
        const loc = s.location;
        if (typeof loc === "object" && "lat" in loc) {
          points.push({ name: "Stop", lat: loc.lat, lon: loc.lng });
        }
      });
    }

    if (
      destination &&
      typeof destination === "object" &&
      "lat" in destination
    ) {
      points.push({
        name: (destination as { address?: string }).address || "Destination",
        lat: destination.lat,
        lon: destination.lng,
      });
    }

    return points;
  }, [origin, destination, stops]);

  // Content-addressed stand-in for `waypoints`. Callers rebuild the
  // origin/destination/stops props on every render, so depending on the array
  // reference refired this request in a loop — which burned through the demo
  // routing rate limit and left the map with markers but no line.
  const waypointsKey = useMemo(
    () => waypoints.map((p) => `${p.lat},${p.lon}`).join("|"),
    [waypoints]
  );

  useEffect(() => {
    if (waypoints.length < 2) {
      setData(null);
      setIsLoading(false);
      return;
    }

    // Show the loader from the same commit that starts the request, so the map
    // is never briefly bare while a fetch is already in flight.
    setIsLoading(true);

    // Waypoints can change while a request is outstanding (the user edits a
    // stop). Without this guard a slow earlier response could land after a fast
    // later one and leave the map showing a route the user has moved on from.
    let cancelled = false;

    (async () => {
      try {
        const response = await polylineHelper({
          locations: waypoints,
          costing: "truck",
        });
        if (cancelled) return;

        setData(response ?? null);

        if (response?.summary && onRouteInfoUpdate) {
          onRouteInfoUpdate({
            distanceKm: response.summary.length || 0,
            durationMin: Math.round((response.summary.time || 0) / 60),
          });
        }
      } catch (error) {
        if (!cancelled) logger.error("Valhalla API Error:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // `waypoints`/`onRouteInfoUpdate` are read but intentionally not depended
    // on: `waypointsKey` is the content-addressed stand-in for the former, and
    // the latter is a setState function whose identity callers keep stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypointsKey]);

  return (
    <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Kept mounted and faded out rather than unmounted, so the overlay
          releases the map smoothly instead of popping away. `pointer-events`
          follows visibility so the hidden overlay can't swallow map drags.
          zIndex sits above Leaflet's own panes (max 800). */}
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
            {dict.common?.loading || "Yükleniyor..."}
          </Typography>
        </Stack>
      </Box>
      <MapWithPolyline
        Polylines={data?.mapPoints || []}
        routePolyline={data?.polyline ?? null}
        bufferPolyline={corridor}
        bufferMeters={corridor ? (bufferMeters || DEFAULT_ROUTE_BUFFER_METERS) : undefined}
        vehicleLocation={
          vehicleLocation
            ? {
                lat: vehicleLocation.lat,
                lng: vehicleLocation.lng,
                name: vehicleLocation.name,
              }
            : null
        }
      />

      <Box
        sx={{
          position: "absolute",
          top: 16,
          left: 16,
          bgcolor: (theme) => theme.palette.background.midnight._alpha.main_80,
          backdropFilter: "blur(8px)",
          px: 1.5,
          py: 0.75,
          borderRadius: "8px",
          border: (theme) =>
            `1px solid ${theme.palette.common.white_alpha.main_10}`,
          zIndex: 1,
        }}
      >
        <Typography
          variant="caption"
          fontWeight={700}
          color="white"
          sx={{ letterSpacing: "0.05em" }}
        >
          {isRoute
            ? dict.routes.details.missionRoute
            : dict.routes.details.liveTelemetryMap}
          {data?.summary && (
            <Typography component="span" variant="caption" color="error.main" sx={{ ml: 1 }}>
              • CO₂: {(data.summary.length * 0.9).toFixed(1)} kg
            </Typography>
          )}
        </Typography>
      </Box>

      {/* Names the amber band, which is otherwise unexplained on screen. */}
      {corridor && (
        <Box
          sx={{
            position: "absolute",
            bottom: 16,
            left: 16,
            bgcolor: (theme) => theme.palette.background.midnight._alpha.main_80,
            backdropFilter: "blur(8px)",
            px: 1.5,
            py: 0.75,
            borderRadius: "8px",
            border: (theme) =>
              `1px solid ${theme.palette.common.white_alpha.main_10}`,
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 14,
              height: 8,
              borderRadius: "2px",
              bgcolor: "#f59e0b",
              opacity: 0.5,
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" color="white" fontWeight={600}>
            {formatMessage(dict.routes.details.deviationCorridor, {
              buffer: bufferMeters || DEFAULT_ROUTE_BUFFER_METERS,
            })}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MapRoutesDialogCard;
