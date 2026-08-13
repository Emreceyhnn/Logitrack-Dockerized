import { NextRequest, NextResponse } from "next/server";
import { getWarehouseWorkerDashboard } from "@/app/lib/controllers/warehouseWorker";
import { parseQueryParams } from "@/app/lib/api/queryParams";
import { z } from "zod";
import { handleApiError } from "@/app/lib/api/handleApiError";


const querySchema = z.object({
  warehouseId: z.string().trim().min(1).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const query = parseQueryParams(req, querySchema);
    if (!query.success) return query.response;
    const { warehouseId } = query.data;

    const data = await getWarehouseWorkerDashboard(warehouseId);

    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/warehouse-worker/dashboard", error);
  }
}
