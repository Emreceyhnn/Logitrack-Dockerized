import { NextResponse } from "next/server";
import { getWarehousesDashboardMock } from "@/app/lib/mocks/warehousesMock";

// Public, unauthenticated mock endpoint backing the Live Demo warehouses page.
// No DB, no auth, no tenant scoping — nothing here can throw.
export async function GET() {
  return NextResponse.json(getWarehousesDashboardMock());
}
