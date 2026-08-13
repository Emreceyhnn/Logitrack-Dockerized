import { NextResponse } from "next/server";
import { getOverviewDashboardData } from "@/app/lib/controllers/overview";
import { handleApiError } from "@/app/lib/api/handleApiError";


export async function GET() {
  try {
    const data = await getOverviewDashboardData();
    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/overview/dashboard", error);
  }
}
