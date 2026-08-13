/**
 * GET /api/drivers/dashboard
 *
 * Client-side data endpoint for the driver dashboard.
 *
 * Why a Route Handler instead of a Server Action?
 * ────────────────────────────────────────────────
 * Next.js automatically triggers router.refresh() after every Server Action
 * completes (even read-only ones) when called from the client. When TanStack Query uses a Server Action
 * as its queryFn, this causes a full page re-render on every filter/search
 * change. Route Handlers do NOT have this side-effect — they behave like
 * plain HTTP endpoints and return data without touching the router.
 *
 * SSR prefetch in page.tsx still calls getDriverWithDashboardData() directly
 * (server-to-server, no HTTP overhead), so we get the best of both worlds:
 *   • First paint: SSR data, no loading spinner
 *   • Filter changes: API route fetch, no page reload
 */

import { NextRequest, NextResponse } from "next/server";
import { getDriverWithDashboardData } from "@/app/lib/controllers/driver";
import { DriverFilters } from "@/app/lib/type/driver";
import { DriverStatus } from "@prisma/client";
import { parseQueryParams, pageParam, pageSizeParam, searchParam, enumArrayParam, boolParam, sortFieldParam, sortOrderParam } from "@/app/lib/api/queryParams";
import { z } from "zod";
import { handleApiError } from "@/app/lib/api/handleApiError";


const querySchema = z.object({
  page: pageParam,
  limit: pageSizeParam(),
  search: searchParam,
  status: enumArrayParam(DriverStatus),
  hasVehicle: boolParam,
  sortField: sortFieldParam,
  sortOrder: sortOrderParam,
});

export async function GET(req: NextRequest) {
  try {
    const query = parseQueryParams(req, querySchema);
    if (!query.success) return query.response;
    
    // query.data exactly matches DriverFilters structure
    const filters: DriverFilters = query.data;

    const data = await getDriverWithDashboardData(filters);

    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/drivers/dashboard", error);
  }
}
