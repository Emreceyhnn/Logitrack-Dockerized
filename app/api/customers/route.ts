import { NextResponse } from "next/server";
import { getCustomers } from "@/app/lib/controllers/customer";
import { handleApiError } from "@/app/lib/api/handleApiError";


export async function GET() {
  try {
    const data = await getCustomers();
    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/customers", error);
  }
}
