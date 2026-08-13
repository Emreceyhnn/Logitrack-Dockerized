import { NextResponse } from "next/server";
import { getWarehouses } from "@/app/lib/controllers/warehouse";
import { handleApiError } from "@/app/lib/api/handleApiError";


export async function GET() {
  try {
    const data = await getWarehouses();
    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/warehouses", error);
  }
}
