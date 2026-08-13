import { NextResponse } from "next/server";
import { getDriversDashboardMock } from "@/app/lib/mocks/driversMock";

// Public, unauthenticated mock endpoint backing the Live Demo drivers page.
// No DB, no auth, no tenant scoping — nothing here can throw.
export async function GET() {
  return NextResponse.json(getDriversDashboardMock());
}
