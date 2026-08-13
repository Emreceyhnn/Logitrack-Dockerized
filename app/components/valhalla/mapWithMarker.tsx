import { useEffect, useRef, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { renderToString } from "react-dom/server";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import Person3Icon from "@mui/icons-material/Person3";
import PublicOffIcon from "@mui/icons-material/PublicOff";

interface Markers {
  id: string;
  type: string;
  lat: number;
  len: number;
  name: string;
}

/** Escape a value before interpolating it into a raw HTML attribute string. */
function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface MapWithMarkerProps {
  markers: Markers[];
  center?: [number, number];
  zoom?: number;
  /** When set, each marker popup shows a "details" action that calls this. */
  onMarkerClick?: (marker: Markers) => void;
  /** Label for the popup drill-down action (defaults to "View details"). */
  detailsLabel?: string;
  /** Overlay message shown when map tiles fail to load (CDN blocked/offline). */
  tileErrorText?: string;
}

function MapBoundsFit({
  markers,
  center,
  zoom,
}: {
  markers: Markers[];
  center?: [number, number] | undefined;
  zoom?: number | undefined;
}) {
  const map = useMap();

  // ── Keep the map sized to its container (fixes Leaflet's "white space" bug) ──
  // Bound to the map instance only, so it isn't torn down/rebuilt on every
  // marker update.
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    const container = map.getContainer();
    if (container) resizeObserver.observe(container);

    // Fallback invalidateSize for immediate hydration
    const t = setTimeout(() => map.invalidateSize(), 200);

    return () => {
      clearTimeout(t);
      resizeObserver.disconnect();
    };
  }, [map]);

  // ── Frame the markers ────────────────────────────────────────────────────
  // Only move the camera on first render or when the *set* of markers changes
  // (added/removed) — NOT on every position update. Otherwise a live-tracked
  // vehicle would recenter/zoom the map on every GPS tick, making the marker
  // visibly jump instead of gliding.
  const didInitRef = useRef(false);
  const prevIdsRef = useRef<string>("");
  useEffect(() => {
    const ids = markers
      .map((m) => m.id)
      .sort()
      .join(",");
    const idsChanged = ids !== prevIdsRef.current;
    prevIdsRef.current = ids;
    if (didInitRef.current && !idsChanged) return;
    didInitRef.current = true;

    let bounds: L.LatLngBounds | null = null;
    if (markers && markers.length > 0) {
      bounds = L.latLngBounds(markers.map((m) => [m.lat, m.len]));
    }

    // Apply Camera Logic (Hybrid Approach)
    if (!bounds || !bounds.isValid()) {
      if (center) map.setView(center, zoom ?? map.getZoom());
      else if (zoom !== undefined) map.setZoom(zoom);
    } else {
      if (center && zoom !== undefined) {
        map.setView(center, zoom);
      } else if (center && zoom === undefined) {
        const dynamicZoom = map.getBoundsZoom(bounds);
        map.setView(center, Math.min(dynamicZoom, 15));
      } else if (!center && zoom !== undefined) {
        map.setView(bounds.getCenter(), zoom);
      } else {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [map, markers, center, zoom]);

  return null;
}

function MapWithMarkers({
  markers,
  center,
  zoom,
  onMarkerClick,
  detailsLabel,
  tileErrorText,
}: MapWithMarkerProps) {
  // Track tile-load failures so a blocked CDN / offline client shows an explicit
  // "map unavailable" overlay instead of a silent blank grey box.
  const [tileError, setTileError] = useState(false);

  return (
    <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
      <MapContainer
        center={center || [39.9208, 32.8541]}
        zoom={zoom || 6}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <MapBoundsFit markers={markers} center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          eventHandlers={{
            tileerror: () => setTileError(true),
            // Recover automatically once tiles start loading again.
            tileload: () => setTileError((prev) => (prev ? false : prev)),
          }}
        />

        {markers.map((marker, index) => {
          let iconColor = "#3b82f6";
          let iconHtml = "";

          if (marker.type === "V") {
            iconColor = "#3b82f6";
            iconHtml = renderToString(
              <LocalShippingIcon
                style={{
                  width: "32px",
                  height: "32px",
                  color: iconColor,
                  fill: "currentColor",
                }}
              />
            );
          } else if (marker.type === "W") {
            iconColor = "#10b981";
            iconHtml = renderToString(
              <WarehouseIcon
                style={{
                  width: "32px",
                  height: "32px",
                  color: iconColor,
                  fill: "currentColor",
                }}
              />
            );
          } else if (marker.type === "C") {
            iconColor = "#f59e0b";
            iconHtml = renderToString(
              <Person3Icon
                style={{
                  width: "32px",
                  height: "32px",
                  color: iconColor,
                  fill: "currentColor",
                }}
              />
            );
          }

          return (
            <Marker
              key={`${marker.id || "marker"}-${index}`}
              position={[marker.lat, marker.len]}
              // Leaflet renders each marker as a keyboard-focusable role="button";
              // `title` + the aria-label on the html root give it an accessible
              // name so screen-reader / keyboard users aren't tabbing through
              // dozens of nameless "button"s.
              title={marker.name}
              alt={marker.name}
              icon={L.divIcon({
                html: `
                  <div role="img" aria-label="${escapeHtmlAttr(marker.name)}" style="display: flex; justify-content: center; align-items: center; width: 40px; height: 40px; color: ${iconColor}; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                    ${iconHtml}
                  </div>
                `,
                className: "custom-marker",
                iconSize: [40, 40],
                iconAnchor: [20, 20],
              })}
            >
              <Popup>
                <div>
                  <Typography variant="h6">{marker.name}</Typography>
                  {onMarkerClick && (
                    <button
                      type="button"
                      onClick={() => onMarkerClick(marker)}
                      style={{
                        marginTop: 6,
                        padding: "4px 10px",
                        border: `1px solid ${iconColor}`,
                        borderRadius: 8,
                        background: "transparent",
                        color: iconColor,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {detailsLabel || "View details"} →
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Tile-failure overlay — makes a blocked/offline basemap explicit instead
          of degrading to a silent blank grey box. */}
      {tileError && (
        <Stack
          alignItems="center"
          justifyContent="center"
          spacing={1}
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 500,
            px: 2,
            textAlign: "center",
            pointerEvents: "none",
            bgcolor: "rgba(11, 16, 25, 0.82)",
            backdropFilter: "blur(2px)",
          }}
        >
          <PublicOffIcon sx={{ fontSize: 40, color: "rgba(255,255,255,0.7)" }} />
          <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>
            {tileErrorText || "Harita yüklenemedi"}
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

export default MapWithMarkers;
