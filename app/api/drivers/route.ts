import { NextRequest, NextResponse } from "next/server";
import { parseQueryParams, pageParam, pageSizeParam, searchParam, enumArrayParam, boolParam, sortOrderParam, sortFieldParam } from "@/app/lib/api/queryParams";
import { z } from "zod";
import { getDrivers } from "@/app/lib/controllers/driver";
import { DriverStatus } from "@/app/lib/type/enums";
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
    
    const { page, limit, search, status, hasVehicle, sortField, sortOrder } = query.data;

    const data = await getDrivers(page, limit, search, status as DriverStatus[] | undefined, hasVehicle, sortField, sortOrder);
    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/drivers", error);
  }
}
