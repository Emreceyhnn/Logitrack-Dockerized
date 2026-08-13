import { NextRequest, NextResponse } from "next/server";
import { getCompanyWithDashboardData } from "@/app/lib/controllers/company";
import { parseQueryParams, pageParam, pageSizeParam, searchParam } from "@/app/lib/api/queryParams";
import { z } from "zod";
import { handleApiError } from "@/app/lib/api/handleApiError";

export const dynamic = "force-dynamic";

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

    const data = await getCompanyWithDashboardData({
      page,
      pageSize,
      search,
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/company/dashboard", error);
  }
}
