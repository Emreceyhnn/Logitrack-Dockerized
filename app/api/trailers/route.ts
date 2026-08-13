import { NextRequest, NextResponse } from "next/server";
import { getTrailers } from "@/app/lib/controllers/trailer";
import { TrailerStatus, TrailerType } from "@prisma/client";
import { TrailerFilters } from "@/app/lib/type/trailer";
import { parseQueryParams, pageParam, pageSizeParam, searchParam, enumArrayParam, boolParam } from "@/app/lib/api/queryParams";
import { z } from "zod";
import { handleApiError } from "@/app/lib/api/handleApiError";


const querySchema = z.object({
  page: pageParam,
  limit: pageSizeParam(),
  search: searchParam,
  status: enumArrayParam(TrailerStatus),
  type: enumArrayParam(TrailerType),
  isColdChain: boolParam,
});

export async function GET(req: NextRequest) {
  try {
    const query = parseQueryParams(req, querySchema);
    if (!query.success) return query.response;
    
    // query.data matches TrailerFilters shape
    const filters: TrailerFilters = query.data;

    const data = await getTrailers(filters);
    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/trailers", error);
  }
}
