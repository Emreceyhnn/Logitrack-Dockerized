import { useMemo } from "react";
import { RouteWithRelations } from "@/app/lib/type/routes";

export const useRouteLocations = (route: RouteWithRelations | null) => {
  return useMemo(() => {
    if (!route)
      return {
        mapOrigin: undefined,
        mapDestination: undefined,
        intermediateStops: [],
      };
    const allStops = Array.isArray(route.stops) ? route.stops : [];
    const typedStops = allStops as {
      lat?: number;
      lng?: number;
      address?: string;
    }[];

    const first = typedStops[0];
    const mOrigin = first
      ? {
          lat: first.lat || 0,
          lng: first.lng || 0,
          address: first.address || "",
        }
      : undefined;

    const last = typedStops[typedStops.length - 1];
    const mDest =
      typedStops.length > 1 && last
        ? {
            lat: last.lat || 0,
            lng: last.lng || 0,
            address: last.address || "",
          }
        : undefined;

    const interStops =
      typedStops.length > 2
        ? typedStops
            .slice(1, -1)
            .filter((stop) => {
              const isDuplicateOrigin =
                mOrigin && stop.address === mOrigin.address;
              const isDuplicateDestination =
                mDest && stop.address === mDest.address;
              return !isDuplicateOrigin && !isDuplicateDestination;
            })
            .map((w) => ({
              location: { lat: w.lat || 0, lng: w.lng || 0 },
              stopover: true,
            }))
        : [];

    return {
      mapOrigin: mOrigin,
      mapDestination: mDest,
      intermediateStops: interStops,
    };
  }, [route]);
};
