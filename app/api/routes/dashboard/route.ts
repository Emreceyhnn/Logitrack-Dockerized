/**
 * GET /api/routes/dashboard
 *
 * Client-side data endpoint for the routes dashboard.
 *
 * Why a Route Handler instead of a Server Action?
 * ────────────────────────────────────────────────
 * Next.js automatically triggers router.refresh() after every Server Action
 * completes (even read-only ones) when called from the client. When TanStack Query uses a Server Action
 * as its queryFn, this causes a full page re-render on every filter/search
 * change. Route Handlers do NOT have this side-effect — they behave like
 * plain HTTP endpoints and return data without touching the router.
 *
 * SSR prefetch in page.tsx still calls getRoutesWithDashboardData() directly
 * (server-to-server, no HTTP overhead), so we get the best of both worlds:
 *   • First paint: SSR data, no loading spinner
 *   • Filter changes: API route fetch, no page reload
 */

import { NextRequest, NextResponse } from "next/server";
import { getRoutesWithDashboardData } from "@/app/lib/controllers/routes";
import { RouteStatus } from "@prisma/client";
import { parseQueryParams, pageParam, pageSizeParam, enumArrayParam } from "@/app/lib/api/queryParams";
import { z } from "zod";
import { handleApiError } from "@/app/lib/api/handleApiError";


const querySchema = z.object({
  page: pageParam,
  pageSize: pageSizeParam(),
  status: enumArrayParam(RouteStatus),
});

export async function GET(req: NextRequest) {
  try {
    const query = parseQueryParams(req, querySchema);
    if (!query.success) return query.response;
    const { page, pageSize, status } = query.data;

    const data = await getRoutesWithDashboardData(page, pageSize, status);

    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/routes/dashboard", error);
  }
}
