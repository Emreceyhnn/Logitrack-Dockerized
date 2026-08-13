import { NextResponse } from "next/server";
import { getOverviewMock } from "@/app/lib/mocks/overviewMock";

// Public, unauthenticated mock endpoint backing the Live Demo overview page.
// No DB, no auth, no tenant scoping — nothing here can throw.
export async function GET() {
  return NextResponse.json(getOverviewMock());
}
