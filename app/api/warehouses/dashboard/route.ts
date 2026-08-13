import { NextRequest, NextResponse } from "next/server";
import { getWarehousesWithDashboardData } from "@/app/lib/controllers/warehouse";
import { parseQueryParams, pageParam, pageSizeParam } from "@/app/lib/api/queryParams";
import { z } from "zod";
import { handleApiError } from "@/app/lib/api/handleApiError";


const querySchema = z.object({
  page: pageParam,
  pageSize: pageSizeParam(),
});

export async function GET(req: NextRequest) {
  try {
    const query = parseQueryParams(req, querySchema);
    if (!query.success) return query.response;
    const { page, pageSize } = query.data;

    const data = await getWarehousesWithDashboardData(page, pageSize);

    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/warehouses/dashboard", error);
  }
}
