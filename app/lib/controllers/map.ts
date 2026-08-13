"use server";

import { authenticatedAction } from "../auth-middleware";
import { checkPermission } from "./utils/checkPermission";
import { controllerGuard } from "./utils/controllerGuard";
import { logger } from "@/app/lib/logger";


export type DirectionPoint = string | { lat: number; lng: number };

/**
 * tr-belirtilen noktalar arasında Google Maps ile yol tarifi alır
 * en-gets directions between specified points using Google Maps
 * input (user: AuthenticatedUser, origin: DirectionPoint, destination: DirectionPoint, waypoints?: array)
 * output (Promise<any>)
 */
export const getDirections = authenticatedAction(
  async (
    user,
    origin: DirectionPoint,
    destination: DirectionPoint,
    waypoints: {
      location: DirectionPoint;
      stopover: boolean;
    }[] = []
  ) => {
    const companyId = user?.companyId || "";

    await checkPermission(user, companyId, ["role_admin", "role_manager"]);
    if (!origin || !destination) return null;

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      logger.error("Missing Google Maps API Key");
      return null;
    }

    if (!process.env.GOOGLE_MAPS_API_KEY && process.env.NODE_ENV === "production") {
      logger.warn("Security Warning: GOOGLE_MAPS_API_KEY is not defined. Falling back to client-exposed NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for server-side Directions API.");
    }

    const formatPoint = (p: string | { lat: number; lng: number }) => {
      if (typeof p === "string") return encodeURIComponent(p);
      return `${p.lat},${p.lng}`;
    };

    const originStr = formatPoint(origin);
    const destStr = formatPoint(destination);

    let waypointsStr = "";
    if (waypoints.length > 0) {
      const points = waypoints.map((w) => formatPoint(w.location)).join("|");
      waypointsStr = `&waypoints=${points}`;
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}${waypointsStr}&key=${apiKey}`;

    return controllerGuard("getDirections", async () => {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        throw new Error(`Directions API error: ${res.statusText}`);
      }
      const data = await res.json();
      return data;
    }, { fallback: null });
  }
);
