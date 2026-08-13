"use server";

import { headers } from "next/headers";
import { db } from "../db";
import { runAsSystem } from "../tenant-context";
import { rateLimit } from "../rate-limiter";
import { logger } from "@/app/lib/logger";
import type { ShipmentStatus } from "@prisma/client";

/**
 * Public, unauthenticated shipment tracking.
 *
 * `trackingId` is a globally-unique opaque bearer token (see the schema note on
 * Shipment.trackingId), so a lookup by it is intentionally tenant-agnostic —
 * the recipient has no account and no company context. We therefore run the
 * read in a system context (bypassing the tenant guard) but keep it safe by:
 *
 *   1. Matching only on the exact unique token (no enumeration by other fields).
 *   2. Rate-limiting per IP to blunt brute-force guessing of tokens.
 *   3. Returning a deliberately minimal projection — delivery status, a coarse
 *      destination (city only), an ETA, a sanitized event timeline, and a
 *      COARSE last-known location (see below). Never customer PII, contact
 *      emails, billing, precise coordinates, internal notes, company identity,
 *      or the internal shipment id.
 *
 * Location privacy: the recipient is anonymous, so exposing the vehicle's exact
 * GPS would leak the driver's real-time position to anyone holding the token.
 * We therefore round every coordinate to {@link COORD_PRECISION} decimals
 * (~11 km at these latitudes) — enough to show the general area on a map,
 * never enough to pinpoint the driver — and only surface it while the shipment
 * is in transit.
 */

/** Decimal places kept on public coordinates. 1 dp ≈ 11 km grid. */
const COORD_PRECISION = 1;

export interface PublicCoord {
  lat: number;
  lng: number;
}

export interface PublicTrackingEvent {
  status: ShipmentStatus;
  /** Free-text location label as recorded by the operator, may be null. */
  location: string | null;
  /** ISO timestamp of the event. */
  at: string;
}

export interface PublicTrackingResult {
  trackingId: string;
  status: ShipmentStatus;
  /** City/region of the destination only — never the full street address. */
  destination: string | null;
  /**
   * Estimated arrival as an ISO string, derived from the SLA deadline. Null
   * when no deadline is set or the shipment is already in a terminal state.
   */
  estimatedArrival: string | null;
  /** Whether the shipment has reached a terminal state (delivered/failed/etc). */
  isComplete: boolean;
  /** Chronological status history, oldest first. */
  events: PublicTrackingEvent[];
  /** Coarse (rounded) destination coordinates for the map pin, if known. */
  destinationCoord: PublicCoord | null;
  /**
   * Coarse (rounded) last-reported vehicle position — an *area*, not an exact
   * fix. Only present while in transit and when the assigned vehicle has a
   * recorded position; null otherwise.
   */
  lastKnownArea: PublicCoord | null;
}

export type TrackingLookup =
  | { ok: true; data: PublicTrackingResult }
  | { ok: false; error: "NOT_FOUND" | "RATE_LIMITED" | "INVALID" | "INTERNAL" };

// Terminal states: once here, there's no meaningful future ETA to show.
const TERMINAL: ReadonlySet<ShipmentStatus> = new Set([
  "DELIVERED",
  "FAILED",
  "RETURNED",
  "CANCELLED",
]);

// trackingId is "TRK-" + 7 base36 chars, but operators can supply custom ids;
// keep the guard loose (length/charset) just to reject obvious garbage early.
const TRACKING_ID_RE = /^[A-Za-z0-9][A-Za-z0-9\-_]{2,63}$/;

/**
 * Reduces a full destination string to a coarse locality. Destinations are
 * stored as free text (often "Street, District, City"); we surface only the
 * last comma-separated segment so a stranger with a token can't read the exact
 * delivery street address.
 * 
 * tr-tam hedef adresini kabaca bir bölgeye indirger
 * en-reduces a full destination string to a coarse locality
 * input (destination: string | null)
 * output (string | null)
 */
function coarseDestination(destination: string | null): string | null {
  if (!destination) return null;
  const parts = destination
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

/**
 * Rounds a lat/lng pair to {@link COORD_PRECISION} decimals, yielding an area
 * rather than a point. Returns null if either coordinate is missing.
 * 
 * tr-enlem/boylam koordinatlarını belirli bir ondalık hassasiyete yuvarlar
 * en-rounds a lat/lng pair to a specific decimal precision
 * input (lat: number | null | undefined, lng: number | null | undefined)
 * output (PublicCoord | null)
 */
function coarseCoord(
  lat: number | null | undefined,
  lng: number | null | undefined
): PublicCoord | null {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  const f = 10 ** COORD_PRECISION;
  return {
    lat: Math.round(lat * f) / f,
    lng: Math.round(lng * f) / f,
  };
}

/**
 * tr-verilen takip kimliği ile gönderi durumunu herkese açık olarak sorgular
 * en-publicly queries the shipment status with the given tracking ID
 * input (rawTrackingId: string)
 * output (Promise<TrackingLookup>)
 */
export async function trackShipment(
  rawTrackingId: string
): Promise<TrackingLookup> {
  try {
    const trackingId = (rawTrackingId ?? "").trim();
    if (!trackingId || !TRACKING_ID_RE.test(trackingId)) {
      return { ok: false, error: "INVALID" };
    }

    // Rate-limit by IP: 20 lookups/min is plenty for a human checking a parcel,
    // but throttles automated token guessing.
    const headerStore = await headers();
    const ip =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      "127.0.0.1";
    const limit = await rateLimit(ip, 20, 60, "rate-limit:public-track:");
    if (!limit.success) {
      return { ok: false, error: "RATE_LIMITED" };
    }

    // Tenant-agnostic read of a single row by its unique public token. Selects
    // only publicly-safe fields — no companyId, customer, contact, or coords.
    const shipment = await runAsSystem(() =>
      db.shipment.findUnique({
        where: { trackingId },
        select: {
          trackingId: true,
          status: true,
          destination: true,
          destinationLat: true,
          destinationLng: true,
          slaDeadline: true,
          history: {
            select: { status: true, location: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
          // Last-known vehicle position, reached via the assigned driver. Only
          // the two coordinates are selected — nothing identifying the driver
          // or vehicle (no plate, name, id) crosses the public boundary.
          driver: {
            select: {
              currentVehicle: {
                select: { currentLat: true, currentLng: true },
              },
            },
          },
        },
      })
    );

    if (!shipment) {
      return { ok: false, error: "NOT_FOUND" };
    }

    const isComplete = TERMINAL.has(shipment.status);

    // Last-known area only makes sense mid-journey: hide it once the shipment is
    // in a terminal state (delivered/returned/etc), where a stale vehicle fix
    // would be misleading — and where the driver may already be elsewhere.
    const vehicle = shipment.driver?.currentVehicle;
    const lastKnownArea = isComplete
      ? null
      : coarseCoord(vehicle?.currentLat, vehicle?.currentLng);

    return {
      ok: true,
      data: {
        trackingId: shipment.trackingId,
        status: shipment.status,
        destination: coarseDestination(shipment.destination),
        estimatedArrival:
          isComplete || !shipment.slaDeadline
            ? null
            : shipment.slaDeadline.toISOString(),
        isComplete,
        events: shipment.history.map((h) => ({
          status: h.status,
          location: h.location,
          at: h.createdAt.toISOString(),
        })),
        destinationCoord: coarseCoord(
          shipment.destinationLat,
          shipment.destinationLng
        ),
        lastKnownArea,
      },
    };
  } catch (error) {
    logger.error("trackShipment failed:", error);
    return { ok: false, error: "INTERNAL" };
  }
}
