import { NextResponse } from "next/server";
import { getDriverConsoleDashboardMock } from "@/app/lib/mocks/driverConsoleMock";

// Public mock endpoint for the Live Demo driver console — no auth, no DB.
export async function GET() {
  return NextResponse.json(getDriverConsoleDashboardMock());
}
