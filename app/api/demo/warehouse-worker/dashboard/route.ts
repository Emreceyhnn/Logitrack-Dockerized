import { NextResponse } from "next/server";
import { getWarehouseWorkerDashboardMock } from "@/app/lib/mocks/warehouseWorkerMock";

// Public mock endpoint for the Live Demo warehouse-worker panel — no auth, no DB.
// Returns dataset matched by warehouseId when provided.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const warehouseId = searchParams.get("warehouseId") || undefined;
  return NextResponse.json(getWarehouseWorkerDashboardMock(warehouseId));
}
