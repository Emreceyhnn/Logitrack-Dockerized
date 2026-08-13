import { NextResponse } from "next/server";
import { platformAdminAction } from "@/app/lib/platform-admin";
import { listTenants } from "@/app/lib/controllers/admin/data";
import { handleApiError } from "@/app/lib/api/handleApiError";

export const dynamic = "force-dynamic";

const loadTenants = platformAdminAction("tenants.list", async () =>
  listTenants()
);

export async function GET() {
  try {
    const rows = await loadTenants();
    return NextResponse.json(
      { rows },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    return handleApiError("/api/admin/tenants", error);
  }
}
