import { NextRequest, NextResponse } from "next/server";
import { getRoutes } from "@/app/lib/controllers/routes";
import { parseQueryParams, pageParam, pageSizeParam } from "@/app/lib/api/queryParams";
import { z } from "zod";
import { handleApiError } from "@/app/lib/api/handleApiError";


const querySchema = z.object({
  page: pageParam,
  pageSize: pageSizeParam(),
  status: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const query = parseQueryParams(req, querySchema);
    if (!query.success) return query.response;
    const { page, pageSize, status } = query.data;

    const data = await getRoutes(page, pageSize, status);
    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/routes", error);
  }
}
