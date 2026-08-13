import polyline from "@mapbox/polyline";

export interface Location {
  lat: number;
  lon: number;
  type?: string;
}

export interface CostingOptionsProfile {
  height?: number;
  width?: number;
  length?: number;
  weight?: number;
  axle_load?: number;
  hazmat?: boolean;
  exclude_unpaved?: boolean;
  use_highways?: number | boolean;
  use_tolls?: number | boolean;
}

export interface costing_options {
  truck?: CostingOptionsProfile;
  auto?: CostingOptionsProfile;
  [key: string]: CostingOptionsProfile | undefined;
}

export interface RoutingParams {
  locations: Location[];
  costing?: string;
  costing_options?: costing_options;
  directions_options?: {
    units?: string;
    language?: string;
  };
  exclude_locations?: Location[];
  date_time?: {
    type: number;
    value: string;
  };
}

export interface RouteResponse {
  trip?: {
    legs: {
      shape: string;
      summary: {
        length: number;
        time: number;
        cost?: number;
      };
    }[];
    summary: {
      length: number;
      time: number;
      cost?: number;
    };
    status?: number;
    status_message?: string;
  };
  route?: {
    legs: {
      shape: string;
      summary: {
        length: number;
        time: number;
        cost?: number;
      };
    }[];
    summary?: {
      length: number;
      time: number;
      cost?: number;
    };
  };
}

const VALHALLA_URL = "/api/valhalla";
// Session-free twin of the above, for the public Live Demo. /api/valhalla
// requires an authenticated session and 401s for anonymous visitors, which
// left every demo map with markers but no drawn route.
const DEMO_VALHALLA_URL = "/api/demo/valhalla";

function routingEndpoint(): string {
  if (
    typeof window !== "undefined" &&
    window.location.pathname.includes("/demo")
  ) {
    return DEMO_VALHALLA_URL;
  }
  return VALHALLA_URL;
}

/**
 * tr-Valhalla rotalama hizmetinden bir rota alır
 * en-Fetches a route from the Valhalla routing service
 * input (
  params: RoutingParams
)
 * output (Promise<RouteResponse>)
 */
export async function fetchRoute(
  params: RoutingParams
): Promise<RouteResponse> {
  const response = await fetch(routingEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...params,
      exclude_locations:
        params.exclude_locations && params.exclude_locations.length > 0
          ? params.exclude_locations
          : undefined,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Valhalla Hatası: ${errorText}`);
  }

  return response.json();
}

/**
 * tr-Polyline dizgesini bir sayı çiftleri dizisine çözümler
 * en-Decodes a polyline string into an array of coordinate pairs
 * input (
  shapeString: string
)
 * output ([number, number][])
 */
export function decodeShape(shapeString: string): [number, number][] {
  return polyline.decode(shapeString, 6);
}

/**
 * tr-Nokta dizisini bir polyline dizgesine kodlar
 * en-Encodes an array of points into a polyline string
 * input (
  points: [number, number][] 
)
 * output (string)
 */
export function encodeShape(points: [number, number][]): string {
  return polyline.encode(points, 6);
}
