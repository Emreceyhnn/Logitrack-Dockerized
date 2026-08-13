import { NextResponse } from "next/server";
import { getInventoryDashboardMock } from "@/app/lib/mocks/inventoryMock";

// Public, unauthenticated mock endpoint backing the Live Demo inventory page.
// No DB, no auth, no tenant scoping — nothing here can throw.
export async function GET() {
  return NextResponse.json(getInventoryDashboardMock());
}
