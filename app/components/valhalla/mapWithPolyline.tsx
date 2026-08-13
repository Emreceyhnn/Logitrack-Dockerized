import { useMemo, useEffect, useState } from "react";
import { Box } from "@mui/material";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { renderToString } from "react-dom/server";
import RoomIcon from "@mui/icons-material/Room";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

interface PolylinePoint {
  lat: number;
  lon: number;
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

interface MapWithPolylineProps {
  Polylines: PolylinePoint[];
  routePolyline?: [number, number][] | null;
  vehicleLocation?: {
    lat: number;
    lng: number;
    name: string;
  } | null;
  /**
   * Deviation corridor half-width in metres. When set, the route is underlaid
   * with a band of this width so the tolerance is visible rather than abstract.
   */
  bufferMeters?: number | undefined;
  /**
   * Centre line for the corridor band. Defaults to `routePolyline`, but detail
   * views pass the route's *saved* shape here: alerts are measured against the
   * stored geometry, so the band must follow it rather than a re-fetched line
   * that may differ.
   */
  bufferPolyline?: [number, number][] | null | undefined;
}

// A helper component to adjust the map bounds
function MapBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  return null;
}

/**
 * Renders the deviation corridor as a band beneath the route line.
 *
 * Leaflet strokes in screen pixels while the buffer is defined in metres, so
 * the width is recomputed from the map's own metres-per-pixel scale and kept in
 * sync with zoom — a fixed pixel weight would misrepresent the tolerance at
 * every zoom level except the one it was tuned at.
 *
 * The band's width is never faked: on a long intercity route a 500m corridor is
 * genuinely only a few pixels wide, and widening it would tell the user their
 * tolerance is larger than it is. Instead the *styling* adapts — a thin band is
 * drawn more opaquely and gains an outline, so it stays perceptible at its true
 * scale. Below `HAIRLINE_PX` even that fails, and the band is replaced by a
 * dashed centre line: an honest "the corridor is too narrow to draw here"
 * rather than an invisible layer or a lie.
 */

/** Width under which a filled band can no longer read as a band. */
const HAIRLINE_PX = 3;
/** Width above which the band is clearly visible on its own. */
const COMFORTABLE_PX = 12;

