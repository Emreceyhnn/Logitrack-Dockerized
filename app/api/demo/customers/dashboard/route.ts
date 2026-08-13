import { NextResponse } from "next/server";
import { getCustomersDashboardMock } from "@/app/lib/mocks/customersMock";

// Public, unauthenticated mock endpoint backing the Live Demo customers page.
// No DB, no auth, no tenant scoping — nothing here can throw.
export async function GET() {
  return NextResponse.json(getCustomersDashboardMock());
}
