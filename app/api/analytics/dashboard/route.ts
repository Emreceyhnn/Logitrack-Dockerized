import { NextResponse } from "next/server";
import { getAnalyticsDashboardData } from "@/app/lib/controllers/analytics";
import { handleApiError } from "@/app/lib/api/handleApiError";


export async function GET() {
  try {
    const data = await getAnalyticsDashboardData();
    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/analytics/dashboard", error);
  }
}
