import { NextResponse } from "next/server";
import { getShipmentsDashboardMock } from "@/app/lib/mocks/shipmentsMock";

// Public, unauthenticated mock endpoint backing the Live Demo shipments page.
// No DB, no auth, no tenant scoping — nothing here can throw.
export async function GET() {
  return NextResponse.json(getShipmentsDashboardMock());
}