function RouteBufferBand({
  positions,
  bufferMeters,
  color,
}: {
  positions: [number, number][];
  bufferMeters: number;
  color: string;
}) {
  const map = useMap();

  const computeWeight = useMemo(
    () => () => {
      const anchor = positions[Math.floor(positions.length / 2)] ?? positions[0];
      if (!anchor) return 0;
      const centre = L.latLng(anchor[0], anchor[1]);
      // A point `bufferMeters` due east of the anchor; the pixel gap between
      // the two is the corridor's half-width on screen.
      const edge = L.latLng(
        anchor[0],
        anchor[1] +
          (bufferMeters / (111_320 * Math.cos((anchor[0] * Math.PI) / 180))),
      );
      const centrePx = map.latLngToLayerPoint(centre);
      const edgePx = map.latLngToLayerPoint(edge);
      // Stroke weight spans both sides of the line, hence the doubling.
      return Math.abs(edgePx.x - centrePx.x) * 2;
    },
    [map, positions, bufferMeters],
  );

  const [weight, setWeight] = useState<number>(() => computeWeight());

  useMapEvents({
    zoomend: () => setWeight(computeWeight()),
    moveend: () => setWeight(computeWeight()),
  });

  useEffect(() => {
    setWeight(computeWeight());
  }, [computeWeight]);

  if (positions.length === 0 || weight <= 0) return null;

  // Too narrow to fill: mark the corridor's course instead of pretending to
  // draw its width.
  if (weight < HAIRLINE_PX) {
    return (
      <Polyline
        positions={positions}
        interactive={false}
        pathOptions={{
          color,
          weight: 2,
          opacity: 0.9,
          dashArray: "3 6",
          lineCap: "butt",
        }}
      />
    );
  }

  // Fade from near-solid at hairline width to a light wash once the band is
  // wide enough to read on its own.
  const t = Math.min(1, (weight - HAIRLINE_PX) / (COMFORTABLE_PX - HAIRLINE_PX));
  const fillOpacity = 0.55 - t * 0.37;

  return (
    <>
      {/* Outline: keeps the corridor's edges legible against the basemap when
          the fill alone is too faint to define them. */}
      <Polyline
        positions={positions}
        interactive={false}
        pathOptions={{
          color,
          weight: weight + 1.5,
          opacity: 0.5,
          fill: false,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
      <Polyline
        positions={positions}
        // Purely decorative: the route line beneath it already carries the shape.
        interactive={false}
        pathOptions={{
          color,
          weight,
          opacity: fillOpacity,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
    </>
  );
}

function MapWithPolyline({
  Polylines = [],
  routePolyline = null,
  vehicleLocation = null,
  bufferMeters = undefined,
  bufferPolyline = undefined,
}: MapWithPolylineProps) {
  const polylinePositions: [number, number][] = useMemo(() => {
    if (!routePolyline) return [];
    return routePolyline.map((coord) => [coord[0], coord[1]]);
  }, [routePolyline]);

  const bufferPositions: [number, number][] = useMemo(() => {
    const source = bufferPolyline ?? routePolyline;
    if (!source) return [];
    return source.map((coord) => [coord[0], coord[1]]);
  }, [bufferPolyline, routePolyline]);

  const bounds = useMemo(() => {
    // Include the corridor: when it comes from a saved shape it can extend
    // beyond the drawn route, and fitting only the route would clip it.
    const framed = [...polylinePositions, ...bufferPositions];
    if (framed.length > 0) {
      return L.latLngBounds(framed);
    } else if (Polylines.length > 0) {
      return L.latLngBounds(
        Polylines.map((p) => [p.lat, p.lon] as [number, number])
      );
    }
    return null;
  }, [polylinePositions, bufferPositions, Polylines]);

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      <MapContainer
        center={[39.9208, 32.8541]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapBounds bounds={bounds} />

        {Polylines.map((marker, index) => {
          let iconColor = "#3b82f6"; // default fallback

          // Set colors: Start is Green, intermediate stops are Orange, Last is Red
          if (index === 0) {
            iconColor = "#10b981"; // green
          } else if (index === Polylines.length - 1) {
            iconColor = "#ef4444"; // red
          } else {
            iconColor = "#f59e0b"; // orange
          }

          let iconHtml = "";

          iconHtml = renderToString(
            <RoomIcon
              style={{
                width: "32px",
                height: "32px",
                color: iconColor,
                fill: "currentColor",
              }}
            />
          );

          return (
            <Marker
              key={index}
              position={[marker.lat, marker.lon]}
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
                  <h2>{marker.name}</h2>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Drawn before the route so the corridor sits underneath it. */}
        {bufferPositions.length > 0 && bufferMeters !== undefined && bufferMeters > 0 && (
          <RouteBufferBand
            positions={bufferPositions}
            bufferMeters={bufferMeters}
            color="#f59e0b"
          />
        )}

        {polylinePositions?.length > 0 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: "#3b82f6", // Vibrant primary blue
              weight: 5,
              opacity: 0.85,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {vehicleLocation && (
          <Marker
            position={[vehicleLocation.lat, vehicleLocation.lng]}
            title={vehicleLocation.name}
            alt={vehicleLocation.name}
            icon={L.divIcon({
              html: `
                <div role="img" aria-label="${escapeHtmlAttr(vehicleLocation.name)}" style="display: flex; justify-content: center; align-items: center; width: 40px; height: 40px; color: #3b82f6; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                  ${renderToString(<LocalShippingIcon style={{ width: "32px", height: "32px", color: "#3b82f6", fill: "currentColor" }} />)}
                </div>
              `,
              className: "custom-marker",
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            })}
          >
            <Popup>
              <div>
                <h2>{vehicleLocation.name}</h2>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </Box>
  );
}

export default MapWithPolyline;
