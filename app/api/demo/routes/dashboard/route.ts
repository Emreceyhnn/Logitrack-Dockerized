import { NextResponse } from "next/server";
import { getRoutesDashboardMock } from "@/app/lib/mocks/routesMock";

// Public, unauthenticated mock endpoint backing the Live Demo routes page.
// No DB, no auth, no tenant scoping — nothing here can throw.
export async function GET() {
  return NextResponse.json(getRoutesDashboardMock());
}
