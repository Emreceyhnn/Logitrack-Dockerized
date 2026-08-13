import { NextRequest, NextResponse } from "next/server";
import { getCustomersWithDashboardData } from "@/app/lib/controllers/customer";
import { parseQueryParams, pageParam, pageSizeParam, searchParam } from "@/app/lib/api/queryParams";
import { z } from "zod";
import { handleApiError } from "@/app/lib/api/handleApiError";


const querySchema = z.object({
  page: pageParam,
  pageSize: pageSizeParam(),
  search: searchParam,
});

export async function GET(req: NextRequest) {
  try {
    const query = parseQueryParams(req, querySchema);
    if (!query.success) return query.response;
    const { page, pageSize, search } = query.data;

    const data = await getCustomersWithDashboardData(page, pageSize, search);

    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/customers/dashboard", error);
  }
}
