import { NextRequest, NextResponse } from "next/server";
import { getShipmentsWithDashboardData } from "@/app/lib/controllers/shipments";
import { ShipmentStatus } from "@/app/lib/type/enums";
import { parseQueryParams, pageParam, pageSizeParam, searchParam, enumParam } from "@/app/lib/api/queryParams";
import { z } from "zod";
import { handleApiError } from "@/app/lib/api/handleApiError";


const querySchema = z.object({
  page: pageParam,
  pageSize: pageSizeParam(),
  status: enumParam(ShipmentStatus),
  search: searchParam,
});

export async function GET(req: NextRequest) {
  try {
    const query = parseQueryParams(req, querySchema);
    if (!query.success) return query.response;
    const { page, pageSize, status, search } = query.data;

    const data = await getShipmentsWithDashboardData(page, pageSize, status, search);

    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/shipments/dashboard", error);
  }
}
