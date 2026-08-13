import { NextResponse } from "next/server";
import { getVehicleDashboardMock } from "@/app/lib/mocks/vehicleMock";

// Public, unauthenticated mock endpoint backing the Live Demo vehicle page.
// No DB, no auth, no tenant scoping — nothing here can throw.
export async function GET() {
  return NextResponse.json(getVehicleDashboardMock());
}
