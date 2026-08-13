import {
  costing_options,
  decodeShape,
  encodeShape,
  fetchRoute,
  RoutingParams,
} from "@/app/lib/valhalla";
import { logger } from "@/app/lib/logger";

export interface LocationPoint {
  lat: number;
  lon: number;
  name: string;
}

export interface PolylineHelperResult {
  polyline: [number, number][];
  mapPoints: LocationPoint[];
  summary: { length: number; time: number };
  /**
   * The route legs' encoded shapes (precision 6), re-encoded as a single
   * polyline. Persisted on the Route so server-side deviation checks have a
   * corridor to measure against without re-querying the routing engine.
   */
  shape: string;
}

interface PolylineHelperParams {
  locations: LocationPoint[];
  costing?: string;
  costing_options?: costing_options;
}

export const polylineHelper = async (params: PolylineHelperParams): Promise<PolylineHelperResult | undefined> => {
  const input: RoutingParams = {
    locations: params.locations.map((i) => ({ lat: i.lat, lon: i.lon })),
    costing: params.costing || "auto",
    ...(params.costing_options ? { costing_options: params.costing_options } : {}),
  };

  try {
    const data = await fetchRoute(input);
    const tripData = data.trip || data.route;
    const legs = tripData?.legs;

    if (!legs || legs.length === 0) {
      throw new Error("Rotaya ait bacaklar (legs) bulunamadı.");
    }

    const decodedPoints: [number, number][] = [];
    let totalLength = 0;
    let totalTime = 0;

    for (const leg of legs) {
      if (leg.shape) {
        const decoded = decodeShape(leg.shape);
        decodedPoints.push(...decoded);
      }
      if (leg.summary) {
        totalLength += leg.summary.length;
        totalTime += leg.summary.time;
      }
    }

    if (decodedPoints.length === 0) {
      throw new Error("Rotaya ait geometrik çizgi (shape) bulunamadı.");
    }

    return {
      polyline: decodedPoints,
      mapPoints: params.locations,
      summary: {
        length: tripData?.summary?.length ?? totalLength,
        time: tripData?.summary?.time ?? totalTime,
      },
      shape: encodeShape(decodedPoints),
    };
  } catch (err: unknown) {
    logger.error("Valhalla Routing Error:", err);
    return undefined;
  }
};
