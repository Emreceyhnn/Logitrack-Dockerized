import { NextResponse } from "next/server";
import { getReportsDataAction } from "@/app/lib/controllers/reports";
import { handleApiError } from "@/app/lib/api/handleApiError";


export async function GET() {
  try {
    const data = await getReportsDataAction();
    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/reports/dashboard", error);
  }
}
