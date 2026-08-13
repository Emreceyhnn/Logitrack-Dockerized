import { NextRequest, NextResponse } from "next/server";
import { getShipments } from "@/app/lib/controllers/shipments";
import { ShipmentStatus } from "@prisma/client";
import { parseQueryParams, pageParam, pageSizeParam, searchParam, enumParam, boolParam } from "@/app/lib/api/queryParams";
import { z } from "zod";
import { handleApiError } from "@/app/lib/api/handleApiError";


const querySchema = z.object({
  page: pageParam,
  limit: pageSizeParam(),
  search: searchParam,
  status: enumParam(ShipmentStatus),
  unassigned: boolParam,
});

export async function GET(req: NextRequest) {
  try {
    const query = parseQueryParams(req, querySchema);
    if (!query.success) return query.response;
    
    const filters = query.data;

    const data = await getShipments(filters);
    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/shipments", error);
  }
}
