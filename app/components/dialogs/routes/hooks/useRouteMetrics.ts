import { useState, useEffect } from "react";
import { polylineHelper } from "../../../valhalla/polylineHelper";
import { RouteWithRelations } from "@/app/lib/type/routes";

export const useRouteMetrics = (
  open: boolean,
  route: RouteWithRelations | null,
  mapOrigin: { lat: number; lng: number; address?: string } | undefined,
  mapDestination: { lat: number; lng: number; address?: string } | undefined
) => {
  const [vehicleToDestMetrics, setVehicleToDestMetrics] = useState<{
    distanceKm: number;
    durationMin: number;
  } | null>(null);

  const [vehicleTraveledMetrics, setVehicleTraveledMetrics] = useState<{
    distanceKm: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const vLat = route?.vehicle?.currentLat;
    const vLng = route?.vehicle?.currentLng;
    if (!vLat || !vLng) {
      setVehicleTraveledMetrics(null);
      setVehicleToDestMetrics(null);
      return;
    }

    let cancelled = false;

    const traveledCall = mapOrigin
      ? polylineHelper({
          locations: [
            { lat: mapOrigin.lat, lon: mapOrigin.lng, name: "Origin" },
            { lat: vLat, lon: vLng, name: "Vehicle" },
          ],
          costing: "truck",
        })
          .then((r) =>
            r?.summary
              ? { distanceKm: Math.round(r.summary.length * 10) / 10 }
              : null
          )
          .catch(() => null)
      : Promise.resolve(null);

    const remainingCall = mapDestination
      ? polylineHelper({
          locations: [
            { lat: vLat, lon: vLng, name: "Vehicle" },
            {
              lat: mapDestination.lat,
              lon: mapDestination.lng,
              name: mapDestination.address || "Destination",
            },
          ],
          costing: "truck",
        })
          .then((r) =>
            r?.summary
              ? {
                  distanceKm: Math.round(r.summary.length * 10) / 10,
                  durationMin: Math.round(r.summary.time / 60),
                }
              : null
          )
          .catch(() => null)
      : Promise.resolve(null);

    Promise.all([traveledCall, remainingCall]).then(([traveled, remaining]) => {
      if (cancelled) return;
      setVehicleTraveledMetrics(traveled);
      setVehicleToDestMetrics(remaining);
    });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    route?.vehicle?.currentLat,
    route?.vehicle?.currentLng,
    mapOrigin,
    mapDestination,
  ]);

  return { vehicleTraveledMetrics, vehicleToDestMetrics };
};
