import { NextRequest, NextResponse } from "next/server";
import { getInventoryWithDashboardData } from "@/app/lib/controllers/inventory";
import { parseQueryParams, pageParam, pageSizeParam, searchParam, sortFieldParam, sortOrderParam } from "@/app/lib/api/queryParams";
import { z } from "zod";
import { handleApiError } from "@/app/lib/api/handleApiError";


const querySchema = z.object({
  page: pageParam,
  pageSize: pageSizeParam(),
  warehouseId: z.string().trim().min(1).optional(),
  search: searchParam,
  sortBy: sortFieldParam,
  sortOrder: sortOrderParam,
  status: z.string().optional().transform(v => v ? v.split(",") : undefined),
});

export async function GET(req: NextRequest) {
  try {
    const query = parseQueryParams(req, querySchema);
    if (!query.success) return query.response;
    const { page, pageSize, warehouseId, search, sortBy, sortOrder, status } = query.data;

    const data = await getInventoryWithDashboardData(
      page,
      pageSize,
      warehouseId,
      search,
      sortBy,
      sortOrder,
      status
    );

    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/inventory/dashboard", error);
  }
}
