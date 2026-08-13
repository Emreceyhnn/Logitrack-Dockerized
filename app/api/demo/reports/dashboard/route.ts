import { NextResponse } from "next/server";
import { getReportsDashboardMock } from "@/app/lib/mocks/reportsMock";

// Public, unauthenticated mock endpoint backing the Live Demo reports page.
// No DB, no auth, no tenant scoping — nothing here can throw.
export async function GET() {
  return NextResponse.json(getReportsDashboardMock());
}
