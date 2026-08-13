import { NextResponse } from "next/server";
import { getAnalyticsMock } from "@/app/lib/mocks/analyticsMock";

// Public, unauthenticated mock endpoint backing the Live Demo analytics page.
// No DB, no auth, no tenant scoping — nothing here can throw.
export async function GET() {
  return NextResponse.json(getAnalyticsMock());
}
