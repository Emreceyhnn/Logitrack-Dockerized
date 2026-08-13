import { NextResponse } from "next/server";
import { getCompanyDashboardMock } from "@/app/lib/mocks/companyMock";

// Public, unauthenticated mock endpoint backing the Live Demo company page.
// No DB, no auth, no tenant scoping — nothing here can throw.
export async function GET() {
  return NextResponse.json(getCompanyDashboardMock());
}
